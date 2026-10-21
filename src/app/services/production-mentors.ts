import {Mentor} from '../models/app.models';

// Verified against the production bucket and local mentor image folders on 2026-10-21.
export const PRODUCTION_MENTORS: Mentor[] = [
  {id: 'sophie', name: 'Sophie', languages: ['English', 'Chinese'],
    mediaPaths: ['course-content/module-5/unit-2/audio/hope-sophie--english.mp3', 'course-content/module-5/unit-2/audio/hope-sophie--chinese.mp3']},
  {id: 'omari', name: 'Omari', languages: ['English', 'Swahili'],
    mediaPaths: ['course-content/module-5/unit-2/audio/hope-omari--english.mp3', 'course-content/module-5/unit-2/audio/hope-omari--swahili.mp3']},
  {id: 'hannah', name: 'Hannah', languages: ['English'],
    mediaPaths: ['course-content/module-2/unit-1/audio/identity_theft-hannah.mp3']},
  {id: 'steve', name: 'Steve', languages: ['English'],
    mediaPaths: ['course-content/module-2/unit-1/audio/1-identity_theft-steve.mp3']},
].map(mentor => ({...mentor,
  avatar: `/mentors/${mentor.id}.png`,
  title: 'Lyftd course mentor', organization: "Lyft'd",
  bannerGradient: 'from-sky-600 to-indigo-800',
  specialties: ['Mentorship'], bio: `Listen to ${mentor.name}'s course recordings in ${mentor.languages.join(' or ')}.`,
  verified: true, recommendedFor: [],
}));

export function productionMentorForLabel(label: string): Mentor | undefined {
  return PRODUCTION_MENTORS.find(mentor => new RegExp(`^${mentor.name}(?:$|[ (]| - )`, 'i').test(label.trim()));
}
