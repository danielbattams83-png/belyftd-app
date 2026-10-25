import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Router, provideRouter} from '@angular/router';
import {FirebaseService} from './firebase.service';
import {TenantService} from './tenant.service';
import {partnerFixture} from '../testing/partner.fixture';

describe('TenantService', () => {
  const getPartner = vi.fn();
  const getSponsorProfile = vi.fn();
  let currentUser: ReturnType<typeof signal<{uid: string} | null>>;

  const flush = async () => {
    TestBed.tick();
    for (let i = 0; i < 5; i++) await Promise.resolve();
    TestBed.tick();
  };

  beforeEach(() => {
    localStorage.clear();
    getPartner.mockReset();
    getSponsorProfile.mockReset();
    currentUser = signal<{uid: string} | null>(null);
    TestBed.configureTestingModule({providers: [
      provideRouter([{path: '', children: []}, {path: 'p/:slug', children: []}]),
      {provide: FirebaseService, useValue: {getPartner, getSponsorProfile, currentUser}},
    ]});
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('uses the default design for signed-out visitors, even on partner links', async () => {
    localStorage.setItem('lyftd_active_tenant', 'harbour-city');
    getPartner.mockResolvedValue(partnerFixture());
    const tenant = TestBed.inject(TenantService);
    await TestBed.inject(Router).navigateByUrl('/p/harbour-city?p=harbour-city');
    await flush();
    expect(tenant.activeTenant()).toBeNull();
    expect(getPartner).not.toHaveBeenCalled();
    expect(localStorage.getItem('lyftd_active_tenant')).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--primary-brand')).toBe('');
  });

  it('uses the default design for signed-in users who have not redeemed a code', async () => {
    getSponsorProfile.mockResolvedValue(null);
    const tenant = TestBed.inject(TenantService);
    currentUser.set({uid: 'user-1'});
    await flush();
    expect(getSponsorProfile).toHaveBeenCalledWith('user-1');
    expect(getPartner).not.toHaveBeenCalled();
    expect(tenant.activeTenant()).toBeNull();
  });

  it('applies the partner design from a redeemed code', async () => {
    getSponsorProfile.mockResolvedValue({orgId: 'harbour-city'});
    getPartner.mockResolvedValue(partnerFixture());
    const tenant = TestBed.inject(TenantService);
    currentUser.set({uid: 'user-1'});
    await flush();
    expect(getPartner).toHaveBeenCalledWith('harbour-city');
    expect(tenant.activeTenant()?.branding.welcomeHeadline).toBe('Welcome to Harbour City');
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--primary-brand')).toBe('#0369a1');
    expect(style.getPropertyValue('--accent-highlight')).toBe('#fbbf24');
    expect(style.getPropertyValue('--hero-background')).toBe('#082f49');
    expect(style.getPropertyValue('--surface-card')).toBe('#f0f9ff');
    expect(style.getPropertyValue('--hero-text-color')).toBe('#ffffff');
  });

  it('removes the partner design when the user signs out', async () => {
    getSponsorProfile.mockResolvedValue({orgId: 'harbour-city'});
    getPartner.mockResolvedValue(partnerFixture());
    const tenant = TestBed.inject(TenantService);
    currentUser.set({uid: 'user-1'});
    await flush();
    expect(tenant.activeTenant()).not.toBeNull();
    currentUser.set(null);
    await flush();
    expect(tenant.activeTenant()).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--primary-brand')).toBe('');
  });

  it('ignores inactive partners', async () => {
    getSponsorProfile.mockResolvedValue({orgId: 'harbour-city'});
    getPartner.mockResolvedValue({...partnerFixture(), active: false});
    const tenant = TestBed.inject(TenantService);
    currentUser.set({uid: 'user-1'});
    await flush();
    expect(tenant.activeTenant()).toBeNull();
  });

  it('keeps admin previews in memory only', () => {
    const tenant = TestBed.inject(TenantService);
    tenant.activateTenant(partnerFixture());
    expect(tenant.activeTenant()?.id).toBe('harbour-city');
    expect(localStorage.getItem('lyftd_active_tenant')).toBeNull();
  });
});
