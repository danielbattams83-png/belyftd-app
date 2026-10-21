import {buildCourseMediaStoragePath, parseMentorLabel, isProductionMentorVariant} from './course-assets';

describe('buildCourseMediaStoragePath', () => {
  it('builds the expected course-content path for audio and video assets', () => {
    expect(buildCourseMediaStoragePath('hope', 'identity', 'audio', 'hannah', '.mp3'))
      .toBe('course-content/hope/identity/audio/hannah.mp3');
    expect(buildCourseMediaStoragePath('hope', 'identity', 'video', 'hannah', 'mp4'))
      .toBe('course-content/hope/identity/video/hannah.mp4');
  });

  it('rejects identifiers that could escape their path segment', () => {
    expect(() => buildCourseMediaStoragePath('hope', '../identity', 'audio', 'hannah', 'mp3'))
      .toThrow('Course media path identifiers must be non-empty path segments.');
  });
});

describe('production mentor labels', () => {
  it('uses the confirmed language for Hannah and Steve', () => {
    expect(parseMentorLabel('Hannah')).toEqual({mentorName: 'Hannah', language: 'English'});
    expect(parseMentorLabel('Steve')).toEqual({mentorName: 'Steve', language: 'English'});
  });
  it('normalizes all multilingual mentor variants', () => {
    expect(parseMentorLabel('Sophie (english)')).toEqual({mentorName: 'Sophie', language: 'English'});
    expect(parseMentorLabel('Sophie (chinese)')).toEqual({mentorName: 'Sophie', language: 'Chinese'});
    expect(parseMentorLabel('Omari (swahili)')).toEqual({mentorName: 'Omari', language: 'Swahili'});
    expect(parseMentorLabel('Omari - English')).toEqual({mentorName: 'Omari', language: 'English'});
  });
});

it('rejects placeholder mentors and unsupported production languages', () => {
  expect(isProductionMentorVariant('Marcus (English)')).toBe(false);
  expect(isProductionMentorVariant('Sophie (Swahili)')).toBe(false);
  expect(isProductionMentorVariant('Omari (Chinese)')).toBe(false);
  for (const label of ['Hannah', 'Steve', 'Sophie (EN)', 'Sophie (ZH)', 'Omari (EN)', 'Omari (SW)']) {
    expect(isProductionMentorVariant(label)).toBe(true);
  }
});
