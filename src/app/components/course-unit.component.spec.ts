import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {CourseUnitComponent} from './course-unit.component';
import {FirebaseService} from '../services/firebase.service';
import {AudioPlayerService} from '../services/audio-player.service';

describe('Course unit media visibility', () => {
  async function render(
    audioUrls: Record<string, string>,
    videoUrls: Record<string, string>,
    tier = 3,
    textContent = 'Clean reading content',
    moduleId = 'module-5',
    directMedia: {audioUrl?: string; videoUrl?: string; mentorName?: string} = {},
  ) {
    const sign = vi.fn(async (path: string) => {
      if (path.includes('missing')) throw new Error('Not found');
      return 'https://storage.googleapis.com/verified-recording';
    });
    await TestBed.configureTestingModule({imports: [CourseUnitComponent], providers: [
      provideRouter([]),
      {provide: ActivatedRoute, useValue: {snapshot: {paramMap: convertToParamMap({moduleId, unitId: 'unit-2'})}}},
      {provide: FirebaseService, useValue: {
        userProfile: signal(null), getModuleCatalog: vi.fn().mockResolvedValue([]), subscriptionTier: signal(tier), currentUser: signal(null), getCourseMediaUrlFromPath: sign,
        getModuleUnit: vi.fn().mockResolvedValue({id: 'unit-2', title: 'Hope', minTier: 3, textContent, audioUrls, videoUrls, ...directMedia}),
      }},
      {provide: AudioPlayerService, useValue: {activeTrack: signal(null), isTrackAvailable: () => tier >= 3, close: vi.fn(), formatTime: () => '0:00'}},
    ]}).compileComponents();
    const fixture = TestBed.createComponent(CourseUnitComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.loading()).toBe(false));
    fixture.detectChanges();
    return {element: fixture.nativeElement as HTMLElement, sign, fixture};
  }

  it('renders text without players or selectors when media is absent or empty', async () => {
    const {element, sign} = await render({Sophie: '', Omari: '   '}, {Hannah: ''});
    expect(element.textContent).toContain('Clean reading content');
    expect(element.querySelector('video')).toBeNull();
    expect(element.querySelector('select')).toBeNull();
    expect(element.querySelector('[aria-label="Mentor audio player"]')).toBeNull();
    expect(sign).not.toHaveBeenCalled();
  });

  it('isolates missing or unsupported media while keeping valid audio and text', async () => {
    const {element} = await render({
      'Sophie (english)': 'course-content/module-5/unit-2/audio/sophie.mp3',
      Legacy: 'course-content/module-5/unit-2/audio/legacy.mp3',
      'Sophie (swahili)': 'course-content/module-5/unit-2/audio/unsupported.mp3',
      'Omari (swahili)': 'course-content/module-5/unit-2/audio/missing.mp3',
    }, {Hannah: 'course-content/module-5/unit-2/video/missing.mp4'});
    expect(element.textContent).toContain('Clean reading content');
    expect(element.querySelector('video')).toBeNull();
    const options = element.querySelectorAll('option');
    expect(options.length).toBe(1);
    expect(options[0].textContent).toContain('Sophie - English');
  });
  it('shows only the verified video selector when a unit has video but no audio', async () => {
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    const {element} = await render({}, {'Sophie (chinese)': 'course-content/module-5/unit-2/video/sophie.mp4'});
    expect(element.querySelector('video')?.controls).toBe(true);
    expect(element.textContent).toContain('Sophie - Chinese');
    expect(element.querySelector('[aria-label="Mentor audio player"]')).toBeNull();
    expect(element.textContent).toContain('Clean reading content');
    load.mockRestore();
  });

  it('renders CMS video and mentor narration directly above the lesson body', async () => {
    const {element} = await render({}, {}, 3, 'Lesson body', 'module-5', {
      videoUrl: 'https://cdn.example.com/lesson.mp4',
      audioUrl: 'https://cdn.example.com/narration.mp3',
      mentorName: 'Sophie',
    });
    const video = element.querySelector<HTMLVideoElement>('.reader-video');
    const audio = element.querySelector<HTMLAudioElement>('.reader-audio-player');
    expect(video?.src).toContain('lesson.mp4');
    expect(audio?.src).toContain('narration.mp3');
    expect(element.textContent).toContain('Mentor Narration');
    expect(element.textContent).toContain('Sophie');
  });

  it('omits restricted media without requesting signed URLs or showing a banner', async () => {
    const {element, sign} = await render({'Sophie (english)': 'course-content/module-6/unit-2/audio/sophie.mp3'}, {'Sophie (chinese)': 'course-content/module-6/unit-2/video/sophie.mp4'}, 1, undefined, 'module-6');
    expect(sign).not.toHaveBeenCalled();
    expect(element.querySelector('video')).toBeNull();
    expect(element.querySelector('[aria-label="Mentor audio player"]')).toBeNull();
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.textContent).toContain('Clean reading content');
  });

  it('removes failed video controls without a media error banner', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    const {element, fixture} = await render({}, {'Sophie (chinese)': 'course-content/module-5/unit-2/video/sophie.mp4'});
    element.querySelector('video')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(element.querySelector('video')).toBeNull();
    expect(element.querySelector('[role="alert"]')).toBeNull();
    vi.restoreAllMocks();
  });
  it('sanitizes reading directions and preserves acronym spacing in the rendered lesson', async () => {
    const {element} = await render({}, {}, 3, '[Tone: Warm, conversational] H-stands for hope. Hstands for hope.');
    expect(element.textContent).not.toContain('[Tone:');
    expect(element.textContent).not.toContain('Hstands');
    expect(element.textContent).toContain('H - stands for hope. H - stands for hope.');
  });

});
