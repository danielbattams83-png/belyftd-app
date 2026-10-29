import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {AudioTrack, Mentor} from '../models/app.models';

export interface CurriculumMentorAudio { mentor: Mentor; tracks: AudioTrack[]; }

@Component({
  selector: 'app-curriculum-mentor-hub',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="mentor-hub-title">
      <header><span class="eyebrow">YOUR COMPANION</span><mat-icon aria-hidden="true">headphones</mat-icon></header>
      <h3 id="mentor-hub-title">Mentor Audio Hub</h3>
      @if (active(); as item) {
        <div class="mentor-tabs" aria-label="Your chosen mentors">
          @for (option of options(); track option.mentor.id) {
            <button type="button" [attr.aria-pressed]="option.mentor.id === item.mentor.id" (click)="selectMentor(option.mentor.id)">{{ option.mentor.name }}</button>
          }
        </div>
        <div class="mentor-profile">
          <img [src]="item.mentor.avatar" alt="" width="76" height="80" loading="lazy">
          <div><h4>{{ item.mentor.name }} @if (item.mentor.verified) {<mat-icon role="img" aria-label="Verified mentor">verified</mat-icon>}</h4><p>{{ item.mentor.title }}</p></div>
        </div>
        <div class="language-chips" aria-label="Recording language">
          @for (language of languages(); track language) {
            <button type="button" [attr.aria-pressed]="language === activeLanguage()" (click)="chosenLanguage.set(language)">{{ language }}</button>
          }
        </div>
        @if (selectedTrack(); as track) {
          <label for="companion-recording">Choose a lesson</label>
          <select id="companion-recording" [value]="track.id" (change)="chosenTrack.set($any($event.target).value)">
            @for (recording of recordings(); track recording.id) {<option [value]="recording.id">{{ recording.title }}</option>}
          </select>
          <button type="button" class="play-button" [attr.aria-label]="'Play ' + track.title + ' with ' + item.mentor.name" (click)="playRecording.emit(track)"><mat-icon aria-hidden="true">play_arrow</mat-icon>Play lesson</button>
        } @else {<p role="status">{{ loading() ? 'Loading recordings…' : error() || 'No recordings available for this mentor on your current plan.' }}</p>}
      } @else {
        <p>Keep a familiar voice alongside your learning. Choose your mentors to see their recordings here.</p>
        <button type="button" class="play-button" (click)="chooseMentors.emit()">{{ signedIn() ? 'Choose your mentors' : 'Sign in to choose mentors' }}<mat-icon aria-hidden="true">arrow_forward</mat-icon></button>
      }
    </section>
  `,
  styleUrl: './curriculum-mentor-hub.component.scss',
})
export class CurriculumMentorHubComponent {
  readonly options = input<CurriculumMentorAudio[]>([]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly signedIn = input(false);
  readonly playRecording = output<AudioTrack>();
  readonly chooseMentors = output<void>();
  readonly chosenMentor = signal('');
  readonly chosenLanguage = signal('');
  readonly chosenTrack = signal('');
  readonly active = computed(() => this.options().find(item => item.mentor.id === this.chosenMentor()) ?? this.options()[0]);
  readonly languages = computed(() => [...new Set((this.active()?.tracks ?? []).map(track => track.language || 'English'))]);
  readonly activeLanguage = computed(() => this.languages().includes(this.chosenLanguage()) ? this.chosenLanguage() : this.languages()[0]);
  readonly recordings = computed(() => (this.active()?.tracks ?? []).filter(track => (track.language || 'English') === this.activeLanguage()));
  readonly selectedTrack = computed(() => this.recordings().find(track => track.id === this.chosenTrack()) ?? this.recordings()[0]);

  selectMentor(id: string): void {
    this.chosenMentor.set(id);
    this.chosenLanguage.set('');
    this.chosenTrack.set('');
  }
}
