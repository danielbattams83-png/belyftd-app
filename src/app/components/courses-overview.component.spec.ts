import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {CoursesOverviewComponent} from './courses-overview.component';
import {CurriculumService, countCompletedLifeLessons, findNextUnreadUnit} from '../services/curriculum.service';
import {CurriculumModule} from '../models/curriculum.model';

const modules: CurriculumModule[] = [
  {id: 'module-1', title: 'Mindset', units: [
    {id: 'unit-1', title: 'Mindset', hasText: true, hasMedia: false, description: 'Start with the strengths you already have.'},
    {id: 'unit-2', title: 'As a Man Thinks', hasText: true, hasMedia: false},
  ]},
  {id: 'module-2', title: 'Identity', units: [
    {id: 'unit-1', title: 'Identity Theft', hasText: true, hasMedia: false},
  ]},
];

const completed = signal(new Set<string>());
const openUnit = vi.fn();

async function setup() {
  completed.set(new Set());
  TestBed.configureTestingModule({
    imports: [CoursesOverviewComponent],
    providers: [
      provideRouter([]),
      {provide: CurriculumService, useValue: {modules: signal(modules), completedIds: completed, openUnit}},
    ],
  });
  const fixture = TestBed.createComponent(CoursesOverviewComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return {fixture, component: fixture.componentInstance, element: fixture.nativeElement as HTMLElement};
}

describe('next unread unit', () => {
  it('returns Module 1 Unit 1 when a later unit is already complete', () => {
    const next = findNextUnreadUnit(modules, new Set(['module-1/unit-2', 'module-2/unit-1']));
    expect(next).toMatchObject({moduleNumber: 1, unitNumber: 1, title: 'Mindset', courseComplete: false});
  });

  it('falls back to reviewing Module 1 when every unit is complete', () => {
    const next = findNextUnreadUnit(modules, new Set(['module-1/unit-1', 'module-1/unit-2', 'module-2/unit-1']));
    expect(next).toMatchObject({moduleNumber: 1, unitNumber: 1, courseComplete: true});
  });

  it('counts life lessons at 10 percent each', () => {
    expect(countCompletedLifeLessons(new Set())).toBe(0);
    expect(countCompletedLifeLessons(new Set(['life-lesson/life-01', 'life-02', 'life-lesson/life-03']))).toBe(3);
  });
});

describe('courses overview carousel', () => {
  it('shows the four learning cards and no mentor cards', async () => {
    const {component, element} = await setup();
    expect(component.labels).toEqual(['Daily Lyft', 'Continue Learning', 'Life Lessons Progress', 'Your Key']);
    expect(element.querySelectorAll('.overview-card')).toHaveLength(4);
    expect(element.textContent).toContain('DAY 1');
    expect(element.textContent).toContain('Believe In Yourself');
    expect(element.textContent).toContain('Module 1:');
    expect(element.textContent).toContain('Unit 1: Mindset');
    expect(element.textContent).toContain('0 of 10');
    expect(element.textContent).toContain('0%');
    expect(element.textContent).toContain('Unlock your full potential');
    expect(element.querySelector('.card-face--mentor')).toBeNull();
    expect(element.querySelector('a[href="/your-key"]')).not.toBeNull();
    expect(element.querySelector('a[href="/life-lessons"]')).not.toBeNull();
  });

  it('opens the earliest unread unit and shows the course-complete state', async () => {
    const {fixture, element} = await setup();
    element.querySelectorAll('.overview-card')[1].querySelector('button')!.click();
    expect(openUnit).toHaveBeenCalledWith('module-1', 'unit-1');
    completed.set(new Set(['module-1/unit-1', 'module-1/unit-2', 'module-2/unit-1']));
    fixture.detectChanges();
    expect(element.textContent).toContain('Course Complete — Review Module 1');
  });

  it('navigates with buttons, dots and arrow keys without wrapping past the ends', async () => {
    const {fixture, component, element} = await setup();
    element.querySelector<HTMLButtonElement>('.next')!.click();
    fixture.detectChanges();
    expect(component.activeIndex()).toBe(1);
    element.querySelectorAll<HTMLButtonElement>('.carousel-dots button')[3].click();
    fixture.detectChanges();
    expect(component.activeIndex()).toBe(3);
    expect(element.querySelector<HTMLButtonElement>('.next')!.disabled).toBe(true);
    element.querySelector('.overview-track')!.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}));
    expect(component.activeIndex()).toBe(2);
    component.select(-1);
    expect(component.activeIndex()).toBe(2);
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
      component.select(3);
      expect(wheel({deltaY: 100}).defaultPrevented).toBe(false);
    } finally { clock.mockRestore(); }
  });
});
