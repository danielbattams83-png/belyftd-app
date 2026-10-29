import {TestBed} from '@angular/core/testing';
import {Router, provideRouter} from '@angular/router';
import {App} from './app';
import type {User} from 'firebase/auth';

describe('App', () => {
  beforeEach(async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((media: string) => ({
      matches: false,
      media,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    } as MediaQueryList)));
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{path: 'profile', children: []}, {path: 'dashboard', children: []}])],
    }).compileComponents();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('keeps the homepage visible after the admin portal creates a guest session', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.firebaseService.currentUser.set({uid: 'guest-admin', isAnonymous: true} as User);
    app.firebaseService.authLoading.set(false);
    app.showPostAuthOnboarding.set(true);
    TestBed.tick();
    expect(app.showPostAuthOnboarding()).toBe(false);
    expect(app.showFeatureWalkthrough()).toBe(false);
  });
  it('keeps verified mentor recordings visible before the signed-in catalog loads', () => {
    const app = TestBed.createComponent(App).componentInstance;
    for (const mentor of ['Sophie', 'Omari', 'Hannah', 'Steve']) {
      const recordings = app.mentorRecordings(mentor);
      expect(recordings.length).toBeGreaterThan(0);
      expect(recordings.every(track => track.audioUrl?.startsWith('course-content/'))).toBe(true);
    }
    expect([...new Set(app.mentorRecordings('Sophie').map(track => track.language))].sort()).toEqual(['Chinese', 'English']);
    expect([...new Set(app.mentorRecordings('Omari').map(track => track.language))].sort()).toEqual(['English', 'Swahili']);
  });

  it('requires sign-in before requesting a mentor recording', () => {
    const app = TestBed.createComponent(App).componentInstance;
    vi.spyOn(app, 'requireSignIn').mockReturnValue(false);
    const play = vi.spyOn(app.audioPlayer, 'playTrack');
    app.playMentorRecording(app.mentorRecordings('Sophie')[0]);
    expect(play).not.toHaveBeenCalled();
  });

  it('opens the selected mentor recordings instead of chat and restores trigger focus', () => {
    const app = TestBed.createComponent(App).componentInstance;
    const mentor = app.dataService.mentors()[0];
    const signIn = vi.spyOn(app, 'requireSignIn').mockReturnValue(false);
    const chat = vi.spyOn(app, 'openMentorChat');
    app.openCourseMentorRecordings(mentor);
    expect(app.courseRecordingMentor()).toBeNull();
    signIn.mockReturnValue(true);
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();
    const focus = vi.spyOn(button, 'focus');
    try {
      app.openCourseMentorRecordings(mentor);
      expect(app.courseRecordingMentor()).toBe(mentor);
      expect(chat).not.toHaveBeenCalled();
      app.closeCourseMentorRecordings();
      expect(app.courseRecordingMentor()).toBeNull();
      expect(focus).toHaveBeenCalledWith({preventScroll: true});
    } finally { button.remove(); }
  });

  it('keeps hero autoplay muted on the home route', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    const video = document.createElement('video');
    const play = vi.spyOn(video, 'play').mockResolvedValue(undefined);
    app.isDashboard.set(true);
    app.showProfileModal.set(false);
    app.playMainVideo({target: video} as unknown as Event);
    expect(video.muted).toBe(true);
    expect(video.defaultMuted).toBe(true);
    expect(play).toHaveBeenCalledOnce();
  });

  it('stops global audio on navigation and prevents hero playback on profile', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    const close = vi.spyOn(app.audioPlayer, 'close').mockImplementation(() => undefined);
    await TestBed.inject(Router).navigateByUrl('/profile');
    expect(close).toHaveBeenCalled();
    expect(app.isDashboard()).toBe(false);
    const video = document.createElement('video');
    const play = vi.spyOn(video, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined);
    video.currentTime = 10;
    app.playMainVideo({target: video} as unknown as Event);
    expect(play).not.toHaveBeenCalled();
    expect(pause).toHaveBeenCalledOnce();
    expect(video.currentTime).toBe(0);
  });

  it('allows Tier 1 users to open legacy lesson previews without unlocking mapped modules', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.firebaseService.subscriptionTier.set(1);
    const preview = app.dataService.courses()[0];
    app.dataService.openCourse({...preview, moduleId: undefined});
    expect(app.dataService.activeSelectedCourse()?.id).toBe(preview.id);
    app.dataService.closeCourse();
    app.dataService.openCourse({...preview, moduleId: 'module-11'});
    expect(app.dataService.activeSelectedCourse()).toBeNull();
  });

});
