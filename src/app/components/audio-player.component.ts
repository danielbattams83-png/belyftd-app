import {cleanContent} from '../services/reading-content';
import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {AudioPlayerService} from '../services/audio-player.service';

@Component({
  selector: 'app-audio-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  host: {'(document:keydown.escape)': 'player.close()'},
  template: `
    @if (player.hasPlayableMedia()) {
      <section id="mini-audio-player" aria-label="Audio player"
        class="fixed bottom-20 md:bottom-6 left-3 right-3 max-w-lg mx-auto z-[60] space-y-3 rounded-3xl border border-slate-700 bg-[#333333] p-4 text-white shadow-2xl">
        <div class="flex items-start gap-3">
          <button type="button" (click)="player.toggleFullPlayer()" aria-label="Open full audio player"
            class="flex min-w-0 flex-1 items-center gap-3 text-left focus-accessible rounded-xl">
            <img [src]="player.activeTrack()?.speakerAvatar" alt="" class="h-11 w-11 shrink-0 rounded-xl object-cover" />
            <span class="min-w-0"><span class="block truncate text-sm font-bold">{{ player.activeTrack()?.title }}</span>
              <span class="block truncate text-xs text-slate-300">{{ player.mentorLanguageLabel() }}</span></span>
          </button>
          <button id="close-mini-player-btn" type="button" (click)="player.close()" aria-label="Close audio player" title="Close and stop audio"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-200 hover:bg-slate-700 focus-accessible">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        @if (player.isLoading()) { <p role="status" class="text-xs text-slate-300">Loading recording...</p> }
        @if (player.activeTrack()?.audioUrl) {
          <input type="range" min="0" step="0.1" [max]="player.duration()" [value]="player.currentTime()"
            [disabled]="!player.duration()" (input)="onScrubChange($event)" aria-label="Seek audio track position"
            class="block h-1.5 w-full cursor-pointer accent-[#1A9BEF] focus-accessible" />
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs tabular-nums text-slate-300">{{ player.formatTime(player.currentTime()) }} / {{ player.formatTime(player.duration()) }}</span>
            <div class="flex items-center gap-1">
              <button type="button" (click)="player.skip(-10)" aria-label="Rewind 10 seconds" class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-700 focus-accessible"><mat-icon>replay_10</mat-icon></button>
              <button id="toggle-play-btn" type="button" (click)="player.togglePlay()"
                [attr.aria-label]="player.isLoading() ? 'Cancel loading' : player.isPlaying() ? 'Pause audio' : 'Play audio'"
                class="flex h-11 w-11 items-center justify-center rounded-full bg-[#1A9BEF] text-white hover:bg-[#1689d4] focus-accessible">
                <mat-icon>{{ player.isLoading() ? 'close' : player.isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
              </button>
              <button id="stop-mini-player-btn" type="button" (click)="player.stop()" aria-label="Stop audio" title="Stop and rewind"
                class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-700 focus-accessible"><mat-icon>stop</mat-icon></button>
              <button type="button" (click)="player.skip(10)" aria-label="Forward 10 seconds" class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-700 focus-accessible"><mat-icon>forward_10</mat-icon></button>
            </div>
          </div>
        }
      </section>

      <!-- Expanded Full Audio Sheet / Modal -->
      @if (player.showFullPlayer()) {
        <div class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4">
          <div
            id="full-audio-sheet"
            class="bg-[#333333] text-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-700 p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto flex flex-col animate-in fade-in slide-in-from-bottom duration-200"
          >
            <!-- Header Bar -->
            <div class="sticky top-0 z-10 flex items-center justify-between gap-2 bg-[#333333] pb-4 border-b border-slate-700">
              <div class="flex min-w-0 flex-wrap items-center gap-2">
                <span class="px-3 py-1 text-xs font-semibold rounded-full bg-[#1A9BEF]/20 text-[#1A9BEF] border border-[#1A9BEF]/30">
                  {{ player.activeTrack()?.category }}
                </span>
                <span class="px-3 py-1 text-xs font-bold rounded-full bg-[#1A9BEF]/20 text-[#1A9BEF] border border-[#1A9BEF]/40 flex items-center gap-1">
                  <mat-icon class="text-sm">record_voice_over</mat-icon>
                  {{ player.mentorLanguageLabel() }}
                </span>
              </div>

              <div class="flex shrink-0 items-center gap-1">
              <button type="button" (click)="player.toggleFullPlayer()" aria-label="Minimize audio player"
                class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-700 focus-accessible"><mat-icon>keyboard_arrow_down</mat-icon></button>
              <button
                id="close-full-player-btn"
                type="button"
                (click)="player.close()"
                class="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 cursor-pointer focus-accessible"
                aria-label="Close full player"
              >
                <mat-icon>close</mat-icon>
              </button>
              </div>
            </div>
            <!-- Speaker Hero Art & Waveform -->
            <div class="py-6 flex flex-col items-center text-center">
              <div class="relative w-28 h-28 rounded-3xl overflow-hidden shadow-lg border-2 border-[#1A9BEF]/50 mb-4">
                <img
                  [src]="player.activeTrack()?.speakerAvatar"
                  [alt]="player.activeTrack()?.speaker || 'Speaker'"
                  class="w-full h-full object-cover"
                  referrerpolicy="no-referrer"
                />
                @if (player.isPlaying()) {
                  <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center">
                    <div class="flex items-center gap-1">
                      <span class="w-1.5 bg-[#1A9BEF] rounded-full animate-audio-bar-1 h-6"></span>
                      <span class="w-1.5 bg-[#1A9BEF] rounded-full animate-audio-bar-2 h-10"></span>
                      <span class="w-1.5 bg-[#1A9BEF] rounded-full animate-audio-bar-3 h-8"></span>
                      <span class="w-1.5 bg-[#1A9BEF] rounded-full animate-audio-bar-4 h-5"></span>
                    </div>
                  </div>
                }
              </div>

              <h2 class="text-xl font-bold text-white tracking-tight max-w-sm font-display">
                {{ player.activeTrack()?.title }}
              </h2>
              <p class="text-sm font-bold text-[#1A9BEF] mt-1 flex items-center gap-1 justify-center">
                <mat-icon class="text-base">record_voice_over</mat-icon>
                {{ player.mentorLanguageLabel() }}
              </p>
              <p class="text-xs text-slate-400 mt-0.5">
                {{ player.activeTrack()?.speakerRole }}
              </p>
            </div>

            @if (player.activeTrack()?.audioUrl) {
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
                  class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#1A9BEF] focus-accessible"
                  [style.background]="'linear-gradient(to right, #1A9BEF ' + player.progressPercent() + '%, #475569 ' + player.progressPercent() + '%)'"
                  aria-label="Scrub audio timeline"
                />
              </div>
              <div class="flex justify-between text-xs font-mono text-slate-400">
                <span>{{ player.formatTime(player.currentTime()) }}</span>
                <span>{{ player.formatTime(player.duration()) }}</span>
              </div>
            </div>

            <!-- Playback Controls Cluster -->
            <div class="flex flex-wrap items-center justify-center gap-3 py-5">
              <!-- Speed Selector -->
              <button
                id="speed-cycle-btn"
                type="button"
                (click)="cycleSpeed()"
                class="px-3 py-1.5 text-xs font-semibold font-mono rounded-xl bg-slate-700 text-slate-200 hover:bg-slate-600 cursor-pointer focus-accessible"
                aria-label="Change playback speed"
              >
                {{ player.playbackRate() }}x
              </button>

              <!-- Skip -10s -->
              <button
                id="modal-skip-back-btn"
                type="button"
                (click)="player.skip(-10)"
                class="w-12 h-12 rounded-2xl bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center cursor-pointer focus-accessible"
                aria-label="Rewind 10 seconds"
              >
                <mat-icon class="text-2xl">replay_10</mat-icon>
              </button>

              <!-- Play / Pause Large -->
              <button
                id="modal-toggle-play-btn"
                type="button"
                (click)="player.togglePlay()"
                class="w-16 h-16 rounded-3xl bg-[#1A9BEF] hover:bg-[#1689d4] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer focus-accessible"
                [attr.aria-label]="player.isLoading() ? 'Cancel loading' : player.isPlaying() ? 'Pause audio' : 'Play audio'"
              >
                <mat-icon class="text-4xl">{{ player.isLoading() ? 'hourglass_top' : player.isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
              </button>

              <button id="stop-full-player-btn" type="button" (click)="player.stop()" aria-label="Stop audio"
                class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-700 text-white hover:bg-slate-600 focus-accessible"><mat-icon>stop</mat-icon></button>

              <!-- Skip +10s -->
              <button
                id="modal-skip-fwd-btn"
                type="button"
                (click)="player.skip(10)"
                class="w-12 h-12 rounded-2xl bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center cursor-pointer focus-accessible"
                aria-label="Forward 10 seconds"
              >
                <mat-icon class="text-2xl">forward_10</mat-icon>
              </button>

              <!-- Transcript Toggle -->
              <button
                id="toggle-transcript-btn"
                type="button"
                (click)="player.toggleTranscript()"
                [class]="player.showTranscript() ? 'text-white bg-[#1A9BEF]' : 'text-slate-400 bg-slate-700'"
                class="w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer focus-accessible"
                aria-label="Toggle transcript drawer"
                title="View Transcript"
              >
                <mat-icon class="text-xl">article</mat-icon>
              </button>
            </div>

            }
            <!-- Transcript Drawer / Live Script Area -->
            @if (player.showTranscript()) {
              <div class="mt-2 p-4 bg-slate-800 rounded-2xl border border-slate-700 overflow-y-auto max-h-44 text-sm leading-relaxed text-slate-200">
                <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-700">
                  <span class="text-xs font-bold uppercase tracking-wider text-[#1A9BEF]">
                    Spoken Transcript
                  </span>
                  <span class="text-xs text-slate-400">
                    Accessible Text
                  </span>
                </div>
                <p class="font-normal text-xs sm:text-sm">{{ cleanContent(player.activeTrack()?.transcript) }}</p>
              </div>
            }
          </div>
        </div>
      }
    }
  `,
})
export class AudioPlayerComponent {
  readonly cleanContent = cleanContent;
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
