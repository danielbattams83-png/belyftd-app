import {ChangeDetectionStrategy, Component, inject, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule, FormControl, FormGroup, Validators} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {FirebaseService, COUNTRY_OPTIONS} from '../services/firebase.service';
import {MentorshipDataService} from '../services/mentorship-data.service';

@Component({
  selector: 'app-register-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        id="user-registration-dialog"
        class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <mat-icon class="text-2xl">person_add</mat-icon>
            </div>
            <div>
              <h2 class="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
                {{ isLoginMode() ? 'Welcome back' : 'Youth Leader Onboarding' }}
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ isLoginMode() ? 'Sign in to sync your Be Lyft\'d profile and progress' : 'Register profile to personalize daily mentorship & sync course progress' }}
              </p>
            </div>
          </div>

          <button
            id="close-reg-dialog-btn"
            type="button"
            (click)="closeModal.emit()"
            class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 flex items-center justify-center cursor-pointer transition focus-accessible"
            aria-label="Close registration dialog"
          >
            <mat-icon class="text-base">close</mat-icon>
          </button>
        </div>

        <!-- Connection Status Banner -->
        <div class="p-3 rounded-2xl flex items-center justify-between text-xs border"
          [class]="firebaseService.isConnected() 
            ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300' 
            : 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'"
        >
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full animate-pulse" [class]="firebaseService.isConnected() ? 'bg-emerald-500' : 'bg-amber-500'"></span>
            <span class="font-semibold">
              {{ firebaseService.isConnected() ? 'Firebase Web SDK v10+ Live' : 'LocalStorage Offline Fallback Ready' }}
            </span>
          </div>
          <span class="text-[11px] opacity-80">
            {{ firebaseService.isConnected() ? 'Firestore Cloud Sync' : 'Local Persistence' }}
          </span>
        </div>

        @if (isLoginMode()) {
          <form [formGroup]="loginForm" (ngSubmit)="handleLogin()" class="space-y-4">
            <div class="space-y-1">
              <label for="login-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                id="login-email"
                type="email"
                formControlName="email"
                autocomplete="email"
                placeholder="youth.leader@example.com"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 transition focus-accessible"
              />
            </div>
            <div class="space-y-1">
              <label for="login-password" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Password</label>
              <input
                id="login-password"
                type="password"
                formControlName="password"
                autocomplete="current-password"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 transition focus-accessible"
              />
            </div>
            @if (statusMessage()) {
              <p role="status" class="text-xs font-medium text-indigo-700 dark:text-indigo-300">{{ statusMessage() }}</p>
            }
            <button
              type="submit"
              [disabled]="loginForm.invalid || isSubmitting()"
              class="w-full py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition cursor-pointer shadow-md focus-accessible"
            >
              {{ isSubmitting() ? 'Signing in...' : 'Sign in' }}
            </button>
          </form>
          <button type="button" (click)="setLoginMode(false)" class="w-full text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            Need an account? Create one
          </button>
        } @else {
        <!-- Registration Form -->
        <form [formGroup]="regForm" (ngSubmit)="handleRegister()" class="space-y-4">

          <!-- Full Name -->
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label for="reg-name" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Full Name / Leader Moniker <span class="text-rose-500">*</span>
              </label>
              @if (regForm.controls.displayName.invalid && regForm.controls.displayName.touched) {
                <span class="text-[11px] text-rose-500 font-medium">Name required (min 2 chars)</span>
              }
            </div>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <mat-icon class="text-lg">badge</mat-icon>
              </span>
              <input
                id="reg-name"
                type="text"
                formControlName="displayName"
                placeholder="e.g. Jordan Rivers"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 transition focus-accessible"
              />
            </div>
          </div>

          <!-- Email Address -->
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label for="reg-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Email Address <span class="text-rose-500">*</span>
              </label>
              @if (regForm.controls.email.invalid && regForm.controls.email.touched) {
                <span class="text-[11px] text-rose-500 font-medium">Valid email address required</span>
              }
            </div>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <mat-icon class="text-lg">mail</mat-icon>
              </span>
              <input
                id="reg-email"
                type="email"
                formControlName="email"
                placeholder="youth.leader@example.com"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 transition focus-accessible"
              />
            </div>
          </div>

          <!-- Age Bracket -->
          <div class="space-y-1">
            <label for="reg-age-bracket" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Age Bracket <span class="text-rose-500">*</span>
            </label>
            <div class="relative">
              <select
                id="reg-age-bracket"
                formControlName="ageBracket"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 cursor-pointer focus:bg-white dark:focus:bg-slate-900 transition focus-accessible"
              >
                <option value="" disabled selected>Select your age bracket</option>
                <option value="Under 18">Under 18</option>
                <option value="18-24">18-24</option>
                <option value="25-34">25-34</option>
              </select>
            </div>
          </div>

          <!-- Country Selection -->
          <div class="space-y-1">
            <label for="reg-country" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Country Selection <span class="text-rose-500">*</span>
            </label>
            <div class="relative">
              <select
                id="reg-country"
                formControlName="countryCode"
                (change)="onCountryChange($event)"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 cursor-pointer focus:bg-white dark:focus:bg-slate-900 transition focus-accessible"
              >
                @for (c of countries; track c.code) {
                  <option [value]="c.dialCode">
                    {{ c.flag }} {{ c.name }} ({{ c.dialCode }})
                  </option>
                }
              </select>
            </div>
          </div>

          <!-- Phone Number with Dial Code Prefix -->
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label for="reg-phone" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Mobile Number (for Daily Lyft audio link SMS) <span class="text-rose-500">*</span>
              </label>
              @if (regForm.controls.phoneNumber.invalid && regForm.controls.phoneNumber.touched) {
                <span class="text-[11px] text-rose-500 font-medium">Valid mobile number (min 7 digits)</span>
              }
            </div>
            <div class="flex items-center gap-2">
              <span class="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                {{ selectedCountryDialCode() }}
              </span>
              <div class="relative flex-1">
                <input
                  id="reg-phone"
                  type="tel"
                  formControlName="phoneNumber"
                  placeholder="(555) 019-2834"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 transition focus-accessible"
                />
              </div>
            </div>
          </div>

          <!-- Password / Security PIN -->
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label for="reg-password" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Security Password / Passcode <span class="text-rose-500">*</span>
              </label>
              @if (regForm.controls.password.invalid && regForm.controls.password.touched) {
                <span class="text-[11px] text-rose-500 font-medium">Min 6 characters</span>
              }
            </div>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <mat-icon class="text-lg">lock</mat-icon>
              </span>
              <input
                id="reg-password"
                type="password"
                formControlName="password"
                placeholder="••••••••"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 transition focus-accessible"
              />
            </div>
          </div>

          <!-- Feedback Status Alert -->
          @if (statusMessage()) {
            <div class="p-3.5 rounded-xl text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50 flex items-center gap-2 animate-in fade-in duration-150">
              <mat-icon class="text-base">check_circle</mat-icon>
              <span>{{ statusMessage() }}</span>
            </div>
          }

          <!-- Actions -->
          <div class="pt-2 flex items-center gap-3">
            <button
              id="btn-fill-demo-user"
              type="button"
              (click)="fillDemoData()"
              class="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 transition cursor-pointer focus-accessible"
            >
              Demo Fill
            </button>

            <button
              id="btn-submit-registration"
              type="submit"
              [disabled]="regForm.invalid || isSubmitting()"
              class="flex-1 py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-md focus-accessible flex items-center justify-center gap-2"
            >
              @if (isSubmitting()) {
                <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Saving Profile...</span>
              } @else {
                <mat-icon class="text-base">how_to_reg</mat-icon>
                <span>Complete Registration & Enter</span>
              }
            </button>
          </div>
        </form>
        <button type="button" (click)="setLoginMode(true)" class="w-full text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
          Already have an account? Sign in
        </button>
        }

      </div>
    </div>
  `
})
export class RegisterModalComponent {
  readonly firebaseService = inject(FirebaseService);
  readonly dataService = inject(MentorshipDataService);
  readonly closeModal = output<void>();

  readonly countries = COUNTRY_OPTIONS;
  readonly selectedCountryDialCode = signal<string>('+1');
  readonly selectedCountryName = signal<string>('United States');
  readonly isLoginMode = signal<boolean>(true);
  readonly statusMessage = signal<string | null>(null);
  readonly isSubmitting = signal<boolean>(false);

  readonly loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
  });

  readonly regForm = new FormGroup({
    displayName: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    ]),
    ageBracket: new FormControl('', [Validators.required]),
    phoneNumber: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9\s()\-+]{7,20}$/),
      Validators.minLength(7)
    ]),
    countryCode: new FormControl('+1', [Validators.required]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });

  onCountryChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const dialCode = target.value;
    this.selectedCountryDialCode.set(dialCode);
    const countryObj = this.countries.find(c => c.dialCode === dialCode);
    if (countryObj) {
      this.selectedCountryName.set(countryObj.name);
    }
  }

  fillDemoData(): void {
    this.regForm.patchValue({
      displayName: 'Alex Carter',
      email: 'alex.carter@belyftd.org',
      ageBracket: '25-34',
      phoneNumber: '(555) 876-5432',
      countryCode: '+1',
      password: 'BeLyftdLeader2026!'
    });
    this.selectedCountryDialCode.set('+1');
    this.selectedCountryName.set('United States');
  }

  setLoginMode(loginMode: boolean): void {
    this.isLoginMode.set(loginMode);
    this.statusMessage.set(null);
  }

  async handleLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.statusMessage.set('Signing in...');
    const email = this.loginForm.value.email?.trim() || '';
    const password = this.loginForm.value.password || '';
    const result = await this.firebaseService.signInUser(email, password);
    this.isSubmitting.set(false);
    this.statusMessage.set(result.message);

    if (result.success) {
      this.closeModal.emit();
    }
  }

  async handleRegister(): Promise<void> {
    if (this.regForm.invalid) {
      this.regForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.statusMessage.set('Saving profile and synchronizing progress...');

    const val = this.regForm.value;
    const name = val.displayName?.trim() || 'Youth Leader';
    const email = val.email?.trim() || '';
    const phone = val.phoneNumber?.trim() || '';
    const country = this.selectedCountryName();
    const countryCode = val.countryCode || '+1';
    const password = val.password || 'Leader2026!';

    const result = await this.firebaseService.registerUser({
      displayName: name,
      email,
      phoneNumber: phone,
      country,
      countryCode,
      ageBracket: val.ageBracket || undefined,
      password
    });

    // Update in-memory user profile in mentorship data service
    this.dataService.userProfile.update(p => ({
      ...p,
      name,
      email,
      phone: `${countryCode} ${phone}`,
      country
    }));

    this.isSubmitting.set(false);
    this.statusMessage.set(result.message || 'Registration complete! Welcome to Be Lyft\'d.');

    if (result.success) {
      setTimeout(() => this.closeModal.emit(), 1000);
    }
  }
}

