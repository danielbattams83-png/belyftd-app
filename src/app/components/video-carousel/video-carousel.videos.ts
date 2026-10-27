import type {CarouselVideo} from './video-carousel.component';

const BASE = '/videos/carousel';

/** Homepage carousel, in display order. Edit titles and captions here. */
export const HOME_CAROUSEL_VIDEOS: CarouselVideo[] = [
  {tag: 'Welcome', title: 'Start your day with hope', caption: 'A quiet moment of encouragement from Hannah.', duration: '0:45', src: `${BASE}/video-1.mp4`, poster: `${BASE}/video-1.jpg`, aspect: '16/9'},
  {tag: 'Encouragement', title: 'You are not behind', caption: 'Hannah on growing at your own pace.', duration: '0:50', src: `${BASE}/video-2.mp4`, poster: `${BASE}/video-2.jpg`, aspect: '16/9'},
  {tag: 'Mentor', title: 'Omari on showing up', caption: 'Small, steady choices that shape who you become.', duration: '1:40', src: `${BASE}/video-3.mp4`, poster: `${BASE}/video-3.jpg`, aspect: '9/16', position: '50% 25%'},
  {tag: 'Mentor', title: 'Steve on leading yourself', caption: 'Character first. Everything else follows.', duration: '0:40', src: `${BASE}/video-4.mp4`, poster: `${BASE}/video-4.jpg`, aspect: '13/18', position: '50% 25%'},
  {tag: 'Mentor', title: 'Sophie on resilience', caption: 'How to keep going when it gets hard.', duration: '1:24', src: `${BASE}/video-5.mp4`, poster: `${BASE}/video-5.jpg`, aspect: '16/9'},
  {tag: 'Mentor', title: 'Sophie on habits', caption: 'Building routines that actually stick.', duration: '1:34', src: `${BASE}/video-6.mp4`, poster: `${BASE}/video-6.jpg`, aspect: '16/9'},
];
