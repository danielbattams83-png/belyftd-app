import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {AudioTrack} from '../models/app.models';

const MODULE_TITLES: Record<string, string> = {
  'module-2': 'Module 2 - Discovering Your Identity',
  'module-5': 'Module 5 - Building Resilience & Hope',
};

@Component({
  selector: 'app-mentor-recording-picker',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (selectedTrack(); as track) {
      <div class="space-y-4">
        <div class="grid min-w-0 gap-3">
          <label class="block min-w-0 space-y-1.5 text-xs font-semibold">
            <span>Module</span>
            <select aria-label="Module" [value]="moduleId()" (change)="chooseModule($event)"
              class="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus-accessible dark:border-slate-600 dark:bg-slate-900 dark:text-white">
              @for (module of modules(); track module.id) { <option [value]="module.id">{{ module.title }}</option> }
            </select>
          </label>
          <label class="block min-w-0 space-y-1.5 text-xs font-semibold">
            <span>Lesson</span>
            <select aria-label="Lesson" [value]="lessonId()" (change)="chooseLesson($event)"
              class="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus-accessible dark:border-slate-600 dark:bg-slate-900 dark:text-white">
              @for (lesson of lessons(); track lesson.id) { <option [value]="lesson.id">{{ lesson.title }}</option> }
            </select>
          </label>
          @if (showLanguageSelector()) {
            <label class="block min-w-0 space-y-1.5 text-xs font-semibold">
              <span>Language</span>
              <select aria-label="Language" [value]="language()" (change)="chooseLanguage($event)"
                class="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus-accessible dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                @for (option of languages(); track option) { <option [value]="option">{{ option }}</option> }
              </select>
            </label>
          }
        </div>
        <button type="button" (click)="playSelected()" [attr.aria-label]="'Play ' + track.title + ' in ' + track.language"
          class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A9BEF] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1689d4] focus-accessible">
          <mat-icon>play_arrow</mat-icon><span>Play lesson</span>
          @if (!showLanguageSelector()) { <span class="text-xs font-normal">({{ track.language }})</span> }
        </button>
      </div>
    }
  `,
})
export class MentorRecordingPickerComponent {
  readonly tracks = input.required<AudioTrack[]>();
  readonly showLanguageSelector = input(false);
  readonly playRecording = output<AudioTrack>();
  private readonly chosenModule = signal('');
  private readonly chosenLesson = signal('');
  private readonly chosenLanguage = signal('English');
  private readonly recordings = computed(() => this.tracks().flatMap(track => {
    const match = track.audioUrl?.match(/^course-content\/([^/]+)\/([^/]+)\/audio\/[^/]+$/);
    return match ? [{track, moduleId: match[1], lessonId: match[2]}] : [];
  }));
  readonly modules = computed(() => [...new Set(this.recordings().map(item => item.moduleId))]
    .sort((a, b) => a.localeCompare(b, undefined, {numeric: true}))
    .map(id => ({id, title: MODULE_TITLES[id] ?? id.replace(/^module-/, 'Module ')})));
  readonly moduleId = computed(() => this.modules().some(item => item.id === this.chosenModule())
    ? this.chosenModule() : this.modules()[0]?.id ?? '');
  readonly lessons = computed(() => [...new Map(this.recordings().filter(item => item.moduleId === this.moduleId())
    .map(item => [item.lessonId, {id: item.lessonId, title: item.track.title}])).values()]
    .sort((a, b) => a.id.localeCompare(b.id, undefined, {numeric: true})));
  readonly lessonId = computed(() => this.lessons().some(item => item.id === this.chosenLesson())
    ? this.chosenLesson() : this.lessons()[0]?.id ?? '');
  private readonly lessonRecordings = computed(() => this.recordings()
    .filter(item => item.moduleId === this.moduleId() && item.lessonId === this.lessonId()));
  readonly languages = computed(() => [...new Set(this.lessonRecordings().map(item => item.track.language).filter((language): language is string => !!language))].sort());
  readonly language = computed(() => this.languages().includes(this.chosenLanguage())
    ? this.chosenLanguage() : this.languages()[0] ?? '');
  readonly selectedTrack = computed(() => this.lessonRecordings().find(item => item.track.language === this.language())?.track);

  chooseModule(event: Event): void {
    this.chosenModule.set((event.target as HTMLSelectElement).value);
    this.chosenLesson.set('');
  }

  chooseLesson(event: Event): void {
    this.chosenLesson.set((event.target as HTMLSelectElement).value);
  }

  chooseLanguage(event: Event): void {
    this.chosenLanguage.set((event.target as HTMLSelectElement).value);
  }

  playSelected(): void {
    const track = this.selectedTrack();
    if (track) this.playRecording.emit(track);
  }
}
