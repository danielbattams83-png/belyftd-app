import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {RegisterModalComponent} from './register-modal.component';
import {FirebaseService} from '../services/firebase.service';
import {TenantService} from '../services/tenant.service';
import {MentorshipDataService} from '../services/mentorship-data.service';

describe('authentication modal', () => {
  const backend = {
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

  it('shows sign-in controls immediately without a redemption code step', () => {
    const {element} = setup();
    expect(element.querySelector('#auth-redemption-code')).toBeNull();
    expect(element.querySelector('fieldset')?.disabled).toBe(false);
    expect(element.querySelector('#login-email')?.matches(':disabled')).toBe(false);
    expect(element.textContent).toContain('Welcome, Sign In');
    expect(element.textContent).not.toMatch(/Firebase|Firestore|LocalStorage|Demo Fill/);
  });

  it('toggles both password fields and matches onboarding age options', () => {
    const {fixture, component, element} = setup();
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

  it('closes after a successful sign-in', async () => {
    const {component} = setup();
    backend.signInUser.mockResolvedValue({success: true, message: 'Signed in'});
    component.loginForm.setValue({email: 'member@example.com', password: 'a-password'});
    const close = vi.fn();
    component.closeModal.subscribe(close);
    await component.handleLogin();
    expect(backend.signInUser).toHaveBeenCalledWith('member@example.com', 'a-password');
    expect(close).toHaveBeenCalledOnce();
    expect(component.isSubmitting()).toBe(false);
  });

  it('stays open when sign-in fails', async () => {
    const {component} = setup();
    backend.signInUser.mockResolvedValue({success: false, message: 'Wrong password'});
    component.loginForm.setValue({email: 'member@example.com', password: 'a-password'});
    const close = vi.fn();
    component.closeModal.subscribe(close);
    await component.handleLogin();
    expect(close).not.toHaveBeenCalled();
    expect(component.statusMessage()).toBe('Wrong password');
  });
});
