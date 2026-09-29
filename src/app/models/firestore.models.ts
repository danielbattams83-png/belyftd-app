import type {Course, Mentor} from './app.models';

export type CourseDocument = Course;

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
