import {DOCUMENT, Location} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {NavigationService} from './navigation.service';

describe('NavigationService', () => {
  const back = vi.fn();
  const navigateByUrl = vi.fn();

  function setup(historyLength: number | null) {
    TestBed.configureTestingModule({providers: [
      {provide: Location, useValue: {back}},
      {provide: Router, useValue: {navigateByUrl}},
      {provide: DOCUMENT, useValue: {defaultView: historyLength === null ? null : {history: {length: historyLength}}}},
    ]});
    return TestBed.inject(NavigationService);
  }

  beforeEach(() => vi.clearAllMocks());

  it('uses Angular Location to return to the previous history entry', () => {
    setup(3).goBack('/courses');
    expect(back).toHaveBeenCalledOnce();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('replaces a direct unit entry with the courses parent', () => {
    setup(1).goBack('/courses');
    expect(navigateByUrl).toHaveBeenCalledWith('/courses', {replaceUrl: true});
    expect(back).not.toHaveBeenCalled();
  });

  it('defaults other subpages to the dashboard', () => {
    setup(1).goBack();
    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard', {replaceUrl: true});
  });

  it('handles rendering without a browser window', () => {
    setup(null).goBack();
    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard', {replaceUrl: true});
    expect(back).not.toHaveBeenCalled();
  });
});
