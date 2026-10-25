import {ChangeDetectionStrategy, Component, computed, inject, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule, FormControl, FormGroup, Validators} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {TenantService} from '../services/tenant.service';
import {FirebaseService, COUNTRY_OPTIONS} from '../services/firebase.service';
import {MentorshipDataService} from '../services/mentorship-data.service';

const TIME_ZONE_COUNTRY_CODES: Record<string, string> = {
  'America/Anchorage': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/New_York': 'US',
  'America/Phoenix': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  'America/Halifax': 'CA',
  'America/St_Johns': 'CA',
  'America/Jamaica': 'JM',
  'Asia/Kolkata': 'IN',
  'Europe/Berlin': 'DE',
  'Europe/London': 'GB',
  'Africa/Accra': 'GH',
  'Africa/Nairobi': 'KE',
  'Africa/Lagos': 'NG',
  'Africa/Johannesburg': 'ZA',
  'Pacific/Auckland': 'NZ',
  'Pacific/Chatham': 'NZ',
  'Pacific/Honolulu': 'US',
};

@Component({
  selector: 'app-register-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        id="user-registration-dialog"
        class="dialog-panel card bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-indigo-400 text-white flex items-center justify-center shadow-md">
              <mat-icon class="text-2xl">person_add</mat-icon>
            </div>
            <div>
              <h2 class="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
                {{ isLoginMode() ? 'Welcome, Sign In' : 'Welcome, Register Your Details' }}
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ isLoginMode() ? 'Sign in to sync your profile and progress' : 'Register to sync your profile and progress' }}
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

        <section aria-labelledby="redemption-code-label" class="card flex flex-col gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100">
          <label id="redemption-code-label" for="auth-redemption-code" class="text-center font-display text-xl font-bold uppercase tracking-wide">Redemption Code</label>
          <p id="redemption-help" class="text-center text-sm leading-relaxed">Enter and check your community code to unlock sign-in or registration.</p>
          <form (submit)="$event.preventDefault(); checkRedemptionCode()" class="flex items-center gap-2 rounded-xl border border-emerald-300 bg-white p-2 shadow-sm dark:border-emerald-700 dark:bg-slate-900">
            <input id="auth-redemption-code" name="redemptionCode" type="text" [value]="redemptionCode()" (input)="updateRedemptionCode($event)" [disabled]="isCheckingCode() || isSubmitting()" maxlength="32" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="redemption-help redemption-status" [attr.aria-invalid]="codeError()" placeholder="Partner code" class="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-2 text-center font-display text-2xl font-bold uppercase tracking-wide text-emerald-700 placeholder:text-slate-400 focus-accessible dark:text-emerald-300" />
            <button type="submit" [disabled]="!redemptionCode().trim() || isCheckingCode() || isSubmitting()" class="shrink-0 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold uppercase text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 focus-accessible">{{ isCheckingCode() ? 'Checking…' : codeVerified() ? 'Checked' : 'Check' }}</button>
          </form>
          <p id="redemption-status" role="status" aria-live="polite" class="text-center text-sm font-semibold" [class.text-rose-700]="codeError()" [class.dark:text-rose-300]="codeError()">{{ codeMessage() }}</p>
        </section>

        <fieldset [disabled]="!codeVerified() || isSubmitting()" [attr.inert]="!codeVerified() || isSubmitting() ? '' : null" [attr.aria-busy]="isSubmitting()" [class.opacity-40]="!codeVerified()" class="m-0 flex min-w-0 flex-col gap-5 border-0 p-0 transition-opacity">
        <legend class="sr-only">{{ isLoginMode() ? 'Sign-in details' : 'Registration details' }}</legend>
        <button
          id="google-auth-btn"
          type="button"
          (click)="handleGoogleLogin()"
          [disabled]="isSubmitting()"
          class="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 focus-accessible dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          <span class="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-black text-[#4285F4] dark:border-slate-600" aria-hidden="true">G</span>
          {{ isSubmitting() ? 'Connecting to Google…' : 'Continue with Google' }}
        </button>

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
              <div class="relative">
                <input
                  id="login-password"
                  [type]="showLoginPassword() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="current-password"
                  class="w-full pl-3.5 pr-12 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 transition focus-accessible"
                />
                <button type="button" (click)="showLoginPassword.set(!showLoginPassword())" [attr.aria-label]="showLoginPassword() ? 'Hide password' : 'Show password'" [attr.aria-pressed]="showLoginPassword()" aria-controls="login-password" class="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 focus-accessible dark:text-slate-400"><mat-icon aria-hidden="true">{{ showLoginPassword() ? 'visibility_off' : 'visibility' }}</mat-icon></button>
              </div>
            </div>
            @if (statusMessage()) {
              <p role="status" class="text-xs font-medium text-indigo-700 dark:text-indigo-300">{{ statusMessage() }}</p>
            }
            <button
              type="submit"
              [disabled]="loginForm.invalid || isSubmitting()"
              class="w-full py-3 px-5 rounded-xl bg-indigo-400 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition cursor-pointer shadow-md focus-accessible"
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
                <option value="35+">35+</option>
              </select>
            </div>
          </div>

          <!-- Country Selection -->
          <div class="space-y-1">
            <label for="reg-country" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Country Selection <span class="text-rose-500">*</span>
            </label>
            <div class="relative">
              <div class="relative">
                <span class="absolute inset-y-0 left-0 z-10 flex items-center pl-3.5 text-lg" aria-hidden="true">
                  {{ selectedCountry().flag }}
                </span>
                <input
                  id="reg-country"
                  type="search"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls="reg-country-options"
                  [attr.aria-expanded]="isCountryDropdownOpen()"
                  [value]="countrySearch() || selectedCountryName()"
                  (focus)="openCountryDropdown()"
                  (input)="searchCountries($event)"
                  (keydown.escape)="isCountryDropdownOpen.set(false)"
                  placeholder="Search countries"
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-12 pr-3.5 text-sm text-slate-900 transition placeholder:text-slate-400 focus:bg-white focus-accessible dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
                />
                @if (isCountryDropdownOpen()) {
                  <div
                    id="reg-country-options"
                    role="listbox"
                    class="absolute inset-x-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                  >
                    @for (country of filteredCountries(); track country.code) {
                      <button
                        type="button"
                        role="option"
                        [attr.aria-selected]="country.code === selectedCountryCode()"
                        (click)="selectCountry(country)"
                        class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus-accessible dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <span aria-hidden="true">{{ country.flag }}</span>
                        <span class="flex-1">{{ country.name }}</span>
                        <span class="text-xs text-slate-500 dark:text-slate-400">{{ country.dialCode }}</span>
                      </button>
                    } @empty {
                      <p class="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No matching country</p>
                    }
                  </div>
                }
              </div>
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
                [type]="showRegistrationPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="new-password"
                placeholder="••••••••"
                class="w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 transition focus-accessible"
              />
              <button type="button" (click)="showRegistrationPassword.set(!showRegistrationPassword())" [attr.aria-label]="showRegistrationPassword() ? 'Hide password' : 'Show password'" [attr.aria-pressed]="showRegistrationPassword()" aria-controls="reg-password" class="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 focus-accessible dark:text-slate-400"><mat-icon aria-hidden="true">{{ showRegistrationPassword() ? 'visibility_off' : 'visibility' }}</mat-icon></button>
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
              id="btn-submit-registration"
              type="submit"
              [disabled]="regForm.invalid || isSubmitting()"
              class="flex-1 py-3 px-5 rounded-xl bg-indigo-400 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-md focus-accessible flex items-center justify-center gap-2"
            >
              @if (isSubmitting()) {
                <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Saving Profile...</span>
              } @else {
                <mat-icon class="text-base">how_to_reg</mat-icon>
                <span>Complete Registration</span>
              }
            </button>
          </div>
        </form>
        <button type="button" (click)="setLoginMode(true)" class="w-full text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
          Already have an account? Sign in
        </button>
        }
        </fieldset>

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
  readonly selectedCountryCode = signal<string>('US');
  readonly countrySearch = signal<string>('');
  readonly isCountryDropdownOpen = signal<boolean>(false);
  readonly selectedCountry = computed(() => this.countries.find(country => country.code === this.selectedCountryCode()) ?? this.countries[0]);
  readonly filteredCountries = computed(() => {
    const search = this.countrySearch().trim().toLocaleLowerCase();
    if (!search) return this.countries;
    return this.countries.filter(country =>
      `${country.name} ${country.code} ${country.dialCode}`.toLocaleLowerCase().includes(search)
    );
  });
  readonly isLoginMode = signal<boolean>(true);
  readonly statusMessage = signal<string | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly redemptionCode = signal('');
  private readonly verifiedCode = signal('');
  readonly codeVerified = computed(() => !!this.verifiedCode() && this.verifiedCode() === this.redemptionCode().trim().toUpperCase());
  readonly isCheckingCode = signal(false);
  readonly codeError = signal(false);
  readonly codeMessage = signal('Check your code before continuing.');
  readonly showLoginPassword = signal(false);
  readonly showRegistrationPassword = signal(false);

  updateRedemptionCode(event: Event): void {
    this.redemptionCode.set((event.target as HTMLInputElement).value);
    this.verifiedCode.set('');
    this.codeError.set(false);
    this.codeMessage.set('Check your code before continuing.');
    this.showLoginPassword.set(false);
    this.showRegistrationPassword.set(false);
    this.isCountryDropdownOpen.set(false);
    this.statusMessage.set(null);
  }

  async checkRedemptionCode(): Promise<void> {
    if (this.isCheckingCode() || this.isSubmitting()) return;
    const code = this.redemptionCode().trim().toUpperCase();
    this.verifiedCode.set('');
    this.codeError.set(false);
    if (!/^[A-Z0-9]{6,32}$/.test(code)) {
      this.codeError.set(true);
      this.codeMessage.set('Enter a valid community code (6–32 letters or numbers).');
      return;
    }
    this.isCheckingCode.set(true);
    this.codeMessage.set('Checking your redemption code…');
    try {
      const valid = await this.firebaseService.checkSponsorCode(code);
      if (code !== this.redemptionCode().trim().toUpperCase()) return;
      if (!valid) throw new Error('Invalid code');
      this.verifiedCode.set(code);
      this.codeMessage.set('Code verified. You can now sign in or register.');
    } catch {
      this.codeError.set(true);
      this.codeMessage.set('We could not verify that code. Check it and try again, or contact your community leader.');
    } finally {
      this.isCheckingCode.set(false);
    }
  }

  private async completeSponsorAccess(): Promise<void> {
    await this.firebaseService.redeemSponsorCode(this.verifiedCode());
    this.closeModal.emit();
  }

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

  private readonly tenantService = inject(TenantService);

  constructor() {
    this.detectCountryFromTimeZone();
  }

  private detectCountryFromTimeZone(): void {
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const countryCode = TIME_ZONE_COUNTRY_CODES[timeZone]
        ?? (timeZone.startsWith('Australia/') ? 'AU' : undefined);
      const country = this.countries.find(option => option.code === countryCode);
      if (country) this.selectCountry(country);
    } catch {
      this.selectCountry(this.countries[0]);
    }
  }

  openCountryDropdown(): void {
    this.countrySearch.set('');
    this.isCountryDropdownOpen.set(true);
  }

  searchCountries(event: Event): void {
    this.countrySearch.set((event.target as HTMLInputElement).value);
    this.isCountryDropdownOpen.set(true);
  }

  selectCountry(country: typeof COUNTRY_OPTIONS[number]): void {
    this.selectedCountryCode.set(country.code);
    this.selectedCountryName.set(country.name);
    this.selectedCountryDialCode.set(country.dialCode);
    this.regForm.patchValue({countryCode: country.dialCode});
    this.countrySearch.set('');
    this.isCountryDropdownOpen.set(false);
  }

  setLoginMode(loginMode: boolean): void {
    this.isLoginMode.set(loginMode);
    this.statusMessage.set(null);
  }

  async handleLogin(): Promise<void> {
    if (!this.codeVerified() || this.isSubmitting()) return;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.statusMessage.set('Signing in...');
    try {
      const email = this.loginForm.value.email?.trim() || '';
      const password = this.loginForm.value.password || '';
      const result = await this.firebaseService.signInUser(email, password);
      this.statusMessage.set(result.message);
      if (result.success) await this.completeSponsorAccess();
    } catch {
      this.statusMessage.set('Sign-in or code redemption could not be completed. Please try signing in again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async handleGoogleLogin(): Promise<void> {
    if (!this.codeVerified() || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.statusMessage.set('Connecting to Google...');
    try {
      const result = await this.firebaseService.loginWithGoogle();
      this.statusMessage.set(result.message);
      if (result.success) await this.completeSponsorAccess();
    } catch {
      this.statusMessage.set('Google sign-in or code redemption could not be completed. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async handleRegister(): Promise<void> {
    if (!this.codeVerified() || this.isSubmitting()) return;
    if (this.regForm.invalid) {
      this.regForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.statusMessage.set('Saving your profile...');
    let accountCreated = false;
    try {
      const val = this.regForm.value;
      const fullName = val.displayName?.trim() || 'Youth Leader';
      const email = val.email?.trim() || '';
      const phone = val.phoneNumber?.trim() || '';
      const country = this.selectedCountryName();
      const countryCode = val.countryCode || '+1';
      const result = await this.firebaseService.registerUser({
        partnerId: this.tenantService.activeTenant()?.id,
        fullName,
        email,
        phoneNumber: phone,
        country,
        countryCode,
        ageBracket: val.ageBracket || undefined,
        streak: 1,
        createdDate: new Date(),
        password: val.password || ''
      });
      this.statusMessage.set(result.message || 'Registration complete! Welcome to Lyftd.');
      if (!result.success) return;
      accountCreated = true;

      // Update in-memory user profile in mentorship data service
      this.dataService.userProfile.update(p => ({
        ...p, name: fullName, email, phone: `${countryCode} ${phone}`, country
      }));
      await this.completeSponsorAccess();
    } catch {
      if (accountCreated) {
        this.setLoginMode(true);
        this.statusMessage.set('Your account was created, but code redemption could not finish. Sign in to retry.');
      } else {
        this.statusMessage.set('Registration could not be completed. Please try again.');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
