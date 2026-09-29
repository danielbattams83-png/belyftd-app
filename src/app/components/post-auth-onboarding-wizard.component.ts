import {ChangeDetectionStrategy, Component, computed, inject, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {COUNTRY_OPTIONS, FirebaseService, UserOnboardingData} from '../services/firebase.service';
import {MentorshipDataService} from '../services/mentorship-data.service';

interface AvatarOption {
  id: string;
  label: string;
  url: string;
}

function createAvatar(background: string, skin: string, hair: string, shirt: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${background}"/><circle cx="48" cy="47" r="35" fill="${background}"/><path d="M19 91c3-19 14-28 29-28s26 9 29 28" fill="${shirt}"/><path d="M31 39c0-14 7-23 18-23 12 0 19 9 19 23v11c0 13-8 22-19 22S31 63 31 50z" fill="${skin}"/><path d="M30 43c-3-18 4-30 18-30 13 0 21 9 21 27-5-2-9-7-11-12-7 8-16 12-28 12z" fill="${hair}"/><circle cx="41" cy="48" r="2" fill="#243047"/><circle cx="56" cy="48" r="2" fill="#243047"/><path d="M42 58c4 4 9 4 13 0" fill="none" stroke="#9d5147" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const AVATAR_OPTIONS: AvatarOption[] = [
  {id: 'sunrise', label: 'Sunrise', url: createAvatar('#f7cf9b', '#9b5c3f', '#302327', '#de795d')},
  {id: 'ocean', label: 'Ocean', url: createAvatar('#a8d9e9', '#e2ad83', '#51362b', '#357f9b')},
  {id: 'grove', label: 'Grove', url: createAvatar('#b8d8bd', '#754b39', '#201d20', '#4a8064')},
  {id: 'orchid', label: 'Orchid', url: createAvatar('#e5c7e8', '#f0c49d', '#633c50', '#a766a4')},
  {id: 'citrus', label: 'Citrus', url: createAvatar('#f1df9c', '#c77d57', '#30251f', '#c99a38')},
  {id: 'sky', label: 'Sky', url: createAvatar('#c6d7f2', '#e8b994', '#533832', '#657db6')},
];

const FOCUS_AREAS = [
  'Coding & Tech',
  'College Prep',
  'Confidence & Speaking',
  'Mindset',
  'Leadership',
  'Emotional Intelligence',
];

@Component({
  selector: 'app-post-auth-onboarding-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-5" role="presentation">
      <section
        id="post-auth-onboarding-wizard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        class="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      >
        <header class="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-7">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Your Be Lyft'd profile</p>
              <h1 id="onboarding-title" class="mt-1 text-xl font-bold font-display">A little about you</h1>
            </div>
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Step {{ step() }} of 3</span>
          </div>
          <div class="grid grid-cols-3 gap-1.5" aria-label="Onboarding progress">
            @for (item of [1, 2, 3]; track item) {
              <span class="h-1.5" [class]="step() >= item ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'"></span>
            }
          </div>
        </header>

        <div class="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          @if (step() === 1) {
            <div class="space-y-5">
              <div>
                <h2 class="text-base font-bold">Demographics &amp; language</h2>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Personalize the support and opportunities you see.</p>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="space-y-1.5 text-xs font-semibold">
                  <span>Age bracket</span>
                  <select [value]="ageBracket()" (change)="ageBracket.set(readValue($event))" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                    <option value="">Select age bracket</option>
                    @for (bracket of ageBrackets; track bracket) { <option [value]="bracket">{{ bracket }}</option> }
                  </select>
                </label>
                <label class="space-y-1.5 text-xs font-semibold">
                  <span>Country</span>
                  <select [value]="country()" (change)="country.set(readValue($event))" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                    <option value="">Select country</option>
                    @for (option of countries; track option.code) { <option [value]="option.name">{{ option.flag }} {{ option.name }}</option> }
                  </select>
                </label>
                <label class="space-y-1.5 text-xs font-semibold sm:col-span-2">
                  <span>Preferred language</span>
                  <select [value]="preferredLanguage()" (change)="preferredLanguage.set(readValue($event))" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                    <option value="">Select language</option>
                    @for (language of languages; track language) { <option [value]="language">{{ language }}</option> }
                  </select>
                </label>
              </div>

              <fieldset class="space-y-2">
                <legend class="text-xs font-bold">Choose your avatar</legend>
                <div class="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  @if (socialAvatarUrl()) {
                    <button type="button" (click)="avatarUrl.set(socialAvatarUrl()!)" [attr.aria-pressed]="avatarUrl() === socialAvatarUrl()" class="flex flex-col items-center gap-1.5 rounded-xl border p-2 text-[10px] font-semibold transition focus-accessible" [class.border-indigo-500]="avatarUrl() === socialAvatarUrl()" [class.bg-indigo-50]="avatarUrl() === socialAvatarUrl()" [class.dark:bg-indigo-950]="avatarUrl() === socialAvatarUrl()">
                      <img [src]="socialAvatarUrl()" alt="" class="h-12 w-12 rounded-full object-cover" />
                      <span>Google photo</span>
                    </button>
                  }
                  @for (avatar of avatars; track avatar.id) {
                    <button type="button" (click)="avatarUrl.set(avatar.url)" [attr.aria-label]="avatar.label + ' avatar'" [attr.aria-pressed]="avatarUrl() === avatar.url" class="flex flex-col items-center gap-1.5 rounded-xl border p-2 text-[10px] font-semibold transition focus-accessible" [class.border-indigo-500]="avatarUrl() === avatar.url" [class.bg-indigo-50]="avatarUrl() === avatar.url" [class.dark:bg-indigo-950]="avatarUrl() === avatar.url">
                      <img [src]="avatar.url" alt="" class="h-12 w-12 rounded-full object-cover" />
                      <span>{{ avatar.label }}</span>
                    </button>
                  }
                </div>
              </fieldset>
            </div>
          } @else if (step() === 2) {
            <div class="space-y-5">
              <div>
                <h2 class="text-base font-bold">Focus areas &amp; goals</h2>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose the areas you want to grow in. Select at least one.</p>
              </div>
              <div class="flex flex-wrap gap-2">
                @for (area of focusAreaOptions; track area) {
                  <button type="button" (click)="toggleFocusArea(area)" [attr.aria-pressed]="focusAreas().includes(area)" class="rounded-full border px-3.5 py-2 text-xs font-semibold transition focus-accessible" [class.border-indigo-600]="focusAreas().includes(area)" [class.bg-indigo-600]="focusAreas().includes(area)" [class.text-white]="focusAreas().includes(area)" [class.border-slate-300]="!focusAreas().includes(area)" [class.text-slate-700]="!focusAreas().includes(area)" [class.dark:border-slate-700]="!focusAreas().includes(area)" [class.dark:text-slate-200]="!focusAreas().includes(area)">
                    {{ area }}
                  </button>
                }
              </div>
            </div>
          } @else {
            <div class="space-y-5">
              <div>
                <h2 class="text-base font-bold">Choose your mentors</h2>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Pick one or two mentors to follow. Recommendations are ordered by your focus areas.</p>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                @for (item of recommendedMentors(); track item.mentor.id) {
                  <button
                    type="button"
                    (click)="toggleMentor(item.mentor.id)"
                    [attr.aria-pressed]="selectedMentorIds().includes(item.mentor.id)"
                    class="flex h-full gap-3 border p-3 text-left transition focus-accessible"
                    [class.border-indigo-600]="selectedMentorIds().includes(item.mentor.id)"
                    [class.bg-indigo-50]="selectedMentorIds().includes(item.mentor.id)"
                    [class.border-slate-200]="!selectedMentorIds().includes(item.mentor.id)"
                    [class.dark:bg-indigo-950]="selectedMentorIds().includes(item.mentor.id)"
                    [class.dark:border-slate-800]="!selectedMentorIds().includes(item.mentor.id)"
                  >
                    <img [src]="item.mentor.avatar" [alt]="item.mentor.name" class="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    <span class="min-w-0 flex-1">
                      <span class="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">{{ item.mentor.preferredNickname || item.mentor.name }}
                        @if (selectedMentorIds().includes(item.mentor.id)) { <mat-icon class="text-base text-indigo-600 dark:text-indigo-400">check_circle</mat-icon> }
                      </span>
                      <span class="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">{{ item.mentor.title }}</span>
                      @if (item.matchCount) { <span class="mt-1 block text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{{ item.matchCount }} focus match{{ item.matchCount === 1 ? '' : 'es' }}</span> }
                      <span class="mt-2 flex flex-wrap gap-1">
                        @for (tag of item.mentor.lifeExperienceTags || []; track tag) { <span class="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">{{ tag }}</span> }
                      </span>
                    </span>
                  </button>
                }
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">{{ selectedMentorIds().length }} of 2 mentors selected</p>
            </div>
          }

          @if (statusMessage()) {
            <p class="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-200" role="alert">{{ statusMessage() }}</p>
          }
        </div>

        <footer class="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-7">
          <button type="button" (click)="previousStep()" [disabled]="step() === 1 || saving()" class="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800">Back</button>
          @if (step() < 3) {
            <button type="button" (click)="nextStep()" [disabled]="saving()" class="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-accessible">Continue</button>
          } @else {
            <button type="button" (click)="completeOnboarding()" [disabled]="saving() || selectedMentorIds().length < 1" class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60 focus-accessible">
              @if (saving()) { <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span> }
              {{ saving() ? 'Saving profile…' : 'Finish setup' }}
            </button>
          }
        </footer>
      </section>
    </div>
  `
})
export class PostAuthOnboardingWizardComponent {
  readonly completed = output<void>();
  readonly firebaseService = inject(FirebaseService);
  readonly dataService = inject(MentorshipDataService);
  readonly ageBrackets = ['Under 18', '18-24', '25-34', '35+'];
  readonly languages = ['English', 'Spanish', 'French', 'Swahili', 'Portuguese'];
  readonly countries = COUNTRY_OPTIONS;
  readonly avatars = AVATAR_OPTIONS;
  readonly focusAreaOptions = FOCUS_AREAS;

  readonly step = signal<1 | 2 | 3>(1);
  readonly ageBracket = signal('');
  readonly country = signal('');
  readonly preferredLanguage = signal('English');
  readonly avatarUrl = signal('');
  readonly focusAreas = signal<string[]>([]);
  readonly selectedMentorIds = signal<string[]>([]);
  readonly saving = signal(false);
  readonly statusMessage = signal<string | null>(null);
  readonly socialAvatarUrl = signal<string | null>(this.firebaseService.currentUser()?.photoURL ?? null);

  readonly recommendedMentors = computed(() => {
    const selectedAreas = this.focusAreas();
    const bracket = this.ageBracket();
    return this.dataService.mentors()
      .filter(mentor => !mentor.ageBrackets?.length || !bracket || mentor.ageBrackets.includes(bracket))
      .map((mentor, index) => ({
        mentor,
        index,
        matchCount: mentor.recommendedFor.filter(area => selectedAreas.includes(area)).length
      }))
      .sort((left, right) => right.matchCount - left.matchCount || left.index - right.index);
  });

  constructor() {
    const profile = this.firebaseService.userProfile();
    this.ageBracket.set(profile?.ageBracket || '');
    this.country.set(profile?.country || '');
    this.preferredLanguage.set(profile?.preferredLanguage || 'English');
    this.avatarUrl.set(profile?.avatarUrl || this.socialAvatarUrl() || AVATAR_OPTIONS[0].url);
    this.focusAreas.set(profile?.focusAreas || []);
    this.selectedMentorIds.set(profile?.selectedMentorIds || []);
  }

  nextStep(): void {
    if (this.step() === 1 && (!this.ageBracket() || !this.country() || !this.preferredLanguage() || !this.avatarUrl())) {
      this.statusMessage.set('Complete each item in this step before continuing.');
      return;
    }
    if (this.step() === 2 && this.focusAreas().length === 0) {
      this.statusMessage.set('Choose at least one focus area to continue.');
      return;
    }
    this.statusMessage.set(null);
    this.step.update(step => Math.min(3, step + 1) as 1 | 2 | 3);
  }

  previousStep(): void {
    this.statusMessage.set(null);
    this.step.update(step => Math.max(1, step - 1) as 1 | 2 | 3);
  }

  toggleFocusArea(area: string): void {
    this.focusAreas.update(areas => areas.includes(area) ? areas.filter(item => item !== area) : [...areas, area]);
  }

  toggleMentor(mentorId: string): void {
    this.selectedMentorIds.update(ids => {
      if (ids.includes(mentorId)) return ids.filter(id => id !== mentorId);
      if (ids.length >= 2) {
        this.statusMessage.set('Choose no more than two mentors.');
        return ids;
      }
      this.statusMessage.set(null);
      return [...ids, mentorId];
    });
  }

  readValue(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }

  async completeOnboarding(): Promise<void> {
    if (this.selectedMentorIds().length < 1) {
      this.statusMessage.set('Choose at least one mentor to finish setup.');
      return;
    }

    const data: UserOnboardingData = {
      ageBracket: this.ageBracket(),
      country: this.country(),
      preferredLanguage: this.preferredLanguage(),
      avatarUrl: this.avatarUrl(),
      focusAreas: this.focusAreas(),
      selectedMentorIds: this.selectedMentorIds()
    };

    this.saving.set(true);
    this.statusMessage.set(null);
    try {
      await this.firebaseService.completeUserOnboarding(data);
      this.dataService.userProfile.update(profile => ({
        ...profile,
        name: this.firebaseService.userProfile()?.fullName || profile.name,
        country: data.country,
        ageBracket: data.ageBracket,
        preferredLanguage: data.preferredLanguage,
        avatar: data.avatarUrl,
        focusAreas: data.focusAreas
      }));
      this.completed.emit();
    } catch (error) {
      console.error('[PostAuthOnboardingWizard] Could not save onboarding:', error);
      this.statusMessage.set('Your profile could not be saved. Check your connection and try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
