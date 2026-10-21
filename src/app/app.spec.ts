import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {App} from './app';

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
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
  it('keeps verified mentor recordings visible before the signed-in catalog loads', () => {
    const app = TestBed.createComponent(App).componentInstance;
    for (const mentor of ['Sophie', 'Omari', 'Hannah', 'Steve']) {
      const recordings = app.mentorRecordings(mentor);
      expect(recordings.length).toBeGreaterThan(0);
      expect(recordings.every(track => track.audioUrl?.startsWith('course-content/'))).toBe(true);
    }
    expect(app.mentorRecordings('Sophie').map(track => track.language).sort()).toEqual(['Chinese', 'English']);
    expect(app.mentorRecordings('Omari').map(track => track.language).sort()).toEqual(['English', 'Swahili']);
  });

  it('requires sign-in before requesting a mentor recording', () => {
    const app = TestBed.createComponent(App).componentInstance;
    vi.spyOn(app, 'requireSignIn').mockReturnValue(false);
    const play = vi.spyOn(app.audioPlayer, 'playTrack');
    app.playMentorRecording(app.mentorRecordings('Sophie')[0]);
    expect(play).not.toHaveBeenCalled();
  });

});
