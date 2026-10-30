import type {Course, Mentor} from './app.models';

export type CourseDocument = Course;

export type CourseMediaUrls = Record<string, string>;
import type {SubscriptionTier} from './tier.model';
export type {SubscriptionTier} from './tier.model';

export interface ModuleUnitDocument {
  id: string;
  title?: string;
  tags?: string[];
  description?: string;
  estimatedDuration?: string;
  minTier: SubscriptionTier;
  textContent: string;
  content?: string;
  readingContentPath?: string;
  contentKind?: 'reading';
  audioUrls: CourseMediaUrls;
  videoUrls: CourseMediaUrls;
  audioUrl?: string;
  videoUrl?: string;
  mentorName?: string;
  published?: boolean;
  requiresTierUnlock?: boolean;
}

export interface CourseUnitDocument extends ModuleUnitDocument {
  moduleId?: string;
  unitId?: string;
}

export interface DailyAffirmationDocument {
  id: string;
  date: string;
  text: string;
}

export type MentorDocument = Mentor & {
  ageBrackets: string[];
};

export interface Tier4PartnerBranding {
  logoUrl: string;
  themeId?: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor?: string;
  textOnHeroColor?: string;
  welcomeHeadline: string;
  welcomeSubtext: string;
  sponsorBadgeText: string;
  customPartnerTabName: string;
}

export interface Tier4PartnerDocument {
  id: string;
  organizationName: string;
  websiteUrl?: string;
  contactEmail: string;
  subscriptionTier: 4;
  active: boolean;
  branding: Tier4PartnerBranding;
  redemptionCodes: string[];
  analytics: {totalRedemptions: number; activeMentees: number; lessonsCompleted: number};
}

export interface PartnershipDocument {
  subscriptionTier?: SubscriptionTier;
  active?: boolean;
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
}
