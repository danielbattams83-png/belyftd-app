export type SubscriptionTier = 1 | 2 | 3 | 4;

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number;
  currency: 'USD';
  moduleAccess: 'module-1' | 50 | 100;
  directoryAdvertising: boolean;
  prominentPlacement: boolean;
  customBranding: boolean;
  advancedAi: boolean;
  badge?: string;
  features: readonly string[];
}

export const SUBSCRIPTION_TIERS: readonly SubscriptionPlan[] = [
  {tier: 1, name: 'Starter Partner', price: 14.99, currency: 'USD', moduleAccess: 'module-1', directoryAdvertising: false, prominentPlacement: false, customBranding: false, advancedAi: false,
    features: ['All Module 1 units', 'Basic reflection tools']},
  {tier: 2, name: 'Community Catalyst', price: 29.99, currency: 'USD', moduleAccess: 50, directoryAdvertising: false, prominentPlacement: false, customBranding: false, advancedAi: false,
    features: ['Modules 1-3 (50% of curriculum)', 'Full mentor avatar video library', 'Full multilingual audio library']},
  {tier: 3, name: 'Impact Leader', price: 49.99, currency: 'USD', moduleAccess: 100, directoryAdvertising: true, prominentPlacement: false, customBranding: false, advancedAi: false, badge: 'Most Popular',
    features: ['100% full platform access', 'Full mentor video and multilingual audio library', 'Brand advertising in the Partners directory']},
  {tier: 4, name: 'Enterprise Sponsor', price: 69.99, currency: 'USD', moduleAccess: 100, directoryAdvertising: true, prominentPlacement: true, customBranding: true, advancedAi: true, badge: 'Enterprise / Co-Branded',
    features: ['100% full platform access', 'Prominent Partner placement', 'Custom App Brand Personalization', 'Advanced AI features']},
];
