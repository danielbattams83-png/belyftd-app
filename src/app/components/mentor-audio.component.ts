import {ChangeDetectionStrategy, Component, computed, inject, input, signal} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {AudioTrack} from '../models/app.models';
import {AudioPlayerService} from '../services/audio-player.service';

@Component({
  selector: 'app-mentor-audio',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block max-w-full'},
  styles: `.mentor-audio-card { max-width: 100%; padding: 1rem; border-radius: 12px; }`,
  template: `
    @if (selectedTrack()) {
    <section class="mentor-audio-card card space-y-4 rounded-3xl border border-slate-700 bg-[#333333] p-5 text-white shadow-xl" aria-label="Mentor audio player">
      @if (selectedTrack(); as track) {
        <label class="block space-y-2 text-sm font-semibold">
          <span>Mentor recording</span>
          <select class="w-full rounded-xl border border-slate-600 bg-[#333333] p-3 text-white focus-accessible"
            [value]="track.id" (change)="selectTrack($event)">
            @for (option of availableTracks(); track option.id) {
              <option [value]="option.id">{{ option.speaker }}</option>
            }
          </select>
        </label>
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm font-bold text-(--brand-accent)">{{ track.speaker }}</span>
          <button type="button" (click)="togglePlay()" class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-(--brand-accent) text-white hover:bg-(--brand-accent-hover) focus-accessible"
            [attr.aria-label]="isCurrent() && player.isLoading() ? 'Cancel loading' : isCurrent() && player.isPlaying() ? 'Pause audio' : 'Play audio'">
            <mat-icon>{{ isCurrent() && player.isLoading() ? 'hourglass_top' : isCurrent() && player.isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
          </button>
        </div>
        <input type="range" min="0" step="0.1" [max]="isCurrent() ? player.duration() : 0"
          [value]="isCurrent() ? player.currentTime() : 0" [disabled]="!isCurrent() || !player.duration()"
          (input)="seek($event)" aria-label="Seek mentor recording"
          class="h-2 w-full cursor-pointer appearance-none rounded-full accent-(--brand-accent) focus-accessible"
          [style.background]="progressBackground()" />
        <div class="flex justify-between text-xs text-slate-300">
          <span>{{ player.formatTime(isCurrent() ? player.currentTime() : 0) }}</span>
          <span>{{ player.formatTime(isCurrent() ? player.duration() : 0) }}</span>
        </div>
        @if (isCurrent() && player.isLoading()) { <p role="status" class="text-sm text-slate-300">Loading recording...</p> }
      }
    </section>
    }
  `,
})
export class MentorAudioComponent {
  readonly tracks = input.required<AudioTrack[]>();
  readonly player = inject(AudioPlayerService);
  private readonly selectedId = signal('');
  readonly availableTracks = computed(() => this.tracks().filter(track => this.player.isTrackAvailable(track)));
  readonly selectedTrack = computed(() => this.availableTracks().find(track => track.id === this.selectedId()) ?? this.availableTracks()[0]);
  readonly isCurrent = computed(() => !!this.selectedTrack() && this.player.activeTrack()?.id === this.selectedTrack()?.id);
  readonly progressBackground = computed(() => {
    const percent = this.isCurrent() ? this.player.progressPercent() : 0;
    return `linear-gradient(to right, var(--brand-accent) ${percent}%, #475569 ${percent}%)`;
  });

  selectTrack(event: Event): void {
    if (this.isCurrent()) this.player.pause();
    this.selectedId.set((event.target as HTMLSelectElement).value);
  }

  togglePlay(): void {
    const track = this.selectedTrack();
    if (!track) return;
    if (this.isCurrent()) this.player.togglePlay();
    else void this.player.playTrack(track);
  }

  seek(event: Event): void {
    if (this.isCurrent()) this.player.seek(Number((event.target as HTMLInputElement).value));
  }
}
