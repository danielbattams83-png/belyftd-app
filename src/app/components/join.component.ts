import {BackButtonComponent} from './back-button.component';
import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {RegisterModalComponent} from './register-modal.component';
import {FirebaseService} from '../services/firebase.service';
import {TenantService} from '../services/tenant.service';

@Component({
  selector: 'app-join',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BackButtonComponent, CommonModule, FormsModule, MatIconModule, RegisterModalComponent],
  template: `
    <section class="modal-backdrop fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
      <div class="dialog-panel card w-full max-w-lg space-y-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-9">
        <app-back-button />
        <div class="space-y-3 text-center">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <mat-icon class="text-3xl">handshake</mat-icon>
          </div>
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">Sponsor access</p>
          <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white">Welcome to Lyft'd</h1>
          <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">Enter the partner code shared with your community to unlock your sponsored learning experience.</p>
        </div>

        @if (!firebaseService.isLoggedIn()) {
          <div class="card space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <p>Sign in or create an account before redeeming your code.</p>
            <button type="button" (click)="showAuth.set(true)" class="w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white hover:bg-indigo-700">
              Sign in or create account
            </button>
          </div>
        }

        <form class="space-y-4" (ngSubmit)="redeem()">
          <label for="sponsor-code" class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Partner code</label>
          <input
            id="sponsor-code"
            name="sponsorCode"
            [(ngModel)]="code"
            autocomplete="off"
            autocapitalize="characters"
            placeholder="Enter your code"
            class="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-center text-lg font-bold tracking-[0.18em] text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            [disabled]="isSubmitting()"
          />
          @if (message()) {
            <p role="status" class="text-sm font-medium" [class]="hasError() ? 'text-rose-600 dark:text-rose-300' : 'text-indigo-700 dark:text-indigo-300'">{{ message() }}</p>
          }
          <button
            type="submit"
            [disabled]="!code.trim() || isSubmitting()"
            class="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <mat-icon>{{ isSubmitting() ? 'hourglass_top' : 'redeem' }}</mat-icon>
            {{ isSubmitting() ? 'Verifying code…' : 'Redeem sponsor code' }}
          </button>
        </form>

        <p class="text-center text-xs text-slate-500 dark:text-slate-400">Your sponsor supports your access to real Lyft'd learning content.</p>
      </div>
    </section>
    @if (showAuth()) {
      <app-register-modal (closeModal)="showAuth.set(false)" />
    }
  `,
})
export class JoinComponent {
  readonly firebaseService = inject(FirebaseService);
  private readonly router = inject(Router);
  private readonly tenantService = inject(TenantService);
  code = '';
  readonly isSubmitting = signal(false);
  readonly message = signal<string | null>(null);
  readonly hasError = signal(false);
  readonly showAuth = signal(false);

  async redeem(): Promise<void> {
    if (!this.firebaseService.isLoggedIn()) {
      this.hasError.set(true);
      this.message.set('Please sign in or create an account before redeeming your code.');
      return;
    }
    if (!this.code.trim() || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.message.set(null);
    this.hasError.set(false);
    try {
      await this.firebaseService.redeemSponsorCode(this.code);
      await this.tenantService.refresh();
      await this.router.navigate(['/courses', 'module-2', 'units', 'unit-1']);
    } catch (error: unknown) {
      console.error('[JoinComponent] Sponsor code redemption failed:', error);
      this.hasError.set(true);
      this.message.set('That code could not be redeemed. Check it and try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
