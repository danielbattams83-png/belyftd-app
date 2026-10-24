import {CommonModule} from '@angular/common';
import {Component, computed, inject, signal} from '@angular/core';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {PartnerTenant} from '../../models/partner-tenant.model';
import {TenantService} from '../../services/tenant.service';

@Component({
  selector: 'app-sponsor-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './sponsor-admin.component.html',
  styles: [`:host { display:block; min-height:100vh; background:#f8fafc; }`]
})
export class SponsorAdminComponent {
  private readonly tenants = inject(TenantService);
  readonly partners = signal<PartnerTenant[]>([]);
  readonly selected = signal<PartnerTenant | null>(null);
  readonly saving = signal(false);
  readonly newCode = signal('');
  readonly logoPreview = signal<string | null>(null);
  private logoFile: File | null = null;
  readonly form = new FormGroup({
    organizationName: new FormControl('', {nonNullable:true, validators:[Validators.required]}),
    id: new FormControl('', {nonNullable:true, validators:[Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]}),
    contactEmail: new FormControl('', {nonNullable:true, validators:[Validators.email]}),
    welcomeHeadline: new FormControl('', {nonNullable:true, validators:[Validators.required]}),
    welcomeSubtext: new FormControl('', {nonNullable:true}),
    primaryColor: new FormControl('#1A9BEF', {nonNullable:true}),
    accentColor: new FormControl('#F59E0B', {nonNullable:true}),
    active: new FormControl(true, {nonNullable:true}),
  });
  readonly preview = computed(() => this.form.getRawValue());

  constructor() { void this.load(); }

  async load(): Promise<void> { this.partners.set(await this.tenants.listTenants()); }
  edit(partner: PartnerTenant): void {
    this.selected.set(partner);
    this.form.patchValue({organizationName:partner.organizationName, id:partner.id, contactEmail:partner.contactEmail, welcomeHeadline:partner.branding.welcomeHeadline, welcomeSubtext:partner.branding.welcomeSubtext, primaryColor:partner.branding.primaryColor, accentColor:partner.branding.accentColor, active:partner.active});
    this.logoPreview.set(partner.branding.logoUrl || null); this.logoFile = null;
  }
  create(): void { this.selected.set(null); this.form.reset({organizationName:'', id:'', contactEmail:'', welcomeHeadline:'', welcomeSubtext:'', primaryColor:'#1A9BEF', accentColor:'#F59E0B', active:true}); this.logoPreview.set(null); this.logoFile = null; }
  addCode(): void { const code = this.newCode().trim().toUpperCase(); if (code) { this.newCode.set(''); const current = this.selected(); if (current) this.selected.set({...current, redemptionCodes:[...current.redemptionCodes, code]}); } }
  removeCode(code: string): void { const current = this.selected(); if (current) this.selected.set({...current, redemptionCodes:current.redemptionCodes.filter(item => item !== code)}); }
  onLogo(event: Event): void { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; this.logoFile = file; const reader = new FileReader(); reader.onload = () => this.logoPreview.set(String(reader.result)); reader.readAsDataURL(file); }
  async save(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    try { const value = this.form.getRawValue(); const existing = this.selected(); const logoUrl = this.logoFile ? await this.tenants.uploadPartnerLogo(value.id, this.logoFile) : (existing?.branding.logoUrl || this.logoPreview() || ''); await this.tenants.saveTenant({id:value.id, organizationName:value.organizationName, contactEmail:value.contactEmail, subscriptionTier:4, active:value.active, branding:{logoUrl, primaryColor:value.primaryColor, accentColor:value.accentColor, welcomeHeadline:value.welcomeHeadline, welcomeSubtext:value.welcomeSubtext}, redemptionCodes:existing?.redemptionCodes || [], analytics:existing?.analytics || {totalRedemptions:0, activeMentees:0, lessonsCompleted:0}}); await this.load(); this.edit(this.partners().find(item => item.id === value.id)!); } finally { this.saving.set(false); }
  }
}
