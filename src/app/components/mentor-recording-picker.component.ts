import {getDefaultUnitForMentor, MentorAudioUnit} from '../services/course.service';
import {parseMentorLabel} from '../services/course-assets';
import {ChangeDetectionStrategy, Component, computed, input, output, signal, OnInit, OnChanges} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {FormsModule} from '@angular/forms';
import {AudioTrack} from '../models/app.models';

const MODULE_TITLES: Record<string, string> = {
  'module-2': 'Module 2 - Discovering Your Identity',
  'module-5': 'Module 5 - Building Resilience & Hope',
};

@Component({
  selector: 'app-mentor-recording-picker',
  imports: [MatIconModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'flex flex-1 flex-col'},
  template: `
    @if (selectedTrack(); as track) {
      <div class="flex flex-1 flex-col gap-4">
        <div class="grid min-w-0 gap-3">
          <label class="block min-w-0 space-y-1.5 text-xs font-semibold">
            <span>Module</span>
            <select aria-label="Module" [ngModel]="moduleId()" (ngModelChange)="chooseModule($event)"
              class="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus-accessible dark:border-slate-600 dark:bg-slate-900 dark:text-white">
              @for (module of modules(); track module.id) { <option [value]="module.id">{{ module.title }}</option> }
            </select>
          </label>
          <label class="block min-w-0 space-y-1.5 text-xs font-semibold">
            <span>Lesson</span>
            <select aria-label="Lesson" [ngModel]="lessonId()" (ngModelChange)="chooseLesson($event)"
              class="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus-accessible dark:border-slate-600 dark:bg-slate-900 dark:text-white">
              @for (lesson of lessons(); track lesson.id) { <option [value]="lesson.id">{{ lesson.title }}</option> }
            </select>
          </label>
          @if (showLanguageSelector()) {
            <label class="block min-w-0 space-y-1.5 text-xs font-semibold">
              <span>Language</span>
              <select aria-label="Language" [ngModel]="language()" (ngModelChange)="chooseLanguage($event)"
                class="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus-accessible dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                @for (option of languages(); track option) { <option [value]="option">{{ option }}</option> }
              </select>
            </label>
          }
        </div>
        <button type="button" (click)="playSelected()" [attr.aria-label]="'Play ' + track.title + ' in ' + track.language"
          class="play-btn mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-(--brand-accent) px-4 py-3 text-sm font-semibold text-white hover:bg-(--brand-accent-hover) focus-accessible">
          <mat-icon>play_arrow</mat-icon><span>Play lesson</span>
          @if (!showLanguageSelector()) { <span class="text-xs font-normal">({{ track.language }})</span> }
        </button>
      </div>
    }
  `,
})
export class MentorRecordingPickerComponent implements OnInit, OnChanges {
  readonly tracks = input.required<AudioTrack[]>();
  readonly showLanguageSelector = input(false);
  readonly playRecording = output<AudioTrack>();
  private userSelectedUnit = false;
  private readonly mentorId = computed(() => {
    const track = this.tracks()[0];
    return (track?.mentorName ?? (track ? parseMentorLabel(track.speaker).mentorName : '')).toLowerCase();
  });
  getDefaultUnitForMentor(mentorId = this.mentorId()): MentorAudioUnit | undefined {
    return getDefaultUnitForMentor(mentorId, this.tracks());
  }
  ngOnInit(): void { this.selectDefaultUnit(); }
  ngOnChanges(): void { if (!this.userSelectedUnit) this.selectDefaultUnit(); }
  private selectDefaultUnit(): void {
    const unit = this.getDefaultUnitForMentor();
    this.chosenModule.set(unit?.moduleId ?? '');
    this.chosenLesson.set(unit?.unitId ?? '');
  }
  private readonly chosenModule = signal('');
  private readonly chosenLesson = signal('');
  private readonly chosenLanguage = signal('');
  private readonly recordings = computed(() => this.tracks().flatMap(track => {
    const match = track.audioUrl?.trim().match(/^course-content\/(module-[1-9][0-9]*)\/(unit-[1-9][0-9]*)\/audio\/[^/]+\.mp3$/);
    const normalizedTrack = {...track, language: parseMentorLabel(`${track.mentorName ?? ''} (${track.language ?? ''})`).language};
    return match ? [{track: normalizedTrack, moduleId: match[1], lessonId: match[2]}] : [];
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
  readonly language = computed(() => {
    const defaultLanguage = this.mentorId() === 'omari' ? 'Swahili' : this.mentorId() === 'sophie' ? 'Chinese' : 'English';
    const preferred = this.chosenLanguage() || defaultLanguage;
    return this.languages().includes(preferred) ? preferred : this.languages()[0] ?? '';
  });
  readonly selectedTrack = computed(() => this.lessonRecordings().find(item => item.track.language === this.language())?.track);

  chooseModule(moduleId: string): void {
    this.userSelectedUnit = true;
    this.chosenModule.set(moduleId);
    this.chosenLesson.set('');
  }

  chooseLesson(lessonId: string): void {
    this.userSelectedUnit = true;
    this.chosenLesson.set(lessonId);
  }

  chooseLanguage(language: string): void {
    this.chosenLanguage.set(language);
  }

  playSelected(): void {
    const track = this.selectedTrack();
    if (track) this.playRecording.emit(track);
  }
}
