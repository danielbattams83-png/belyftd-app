import {Injectable, computed, effect, inject, signal} from '@angular/core';
import {Tier4PartnerDocument} from '../models/firestore.models';
import {FirebaseService} from './firebase.service';

// Older builds persisted the partner chosen from a link; partner designs now come only from a redeemed code.
const LEGACY_TENANT_STORAGE_KEY = 'lyftd_active_tenant';
/**
 * Accounts created before the redemption gate launched stay on the core Lyft'd design and skip the gate.
 * Set this to the moment the gate is deployed to production.
 */
export const REDEMPTION_GATE_LAUNCHED_AT = Date.parse('2026-10-25T00:00:00Z');
const THEME_PROPERTIES = ['--primary-brand', '--accent-highlight', '--hero-background', '--surface-card', '--hero-text-color', '--theme-id'];

@Injectable({providedIn: 'root'})
export class TenantService {
  readonly activeTenant = signal<Tier4PartnerDocument | null>(null);
  readonly activeTenant$ = this.activeTenant;
  /** Partner matched by a validated (not yet redeemed) code; it only styles the redemption gate. */
  readonly pendingTenant = signal<Tier4PartnerDocument | null>(null);
  /** True once the signed-in user's sponsor profile lookup has settled. */
  readonly isResolved = signal(false);
  /** Existing members from before the gate launched are connected to the core Lyft'd app without a code. */
  readonly isLegacyMember = computed(() => {
    const user = this.firebase.currentUser();
    if (!user || user.isAnonymous) return false;
    const createdAt = Date.parse(user.metadata.creationTime ?? '');
    return Number.isFinite(createdAt) && createdAt < REDEMPTION_GATE_LAUNCHED_AT;
  });
  private readonly themeTenant = computed(() => this.activeTenant() ?? this.pendingTenant());
  private readonly firebase = inject(FirebaseService);
  private requestId = 0;

  constructor() {
    if (typeof window !== 'undefined') localStorage.removeItem(LEGACY_TENANT_STORAGE_KEY);

    effect(() => {
      const uid = this.firebase.currentUser()?.uid ?? null;
      void this.loadRedeemedTenant(uid);
    });

    effect(() => {
      const tenant = this.themeTenant();
      if (typeof document === 'undefined') return;
      const root = document.documentElement;
      if (!tenant) {
        for (const name of THEME_PROPERTIES) root.style.removeProperty(name);
        return;
      }
      root.style.setProperty('--primary-brand', tenant.branding.primaryColor || '#4f46e5');
      root.style.setProperty('--accent-highlight', tenant.branding.accentColor || '#f59e0b');
      root.style.setProperty('--hero-background', tenant.branding.backgroundColor || '#f8fafc');
      root.style.setProperty('--surface-card', tenant.branding.surfaceColor || '#ffffff');
      root.style.setProperty('--hero-text-color', tenant.branding.textOnHeroColor || '#ffffff');
      root.style.setProperty('--theme-id', tenant.branding.themeId || '');
    });
  }

  /** Re-reads the signed-in user's sponsor profile, e.g. right after a code is redeemed. */
  refresh(): Promise<void> {
    return this.loadRedeemedTenant(this.firebase.currentUser()?.uid ?? null);
  }

  private async loadRedeemedTenant(uid: string | null): Promise<void> {
    const requestId = ++this.requestId;
    if (!uid || typeof window === 'undefined') {
      this.activeTenant.set(null);
      this.isResolved.set(true);
      return;
    }
    this.isResolved.set(false);
    try {
      const profile = await this.firebase.getSponsorProfile(uid);
      const tenant = profile?.orgId ? await this.firebase.getPartner(profile.orgId) : null;
      if (requestId !== this.requestId) return;
      this.activeTenant.set(tenant?.active ? tenant : null);
    } catch (error) {
      console.warn('[TenantService] Unable to load redeemed partner design:', error);
      if (requestId === this.requestId) this.activeTenant.set(null);
    } finally {
      if (requestId === this.requestId) this.isResolved.set(true);
    }
  }

  previewPendingTenant(tenant: Tier4PartnerDocument | null): void {
    this.pendingTenant.set(tenant?.active ? tenant : null);
  }

  /** Temporary in-memory preview for admins; it is not saved and resets on sign-in changes. */
  activateTenant(tenant: Tier4PartnerDocument): void {
    ++this.requestId;
    this.activeTenant.set(tenant.active ? tenant : null);
    this.isResolved.set(true);
  }

  clearTenant(): void {
    ++this.requestId;
    this.activeTenant.set(null);
  }
}
