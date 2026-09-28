import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {AudioPlayerService} from '../services/audio-player.service';

@Component({
  selector: 'app-audio-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (player.activeTrack()) {
      <!-- Mini Floating Player Bar -->
      <div
        id="mini-audio-player"
        class="fixed bottom-18 md:bottom-6 left-3 right-3 max-w-lg mx-auto z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-3.5 transition-all duration-300"
      >
        <!-- Progress Bar Line on Top -->
        <button
          type="button"
          class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2.5 cursor-pointer block p-0 border-0"
          (click)="onProgressBarClick($event)"
          aria-label="Seek audio track position"
        >
          <div
            class="bg-indigo-600 h-full rounded-full transition-all duration-150"
            [style.width.%]="player.progressPercent()"
          ></div>
        </button>

        <div class="flex items-center justify-between gap-3">
          <!-- Track Info & Thumbnail (Click to open full player) -->
          <button
            id="open-full-player-btn"
            type="button"
            (click)="player.toggleFullPlayer()"
            class="flex items-center gap-3 min-w-0 text-left cursor-pointer focus-accessible rounded-2xl flex-1"
            aria-label="Open full audio player view"
          >
            <div class="relative w-11 h-11 rounded-2xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
              <img
                [src]="player.activeTrack()?.speakerAvatar"
                [alt]="player.activeTrack()?.speaker || 'Speaker'"
                class="w-full h-full object-cover"
                referrerpolicy="no-referrer"
              />
              @if (player.isPlaying()) {
                <div class="absolute inset-0 bg-slate-950/40 flex items-center justify-center gap-0.5">
                  <div class="w-1 bg-amber-400 rounded-full animate-audio-bar-1 h-3"></div>
                  <div class="w-1 bg-indigo-400 rounded-full animate-audio-bar-2 h-4"></div>
                  <div class="w-1 bg-pink-400 rounded-full animate-audio-bar-3 h-2"></div>
                </div>
              }
            </div>

            <div class="min-w-0">
              <p class="text-sm font-bold text-slate-900 dark:text-slate-100 truncate leading-tight font-display">
                {{ player.activeTrack()?.title }}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {{ player.activeTrack()?.speaker }} • {{ player.formatTime(player.currentTime()) }} / {{ player.formatTime(player.duration()) }}
              </p>
            </div>
          </button>

          <!-- Quick Controls -->
          <div class="flex items-center gap-1.5 shrink-0">
            <!-- Skip -10s -->
            <button
              id="skip-back-btn"
              type="button"
              (click)="player.skip(-10)"
              class="w-9 h-9 flex items-center justify-center rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus-accessible"
              aria-label="Skip back 10 seconds"
              title="Skip back 10s"
            >
              <mat-icon class="text-xl">replay_10</mat-icon>
            </button>

            <!-- Play / Pause Main Button -->
            <button
              id="toggle-play-btn"
              type="button"
              (click)="player.togglePlay()"
              class="w-10 h-10 flex items-center justify-center rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer focus-accessible"
              [attr.aria-label]="player.isPlaying() ? 'Pause audio' : 'Play audio'"
            >
              <mat-icon class="text-2xl">{{ player.isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
            </button>

            <!-- Skip +10s -->
            <button
              id="skip-forward-btn"
              type="button"
              (click)="player.skip(10)"
              class="w-9 h-9 flex items-center justify-center rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus-accessible"
              aria-label="Skip forward 10 seconds"
              title="Skip forward 10s"
            >
              <mat-icon class="text-xl">forward_10</mat-icon>
            </button>

            <!-- Expand Full View -->
            <button
              id="expand-player-btn"
              type="button"
              (click)="player.toggleFullPlayer()"
              class="w-9 h-9 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus-accessible"
              aria-label="Expand player"
            >
              <mat-icon class="text-xl">expand_less</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Expanded Full Audio Sheet / Modal -->
      @if (player.showFullPlayer()) {
        <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4">
          <div
            id="full-audio-sheet"
            class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 shadow-2xl max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom duration-200"
          >
            <!-- Header Bar -->
            <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <span class="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                  {{ player.activeTrack()?.category }}
                </span>
                <span class="text-xs text-slate-400">
                  🎧 Spoken Focus Track
                </span>
              </div>

              <button
                id="close-full-player-btn"
                type="button"
                (click)="player.toggleFullPlayer()"
                class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 cursor-pointer focus-accessible"
                aria-label="Close full player"
              >
                <mat-icon>keyboard_arrow_down</mat-icon>
              </button>
            </div>

            <!-- Speaker Hero Art & Waveform -->
            <div class="py-6 flex flex-col items-center text-center">
              <div class="relative w-28 h-28 rounded-3xl overflow-hidden shadow-md border-2 border-indigo-500/30 mb-4">
                <img
                  [src]="player.activeTrack()?.speakerAvatar"
                  [alt]="player.activeTrack()?.speaker || 'Speaker'"
                  class="w-full h-full object-cover"
                  referrerpolicy="no-referrer"
                />
                @if (player.isPlaying()) {
                  <div class="absolute inset-0 bg-indigo-950/40 backdrop-blur-[1px] flex items-center justify-center">
                    <div class="flex items-center gap-1">
                      <span class="w-1.5 bg-amber-400 rounded-full animate-audio-bar-1 h-6"></span>
                      <span class="w-1.5 bg-indigo-300 rounded-full animate-audio-bar-2 h-10"></span>
                      <span class="w-1.5 bg-pink-400 rounded-full animate-audio-bar-3 h-8"></span>
                      <span class="w-1.5 bg-emerald-400 rounded-full animate-audio-bar-4 h-5"></span>
                    </div>
                  </div>
                }
              </div>

              <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight max-w-sm font-display">
                {{ player.activeTrack()?.title }}
              </h2>
              <p class="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                {{ player.activeTrack()?.speaker }}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ player.activeTrack()?.speakerRole }}
              </p>
            </div>

            <!-- Scrub Slider & Timers -->
            <div class="space-y-2">
              <div class="relative flex items-center">
                <input
                  id="audio-scrub-range"
                  type="range"
                  min="0"
                  [max]="player.duration()"
                  [value]="player.currentTime()"
                  (input)="onScrubChange($event)"
                  class="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus-accessible"
                  aria-label="Scrub audio timeline"
                />
              </div>
              <div class="flex justify-between text-xs font-mono text-slate-400">
                <span>{{ player.formatTime(player.currentTime()) }}</span>
                <span>{{ player.formatTime(player.duration()) }}</span>
              </div>
            </div>

            <!-- Playback Controls Cluster -->
            <div class="flex items-center justify-around py-5">
              <!-- Speed Selector -->
              <button
                id="speed-cycle-btn"
                type="button"
                (click)="cycleSpeed()"
                class="px-3 py-1.5 text-xs font-semibold font-mono rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer focus-accessible"
                aria-label="Change playback speed"
              >
                {{ player.playbackRate() }}x
              </button>

              <!-- Skip -10s -->
              <button
                id="modal-skip-back-btn"
                type="button"
                (click)="player.skip(-10)"
                class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer focus-accessible"
                aria-label="Rewind 10 seconds"
              >
                <mat-icon class="text-2xl">replay_10</mat-icon>
              </button>

              <!-- Play / Pause Large -->
              <button
                id="modal-toggle-play-btn"
                type="button"
                (click)="player.togglePlay()"
                class="w-16 h-16 rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition cursor-pointer focus-accessible"
                [attr.aria-label]="player.isPlaying() ? 'Pause audio' : 'Play audio'"
              >
                <mat-icon class="text-4xl">{{ player.isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
              </button>

              <!-- Skip +10s -->
              <button
                id="modal-skip-fwd-btn"
                type="button"
                (click)="player.skip(10)"
                class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer focus-accessible"
                aria-label="Forward 10 seconds"
              >
                <mat-icon class="text-2xl">forward_10</mat-icon>
              </button>

              <!-- Transcript Toggle -->
              <button
                id="toggle-transcript-btn"
                type="button"
                (click)="player.toggleTranscript()"
                [class]="player.showTranscript() ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'"
                class="w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer focus-accessible"
                aria-label="Toggle transcript drawer"
                title="View Transcript"
              >
                <mat-icon class="text-xl">article</mat-icon>
              </button>
            </div>

            <!-- Transcript Drawer / Live Script Area -->
            @if (player.showTranscript()) {
              <div class="mt-2 p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-y-auto max-h-44 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-700">
                  <span class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Spoken Transcript
                  </span>
                  <span class="text-xs text-slate-400">
                    Accessible Text
                  </span>
                </div>
                <p class="font-normal text-xs sm:text-sm">{{ player.activeTrack()?.transcript }}</p>
              </div>
            }
          </div>
        </div>
      }
    }
  `,
})
export class AudioPlayerComponent {
  readonly player = inject(AudioPlayerService);

  onProgressBarClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * this.player.duration();
    this.player.seek(newTime);
  }

  onScrubChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    this.player.seek(value);
  }

  cycleSpeed(): void {
    const speeds = [0.75, 1, 1.25, 1.5];
    const current = this.player.playbackRate();
    const nextIdx = (speeds.indexOf(current) + 1) % speeds.length;
    this.player.setPlaybackRate(speeds[nextIdx]);
  }
}
