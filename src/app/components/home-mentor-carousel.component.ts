import {ChangeDetectionStrategy, Component, effect, ElementRef, input, signal, untracked, viewChild} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import type {BentoCard} from './spotlight-bento/spotlight-bento.element';

const INITIAL_SYNC_MS = 120;
const PROGRAMMATIC_SCROLL_MS = 400;
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
  private rafId: number | null = null;
  private isProgrammaticScrolling = false;
  private programmaticTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(onCleanup => {
      const track = this.track()?.nativeElement;
      this.cards();
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
        clearTimeout(this.programmaticTimer);
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
      });
    });
  }

  private onTrackWheel = (event: WheelEvent): void => {
    if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const direction = event.deltaY > 0 ? 1 : -1;
    if (!this.cards()[this.activeIndex() + direction]) return;

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

    const total = untracked(() => this.cards().length);
    if (closestIndex < total && untracked(() => this.activeIndex()) !== closestIndex) {
      this.activeIndex.set(closestIndex);
    }
  }

  private centerActive(track: HTMLElement): void {
    const active = track.querySelectorAll<HTMLElement>('.module-card')[untracked(() => this.activeIndex())];
    if (active) this.scrollTrackTo(track, active, 'instant');
  }

  private get scrollBehavior(): ScrollBehavior {
    const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return reduced ? 'auto' : 'smooth';
  }

  selectCard(index: number, event?: Event): void {
    const card = (event?.currentTarget as HTMLElement | null | undefined)
      ?? this.track()?.nativeElement.querySelectorAll<HTMLElement>('.module-card')[index];
    this.isProgrammaticScrolling = true;
    clearTimeout(this.programmaticTimer);
    this.programmaticTimer = setTimeout(() => this.isProgrammaticScrolling = false, PROGRAMMATIC_SCROLL_MS);
    this.activeIndex.set(index);
    const track = this.track()?.nativeElement;
    if (card && track) this.scrollTrackTo(track, card, this.scrollBehavior);
  }

  private scrollTrackTo(track: HTMLElement, card: HTMLElement, behavior: ScrollBehavior): void {
    const left = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
    if (typeof track.scrollTo === 'function') track.scrollTo({left, behavior});
    else track.scrollLeft = left;
  }

  scrollTrack(direction: -1 | 1): void {
    const next = this.activeIndex() + direction;
    if (this.cards()[next]) this.selectCard(next);
  }
}
