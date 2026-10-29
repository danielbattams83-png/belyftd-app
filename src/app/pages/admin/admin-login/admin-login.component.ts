import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {AdminAuthService} from '../../../services/admin-auth.service';

export function safeAdminReturnUrl(value: string | null): string {
  if (value && /^\/admin\/(content|sponsors)(?:[?#].*)?$/.test(value)) return value;
  return '/admin/content';
}

@Component({
  selector: 'app-admin-login',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css',
})
export class AdminLoginComponent {
  private readonly adminAuth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly passkey = signal('');
  readonly revealed = signal(false);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly localLogoutOnly = this.route.snapshot.queryParamMap.get('logout') === 'local';

  preventComposingSubmit(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229)) event.preventDefault();
  }

  async submit(): Promise<void> {
    if (this.submitting() || !this.passkey().trim()) return;
    this.submitting.set(true);
    this.error.set('');
    try {
      if (!(await this.adminAuth.loginWithMasterKey(this.passkey()))) {
        this.error.set('Invalid admin passcode. Access denied.');
        return;
      }
      this.passkey.set('');
      this.revealed.set(false);
      await this.router.navigateByUrl(safeAdminReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')), {replaceUrl: true});
    } catch (error) {
      const code = (error as {code?: string})?.code;
      this.error.set(code === 'RESOURCE_EXHAUSTED' ? 'Too many attempts. Try again in 15 minutes.' :
        code === 'FAILED_PRECONDITION' ? 'Super-admin access has not been configured. Contact the platform owner.' :
        'Unable to unlock the dashboard. Check your connection and allow tab storage, then try again.');
    } finally { this.submitting.set(false); }
  }
}
