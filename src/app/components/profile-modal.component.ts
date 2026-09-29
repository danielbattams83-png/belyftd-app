import {ChangeDetectionStrategy, Component, computed, inject, output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {MentorshipDataService} from '../services/mentorship-data.service';
import {ThemeAccessibilityService} from '../services/theme-accessibility.service';
import {FirebaseService} from '../services/firebase.service';

@Component({
  selector: 'app-profile-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        id="user-profile-dialog"
        class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6"
      >
        <!-- Header -->
        <div class="flex items-center justify-between">
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

        <!-- User Identity Card -->
        <div class="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
          <img
            [src]="activeProfile().avatarUrl || dataService.userProfile().avatar"
            [alt]="activeProfile().fullName"
            class="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
            referrerpolicy="no-referrer"
          />
          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                {{ activeProfile().fullName }}
              </h4>
              <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 uppercase">
                {{ dataService.userProfile().role }}
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

        <!-- Stats Grid -->
        <div class="grid grid-cols-3 gap-2.5 text-center">
          <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-display">
              {{ dataService.userProfile().totalLyftsReceived }}
            </div>
            <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Lyfts Received</div>
          </div>
          <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="text-xl font-bold text-amber-600 dark:text-amber-400 font-display">
              {{ dataService.userProfile().totalLyftsSent }}
            </div>
            <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Lyfts Sent</div>
          </div>
          <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-display">
              {{ dataService.goalQuests().length }}
            </div>
            <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Active Quests</div>
          </div>
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
            Youth Growth Badges
          </h4>
          <div class="grid grid-cols-2 gap-2.5">
            <div class="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shadow-xs">
              <span class="text-2xl">🔥</span>
              <div>
                <div class="text-xs font-bold text-slate-900 dark:text-slate-100">7-Day Flame</div>
                <div class="text-[10px] text-slate-400">Daily check-in master</div>
              </div>
            </div>
            <div class="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shadow-xs">
              <span class="text-2xl">🎧</span>
              <div>
                <div class="text-xs font-bold text-slate-900 dark:text-slate-100">Audio Devotee</div>
                <div class="text-[10px] text-slate-400">10+ Pep talks listened</div>
              </div>
            </div>
            <div class="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shadow-xs">
              <span class="text-2xl">⚡</span>
              <div>
                <div class="text-xs font-bold text-slate-900 dark:text-slate-100">Goal Crusher</div>
                <div class="text-[10px] text-slate-400">5 Quests completed</div>
              </div>
            </div>
          </div>
        </div>

        <section class="space-y-3" aria-labelledby="connected-mentors-title">
          <div class="flex items-center justify-between gap-3">
            <h4 id="connected-mentors-title" class="text-xs font-bold uppercase tracking-wider text-slate-400">Connected Mentors</h4>
            <button type="button" (click)="editOnboarding.emit()" class="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Update</button>
          </div>
          @if (connectedMentors().length) {
            <div class="grid gap-2 sm:grid-cols-2">
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

        <!-- Accessibility & UI Preferences -->
        <div class="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Accessibility & Display
          </h4>

          <!-- Dark / Light Theme Toggle -->
          <div class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
            <div class="flex items-center gap-3">
              <mat-icon class="text-indigo-600 dark:text-indigo-400">
                {{ themeService.theme() === 'dark' ? 'dark_mode' : 'light_mode' }}
              </mat-icon>
              <div>
                <div class="text-xs font-bold text-slate-900 dark:text-slate-100">Color Theme</div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400">Currently in {{ themeService.theme() }} mode</div>
              </div>
            </div>

            <button
              id="toggle-theme-dialog-btn"
              type="button"
              (click)="themeService.toggleTheme()"
              class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer transition focus-accessible shadow-xs"
            >
              Switch to {{ themeService.theme() === 'dark' ? 'Light' : 'Dark' }}
            </button>
          </div>

          <!-- High Contrast Mode Toggle -->
          <div class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
            <div class="flex items-center gap-3">
              <mat-icon class="text-amber-500">contrast</mat-icon>
              <div>
                <div class="text-xs font-bold text-slate-900 dark:text-slate-100">High-Contrast Mode</div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400">Enhances border clarity & WCAG AA+ contrast</div>
              </div>
            </div>

            <button
              id="toggle-contrast-dialog-btn"
              type="button"
              (click)="themeService.toggleHighContrast()"
              [class]="themeService.highContrast() ? 'bg-amber-500 text-white font-semibold' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition focus-accessible shadow-xs"
            >
              {{ themeService.highContrast() ? 'Enabled' : 'Disabled' }}
            </button>
          </div>

          <!-- Font Size Scaling -->
          <div class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
            <div class="flex items-center gap-3">
              <mat-icon class="text-emerald-600">format_size</mat-icon>
              <div>
                <div class="text-xs font-bold text-slate-900 dark:text-slate-100">Text Size</div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400">Scale text for comfortable reading</div>
              </div>
            </div>

            <button
              id="toggle-font-size-btn"
              type="button"
              (click)="themeService.toggleFontSize()"
              class="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition focus-accessible shadow-xs"
            >
              {{ themeService.fontSize() === 'normal' ? 'A (Standard)' : 'A+ (Large)' }}
            </button>
          </div>
        </div>

        <!-- PWA Status & Offline Notice -->
        <div class="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div class="flex items-center gap-2">
            <mat-icon class="text-emerald-600 text-base">cloud_done</mat-icon>
            <span>PWA Offline-Ready & Synced</span>
          </div>
          <span class="font-mono text-[10px]">v1.0 MVP</span>
        </div>

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
    </div>
  `,
})
export class ProfileModalComponent {
  readonly closeModal = output<void>();
  readonly logoutComplete = output<void>();
  readonly editOnboarding = output<void>();

  readonly dataService = inject(MentorshipDataService);
  readonly themeService = inject(ThemeAccessibilityService);
  readonly firebaseService = inject(FirebaseService);
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
      focusAreas: firestoreProfile?.focusAreas || localProfile.focusAreas,
      selectedMentors: mentorIds
        .map(id => this.dataService.mentors().find(mentor => mentor.id === id))
        .filter(mentor => mentor !== undefined),
    };
  });

  readonly connectedMentors = computed(() => this.activeProfile().selectedMentors);

  constructor() {
    void this.firebaseService.loadUserProfileForSession();
  }

  async logout(): Promise<void> {
    await this.firebaseService.logout();
    this.closeModal.emit();
    this.logoutComplete.emit();
  }
}
