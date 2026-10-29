import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, Router, convertToParamMap, provideRouter} from '@angular/router';
import {AdminAuthService} from '../../../services/admin-auth.service';
import {AdminHeaderComponent} from '../admin-header.component';
import {AdminLoginComponent} from './admin-login.component';

describe('Admin login and utility header', () => {
  const auth = {loginWithMasterKey: vi.fn(), logout: vi.fn()};
  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({providers: [
      provideRouter([]),
      {provide: AdminAuthService, useValue: auth},
      {provide: ActivatedRoute, useValue: {snapshot: {queryParamMap: convertToParamMap({returnUrl: '/admin/sponsors?partner=crew'})}}},
    ]});
  });

  it('renders a masked input, reveals it, and displays the exact invalid-key message', async () => {
    auth.loginWithMasterKey.mockResolvedValue(false);
    const fixture = TestBed.createComponent(AdminLoginComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('password');
    (fixture.nativeElement.querySelector('.reveal') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    fixture.componentInstance.passkey.set('incorrect');
    await fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toBe('Invalid admin passcode. Access denied.');
    expect(fixture.componentInstance.submitting()).toBe(false);
  });

  it('returns to the requested admin page after successful server authentication', async () => {
    auth.loginWithMasterKey.mockResolvedValue(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const component = TestBed.createComponent(AdminLoginComponent).componentInstance;
    component.passkey.set('test-key');
    await component.submit();
    expect(navigate).toHaveBeenCalledWith('/admin/sponsors?partner=crew', {replaceUrl: true});
    expect(component.passkey()).toBe('');
  });

  it('prevents composing Enter from submitting without blocking ordinary Enter', () => {
    const component = TestBed.createComponent(AdminLoginComponent).componentInstance;
    for (const init of [{key: 'Enter', isComposing: true}, {key: 'Enter', keyCode: 229}]) {
      const event = new KeyboardEvent('keydown', {...init, cancelable: true});
      component.preventComposingSubmit(event);
      expect(event.defaultPrevented).toBe(true);
    }
    const event = new KeyboardEvent('keydown', {key: 'Enter', cancelable: true});
    component.preventComposingSubmit(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('logs out through the independent admin service and returns to login', async () => {
    auth.logout.mockResolvedValue(undefined);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await TestBed.createComponent(AdminHeaderComponent).componentInstance.logout();
    expect(auth.logout).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/admin/login'], {replaceUrl: true, queryParams: {}});
  });

  it('communicates unconfirmed revocation if logout is offline', async () => {
    auth.logout.mockRejectedValue(new Error('Offline'));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await TestBed.createComponent(AdminHeaderComponent).componentInstance.logout();
    expect(navigate).toHaveBeenCalledWith(['/admin/login'], {replaceUrl: true, queryParams: {logout: 'local'}});
  });
});
