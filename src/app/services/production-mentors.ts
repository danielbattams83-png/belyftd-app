import {Mentor} from '../models/app.models';

interface MentorSeed {
  id: string;
  name: string;
  region: string;
  languages: string[];
  title: string;
  bio: string;
  mediaPaths?: string[];
  avatar?: string;
}

const REGIONAL_MENTORS: MentorSeed[] = [
  {id: 'amara', name: 'Amara', region: 'Africa', languages: ['English', 'Swahili', 'French'], title: 'Executive & Community Wisdom',
    bio: 'Guides learners through leadership, resilience, and purposeful personal growth with grounded, real-world perspective.'},
  {id: 'budi', name: 'Budi', region: 'Indonesia', languages: ['Indonesian', 'English'], title: 'Grounded Leadership',
    bio: 'Focuses on steady daily discipline, family values, and building a resilient long-term mindset.'},
  {id: 'tari', name: 'Tari', region: 'Indonesia', languages: ['Indonesian', 'English'], title: 'Creative & Peer Catalyst',
    bio: 'Helps young adults build everyday confidence, healthy routines, and practical momentum.'},
  {id: 'kenji', name: 'Kenji', region: 'Japan', languages: ['Japanese', 'English'], title: 'Mastery & Focus',
    bio: 'Brings calm clarity, continuous improvement (Kaizen), and structured focus to every lesson.'},
  {id: 'aoi', name: 'Aoi', region: 'Japan', languages: ['Japanese', 'English'], title: 'Mindset & Wellbeing',
    bio: 'Supports emotional balance, self-compassion, and gentle, consistent progress.'},
  {id: 'vikram', name: 'Vikram', region: 'India', languages: ['Hindi', 'English'], title: 'Career & Life Strategist',
    bio: 'Equips learners with practical problem-solving, adaptability, and clear career direction.'},
  {id: 'liam', name: 'Liam', region: 'China', languages: ['Mandarin', 'English'], title: 'Youth & Student Catalyst',
    bio: 'Helps students and young professionals overcome self-doubt and build early-career momentum.'},
  {id: 'mateo', name: 'Mateo', region: 'Mediterranean', languages: ['Spanish', 'Italian', 'Greek', 'English'], title: 'Communication & Presence',
    bio: 'Coaches authentic communication, social confidence, and strong personal presence.'},
  {id: 'elena', name: 'Elena', region: 'Mediterranean', languages: ['Spanish', 'Italian', 'Greek', 'English'], title: 'Empathy & Connection',
    bio: 'Focuses on emotional intelligence, healthy boundaries, and meaningful relationships.'},
];

// Verified against the production bucket and local mentor image folders on 2026-10-21.
const CORE_MENTORS: MentorSeed[] = [
  {id: 'sophie', name: 'Sophie', region: 'Australia', languages: ['English', 'Chinese'], title: 'Bilingual Resilience Mentor',
    bio: 'Delivers core curriculum modules on building resilience, hope, and navigating life transitions.',
    mediaPaths: ['course-content/module-5/unit-2/audio/hope-sophie--english.mp3', 'course-content/module-5/unit-2/audio/hope-sophie--chinese.mp3'],
    avatar: '/mentors/sophie.webp'},
  {id: 'omari', name: 'Omari', region: 'Global', languages: ['English', 'Swahili'], title: 'Core Curriculum Mentor',
    bio: 'Supports foundational courses and multi-language learner engagement.',
    mediaPaths: ['course-content/module-5/unit-2/audio/hope-omari--english.mp3', 'course-content/module-5/unit-2/audio/hope-omari--swahili.mp3'],
    avatar: '/mentors/omari.webp'},
  {id: 'hannah', name: 'Hannah', region: 'Australia', languages: ['English'], title: 'Core Curriculum Guide',
    bio: 'Foundational course recordings focusing on self-discovery, identity, and daily personal growth habits.',
    mediaPaths: ['course-content/module-2/unit-1/audio/identity_theft-hannah.mp3'],
    avatar: '/mentors/hannah.webp'},
  {id: 'steve', name: 'Steve', region: 'Global', languages: ['English'], title: 'Core Curriculum Mentor',
    bio: 'Guides learners through foundational mindset and personal development units.',
    mediaPaths: ['course-content/module-2/unit-1/audio/1-identity_theft-steve.mp3'],
    avatar: '/mentors/steve.webp'},
];

const toMentor = (mentor: MentorSeed): Mentor => ({
  ...mentor,
  mediaPaths: mentor.mediaPaths ?? [],
  avatar: mentor.avatar ?? `/assets/mentors/${mentor.id}.webp`,
  organization: "Lyft'd",
  bannerGradient: 'from-sky-600 to-indigo-800',
  specialties: ['Mentorship'],
  verified: true,
  recommendedFor: [],
});

export const PRODUCTION_MENTORS: Mentor[] = [...CORE_MENTORS, ...REGIONAL_MENTORS].map(toMentor);

export function productionMentorForLabel(label: string): Mentor | undefined {
  return PRODUCTION_MENTORS.find(mentor => new RegExp(`^${mentor.name}(?:$|[ (]| - )`, 'i').test(label.trim()));
}
