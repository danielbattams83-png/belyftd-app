import {Injectable, computed, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import catalogSnapshot from '../models/course-catalog.json';
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
    return this.modules().find(module => String(module.id).trim() === mId)
      ?.units.find(unit => String(unit.id).trim() === uId) ?? null;
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
