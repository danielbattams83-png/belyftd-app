import {Tier4PartnerDocument} from '../models/firestore.models';

export function partnerFixture(id = 'harbour-city'): Tier4PartnerDocument {
  return {
    id,
    organizationName: 'Harbour City Rowing',
    contactEmail: 'hello@example.org',
    websiteUrl: 'https://example.org',
    subscriptionTier: 4,
    active: true,
    branding: {
      logoUrl: '/partners/harbour-city-rowing.png',
      themeId: 'ocean',
      primaryColor: '#0369a1',
      accentColor: '#fbbf24',
      backgroundColor: '#082f49',
      surfaceColor: '#f0f9ff',
      textOnHeroColor: '#ffffff',
      welcomeHeadline: 'Welcome to Harbour City',
      welcomeSubtext: 'Your next chapter starts here.',
      sponsorBadgeText: 'Official Performance Partner',
      customPartnerTabName: 'Academy',
    },
    redemptionCodes: ['ROW2026'],
    analytics: {totalRedemptions: 0, activeMentees: 0, lessonsCompleted: 0},
  };
}
