import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {PaywallComponent} from './paywall.component';
import {PartnersDirectoryComponent} from './partners-directory.component';
import {SubscriptionTier} from '../models/tier.model';

@Component({
  selector: 'app-partner-with-us',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PaywallComponent, PartnersDirectoryComponent],
  template: `
    <section class="space-y-10 py-8" aria-labelledby="partner-title">
      <header class="space-y-3">
        <h1 id="partner-title" class="text-3xl font-black">Partner With Us</h1>
        <p>Choose your access. Support mentorship. Grow your community's impact.</p>
      </header>
      <app-paywall [selectedTier]="selectedTier()" />
      <app-partners-directory (sponsorSelected)="selectedTier.set($event)" />
    </section>
  `,
})
export class PartnerWithUsComponent {
  readonly selectedTier = signal<SubscriptionTier | null>(null);
}
