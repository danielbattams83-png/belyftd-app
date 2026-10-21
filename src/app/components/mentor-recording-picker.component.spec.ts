import {TestBed} from '@angular/core/testing';
import {MentorRecordingPickerComponent} from './mentor-recording-picker.component';
import {VERIFIED_MENTOR_RECORDINGS} from '../services/verified-mentor-recordings';

describe('Mentor recording selectors', () => {
  function setup(mentor: string, multilingual: boolean) {
    const fixture = TestBed.createComponent(MentorRecordingPickerComponent);
    fixture.componentRef.setInput('tracks', VERIFIED_MENTOR_RECORDINGS.filter(track => track.mentorName === mentor));
    fixture.componentRef.setInput('showLanguageSelector', multilingual);
    fixture.detectChanges();
    const choose = (label: string, value: string) => {
      const select = (fixture.nativeElement as HTMLElement).querySelector(`select[aria-label="${label}"]`) as HTMLSelectElement;
      select.value = value;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    return {fixture, component: fixture.componentInstance, choose};
  }

  it('cascades module, lesson, and language to the correct production recording', () => {
    const {fixture, component, choose} = setup('Omari', true);
    const play = vi.fn();
    component.playRecording.subscribe(play);
    expect(component.modules().length).toBe(2);
    expect(component.language()).toBe('English');
    expect(component.languages()).toEqual(['English']);
    choose('Module', 'module-5');
    expect(component.lessons().map(lesson => lesson.id)).toEqual(['unit-1', 'unit-2', 'unit-3']);
    choose('Lesson', 'unit-3');
    choose('Language', 'Swahili');
    expect(play).not.toHaveBeenCalled();
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    expect(play.mock.calls[0][0].audioUrl).toBe('course-content/module-5/unit-3/audio/courage-omari--swahili.mp3');
    choose('Module', 'module-2');
    expect(component.lessonId()).toBe('unit-1');
    expect(component.language()).toBe('English');
    expect(component.selectedTrack()?.audioUrl).toContain('identity-theft-omari--english.mp3');
  });

  it('shows only module and lesson selectors for single-language mentors', () => {
    const {fixture, component, choose} = setup('Hannah', false);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('select').length).toBe(2);
    expect(component.lessons().length).toBe(5);
    choose('Module', 'module-5');
    expect(component.lessons().length).toBe(1);
    expect(component.selectedTrack()?.title).toBe('Hope');
    expect(component.selectedTrack()?.mentorName).toBe('Hannah');
  });

  it('hides controls if the mentor has no recordings and drops stale selections', () => {
    const {fixture, component, choose} = setup('Sophie', true);
    choose('Language', 'Chinese');
    fixture.componentRef.setInput('tracks', VERIFIED_MENTOR_RECORDINGS.filter(track => track.mentorName === 'Sophie' && track.language === 'English'));
    fixture.detectChanges();
    expect(component.language()).toBe('English');
    fixture.componentRef.setInput('tracks', []);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('button')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('select')).toBeNull();
  });
});
