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
    <section class="partner-layout" aria-labelledby="partner-title">
      <header>
        <h1 id="partner-title" class="font-black">Partner With Us</h1>
        <p>Choose your access. Support mentorship.&nbsp;Grow your community&apos;s impact.</p>
      </header>
      <app-paywall [selectedTier]="selectedTier()" />
      <app-partners-directory (sponsorSelected)="selectedTier.set($event)" />
    </section>
  `,
  styles: `
    :host { display: block; width: 100%; }
    .partner-layout { display: flex; flex-direction: column; align-items: center; justify-content: space-evenly; gap: 0; height: 2500px; min-height: max-content; padding-top: 0; padding-bottom: 61px; }
    header { display: flex; flex-direction: column; align-items: stretch; justify-content: center; padding-left: 0; }
    #partner-title { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; text-align: center; font-size: 36px; margin-bottom: 0; }
    header > p { text-align: center; }
    app-paywall { display: flex; flex-direction: column; justify-content: space-between; height: 1600px; min-height: max-content; padding-bottom: 10px; width: 100%; }
    app-partners-directory { display: flex; flex-direction: column; align-items: stretch; justify-content: flex-start; gap: 4px; padding-top: 20px; margin-top: 20px; width: 100%; }
    @media (max-width: 600px) {
      .partner-layout { height: auto; min-height: 2500px; }
      app-paywall { height: auto; }
    }
  `,
})
export class PartnerWithUsComponent {
  readonly selectedTier = signal<SubscriptionTier | null>(null);
}
