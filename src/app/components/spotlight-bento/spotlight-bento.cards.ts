import type {BentoCard} from './spotlight-bento.element';
import type {Mentor} from '../../models/app.models';

/** Dashboard highlights. Home is omitted because the user is already on it. */
export const DASHBOARD_BENTO_CARDS: BentoCard[] = [
  {
    tag: 'Courses',
    heading: 'Foundational Courses',
    image: '/assets/lyftd/courses.webp',
    alt: "Lyft'd Foundational Courses screen with module cards",
    text: '21 modules and 142 units of masterclasses for character, resilience and habits.',
    detail:
      'From Mindset: Reboot Your Thinking to Time & Discipline, Money, Finance & Stewardship, Leadership, Faith, and Digital Life & Social Media Safety. Upcoming sessions, weekly growth progress and your streak sit in one spot.',
    chips: ['21 modules', '142 units', 'Weekly growth', 'Streaks'],
    href: '/courses',
  },
  {
    tag: 'Life Lessons',
    heading: "Lyft'd Life Lessons",
    preview: 'life-lessons',
    alt: "Lyft'd Life Lessons preview with a lesson card",
    text: 'Short lessons you can read, and milestones you can track.',
    detail:
      "Open a module for its tips, or build a Lyft'd Life Lesson with steps that earn XP. Launch a personal portfolio, draft an essay, or build a 7-day morning routine.",
    chips: ['Lesson modules', 'Mentor tips', 'Earn XP', 'Milestones'],
    href: '/life-lessons',
  },
  {
    tag: 'Mentors',
    heading: 'Mentors',
    image: '/assets/lyftd/mentors.webp',
    alt: 'Mentor cards for Sophie and Hannah with Play lesson buttons',
    text: 'Course recordings from four mentors, in your language.',
    detail:
      'Sophie (English / Chinese), Omari (English / Swahili), Hannah and Steve (English). Pick a module, a lesson and a language, then hit play.',
    chips: ['4 mentors', 'English', 'Chinese', 'Swahili'],
    href: '/mentors',
  },
  {
    tag: 'Messages',
    heading: 'Daily Mentor Messages',
    image: '/assets/lyftd/mentors.webp',
    alt: 'Mentor portraits for the daily message',
    position: '50% 30%',
    text: 'A short message from a mentor to start the day.',
    detail:
      'Sophie, Omari, Hannah, and Steve record encouragement you can play in a minute. Open Mentors, pick a voice, and listen.',
    chips: ['Daily listen', '4 mentors', 'Short audio'],
    href: '/mentors',
  },
  {
    tag: 'Coming Soon',
    heading: "The Lyft'd System",
    text: 'The full Lyft’d path, gathered in one place.',
    detail: 'This is a preview. The Lyft’d System opens here when it is ready.',
    comingSoon: true,
  },
  {
    tag: 'Coming Soon',
    heading: 'The Increase Business System',
    text: 'A business-building path inside Lyft’d.',
    detail: 'This is a preview. The Increase Business System opens here when it is ready.',
    comingSoon: true,
  },
  {
    tag: 'Partners',
    heading: 'Partner With Us',
    image: '/assets/lyftd/partners.webp',
    alt: 'Impact Leader and Enterprise Sponsor partner plan cards',
    text: "Choose your access. Support mentorship. Grow your community's impact.",
    detail:
      'Monthly tiers in USD: Starter Partner $14.99, Community Catalyst $29.99, Impact Leader $49.99 and Enterprise Sponsor $69.99. Higher tiers unlock more modules, the full mentor video library and multilingual audio.',
    chips: ['4 tiers', 'From $14.99/mo', 'Partner directory', 'Redemption codes'],
    href: '/partners',
  },
];

const firstSentence = (text: string): string => {
  const match = text.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : text).trim();
};

/** One spotlight card per mentor, built from the live mentor data. */
export function mentorBentoCards(mentors: Mentor[]): BentoCard[] {
  return mentors.map((mentor) => {
    const text = firstSentence(mentor.bio);
    return {
      tag: mentor.languages.join(' / '),
      heading: mentor.name,
      image: mentor.avatar,
      alt: `Portrait of ${mentor.name}`,
      position: '50% 25%',
      text,
      // Skip the expanded paragraph when the bio is a single sentence, otherwise it repeats the summary line.
      detail: mentor.bio.trim() === text ? undefined : mentor.bio,
      chips: [...mentor.languages, ...(mentor.specialties ?? []).slice(0, 3)],
    };
  });
}
