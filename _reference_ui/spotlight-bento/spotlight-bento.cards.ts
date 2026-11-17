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
    tag: 'Mentors',
    heading: 'Meet Your Mentors',
    image: '/assets/lyftd/mentors.webp',
    alt: 'Mentor cards for Sophie and Hannah with Play lesson buttons',
    text: 'Course recordings from four mentors, in your language.',
    detail:
      'Sophie (English / Chinese), Omari (English / Swahili), Hannah and Steve (English). Pick a module, a lesson and a language, then hit play.',
    chips: ['4 mentors', 'English', 'Chinese', 'Swahili'],
    href: '/mentors',
  },
  {
    tag: 'Quests',
    heading: 'Youth Growth Quests',
    image: '/assets/lyftd/quests.webp',
    alt: 'Youth Growth Quests screen with a Launch Personal Portfolio Web App quest',
    text: 'Turn big dreams into real-world milestones with structured guidance.',
    detail:
      'Every quest comes with mentor tips and steps that earn XP: launch a personal portfolio web app, draft scholarship and college essays, or build a 7-day mindful morning routine. Level up as your milestones fill in.',
    chips: ['Mentor tips', 'Earn XP', 'Levels', 'Milestones'],
    href: '/quests',
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
