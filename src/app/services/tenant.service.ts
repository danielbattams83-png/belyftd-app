import {DestroyRef, Injectable, effect, inject, signal} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {filter} from 'rxjs/operators';
import {Tier4PartnerDocument} from '../models/firestore.models';
import {FirebaseService} from './firebase.service';

const TENANT_STORAGE_KEY = 'lyftd_active_tenant';

@Injectable({providedIn: 'root'})
export class TenantService {
  readonly activeTenant = signal<Tier4PartnerDocument | null>(null);
  readonly activeTenant$ = this.activeTenant;
  private readonly router = inject(Router);
  private readonly firebase = inject(FirebaseService);
  private readonly destroyRef = inject(DestroyRef);
  private requestId = 0;

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(event => void this.resolveTenant(event.urlAfterRedirects));
    this.destroyRef.onDestroy(() => this.resetTheme());
    if (typeof window !== 'undefined') void this.resolveTenant(window.location.pathname + window.location.search);
    effect(() => {
      const tenant = this.activeTenant();
      if (typeof document === 'undefined') return;
      const root = document.documentElement;
      root.style.setProperty('--primary-brand', tenant?.branding.primaryColor || '#4f46e5');
      root.style.setProperty('--accent-highlight', tenant?.branding.accentColor || '#f59e0b');
      root.style.setProperty('--hero-background', tenant?.branding.backgroundColor || '#f8fafc');
      root.style.setProperty('--surface-card', tenant?.branding.surfaceColor || '#ffffff');
      root.style.setProperty('--hero-text-color', tenant?.branding.textOnHeroColor || '#ffffff');
      root.style.setProperty('--theme-id', tenant?.branding.themeId || '');
    });
  }

  private async resolveTenant(path: string): Promise<void> {
    if (typeof window === 'undefined') return;
    const url = this.router.parseUrl(path);
    const segments = url.root.children['primary']?.segments;
    const slug = (segments?.[0]?.path === 'p' ? segments[1]?.path : null)
      || url.queryParams['p'] || localStorage.getItem(TENANT_STORAGE_KEY);
    const requestId = ++this.requestId;
    if (!slug) {
      this.activeTenant.set(null);
      return;
    }
    const tenant = await this.firebase.getPartner(slug);
    if (requestId !== this.requestId) return;
    if (tenant?.active) {
      this.activeTenant.set(tenant);
      localStorage.setItem(TENANT_STORAGE_KEY, tenant.id);
    } else {
      this.activeTenant.set(null);
      localStorage.removeItem(TENANT_STORAGE_KEY);
    }
  }

  activateTenant(tenant: Tier4PartnerDocument): void {
    ++this.requestId;
    if (!tenant.active) {
      this.clearTenant();
      return;
    }
    if (typeof window !== 'undefined') localStorage.setItem(TENANT_STORAGE_KEY, tenant.id);
    this.activeTenant.set(tenant);
  }

  clearTenant(): void {
    ++this.requestId;
    if (typeof window !== 'undefined') localStorage.removeItem(TENANT_STORAGE_KEY);
    this.activeTenant.set(null);
  }

  private resetTheme(): void {
    if (typeof document === 'undefined') return;
    for (const name of ['--primary-brand', '--accent-highlight', '--hero-background', '--surface-card', '--hero-text-color', '--theme-id']) {
      document.documentElement.style.removeProperty(name);
    }
  }
}
