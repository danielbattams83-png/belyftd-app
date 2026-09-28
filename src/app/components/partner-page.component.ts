import {ChangeDetectionStrategy, Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';

interface SponsorTier {
  name: string;
  price: string;
  summary: string;
  badge: string;
  accent: string;
  features: string[];
}

@Component({
  selector: 'app-partner-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <section class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <header class="mb-10 text-center">
          <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-700">
            <mat-icon class="text-base">volunteer_activism</mat-icon>
            Community Sponsorship
          </div>
          <h1 class="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Support the next generation of leaders
          </h1>
          <p class="mx-auto mt-4 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
            Your sponsorship helps youth access mentorship, digital skills, and life-changing coaching opportunities.
          </p>
        </header>

        <div class="grid gap-6 lg:grid-cols-3">
          @for (tier of tiers; track tier.name) {
            <article
              class="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              [class.border-indigo-300]="tier.name === 'Gold'"
              [class.bg-indigo-50/60]="tier.name === 'Gold'"
            >
              <div class="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    {{ tier.badge }}
                  </p>
                  <h2 class="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {{ tier.name }}
                  </h2>
                </div>
                <div class="rounded-2xl px-3 py-2 text-right" [class]="tier.accent">
                  <div class="text-xl font-black text-slate-900">{{ tier.price }}</div>
                </div>
              </div>

              <p class="mb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {{ tier.summary }}
              </p>

              <ul class="mb-6 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                @for (feature of tier.features; track feature) {
                  <li class="flex items-start gap-2">
                    <span class="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <mat-icon class="text-sm">check</mat-icon>
                    </span>
                    <span>{{ feature }}</span>
                  </li>
                }
              </ul>

              <button
                type="button"
                (click)="initiateStripeCheckout(tier)"
                class="mt-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus-accessible"
              >
                <mat-icon class="text-base">payments</mat-icon>
                Sponsor {{ tier.name }}
              </button>
            </article>
          }
        </div>

        <section class="mt-14 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-6 flex items-center justify-between gap-4">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Recognition
              </p>
              <h3 class="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                Sponsor Recognition
              </h3>
            </div>
            <button
              type="button"
              class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Become a Partner
            </button>
          </div>

          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (partner of partnerLogos; track partner.name) {
              <div class="flex h-24 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-center text-sm font-bold text-slate-600 shadow-sm">
                {{ partner.name }}
              </div>
            }
          </div>
        </section>
      </div>
    </section>
  `,
})
export class PartnerPageComponent {
  readonly tiers: SponsorTier[] = [
    {
      name: 'Bronze',
      price: '$25/mo',
      summary: 'A simple way to help fund mentorship sessions and digital learning tools for youth.',
      badge: 'Starter',
      accent: 'bg-amber-100',
      features: [
        'Featured community supporter badge',
        'Recognition on volunteer thank-you pages',
        'Quarterly impact recap email'
      ]
    },
    {
      name: 'Silver',
      price: '$75/mo',
      summary: 'Support a broader package of mentorship access, events, and youth growth workshops.',
      badge: 'Growth',
      accent: 'bg-slate-200',
      features: [
        'Expanded partner recognition',
        'Featured sponsor profile listing',
        'Invitation to quarterly partner updates'
      ]
    },
    {
      name: 'Gold',
      price: '$150/mo',
      summary: 'High-visibility sponsorship for organizations investing in youth transformation and leadership.',
      badge: 'Leadership',
      accent: 'bg-yellow-200',
      features: [
        'Top-tier logo placement',
        'Priority co-branded campaign mentions',
        'Private strategic partnership check-in'
      ]
    }
  ];

  readonly partnerLogos = [
    { name: 'Northstar Labs' },
    { name: 'Future Path' },
    { name: 'Blue Horizon' },
    { name: 'LaunchWorks' },
    { name: 'Summit Originals' },
    { name: 'Luna Community' },
    { name: 'Kindred Works' },
    { name: 'Elevate Studio' }
  ];

  initiateStripeCheckout(tier: SponsorTier): void {
    console.log('Initiate Stripe checkout for:', tier.name);
  }
}
