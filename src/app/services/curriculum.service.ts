import {Injectable, computed, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import catalogSnapshot from '../models/course-catalog.json';
import lessons from '../models/life-lessons.json';
import {CurriculumModule, CurriculumUnit, sortCurriculum} from '../models/curriculum.model';
import {FirebaseService} from './firebase.service';
import {TierService, canAccessModule} from './tier.service';

@Injectable({providedIn: 'root'})
export class CurriculumService {
  readonly firebase = inject(FirebaseService);
  private readonly tiers = inject(TierService);
  private readonly router = inject(Router);
  readonly modules = signal<CurriculumModule[]>(sortCurriculum(catalogSnapshot));
  readonly loading = signal(true);
  readonly usingSnapshot = signal(false);
  readonly courseModuleCount = computed(() => this.modules().filter(module => !module.supplemental).length);
  readonly totalUnits = computed(() => this.modules().reduce((sum, module) => sum + module.units.length, 0));
  readonly completedIds = computed(() => new Set(this.firebase.userProfile()?.completedCourses ?? []));
  readonly completedCount = computed(() => this.modules().reduce((sum, module) => sum + module.units.filter(unit => this.isCompleted(module.id, unit.id)).length, 0));

  constructor() { void this.load(); }

  async load(): Promise<void> {
    try {
      const modules = await this.firebase.getModuleCatalog();
      if (modules.length) this.modules.set(sortCurriculum(modules));
      else this.usingSnapshot.set(true);
    } catch { this.usingSnapshot.set(true); }
    finally { this.loading.set(false); }
  }

  getUnit(moduleId: string | number, unitId: string | number) {
    const mId = String(moduleId).trim();
    const uId = String(unitId).trim();
    const unit = this.modules().find(module => String(module.id).trim() === mId)
      ?.units.find(item => String(item.id).trim() === uId);
    return unit ? {
      ...unit,
      audioUrl: unit.audioUrl,
      videoUrl: unit.videoUrl,
      mentorName: unit.mentorName,
      hasMedia: Boolean(unit.hasMedia || unit.audioUrl || unit.videoUrl),
    } : null;
  }

  updateUnit(moduleId: string, unitId: string, patch: Partial<CurriculumUnit>): void {
    this.modules.update(modules => modules.map(module => module.id !== moduleId ? module : ({
      ...module,
      units: module.units.map(unit => unit.id !== unitId ? unit : {
        ...unit,
        ...patch,
        hasText: patch.content !== undefined ? Boolean(patch.content.trim()) : unit.hasText,
        hasMedia: patch.audioUrl !== undefined || patch.videoUrl !== undefined
          ? Boolean(patch.audioUrl || patch.videoUrl)
          : unit.hasMedia,
      }),
    })));
  }

  canAccess(moduleId: string): boolean { return canAccessModule(this.firebase.subscriptionTier(), moduleId); }
  isCompleted(moduleId: string, unitId: string): boolean { return this.completedIds().has(`${moduleId}/${unitId}`); }
  completionPercent(module: CurriculumModule): number {
    return module.units.length ? Math.round(module.units.filter(unit => this.isCompleted(module.id, unit.id)).length / module.units.length * 100) : 0;
  }
  openUnit(moduleId: string, unitId: string): void {
    if (!this.canAccess(moduleId)) { this.tiers.requestUpgrade(moduleId); return; }
    void this.router.navigate(['/courses', moduleId, 'units', unitId]);
  }
  async markCompleted(moduleId: string, unitId: string): Promise<void> {
    if (!this.canAccess(moduleId) || this.isCompleted(moduleId, unitId)) return;
    await this.firebase.recordCourseCompletion(`${moduleId}/${unitId}`);
  }
  async markIncomplete(moduleId: string, unitId: string): Promise<void> {
    if (!this.canAccess(moduleId) || !this.isCompleted(moduleId, unitId)) return;
    await this.firebase.removeCourseCompletion(`${moduleId}/${unitId}`);
  }
  toggleCompleted(moduleId: string, unitId: string): Promise<void> {
    return this.isCompleted(moduleId, unitId) ? this.markIncomplete(moduleId, unitId) : this.markCompleted(moduleId, unitId);
  }
}

export interface NextUnreadUnit {
  moduleId: string;
  moduleNumber: number;
  moduleTitle: string;
  unitId: string;
  unitNumber: number;
  title: string;
  excerpt: string;
  courseComplete: boolean;
}

const LIFE_LESSON_IDS = (lessons as {id: string}[]).map(lesson => lesson.id);
const idNumber = (id: string): number => Number(id.split('-').pop()) || 0;

function unitExcerpt(unit: CurriculumUnit): string {
  const source = (unit.description || unit.content || '').replace(/[#>*_`]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!source) return 'Open this unit and take the next step from where the course begins.';
  return source.length > 160 ? `${source.slice(0, 157).trimEnd()}…` : source;
}

/** Earliest unread unit, starting at Module 1 Unit 1, even if a later unit is already complete. */
export function findNextUnreadUnit(modules: readonly CurriculumModule[], completed: ReadonlySet<string>): NextUnreadUnit | null {
  const course = modules.filter(module => !module.supplemental);
  for (const module of course) {
    for (const unit of module.units) {
      if (!completed.has(`${module.id}/${unit.id}`)) {
        return {
          moduleId: module.id,
          moduleNumber: idNumber(module.id),
          moduleTitle: module.title,
          unitId: unit.id,
          unitNumber: idNumber(unit.id),
          title: unit.title,
          excerpt: unitExcerpt(unit),
          courseComplete: false,
        };
      }
    }
  }
  const firstModule = course[0];
  const firstUnit = firstModule?.units[0];
  if (!firstModule || !firstUnit) return null;
  return {
    moduleId: firstModule.id,
    moduleNumber: idNumber(firstModule.id),
    moduleTitle: firstModule.title,
    unitId: firstUnit.id,
    unitNumber: idNumber(firstUnit.id),
    title: firstUnit.title,
    excerpt: unitExcerpt(firstUnit),
    courseComplete: true,
  };
}

/** One completed Lyft'd Life Lessons module is 10 percent. */
export function countCompletedLifeLessons(completed: ReadonlySet<string>): number {
  return LIFE_LESSON_IDS.filter(id => completed.has(`life-lesson/${id}`) || completed.has(id)).length;
}
