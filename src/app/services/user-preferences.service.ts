import {Injectable, computed, effect, inject, signal} from '@angular/core';
import {FirebaseService} from './firebase.service';
import {countCompletedLifeLessons} from './curriculum.service';

export interface AppLanguage {
  name: string;
  codes: readonly string[];
}

/** Spoken-language options. `codes` are the BCP-47 tags a caption track may use. */
export const APP_LANGUAGES: readonly AppLanguage[] = [
  {name: 'English', codes: ['en', 'en-us', 'en-gb', 'en-au']},
  {name: 'French', codes: ['fr', 'fr-fr', 'fr-ca']},
  {name: 'Spanish', codes: ['es', 'es-es', 'es-mx', 'es-419']},
  {name: 'Mandarin', codes: ['zh', 'zh-hans', 'zh-cn', 'cmn']},
  {name: 'Cantonese', codes: ['yue', 'zh-hk', 'zh-yue']},
  {name: 'Portuguese', codes: ['pt', 'pt-br', 'pt-pt']},
  {name: 'Swahili', codes: ['sw', 'sw-ke', 'sw-tz']},
  {name: 'Nigerian Pidgin', codes: ['pcm']},
  {name: 'Indonesian', codes: ['id', 'id-id']},
  {name: 'Bahasa Gaul', codes: ['id-gaul']},
  {name: 'Japanese', codes: ['ja', 'ja-jp']},
  {name: 'Hindi', codes: ['hi', 'hi-in']},
  {name: 'Tamil', codes: ['ta', 'ta-in']},
  {name: 'Italian', codes: ['it', 'it-it']},
  {name: 'Greek', codes: ['el', 'el-gr']},
];

export const BIRTHDAY_MONTHS = [
  {value: 1, label: 'January', days: 31},
  {value: 2, label: 'February', days: 29},
  {value: 3, label: 'March', days: 31},
  {value: 4, label: 'April', days: 30},
  {value: 5, label: 'May', days: 31},
  {value: 6, label: 'June', days: 30},
  {value: 7, label: 'July', days: 31},
  {value: 8, label: 'August', days: 31},
  {value: 9, label: 'September', days: 30},
  {value: 10, label: 'October', days: 31},
  {value: 11, label: 'November', days: 30},
  {value: 12, label: 'December', days: 31},
] as const;

const PRIMARY_KEY = 'belyftd_primary_language';
const SECONDARY_KEY = 'belyftd_secondary_language';
const BIRTHDAY_KEY = 'belyftd_birthday';
const VIEWED_LESSONS_KEY = 'belyftd_life_lessons_viewed';
const DAILY_READS_KEY = 'belyftd_daily_messages_read';

const languageNames = new Set(APP_LANGUAGES.map(language => language.name));

function knownLanguage(value: string | null | undefined): string {
  return value && languageNames.has(value) ? value : 'English';
}

function readList(key: string): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(key: string, values: readonly string[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(values));
}

function lifeLessonKey(value: string): string | null {
  return value.match(/life-\d+/)?.[0] ?? null;
}

/** Profile language, birthday, caption language, and the counts behind the progress cards. */
@Injectable({providedIn: 'root'})
export class UserPreferencesService {
  private readonly firebase = inject(FirebaseService);
  private readonly watchedVideos = new WeakSet<HTMLVideoElement>();

  readonly languages = APP_LANGUAGES;
  readonly months = BIRTHDAY_MONTHS;
  readonly primaryLanguage = signal('English');
  readonly secondaryLanguage = signal('');
  readonly birthdayMonth = signal<number | null>(null);
  readonly birthdayDay = signal<number | null>(null);
  readonly viewedLifeLessons = signal<string[]>([]);
  readonly dailyMessageReads = signal<string[]>([]);

  readonly birthdayDayOptions = computed(() => {
    const month = this.months.find(item => item.value === this.birthdayMonth());
    const days = month?.days ?? 31;
    return Array.from({length: days}, (_, index) => index + 1);
  });

  readonly lifeLessonsCompleted = computed(() => countCompletedLifeLessons(new Set(this.firebase.userProfile()?.completedCourses ?? [])));

  readonly lifeLessonsViewed = computed(() => {
    const completed = (this.firebase.userProfile()?.completedCourses ?? [])
      .map(lifeLessonKey)
      .filter((id): id is string => id !== null);
    return new Set([...this.viewedLifeLessons(), ...completed]).size;
  });

  readonly dailyMessagesRead = computed(() => this.dailyMessageReads().length);

  readonly dailyMessageStreak = computed(() => {
    const profile = this.firebase.userProfile();
    return profile?.streak ?? profile?.streakDays ?? 0;
  });

  constructor() {
    if (typeof window !== 'undefined') {
      this.primaryLanguage.set(knownLanguage(localStorage.getItem(PRIMARY_KEY)));
      const secondary = localStorage.getItem(SECONDARY_KEY) || '';
      this.secondaryLanguage.set(languageNames.has(secondary) ? secondary : '');
      const birthday = localStorage.getItem(BIRTHDAY_KEY) || '';
      const [month, day] = birthday.split('-').map(part => Number(part));
      if (month >= 1 && month <= 12) this.birthdayMonth.set(month);
      if (day >= 1 && day <= 31) this.birthdayDay.set(day);
      this.viewedLifeLessons.set(readList(VIEWED_LESSONS_KEY));
      this.dailyMessageReads.set(readList(DAILY_READS_KEY));
      document.addEventListener('loadedmetadata', event => {
        if (event.target instanceof HTMLVideoElement) this.applyCaptions(event.target);
      }, true);
    }

    effect(() => {
      const profile = this.firebase.userProfile();
      if (!profile || typeof localStorage === 'undefined') return;
      if (localStorage.getItem(PRIMARY_KEY) === null && profile.preferredLanguage) {
        this.primaryLanguage.set(knownLanguage(profile.preferredLanguage));
      }
      if (localStorage.getItem(SECONDARY_KEY) === null && profile.secondaryLanguage) {
        const secondary = profile.secondaryLanguage;
        this.secondaryLanguage.set(languageNames.has(secondary) ? secondary : '');
      }
      if (localStorage.getItem(BIRTHDAY_KEY) === null && profile.birthdayMonth && profile.birthdayDay) {
        this.birthdayMonth.set(profile.birthdayMonth);
        this.birthdayDay.set(profile.birthdayDay);
      }
    });

    effect(() => {
      this.primaryLanguage();
      if (typeof document === 'undefined') return;
      const language = this.languages.find(item => item.name === this.primaryLanguage()) ?? this.languages[0];
      document.documentElement.lang = language.codes[0];
      document.documentElement.dataset['captionLanguage'] = language.name;
      document.querySelectorAll('video').forEach(video => this.applyCaptions(video));
    });
  }

  setPrimaryLanguage(language: string): void {
    const next = knownLanguage(language);
    this.primaryLanguage.set(next);
    if (typeof localStorage !== 'undefined') localStorage.setItem(PRIMARY_KEY, next);
    void this.firebase.savePreferenceFields({preferredLanguage: next});
  }

  setSecondaryLanguage(language: string): void {
    const next = languageNames.has(language) ? language : '';
    this.secondaryLanguage.set(next);
    if (typeof localStorage !== 'undefined') localStorage.setItem(SECONDARY_KEY, next);
    void this.firebase.savePreferenceFields({secondaryLanguage: next});
  }

  setBirthday(month: number | null, day: number | null): void {
    const validMonth = this.months.find(item => item.value === month) ?? null;
    const nextMonth = validMonth?.value ?? null;
    const maxDay = validMonth?.days ?? 0;
    const nextDay = nextMonth && day && day >= 1 && day <= maxDay ? day : null;
    this.birthdayMonth.set(nextMonth);
    this.birthdayDay.set(nextDay);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(BIRTHDAY_KEY, nextMonth && nextDay ? `${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}` : '');
    }
    void this.firebase.savePreferenceFields({birthdayMonth: nextMonth, birthdayDay: nextDay});
  }

  markLifeLessonViewed(id: string): void {
    const key = lifeLessonKey(id);
    if (!key || this.viewedLifeLessons().includes(key)) return;
    const next = [...this.viewedLifeLessons(), key];
    this.viewedLifeLessons.set(next);
    writeList(VIEWED_LESSONS_KEY, next);
  }

  markDailyMessageRead(date = new Date().toISOString().slice(0, 10)): void {
    if (this.dailyMessageReads().includes(date)) return;
    const next = [...this.dailyMessageReads(), date];
    this.dailyMessageReads.set(next);
    writeList(DAILY_READS_KEY, next);
  }

  /** Show the caption track for the primary language, or English when that track is missing. */
  applyCaptions(video: HTMLVideoElement): void {
    const language = this.languages.find(item => item.name === this.primaryLanguage()) ?? this.languages[0];
    video.lang = language.codes[0];
    if (!this.watchedVideos.has(video) && typeof video.textTracks?.addEventListener === 'function') {
      this.watchedVideos.add(video);
      video.textTracks.addEventListener('addtrack', () => this.applyCaptions(video));
    }
    const tracks = [...video.textTracks].filter(track => track.kind === 'subtitles' || track.kind === 'captions');
    if (!tracks.length) return;
    const chosen = tracks.find(track => this.trackMatches(track, this.primaryLanguage()))
      ?? tracks.find(track => this.trackMatches(track, 'English'));
    for (const track of tracks) track.mode = track === chosen ? 'showing' : 'disabled';
  }

  private trackMatches(track: TextTrack, languageName: string): boolean {
    const language = this.languages.find(item => item.name === languageName);
    if (!language) return false;
    const code = track.language.toLowerCase();
    const label = track.label.toLowerCase();
    if (label === language.name.toLowerCase()) return true;
    if (language.codes.includes(code)) return true;
    const base = language.codes[0];
    if (base.includes('-')) return false;
    return code.startsWith(`${base}-`) && !APP_LANGUAGES.some(other => other.name !== language.name && other.codes.includes(code));
  }
}
