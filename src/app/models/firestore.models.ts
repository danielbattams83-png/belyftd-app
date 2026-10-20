import type {Course, Mentor} from './app.models';

export type CourseDocument = Course;

export type CourseMediaUrls = Record<string, string>;

export interface CourseUnitDocument {
  id?: string;
  moduleId?: string;
  unitId?: string;
  title: string;
  minTier: 1 | 2 | 3;
  textContent: string;
  audioUrls: CourseMediaUrls;
  videoUrls: CourseMediaUrls;
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
