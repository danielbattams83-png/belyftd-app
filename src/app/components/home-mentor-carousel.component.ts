import {ChangeDetectionStrategy, Component, effect, ElementRef, input, signal, viewChild} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import type {BentoCard} from './spotlight-bento/spotlight-bento.element';

const WHEEL_COOLDOWN_MS = 420;

@Component({
  selector: 'app-home-mentor-carousel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './home-mentor-carousel.component.html',
  styleUrl: './home-mentor-carousel.component.scss',
})
export class HomeMentorCarouselComponent {
  readonly cards = input<BentoCard[]>([]);
  readonly activeIndex = signal(0);
  readonly track = viewChild<ElementRef<HTMLElement>>('track');

  private wheelLockedUntil = 0;
  private pointerStartX = 0;
  private pointerTracking = false;
  private swiped = false;

  constructor() {
    effect(onCleanup => {
      const track = this.track()?.nativeElement;
      this.cards();
      if (!track) return;

      track.addEventListener('wheel', this.onTrackWheel, {passive: false});

      onCleanup(() => {
        track.removeEventListener('wheel', this.onTrackWheel);
        this.wheelLockedUntil = 0;
      });
    });
  }

  /** Shortest signed step around the roster, same ring as the video stage. */
  ringOffset(index: number): number {
    const total = this.cards().length;
    if (total < 2) return 0;
    const half = Math.floor(total / 2);
    return ((index - this.activeIndex() + total + half) % total) - half;
  }

  private onTrackWheel = (event: WheelEvent): void => {
    if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    if (this.cards().length < 2) return;
    const direction: -1 | 1 = event.deltaY > 0 ? 1 : -1;

    event.preventDefault();
    const now = performance.now();
    if (now < this.wheelLockedUntil) return;
    this.wheelLockedUntil = now + WHEEL_COOLDOWN_MS;
    this.scrollTrack(direction);
  };

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest('.track-nav')) return;
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
      this.scrollTrack(-1);
    } else if (delta < -48) {
      this.swiped = true;
      this.scrollTrack(1);
    }
  }

  onPointerCancel(): void {
    this.pointerTracking = false;
  }

  selectCard(index: number): void {
    if (this.swiped) {
      this.swiped = false;
      return;
    }
    const total = this.cards().length;
    if (!total) return;
    this.activeIndex.set((index + total) % total);
  }

  scrollTrack(direction: -1 | 1): void {
    const total = this.cards().length;
    if (!total) return;
    this.activeIndex.set((this.activeIndex() + direction + total) % total);
  }
}
