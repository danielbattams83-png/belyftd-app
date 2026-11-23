import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, NgZone, output, signal, untracked, viewChild} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {CurriculumService} from '../services/curriculum.service';
import {CourseUnitComponent} from './course-unit.component';
import {CurriculumMentorHubComponent, CurriculumMentorAudio} from './curriculum-mentor-hub.component';
import {AudioTrack} from '../models/app.models';

const RING_RADIUS = 17;
const INITIAL_SYNC_MS = 120;
const PROGRAMMATIC_SCROLL_MS = 400;
const WHEEL_COOLDOWN_MS = 420;

@Component({
  selector: 'app-courses-curriculum',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, CourseUnitComponent, CurriculumMentorHubComponent],
  templateUrl: './courses-curriculum.component.html',
  styleUrl: './courses-curriculum.component.scss',
})
export class CoursesCurriculumComponent {
  readonly curriculum = inject(CurriculumService);
  readonly filter = input<'all' | 'completed' | 'in-progress'>('all');
  readonly filterChange = output<'all' | 'completed' | 'in-progress'>();
  readonly mentorAudio = input<CurriculumMentorAudio[]>([]);
  readonly streakDays = input(0);
  readonly signedIn = input(false);
  readonly audioLoading = input(false);
  readonly audioError = input<string | null>(null);
  readonly playRecording = output<AudioTrack>();
  readonly chooseMentors = output<void>();
  readonly showDailyLyft = output<void>();
  readonly overallProgress = computed(() => this.curriculum.totalUnits() ? Math.round(this.curriculum.completedCount() / this.curriculum.totalUnits() * 100) : 0);
  readonly circumference = 2 * Math.PI * RING_RADIUS;
  readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private readonly zone = inject(NgZone);
  private cardCenters: number[] = [];

  readonly visibleModules = computed(() => this.curriculum.modules().map(module => {
    const completedUnits = module.units.filter(unit => this.curriculum.isCompleted(module.id, unit.id)).length;
    return {
      ...module,
      allUnitCount: module.units.length,
      totalUnits: module.units.length,
      completedUnits,
      percent: this.curriculum.completionPercent(module),
      units: module.units.filter(unit => this.filter() === 'all' ||
        (this.filter() === 'completed' ? this.curriculum.isCompleted(module.id, unit.id) : !this.curriculum.isCompleted(module.id, unit.id))),
    };
  }).filter(module => module.units.length));

  readonly defaultExpanded = computed(() => this.visibleModules().find(module => this.curriculum.canAccess(module.id) && module.percent < 100)?.id
    ?? this.visibleModules().find(module => this.curriculum.canAccess(module.id))?.id
    ?? this.visibleModules()[0]?.id);

  private readonly selectedModuleId = signal<string | null>(null);
  readonly activeModuleId = computed(() => {
    const selected = this.selectedModuleId();
    return selected && this.visibleModules().some(module => module.id === selected) ? selected : this.defaultExpanded();
  });
  readonly activeModule = computed(() => this.visibleModules().find(module => module.id === this.activeModuleId()));
  readonly activeModuleList = computed(() => {
    const module = this.activeModule();
    return module ? [module] : [];
  });

  readonly activeIndex = computed(() => this.visibleModules().findIndex(module => module.id === this.activeModuleId()));

  /** The unit currently open in the full-screen reader, if any. */
  readonly openedUnit = signal<{moduleId: string; unitId: string} | null>(null);

  private wheelLockedUntil = 0;
  private rafId: number | null = null;
  private isProgrammaticScrolling = false;
  private programmaticTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      clearTimeout(this.programmaticTimer);
    });

    // The track lives inside an @if, so attach to it whenever the viewChild resolves rather than in ngAfterViewInit.
    effect(onCleanup => {
      const track = this.track()?.nativeElement;
      this.visibleModules();
      if (!track || typeof requestAnimationFrame === 'undefined') return;

      const desktop = typeof matchMedia === 'undefined' ? null : matchMedia('(min-width: 1024px)');
      const restoreMobile = () => { if (!desktop?.matches) this.centerActive(track); };
      const measure = () => {
        this.cardCenters = Array.from(track.querySelectorAll<HTMLElement>('.module-card'), card => card.offsetLeft + card.offsetWidth / 2);
      };
      desktop?.addEventListener('change', restoreMobile);
      const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
      this.zone.runOutsideAngular(() => {
        measure();
        track.addEventListener('scroll', this.onTrackScroll, {passive: true});
        track.addEventListener('wheel', this.onTrackWheel, {passive: false});
        resize?.observe(track);
      });
      const initialSync = setTimeout(() => {
        measure();
        this.centerActive(track);
        this.syncActiveCardFromScroll();
      }, INITIAL_SYNC_MS);

      onCleanup(() => {
        desktop?.removeEventListener('change', restoreMobile);
        resize?.disconnect();
        track.removeEventListener('scroll', this.onTrackScroll);
        track.removeEventListener('wheel', this.onTrackWheel);
        this.cardCenters = [];
        this.wheelLockedUntil = 0;
        clearTimeout(initialSync);
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
      });
    });
  }

  private onTrackWheel = (event: WheelEvent): void => {
    if (event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    const direction = event.deltaX > 0 ? 1 : -1;
    const modules = untracked(() => this.visibleModules());
    const index = untracked(() => this.activeIndex());
    if (!modules[index + direction]) return;

    event.preventDefault();
    const now = performance.now();
    if (now < this.wheelLockedUntil) return;
    this.wheelLockedUntil = now + WHEEL_COOLDOWN_MS;
    this.zone.run(() => this.scrollTrack(direction));
  };

  private onTrackScroll = (): void => {
    if (this.isProgrammaticScrolling) return;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      const track = this.track()?.nativeElement;
      if (!track) return;
      const closestIndex = this.nearestCardIndex(track);
      if (closestIndex === null) return;
      this.zone.run(() => this.commitScrollIndex(closestIndex));
    });
  };

  private nearestCardIndex(track: HTMLElement): number | null {
    if (!this.cardCenters.length) return null;
    const center = track.scrollLeft + track.clientWidth / 2;
    let closestIndex = 0;
    let minDistance = Infinity;
    this.cardCenters.forEach((cardCenter, index) => {
      const distance = Math.abs(center - cardCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    return closestIndex;
  }

  private commitScrollIndex(closestIndex: number): void {
    if (typeof matchMedia !== 'undefined' && matchMedia('(min-width: 1024px)').matches) return;
    const currentModules = untracked(() => this.visibleModules());
    if (closestIndex < currentModules.length && untracked(() => this.activeIndex()) !== closestIndex) {
      this.selectedModuleId.set(currentModules[closestIndex].id);
    }
  }

  private syncActiveCardFromScroll(): void {
    const track = this.track()?.nativeElement;
    if (!track) return;
    const closestIndex = this.nearestCardIndex(track);
    if (closestIndex === null) return;
    this.commitScrollIndex(closestIndex);
  }

  private centerActive(track: HTMLElement): void {
    const activeId = untracked(() => this.activeModuleId());
    const active = Array.from(track.querySelectorAll<HTMLElement>('.module-card')).find(card => card.dataset['moduleId'] === activeId);
    if (active) this.scrollTrackTo(track, active, 'instant');
  }

  moduleStatus(module: {id: string; percent: number}): {key: string; label: string} {
    if (!this.curriculum.canAccess(module.id)) return {key: 'locked', label: 'Upgrade to unlock'};
    if (module.percent >= 100) return {key: 'completed', label: 'Completed'};
    if (module.percent > 0) return {key: 'in-progress', label: 'In progress'};
    return {key: 'not-started', label: 'Not started'};
  }

  calculateOffset(percent: number): number {
    return this.circumference * (1 - percent / 100);
  }

  moduleNumber(id: string): string {
    return id.split('-')[1].padStart(2, '0');
  }

  unitNumber(id: string): string {
    return id.split('-')[1];
  }

  private get scrollBehavior(): ScrollBehavior {
    const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return reduced ? 'auto' : 'smooth';
  }

  selectModule(moduleId: string, event?: Event): void {
    const card = (event?.currentTarget as HTMLElement | null | undefined)
      ?? this.track()?.nativeElement.querySelector<HTMLElement>(`[data-module-id="${moduleId}"]`);
    this.isProgrammaticScrolling = true;
    clearTimeout(this.programmaticTimer);
    this.programmaticTimer = setTimeout(() => this.isProgrammaticScrolling = false, PROGRAMMATIC_SCROLL_MS);
    this.selectedModuleId.set(moduleId);
    const track = this.track()?.nativeElement;
    // Layout offsets ignore the cards' 3D transforms, which scrollIntoView would otherwise centre on.
    if (card && track) this.scrollTrackTo(track, card, this.scrollBehavior);
  }

  private scrollTrackTo(track: HTMLElement, card: HTMLElement, behavior: ScrollBehavior): void {
    if (typeof matchMedia !== 'undefined' && matchMedia('(min-width: 1024px)').matches) return;
    const left = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
    if (typeof track.scrollTo === 'function') track.scrollTo({left, behavior});
    else track.scrollLeft = left;
  }

  scrollTrack(direction: -1 | 1): void {
    const neighbour = this.visibleModules()[this.activeIndex() + direction];
    if (neighbour) this.selectModule(neighbour.id);
  }

  goToNextModule(): void {
    const next = this.visibleModules()[this.activeIndex() + 1];
    if (next) {
      this.selectModule(next.id);
      document.getElementById('unit-drawer')?.scrollIntoView({behavior: this.scrollBehavior, block: 'start'});
      return;
    }
    document.querySelector('.module-carousel-container')?.scrollIntoView({behavior: this.scrollBehavior, block: 'center'});
  }

  openReader(moduleId: string, unitId: string): void {
    // Locked modules go through the existing upgrade flow instead of the reader.
    if (!this.curriculum.canAccess(moduleId)) {
      this.curriculum.openUnit(moduleId, unitId);
      return;
    }
    this.openedUnit.set({
      moduleId: String(moduleId).trim(),
      unitId: String(unitId).trim(),
    });
  }

  setFilter(filter: 'all' | 'completed' | 'in-progress'): void {
    this.filterChange.emit(filter);
  }

  closeReader(): void {
    this.openedUnit.set(null);
  }
}
