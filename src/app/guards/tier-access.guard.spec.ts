import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, convertToParamMap, Router, RouterStateSnapshot} from '@angular/router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {FirebaseService} from '../services/firebase.service';
import {TierService} from '../services/tier.service';
import {tierAccessGuard} from './tier-access.guard';

describe('tier route guard', () => {
  const firebase = {
    waitForAuthStateReady: vi.fn(async () => undefined),
    getCurrentSubscriptionTier: vi.fn(async () => 1),
    getModuleUnit: vi.fn(async () => ({id: 'unit-1', minTier: 4})),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({providers: [
      {provide: FirebaseService, useValue: firebase},
      {provide: Router, useValue: {createUrlTree: vi.fn(() => '/courses')}},
    ]});
  });
  async function navigate(moduleId: string) {
    const route = {paramMap: convertToParamMap({moduleId, unitId: 'unit-1'})} as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => tierAccessGuard(route, {} as RouterStateSnapshot));
  }
  it('opens the upgrade paywall before requesting restricted content', async () => {
    expect(await navigate('module-2')).toBe(false);
    expect(TestBed.inject(TierService).requiredUpgrade()).toBe(2);
    expect(firebase.getModuleUnit).not.toHaveBeenCalled();
  });
  it('allows Module 1 regardless of old unit tier metadata', async () => {
    expect(await navigate('module-1')).toBe(true);
    expect(firebase.getModuleUnit).toHaveBeenCalledWith('module-1', 'unit-1');
  });
});
