import {TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {Router, provideRouter} from '@angular/router';
import {SmartSearchComponent} from './smart-search.component';
import {SmartSearchService, recordingLessons} from './smart-search.service';
import {VERIFIED_MENTOR_RECORDINGS} from '../../services/verified-mentor-recordings';

describe('Smart search dialog', () => {
  function setup() {
    const search = {lessons: signal(recordingLessons(VERIFIED_MENTOR_RECORDINGS)), loading: signal(false), error: signal(null), load: vi.fn()};
    TestBed.configureTestingModule({providers: [provideRouter([]), {provide: SmartSearchService, useValue: search}]});
    const fixture = TestBed.createComponent(SmartSearchComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector('dialog')!;
    // JSDOM does not implement the browser's native modal methods.
    const showModal = vi.fn(() => dialog.setAttribute('open', ''));
    const close = vi.fn(() => dialog.removeAttribute('open'));
    Object.defineProperties(dialog, {showModal: {value: showModal}, close: {value: close}});
    return {fixture, element, component: fixture.componentInstance, search, showModal, close};
  }

  it('opens and focuses search, applies a pill, and navigates to the selected unit', async () => {
    const {fixture, element, component, search, showModal, close} = setup();
    component.open();
    expect(showModal).toHaveBeenCalled();
    expect(search.load).toHaveBeenCalled();
    expect(document.activeElement).toBe(element.querySelector('input'));
    const pill = [...element.querySelectorAll<HTMLButtonElement>('.intents button')].find(button => button.textContent?.includes('Swahili'))!;
    pill.click();
    fixture.detectChanges();
    expect(component.results().every(lesson => lesson.variants.some(variant => variant.language === 'Swahili'))).toBe(true);
    expect(pill.getAttribute('aria-pressed')).toBe('true');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const lesson = component.results()[0];
    await component.select(lesson);
    expect(navigate).toHaveBeenCalledWith(['/courses', lesson.moduleId, 'units', lesson.unitId]);
    expect(close).toHaveBeenCalled();
  });

  it('keeps search usable after denied navigation and shows an empty state', async () => {
    const {fixture, element, component, close} = setup();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(false);
    await component.select(component.results()[0]);
    fixture.detectChanges();
    expect(close).not.toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('course access');
    component.query.set('unmatched astronomy');
    fixture.detectChanges();
    expect(element.querySelector('.empty')?.textContent).toContain('No matching lessons');
    element.querySelector<HTMLButtonElement>('.close')!.click();
    expect(close).toHaveBeenCalled();
  });
});
