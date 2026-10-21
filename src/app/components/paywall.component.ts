import {A11yModule} from '@angular/cdk/a11y';
import {ChangeDetectionStrategy, Component, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CurrencyPipe} from '@angular/common';
import {FirebaseService} from '../services/firebase.service';
import {RegisterModalComponent} from './register-modal.component';
import {SUBSCRIPTION_TIERS, SubscriptionPlan, SubscriptionTier} from '../models/tier.model';

@Component({
  selector: 'app-paywall',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, FormsModule, CurrencyPipe, RegisterModalComponent],
  templateUrl: './paywall.component.html',
  styleUrl: './paywall.component.scss',
})
export class PaywallComponent {
  readonly firebase = inject(FirebaseService);
  readonly plans = SUBSCRIPTION_TIERS;
  readonly selectedTier = input<SubscriptionTier | null>(null);
  readonly checkoutMessage = signal('');
  readonly checkoutRequested = output<SubscriptionPlan>();
  readonly checkoutPlan = signal<SubscriptionPlan | null>(null);
  readonly redemptionMessage = signal('');
  readonly submitting = signal(false);
  readonly showAuth = signal(false);
  code = '';

  choosePlan(plan: SubscriptionPlan): void {
    this.checkoutPlan.set(plan);
    this.checkoutRequested.emit(plan);
  }

  async redeem(): Promise<void> {
    if (!this.code.trim() || this.submitting()) return;
    if (!this.firebase.isLoggedIn()) {
      this.redemptionMessage.set('Sign in or create an account, then redeem your code.');
      this.showAuth.set(true);
      return;
    }
    this.submitting.set(true);
    this.redemptionMessage.set('');
    try {
      const sponsor = await this.firebase.redeemSponsorCode(this.code);
      this.redemptionMessage.set(`Your sponsored access from ${sponsor.sponsorName} is now active.`);
      this.code = '';
    } catch {
      this.redemptionMessage.set('Unable to redeem that code. Check the code and try again.');
    } finally {
      this.submitting.set(false);
    }
  }
}
