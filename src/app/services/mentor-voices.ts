import {AudioTrack} from '../models/app.models';

/** One speakable language for a mentor, and the ElevenLabs voice the selector must request. */
export interface MentorVoice {
  mentorId: string;
  language: string;
  languageCode: string;
  voiceId: string;
}

/**
 * Roster voice map. `languageCode` is the BCP-47 tag sent to ElevenLabs.
 * `voiceId` is the voice the generator must use for that mentor and language.
 */
export const MENTOR_VOICES: readonly MentorVoice[] = [
  {mentorId: 'steve', language: 'English', languageCode: 'en', voiceId: 'steve-en'},
  {mentorId: 'steve', language: 'French', languageCode: 'fr', voiceId: 'steve-fr'},
  {mentorId: 'hannah', language: 'English', languageCode: 'en', voiceId: 'hannah-en'},
  {mentorId: 'hannah', language: 'Spanish', languageCode: 'es', voiceId: 'hannah-es'},
  {mentorId: 'sophie', language: 'Mandarin', languageCode: 'zh', voiceId: 'sophie-zh'},
  {mentorId: 'sophie', language: 'Cantonese', languageCode: 'yue', voiceId: 'sophie-yue'},
  {mentorId: 'omari', language: 'English', languageCode: 'en', voiceId: 'omari-en'},
  {mentorId: 'omari', language: 'Swahili', languageCode: 'sw', voiceId: 'omari-sw'},
  {mentorId: 'omari', language: 'Portuguese', languageCode: 'pt', voiceId: 'omari-pt'},
  {mentorId: 'amara', language: 'English', languageCode: 'en', voiceId: 'amara-en'},
  {mentorId: 'amara', language: 'Nigerian Pidgin', languageCode: 'pcm', voiceId: 'amara-pcm'},
  {mentorId: 'budi', language: 'Indonesian', languageCode: 'id', voiceId: 'budi-id'},
  {mentorId: 'tari', language: 'Bahasa Indonesia', languageCode: 'id', voiceId: 'tari-id'},
  {mentorId: 'tari', language: 'Bahasa Gaul', languageCode: 'id-gaul', voiceId: 'tari-id-gaul'},
  {mentorId: 'kenji', language: 'Japanese', languageCode: 'ja', voiceId: 'kenji-ja'},
  {mentorId: 'aoi', language: 'Japanese', languageCode: 'ja', voiceId: 'aoi-ja'},
  {mentorId: 'aoi', language: 'English', languageCode: 'en', voiceId: 'aoi-en'},
  {mentorId: 'vikram', language: 'English (Indian)', languageCode: 'en-IN', voiceId: 'vikram-en-in'},
  {mentorId: 'vikram', language: 'Hindi', languageCode: 'hi', voiceId: 'vikram-hi'},
  {mentorId: 'vikram', language: 'Tamil', languageCode: 'ta', voiceId: 'vikram-ta'},
  {mentorId: 'liam', language: 'English', languageCode: 'en', voiceId: 'liam-en'},
  {mentorId: 'liam', language: 'Mandarin', languageCode: 'zh', voiceId: 'liam-zh'},
  {mentorId: 'mateo', language: 'Spanish', languageCode: 'es', voiceId: 'mateo-es'},
  {mentorId: 'mateo', language: 'Italian', languageCode: 'it', voiceId: 'mateo-it'},
  {mentorId: 'mateo', language: 'Greek', languageCode: 'el', voiceId: 'mateo-el'},
  {mentorId: 'elena', language: 'Italian', languageCode: 'it', voiceId: 'elena-it'},
  {mentorId: 'elena', language: 'Greek', languageCode: 'el', voiceId: 'elena-el'},
  {mentorId: 'elena', language: 'English', languageCode: 'en', voiceId: 'elena-en'},
];

const LANGUAGE_ALIASES: Record<string, string> = {
  en: 'English', english: 'English',
  fr: 'French', french: 'French',
  es: 'Spanish', spanish: 'Spanish',
  zh: 'Mandarin', chinese: 'Mandarin', mandarin: 'Mandarin',
  yue: 'Cantonese', cantonese: 'Cantonese',
  sw: 'Swahili', swahili: 'Swahili', kiswahili: 'Swahili',
  pt: 'Portuguese', portuguese: 'Portuguese',
  pcm: 'Nigerian Pidgin', pidgin: 'Nigerian Pidgin', 'nigerian pidgin': 'Nigerian Pidgin',
  id: 'Indonesian', indonesian: 'Indonesian',
  'bahasa indonesia': 'Bahasa Indonesia',
  'bahasa gaul': 'Bahasa Gaul', 'id-gaul': 'Bahasa Gaul',
  ja: 'Japanese', japanese: 'Japanese',
  hi: 'Hindi', hindi: 'Hindi',
  ta: 'Tamil', tamil: 'Tamil',
  it: 'Italian', italian: 'Italian',
  el: 'Greek', greek: 'Greek',
  'en-in': 'English (Indian)', 'english (indian)': 'English (Indian)',
};

export function mentorLanguages(mentorId: string): string[] {
  return MENTOR_VOICES.filter(voice => voice.mentorId === mentorId).map(voice => voice.language);
}

export function canonicalMentorLanguage(value: string): string {
  const key = value.trim().toLowerCase();
  return LANGUAGE_ALIASES[key] ?? value.trim();
}

export function mentorVoice(mentorId: string, language: string): MentorVoice | undefined {
  const name = canonicalMentorLanguage(language);
  return MENTOR_VOICES.find(voice => voice.mentorId === mentorId.toLowerCase() && voice.language === name);
}

export function languageCodeFor(language: string): string | undefined {
  return MENTOR_VOICES.find(voice => voice.language === canonicalMentorLanguage(language))?.languageCode;
}

/** Attach the roster language code and ElevenLabs voice id for the selected mentor language. */
export function withMentorVoice(track: AudioTrack): AudioTrack {
  const voice = mentorVoice(track.mentorName ?? '', track.language ?? '');
  return voice ? {...track, language: voice.language, languageCode: voice.languageCode, voiceId: voice.voiceId} : track;
}
