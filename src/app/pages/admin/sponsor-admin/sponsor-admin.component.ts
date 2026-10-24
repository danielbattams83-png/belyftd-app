import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, OnInit, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FirebaseService} from '../../../services/firebase.service';
import {Tier4PartnerDocument} from '../../../models/firestore.models';
import {ColorTheme, THEME_PRESETS} from '../../../models/theme-presets';

const BLANK_PARTNER: Tier4PartnerDocument = {
  id: '',
  organizationName: '',
  contactEmail: '',
  subscriptionTier: 4,
  active: true,
  branding: {
    logoUrl: '',
    themeId: '',
    primaryColor: '#475569',
    accentColor: '#38bdf8',
    backgroundColor: '#0f172a',
    welcomeHeadline: '',
    welcomeSubtext: '',
    sponsorBadgeText: '',
    customPartnerTabName: '',
  },
  redemptionCodes: [],
  analytics: {totalRedemptions: 0, activeMentees: 0, lessonsCompleted: 0},
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
  readonly partner = signal<Tier4PartnerDocument>(this.clone(BLANK_PARTNER));
  readonly partners = signal<Tier4PartnerDocument[]>([]);
  readonly selectedPartnerId = signal('');
  readonly loadingPartners = signal(true);
  readonly themePresets = THEME_PRESETS;
  readonly newCode = signal('');
  readonly saving = signal(false);
  readonly status = signal<string | null>(null);
  readonly hasPartner = computed(() => this.selectedPartnerId() !== '');

  ngOnInit(): void {
    void this.initializePortal();
  }

  private async initializePortal(): Promise<void> {
    try {
      await this.firebase.waitForAuthStateReady();
      if (!this.firebase.currentUser()) {
        await this.firebase.signInAsGuest();
      }
    } catch (error) {
      console.error('[SponsorAdmin] Guest sign-in failed:', error);
    }
    await this.loadPartners();
  }

  private clone(value: Tier4PartnerDocument): Tier4PartnerDocument {
    return JSON.parse(JSON.stringify(value)) as Tier4PartnerDocument;
  }

  private normalize(saved: Tier4PartnerDocument): Tier4PartnerDocument {
    return {
      ...this.clone(BLANK_PARTNER),
      ...saved,
      branding: {...BLANK_PARTNER.branding, ...saved.branding},
      analytics: {...BLANK_PARTNER.analytics, ...saved.analytics},
      redemptionCodes: saved.redemptionCodes ?? [],
    };
  }

  private async loadPartners(preferredId?: string): Promise<void> {
    this.loadingPartners.set(true);
    try {
      const partners = (await this.firebase.listTier4Partners()).map(item => this.normalize(item));
      this.partners.set(partners);
      const next = partners.find(item => item.id === (preferredId ?? this.selectedPartnerId())) ?? partners[0];
      this.applySelection(next);
      if (!partners.length) this.status.set('No partners found in Firestore yet.');
    } catch (error) {
      console.error('[SponsorAdmin] Unable to load partners:', error);
      this.status.set('Could not load partners from Firestore. Check your Firebase connection.');
    } finally {
      this.loadingPartners.set(false);
    }
  }

  private applySelection(selected: Tier4PartnerDocument | undefined): void {
    this.selectedPartnerId.set(selected?.id ?? '');
    this.partner.set(this.clone(selected ?? BLANK_PARTNER));
    this.newCode.set('');
  }

  selectPartner(id: string): void {
    this.status.set(null);
    this.applySelection(this.partners().find(item => item.id === id));
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
    this.applySelection(this.partners().find(item => item.id === this.selectedPartnerId()));
    this.status.set('Unsaved edits discarded. Showing the last saved Firestore version.');
  }

  async saveChanges(): Promise<void> {
    const id = this.partner().id.trim().toLowerCase();
    if (!id) {
      this.status.set('Add a slug / URL key before saving.');
      return;
    }
    this.saving.set(true);
    this.status.set(null);
    try {
      await this.firebase.saveTier4Partner({...this.partner(), id});
      await this.loadPartners(id);
      this.status.set('Customizations saved successfully to Firestore!');
    } catch (err) {
      console.error('Detailed save error:', err);
      this.status.set('Could not save changes to Firestore. Check your Firebase connection and permissions.');
    } finally {
      this.saving.set(false);
    }
  }

  openPreview(): void {
    const id = this.selectedPartnerId();
    if (!id) return;
    window.open(`${window.location.origin}/?p=${encodeURIComponent(id)}`, '_blank', 'noopener,noreferrer');
  }
}
