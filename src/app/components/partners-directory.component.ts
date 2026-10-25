import demoPartners from '../models/demo-partners.json';
import {environment} from '../../environments/environment';
import {ChangeDetectionStrategy, Component, computed, inject, output, signal} from '@angular/core';
import {FirebaseService} from '../services/firebase.service';
import {PartnershipDocument} from '../models/firestore.models';
import {SubscriptionTier} from '../models/tier.model';

@Component({
  selector: 'app-partners-directory',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="our-partners-title">
      <h2 id="our-partners-title">Our Partners</h2>
      <p>Lyft'd, together with the organizations powering community mentorship.</p>
      @if (loading()) { <p role="status">Loading partners?</p> }
      @else if (error()) { <p role="alert">Partner listings are temporarily unavailable.</p> }
      @else {
        @for (group of groups(); track group.tier) {
          @if (group.partners.length) {
            <h3>{{ group.name }}</h3>
            <div class="logos" [class.enterprise]="group.tier === 4">
              @for (partner of group.partners; track partner.id) {
                <article class="partner">
                  @if (partner.logoUrl) { <img [src]="partner.logoUrl" [alt]="partner.name + ' logo'" loading="lazy" /> }
                  <strong>{{ partner.name }}</strong>
                  @if (partner.description) { <p>{{ partner.description }}</p> }
                  @if (safeWebsite(partner.websiteUrl); as website) {
                    <a [href]="website" target="_blank" rel="noopener noreferrer">Visit {{ partner.name }}</a>
                  }
                </article>
              }
            </div>
          }
        }
      }
      <article class="partner invitation">
        <h3>Become a Partner Sponsor &rarr;</h3>
        <p>Build your brand's impact with an Impact Leader or Enterprise Sponsor subscription.</p>
        <a href="#partner-tier-3" (click)="sponsorSelected.emit(3)">Explore Impact Leader &rarr;</a>
        <a href="#partner-tier-4" (click)="sponsorSelected.emit(4)">Explore Enterprise Sponsor &rarr;</a>
      </article>
    </section>
  `,
  styles: `
    :host { display: block; } h2 { font-size: 28px; font-weight: 800; } h3 { font-size: 20px; font-weight: 700; margin: 20px 0 12px; }
    .logos { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 16px; }
    .enterprise { grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); }
    .partner { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; border: 1px solid #777; border-radius: 10px; background: #333; color: white; text-align: center; }
    img { height: 64px; max-width: 100%; object-fit: contain; } .enterprise img { height: 112px; } .enterprise .partner { border-color: #1a9bef; min-height: 220px; }
    a { color: #78caff; text-decoration: underline; } a:focus-visible { outline: 3px solid #1a9bef; outline-offset: 4px; } .invitation { margin-top: 24px; }
    :host-context(app-partner-with-us) > section { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; margin-top: 20px; gap: 0; }
    :host-context(app-partner-with-us) #our-partners-title { display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; gap: 4px; }
    :host-context(app-partner-with-us) .partner.invitation { justify-content: center; align-items: stretch; gap: 11px; margin-top: 11px; padding-top: 0; width: 500px; max-width: 100%; }
  `,
})
export class PartnersDirectoryComponent {
  private readonly firebase = inject(FirebaseService);
  readonly sponsorSelected = output<SubscriptionTier>();
  readonly partners = signal<PartnershipDocument[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly groups = computed(() => [
    {tier: 4, name: 'Enterprise Sponsors', partners: this.partners().filter(p => p.active === true && p.subscriptionTier === 4)},
    {tier: 3, name: 'Impact Leaders', partners: this.partners().filter(p => p.active === true && p.subscriptionTier === 3)},
  ]);

  constructor() { void this.loadPartners(); }

  safeWebsite(value?: string): string | null {
    if (!value) return null;
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
    catch { return null; }
  }

  async loadPartners(): Promise<void> {
    try {
      const partners = await this.firebase.getPartners();
      this.partners.set(!environment.production && !partners.some(p => p.active && (p.subscriptionTier === 3 || p.subscriptionTier === 4))
        ? demoPartners as PartnershipDocument[] : partners);
    }
    catch {
      if (!environment.production) this.partners.set(demoPartners as PartnershipDocument[]);
      else this.error.set(true);
    }
    finally { this.loading.set(false); }
  }
}
