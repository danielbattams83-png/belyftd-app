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

export interface CarouselVideo {
  src: string;
  poster: string;
  title: string;
  caption?: string;
  tag?: string;
  duration?: string;
  /** Player and card shape, e.g. "16/9". Defaults to the clip's own size. */
  aspect?: string;
  /** CSS object-position for the card crop, e.g. "50% 20%". */
  position?: string;
}

interface VideoCarouselElement extends HTMLElement {
  videos: CarouselVideo[];
}

/** Swipeable coverflow of short clips. The web element only runs in the browser, so it is loaded lazily. */
@Component({
  selector: 'app-video-carousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styleUrl: './video-carousel.css',
  template: `<video-carousel #carousel class="vc-theme-lyftd" [attr.label]="label()"></video-carousel>`,
  host: {class: 'block'},
})
export class VideoCarouselComponent {
  readonly videos = input.required<CarouselVideo[]>();
  readonly label = input('Lyft\u2019d videos');

  private readonly carousel = viewChild.required<ElementRef<VideoCarouselElement>>('carousel');
  private readonly ready = signal(false);

  constructor() {
    afterNextRender(async () => {
      await import('./video-carousel.element');
      this.ready.set(true);
    });

    effect(() => {
      if (!this.ready()) return;
      this.carousel().nativeElement.videos = this.videos();
    });
  }
}
