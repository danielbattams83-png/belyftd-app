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
    expect(element.textContent).toContain('Upgrade to Unlock');
    element.querySelector<HTMLButtonElement>('.unit-open')!.click();
    expect(TestBed.inject(TierService).requiredUpgrade()).toBe(2);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('routes units to the reader when tapped', async () => {
    const {element} = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const read = Array.from(element.querySelectorAll<HTMLButtonElement>('.unit-open')).find(button => button.textContent?.includes('Read Unit'))!;
    read.click();
    expect(navigate).toHaveBeenCalledWith(['/courses', 'module-1', 'units', 'unit-2']);
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
