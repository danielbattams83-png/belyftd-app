import {AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, output, signal} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {FirebaseService} from '../services/firebase.service';

interface WalkthroughStep {
  title: string;
  sentence: string;
  targetSelectors: string[];
}

@Component({
  selector: 'app-feature-walkthrough',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="fixed inset-0 z-[80]" role="presentation">
      @if (targetRect(); as target) {
        <div
          class="pointer-events-none absolute rounded-3xl border-4 border-white ring-4 ring-indigo-400/80 shadow-[0_0_0_100vmax_rgba(15,23,42,0.78)] transition-all duration-300"
          [style.left.px]="target.left"
          [style.top.px]="target.top"
          [style.width.px]="target.width"
          [style.height.px]="target.height"
          aria-hidden="true"
        ></div>
      } @else {
        <div class="absolute inset-0 bg-slate-950/75" aria-hidden="true"></div>
      }

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-tour-title"
        aria-describedby="feature-tour-sentence"
        class="fixed left-4 right-4 z-[82] mx-auto w-auto max-w-sm border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:left-auto sm:right-8 sm:w-[22rem]"
        [style.top.px]="panelTop()"
        [style.bottom.px]="panelTop() === null ? 16 : null"
      >
        <div class="mb-3 flex items-center justify-between">
          <p class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">App tour</p>
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ stepIndex() + 1 }} / 4</span>
        </div>

        <div class="mb-4 flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-amber-50 dark:from-indigo-950/60 dark:via-slate-800 dark:to-amber-950/30">
          @switch (stepIndex()) {
            @case (0) {
              <svg viewBox="0 0 240 180" class="h-full w-full" role="img" aria-label="Headphones and audio waves">
                <circle cx="120" cy="88" r="65" fill="#e0e7ff" />
                <path d="M70 96V83a50 50 0 0 1 100 0v13" fill="none" stroke="#4f46e5" stroke-width="12" stroke-linecap="round" />
                <rect x="62" y="89" width="24" height="48" rx="11" fill="#6366f1" />
                <rect x="154" y="89" width="24" height="48" rx="11" fill="#6366f1" />
                <path d="M103 119v-17m17 30V88m17 31v-17" stroke="#f97316" stroke-width="8" stroke-linecap="round" />
                <circle cx="49" cy="57" r="5" fill="#fb923c" /><circle cx="190" cy="119" r="7" fill="#818cf8" />
              </svg>
            }
            @case (1) {
              <svg viewBox="0 0 240 180" class="h-full w-full" role="img" aria-label="Bright daily flame">
                <circle cx="120" cy="91" r="65" fill="#ffedd5" />
                <path d="M120 145c-29 0-47-18-43-43 3-18 18-29 22-51 16 10 21 21 20 33 10-7 17-19 17-34 26 25 33 43 27 65-5 19-21 30-43 30z" fill="#f97316" />
                <path d="M120 137c-14 0-23-9-20-22 2-9 9-14 13-25 8 7 11 13 9 21 7-4 10-10 11-17 12 14 15 24 11 33-4 7-12 10-24 10z" fill="#fbbf24" />
                <path d="M63 62l9 7m96-14-8 9M55 111l12-2m111 5-11-3" stroke="#fb923c" stroke-width="5" stroke-linecap="round" />
              </svg>
            }
            @case (2) {
              <svg viewBox="0 0 240 180" class="h-full w-full" role="img" aria-label="Mentors sharing a conversation">
                <circle cx="83" cy="77" r="27" fill="#f4c7a1" />
                <path d="M42 150c3-30 18-45 41-45s39 15 42 45" fill="#6366f1" />
                <path d="M58 72c2-23 12-34 28-34 17 0 27 12 28 34-12-2-22-10-27-19-7 11-17 17-29 19z" fill="#43302b" />
                <circle cx="157" cy="91" r="23" fill="#c98762" />
                <path d="M124 150c2-25 14-38 33-38 20 0 32 13 34 38" fill="#14b8a6" />
                <path d="M134 88c1-18 10-27 23-27s23 9 24 27c-10-1-18-6-23-14-5 8-13 13-24 14z" fill="#302521" />
                <path d="M70 25h78a13 13 0 0 1 13 13v17h-36l-14 12V55H70a13 13 0 0 1-13-13V38a13 13 0 0 1 13-13z" fill="white" stroke="#818cf8" stroke-width="3" />
                <circle cx="86" cy="41" r="4" fill="#6366f1" /><circle cx="103" cy="41" r="4" fill="#6366f1" /><circle cx="120" cy="41" r="4" fill="#6366f1" />
              </svg>
            }
            @default {
              <svg viewBox="0 0 240 180" class="h-full w-full" role="img" aria-label="Cloud syncing messages for offline use">
                <circle cx="120" cy="90" r="66" fill="#dbeafe" />
                <path d="M69 115h97a23 23 0 0 0 0-46c-4 0-8 1-11 3a37 37 0 0 0-70-2 23 23 0 0 0-16 45z" fill="white" stroke="#3b82f6" stroke-width="6" stroke-linejoin="round" />
                <path d="M92 99a30 30 0 0 1 50-17m6-2-6 2 1 7M148 112a30 30 0 0 1-50 17m-6 2 6-2-1-7" fill="none" stroke="#f97316" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M112 102h16" stroke="#6366f1" stroke-width="5" stroke-linecap="round" />
              </svg>
            }
          }
        </div>

        <h1 id="feature-tour-title" class="text-xl font-black text-slate-900 dark:text-slate-100">{{ steps[stepIndex()].title }}</h1>
        <p id="feature-tour-sentence" class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ steps[stepIndex()].sentence }}</p>

        <button
          type="button"
          (click)="speakGuide()"
          [disabled]="speaking()"
          class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-indigo-600 px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-60 focus-accessible dark:border-indigo-400 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
        >
          <mat-icon>{{ speaking() ? 'volume_up' : 'graphic_eq' }}</mat-icon>
          Tap to Hear Audio Guide
        </button>
        @if (speechUnavailable()) {
          <p class="mt-2 text-center text-xs text-slate-500 dark:text-slate-400" role="status">Audio guide unavailable in this browser.</p>
        }
        @if (saveError()) {
          <p class="mt-2 text-xs text-rose-700 dark:text-rose-300" role="alert">Could not save tour progress. Try again.</p>
        }

        <footer class="mt-5 flex items-center justify-between gap-2">
          <button type="button" (click)="back()" [disabled]="stepIndex() === 0" class="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-35 focus-accessible dark:text-slate-300 dark:hover:bg-slate-800">
            <mat-icon class="text-lg">arrow_back</mat-icon>
            Back
          </button>
          @if (stepIndex() < steps.length - 1) {
            <button type="button" (click)="next()" class="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-accessible">
              Next
              <mat-icon class="text-lg">arrow_forward</mat-icon>
            </button>
          } @else {
            <button type="button" (click)="finish()" [disabled]="saving()" class="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60 focus-accessible">
              Got It!
              <mat-icon class="text-lg">check</mat-icon>
            </button>
          }
        </footer>
      </section>
    </div>
  `
})
export class FeatureWalkthroughComponent implements AfterViewInit, OnDestroy {
  readonly completed = output<void>();
  readonly steps: WalkthroughStep[] = [
    {title: 'Daily Audio Uplift', sentence: 'Listen every day for inspiration.', targetSelectors: ['#daily-message-card']},
    {title: 'Keep Your Streak Alive', sentence: 'Check in daily to build habits.', targetSelectors: ['#streak-indicator-btn']},
    {title: 'Connect With Mentors', sentence: 'Reach out for guidance anytime.', targetSelectors: ['#desktop-mentors-nav-btn', '#nav-mentors-btn']},
    {title: 'Works Without Data', sentence: 'Messages load even offline.', targetSelectors: ['#pwa-status-badge']}
  ];

  readonly stepIndex = signal(0);
  readonly targetRect = signal<{left: number; top: number; width: number; height: number} | null>(null);
  readonly speaking = signal(false);
  readonly speechUnavailable = signal(false);
  readonly saveError = signal(false);
  readonly saving = signal(false);
  private resizeObserver: ResizeObserver | null = null;
  private speechUtterance: SpeechSynthesisUtterance | null = null;

  constructor(private readonly firebaseService: FirebaseService) {}

  ngAfterViewInit(): void {
    window.addEventListener('resize', this.updateTarget);
    window.addEventListener('scroll', this.updateTarget, true);
    this.focusCurrentTarget();
    this.resizeObserver = new ResizeObserver(this.updateTarget);
    for (const element of this.findTargetElements()) this.resizeObserver.observe(element);
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
    return target.top + target.height / 2 > window.innerHeight * 0.62 ? 16 : null;
  }

  next(): void {
    this.stopSpeech();
    this.stepIndex.update(index => Math.min(this.steps.length - 1, index + 1));
    this.focusCurrentTarget();
  }

  back(): void {
    this.stopSpeech();
    this.stepIndex.update(index => Math.max(0, index - 1));
    this.focusCurrentTarget();
  }

  async finish(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.saveError.set(false);
    try {
      await this.firebaseService.markAppTourCompleted();
      this.stopSpeech();
      this.completed.emit();
    } catch (error) {
      console.error('[FeatureWalkthrough] Could not persist tour completion:', error);
      this.saveError.set(true);
    } finally {
      this.saving.set(false);
    }
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
    target.scrollIntoView({behavior: 'smooth', block: 'center', inline: 'nearest'});
    window.setTimeout(this.updateTarget, 120);
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

  private findTargetElements(): HTMLElement[] {
    return this.steps.flatMap(step => step.targetSelectors)
      .map(selector => document.querySelector<HTMLElement>(selector))
      .filter((element): element is HTMLElement => element !== null);
  }

  private readonly updateTarget = (): void => {
    const target = this.findCurrentTarget();
    if (!target) {
      this.targetRect.set(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    const padding = 7;
    this.targetRect.set({
      left: Math.max(0, rect.left - padding),
      top: Math.max(0, rect.top - padding),
      width: Math.min(window.innerWidth, rect.width + padding * 2),
      height: Math.min(window.innerHeight, rect.height + padding * 2)
    });
  };
}
