import {AudioTrack} from '../models/app.models';
import {parseMentorLabel} from './course-assets';
import {productionMentorForLabel} from './production-mentors';

// Verified Storage inventory: docs/audio-asset-audit.json. Paths are metadata,
// never public playback URLs; playback still requests a tier-checked signed URL.
const recordings = [
  {
    "path": "course-content/module-2/unit-1/audio/1-identity_theft-steve.mp3",
    "label": "Steve",
    "title": "Identity Theft"
  },
  {
    "path": "course-content/module-2/unit-1/audio/identity_theft-hannah.mp3",
    "label": "Hannah",
    "title": "Identity Theft"
  },
  {
    "path": "course-content/module-2/unit-2/audio/2.-xerox-dont-be-a-copy-steve.mp3",
    "label": "Steve",
    "title": "Xerox: Don't Be a Copy"
  },
  {
    "path": "course-content/module-2/unit-2/audio/xerox-dont-be-a-copy-hannah.mp3",
    "label": "Hannah",
    "title": "Xerox: Don't Be a Copy"
  },
  {
    "path": "course-content/module-2/unit-3/audio/3-hands-and-feet-steve.mp3",
    "label": "Steve",
    "title": "Hands and Feet"
  },
  {
    "path": "course-content/module-2/unit-3/audio/hands-and-feet-hannah.mp3",
    "label": "Hannah",
    "title": "Hands and Feet"
  },
  {
    "path": "course-content/module-2/unit-4/audio/4-gifts-steve.mp3",
    "label": "Steve",
    "title": "Gifts"
  },
  {
    "path": "course-content/module-2/unit-4/audio/gifts-hannah.mp3",
    "label": "Hannah",
    "title": "Gifts"
  },
  {
    "path": "course-content/module-2/unit-5/audio/5-awareness-steve.mp3",
    "label": "Steve",
    "title": "Awareness"
  },
  {
    "path": "course-content/module-2/unit-5/audio/awareness-hannah.mp3",
    "label": "Hannah",
    "title": "Awareness"
  },
  {
    "path": "course-content/module-5/unit-2/audio/hope-omari--swahili.mp3",
    "label": "Omari (swahili)",
    "title": "Hope"
  },
  {
    "path": "course-content/module-5/unit-2/audio/hope-sophie--english.mp3",
    "label": "Sophie (english)",
    "title": "Hope"
  },
  {
    "path": "course-content/module-5/unit-2/audio/hope-omari--english.mp3",
    "label": "Omari (english)",
    "title": "Hope"
  },
  {
    "path": "course-content/module-5/unit-2/audio/hope---hannah.mp3",
    "label": "Hannah",
    "title": "Hope"
  },
  {
    "path": "course-content/module-5/unit-2/audio/hope-sophie--chinese.mp3",
    "label": "Sophie (chinese)",
    "title": "Hope"
  }
];

export const VERIFIED_MENTOR_RECORDINGS: AudioTrack[] = recordings.map(recording => {
  const {mentorName, language} = parseMentorLabel(recording.label);
  return {
    id: recording.path, audioUrl: recording.path, title: recording.title,
    speaker: `${mentorName} - ${language}`, mentorName, language,
    speakerRole: 'Course mentor', speakerAvatar: productionMentorForLabel(recording.label)?.avatar || '/logo.png',
    category: 'Mindset', duration: 'Listen', durationSec: 0, transcript: '',
    moodTags: [], likes: 0, isFavorite: false,
  };
});
