import {BackButtonComponent} from './back-button.component';
import {ChangeDetectionStrategy, Component, computed, inject, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {MentorshipDataService} from '../services/mentorship-data.service';
import {ThemeAccessibilityService, AppFontSize} from '../services/theme-accessibility.service';
import {FirebaseService} from '../services/firebase.service';
import {DailyMessageSchedulerService} from '../services/daily-message-scheduler.service';
import {CurriculumService} from '../services/curriculum.service';
import {UserPreferencesService} from '../services/user-preferences.service';

const PROFILE_VIDEOS = {
  explainer: {title: 'App Explainer Video', url: ''},
  investor: {title: 'Investor Video', url: ''},
} as const;

@Component({
  selector: 'app-profile-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BackButtonComponent, CommonModule, MatIconModule],
  template: `
    <div class="modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        id="user-profile-dialog"
        class="dialog-panel card bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6"
      >
        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <app-back-button class="profile-back" [profile]="true" label="Back" [navigate]="false" (pressed)="closeModal.emit()" />
          <h3 class="text-base font-bold font-display">My Lyft'd Profile & Settings</h3>
          <button
            id="close-profile-btn"
            type="button"
            (click)="closeModal.emit()"
            class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer focus-accessible"
          >
            <mat-icon class="text-base">close</mat-icon>
          </button>
        </div>

        <button
          id="change-preferences-btn"
          type="button"
          (click)="scrollToPreferences()"
          class="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 focus-accessible"
        >
          <mat-icon aria-hidden="true">tune</mat-icon>
          Change my preferences
        </button>

        <!-- User Identity Card -->
        <div class="card flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
          @if (activeProfile().avatarUrl || !firebaseService.hasActiveSession()) {
            <img
              [src]="activeProfile().avatarUrl || dataService.userProfile().avatar"
              [alt]="activeProfile().fullName"
              class="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
              referrerpolicy="no-referrer"
            />
          } @else {
            <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200" aria-hidden="true">
              {{ activeProfile().fullName.slice(0, 1).toUpperCase() }}
            </div>
          }
          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                {{ activeProfile().fullName }}
              </h4>
              <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 uppercase">
                {{ activeProfile().role }}
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {{ activeProfile().ageBracket }} • {{ activeProfile().country }}
            </p>
            <div class="flex items-center gap-1.5 mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <mat-icon class="text-sm">local_fire_department</mat-icon>
              <span>{{ activeProfile().streak }}-Day Active Streak</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2.5 text-center">
          <button id="stat-modules-completed" type="button" (click)="openProgress('/courses')" class="min-h-[44px] rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition hover:border-indigo-400 focus-accessible dark:border-slate-800 dark:bg-slate-850">
            <div class="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-display">{{ modulesCompleted() }}</div>
            <div class="mt-0.5 text-[11px] font-semibold leading-snug text-slate-700 dark:text-slate-200">Modules Completed</div>
          </button>
          <button id="stat-life-lessons" type="button" (click)="openProgress('/life-lessons')" class="min-h-[44px] rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition hover:border-indigo-400 focus-accessible dark:border-slate-800 dark:bg-slate-850">
            <div class="text-xl font-bold text-amber-600 dark:text-amber-400 font-display">{{ preferences.lifeLessonsViewed() }} / {{ preferences.lifeLessonsCompleted() }}</div>
            <div class="mt-0.5 text-[11px] font-semibold leading-snug text-slate-700 dark:text-slate-200">Life Lessons Viewed / Completed</div>
          </button>
          <button id="stat-daily-messages" type="button" (click)="openProgress('/your-key')" class="min-h-[44px] rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition hover:border-indigo-400 focus-accessible dark:border-slate-800 dark:bg-slate-850">
            <div class="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-display">{{ preferences.dailyMessagesRead() }} / {{ preferences.dailyMessageStreak() }}</div>
            <div class="mt-0.5 text-[11px] font-semibold leading-snug text-slate-700 dark:text-slate-200">Daily Mentor Messages</div>
          </button>
        </div>

        <!-- Focus Areas -->
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            My Focus Areas
          </h4>
          <div class="flex flex-wrap gap-1.5">
            @for (area of activeProfile().focusAreas; track area) {
              <button type="button" (click)="editOnboarding.emit()" [attr.aria-label]="'Edit onboarding focus area: ' + area" class="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 focus-accessible dark:bg-slate-800 dark:text-slate-300 dark:hover:text-indigo-300">
                {{ area }}
                <mat-icon class="text-xs">edit</mat-icon>
              </button>
            }
            @if (!activeProfile().focusAreas.length) {
              <button type="button" (click)="editOnboarding.emit()" class="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:border-indigo-400 hover:text-indigo-600 focus-accessible dark:border-slate-700 dark:text-slate-400 dark:hover:text-indigo-300">Add focus areas</button>
            }
          </div>
        </div>

        <!-- Badges Unlocked -->
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Earned Growth Badges
          </h4>
          @if (earnedBadges().length) {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              @for (badge of earnedBadges(); track badge.id) {
                <div class="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-850">
                  <mat-icon class="text-2xl text-amber-500">{{ badge.icon }}</mat-icon>
                  <div>
                    <div class="text-xs font-bold text-slate-900 dark:text-slate-100">{{ badge.title }}</div>
                    <div class="text-[10px] text-slate-400">{{ badge.detail }}</div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Complete a course, follow a mentor, or build a 7-day streak to unlock your first badge.
            </p>
          }
        </div>

        <section class="space-y-3" aria-labelledby="connected-mentors-title">
          <div class="flex items-center justify-between gap-3">
            <h4 id="connected-mentors-title" class="text-xs font-bold uppercase tracking-wider text-slate-400">Connected Mentors</h4>
            <button type="button" (click)="editOnboarding.emit()" class="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Update</button>
          </div>
          @if (connectedMentors().length) {
            <div class="grid gap-2 md:grid-cols-2">
              @for (mentor of connectedMentors(); track mentor.id) {
                <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-850">
                  <img [src]="mentor.avatar" [alt]="mentor.name" class="h-11 w-11 rounded-xl object-cover" referrerpolicy="no-referrer" />
                  <div class="min-w-0">
                    <p class="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{{ mentor.preferredNickname || mentor.name }}</p>
                    <p class="truncate text-[10px] text-slate-500 dark:text-slate-400">{{ mentor.title }}</p>
                  </div>
                </div>
              }
            </div>
          } @else {
            <button type="button" (click)="editOnboarding.emit()" class="w-full border border-dashed border-slate-300 px-3 py-4 text-left text-xs text-slate-500 hover:border-indigo-400 hover:text-indigo-600 focus-accessible dark:border-slate-700 dark:text-slate-400 dark:hover:text-indigo-300">Choose mentors to follow</button>
          }
        </section>

        <section id="profile-preferences" tabindex="-1" class="space-y-4 border-t border-slate-100 pt-4 outline-none dark:border-slate-800" aria-labelledby="profile-preferences-title">
          <h4 id="profile-preferences-title" class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Preferences & Accessibility</h4>

          <div class="space-y-3">
            <label class="block text-xs font-bold text-slate-900 dark:text-slate-100" for="profile-language">Choose language</label>
            <select id="profile-language" [value]="preferences.primaryLanguage()" (change)="preferences.setPrimaryLanguage(readValue($event))" class="border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              @for (language of preferences.languages; track language.name) {
                <option [value]="language.name">{{ language.name }}</option>
              }
            </select>
            <p class="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Lesson captions follow this language, and use English when that track is not available yet.</p>

            <label class="block text-xs font-bold text-slate-900 dark:text-slate-100" for="profile-language-secondary">2nd language <span class="font-medium text-slate-500">(optional)</span></label>
            <select id="profile-language-secondary" [value]="preferences.secondaryLanguage()" (change)="preferences.setSecondaryLanguage(readValue($event))" class="border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <option value="">None</option>
              @for (language of preferences.languages; track language.name) {
                <option [value]="language.name">{{ language.name }}</option>
              }
            </select>
          </div>

          <fieldset class="space-y-2">
            <legend class="text-xs font-bold text-slate-900 dark:text-slate-100">Birthday <span class="font-medium text-slate-500">(optional, month and day)</span></legend>
            <p class="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Add a month and day if you would like a birthday message. No year is stored, and no extra sign-in permission is required.</p>
            <div class="grid grid-cols-2 gap-2">
              <select id="profile-birthday-month" aria-label="Birthday month" [value]="preferences.birthdayMonth() ?? ''" (change)="onBirthdayMonth($event)" class="border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <option value="">Month</option>
                @for (month of preferences.months; track month.value) {
                  <option [value]="month.value">{{ month.label }}</option>
                }
              </select>
              <select id="profile-birthday-day" aria-label="Birthday day" [value]="preferences.birthdayDay() ?? ''" (change)="onBirthdayDay($event)" [disabled]="!preferences.birthdayMonth()" class="border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <option value="">Day</option>
                @for (day of preferences.birthdayDayOptions(); track day) {
                  <option [value]="day">{{ day }}</option>
                }
              </select>
            </div>
          </fieldset>

          @if (firebaseService.hasActiveSession()) {
            <section aria-labelledby="profile-notifications-title" class="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-850">
              <div class="flex min-w-0 items-start gap-3">
                <mat-icon class="shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true">{{ reminders.notificationsEnabled() ? 'notifications_active' : 'notifications_none' }}</mat-icon>
                <div class="min-w-0">
                  <h4 id="profile-notifications-title" class="text-sm font-bold text-slate-900 dark:text-slate-100">Daily Message notifications</h4>
                  <p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {{ reminders.notificationsEnabled() ? 'A short mentor message arrives on the default schedule.' : 'Turn on a daily mentor message. It follows the default schedule.' }}
                  </p>
                </div>
              </div>
              <button
                id="daily-message-reminder-toggle"
                type="button"
                role="switch"
                (click)="reminders.toggleNotifications()"
                [attr.aria-checked]="reminders.notificationsEnabled()"
                aria-labelledby="profile-notifications-title"
                class="relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition focus-accessible"
                [class]="reminders.notificationsEnabled() ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'"
              >
                <span class="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all" [class]="reminders.notificationsEnabled() ? 'left-6' : 'left-1'"></span>
              </button>
            </section>
          }

          <div id="offline-reading-note" class="rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-850">
            <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100">Offline reading available</h4>
            <p class="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">Saved lessons and messages can be read offline, even when you are not connected.</p>
          </div>

          <div class="space-y-3" aria-labelledby="profile-accessibility-title">
            <h4 id="profile-accessibility-title" class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Accessibility</h4>

            <div class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-850">
              <div>
                <div id="profile-contrast-label" class="text-xs font-bold text-slate-900 dark:text-slate-100">High Contrast</div>
                <div class="text-[11px] text-slate-600 dark:text-slate-300">Stronger text and borders, without muted gray type.</div>
              </div>
              <button
                id="toggle-contrast-dialog-btn"
                type="button"
                role="switch"
                (click)="themeService.toggleHighContrast()"
                [attr.aria-checked]="themeService.highContrast()"
                aria-labelledby="profile-contrast-label"
                class="relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition focus-accessible"
                [class]="themeService.highContrast() ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'"
              >
                <span class="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all" [class]="themeService.highContrast() ? 'left-6' : 'left-1'"></span>
              </button>
            </div>

            <div class="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-850" aria-disabled="true">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span id="profile-sign-language-label" class="text-xs font-bold text-slate-900 dark:text-slate-100">Sign Language</span>
                  <span class="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-200">Coming Soon (Intro Videos)</span>
                </div>
                <p class="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">Sign-language overlays are not on lessons yet. This option will start with intro videos.</p>
              </div>
              <button
                id="profile-sign-language-toggle"
                type="button"
                role="switch"
                disabled
                aria-checked="false"
                aria-labelledby="profile-sign-language-label"
                class="relative h-7 w-12 shrink-0 cursor-not-allowed rounded-full bg-slate-300 opacity-60 dark:bg-slate-700"
              >
                <span class="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow"></span>
              </button>
            </div>

            <label class="block text-xs font-bold text-slate-900 dark:text-slate-100" for="profile-text-size">Text Size</label>
            <select id="profile-text-size" [value]="themeService.fontSize()" (change)="onTextSize($event)" class="border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <option value="normal">Default</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>

            <div class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-850">
              <div>
                <div class="text-xs font-bold text-slate-900 dark:text-slate-100">Color Theme</div>
                <div class="text-[11px] text-slate-600 dark:text-slate-300">Currently in {{ themeService.theme() }} mode</div>
              </div>
              <button id="toggle-theme-dialog-btn" type="button" (click)="themeService.toggleTheme()" class="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 focus-accessible">
                Switch to {{ themeService.theme() === 'dark' ? 'Light' : 'Dark' }}
              </button>
            </div>

            <div class="grid gap-2">
              <button id="profile-app-tour" type="button" (click)="replayTour.emit()" class="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 px-4 py-2.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-accessible dark:border-indigo-900/60 dark:text-indigo-300 dark:hover:bg-indigo-950/40">
                <mat-icon class="text-base" aria-hidden="true">play_circle</mat-icon>
                App Tour
              </button>
              <button id="profile-explainer-video" type="button" (click)="openInfoVideo('explainer')" class="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 focus-accessible dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
                <mat-icon class="text-base" aria-hidden="true">smart_display</mat-icon>
                App Explainer Video
              </button>
              <button id="profile-investor-video" type="button" (click)="openInfoVideo('investor')" class="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 focus-accessible dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
                <mat-icon class="text-base" aria-hidden="true">smart_display</mat-icon>
                Investor Video
              </button>
            </div>
          </div>
        </section>

        <div class="border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            id="profile-logout-btn"
            type="button"
            (click)="logout()"
            class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-accessible dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
          >
            <mat-icon class="text-base">logout</mat-icon>
            Log Out
          </button>
        </div>
      </div>
      @if (infoVideo(); as video) {
        <div class="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-4 sm:items-center" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="profile-video-title" class="w-full max-w-lg space-y-4 rounded-3xl bg-white p-5 text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
            <h3 id="profile-video-title" class="text-base font-bold font-display">{{ video.title }}</h3>
            @if (video.url) {
              <video class="w-full rounded-2xl bg-black" controls playsinline [src]="video.url"></video>
            } @else {
              <p class="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">This video has not been uploaded yet.</p>
            }
            <button type="button" (click)="infoVideo.set(null)" class="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white focus-accessible">Close</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ProfileModalComponent {
  readonly closeModal = output<void>();
  readonly logoutComplete = output<void>();
  readonly editOnboarding = output<void>();
  readonly replayTour = output<void>();

  readonly dataService = inject(MentorshipDataService);
  readonly themeService = inject(ThemeAccessibilityService);
  readonly firebaseService = inject(FirebaseService);
  readonly reminders = inject(DailyMessageSchedulerService);
  readonly preferences = inject(UserPreferencesService);
  readonly curriculum = inject(CurriculumService);
  private readonly router = inject(Router);
  readonly infoVideo = signal<{title: string; url: string} | null>(null);
  readonly modulesCompleted = computed(() => this.curriculum.modules().filter(module =>
    module.units.length > 0 && module.units.every(unit => this.curriculum.isCompleted(module.id, unit.id))
  ).length);
  readonly activeProfile = computed(() => {
    const firestoreProfile = this.firebaseService.userProfile();
    const localProfile = this.dataService.userProfile();
    const mentorIds = firestoreProfile?.selectedMentorIds || [];
    const hasActiveSession = this.firebaseService.hasActiveSession();
    const authName = this.firebaseService.currentUser()?.displayName;
    return {
      fullName: firestoreProfile?.fullName || firestoreProfile?.displayName || authName || (hasActiveSession ? 'Profile sync pending' : localProfile.name),
      ageBracket: firestoreProfile?.ageBracket || (hasActiveSession ? 'Age bracket not saved' : localProfile.gradeOrAge),
      country: firestoreProfile?.country || (hasActiveSession ? 'Country not saved' : localProfile.country || 'Country not set'),
      streak: firestoreProfile?.streak ?? firestoreProfile?.streakDays ?? (hasActiveSession ? 0 : localProfile.streakDays),
      avatarUrl: firestoreProfile?.avatarUrl || null,
      focusAreas: firestoreProfile?.focusAreas || (hasActiveSession ? [] : localProfile.focusAreas),
      selectedMentors: mentorIds
        .map(id => this.dataService.mentors().find(mentor => mentor.id === id))
        .filter(mentor => mentor !== undefined),
      selectedMentorCount: mentorIds.length,
      role: firestoreProfile?.role || (hasActiveSession ? 'member' : localProfile.role),
      completedCourses: new Set(firestoreProfile?.completedCourses || []).size,
      lyftsReceived: firestoreProfile?.totalLyftsReceived,
      lyftsSent: firestoreProfile?.totalLyftsSent,
    };
  });

  readonly connectedMentors = computed(() => this.activeProfile().selectedMentors);
  readonly earnedBadges = computed(() => {
    const profile = this.firebaseService.userProfile();
    if (!profile) return [];

    const badges: {id: string; icon: string; title: string; detail: string}[] = [];
    const streak = profile.streak ?? profile.streakDays ?? 0;
    const completedCourses = new Set(profile.completedCourses || []).size;
    const mentorCount = profile.selectedMentorIds?.length ?? 0;

    if (streak >= 7) badges.push({id: 'streak', icon: 'local_fire_department', title: '7-Day Flame', detail: `${streak} consecutive days`});
    if (completedCourses > 0) badges.push({id: 'course', icon: 'school', title: 'Course Explorer', detail: `${completedCourses} course${completedCourses === 1 ? '' : 's'} completed`});
    if (mentorCount > 0) badges.push({id: 'mentor', icon: 'groups', title: 'Mentor Connected', detail: `${mentorCount} mentor${mentorCount === 1 ? '' : 's'} followed`});
    return badges;
  });

  constructor() {
    void this.firebaseService.loadUserProfileForSession();
  }

  scrollToPreferences(): void {
    const section = document.getElementById('profile-preferences');
    section?.scrollIntoView({behavior: 'smooth', block: 'start'});
    section?.focus({preventScroll: true});
  }

  openProgress(url: string): void {
    void this.router.navigateByUrl(url);
  }

  openInfoVideo(kind: keyof typeof PROFILE_VIDEOS): void {
    this.infoVideo.set(PROFILE_VIDEOS[kind]);
  }

  onTextSize(event: Event): void {
    const value = this.readValue(event);
    const size: AppFontSize = value === 'large' || value === 'extra-large' ? value : 'normal';
    this.themeService.setFontSize(size);
  }

  onBirthdayMonth(event: Event): void {
    const month = Number(this.readValue(event));
    this.preferences.setBirthday(Number.isInteger(month) && month > 0 ? month : null, this.preferences.birthdayDay());
  }

  onBirthdayDay(event: Event): void {
    const day = Number(this.readValue(event));
    this.preferences.setBirthday(this.preferences.birthdayMonth(), Number.isInteger(day) && day > 0 ? day : null);
  }

  readValue(event: Event): string {
    return event.target instanceof HTMLSelectElement ? event.target.value : '';
  }

  async logout(): Promise<void> {
    await this.firebaseService.logout();
    this.closeModal.emit();
    this.logoutComplete.emit();
  }
}
