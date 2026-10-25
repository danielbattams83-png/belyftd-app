import {TestBed} from '@angular/core/testing';
import {Router, provideRouter} from '@angular/router';
import {FirebaseService} from '../../../services/firebase.service';
import {TenantService} from '../../../services/tenant.service';
import {partnerFixture} from '../../../testing/partner.fixture';
import {SponsorAdminComponent} from './sponsor-admin.component';

describe('SponsorAdminComponent', () => {
  const backend = {
    waitForAuthStateReady: vi.fn(),
    currentUser: vi.fn(),
    listTier4Partners: vi.fn(),
    saveTier4Partner: vi.fn(),
  };
  const activateTenant = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    backend.waitForAuthStateReady.mockResolvedValue(undefined);
    backend.currentUser.mockReturnValue({uid: 'admin'});
    backend.listTier4Partners.mockResolvedValue([partnerFixture()]);
    backend.saveTier4Partner.mockResolvedValue(undefined);
    TestBed.configureTestingModule({providers: [
      provideRouter([{path: '', children: []}]),
      {provide: FirebaseService, useValue: backend},
      {provide: TenantService, useValue: {activateTenant}},
    ]});
  });

  async function setup() {
    const fixture = TestBed.createComponent(SponsorAdminComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    return {fixture, component: fixture.componentInstance, element: fixture.nativeElement as HTMLElement};
  }

  it('saves the selected branding and website before activating and navigating home', async () => {
    const {component} = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.update('websiteUrl', 'https://rowing.example.org');
    component.updateBranding('welcomeHeadline', 'A new crew awaits');
    await component.takeMeHome();
    const saved = backend.saveTier4Partner.mock.calls[0][0];
    expect(saved.websiteUrl).toBe('https://rowing.example.org');
    expect(saved.branding.welcomeHeadline).toBe('A new crew awaits');
    expect(activateTenant).toHaveBeenCalledWith(saved);
    expect(navigate).toHaveBeenCalledWith(['/'], {queryParams: {p: 'harbour-city'}});
    expect(backend.saveTier4Partner.mock.invocationCallOrder[0]).toBeLessThan(activateTenant.mock.invocationCallOrder[0]);
  });

  it('stays in admin if the save fails', async () => {
    const {component} = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    backend.saveTier4Partner.mockRejectedValueOnce(new Error('Permission denied'));
    await component.takeMeHome();
    expect(activateTenant).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(component.status()).toContain('Could not save');
    expect(component.saving()).toBe(false);
    errorLog.mockRestore();
  });

  it('updates the active switch and removes only the chosen code', async () => {
    const {fixture, component, element} = await setup();
    const toggle = element.querySelector<HTMLInputElement>('#partner-active')!;
    expect(toggle.checked).toBe(true);
    toggle.click();
    fixture.detectChanges();
    expect(component.partner().active).toBe(false);
    expect(element.querySelector('.toggle-status')?.textContent).toBe('Inactive');
    component.newCode.set(' crew2026 ');
    component.addCode();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('[aria-label="Remove code ROW2026"]')!.click();
    expect(component.partner().redemptionCodes).toEqual(['CREW2026']);
    expect(element.textContent).toContain('Codes for mentee self-registration via /p/:slug');
  });

  it('rejects unsafe website URLs before writing', async () => {
    const {component} = await setup();
    component.update('websiteUrl', 'javascript:alert(1)');
    expect(await component.saveChanges()).toBe(false);
    expect(backend.saveTier4Partner).not.toHaveBeenCalled();
    expect(component.status()).toContain('valid Website URL');
  });
});
