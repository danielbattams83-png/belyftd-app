import {TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {FirebaseService} from '../../services/firebase.service';
import {MentorshipDataService} from '../../services/mentorship-data.service';
import {VERIFIED_MENTOR_RECORDINGS} from '../../services/verified-mentor-recordings';
import {DiscoveryLesson, SmartSearchService, rankDiscoveryLessons, recordingLessons} from './smart-search.service';

describe('Discovery intent matching', () => {
  const catalog = recordingLessons(VERIFIED_MENTOR_RECORDINGS);

  it('understands encouragement and doubt without exact title matches', () => {
    expect(rankDiscoveryLessons(catalog, 'I need some encouragement')[0].title).toBe('Hope');
    expect(rankDiscoveryLessons(catalog, 'I am feeling afraid').some(lesson => lesson.title === 'Courage')).toBe(true);
    expect(rankDiscoveryLessons(catalog, 'overcoming doubt').length).toBeGreaterThan(0);
  });

  it('filters languages and mentors against the same real audio variant', () => {
    const results = rankDiscoveryLessons(catalog, 'Omari in Swahili audio');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(lesson => lesson.variants.some(variant => variant.mentorName === 'Omari' && variant.language === 'Swahili' && variant.type === 'audio'))).toBe(true);
    expect(rankDiscoveryLessons(catalog, 'Omari Chinese audio')).toEqual([]);
    expect(rankDiscoveryLessons(catalog, 'Swahili video')).toEqual([]);
    expect(rankDiscoveryLessons(catalog, 'Mandarin')[0].variants.some(variant => variant.language === 'Chinese')).toBe(true);
  });

  it('includes text-only lessons, prioritizes titles, and matches Firestore tags', () => {
    const lessons: DiscoveryLesson[] = [
      {moduleId: 'module-1', unitId: 'unit-1', title: 'Your next steps', tags: ['goal setting'], description: '', variants: []},
      {moduleId: 'module-1', unitId: 'unit-2', title: 'Goal Setting', tags: [], description: '', variants: []},
    ];
    expect(rankDiscoveryLessons(lessons, 'goal setting').map(lesson => lesson.unitId)).toEqual(['unit-2', 'unit-1']);
    expect(rankDiscoveryLessons(lessons, 'audio')).toEqual([]);
    expect(rankDiscoveryLessons(lessons, 'astronomy')).toEqual([]);
    expect(rankDiscoveryLessons(lessons, '   ')).toHaveLength(2);
  });

  it('deduplicates multiple mentor recordings into one navigable lesson', () => {
    expect(catalog.filter(lesson => lesson.moduleId === 'module-5' && lesson.unitId === 'unit-2')).toHaveLength(1);
    expect(catalog.every(lesson => lesson.moduleId && lesson.unitId)).toBe(true);
  });
});

describe('Discovery catalog loading', () => {
  it('loads text units lazily, retains local results on failure, and clears user data on sign-out', async () => {
    const currentUser = signal<object | null>({uid: 'test'});
    const subscriptionTier = signal(3);
    const getModuleUnits = vi.fn(async (moduleId: string) => {
      if (moduleId === 'module-2') throw new Error('offline');
      return moduleId === 'module-1' ? [{id: 'unit-9', title: 'Goal Setting', tags: ['planning'], textContent: 'A reading lesson', audioUrls: {}, videoUrls: {}, minTier: 1}] : [];
    });
    TestBed.configureTestingModule({providers: [
      {provide: FirebaseService, useValue: {currentUser, subscriptionTier, getModuleUnits}},
      {provide: MentorshipDataService, useValue: {availableAudioTracks: signal(VERIFIED_MENTOR_RECORDINGS)}},
    ]});
    const service = TestBed.inject(SmartSearchService);
    TestBed.tick();
    expect(getModuleUnits).not.toHaveBeenCalled();
    await service.load();
    expect(getModuleUnits).toHaveBeenCalledTimes(5);
    expect(service.lessons().some(lesson => lesson.title === 'Goal Setting')).toBe(true);
    expect(service.error()).toContain('Some lessons');
    expect(service.lessons().some(lesson => lesson.title === 'Hope')).toBe(true);
    currentUser.set(null);
    subscriptionTier.set(0);
    TestBed.tick();
    expect(service.lessons().some(lesson => lesson.title === 'Goal Setting')).toBe(false);
    expect(service.loading()).toBe(false);
  });
});
