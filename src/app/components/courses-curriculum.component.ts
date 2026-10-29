import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, output, signal, untracked, viewChild} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {CurriculumService} from '../services/curriculum.service';
import {CourseUnitComponent} from './course-unit.component';

const RING_RADIUS = 17;
const INITIAL_SYNC_MS = 120;
const PROGRAMMATIC_SCROLL_MS = 400;
const WHEEL_COOLDOWN_MS = 420;

@Component({
  selector: 'app-courses-curriculum',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, CourseUnitComponent],
  templateUrl: './courses-curriculum.component.html',
  styleUrl: './courses-curriculum.component.scss',
})
export class CoursesCurriculumComponent {
  readonly curriculum = inject(CurriculumService);
  readonly filter = input<'all' | 'completed' | 'in-progress'>('all');
  readonly filterChange = output<'all' | 'completed' | 'in-progress'>();
  readonly circumference = 2 * Math.PI * RING_RADIUS;
  readonly track = viewChild<ElementRef<HTMLElement>>('track');

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

      track.addEventListener('scroll', this.onTrackScroll, {passive: true});
      track.addEventListener('wheel', this.onTrackWheel, {passive: false});
      const initialSync = setTimeout(() => {
        this.centerActive(track);
        this.syncActiveCardFromScroll();
      }, INITIAL_SYNC_MS);

      onCleanup(() => {
        track.removeEventListener('scroll', this.onTrackScroll);
        track.removeEventListener('wheel', this.onTrackWheel);
        this.wheelLockedUntil = 0;
        clearTimeout(initialSync);
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
      });
    });
  }

  private onTrackWheel = (event: WheelEvent): void => {
    // Preserve native horizontal trackpad scrolling and pinch-to-zoom.
    if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const direction = event.deltaY > 0 ? 1 : -1;
    if (!this.visibleModules()[this.activeIndex() + direction]) return;

    event.preventDefault();
    const now = performance.now();
    if (now < this.wheelLockedUntil) return;
    this.wheelLockedUntil = now + WHEEL_COOLDOWN_MS;
    this.scrollTrack(direction);
  };

  private onTrackScroll = (): void => {
    if (this.isProgrammaticScrolling) return;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.syncActiveCardFromScroll();
    });
  };

  private syncActiveCardFromScroll(): void {
    const track = this.track()?.nativeElement;
    if (!track) return;
    const cards = track.querySelectorAll<HTMLElement>('.module-card');
    if (!cards.length) return;

    const trackRect = track.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;

    let closestIndex = 0;
    let minDistance = Infinity;
    cards.forEach((card, i) => {
      const rect = card.getBoundingClientRect();
      const distance = Math.abs(trackCenter - (rect.left + rect.width / 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    });

    const currentModules = untracked(() => this.visibleModules());
    if (closestIndex < currentModules.length && untracked(() => this.activeIndex()) !== closestIndex) {
      this.selectedModuleId.set(currentModules[closestIndex].id);
    }
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
    const left = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
    if (typeof track.scrollTo === 'function') track.scrollTo({left, behavior});
    else track.scrollLeft = left;
  }

  scrollTrack(direction: -1 | 1): void {
    const neighbour = this.visibleModules()[this.activeIndex() + direction];
    if (neighbour) this.selectModule(neighbour.id);
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
