import {A11yModule} from '@angular/cdk/a11y';
import {ChangeDetectionStrategy, Component, input, output, signal} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {SUBSCRIPTION_TIERS, SubscriptionPlan, SubscriptionTier} from '../models/tier.model';

@Component({
  selector: 'app-paywall',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, CurrencyPipe],
  templateUrl: './paywall.component.html',
  styleUrl: './paywall.component.scss',
})
export class PaywallComponent {
  readonly plans = SUBSCRIPTION_TIERS;
  readonly selectedTier = input<SubscriptionTier | null>(null);
  readonly checkoutRequested = output<SubscriptionPlan>();
  readonly checkoutPlan = signal<SubscriptionPlan | null>(null);

  choosePlan(plan: SubscriptionPlan): void {
    this.checkoutPlan.set(plan);
    this.checkoutRequested.emit(plan);
  }

}
