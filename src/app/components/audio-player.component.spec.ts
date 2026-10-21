import {TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {AudioPlayerComponent} from './audio-player.component';
import {AudioPlayerService} from '../services/audio-player.service';

describe('Audio player controls', () => {
  it('omits unavailable playback without an error banner', () => {
    const close = vi.fn();
    const stop = vi.fn();
    const player = {
      activeTrack: signal({title: 'Hope', speakerAvatar: '/logo.png', audioUrl: 'course-content/module-5/unit-2/audio/hope.mp3'}),
      hasPlayableMedia: signal(false), errorMessage: signal('Course access required.'), isLoading: signal(false), isPlaying: signal(false),
      showFullPlayer: signal(false), currentTime: signal(0), duration: signal(0),
      mentorLanguageLabel: () => 'Sophie - English', formatTime: () => '0:00', close, stop,
    };
    TestBed.configureTestingModule({imports: [AudioPlayerComponent], providers: [{provide: AudioPlayerService, useValue: player}]});
    const fixture = TestBed.createComponent(AudioPlayerComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.querySelector('#mini-audio-player')).toBeNull();
    expect(element.querySelector('#full-audio-sheet')).toBeNull();
    expect(stop).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });
});
