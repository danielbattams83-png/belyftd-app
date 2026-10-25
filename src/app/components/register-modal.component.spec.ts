import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {RegisterModalComponent} from './register-modal.component';
import {FirebaseService} from '../services/firebase.service';
import {TenantService} from '../services/tenant.service';
import {MentorshipDataService} from '../services/mentorship-data.service';

describe('authentication redemption gate', () => {
  const backend = {
    checkSponsorCode: vi.fn(),
    redeemSponsorCode: vi.fn(),
    signInUser: vi.fn(),
    registerUser: vi.fn(),
    loginWithGoogle: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      imports: [RegisterModalComponent],
      providers: [
        {provide: FirebaseService, useValue: backend},
        {provide: TenantService, useValue: {activeTenant: signal(null)}},
        {provide: MentorshipDataService, useValue: {userProfile: signal({})}},
      ],
    });
  });

  function setup() {
    const fixture = TestBed.createComponent(RegisterModalComponent);
    fixture.detectChanges();
    return {fixture, component: fixture.componentInstance, element: fixture.nativeElement as HTMLElement};
  }

  it('locks all authentication controls and removes technical and demo content', async () => {
    const {component, element} = setup();
    expect(element.querySelector('fieldset')?.disabled).toBe(true);
    expect(element.querySelector('fieldset')?.hasAttribute('inert')).toBe(true);
    expect(element.querySelector('#login-email')?.matches(':disabled')).toBe(true);
    expect(element.textContent).toContain('Welcome, Sign In');
    expect(element.textContent).not.toMatch(/Firebase|Firestore|LocalStorage|Demo Fill/);
    await component.handleLogin();
    await component.handleRegister();
    await component.handleGoogleLogin();
    expect(backend.signInUser).not.toHaveBeenCalled();
    expect(backend.registerUser).not.toHaveBeenCalled();
    expect(backend.loginWithGoogle).not.toHaveBeenCalled();
  });

  it('unlocks only after server verification and relocks when the code changes', async () => {
    const {fixture, component, element} = setup();
    component.redemptionCode.set(' phoenix100 ');
    backend.checkSponsorCode.mockResolvedValue(true);
    await component.checkRedemptionCode();
    fixture.detectChanges();
    expect(backend.checkSponsorCode).toHaveBeenCalledWith('PHOENIX100');
    expect(element.querySelector('fieldset')?.disabled).toBe(false);
    expect(component.codeVerified()).toBe(true);
    component.updateRedemptionCode({target: {value: 'DIFFERENT'}} as unknown as Event);
    fixture.detectChanges();
    expect(element.querySelector('fieldset')?.disabled).toBe(true);
    expect(component.codeVerified()).toBe(false);
  });

  it('fails closed for invalid codes and verification outages', async () => {
    const {component} = setup();
    component.redemptionCode.set('bad');
    await component.checkRedemptionCode();
    expect(backend.checkSponsorCode).not.toHaveBeenCalled();
    component.redemptionCode.set('UNKNOWN123');
    backend.checkSponsorCode.mockResolvedValue(false);
    await component.checkRedemptionCode();
    expect(component.codeVerified()).toBe(false);
    backend.checkSponsorCode.mockRejectedValue(new Error('offline'));
    await component.checkRedemptionCode();
    expect(component.codeVerified()).toBe(false);
    expect(component.isCheckingCode()).toBe(false);
    expect(component.codeError()).toBe(true);
  });

  it('keeps controls locked while the code check is pending', async () => {
    const {fixture, component, element} = setup();
    let resolve!: (value: boolean) => void;
    backend.checkSponsorCode.mockReturnValue(new Promise<boolean>(done => { resolve = done; }));
    component.redemptionCode.set('PHOENIX100');
    const pending = component.checkRedemptionCode();
    fixture.detectChanges();
    expect(element.querySelector('fieldset')?.disabled).toBe(true);
    expect(component.isCheckingCode()).toBe(true);
    resolve(true);
    await pending;
    expect(component.codeVerified()).toBe(true);
  });

  it('toggles both password fields and matches onboarding age options', async () => {
    const {fixture, component, element} = setup();
    component.redemptionCode.set('PHOENIX100');
    backend.checkSponsorCode.mockResolvedValue(true);
    await component.checkRedemptionCode();
    fixture.detectChanges();
    (element.querySelector('[aria-controls="login-password"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect((element.querySelector('#login-password') as HTMLInputElement).type).toBe('text');
    component.setLoginMode(false);
    fixture.detectChanges();
    expect(element.textContent).toContain('Welcome, Register Your Details');
    expect(element.querySelector('#btn-fill-demo-user')).toBeNull();
    const ages = Array.from(element.querySelectorAll('#reg-age-bracket option')).slice(1).map(option => option.textContent);
    expect(ages).toEqual(['Under 18', '18-24', '25-34', '35+']);
    (element.querySelector('[aria-controls="reg-password"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect((element.querySelector('#reg-password') as HTMLInputElement).type).toBe('text');
  });

  it('redeems the checked code after authentication before closing', async () => {
    const {component} = setup();
    component.redemptionCode.set('PHOENIX100');
    backend.checkSponsorCode.mockResolvedValue(true);
    backend.signInUser.mockResolvedValue({success: true, message: 'Signed in'});
    backend.redeemSponsorCode.mockResolvedValue({});
    await component.checkRedemptionCode();
    component.loginForm.setValue({email: 'member@example.com', password: 'a-password'});
    const close = vi.fn();
    component.closeModal.subscribe(close);
    await component.handleLogin();
    expect(backend.redeemSponsorCode).toHaveBeenCalledWith('PHOENIX100');
    expect(close).toHaveBeenCalledOnce();
    expect(component.isSubmitting()).toBe(false);
  });
});
