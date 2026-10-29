import {TestBed} from '@angular/core/testing';
import {CoursesOverviewComponent} from './courses-overview.component';
import {PRODUCTION_MENTORS} from '../services/production-mentors';
import {VoiceJournal} from '../models/app.models';

const journals: VoiceJournal[] = [
  {id: 'first', title: 'First reflection', date: 'Oct 29', durationSec: 75, prompt: 'A small win', mood: '✨ Inspired'},
  {id: 'second', title: 'Second reflection', date: 'Oct 28', durationSec: 38, prompt: 'A new idea', mood: '✨ Inspired'},
];

async function setup(ids = ['sophie', 'hannah']) {
  TestBed.configureTestingModule({imports: [CoursesOverviewComponent]});
  const fixture = TestBed.createComponent(CoursesOverviewComponent);
  fixture.componentRef.setInput('mentors', PRODUCTION_MENTORS);
  fixture.componentRef.setInput('selectedMentorIds', ids);
  fixture.componentRef.setInput('journals', journals);
  fixture.componentRef.setInput('progress', 50);
  fixture.componentRef.setInput('completedSteps', 5);
  fixture.componentRef.setInput('totalSteps', 10);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return {fixture, component: fixture.componentInstance, element: fixture.nativeElement as HTMLElement};
}

describe('courses overview carousel', () => {
  it('shows the three growth cards and only the two saved mentors, in saved order', async () => {
    const {component, element} = await setup();
    expect(component.labels()).toEqual(['Upcoming Session', 'Weekly Growth Progress', 'My Voice Reflections', 'Sophie', 'Hannah']);
    expect(element.querySelectorAll('.overview-card')).toHaveLength(5);
    expect(element.textContent).not.toContain('Omari');
    expect(element.querySelector('progress')?.value).toBe(50);
    expect(element.textContent).toContain('5 / 10');
  });

  it('never fills missing selections with arbitrary mentors', async () => {
    const {component, element} = await setup(['missing']);
    expect(component.chosenMentors()).toEqual([]);
    expect(element.querySelectorAll('.overview-card')).toHaveLength(3);
    expect(element.querySelector('.choose-mentors')).not.toBeNull();
  });

  it('deduplicates, limits and updates saved mentors reactively', async () => {
    const {fixture, component} = await setup(['hannah', 'hannah', 'sophie', 'omari']);
    expect(component.chosenMentors().map(mentor => mentor.id)).toEqual(['hannah', 'sophie']);
    fixture.componentRef.setInput('selectedMentorIds', ['steve', 'omari']);
    fixture.detectChanges();
    expect(component.chosenMentors().map(mentor => mentor.id)).toEqual(['steve', 'omari']);
  });

  it('navigates using buttons, dots and arrow keys without wrapping past the ends', async () => {
    const {fixture, component, element} = await setup();
    element.querySelector<HTMLButtonElement>('.next')!.click();
    fixture.detectChanges();
    expect(component.activeIndex()).toBe(1);
    element.querySelectorAll<HTMLButtonElement>('.carousel-dots button')[4].click();
    fixture.detectChanges();
    expect(component.activeIndex()).toBe(4);
    expect(element.querySelector<HTMLButtonElement>('.next')!.disabled).toBe(true);
    element.querySelector('.overview-track')!.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}));
    expect(component.activeIndex()).toBe(3);
    component.select(-1);
    expect(component.activeIndex()).toBe(3);
  });

  it('supports throttled wheel navigation while preserving horizontal gestures and zoom', async () => {
    const {component, element} = await setup();
    const track = element.querySelector('.overview-track')!;
    const clock = vi.spyOn(performance, 'now').mockReturnValue(1000);
    try {
      const wheel = (init: WheelEventInit) => {const event = new WheelEvent('wheel', {...init, cancelable: true}); track.dispatchEvent(event); return event;};
      expect(wheel({deltaY: -100}).defaultPrevented).toBe(false);
      expect(wheel({deltaX: 100, deltaY: 10}).defaultPrevented).toBe(false);
      expect(wheel({deltaY: 100, ctrlKey: true}).defaultPrevented).toBe(false);
      expect(wheel({deltaY: 100}).defaultPrevented).toBe(true);
      expect(component.activeIndex()).toBe(1);
      wheel({deltaY: 100});
      expect(component.activeIndex()).toBe(1);
      clock.mockReturnValue(1421);
      wheel({deltaY: -100});
      expect(component.activeIndex()).toBe(0);
      component.select(4);
      expect(wheel({deltaY: 100}).defaultPrevented).toBe(false);
    } finally { clock.mockRestore(); }
  });

  it('keeps journal playback, recording, quests and mentor actions connected', async () => {
    const {component, element, fixture} = await setup();
    const play = vi.fn(), record = vi.fn(), quest = vi.fn(), mentor = vi.fn();
    component.playJournal.subscribe(play);
    component.recordNote.subscribe(record);
    component.viewQuests.subscribe(quest);
    component.mentorSelected.subscribe(mentor);
    element.querySelector<HTMLButtonElement>('.listen')!.click();
    expect(play).toHaveBeenCalledWith(journals[0]);
    expect(element.querySelector('.listen')?.textContent).toContain('1:15');
    element.querySelector<HTMLButtonElement>('[aria-label="Next reflection"]')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.journal-title')?.textContent).toBe('Second reflection');
    const cards = element.querySelectorAll('.overview-card');
    cards[2].querySelector<HTMLButtonElement>('footer button')!.click();
    cards[0].querySelector<HTMLButtonElement>('footer button')!.click();
    cards[3].querySelector<HTMLButtonElement>('footer button')!.click();
    expect(record).toHaveBeenCalled();
    expect(quest).toHaveBeenCalled();
    expect(mentor).toHaveBeenCalledWith(PRODUCTION_MENTORS[0]);
  });

  it('handles empty journals and removes wheel handlers on destruction', async () => {
    const {fixture, component, element} = await setup();
    fixture.componentRef.setInput('journals', []);
    fixture.detectChanges();
    expect(element.textContent).toContain('Your voice. Your journey.');
    const track = element.querySelector('.overview-track')!;
    fixture.destroy();
    const wheel = new WheelEvent('wheel', {deltaY: 100, cancelable: true});
    track.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
    expect(component.activeIndex()).toBe(0);
  });
});
