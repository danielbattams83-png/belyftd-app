import {AfterViewInit, ChangeDetectionStrategy, Component, inject, input, OnDestroy, OnInit, output, signal} from '@angular/core';
import {A11yModule} from '@angular/cdk/a11y';
import {MatIconModule} from '@angular/material/icon';
import {FirebaseService} from '../services/firebase.service';

export type WalkthroughTab = 'daily-lyft' | 'courses' | 'mentors' | 'quests' | 'coach-spark' | 'community' | 'partners' | 'profile';

interface WalkthroughStep {
  title: string;
  sentence: string;
  icon: string;
  section: string;
  tab: WalkthroughTab;
  targetSelectors: string[];
}

@Component({
  selector: 'app-feature-walkthrough',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-[80]" role="presentation" aria-hidden="true">
      @if (targetRect(); as target) {
        <div
          class="pointer-events-none absolute rounded-2xl border-2 border-white ring-4 ring-indigo-400/80 shadow-[0_0_0_100vmax_rgba(15,23,42,0.65)] transition-[top,left,width,height] duration-300 motion-reduce:transition-none"
          [style.left.px]="target.left"
          [style.top.px]="target.top"
          [style.width.px]="target.width"
          [style.height.px]="target.height"
        ></div>
      } @else {
        <div class="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px]"></div>
      }
    </div>

    <section
      id="feature-tour-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feature-tour-title"
      aria-describedby="feature-tour-sentence"
      cdkTrapFocus
      [cdkTrapFocusAutoCapture]="true"
      (keydown.escape)="skipTour()"
      class="fixed left-3 right-3 z-[82] mx-auto flex max-h-[min(58dvh,28rem)] w-auto max-w-none flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl sm:left-auto sm:right-6 sm:w-[24rem] sm:max-w-[calc(100vw-3rem)] sm:max-h-[min(72vh,34rem)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      [style.top.px]="panelTop()"
      [style.bottom]="panelTop() === null ? 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' : null"
    >
      <div class="shrink-0 border-b border-slate-200 px-4 pb-4 pt-4 sm:px-5 dark:border-slate-800">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300" aria-hidden="true">
              <mat-icon>{{ steps[stepIndex()].icon }}</mat-icon>
            </span>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-300">Be Lyft'd tour</p>
              <h1 id="feature-tour-title" class="mt-0.5 text-lg font-bold leading-tight font-display">{{ steps[stepIndex()].title }}</h1>
            </div>
          </div>
          <button
            type="button"
            (click)="skipTour()"
            [disabled]="saving()"
            class="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 focus-accessible dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Skip tour
            <mat-icon class="text-base" aria-hidden="true">close</mat-icon>
          </button>
        </div>

        <div class="mt-4" role="progressbar" aria-label="Tour progress" aria-valuemin="1" [attr.aria-valuemax]="steps.length" [attr.aria-valuenow]="stepIndex() + 1" [attr.aria-valuetext]="'Step ' + (stepIndex() + 1) + ' of ' + steps.length">
          <div class="mb-2 flex items-center justify-between text-xs">
            <span class="font-semibold text-slate-500 dark:text-slate-400" aria-live="polite" aria-atomic="true">Step {{ stepIndex() + 1 }} of {{ steps.length }}</span>
            <span class="text-slate-400 dark:text-slate-500">{{ steps[stepIndex()].section }}</span>
          </div>
          <div class="grid grid-cols-8 gap-1" aria-hidden="true">
            @for (item of steps; track item.title; let index = $index) {
              <span class="h-1 rounded-full transition-colors duration-200 motion-reduce:transition-none" [class.bg-indigo-600]="index <= stepIndex()" [class.dark:bg-indigo-400]="index <= stepIndex()" [class.bg-slate-200]="index > stepIndex()" [class.dark:bg-slate-700]="index > stepIndex()"></span>
            }
          </div>
        </div>
      </div>

      <div id="feature-tour-step-copy" class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5" aria-live="polite" aria-atomic="true">
        <p id="feature-tour-sentence" class="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{{ steps[stepIndex()].sentence }}</p>

        @if (speechUnavailable()) {
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400" role="status">Audio guide unavailable in this browser.</p>
        }
        @if (saveError()) {
          <p class="mt-3 text-xs text-rose-700 dark:text-rose-300" role="alert">Could not save tour progress. Try again.</p>
        }
      </div>

      <footer class="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:px-5 dark:border-slate-800">
        <div class="flex items-center gap-1">
          <button type="button" (click)="toggleGuide()" [attr.aria-label]="speaking() ? 'Stop audio guide' : 'Listen to this step'" [title]="speaking() ? 'Stop audio guide' : 'Listen to this step'" class="inline-flex h-11 w-11 items-center justify-center rounded-lg text-indigo-700 transition hover:bg-indigo-50 focus-accessible dark:text-indigo-300 dark:hover:bg-indigo-950/60">
            <mat-icon aria-hidden="true">{{ speaking() ? 'stop' : 'graphic_eq' }}</mat-icon>
          </button>
          <button type="button" (click)="back()" [disabled]="stepIndex() === 0 || saving()" class="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 focus-accessible dark:text-slate-300 dark:hover:bg-slate-800">
            <mat-icon class="text-lg" aria-hidden="true">arrow_back</mat-icon>
            Back
          </button>
        </div>
        @if (stepIndex() < steps.length - 1) {
          <button type="button" (click)="next()" [disabled]="saving()" class="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 focus-accessible disabled:opacity-50">
            Next
            <mat-icon class="text-lg" aria-hidden="true">arrow_forward</mat-icon>
          </button>
        } @else {
          <button type="button" (click)="finish()" [disabled]="saving()" class="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 focus-accessible disabled:opacity-60">
            {{ saving() ? 'Saving…' : 'Finish tour' }}
            @if (saving()) { <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true"></span> }
            @else { <mat-icon class="text-lg" aria-hidden="true">check</mat-icon> }
          </button>
        }
      </footer>
    </section>
  `
})
export class FeatureWalkthroughComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly completed = output<void>();
  readonly initialTab = input<WalkthroughTab>('daily-lyft');
  readonly tabChange = output<WalkthroughTab>();
  readonly steps: WalkthroughStep[] = [
    {title: 'Start with a daily reset', sentence: 'Find a short encouragement, play an audio reset, and check in with your mood to shape the guidance you see.', icon: 'auto_awesome', section: 'Home', tab: 'daily-lyft', targetSelectors: ['#daily-mood-checkin', '#start-todays-lesson-btn']},
    {title: 'Learn at your pace', sentence: 'Explore bite-sized courses, follow your progress, and return to lessons when you are ready.', icon: 'auto_stories', section: 'Courses', tab: 'courses', targetSelectors: ['#courses-tour-anchor']},
    {title: 'Reflect out loud', sentence: 'Use Voice Journal to record a private reflection whenever you want to get your thoughts out.', icon: 'mic', section: 'Voice Journal', tab: 'daily-lyft', targetSelectors: ['#quick-record-voice-btn']},
    {title: 'Find support that fits', sentence: 'Browse mentors by age and specialty, then connect directly with someone who understands your goals.', icon: 'people_alt', section: 'Mentors', tab: 'mentors', targetSelectors: ['#mentors-tour-anchor']},
    {title: 'Turn goals into action', sentence: 'Create a Growth Quest, break it into manageable steps, and track your progress along the way.', icon: 'flag', section: 'Quests', tab: 'quests', targetSelectors: ['#add-quest-header-btn']},
    {title: 'Lift up your community', sentence: 'Share a win or encourage someone on the Hype Wall. The Partners page introduces organizations investing in the youth community.', icon: 'forum', section: 'Community', tab: 'community', targetSelectors: ['#community-tour-anchor']},
    {title: 'Build a steady rhythm', sentence: 'Your streak makes daily practice visible. You can set reminders and find offline support in the app.', icon: 'local_fire_department', section: 'Home', tab: 'daily-lyft', targetSelectors: ['#streak-indicator-btn', '#daily-message-reminder-toggle']},
    {title: 'Make it yours', sentence: 'Visit your profile to update your details, change the theme, and adjust accessibility preferences.', icon: 'tune', section: 'Profile', tab: 'daily-lyft', targetSelectors: ['#open-profile-dialog-btn', '#nav-profile-dock-btn']}
  ];

  readonly stepIndex = signal(0);
  readonly targetRect = signal<{left: number; top: number; width: number; height: number} | null>(null);
  readonly speaking = signal(false);
  readonly speechUnavailable = signal(false);
  readonly saveError = signal(false);
  readonly saving = signal(false);
  private resizeObserver: ResizeObserver | null = null;
  private speechUtterance: SpeechSynthesisUtterance | null = null;
  private startingTab: WalkthroughTab = 'daily-lyft';

  private readonly firebaseService = inject(FirebaseService);

  ngOnInit(): void {
    this.startingTab = this.initialTab();
  }

  ngAfterViewInit(): void {
    window.addEventListener('resize', this.updateTarget);
    window.addEventListener('scroll', this.updateTarget, true);
    this.resizeObserver = new ResizeObserver(this.updateTarget);
    window.setTimeout(() => this.changeStep(0), 0);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.updateTarget);
    window.removeEventListener('scroll', this.updateTarget, true);
    this.resizeObserver?.disconnect();
    this.stopSpeech();
  }

  panelTop(): number | null {
    const target = this.targetRect();
    if (!target || typeof window === 'undefined') return null;
    const panelHeight = document.getElementById('feature-tour-panel')?.getBoundingClientRect().height ?? Math.min(window.innerHeight * 0.5, 320);
    const spaceBelow = window.innerHeight - target.top - target.height;
    const spaceAbove = target.top;
    if (spaceBelow >= panelHeight + 16) return null;
    if (spaceAbove >= panelHeight + 16) return 12;
    return spaceBelow >= spaceAbove ? null : 12;
  }

  next(): void {
    this.changeStep(Math.min(this.steps.length - 1, this.stepIndex() + 1));
  }

  back(): void {
    this.changeStep(Math.max(0, this.stepIndex() - 1));
  }

  async finish(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.saveError.set(false);
    try {
      await this.firebaseService.markAppTourCompleted();
      this.stopSpeech();
      this.closeTour();
    } catch (error) {
      console.error('[FeatureWalkthrough] Could not persist tour completion:', error);
      this.saveError.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  skipTour(): void {
    if (this.saving()) return;
    try {
      localStorage.setItem('tourCompleted', 'true');
    } catch (error) {
      console.warn('[FeatureWalkthrough] Could not save skipped tour locally:', error);
    }
    this.closeTour();
    void this.firebaseService.markAppTourCompleted().catch(error => {
      console.warn('[FeatureWalkthrough] Could not persist skipped tour:', error);
    });
  }

  speakGuide(): void {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      this.speechUnavailable.set(true);
      return;
    }

    this.speechUnavailable.set(false);
    this.stopSpeech();
    const currentStep = this.steps[this.stepIndex()];
    this.speechUtterance = new SpeechSynthesisUtterance(`${currentStep.title}. ${currentStep.sentence}`);
    this.speechUtterance.lang = 'en-US';
    this.speechUtterance.rate = 0.9;
    this.speechUtterance.onend = () => this.speaking.set(false);
    this.speechUtterance.onerror = () => this.speaking.set(false);
    this.speaking.set(true);
    window.speechSynthesis.speak(this.speechUtterance);
  }

  toggleGuide(): void {
    if (this.speaking()) {
      this.stopSpeech();
      return;
    }
    this.speakGuide();
  }

  private changeStep(index: number): void {
    this.stopSpeech();
    this.speechUnavailable.set(false);
    this.saveError.set(false);
    this.stepIndex.set(index);
    this.tabChange.emit(this.steps[index].tab);
    window.setTimeout(() => this.focusCurrentTarget(), 180);
  }

  private closeTour(): void {
    this.stopSpeech();
    this.tabChange.emit(this.startingTab);
    this.completed.emit();
  }

  private stopSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    this.speechUtterance = null;
    this.speaking.set(false);
  }

  private focusCurrentTarget(): void {
    const target = this.findCurrentTarget();
    if (!target) {
      this.targetRect.set(null);
      return;
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({behavior: reducedMotion ? 'instant' : 'smooth', block: 'center', inline: 'nearest'});
    this.resizeObserver?.disconnect();
    this.resizeObserver?.observe(target);
    window.setTimeout(this.updateTarget, reducedMotion ? 0 : 220);
  }

  private findCurrentTarget(): HTMLElement | null {
    const selectors = this.steps[this.stepIndex()].targetSelectors;
    for (const selector of selectors) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') return element;
    }
    return null;
  }

  private readonly updateTarget = (): void => {
    const target = this.findCurrentTarget();
    if (!target) {
      this.targetRect.set(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    const padding = 7;
    const width = Math.min(rect.width + padding * 2, window.innerWidth - 16);
    const height = Math.min(rect.height + padding * 2, window.innerHeight - 16);
    this.targetRect.set({
      left: Math.max(8, Math.min(rect.left - padding, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(rect.top - padding, window.innerHeight - height - 8)),
      width,
      height
    });
  };
}
