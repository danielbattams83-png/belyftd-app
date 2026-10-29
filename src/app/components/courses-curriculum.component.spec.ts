import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {CoursesCurriculumComponent} from './courses-curriculum.component';
import {FirebaseService} from '../services/firebase.service';
import {TierService} from '../services/tier.service';
import {CurriculumService} from '../services/curriculum.service';

const unit = (id: string, hasMedia = false) => ({id, title: `Lesson ${id}`, hasText: true, hasMedia});
const modules = [
  {id: 'module-10', title: 'Advanced', units: [unit('unit-1')]},
  {id: 'module-2', title: 'Identity', units: [unit('unit-1', true)]},
  {id: 'module-1', title: 'Mindset', units: [unit('unit-10'), unit('unit-2'), unit('unit-1', true)]},
];

describe('module selector and unit drawer', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  async function setup(tier = 1, completed: string[] = []) {
    const firebase = {
      subscriptionTier: signal(tier), userProfile: signal({completedCourses: completed}),
      getModuleCatalog: vi.fn().mockResolvedValue(modules), recordCourseCompletion: vi.fn(async () => undefined),
    };
    TestBed.configureTestingModule({imports: [CoursesCurriculumComponent], providers: [
      provideRouter([]), {provide: FirebaseService, useValue: firebase},
    ]});
    const fixture = TestBed.createComponent(CoursesCurriculumComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return {fixture, firebase, component: fixture.componentInstance, element: fixture.nativeElement as HTMLElement};
  }

  it('sorts modules and units numerically and lists the active module units in the drawer', async () => {
    const {component, element} = await setup();
    expect(component.visibleModules().map(module => module.id)).toEqual(['module-1', 'module-2', 'module-10']);
    expect(component.visibleModules()[0].units.map(unit => unit.id)).toEqual(['unit-1', 'unit-2', 'unit-10']);
    expect(element.querySelectorAll('.module-card').length).toBe(3);
    expect(element.querySelectorAll('.unit-card').length).toBe(3);
    expect(element.textContent).toContain('Read Unit');
    expect(element.textContent).toContain('Read & Listen');
    expect(component.activeModuleId()).toBe('module-1');
  });

  it('renders every unit open with stack indices and no accordion controls', async () => {
    const {fixture, element} = await setup();
    const cards = Array.from(element.querySelectorAll<HTMLElement>('.sticky-deck .unit-card'));
    expect(cards.map(card => card.style.getPropertyValue('--stack-idx'))).toEqual(['0', '1', '2']);
    expect(cards.map(card => card.querySelector('.unit-index')?.textContent?.trim())).toEqual(['1', '2', '10']);
    for (const card of cards) {
      expect(card.querySelector('.unit-preview-text')?.textContent?.trim()).toBeTruthy();
      expect(card.querySelector('.action-pill--primary')).not.toBeNull();
      expect(card.querySelector('.action-pill--toggle')).not.toBeNull();
      expect(card.querySelector('[inert], [aria-expanded], .unit-expand-content')).toBeNull();
      card.querySelector<HTMLElement>('.unit-title')!.click();
    }
    fixture.detectChanges();
    expect(element.querySelectorAll('.sticky-deck .unit-card .unit-actions').length).toBe(3);
  });

  it('defaults to the first accessible incomplete module and shows ring stats', async () => {
    const {component, element} = await setup(2, ['module-1/unit-1', 'module-1/unit-2', 'module-1/unit-10']);
    expect(component.activeModuleId()).toBe('module-2');
    const cards = element.querySelectorAll('.module-card');
    expect(cards[0].querySelector('.progress-ring__label')?.textContent?.trim()).toBe('✓');
    expect(cards[0].textContent).toContain('3 / 3 Completed');
    expect(cards[1].classList.contains('is-active')).toBe(true);
    expect(cards[1].textContent).toContain('0%');
  });

  it('tags cards before and after the active one for the 3D fan and shows a status chip', async () => {
    const {fixture, component, element} = await setup(2);
    component.selectModule('module-2');
    fixture.detectChanges();
    const cards = Array.from(element.querySelectorAll('.module-card'));
    expect(cards.map(card => card.classList.contains('is-prev'))).toEqual([true, false, false]);
    expect(cards.map(card => card.classList.contains('is-active'))).toEqual([false, true, false]);
    expect(cards.map(card => card.classList.contains('is-next'))).toEqual([false, false, true]);
    expect(cards[1].querySelector('.module-card__status')?.textContent?.trim()).toBe('Not started');
  });

  it('switches the drawer when a module card is selected', async () => {
    const {fixture, component, element} = await setup(2);
    const cards = element.querySelectorAll<HTMLButtonElement>('.module-card');
    cards[2].click();
    fixture.detectChanges();
    expect(component.activeModuleId()).toBe('module-10');
    expect(element.querySelector('.drawer-header h2')?.textContent).toContain('Advanced');
    expect(element.querySelectorAll('.unit-card').length).toBe(1);
  });

  it('selects and centres the next module on wheel down, then the previous on wheel up', async () => {
    const {fixture, component, element} = await setup(2);
    const track = element.querySelector<HTMLElement>('.module-track')!;
    const scrollTo = vi.fn();
    track.scrollTo = scrollTo;
    const clock = vi.spyOn(performance, 'now').mockReturnValue(1000);
    try {
      const down = new WheelEvent('wheel', {deltaY: 100, bubbles: true, cancelable: true});
      track.querySelector('.module-card')!.dispatchEvent(down);
      fixture.detectChanges();
      expect(down.defaultPrevented).toBe(true);
      expect(component.activeModuleId()).toBe('module-2');
      expect(element.querySelector('.drawer-header h2')?.textContent).toContain('Identity');
      expect(scrollTo).toHaveBeenCalled();
      clock.mockReturnValue(1421);
      const up = new WheelEvent('wheel', {deltaY: -100, cancelable: true});
      track.dispatchEvent(up);
      expect(up.defaultPrevented).toBe(true);
      expect(component.activeModuleId()).toBe('module-1');
    } finally {
      clock.mockRestore();
    }
  });

  it('throttles wheel bursts using the video carousel cooldown', async () => {
    const {component, element} = await setup(2);
    const track = element.querySelector('.module-track')!;
    const clock = vi.spyOn(performance, 'now').mockReturnValue(1000);
    try {
      track.dispatchEvent(new WheelEvent('wheel', {deltaY: 100, cancelable: true}));
      clock.mockReturnValue(1100);
      const burst = new WheelEvent('wheel', {deltaY: 100, cancelable: true});
      track.dispatchEvent(burst);
      expect(burst.defaultPrevented).toBe(true);
      expect(component.activeModuleId()).toBe('module-2');
      clock.mockReturnValue(1421);
      track.dispatchEvent(new WheelEvent('wheel', {deltaY: 100, cancelable: true}));
      expect(component.activeModuleId()).toBe('module-10');
    } finally {
      clock.mockRestore();
    }
  });

  it('preserves page scrolling at the ends, horizontal gestures and zoom', async () => {
    const {component, element} = await setup(2);
    const track = element.querySelector('.module-track')!;
    for (const init of [{deltaY: -100}, {deltaX: 100, deltaY: 10}, {deltaY: 100, ctrlKey: true}, {deltaY: 0}]) {
      const event = new WheelEvent('wheel', {...init, cancelable: true});
      track.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(component.activeModuleId()).toBe('module-1');
    }
    component.selectModule('module-10');
    const end = new WheelEvent('wheel', {deltaY: 100, cancelable: true});
    track.dispatchEvent(end);
    expect(end.defaultPrevented).toBe(false);
    expect(component.activeModuleId()).toBe('module-10');
  });

  it('removes the wheel listener when destroyed', async () => {
    const {fixture, component, element} = await setup();
    const track = element.querySelector('.module-track')!;
    fixture.destroy();
    const event = new WheelEvent('wheel', {deltaY: 100, cancelable: true});
    track.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(component.activeModuleId()).toBe('module-1');
  });

  it('maps completion percent to the ring stroke offset', async () => {
    const {component} = await setup();
    expect(component.calculateOffset(0)).toBeCloseTo(component.circumference);
    expect(component.calculateOffset(100)).toBeCloseTo(0);
    expect(component.calculateOffset(50)).toBeCloseTo(component.circumference / 2);
  });

  it('opens an upgrade modal for locked units instead of navigating or requesting media', async () => {
    const {fixture, element} = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    element.querySelectorAll<HTMLButtonElement>('.module-card')[2].click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Unlock Unit');
    element.querySelector<HTMLButtonElement>('.action-pill--primary')!.click();
    expect(TestBed.inject(TierService).requiredUpgrade()).toBe(2);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('opens the full-screen reader in place when a unit is tapped', async () => {
    const {component, element} = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const read = Array.from(element.querySelectorAll<HTMLButtonElement>('.action-pill--primary')).find(button => button.textContent?.includes('Read Unit'))!;
    read.click();
    expect(component.openedUnit()).toEqual({moduleId: 'module-1', unitId: 'unit-2'});
    expect(navigate).not.toHaveBeenCalled();
    component.closeReader();
    expect(component.openedUnit()).toBeNull();
  });

  it('lets a completed unit be marked incomplete again', async () => {
    const {fixture, firebase, element} = await setup(1, ['module-1/unit-1']);
    (firebase as unknown as {removeCourseCompletion: unknown}).removeCourseCompletion = vi.fn(async () => undefined);
    const toggles = element.querySelectorAll<HTMLButtonElement>('.action-pill--toggle');
    expect(toggles[0].getAttribute('aria-pressed')).toBe('true');
    expect(toggles[0].textContent).toContain('Completed');
    expect(toggles[1].getAttribute('aria-pressed')).toBe('false');
    toggles[0].click();
    fixture.detectChanges();
    expect((firebase as unknown as {removeCourseCompletion: ReturnType<typeof vi.fn>}).removeCourseCompletion).toHaveBeenCalledWith('module-1/unit-1');
    toggles[1].click();
    expect(firebase.recordCourseCompletion).toHaveBeenCalledWith('module-1/unit-2');
  });

  it('filters by completion without changing summary totals', async () => {
    const {fixture, component} = await setup(1, ['module-1/unit-2']);
    fixture.componentRef.setInput('filter', 'completed');
    fixture.detectChanges();
    expect(component.visibleModules().length).toBe(1);
    expect(component.visibleModules()[0].units.map(unit => unit.id)).toEqual(['unit-2']);
    expect(component.visibleModules()[0].allUnitCount).toBe(3);
    expect(component.visibleModules()[0].percent).toBe(33);
    expect(TestBed.inject(CurriculumService).totalUnits()).toBe(5);
  });
});
