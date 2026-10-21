import {cleanContent} from '../services/reading-content';
import {BackButtonComponent} from './back-button.component';
import {MentorAudioComponent} from './mentor-audio.component';
import {ChangeDetectionStrategy, Component, inject, output, input, signal, computed} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {Course} from '../models/app.models';
import {MentorshipDataService} from '../services/mentorship-data.service';
import {AudioPlayerService} from '../services/audio-player.service';

@Component({
  selector: 'app-course-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BackButtonComponent, MentorAudioComponent, CommonModule, MatIconModule],
  styles: [`.unit-content-body { min-width: 0; max-width: 100%; overflow-wrap: anywhere; word-break: break-word; white-space: pre-line; }`],
  template: `
    @if (course(); as c) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
        
        <div
          id="course-content-screen-container"
          class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
        >
          <!-- Top Back-Button Navigation Bar -->
          <header class="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20">
            <app-back-button id="course-back-to-list-btn" label="Back to courses" [navigate]="false" (pressed)="onBack()" />

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

            <app-mentor-audio [tracks]="recordings()" />

            <!-- Clean Text Reader Area (Markdown) -->
            <article class="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 font-sans space-y-4 pt-2">
              <div class="unit-content-body bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 whitespace-pre-line leading-loose space-y-3 font-sans shadow-xs">
                {{ cleanContent(c.textContent) }}
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
                class="w-full py-3 px-4 rounded-xl bg-indigo-400 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-md focus-accessible flex items-center justify-center gap-2"
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
  readonly cleanContent = cleanContent;
  readonly dataService = inject(MentorshipDataService);
  readonly audioPlayer = inject(AudioPlayerService);

  readonly course = input<Course | null>(null);
  readonly closeModal = output<void>();

  readonly showSuccessConfirmation = signal<boolean>(false);
  readonly recordings = computed(() => {
    const course = this.course();
    if (!course) return [];
    const normalize = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '');
    return this.dataService.availableAudioTracks().filter(track => normalize(track.title) === normalize(course.title));
  });

  pauseAudio(): void {
    if (this.recordings().some(track => track.id === this.audioPlayer.activeTrack()?.id)) {
      this.audioPlayer.pause();
    }
  }

  markAsComplete(c: Course): void {
    this.dataService.markCourseCompleted(c.id);
    this.showSuccessConfirmation.set(true);
  }

  confirmReturnDashboard(): void {
    this.pauseAudio();
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
