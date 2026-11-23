import {ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CurriculumService, countCompletedLifeLessons, findNextUnreadUnit, NextUnreadUnit} from '../services/curriculum.service';

const LABELS = ['Daily Lyft', 'Continue Learning', 'Life Lessons Progress', 'Your Key'] as const;

@Component({
  selector: 'app-courses-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, RouterLink],
  templateUrl: './courses-overview.component.html',
  styleUrl: './courses-overview.component.scss',
})
export class CoursesOverviewComponent {
  private readonly curriculum = inject(CurriculumService);
  readonly labels = LABELS;
  readonly nextUnit = computed(() => findNextUnreadUnit(this.curriculum.modules(), this.curriculum.completedIds()));
  readonly completedLifeLessons = computed(() => countCompletedLifeLessons(this.curriculum.completedIds()));
  readonly lifeLessonsPercent = computed(() => Math.min(100, this.completedLifeLessons() * 10));
  readonly activeIndex = signal(0);
  readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private wheelLockedUntil = 0;
  private pointerStartX = 0;
  private pointerTracking = false;
  private swiped = false;

  constructor() {
    effect(onCleanup => {
      const track = this.track()?.nativeElement;
      if (!track) return;
      track.addEventListener('wheel', this.onWheel, {passive: false});
      onCleanup(() => {
        track.removeEventListener('wheel', this.onWheel);
        this.wheelLockedUntil = 0;
      });
    });
  }

  /** Shortest signed step around the four learning cards. */
  ringOffset(index: number): number {
    const total = this.labels.length;
    if (total < 2) return 0;
    const half = Math.floor(total / 2);
    return ((index - this.activeIndex() + total + half) % total) - half;
  }

  private wrap(index: number): number {
    const total = this.labels.length;
    return ((index % total) + total) % total;
  }

  select(index: number): void {
    this.activeIndex.set(this.wrap(index));
  }

  onCardClick(index: number): void {
    if (this.swiped) {
      this.swiped = false;
      return;
    }
    this.select(index);
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest('.track-nav, a, button')) return;
    this.swiped = false;
    this.pointerStartX = event.clientX;
    this.pointerTracking = true;
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.pointerTracking) return;
    this.pointerTracking = false;
    const delta = event.clientX - this.pointerStartX;
    if (delta > 48) {
      this.swiped = true;
      this.step(-1);
    } else if (delta < -48) {
      this.swiped = true;
      this.step(1);
    }
  }

  onPointerCancel(): void {
    this.pointerTracking = false;
  }

  step(direction: -1 | 1): void {
    this.select(this.activeIndex() + direction);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    this.step(event.key === 'ArrowRight' ? 1 : -1);
  }

  openUnit(unit: NextUnreadUnit): void {
    this.curriculum.openUnit(unit.moduleId, unit.unitId);
  }

  private onWheel = (event: WheelEvent): void => {
    if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const next = this.activeIndex() + (event.deltaY > 0 ? 1 : -1);
    event.preventDefault();
    const now = performance.now();
    if (now < this.wheelLockedUntil) return;
    this.wheelLockedUntil = now + 420;
    this.select(next);
  };
}
