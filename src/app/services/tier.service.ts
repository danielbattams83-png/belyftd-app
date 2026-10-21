import {Injectable, signal} from '@angular/core';
import {SubscriptionTier} from '../models/tier.model';

export function requiredModuleTier(moduleId: string): SubscriptionTier | null {
  const match = /^module-([1-9][0-9]*)$/.exec(moduleId);
  if (!match) return null;
  const number = Number(match[1]);
  return number === 1 ? 1 : number <= 3 ? 2 : 3;
}

export function canAccessModule(tier: number, moduleId: string): boolean {
  const required = requiredModuleTier(moduleId);
  return [1, 2, 3, 4].includes(tier) && required !== null && tier >= required;
}

@Injectable({providedIn: 'root'})
export class TierService {
  readonly requiredUpgrade = signal<SubscriptionTier | null>(null);
  requestUpgrade(moduleId: string): void {
    this.requiredUpgrade.set(requiredModuleTier(moduleId) ?? 3);
  }
  close(): void { this.requiredUpgrade.set(null); }
}
