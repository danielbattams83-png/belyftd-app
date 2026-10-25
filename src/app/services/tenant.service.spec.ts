import {TestBed} from '@angular/core/testing';
import {Router, provideRouter} from '@angular/router';
import {FirebaseService} from './firebase.service';
import {TenantService} from './tenant.service';
import {partnerFixture} from '../testing/partner.fixture';

describe('TenantService', () => {
  const getPartner = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    getPartner.mockReset();
    TestBed.configureTestingModule({providers: [
      provideRouter([{path: '', children: []}, {path: 'p/:slug', children: []}]),
      {provide: FirebaseService, useValue: {getPartner}},
    ]});
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('applies all five theme colors and persists the tenant selected in admin', () => {
    const tenant = TestBed.inject(TenantService);
    tenant.activateTenant(partnerFixture());
    TestBed.tick();
    expect(localStorage.getItem('lyftd_active_tenant')).toBe('harbour-city');
    expect(tenant.activeTenant()?.branding.welcomeHeadline).toBe('Welcome to Harbour City');
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--primary-brand')).toBe('#0369a1');
    expect(style.getPropertyValue('--accent-highlight')).toBe('#fbbf24');
    expect(style.getPropertyValue('--hero-background')).toBe('#082f49');
    expect(style.getPropertyValue('--surface-card')).toBe('#f0f9ff');
    expect(style.getPropertyValue('--hero-text-color')).toBe('#ffffff');
  });

  it('loads query-string and partner-hub tenants on navigation', async () => {
    const tenant = TestBed.inject(TenantService);
    const router = TestBed.inject(Router);
    getPartner.mockImplementation(async (id: string) => partnerFixture(id));
    await router.navigateByUrl('/?p=first');
    expect(tenant.activeTenant()?.id).toBe('first');
    await router.navigateByUrl('/p/second');
    expect(getPartner).toHaveBeenLastCalledWith('second');
    expect(tenant.activeTenant()?.id).toBe('second');
    expect(localStorage.getItem('lyftd_active_tenant')).toBe('second');
  });

  it('restores the tenant from storage on refresh', async () => {
    localStorage.setItem('lyftd_active_tenant', 'harbour-city');
    getPartner.mockResolvedValue(partnerFixture());
    const tenant = TestBed.inject(TenantService);
    await Promise.resolve();
    expect(getPartner).toHaveBeenCalledWith('harbour-city');
    expect(tenant.activeTenant()?.id).toBe('harbour-city');
  });

  it('clears branding for an inactive partner', async () => {
    const tenant = TestBed.inject(TenantService);
    tenant.activateTenant(partnerFixture());
    getPartner.mockResolvedValue({...partnerFixture(), active: false});
    await TestBed.inject(Router).navigateByUrl('/?p=harbour-city');
    TestBed.tick();
    expect(tenant.activeTenant()).toBeNull();
    expect(localStorage.getItem('lyftd_active_tenant')).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--primary-brand')).toBe('#4f46e5');
  });

  it('ignores pending loads after the tenant is cleared', async () => {
    let resolve!: (partner: ReturnType<typeof partnerFixture>) => void;
    getPartner.mockReturnValue(new Promise(result => { resolve = result; }));
    const tenant = TestBed.inject(TenantService);
    await TestBed.inject(Router).navigateByUrl('/?p=harbour-city');
    tenant.clearTenant();
    resolve(partnerFixture());
    await Promise.resolve();
    expect(tenant.activeTenant()).toBeNull();
    expect(localStorage.getItem('lyftd_active_tenant')).toBeNull();
  });
});
