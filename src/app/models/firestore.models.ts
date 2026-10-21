import type {Course, Mentor} from './app.models';

export type CourseDocument = Course;

export type CourseMediaUrls = Record<string, string>;
export type SubscriptionTier = 1 | 2 | 3;

export interface ModuleUnitDocument {
  id: string;
  title?: string;
  tags?: string[];
  description?: string;
  minTier: SubscriptionTier;
  textContent: string;
  audioUrls: CourseMediaUrls;
  videoUrls: CourseMediaUrls;
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

export interface PartnershipDocument {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
}
