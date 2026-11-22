import {ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, untracked, viewChild} from '@angular/core';
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
  private scrolling = false;
  private scrollTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(onCleanup => {
      const track = this.track()?.nativeElement;
      const count = this.labels.length;
      if (!track) return;
      const sync = () => {
        if (this.scrolling) return;
        const cards = Array.from(track.querySelectorAll<HTMLElement>('.overview-card'));
        const center = track.scrollLeft + track.clientWidth / 2;
        let closest = 0;
        cards.forEach((card, index) => {
          if (Math.abs(card.offsetLeft + card.offsetWidth / 2 - center) < Math.abs(cards[closest].offsetLeft + cards[closest].offsetWidth / 2 - center)) closest = index;
        });
        this.activeIndex.set(closest);
      };
      const resize = () => this.select(Math.min(untracked(this.activeIndex), count - 1), false);
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
      observer?.observe(track);
      const initial = setTimeout(resize, 0);
      track.addEventListener('scroll', sync, {passive: true});
      track.addEventListener('wheel', this.onWheel, {passive: false});
      onCleanup(() => {
        clearTimeout(initial);
        clearTimeout(this.scrollTimer);
        observer?.disconnect();
        track.removeEventListener('scroll', sync);
        track.removeEventListener('wheel', this.onWheel);
        this.scrolling = false;
      });
    });
  }

  select(index: number, animate = true): void {
    if (index < 0 || index >= this.labels.length) return;
    this.activeIndex.set(index);
    const track = this.track()?.nativeElement;
    const card = track?.querySelectorAll<HTMLElement>('.overview-card')[index];
    if (!track || !card) return;
    const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scrolling = true;
    clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(() => this.scrolling = false, 420);
    const left = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
    if (typeof track.scrollTo === 'function') track.scrollTo({left, behavior: animate && !reduced ? 'smooth' : 'instant'});
    else track.scrollLeft = left;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    this.select(this.activeIndex() + (event.key === 'ArrowRight' ? 1 : -1));
  }

  openUnit(unit: NextUnreadUnit): void {
    this.curriculum.openUnit(unit.moduleId, unit.unitId);
  }

  private onWheel = (event: WheelEvent): void => {
    if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const next = this.activeIndex() + (event.deltaY > 0 ? 1 : -1);
    if (next < 0 || next >= this.labels.length) return;
    event.preventDefault();
    const now = performance.now();
    if (now < this.wheelLockedUntil) return;
    this.wheelLockedUntil = now + 420;
    this.select(next);
  };
}
