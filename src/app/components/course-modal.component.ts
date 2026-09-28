import {ChangeDetectionStrategy, Component, inject, output, input, signal, computed, effect} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {Course} from '../models/app.models';
import {MentorshipDataService} from '../services/mentorship-data.service';
import {AudioPlayerService} from '../services/audio-player.service';

@Component({
  selector: 'app-course-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (course(); as c) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
        
        <div
          id="course-content-screen-container"
          class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
        >
          <!-- Top Back-Button Navigation Bar -->
          <header class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20">
            <button
              id="course-back-to-list-btn"
              type="button"
              (click)="onBack()"
              class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer focus-accessible"
            >
              <mat-icon class="text-base">arrow_back</mat-icon>
              <span>Back to Courses</span>
            </button>

            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 uppercase tracking-wider">
                Leadership Masterclass
              </span>
              <button
                id="course-screen-close-icon-btn"
                type="button"
                (click)="onBack()"
                class="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition focus-accessible"
                aria-label="Close lesson screen"
              >
                <mat-icon class="text-lg">close</mat-icon>
              </button>
            </div>
          </header>

          <!-- Scrollable Lesson Body -->
          <div class="flex-1 overflow-y-auto px-6 sm:px-10 py-6 sm:py-8 space-y-6">

            <!-- Course Title & Duration Header Area -->
            <section class="space-y-3">
              <div class="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span class="inline-flex items-center gap-1">
                  <mat-icon class="text-base text-indigo-600 dark:text-indigo-400">schedule</mat-icon>
                  {{ c.estimatedTime }} Duration
                </span>
                <span>•</span>
                <span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <mat-icon class="text-base">{{ c.isCompleted ? 'check_circle' : 'bolt' }}</mat-icon>
                  {{ c.isCompleted ? 'Lesson Completed' : '+100 XP Upon Completion' }}
                </span>
              </div>

              <h1 class="text-2xl sm:text-4xl font-extrabold font-display tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                {{ c.title }}
              </h1>

              <p class="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed border-l-3 border-indigo-600 pl-4 py-0.5">
                {{ c.description }}
              </p>
            </section>

            <!-- Custom Styled HTML5 Audio Player Widget -->
            <section class="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <mat-icon class="text-xl">headphones</mat-icon>
                  </div>
                  <div class="min-w-0">
                    <h4 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {{ c.title }} (Audio Lesson)
                    </h4>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Spoken Mentorship Narration • {{ c.estimatedTime }}
                    </p>
                  </div>
                </div>

                <button
                  id="course-audio-play-pause-btn"
                  type="button"
                  (click)="togglePlay(c)"
                  class="w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center cursor-pointer transition shadow-md focus-accessible shrink-0"
                  [attr.aria-label]="isPlaying() ? 'Pause audio' : 'Play audio'"
                >
                  <mat-icon class="text-xl">{{ isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
                </button>
              </div>

              <!-- Timeline Slider & Duration Counters -->
              <div class="space-y-1 pt-1">
                <div class="flex items-center gap-3">
                  <span class="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 w-9 text-right shrink-0">
                    {{ formatTime(currentTimeSec()) }}
                  </span>
                  
                  <input
                    type="range"
                    min="0"
                    max="100"
                    [value]="timelineProgress()"
                    (input)="onScrub($event)"
                    class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-600 focus-accessible"
                    aria-label="Audio timeline scrubber"
                  />

                  <span class="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 w-9 text-left shrink-0">
                    {{ formatTime(totalDurationSec()) }}
                  </span>
                </div>
              </div>
            </section>

            <!-- Clean Text Reader Area (Markdown) -->
            <article class="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 font-sans space-y-4 pt-2">
              <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 whitespace-pre-line leading-loose space-y-3 font-sans shadow-xs">
                {{ c.textContent }}
              </div>
            </article>

            <!-- Prominent 'Mark as Complete' Button -->
            <div class="pt-6 pb-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div class="flex items-center gap-2">
                @if (c.isCompleted) {
                  <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-900/50">
                    <mat-icon class="text-base">emoji_events</mat-icon>
                    Completed (+100 XP Earned)
                  </span>
                } @else {
                  <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                    <mat-icon class="text-base">radio_button_unchecked</mat-icon>
                    Ready for completion
                  </span>
                }
              </div>

              <div class="flex items-center gap-3 w-full sm:w-auto">
                <button
                  id="btn-mark-course-completed"
                  type="button"
                  (click)="markAsComplete(c)"
                  [class]="c.isCompleted 
                    ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'"
                  class="flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl text-sm font-bold cursor-pointer transition flex items-center justify-center gap-2 focus-accessible"
                >
                  <mat-icon class="text-lg">{{ c.isCompleted ? 'replay' : 'check_circle' }}</mat-icon>
                  <span>{{ c.isCompleted ? 'Review Again (Completed)' : 'Mark as Complete (+100 XP)' }}</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        <!-- Success Toast Confirmation Modal -->
        @if (showSuccessConfirmation()) {
          <div class="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
              <div class="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <mat-icon class="text-3xl">emoji_events</mat-icon>
              </div>

              <div>
                <h3 class="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
                  Course Completed!
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  You earned <strong class="text-emerald-600 dark:text-emerald-400">+100 XP</strong> for finishing <span class="font-semibold">{{ c.title }}</span>.
                </p>
              </div>

              <button
                id="btn-return-dashboard-after-success"
                type="button"
                (click)="confirmReturnDashboard()"
                class="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-md focus-accessible flex items-center justify-center gap-2"
              >
                <span>Return to Dashboard</span>
                <mat-icon class="text-base">arrow_forward</mat-icon>
              </button>
            </div>
          </div>
        }

      </div>
    }
  `
})
export class CourseModalComponent {
  readonly dataService = inject(MentorshipDataService);
  readonly audioPlayer = inject(AudioPlayerService);

  readonly course = input<Course | null>(null);
  readonly closeModal = output<void>();

  readonly isPlaying = signal<boolean>(false);
  readonly currentTimeSec = signal<number>(0);
  readonly totalDurationSec = signal<number>(360);
  readonly showSuccessConfirmation = signal<boolean>(false);

  readonly timelineProgress = computed(() => {
    const total = this.totalDurationSec();
    if (!total) return 0;
    return (this.currentTimeSec() / total) * 100;
  });

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const c = this.course();
      if (c) {
        const mins = parseInt(c.estimatedTime?.match(/\d+/)?.[0] || '6', 10);
        this.totalDurationSec.set(mins * 60);
        this.currentTimeSec.set(0);
        this.isPlaying.set(false);
      }
    });
  }

  togglePlay(c: Course): void {
    if (this.isPlaying()) {
      this.pauseAudio();
    } else {
      this.playAudio(c);
    }
  }

  playAudio(c: Course): void {
    this.isPlaying.set(true);
    this.audioPlayer.speakCustomScript(
      c.title,
      `${c.description} Key takeaway: ${c.textContent.slice(0, 320)}... Practice this today.`,
      'Be Lyft\'d Leadership Coach',
      'Leadership'
    );

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.currentTimeSec.update(t => {
        if (t >= this.totalDurationSec()) {
          this.pauseAudio();
          return this.totalDurationSec();
        }
        return t + 1;
      });
    }, 1000);
  }

  pauseAudio(): void {
    this.isPlaying.set(false);
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  onScrub(event: Event): void {
    const target = event.target as HTMLInputElement;
    const percent = parseFloat(target.value);
    const newSec = Math.round((percent / 100) * this.totalDurationSec());
    this.currentTimeSec.set(newSec);
  }

  markAsComplete(c: Course): void {
    this.dataService.markCourseCompleted(c.id);
    this.showSuccessConfirmation.set(true);
  }

  confirmReturnDashboard(): void {
    this.showSuccessConfirmation.set(false);
    this.closeModal.emit();
  }

  onBack(): void {
    this.pauseAudio();
    this.closeModal.emit();
  }

  formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}
