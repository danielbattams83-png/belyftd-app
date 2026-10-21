import {AudioTrack} from '../models/app.models';
import {parseMentorLabel} from './course-assets';

export interface UnitAudioTrack {
  en?: string;
  sw?: string;
  zh?: string;
}

export interface MentorAudioUnit {
  moduleId: string;
  unitId: string;
  audioTracks: UnitAudioTrack;
}

export function hasDualLanguageAudio(audio: UnitAudioTrack | undefined, mentorId: string): boolean {
  if (!audio) return false;
  const valid = (url?: string) => !!url?.trim();
  return valid(audio.en) && (mentorId.toLowerCase() === 'omari' ? valid(audio.sw)
    : mentorId.toLowerCase() === 'sophie' ? valid(audio.zh) : true);
}

// Only group real course paths; languages from different units or mentors never form a pair.
export function mentorAudioUnits(tracks: readonly AudioTrack[], mentorId: string): MentorAudioUnit[] {
  const units = new Map<string, MentorAudioUnit>();
  const codes: Record<string, keyof UnitAudioTrack> = {en: 'en', english: 'en', sw: 'sw', swahili: 'sw', zh: 'zh', chinese: 'zh'};
  for (const track of tracks) {
    const mentor = track.mentorName ?? parseMentorLabel(track.speaker).mentorName;
    if (mentor.toLowerCase() !== mentorId.toLowerCase()) continue;
    const path = track.audioUrl?.trim();
    const match = path?.match(/^course-content\/(module-[1-9][0-9]*)\/(unit-[1-9][0-9]*)\/audio\/[^/]+\.mp3$/);
    const language = codes[(track.language ?? parseMentorLabel(track.speaker).language).toLowerCase()];
    if (!match || !language) continue;
    const key = `${match[1]}/${match[2]}`;
    const unit = units.get(key) ?? {moduleId: match[1], unitId: match[2], audioTracks: {}};
    unit.audioTracks[language] = path;
    units.set(key, unit);
  }
  return [...units.values()].sort((a, b) => a.moduleId.localeCompare(b.moduleId, undefined, {numeric: true})
    || a.unitId.localeCompare(b.unitId, undefined, {numeric: true}));
}

export function getDefaultUnitForMentor(mentorId: string, tracks: readonly AudioTrack[]): MentorAudioUnit | undefined {
  const units = mentorAudioUnits(tracks, mentorId);
  return units.find(unit => hasDualLanguageAudio(unit.audioTracks, mentorId)) ?? units[0];
}
