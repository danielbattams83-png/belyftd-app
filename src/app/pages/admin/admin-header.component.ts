import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {AdminAuthService} from '../../services/admin-auth.service';

@Component({
  selector: 'app-admin-header',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <span class="badge">Lyft’d Super Admin</span>
      <nav aria-label="Admin navigation">
        <a routerLink="/admin/content" routerLinkActive="active" ariaCurrentWhenActive="page">Media CMS</a>
        <a routerLink="/admin/sponsors" routerLinkActive="active" ariaCurrentWhenActive="page">Partner Co-Branding</a>
      </nav>
      <button type="button" (click)="logout()" [disabled]="loggingOut()">{{ loggingOut() ? 'Logging out…' : 'Log out' }}</button>
    </header>
  `,
  styles: `
    :host{--admin-bg:#1e242b;--admin-text:#f4f7fa;--admin-muted:#aab8c7;--admin-accent:#8bcbea;display:block}
    header{display:flex;align-items:center;gap:24px;flex-wrap:wrap;padding:16px 24px;background:var(--admin-bg);color:var(--admin-text);font-size:14px;line-height:1.5}
    .badge{font-weight:650;white-space:nowrap;color:var(--admin-accent)}
    nav{display:flex;align-items:center;gap:16px;flex:1;flex-wrap:wrap}
    a{color:var(--admin-muted);padding:8px 0;text-decoration:none}
    a.active{color:var(--admin-text);text-decoration:underline;text-underline-offset:6px}
    button{border:1px solid var(--admin-muted);border-radius:8px;padding:8px 14px;min-height:44px;background:transparent;color:var(--admin-text);font:inherit;cursor:pointer}
    button:disabled{opacity:.6}a:focus-visible,button:focus-visible{outline:2px solid var(--admin-accent);outline-offset:4px}
    @media(max-width:600px){header{gap:12px}.badge{flex:1}nav{order:3;flex-basis:100%}}
  `,
})
export class AdminHeaderComponent {
  private readonly adminAuth = inject(AdminAuthService);
  private readonly router = inject(Router);
  readonly loggingOut = signal(false);

  async logout(): Promise<void> {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    let revoked = true;
    try { await this.adminAuth.logout(); }
    catch { revoked = false; }
    finally {
      await this.router.navigate(['/admin/login'], {replaceUrl: true, queryParams: revoked ? {} : {logout: 'local'}});
      this.loggingOut.set(false);
    }
  }
}
