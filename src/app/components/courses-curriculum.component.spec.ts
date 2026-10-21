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

describe('module curriculum accordions', () => {
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

  it('sorts modules and units numerically and includes text-only and locked lessons', async () => {
    const {component, element} = await setup();
    expect(component.visibleModules().map(module => module.id)).toEqual(['module-1', 'module-2', 'module-10']);
    expect(component.visibleModules()[0].units.map(unit => unit.id)).toEqual(['unit-1', 'unit-2', 'unit-10']);
    expect(element.textContent).toContain('Read Unit');
    expect(element.textContent).toContain('Read & Listen');
    expect(element.textContent).toContain('Upgrade to Unlock');
    expect(element.querySelectorAll('li').length).toBe(5);
    expect(component.defaultExpanded()).toBe('module-1');
  });

  it('defaults to the first accessible incomplete module and shows completion stats', async () => {
    const {component, element} = await setup(2, ['module-1/unit-1', 'module-1/unit-2', 'module-1/unit-10']);
    expect(component.defaultExpanded()).toBe('module-2');
    expect(element.querySelector('summary')?.textContent).toContain('100% Completed');
    expect(element.querySelectorAll('details')[0].open).toBe(false);
    expect(element.querySelectorAll('details')[1].open).toBe(true);
  });

  it('opens an upgrade modal for locked units instead of navigating or requesting media', async () => {
    const {element} = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    const lockedButton = Array.from(element.querySelectorAll('button')).find(button => button.textContent?.includes('Upgrade to Unlock'))!;
    lockedButton.click();
    expect(TestBed.inject(TierService).requiredUpgrade()).toBe(2);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('routes text-only units to the reader and preserves manual accordion collapse', async () => {
    const {element, component} = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const read = Array.from(element.querySelectorAll('button')).find(button => button.textContent?.includes('Read Unit'))!;
    read.click();
    expect(navigate).toHaveBeenCalledWith(['/courses', 'module-1', 'units', 'unit-2']);
    const details = element.querySelector('details')!;
    details.open = false;
    details.dispatchEvent(new Event('toggle'));
    expect(component.isExpanded('module-1')).toBe(false);
  });

  it('filters by completion without changing summary totals', async () => {
    const {fixture, component} = await setup(1, ['module-1/unit-2']);
    fixture.componentRef.setInput('filter', 'completed');
    fixture.detectChanges();
    expect(component.visibleModules()[0].units.map(unit => unit.id)).toEqual(['unit-2']);
    expect(component.visibleModules()[0].allUnitCount).toBe(3);
    expect(component.visibleModules()[0].percent).toBe(33);
    expect(TestBed.inject(CurriculumService).totalUnits()).toBe(5);
  });
});
