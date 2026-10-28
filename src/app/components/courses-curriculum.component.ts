import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, signal, untracked, viewChild} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {CurriculumService} from '../services/curriculum.service';

const RING_RADIUS = 17;

@Component({
  selector: 'app-courses-curriculum',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './courses-curriculum.component.html',
  styleUrl: './courses-curriculum.component.scss',
})
export class CoursesCurriculumComponent {
  readonly curriculum = inject(CurriculumService);
  readonly filter = input<'all' | 'completed' | 'in-progress'>('all');
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

  private observer?: IntersectionObserver;
  private readonly cardsAtCenter = new Set<string>();
  private scrollTargetId: string | null = null;
  private scrollTargetTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      clearTimeout(this.scrollTargetTimer);
    });

    effect(onCleanup => {
      const track = this.track()?.nativeElement;
      this.visibleModules();
      const activeId = untracked(() => this.activeModuleId());
      if (!track || !activeId || typeof requestAnimationFrame === 'undefined') return;
      const frame = requestAnimationFrame(() => this.centerAndObserve(track, activeId));
      onCleanup(() => cancelAnimationFrame(frame));
    });
  }

  /** Snaps the active card to the middle without animation, then starts watching which card sits there. */
  private centerAndObserve(track: HTMLElement, activeId: string): void {
    this.observer?.disconnect();
    this.cardsAtCenter.clear();

    const cards = Array.from(track.querySelectorAll<HTMLElement>('.module-card'));
    const active = cards.find(card => card.dataset['moduleId'] === activeId);
    if (active) this.scrollTrackTo(track, active, 'instant');

    if (typeof IntersectionObserver === 'undefined') return;
    // A near-zero-width band at the track's centre, so only the card sitting there reports as intersecting.
    this.observer = new IntersectionObserver(entries => this.onCenterChange(entries, track), {
      root: track,
      rootMargin: '0px -49.5% 0px -49.5%',
      threshold: 0,
    });
    cards.forEach(card => this.observer?.observe(card));
  }

  private onCenterChange(entries: IntersectionObserverEntry[], track: HTMLElement): void {
    for (const entry of entries) {
      const id = (entry.target as HTMLElement).dataset['moduleId'];
      if (!id) continue;
      if (entry.isIntersecting) this.cardsAtCenter.add(id);
      else this.cardsAtCenter.delete(id);
    }
    if (!this.cardsAtCenter.size) return;

    const centerId = this.cardsAtCenter.size === 1 ? [...this.cardsAtCenter][0] : this.closestToCenter(track);
    if (!centerId) return;

    // While a tap or arrow is gliding to its target, ignore the cards it passes over.
    if (this.scrollTargetId) {
      if (centerId !== this.scrollTargetId) return;
      this.scrollTargetId = null;
    }
    this.selectedModuleId.set(centerId);
  }

  private closestToCenter(track: HTMLElement): string | undefined {
    const trackRect = track.getBoundingClientRect();
    const middle = trackRect.left + trackRect.width / 2;
    let closest: {id: string; distance: number} | undefined;
    for (const card of track.querySelectorAll<HTMLElement>('.module-card')) {
      const id = card.dataset['moduleId'];
      if (!id || !this.cardsAtCenter.has(id)) continue;
      const rect = card.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - middle);
      if (!closest || distance < closest.distance) closest = {id, distance};
    }
    return closest?.id;
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
    if (moduleId !== this.activeModuleId()) {
      this.scrollTargetId = moduleId;
      clearTimeout(this.scrollTargetTimer);
      this.scrollTargetTimer = setTimeout(() => this.scrollTargetId = null, 1200);
    }
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
}
