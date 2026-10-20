import {buildCourseMediaStoragePath} from './course-assets';

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
