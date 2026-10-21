import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {AudioPlayerService} from './audio-player.service';
import {FirebaseService} from './firebase.service';
import {AudioTrack} from '../models/app.models';

class FakeAudio extends EventTarget {
  src = ''; preload = ''; currentTime = 0; duration = 83; playbackRate = 1; volume = 1;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn(); load = vi.fn();
  getAttribute() { return this.src || null; }
  removeAttribute() { this.src = ''; }
}

const track = (id: string): AudioTrack => ({
  id, audioUrl: `course-content/module-5/unit-2/audio/${id}.mp3`, title: id,
  speaker: 'Omari - Swahili', mentorName: 'Omari', language: 'Swahili', speakerRole: 'Mentor',
  speakerAvatar: '/mentors/omari.png', category: 'Mindset', duration: '', durationSec: 0,
  transcript: '', moodTags: [], likes: 0, isFavorite: false,
});

describe('AudioPlayerService production playback', () => {
  let audio: FakeAudio;
  let sign: ReturnType<typeof vi.fn>;
  let player: AudioPlayerService;
  beforeEach(() => {
    audio = new FakeAudio();
    vi.stubGlobal('Audio', class { constructor() { return audio; } });
    sign = vi.fn().mockResolvedValue('https://storage.googleapis.com/recording?signature=short-lived');
    TestBed.configureTestingModule({providers: [{provide: FirebaseService, useValue: {
      subscriptionTier: signal(3), currentUser: signal({uid: 'listener'}), getCourseMediaUrlFromPath: sign,
    }}]});
    player = TestBed.inject(AudioPlayerService);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('resolves a signed URL and uses media events for duration and progress', async () => {
    await player.playTrack(track('omari-swahili'));
    expect(sign).toHaveBeenCalledWith(track('omari-swahili').audioUrl);
    expect(audio.src).toContain('signature=short-lived');
    expect(audio.preload).toBe('metadata');
    audio.dispatchEvent(new Event('loadedmetadata'));
    audio.currentTime = 20;
    audio.dispatchEvent(new Event('timeupdate'));
    expect(player.duration()).toBe(83);
    expect(player.currentTime()).toBe(20);
    expect(player.mentorLanguageLabel()).toBe('Omari - Swahili');
    player.pause();
    expect(audio.pause).toHaveBeenCalled();
    expect(player.isPlaying()).toBe(false);
  });

  it('ignores an old signing result when another recording is selected', async () => {
    let complete!: (url: string) => void;
    sign.mockReturnValueOnce(new Promise<string>(resolve => complete = resolve));
    const oldPlayback = player.playTrack(track('old'));
    await player.playTrack(track('new'));
    complete('https://example.com/old');
    await oldPlayback;
    expect(audio.src).toContain('signature=short-lived');
    expect(player.activeTrack()?.id).toBe('new');
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it('cancels pending playback when paused', async () => {
    let complete!: (url: string) => void;
    sign.mockReturnValueOnce(new Promise<string>(resolve => complete = resolve));
    const pending = player.playTrack(track('pending'));
    player.pause();
    complete('https://example.com/cancelled');
    await pending;
    expect(audio.play).not.toHaveBeenCalled();
    expect(player.isLoading()).toBe(false);
  });

  it('reports failures without fake playback or replacement lesson audio', async () => {
    sign.mockRejectedValueOnce(new Error('Access denied'));
    await player.playTrack(track('denied'));
    expect(player.errorMessage()).toBeTruthy();
    expect(player.isPlaying()).toBe(false);
    expect(audio.play).not.toHaveBeenCalled();
    sign.mockClear();
    player.speakCustomScript('Generated', 'New text', 'Coach Spark');
    expect(sign).not.toHaveBeenCalled();
    expect(player.activeTrack()?.audioUrl).toBeUndefined();
    expect(player.showTranscript()).toBe(true);
  });

  it('plays personal voice journal blobs without requesting course access', async () => {
    await player.playTrack({...track('journal'), audioUrl: 'blob:personal-recording'});
    expect(sign).not.toHaveBeenCalled();
    expect(audio.src).toBe('blob:personal-recording');
  });

  it('refreshes an expired signed URL on resume and preserves the position', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    await player.playTrack(track('omari'));
    player.currentTime.set(25);
    player.pause();
    vi.spyOn(Date, 'now').mockReturnValue(1000 + 10 * 60 * 1000);
    player.resume();
    await Promise.resolve(); await Promise.resolve();
    expect(sign).toHaveBeenCalledTimes(2);
    expect(audio.currentTime).toBe(25);
    vi.restoreAllMocks();
  });
  it('stops and rewinds without keeping the source loaded', async () => {
    await player.playTrack(track('omari'));
    player.currentTime.set(25);
    player.stop();
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.src).toBe('');
    expect(player.currentTime()).toBe(0);
    expect(player.activeTrack()?.id).toBe('omari');
    expect(player.isPlaying()).toBe(false);
  });

  it('closes an unavailable recording and both player views', async () => {
    sign.mockRejectedValueOnce({code: 'functions/permission-denied'});
    await player.playTrack(track('restricted'));
    expect(player.errorMessage()).toBeNull();
    expect(player.hasPlayableMedia()).toBe(false);
    expect(player.isTrackAvailable(track('restricted'))).toBe(false);
    player.showFullPlayer.set(true);
    player.close();
    expect(player.activeTrack()).toBeNull();
    expect(player.showFullPlayer()).toBe(false);
    expect(player.errorMessage()).toBeNull();
    expect(audio.src).toBe('');
  });

  it('does not reopen playback after closing during a signed URL request', async () => {
    let complete!: (url: string) => void;
    sign.mockReturnValueOnce(new Promise<string>(resolve => complete = resolve));
    const pending = player.playTrack(track('pending'));
    player.close();
    complete('https://example.com/late');
    await pending;
    audio.dispatchEvent(new Event('playing'));
    expect(audio.play).not.toHaveBeenCalled();
    expect(player.activeTrack()).toBeNull();
    expect(player.isPlaying()).toBe(false);
  });

  it('does not request or play media outside the tier module cap', async () => {
    TestBed.inject(FirebaseService).subscriptionTier.set(1);
    await player.playTrack(track('restricted'));
    expect(sign).not.toHaveBeenCalled();
    expect(audio.play).not.toHaveBeenCalled();
    expect(player.hasPlayableMedia()).toBe(false);
    expect(player.errorMessage()).toBeNull();
  });

  it('omits blank and missing signed media without an error banner', async () => {
    await player.playTrack({...track('blank'), audioUrl: '  '});
    expect(sign).not.toHaveBeenCalled();
    sign.mockResolvedValueOnce('');
    await player.playTrack(track('missing'));
    expect(audio.play).not.toHaveBeenCalled();
    expect(player.hasPlayableMedia()).toBe(false);
    expect(player.errorMessage()).toBeNull();
  });
});
