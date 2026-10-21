import catalogSnapshot from '../../models/course-catalog.json';
import {canAccessModule} from '../../services/tier.service';
import {computed, effect, inject, Injectable, signal} from '@angular/core';
import {AudioTrack} from '../../models/app.models';
import {ModuleUnitDocument} from '../../models/firestore.models';
import {FirebaseService} from '../../services/firebase.service';
import {MentorshipDataService} from '../../services/mentorship-data.service';
import {isProductionMentorVariant, parseMentorLabel} from '../../services/course-assets';
import {PRODUCTION_MENTORS} from '../../services/production-mentors';

interface MediaVariant {mentorName: string; language: string; type: 'audio' | 'video'}
export interface DiscoveryLesson {
  moduleId: string;
  unitId: string;
  title: string;
  tags: string[];
  description: string;
  variants: MediaVariant[];
}

export const DISCOVERY_INTENTS = [
  {label: '⚡ Quick Pep Talk', query: 'quick pep talk'},
  {label: '🎯 Goal Setting', query: 'goal setting'},
  {label: '🧠 Overcoming Doubt', query: 'overcoming doubt'},
  {label: '🗣️ Swahili Audio', query: 'Swahili audio'},
];

const normalize = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const groups = [
  ['pep', 'talk', 'motivation', 'motivated', 'unmotivated', 'encouragement', 'inspiration', 'inspired', 'hope', 'hopeless', 'momentum', 'positive', 'optimism'],
  ['goal', 'goals', 'setting', 'ambition', 'planning', 'plan', 'purpose', 'achievement', 'success'],
  ['doubt', 'doubting', 'confidence', 'courage', 'fear', 'afraid', 'resilience', 'odds', 'belief', 'believe', 'identity', 'worth'],
  ['stress', 'stressed', 'anxiety', 'anxious', 'calm', 'overwhelmed', 'emotions', 'emotional', 'mindfulness'],
  ['habits', 'habit', 'routine', 'consistency', 'commitment', 'discipline'],
];
const stopWords = new Set('i im am a an the me my to for with in on of and or is feel feeling need want please find show something help some lesson lessons unit units about overcoming quick short listen listening hear by from can could you give bit today'.split(' '));
const languageAliases: Record<string, string> = {english: 'English', en: 'English', chinese: 'Chinese', mandarin: 'Chinese', zh: 'Chinese', swahili: 'Swahili', kiswahili: 'Swahili', sw: 'Swahili'};

/** Small, deterministic intent matcher. Queries stay local; no model/API calls. */
export function rankDiscoveryLessons(lessons: DiscoveryLesson[], query: string): DiscoveryLesson[] {
  const text = normalize(query);
  const words = text.split(' ').filter(Boolean);
  const languages = [...new Set(words.flatMap(word => languageAliases[word] ? [languageAliases[word]] : []))];
  const mentors = PRODUCTION_MENTORS.filter(mentor => words.includes(mentor.id));
  const audio = words.some(word => ['audio', 'recording', 'recordings', 'listen', 'listening', 'hear'].includes(word));
  const video = words.includes('video');
  const terms = words.filter(word => !stopWords.has(word) && !languageAliases[word] && !mentors.some(mentor => mentor.id === word) && !['audio', 'video', 'recording', 'recordings'].includes(word));
  return lessons.flatMap(lesson => {
    // Mentor, language and media type must match the SAME available variant.
    if ((languages.length || mentors.length || audio || video) && !lesson.variants.some(variant =>
      (!languages.length || languages.includes(variant.language)) &&
      (!mentors.length || mentors.some(mentor => mentor.name === variant.mentorName)) &&
      (!audio || variant.type === 'audio') && (!video || variant.type === 'video'))) return [];
    const title = normalize(lesson.title);
    const tags = normalize(lesson.tags.join(' '));
    const body = normalize(lesson.description);
    let score = text && title.includes(text) ? 40 : 0;
    for (const term of terms) {
      const related = groups.find(group => group.includes(term)) ?? [];
      if (title.includes(term)) score += 12;
      else if (tags.includes(term)) score += 9;
      else if (body.includes(term)) score += 2;
      else if (related.some(word => title.split(' ').includes(word) || tags.split(' ').includes(word))) score += 5;
    }
    if (terms.length && score === 0) return [];
    if (words.includes('quick') || words.includes('short')) score += Math.max(0, 4 - lesson.description.length / 2000);
    return [{lesson, score}];
  }).sort((a, b) => b.score - a.score || a.lesson.moduleId.localeCompare(b.lesson.moduleId, undefined, {numeric: true}) || a.lesson.unitId.localeCompare(b.lesson.unitId, undefined, {numeric: true}))
    .map(result => result.lesson);
}

export function recordingLessons(tracks: AudioTrack[]): DiscoveryLesson[] {
  const lessons = new Map<string, DiscoveryLesson>();
  for (const track of tracks) {
    const match = track.audioUrl?.match(/^course-content\/([^/]+)\/([^/]+)\/audio\/[^/]+$/);
    if (!match || !track.mentorName || !track.language || !isProductionMentorVariant(`${track.mentorName} (${track.language})`)) continue;
    const [, moduleId, unitId] = match;
    const key = `${moduleId}/${unitId}`;
    const lesson = lessons.get(key) ?? {moduleId, unitId, title: track.title, description: track.transcript, tags: track.moodTags, variants: []};
    lesson.variants.push({mentorName: track.mentorName, language: track.language, type: 'audio'});
    lessons.set(key, lesson);
  }
  return [...lessons.values()];
}

@Injectable({providedIn: 'root'})
export class SmartSearchService {
  private readonly firebase = inject(FirebaseService);
  private readonly data = inject(MentorshipDataService);
  private readonly liveLessons = signal<DiscoveryLesson[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private request = 0;
  private loaded = false;
  private opened = false;
  readonly lessons = computed(() => {
    const catalog = new Map(recordingLessons(this.data.availableAudioTracks()).map(lesson => [`${lesson.moduleId}/${lesson.unitId}`, lesson]));
    for (const lesson of this.liveLessons()) catalog.set(`${lesson.moduleId}/${lesson.unitId}`, lesson);
    return [...catalog.values()];
  });

  constructor() {
    effect(() => {
      this.firebase.currentUser();
      this.firebase.subscriptionTier();
      this.request++;
      this.loaded = false;
      this.liveLessons.set([]);
      this.loading.set(false);
      this.error.set(null);
      if (this.opened) void this.load();
    });
  }

  async load(): Promise<void> {
    this.opened = true;
    if (this.loaded || this.loading() || !this.firebase.currentUser() || !this.firebase.subscriptionTier()) return;
    const request = ++this.request;
    this.loading.set(true);
    this.error.set(null);
    const moduleIds = catalogSnapshot.filter(module => canAccessModule(this.firebase.subscriptionTier(), module.id)).map(module => module.id);
    const results = await Promise.allSettled(moduleIds.map(async moduleId => {
      const units = await this.firebase.getModuleUnits(moduleId);
      return units.map(unit => this.fromUnit(moduleId, unit));
    }));
    if (request !== this.request) return;
    this.liveLessons.set(results.flatMap(result => result.status === 'fulfilled' ? result.value : []));
    this.loaded = results.every(result => result.status === 'fulfilled');
    if (!this.loaded) this.error.set('Some lessons could not be loaded. Showing available results.');
    this.loading.set(false);
  }

  private fromUnit(moduleId: string, unit: ModuleUnitDocument): DiscoveryLesson {
    const variants: MediaVariant[] = [];
    for (const type of ['audio', 'video'] as const) {
      for (const [label, url] of Object.entries(type === 'audio' ? unit.audioUrls ?? {} : unit.videoUrls ?? {})) {
        if (typeof url === 'string' && url.trim() && isProductionMentorVariant(label)) variants.push({...parseMentorLabel(label), type});
      }
    }
    return {moduleId, unitId: unit.id, title: unit.title || unit.id, tags: unit.tags ?? [], description: unit.description || unit.textContent || '', variants};
  }
}
