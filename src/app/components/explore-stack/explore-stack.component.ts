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

    // Pin offsets follow the real header height, which changes with breakpoints and safe-area insets.
    afterNextRender(() => {
      const header = document.querySelector<HTMLElement>('.app-header');
      if (!header || typeof ResizeObserver === 'undefined') return;
      const sync = () =>
        this.host.nativeElement.style.setProperty('--es-header-h', `${Math.round(header.getBoundingClientRect().height)}px`);
      sync();
      const observer = new ResizeObserver(sync);
      observer.observe(header);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  toggle(index: number): void {
    this.expanded.update((current) => (current === index ? null : index));
  }
}
