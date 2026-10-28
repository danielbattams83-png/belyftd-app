import type {CarouselVideo} from './video-carousel.component';

const BASE = '/videos/carousel';

/** Homepage carousel, in display order. Edit titles and captions here. */
export const HOME_CAROUSEL_VIDEOS: CarouselVideo[] = [
  {tag: 'Hope', title: 'Hope, with Hannah', caption: 'A quiet moment of encouragement from Hannah.', duration: '0:45', src: `${BASE}/video-1.mp4`, poster: `${BASE}/video-1.jpg`, aspect: '9/16'},
  {tag: 'Hope', title: 'More hope, with Hannah', caption: 'Hannah on holding on to hope.', duration: '0:48', src: `${BASE}/video-2.mp4`, poster: `${BASE}/video-2.jpg`, aspect: '9/16'},
  {tag: 'Hope · Swahili', title: 'Hope, with Omari', caption: 'Omari shares a message of hope in Swahili.', duration: '1:40', src: `${BASE}/video-3.mp4`, poster: `${BASE}/video-3.jpg`, aspect: '9/16'},
  {tag: 'Hope · Chinese', title: 'Hope, with Sophie', caption: 'Sophie shares a message of hope in Chinese.', duration: '1:24', src: `${BASE}/video-4.mp4`, poster: `${BASE}/video-4.jpg`, aspect: '9/16'},
  {tag: 'Hope · English', title: 'Hope, with Sophie', caption: 'Sophie shares a message of hope in English.', duration: '1:35', src: `${BASE}/video-5.mp4`, poster: `${BASE}/video-5.jpg`, aspect: '9/16'},
  {tag: 'Don\u2019t give up', title: 'Don\u2019t give up, with Hannah', caption: 'Hannah on keeping going when it gets hard.', duration: '0:50', src: `${BASE}/video-6.mp4`, poster: `${BASE}/video-6.jpg`, aspect: '9/16'},
  {tag: 'Don\u2019t give up', title: 'Don\u2019t give up, with Steve', caption: 'Steve on pushing through.', duration: '0:40', src: `${BASE}/video-7.mp4`, poster: `${BASE}/video-7.jpg`, aspect: '9/16'},
];
