import {TestBed} from '@angular/core/testing';
import {MentorRecordingPickerComponent} from './mentor-recording-picker.component';
import {VERIFIED_MENTOR_RECORDINGS} from '../services/verified-mentor-recordings';

describe('Mentor recording selectors', () => {
  async function setup(mentor: string, multilingual: boolean) {
    const fixture = TestBed.createComponent(MentorRecordingPickerComponent);
    fixture.componentRef.setInput('tracks', VERIFIED_MENTOR_RECORDINGS.filter(track => track.mentorName === mentor));
    fixture.componentRef.setInput('showLanguageSelector', multilingual);
    fixture.detectChanges();
    await fixture.whenStable();
    const choose = async (label: string, value: string) => {
      const select = (fixture.nativeElement as HTMLElement).querySelector(`select[aria-label="${label}"]`) as HTMLSelectElement;
      select.value = value;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      await fixture.whenStable();
    };
    return {fixture, component: fixture.componentInstance, choose};
  }

  it('cascades module, lesson, and language to the correct production recording', async () => {
    const {fixture, component, choose} = await setup('Omari', true);
    const play = vi.fn();
    component.playRecording.subscribe(play);
    expect(component.modules().length).toBe(2);
    expect(component.language()).toBe('Swahili');
    expect(component.moduleId()).toBe('module-5');
    expect(component.lessonId()).toBe('unit-1');
    expect(component.languages()).toEqual(['English', 'Swahili']);
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('select[aria-label="Module"]')?.value).toBe('module-5');
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('select[aria-label="Language"]')?.value).toBe('Swahili');
    await choose('Module', 'module-5');
    expect(component.lessons().map(lesson => lesson.id)).toEqual(['unit-1', 'unit-2', 'unit-3']);
    await choose('Lesson', 'unit-3');
    expect(play).not.toHaveBeenCalled();
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    expect(play.mock.calls[0][0].audioUrl).toBe('course-content/module-5/unit-3/audio/courage-omari--swahili.mp3');
    await choose('Module', 'module-2');
    expect(component.lessonId()).toBe('unit-1');
    expect(component.language()).toBe('English');
    expect(component.selectedTrack()?.audioUrl).toContain('identity-theft-omari--english.mp3');
  });

  it('shows only module and lesson selectors for single-language mentors', async () => {
    const {fixture, component, choose} = await setup('Hannah', false);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('select').length).toBe(2);
    expect(component.lessons().length).toBe(5);
    await choose('Module', 'module-5');
    expect(component.lessons().length).toBe(1);
    expect(component.selectedTrack()?.title).toBe('Hope');
    expect(component.selectedTrack()?.mentorName).toBe('Hannah');
  });

  it('hides controls if the mentor has no recordings and drops stale selections', async () => {
    const {fixture, component, choose} = await setup('Sophie', true);
    await choose('Language', 'Chinese');
    fixture.componentRef.setInput('tracks', VERIFIED_MENTOR_RECORDINGS.filter(track => track.mentorName === 'Sophie' && track.language === 'English'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.language()).toBe('English');
    fixture.componentRef.setInput('tracks', []);
    fixture.detectChanges();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('button')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('select')).toBeNull();
  });
  it('defaults Sophie to a complete pair without automatically playing it', async () => {
    const {fixture, component} = await setup('Sophie', true);
    expect(component.moduleId()).toBe('module-5');
    expect(component.lessonId()).toBe('unit-1');
    expect(component.languages()).toEqual(['Chinese', 'English']);
    expect(component.language()).toBe('Chinese');
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('select[aria-label="Language"]')?.value).toBe('Chinese');
  });

  it('reselects a complete default when asynchronous tracks arrive', async () => {
    const {fixture, component} = await setup('Omari', true);
    const omari = VERIFIED_MENTOR_RECORDINGS.filter(track => track.mentorName === 'Omari');
    fixture.componentRef.setInput('tracks', omari.filter(track => track.audioUrl?.includes('module-2')));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.moduleId()).toBe('module-2');
    expect(component.language()).toBe('English');
    fixture.componentRef.setInput('tracks', omari);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.moduleId()).toBe('module-5');
    expect(component.languages()).toEqual(['English', 'Swahili']);
    expect(component.language()).toBe('Swahili');
  });

  it('preserves an explicit English preference for Omari across catalog refreshes', async () => {
    const {fixture, component, choose} = await setup('Omari', true);
    await choose('Language', 'English');
    fixture.componentRef.setInput('tracks', [...VERIFIED_MENTOR_RECORDINGS.filter(track => track.mentorName === 'Omari')]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.language()).toBe('English');
    expect(component.selectedTrack()?.language).toBe('English');
  });

  it('preserves an explicitly selected partial unit when the catalog refreshes', async () => {
    const {fixture, component, choose} = await setup('Omari', true);
    await choose('Module', 'module-2');
    fixture.componentRef.setInput('tracks', [...VERIFIED_MENTOR_RECORDINGS.filter(track => track.mentorName === 'Omari')]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.moduleId()).toBe('module-2');
    expect(component.languages()).toEqual(['English']);
  });

});
