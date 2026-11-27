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
  private pointerStartY = 0;
  private pointerId = -1;
  private pointerTracking = false;
  private pointerCaptured = false;
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
    const direction = wheelDirection(event);
    if (!direction || this.cards().length < 2) return;
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
    this.pointerStartY = event.clientY;
    this.pointerId = event.pointerId;
    this.pointerTracking = true;
    this.pointerCaptured = false;
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.pointerTracking || this.pointerCaptured || event.pointerId !== this.pointerId) return;
    const dx = event.clientX - this.pointerStartX;
    const dy = event.clientY - this.pointerStartY;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) && event.currentTarget instanceof HTMLElement) {
      event.currentTarget.setPointerCapture(event.pointerId);
      this.pointerCaptured = true;
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
    this.pointerCaptured = false;
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

function finePointer(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
}

/** Next card is 1. Coarse pointers ignore a vertical wheel so the page can scroll. */
function wheelDirection(event: WheelEvent): -1 | 1 | 0 {
  if (event.ctrlKey) return 0;
  const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
  if (!finePointer() && !horizontal) return 0;
  const delta = horizontal ? event.deltaX : event.deltaY;
  if (!delta) return 0;
  return delta > 0 ? 1 : -1;
}
