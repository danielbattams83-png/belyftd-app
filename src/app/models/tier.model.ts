export type SubscriptionTier = 1 | 2 | 3 | 4;

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number;
  currency: 'USD';
  moduleAccess: 5 | 10 | 21;
  directoryAdvertising: boolean;
  prominentPlacement: boolean;
  customBranding: boolean;
  advancedAi: boolean;
  badge?: string;
  features: readonly string[];
}

export const SUBSCRIPTION_TIERS: readonly SubscriptionPlan[] = [
  {tier: 1, name: 'Starter Partner', price: 14.99, currency: 'USD', moduleAccess: 5, directoryAdvertising: false, prominentPlacement: false, customBranding: false, advancedAi: false,
    features: ['All units in Modules 1-5', 'Basic reflection tools']},
  {tier: 2, name: 'Community Catalyst', price: 29.99, currency: 'USD', moduleAccess: 10, directoryAdvertising: false, prominentPlacement: false, customBranding: false, advancedAi: false,
    features: ['All units in Modules 1-10', 'Full mentor avatar video library', 'Full multilingual audio library']},
  {tier: 3, name: 'Impact Leader', price: 49.99, currency: 'USD', moduleAccess: 21, directoryAdvertising: true, prominentPlacement: false, customBranding: false, advancedAi: false, badge: 'Most Popular',
    features: ['All 21 modules and supplemental reading', 'Full mentor video and multilingual audio library', 'Brand advertising in the Partners directory']},
  {tier: 4, name: 'Enterprise Sponsor', price: 69.99, currency: 'USD', moduleAccess: 21, directoryAdvertising: true, prominentPlacement: true, customBranding: true, advancedAi: true, badge: 'Enterprise / Co-Branded',
    features: ['All 21 modules and supplemental reading', 'Prominent Partner placement', 'Custom App Brand Personalization', 'Advanced AI features']},
];
