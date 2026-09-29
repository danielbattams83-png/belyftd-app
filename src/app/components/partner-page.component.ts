import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {FirebaseService} from '../services/firebase.service';
import {PartnershipDocument} from '../models/firestore.models';

interface PartnerPlan {
  name: string;
  price: number;
  description: string;
  featured?: boolean;
  features: string[];
}

@Component({
  selector: 'app-partner-with-us',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <section class="space-y-10 py-8" aria-labelledby="partner-with-us-title">
      <header class="max-w-3xl space-y-3">
        <p class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Community investment</p>
        <h1 id="partner-with-us-title" class="text-3xl font-black text-slate-900 dark:text-slate-100 font-display">Partner With Us</h1>
        <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Help young people access practical mentorship, learning, and encouragement.
        </p>
      </header>

      <section aria-label="Monthly partnership plans">
        <div class="grid gap-4 md:grid-cols-3">
          @for (plan of plans; track plan.name) {
            <article
              class="flex flex-col border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              [class.border-indigo-500]="plan.featured"
              [class.bg-indigo-50\/70]="plan.featured"
            >
              <div class="flex items-start justify-between gap-3">
                <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">{{ plan.name }}</h2>
                @if (plan.featured) {
                  <span class="text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Featured</span>
                }
              </div>
              <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{{ plan.description }}</p>
              <p class="mt-5 text-3xl font-black text-slate-900 dark:text-slate-100">
                &#36;{{ plan.price }}<span class="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">/mo</span>
              </p>
              <ul class="mt-5 flex-1 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                @for (feature of plan.features; track feature) {
                  <li class="flex items-start gap-2">
                    <mat-icon class="mt-0.5 text-base text-emerald-600 dark:text-emerald-400">check</mat-icon>
                    <span>{{ feature }}</span>
                  </li>
                }
              </ul>
              <button
                type="button"
                (click)="initiateStripeCheckout(plan)"
                class="mt-6 inline-flex items-center justify-center gap-2 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus-accessible dark:bg-indigo-600 dark:hover:bg-indigo-500"
              >
                <mat-icon class="text-base">payments</mat-icon>
                Choose {{ plan.name }}
              </button>
            </article>
          }
        </div>
        @if (checkoutMessage()) {
          <p class="mt-3 text-sm text-slate-600 dark:text-slate-300" role="status">{{ checkoutMessage() }}</p>
        }
      </section>

      <section class="border-t border-slate-200 pt-8 dark:border-slate-800" aria-labelledby="sponsor-wall-title">
        <div class="mb-5 flex items-end justify-between gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">With gratitude</p>
            <h2 id="sponsor-wall-title" class="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">Sponsor &amp; Partner Wall</h2>
          </div>
          @if (!partnersLoading() && partners().length) {
            <span class="text-xs text-slate-500 dark:text-slate-400">{{ partners().length }} partners</span>
          }
        </div>

        @if (partnersLoading()) {
          <p class="py-8 text-sm text-slate-500 dark:text-slate-400" role="status">Loading partners…</p>
        } @else if (partnersError()) {
          <p class="py-8 text-sm text-rose-700 dark:text-rose-300" role="alert">Partner listings are temporarily unavailable.</p>
        } @else if (partners().length) {
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            @for (partner of partners(); track partner.id) {
              <article class="flex min-h-28 flex-col items-center justify-center gap-2 border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900">
                @if (partner.logoUrl) {
                  <img [src]="partner.logoUrl" [alt]="partner.name" class="h-12 max-w-full object-contain" loading="lazy" />
                } @else {
                  <span class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ partner.name }}</span>
                }
                @if (partner.description) {
                  <p class="text-xs text-slate-500 dark:text-slate-400">{{ partner.description }}</p>
                }
                @if (partner.websiteUrl) {
                  <a [href]="partner.websiteUrl" target="_blank" rel="noopener noreferrer" class="text-xs font-semibold text-indigo-700 hover:underline dark:text-indigo-300">
                    Visit partner
                  </a>
                }
              </article>
            }
          </div>
        } @else {
          <p class="py-8 text-sm text-slate-500 dark:text-slate-400">Partner listings will appear here as organizations join.</p>
        }
      </section>
    </section>
  `,
})
export class PartnerWithUsComponent {
  private readonly firebaseService = inject(FirebaseService);

  readonly partners = signal<PartnershipDocument[]>([]);
  readonly partnersLoading = signal(true);
  readonly partnersError = signal(false);
  readonly checkoutMessage = signal<string | null>(null);

  readonly plans: PartnerPlan[] = [
    {
      name: 'Community',
      price: 5,
      description: 'A small monthly contribution toward consistent youth encouragement.',
      features: [
        'Support daily affirmation access',
        'Listed on the partner wall'
      ]
    },
    {
      name: 'Mentor Circle',
      price: 15,
      description: 'Help expand mentoring opportunities and practical learning resources.',
      featured: true,
      features: [
        'Support mentorship programming',
        'Partner wall recognition',
        'Monthly impact updates'
      ]
    },
    {
      name: 'Future Builder',
      price: 50,
      description: 'Invest in a stronger network of support for the next generation.',
      features: [
        'Support learning and mentorship access',
        'Featured partner wall placement',
        'Quarterly impact updates'
      ]
    }
  ];

  constructor() {
    void this.loadPartners();
  }

  async loadPartners(): Promise<void> {
    this.partnersLoading.set(true);
    this.partnersError.set(false);
    try {
      this.partners.set(await this.firebaseService.getPartners());
    } catch (error) {
      console.warn('[PartnerWithUsComponent] Could not load Firestore partners:', error);
      this.partnersError.set(true);
    } finally {
      this.partnersLoading.set(false);
    }
  }

  initiateStripeCheckout(plan: PartnerPlan): void {
    this.checkoutMessage.set(`Stripe Checkout is not connected yet. Selected plan: ${plan.name} ($${plan.price}/mo).`);
  }
}
