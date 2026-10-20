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
