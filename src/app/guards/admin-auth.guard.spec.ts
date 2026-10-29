import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter} from '@angular/router';
import {adminAuthGuard} from './admin-auth.guard';
import {AdminAuthService} from '../services/admin-auth.service';
import {safeAdminReturnUrl} from '../pages/admin/admin-login/admin-login.component';

describe('adminAuthGuard', () => {
  const validateSession = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({providers: [provideRouter([]), {provide: AdminAuthService, useValue: {validateSession}}]});
  });

  it('redirects direct navigation and preserves the exact return URL', async () => {
    validateSession.mockResolvedValue(false);
    for (const url of ['/admin/content', '/admin/sponsors?partner=crew']) {
      const result = await TestBed.runInInjectionContext(() => adminAuthGuard({} as ActivatedRouteSnapshot, {url} as RouterStateSnapshot));
      expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/admin/login'], {queryParams: {returnUrl: url}}));
    }
  });

  it('allows access only after successful server validation', async () => {
    validateSession.mockResolvedValue(true);
    expect(await TestBed.runInInjectionContext(() => adminAuthGuard({} as ActivatedRouteSnapshot, {url: '/admin/content'} as RouterStateSnapshot))).toBe(true);
    expect(validateSession).toHaveBeenCalledOnce();
  });

  it('limits return URLs to the two admin pages', () => {
    for (const value of [null, '/admin/login', '//evil.example', 'https://evil.example', '/profile', '/admin/sponsors/../login']) {
      expect(safeAdminReturnUrl(value)).toBe('/admin/content');
    }
    expect(safeAdminReturnUrl('/admin/sponsors?partner=crew#branding')).toBe('/admin/sponsors?partner=crew#branding');
  });
});
