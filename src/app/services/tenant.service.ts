import {DestroyRef, Injectable, effect, inject, signal} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
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
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => void this.resolveTenant());
    this.destroyRef.onDestroy(() => this.resetTheme());
    void this.resolveTenant();
    effect(() => {
      const tenant = this.activeTenant();
      if (typeof document === 'undefined') return;
      const root = document.documentElement;
      root.style.setProperty('--primary-brand', tenant?.branding.primaryColor || '#4f46e5');
      root.style.setProperty('--accent-highlight', tenant?.branding.accentColor || '#f59e0b');
      root.style.setProperty('--hero-background', tenant?.branding.backgroundColor || '#f8fafc');
    });
  }

  private async resolveTenant(): Promise<void> {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const pathMatch = url.pathname.match(/^\/p\/([^/]+)/);
    const slug = pathMatch?.[1] || url.searchParams.get('p') || localStorage.getItem(TENANT_STORAGE_KEY);
    if (!slug) return;
    const requestId = ++this.requestId;
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

  clearTenant(): void {
    if (typeof window !== 'undefined') localStorage.removeItem(TENANT_STORAGE_KEY);
    this.activeTenant.set(null);
  }

  private resetTheme(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.style.removeProperty('--primary-brand');
    document.documentElement.style.removeProperty('--accent-highlight');
    document.documentElement.style.removeProperty('--hero-background');
  }
}
