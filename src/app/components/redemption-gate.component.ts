import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {FirebaseService} from '../services/firebase.service';
import {TenantService} from '../services/tenant.service';
import {RegisterModalComponent} from './register-modal.component';

type GateStep = 'code' | 'preview' | 'auth' | 'connecting';

@Component({
  selector: 'app-redemption-gate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule, RegisterModalComponent],
  template: `
    <div class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="redemption-gate-title">
      <div class="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        @if (partner(); as tenant) {
          <div class="flex flex-col items-center gap-3 bg-[var(--primary-brand,#4f46e5)] px-6 py-8 text-center text-[var(--hero-text-color,#ffffff)]">
            @if (tenant.branding.logoUrl) {
              <img [src]="tenant.branding.logoUrl" [alt]="tenant.organizationName" width="140" height="72" class="h-16 w-auto rounded-xl bg-white/90 object-contain p-2" />
            }
            <p class="text-xs font-semibold uppercase tracking-wider opacity-80">{{ tenant.branding.sponsorBadgeText || 'Sponsored access' }}</p>
            <h2 id="redemption-gate-title" class="text-balance text-2xl font-bold font-display">{{ tenant.organizationName }}</h2>
          </div>
        } @else {
          <div class="flex flex-col items-center gap-3 px-6 pt-8 text-center">
            <img src="/logo.png" alt="Lyftd" width="120" height="62" class="h-14 w-auto object-contain" />
            @if (groupName()) {
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Access confirmed</p>
              <h2 id="redemption-gate-title" class="text-balance text-2xl font-bold font-display">{{ groupName() }}</h2>
            } @else {
              <h2 id="redemption-gate-title" class="text-balance text-2xl font-bold font-display">Enter your access code</h2>
              <p class="text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-400">Lyft&apos;d is provided through partner organisations and subscriber groups. Enter the redemption code you were given to continue.</p>
            }
          </div>
        }

        <div class="flex flex-col gap-5 p-6">
          @switch (step()) {
            @case ('code') {
              <form (ngSubmit)="verify()" class="flex flex-col gap-3">
                <label for="redemption-code" class="text-xs font-bold text-slate-700 dark:text-slate-300">Redemption code</label>
                <input
                  id="redemption-code"
                  name="code"
                  [(ngModel)]="code"
                  autocomplete="off"
                  autocapitalize="characters"
                  spellcheck="false"
                  maxlength="64"
                  placeholder="e.g. PHOENIX100"
                  [attr.aria-invalid]="!!error()"
                  [attr.aria-describedby]="error() ? 'redemption-error' : null"
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-lg uppercase tracking-widest text-slate-900 transition focus-accessible dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button type="submit" [disabled]="isBusy() || !code.trim()" class="flex items-center justify-center gap-2 rounded-xl bg-[var(--primary-brand,#4f46e5)] px-4 py-3 text-sm font-semibold text-[var(--hero-text-color,#ffffff)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-accessible">
                  {{ isBusy() ? 'Checking code…' : 'Continue' }}
                </button>
              </form>
              @if (!hasAccount()) {
                <div class="flex flex-col items-center gap-2 border-t border-slate-200 pt-4 text-center dark:border-slate-800">
                  <p class="text-sm text-slate-600 dark:text-slate-400">Already connected to a partner?</p>
                  <button type="button" (click)="signIn()" class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-accessible dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
                    Sign In
                  </button>
                </div>
              }
            }
            @case ('preview') {
              <div class="flex flex-col gap-2 text-center">
                @if (partner()) {
                  <p class="text-pretty text-base font-semibold">{{ partner()?.branding?.welcomeHeadline || 'Your partner has unlocked Lyft\\'d for you.' }}</p>
                  <p class="text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-400">{{ partner()?.branding?.welcomeSubtext || 'Your account will be connected to this partner\\'s experience and access level.' }}</p>
                } @else {
                  <p class="text-pretty text-base font-semibold">Your code has unlocked Lyft&apos;d for you.</p>
                  <p class="text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-400">Your account will be connected to {{ groupName() }} and its access level.</p>
                }
              </div>
              <button type="button" (click)="proceed()" class="rounded-xl bg-[var(--primary-brand,#4f46e5)] px-4 py-3 text-sm font-semibold text-[var(--hero-text-color,#ffffff)] transition hover:opacity-90 focus-accessible">
                {{ hasAccount() ? 'Connect my account' : 'Create my account' }}
              </button>
              <button type="button" (click)="reset()" class="text-sm font-medium text-slate-500 underline-offset-4 hover:underline focus-accessible dark:text-slate-400">Use a different code</button>
            }
            @case ('connecting') {
              <p role="status" class="text-center text-sm text-slate-600 dark:text-slate-400">Connecting your account to {{ partner()?.organizationName || groupName() || 'your partner' }}…</p>
            }
          }

          @if (error()) {
            <p id="redemption-error" role="alert" class="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{{ error() }}</p>
          }

          @if (hasAccount()) {
            <button type="button" (click)="signOut()" class="text-xs text-slate-500 underline-offset-4 hover:underline focus-accessible dark:text-slate-400">Signed in with another account? Sign out</button>
          }
        </div>
      </div>
    </div>

    @if (step() === 'auth') {
      <app-register-modal (closeModal)="handleAuthClosed()" />
    }
  `,
})
export class RedemptionGateComponent {
  private readonly firebase = inject(FirebaseService);
  private readonly tenantService = inject(TenantService);

  code = '';
  private verifiedCode = '';
  readonly step = signal<GateStep>('code');
  readonly isBusy = signal(false);
  readonly error = signal<string | null>(null);
  readonly partner = this.tenantService.pendingTenant;
  readonly groupName = this.tenantService.pendingGroupName;
  readonly hasAccount = computed(() => {
    const user = this.firebase.currentUser();
    return !!user && !user.isAnonymous;
  });

  constructor() {
    const savedCode = this.tenantService.pendingCode();
    if (!savedCode || (!this.partner() && !this.groupName())) return;
    this.code = savedCode;
    this.verifiedCode = savedCode;
    this.step.set('preview');
    if (this.hasAccount()) void this.connect();
  }

  async verify(): Promise<void> {
    const code = this.code.trim().toUpperCase();
    if (!code || this.isBusy()) return;
    this.isBusy.set(true);
    this.error.set(null);
    try {
      const access = await this.firebase.checkSponsorCode(code);
      if (!access) throw new Error('Invalid code');
      if (access.orgId) {
        const partner = await this.firebase.getPartner(access.orgId);
        if (!partner?.active) throw new Error('Inactive or missing partner');
        this.tenantService.previewPendingTenant(partner, code);
      } else {
        this.tenantService.previewPendingTenant(null, code, access.groupName);
      }
      this.verifiedCode = code;
      this.step.set('preview');
    } catch {
      this.error.set('That code is not valid. Check it and try again.');
    } finally {
      this.isBusy.set(false);
    }
  }

  proceed(): void {
    this.error.set(null);
    if (this.hasAccount()) void this.connect();
    else this.step.set('auth');
  }

  /** Members who already redeemed a code just sign in; their saved connection skips the gate. */
  signIn(): void {
    this.error.set(null);
    this.step.set('auth');
  }

  handleAuthClosed(): void {
    if (!this.hasAccount()) {
      this.step.set(this.verifiedCode ? 'preview' : 'code');
      return;
    }
    if (this.verifiedCode) {
      void this.connect();
      return;
    }
    this.step.set('code');
    void this.checkExistingConnection();
  }

  private async checkExistingConnection(): Promise<void> {
    await this.tenantService.refresh();
    if (!this.tenantService.hasRedeemedAccess() && !this.tenantService.activeTenant()) {
      this.error.set('This account is not connected yet. Enter your redemption code to continue.');
    }
  }

  reset(): void {
    this.verifiedCode = '';
    this.code = '';
    this.error.set(null);
    this.tenantService.previewPendingTenant(null);
    this.step.set('code');
  }

  async signOut(): Promise<void> {
    await this.firebase.logout();
    this.reset();
  }

  private async connect(): Promise<void> {
    if (!this.verifiedCode) return this.reset();
    this.step.set('connecting');
    try {
      await this.firebase.redeemSponsorCode(this.verifiedCode);
      await this.tenantService.refresh();
      this.tenantService.previewPendingTenant(null);
    } catch (error: unknown) {
      console.error('[RedemptionGate] Redemption failed:', error);
      const code = (error as {code?: string})?.code ?? '';
      this.error.set(code.endsWith('permission-denied')
        ? 'This account is already connected to another group. Sign out and use a different account.'
        : 'We could not connect your account with this code. Please try again.');
      this.step.set('preview');
    }
  }
}
