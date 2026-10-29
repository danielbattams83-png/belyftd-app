import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, signal, untracked, viewChild} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {CurriculumService} from '../services/curriculum.service';
import {CourseUnitComponent} from './course-unit.component';

const RING_RADIUS = 17;
// Matches the homepage carousel: a card counts as centred once 70% of it sits in a one-card-wide slot in the middle.
const CENTER_THRESHOLD = 0.7;
const SCROLL_SETTLE_MS = 120;

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

  private centerObserver?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private settleTimer?: ReturnType<typeof setTimeout>;
  private scrollTargetId: string | null = null;
  private scrollTargetTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.centerObserver?.disconnect();
      this.resizeObserver?.disconnect();
      clearTimeout(this.settleTimer);
      clearTimeout(this.scrollTargetTimer);
    });

    effect(onCleanup => {
      const track = this.track()?.nativeElement;
      this.visibleModules();
      if (!track || typeof requestAnimationFrame === 'undefined') return;

      const onScrollSettled = () => this.syncNearest(track);
      // scrollend is exact where supported; older Safari falls back to a short debounce on scroll.
      const hasScrollEnd = 'onscrollend' in window;
      const onScroll = () => {
        clearTimeout(this.settleTimer);
        this.settleTimer = setTimeout(onScrollSettled, SCROLL_SETTLE_MS);
      };
      if (hasScrollEnd) track.addEventListener('scrollend', onScrollSettled);
      else track.addEventListener('scroll', onScroll, {passive: true});

      const frame = requestAnimationFrame(() => this.watchTrack(track));
      onCleanup(() => {
        cancelAnimationFrame(frame);
        track.removeEventListener('scrollend', onScrollSettled);
        track.removeEventListener('scroll', onScroll);
        clearTimeout(this.settleTimer);
        this.centerObserver?.disconnect();
        this.resizeObserver?.disconnect();
      });
    });
  }

  /** Centres the active card once the track has a real width, then keeps it centred and observed across resizes. */
  private watchTrack(track: HTMLElement): void {
    this.resizeObserver?.disconnect();
    if (typeof ResizeObserver === 'undefined') {
      this.observeCenter(track);
      this.centerActive(track, 'instant');
      return;
    }
    let placed = false;
    this.resizeObserver = new ResizeObserver(() => {
      const card = track.querySelector<HTMLElement>('.module-card');
      if (!track.clientWidth || !card?.offsetWidth) return;
      this.observeCenter(track);
      if (!placed || !this.scrollTargetId) this.centerActive(track, 'instant');
      placed = true;
    });
    this.resizeObserver.observe(track);
  }

  private centerActive(track: HTMLElement, behavior: ScrollBehavior): void {
    const activeId = untracked(() => this.activeModuleId());
    const active = Array.from(track.querySelectorAll<HTMLElement>('.module-card')).find(card => card.dataset['moduleId'] === activeId);
    if (active) this.scrollTrackTo(track, active, behavior);
  }

  /** The root is shrunk to one card-width slot in the middle, so only the centred card can reach the threshold. */
  private observeCenter(track: HTMLElement): void {
    this.centerObserver?.disconnect();
    if (typeof IntersectionObserver === 'undefined') return;
    const cards = Array.from(track.querySelectorAll<HTMLElement>('.module-card'));
    const cardWidth = cards[0]?.offsetWidth;
    if (!cardWidth) return;
    const side = Math.max(0, (track.clientWidth - cardWidth) / 2);

    this.centerObserver = new IntersectionObserver(entries => {
      let best: IntersectionObserverEntry | undefined;
      for (const entry of entries) {
        if (entry.intersectionRatio >= CENTER_THRESHOLD && (!best || entry.intersectionRatio > best.intersectionRatio)) best = entry;
      }
      const id = (best?.target as HTMLElement | undefined)?.dataset['moduleId'];
      if (id) this.activate(id);
    }, {root: track, rootMargin: `0px ${-side}px 0px ${-side}px`, threshold: CENTER_THRESHOLD});
    cards.forEach(card => this.centerObserver?.observe(card));
  }

  /** Safety net for a fast fling that skipped past the observer threshold: read the card nearest the middle at rest. */
  private syncNearest(track: HTMLElement): void {
    const middle = track.scrollLeft + track.clientWidth / 2;
    let nearest: {id: string; distance: number} | undefined;
    for (const card of track.querySelectorAll<HTMLElement>('.module-card')) {
      const id = card.dataset['moduleId'];
      if (!id) continue;
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - middle);
      if (!nearest || distance < nearest.distance) nearest = {id, distance};
    }
    if (nearest) this.activate(nearest.id);
  }

  private activate(moduleId: string): void {
    // While a tap or arrow is gliding to its target, ignore the cards it passes over.
    if (this.scrollTargetId) {
      if (moduleId !== this.scrollTargetId) return;
      this.scrollTargetId = null;
    }
    if (moduleId !== this.activeModuleId()) this.selectedModuleId.set(moduleId);
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

  openReader(moduleId: string, unitId: string): void {
    // Locked modules go through the existing upgrade flow instead of the reader.
    if (!this.curriculum.canAccess(moduleId)) {
      this.curriculum.openUnit(moduleId, unitId);
      return;
    }
    this.openedUnit.set({moduleId, unitId});
  }

  closeReader(): void {
    this.openedUnit.set(null);
  }
}
