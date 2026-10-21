import {describe, expect, it} from 'vitest';
import {canAccessModule, requiredModuleTier, TierService} from './tier.service';

describe('subscription module policy', () => {
  it('allows only the defined module ranges', () => {
    for (const tier of [0, 1, 2, 3, 4, 5]) {
      for (const number of [1, 5, 6, 10, 11, 21, 22]) {
        const expected = tier >= 1 && tier <= 4 && (tier >= 3 || (tier === 2 && number <= 10) || number <= 5);
        expect(canAccessModule(tier, `module-${number}`)).toBe(expected);
      }
    }
  });
  it('fails closed for malformed module IDs', () => {
    for (const id of ['module-0', 'module-01', 'module--1', 'unknown']) {
      expect(requiredModuleTier(id)).toBeNull();
      expect(canAccessModule(4, id)).toBe(false);
    }
  });
  it('highlights the minimum upgrade and clears on dismissal', () => {
    const service = new TierService();
    service.requestUpgrade('module-6');
    expect(service.requiredUpgrade()).toBe(2);
    service.requestUpgrade('module-11');
    expect(service.requiredUpgrade()).toBe(3);
    service.close();
    expect(service.requiredUpgrade()).toBeNull();
  });
});
