import {productionMentorForLabel} from './production-mentors';
export type CourseMediaType = 'audio' | 'video';

export function buildCourseMediaStoragePath(
  moduleId: string,
  unitId: string,
  mediaType: CourseMediaType,
  avatarId: string,
  extension: string
): string {
  const pathSegments = [moduleId, unitId, avatarId];
  if (pathSegments.some(segment =>
    !segment || segment === '.' || segment === '..' || !/^[A-Za-z0-9_.-]+$/.test(segment)
  )) {
    throw new Error('Course media path identifiers must be non-empty path segments.');
  }
  const normalizedExtension = extension.replace(/^\./, '');
  if (!/^[a-zA-Z0-9]+$/.test(normalizedExtension)) {
    throw new Error('Course media extension must contain only letters and numbers.');
  }

  return `course-content/${moduleId}/${unitId}/${mediaType}/${avatarId}.${normalizedExtension}`;
}

/** Normalize ingested labels without inventing a mentor or language. */
export function parseMentorLabel(label: string): {mentorName: string; language: string} {
  const match = label.trim().match(/^(.+?)\s*(?:\(([^)]+)\)| - (.+))$/);
  const mentorName = productionMentorForLabel(label)?.name ?? (match?.[1] ?? label).trim();
  const rawLanguage = (match?.[2] ?? match?.[3] ?? (['Hannah', 'Steve'].includes(mentorName) ? 'English' : '')).trim();
  const languageNames: Record<string, string> = {en: 'English', zh: 'Chinese', sw: 'Swahili'};
  const language = rawLanguage
    ? languageNames[rawLanguage.toLowerCase()] ?? rawLanguage.charAt(0).toUpperCase() + rawLanguage.slice(1).toLowerCase()
    : 'Language not specified';
  return {mentorName, language};
}

export function isProductionMentorVariant(label: string): boolean {
  const mentor = productionMentorForLabel(label);
  return !!mentor && mentor.languages.includes(parseMentorLabel(label).language);
}
