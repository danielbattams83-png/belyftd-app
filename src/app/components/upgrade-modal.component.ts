import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {A11yModule} from '@angular/cdk/a11y';
import {TierService} from '../services/tier.service';
import {PaywallComponent} from './paywall.component';

@Component({
  selector: 'app-upgrade-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, PaywallComponent],
  template: `
    @if (tiers.requiredUpgrade(); as tier) {
      <div class="overlay">
        <section role="dialog" aria-modal="true" aria-labelledby="upgrade-title" cdkTrapFocus [cdkTrapFocusAutoCapture]="true" (keydown.escape)="tiers.close()">
          <button type="button" (click)="tiers.close()">Close</button>
          <h2 id="upgrade-title">Unlock this module with Tier {{ tier }} or above</h2>
          <app-paywall [selectedTier]="tier" />
        </section>
      </div>
    }
  `,
  styles: `.overlay { position: fixed; inset: 0; z-index: 100; background: #000b; display: flex; align-items: center; justify-content: center; padding: 16px; } section { max-height: 95dvh; overflow: auto; width: min(1250px, 100%); background: #333; color: white; padding: 20px; border-radius: 16px; } h2 { font-size: 24px; margin: 16px 0; } button { padding: 12px; text-decoration: underline; }`,
})
export class UpgradeModalComponent {
  readonly tiers = inject(TierService);
}
