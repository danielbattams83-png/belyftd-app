import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FirebaseService} from '../services/firebase.service';
import {Tier4PartnerDocument} from '../models/firestore.models';

@Component({
  selector: 'app-partners-directory',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="our-partners-title">
      <h2 id="our-partners-title">Our Partners</h2>
      <p class="intro">Together with the organizations powering community mentorship.</p>
      @if (loading()) { <p role="status">Loading partners&hellip;</p> }
      @else if (error()) { <p role="alert">Partner listings are temporarily unavailable. <button type="button" (click)="loadPartners()">Try again</button></p> }
      @else {
        <div class="partner-grid">
          @for (partner of partners(); track partner.id) {
            <a class="card partner-card" [href]="partnerLink(partner)" target="_blank" rel="noopener noreferrer" [attr.aria-label]="(partner.organizationName || partner.id) + ' (opens in a new tab)'">
              @if (partner.branding.logoUrl) {
                <img [src]="partner.branding.logoUrl" alt="" loading="lazy" />
              }
              <h3>{{ partner.organizationName || partner.id }}</h3>
              @if (partner.branding.sponsorBadgeText) { <span class="partner-badge">{{ partner.branding.sponsorBadgeText }}</span> }
              <span class="visit">Visit partner <span aria-hidden="true">&nearr;</span></span>
            </a>
          } @empty { <p>No active partners to display yet.</p> }
        </div>
      }
    </section>
  `,
  styles: `
    :host { display: block; width: 100%; min-width: 0; }
    h2 { font-size: 28px; font-weight: 800; }
    .intro { margin: 8px 0 24px; }
    .partner-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
    .partner-card { display: flex; flex-direction: column; align-items: center; gap: 16px; min-width: 0; padding: var(--card-padding); border: 1px solid #64748b; border-radius: 16px; background: #333; color: white; text-align: center; text-decoration: none; overflow-wrap: anywhere; transition: border-color .2s; }
    .partner-card:hover { border-color: #78caff; }
    .partner-card:focus-visible, button:focus-visible { outline: 3px solid #1a9bef; outline-offset: 4px; }
    img { width: 100%; max-width: 200px; height: 96px; object-fit: contain; }
    h3 { font-size: 20px; font-weight: 700; }
    .partner-badge { padding: 8px 12px; border-radius: 999px; background: #1a9bef26; color: #a4dcff; font-size: 12px; font-weight: 700; }
    .visit { margin-top: auto; color: #78caff; font-size: 14px; }
    button { padding: 8px 12px; text-decoration: underline; cursor: pointer; }
    @media (min-width: 768px) { .partner-grid { grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); } }
  `,
})
export class PartnersDirectoryComponent {
  private readonly firebase = inject(FirebaseService);
  readonly partners = signal<Tier4PartnerDocument[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  constructor() { void this.loadPartners(); }

  partnerLink(partner: Tier4PartnerDocument): string {
    if (partner.websiteUrl) {
      try {
        const url = new URL(partner.websiteUrl);
        if (['https:', 'http:'].includes(url.protocol)) return url.href;
      } catch { /* Fall back to the partner hub for missing or invalid websites. */ }
    }
    return `/p/${encodeURIComponent(partner.id)}`;
  }

  async loadPartners(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      this.partners.set((await this.firebase.getPartners()).filter(partner => partner.active === true));
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
