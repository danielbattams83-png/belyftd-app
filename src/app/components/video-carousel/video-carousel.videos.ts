import type {CarouselVideo} from './video-carousel.component';

const BASE = '/videos/carousel';

/** Sandy is the third slide, so the coverflow opens with her in the center. */
export const HOME_CAROUSEL_START = 2;

/** Homepage carousel, in display order. Sandy stays the center video. */
export const HOME_CAROUSEL_VIDEOS: CarouselVideo[] = [
  {
    tag: 'Intro',
    title: 'Mentor Messages Intro',
    caption: 'A short introduction to mentor messages.',
    videoUrl: 'https://firebasestorage.googleapis.com/v0/b/belyft-d-app.firebasestorage.app/o/App_Videos%2Fmentor-messages.mp4?alt=media',
    src: 'https://firebasestorage.googleapis.com/v0/b/belyft-d-app.firebasestorage.app/o/App_Videos%2Fmentor-messages.mp4?alt=media',
    poster: `${BASE}/mentor-messages.jpg`,
    aspect: '9/16',
  },
  {
    tag: 'Intro',
    title: 'Mentor Intro',
    caption: 'Hannah, Sophie, Omari, and Steve welcome you.',
    videoUrl: 'https://firebasestorage.googleapis.com/v0/b/belyft-d-app.firebasestorage.app/o/App_Videos%2Fmentor-intro.mp4?alt=media',
    src: 'https://firebasestorage.googleapis.com/v0/b/belyft-d-app.firebasestorage.app/o/App_Videos%2Fmentor-intro.mp4?alt=media',
    poster: '/mentors/hannah.webp',
    aspect: '9/16',
    soundToggle: true,
  },
  {
    tag: 'Welcome',
    title: 'Sandy',
    caption: "Sandy welcomes you to Lyft'd.",
    duration: '0:35',
    videoUrl: 'https://firebasestorage.googleapis.com/v0/b/belyft-d-app.firebasestorage.app/o/App_Videos%2Fsandy-welcome.mp4?alt=media',
    src: 'https://firebasestorage.googleapis.com/v0/b/belyft-d-app.firebasestorage.app/o/App_Videos%2Fsandy-welcome.mp4?alt=media',
    poster: `${BASE}/sandy-welcome.jpg`,
    aspect: '9/16',
  },
  {
    tag: 'Intro',
    title: 'Course Intro',
    caption: 'Omari welcomes you to the courses.',
    duration: '0:25',
    videoUrl: 'https://firebasestorage.googleapis.com/v0/b/belyft-d-app.firebasestorage.app/o/App_Videos%2Fwelcome-to-lifted-courses-omari.mp4?alt=media',
    src: 'https://firebasestorage.googleapis.com/v0/b/belyft-d-app.firebasestorage.app/o/App_Videos%2Fwelcome-to-lifted-courses-omari.mp4?alt=media',
    poster: '/assets/mentors/welcome-to-lifted-courses-omari.jpg',
    aspect: '9/16',
  },
  {
    tag: 'Intro',
    title: "Lyft'd Life Lessons Intro",
    caption: 'Hannah introduces Lyft\'d Life Lessons.',
    duration: '0:25',
    videoUrl: 'https://firebasestorage.googleapis.com/v0/b/belyft-d-app.firebasestorage.app/o/App_Videos%2Flyftd-life-lessons-intro-hannah.mp4?alt=media',
    src: 'https://firebasestorage.googleapis.com/v0/b/belyft-d-app.firebasestorage.app/o/App_Videos%2Flyftd-life-lessons-intro-hannah.mp4?alt=media',
    poster: '/assets/mentors/lyftd-life-lessons-intro-hannah.jpg',
    aspect: '9/16',
  },
];
