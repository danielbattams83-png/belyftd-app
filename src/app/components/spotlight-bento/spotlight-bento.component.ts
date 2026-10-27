import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type {BentoCard, SpotlightBento} from './spotlight-bento.element';

export type {BentoCard} from './spotlight-bento.element';

/** Tap-to-spotlight bento grid. The web component only runs in the browser, so it is loaded lazily. */
@Component({
  selector: 'app-spotlight-bento',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styleUrl: './spotlight-bento.css',
  template: `<spotlight-bento #bento class="sb-theme-lyftd" role="group" [attr.aria-label]="label()"></spotlight-bento>`,
  host: {class: 'block'},
})
export class SpotlightBentoComponent {
  readonly cards = input.required<BentoCard[]>();
  readonly label = input('Highlights');

  private readonly bento = viewChild.required<ElementRef<SpotlightBento>>('bento');
  private readonly ready = signal(false);

  constructor() {
    afterNextRender(async () => {
      await import('./spotlight-bento.element');
      this.ready.set(true);
    });

    effect(() => {
      if (!this.ready()) return;
      this.bento().nativeElement.cards = this.cards();
    });
  }
}
