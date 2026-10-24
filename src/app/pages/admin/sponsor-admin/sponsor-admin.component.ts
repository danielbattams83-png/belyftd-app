import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, OnInit, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FirebaseService} from '../../../services/firebase.service';
import {Tier4PartnerDocument} from '../../../models/firestore.models';
import {ColorTheme, THEME_PRESETS} from '../../../models/theme-presets';

const DEFAULT_PARTNER: Tier4PartnerDocument = {
  id: 'summit-fc',
  organizationName: 'Summit FC Youth Academy',
  contactEmail: 'director@summitfc.org',
  subscriptionTier: 4,
  active: true,
  branding: {
    logoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=200&auto=format&fit=crop&q=80',
    themeId: 'ocean-summit',
    primaryColor: '#0EA5E9',
    accentColor: '#F59E0B',
    backgroundColor: '#1E293B',
    welcomeHeadline: 'Welcome to Summit FC Academy Hub',
    welcomeSubtext: 'Sharpen your mindset, build matchday grit, and unlock your true potential on and off the pitch.',
    sponsorBadgeText: 'Official Development Partner',
    customPartnerTabName: 'Academy Hub',
  },
  redemptionCodes: ['SUMMIT2026', 'SUMMIT-FALL'],
  analytics: {totalRedemptions: 48, activeMentees: 42, lessonsCompleted: 156},
};

@Component({
  selector: 'app-sponsor-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sponsor-admin.component.html',
  styleUrl: './sponsor-admin.component.css',
})
export class SponsorAdminComponent implements OnInit {
  private readonly firebase = inject(FirebaseService);
  readonly partner = signal<Tier4PartnerDocument>(this.clone(DEFAULT_PARTNER));
  readonly themePresets = THEME_PRESETS;
  readonly newCode = signal('');
  readonly saving = signal(false);
  readonly status = signal<string | null>(null);

  ngOnInit(): void {
    void this.loadPartner();
  }

  private clone(value: Tier4PartnerDocument): Tier4PartnerDocument {
    return JSON.parse(JSON.stringify(value)) as Tier4PartnerDocument;
  }

  private async loadPartner(): Promise<void> {
    const saved = await this.firebase.getTier4Partner('summit-fc');
    if (saved) this.partner.set({...this.clone(DEFAULT_PARTNER), ...saved, branding: {...DEFAULT_PARTNER.branding, ...saved.branding}});
  }

  update<K extends keyof Tier4PartnerDocument>(key: K, value: Tier4PartnerDocument[K]): void {
    this.partner.update(current => ({...current, [key]: value}));
  }

  updateBranding(key: keyof Tier4PartnerDocument['branding'], value: string): void {
    this.partner.update(current => ({...current, branding: {...current.branding, [key]: value}}));
  }

  selectTheme(theme: ColorTheme): void {
    this.partner.update(current => ({
      ...current,
      branding: {
        ...current.branding,
        themeId: theme.id,
        primaryColor: theme.primary,
        accentColor: theme.accent,
        backgroundColor: theme.heroBg,
        surfaceColor: theme.surface,
        textOnHeroColor: theme.textOnHero,
      },
    }));
  }

  selectedThemeId(): string {
    return this.partner().branding.themeId || this.themePresets.find(theme =>
      theme.primary.toLowerCase() === this.partner().branding.primaryColor.toLowerCase() &&
      theme.accent.toLowerCase() === this.partner().branding.accentColor.toLowerCase() &&
      theme.heroBg.toLowerCase() === this.partner().branding.backgroundColor.toLowerCase(),
    )?.id || '';
  }

  handleLogoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.status.set('Please choose a PNG, JPEG, WebP, or SVG image.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.updateBranding('logoUrl', reader.result);
        this.status.set(`${file.name} selected. Save changes to publish the new logo.`);
      }
      input.value = '';
    };
    reader.onerror = () => {
      this.status.set('Could not read that image. Please try another file.');
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  addCode(): void {
    const code = this.newCode().trim().toUpperCase();
    if (!code || this.partner().redemptionCodes.includes(code)) return;
    this.update('redemptionCodes', [...this.partner().redemptionCodes, code]);
    this.newCode.set('');
  }

  removeCode(code: string): void {
    this.update('redemptionCodes', this.partner().redemptionCodes.filter(item => item !== code));
  }

  resetDefaults(): void {
    this.partner.set(this.clone(DEFAULT_PARTNER));
    this.status.set('Defaults restored locally. Save changes to publish them.');
  }

  async saveChanges(): Promise<void> {
    this.saving.set(true);
    this.status.set(null);
    try {
      await this.firebase.saveTier4Partner(this.partner());
      this.status.set('Changes saved to Firestore.');
    } catch (error) {
      console.error('[SponsorAdmin] Unable to save partner:', error);
      this.status.set('Could not save changes. Check your Firebase connection and permissions.');
    } finally {
      this.saving.set(false);
    }
  }

  openPreview(): void {
    window.open('http://localhost:4200/?partner=summit-fc', '_blank', 'noopener,noreferrer');
  }
}
