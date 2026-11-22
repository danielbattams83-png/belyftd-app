import {FirebaseService} from '../../services/firebase.service';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

export interface CarouselVideo {
  /** Playback URL. Empty until a `videoUrl` storage path is resolved. */
  src: string;
  /**
   * Firebase Storage path under a public folder such as `App_Videos/`,
   * or an absolute https CDN URL. The carousel resolves this to `src`.
   */
  videoUrl?: string;
  poster: string;
  title: string;
  caption?: string;
  tag?: string;
  duration?: string;
  /** Player and card shape, e.g. "16/9". Defaults to the clip's own size. */
  aspect?: string;
  /** CSS object-position for the card crop, e.g. "50% 20%". */
  position?: string;
  /** Dark placeholder card until a real clip is uploaded. */
  placeholder?: boolean;
  /** Small badge on a placeholder card. */
  badge?: string;
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
  template: `<video-carousel #carousel class="vc-theme-lyftd" [attr.label]="label()" [attr.start-index]="startIndex()"></video-carousel>`,
  host: {class: 'block'},
})
export class VideoCarouselComponent {
  readonly videos = input.required<CarouselVideo[]>();
  readonly label = input('Lyft\u2019d videos');
  /** Logical slide that is centered on first layout. Sandy is index 2. */
  readonly startIndex = input(0);

  private readonly carousel = viewChild.required<ElementRef<VideoCarouselElement>>('carousel');
  private readonly ready = signal(false);
  private readonly firebase = inject(FirebaseService);

  constructor() {
    afterNextRender(async () => {
      await import('./video-carousel.element');
      this.ready.set(true);
    });

    effect(() => {
      if (!this.ready()) return;
      const element = this.carousel().nativeElement;
      const videos = this.videos();
      const start = this.startIndex();
      element.setAttribute('start-index', String(start));
      void this.playbackVideos(videos).then(resolved => {
        if (this.videos() !== videos) return;
        element.videos = resolved;
      });
    });
  }

  /** Turn a Storage path or CDN `videoUrl` into the URL the player actually loads. */
  private async playbackVideos(videos: CarouselVideo[]): Promise<CarouselVideo[]> {
    return Promise.all(videos.map(async video => {
      const videoUrl = video.videoUrl?.trim();
      if (!videoUrl) return video;
      if (/^https?:\/\//i.test(videoUrl)) return {...video, src: videoUrl};
      const src = await this.firebase.getStorageDownloadUrl(videoUrl);
      return src ? {...video, src} : video;
    }));
  }
}
