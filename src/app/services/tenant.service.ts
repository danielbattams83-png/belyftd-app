import {Injectable, signal} from '@angular/core';
import {doc, getDoc, collection, getDocs, setDoc} from 'firebase/firestore';
import {FirebaseService} from './firebase.service';
import {PartnerTenant} from '../models/partner-tenant.model';

@Injectable({providedIn:'root'})
export class TenantService {
  readonly activeTenant = signal<PartnerTenant | null>(null);
  private readonly cacheKey = 'lyftd-active-partner';
  constructor(private readonly firebase: FirebaseService) { void this.resolveFromUrl(); }
  async resolveFromUrl(): Promise<PartnerTenant | null> {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('partner') || window.location.pathname.match(/^\/p\/([^/]+)/)?.[1];
    if (!slug) { try { const cached = localStorage.getItem(this.cacheKey); if (cached) this.apply(JSON.parse(cached)); } catch {} return this.activeTenant(); }
    const tenant = await this.getTenant(slug);
    if (tenant?.active) { this.apply(tenant); return tenant; }
    return null;
  }
  async getTenant(id: string): Promise<PartnerTenant | null> {
    try { const snapshot = await getDoc(doc(this.firebase.getFirestore(), 'partners', id)); return snapshot.exists() ? ({...snapshot.data(), id:snapshot.id} as PartnerTenant) : null; } catch { return null; }
  }
  async listTenants(): Promise<PartnerTenant[]> { try { const snapshot = await getDocs(collection(this.firebase.getFirestore(), 'partners')); return snapshot.docs.map(item => ({...item.data(), id:item.id} as PartnerTenant)); } catch { return []; } }
  async uploadPartnerLogo(partnerId: string, file: File): Promise<string> {
    return this.firebase.uploadPartnerLogo(partnerId, file);
  }

  async saveTenant(tenant: PartnerTenant): Promise<void> { await setDoc(doc(this.firebase.getFirestore(), 'partners', tenant.id), tenant, {merge:true}); }
  private apply(tenant: PartnerTenant): void { this.activeTenant.set(tenant); localStorage.setItem(this.cacheKey, JSON.stringify(tenant)); document.documentElement.style.setProperty('--primary-accent', tenant.branding.primaryColor); document.documentElement.style.setProperty('--partner-accent', tenant.branding.accentColor); }
}
