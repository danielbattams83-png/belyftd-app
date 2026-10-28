import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
} from '@angular/core';
import type {BentoCard} from '../spotlight-bento/spotlight-bento.element';

/** Sticky stacking deck: cards pin under the app header as the page scrolls, each one tapping open in place. */
@Component({
  selector: 'app-explore-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './explore-stack.component.html',
  styleUrl: './explore-stack.component.css',
  host: {class: 'block'},
})
export class ExploreStackComponent {
  readonly cards = input.required<BentoCard[]>();
  readonly label = input('Highlights');

  readonly expanded = signal<number | null>(null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const header = document.querySelector<HTMLElement>('.app-header');
      let headerHeight = header ? Math.round(header.getBoundingClientRect().height) : 0;
      let collapseObserver: IntersectionObserver | null = null;

      const observeCards = () => {
        collapseObserver?.disconnect();
        collapseObserver = this.createCollapseObserver(headerHeight);
        this.host.nativeElement
          .querySelectorAll<HTMLElement>('.explore-card')
          .forEach((card) => collapseObserver?.observe(card));
      };
      observeCards();

      // Pin offsets and the collapse band follow the real header height, which changes with breakpoints and safe-area insets.
      let resizeObserver: ResizeObserver | null = null;
      if (header && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          const next = Math.round(header.getBoundingClientRect().height);
          this.host.nativeElement.style.setProperty('--es-header-h', `${next}px`);
          if (next !== headerHeight) {
            headerHeight = next;
            observeCards();
          }
        });
        this.host.nativeElement.style.setProperty('--es-header-h', `${headerHeight}px`);
        resizeObserver.observe(header);
      }

      destroyRef.onDestroy(() => {
        collapseObserver?.disconnect();
        resizeObserver?.disconnect();
      });
    });
  }

  /**
   * Sticky cards stay pinned on screen, so "scrolled past" means either a later card has slid up into the
   * top reading band (it's about to cover the open card) or the open card has left the top of the viewport.
   */
  private createCollapseObserver(headerHeight: number): IntersectionObserver | null {
    if (typeof IntersectionObserver === 'undefined') return null;

    return new IntersectionObserver(
      (entries) => {
        const open = this.expanded();
        if (open === null) return;

        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset['index']);
          const { top } = entry.boundingClientRect;
          const laterCardArriving = entry.isIntersecting && index > open && top >= headerHeight;
          const openCardScrolledAway = !entry.isIntersecting && index === open && top < headerHeight;

          if (laterCardArriving || openCardScrolledAway) {
            this.expanded.set(null);
            return;
          }
        }
      },
      {
        threshold: [0, 0.2],
        // The band is the top ~40% of the space under the header: entering it from below means "you've moved on".
        rootMargin: `-${headerHeight}px 0px -60% 0px`,
      },
    );
  }

  onCardClick(index: number): void {
    // Don't collapse a card while someone is selecting its text to copy.
    if (window.getSelection()?.toString()) return;
    this.toggle(index);
  }

  toggle(index: number): void {
    this.expanded.update((current) => (current === index ? null : index));
  }
}
