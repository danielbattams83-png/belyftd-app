import {describe, expect, it} from 'vitest';
import {AudioTrack} from '../models/app.models';
import {getDefaultUnitForMentor, hasDualLanguageAudio} from './course.service';
import {VERIFIED_MENTOR_RECORDINGS} from './verified-mentor-recordings';

const track = (mentor: string, language: string, unit: number, module = 2): AudioTrack => ({
  ...VERIFIED_MENTOR_RECORDINGS[0], id: `${mentor}-${language}-${module}-${unit}`, mentorName: mentor, language,
  audioUrl: `course-content/module-${module}/unit-${unit}/audio/${mentor}-${language}.mp3`,
});

describe('mentor unit defaults', () => {
  it('requires the correct complete language pair, ignoring whitespace', () => {
    expect(hasDualLanguageAudio({en: 'english', sw: 'swahili'}, 'omari')).toBe(true);
    expect(hasDualLanguageAudio({en: 'english', zh: 'chinese'}, 'sophie')).toBe(true);
    expect(hasDualLanguageAudio({en: 'english', sw: '  '}, 'omari')).toBe(false);
    expect(hasDualLanguageAudio({en: 'english', sw: 'swahili'}, 'sophie')).toBe(false);
    expect(hasDualLanguageAudio(undefined, 'sophie')).toBe(false);
  });
  it('prefers dual language units over earlier partial units and supports language codes', () => {
    const tracks = [track('Omari', 'en', 1), track('Omari', 'sw', 2), track('Omari', 'en', 2)];
    expect(getDefaultUnitForMentor('omari', tracks)?.unitId).toBe('unit-2');
    expect(getDefaultUnitForMentor('sophie', [track('Sophie', 'English', 1), track('Sophie', 'zh', 3), track('Sophie', 'en', 3)])?.unitId).toBe('unit-3');
  });
  it('never combines languages from different modules, units, or mentors', () => {
    const tracks = [track('Omari', 'en', 1), track('Omari', 'sw', 2), track('Sophie', 'sw', 1), track('Omari', 'sw', 1, 5)];
    expect(getDefaultUnitForMentor('omari', tracks)?.audioTracks).toEqual({en: tracks[0].audioUrl});
  });
  it('falls back to the first valid single-language unit and skips invalid paths', () => {
    const tracks = [{...track('Omari', 'en', 1), audioUrl: '  '}, {...track('Omari', 'sw', 2), audioUrl: 'javascript:invalid'}, track('Omari', 'sw', 10), track('Omari', 'en', 3)];
    expect(getDefaultUnitForMentor('omari', tracks)?.unitId).toBe('unit-3');
    expect(getDefaultUnitForMentor('omari', [])).toBeUndefined();
  });
  it('selects verified dual-language units for both production mentors', () => {
    for (const mentor of ['omari', 'sophie']) {
      const unit = getDefaultUnitForMentor(mentor, VERIFIED_MENTOR_RECORDINGS);
      expect(unit?.moduleId).toBe('module-5');
      expect(unit?.unitId).toBe('unit-1');
      expect(hasDualLanguageAudio(unit?.audioTracks, mentor)).toBe(true);
    }
  });
});
