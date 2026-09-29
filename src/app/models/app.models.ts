export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  country?: string;
  ageBracket?: string;
  preferredLanguage?: string;
  selectedMentorIds?: string[];
  pronouns: string;
  gradeOrAge: string;
  avatar: string;
  focusAreas: string[];
  streakDays: number;
  totalLyftsReceived: number;
  totalLyftsSent: number;
  theme: 'dark' | 'light';
  highContrast: boolean;
  fontSize: 'normal' | 'large';
  role: 'mentee' | 'mentor';
  dailyGoalProgress: number;
}

export interface AudioTrack {
  id: string;
  title: string;
  speaker: string;
  speakerRole: string;
  speakerAvatar: string;
  category: 'Mindset' | 'Confidence' | 'Career & Goals' | 'Overcoming Anxiety' | 'Leadership' | 'Wellness';
  duration: string;
  durationSec: number;
  audioUrl?: string;
  transcript: string;
  moodTags: string[];
  likes: number;
  isFavorite: boolean;
  ambientTone?: 'lofi-warm' | 'energizing' | 'calm-piano' | 'ambient-synth';
}

export interface Mentor {
  id: string;
  name: string;
  preferredNickname?: string;
  title: string;
  organization: string;
  avatar: string;
  bannerGradient: string;
  specialties: string[];
  lifeExperienceTags?: string[];
  ageBrackets?: string[];
  bio: string;
  rating: number;
  menteesCount: number;
  quote: string;
  availableNext: string;
  verified: boolean;
  recommendedFor: string[];
  voiceIntroPrompt: string;
}

export interface GoalStep {
  id: string;
  title: string;
  completed: boolean;
  xp: number;
}

export interface GoalQuest {
  id: string;
  title: string;
  category: 'Academic' | 'Wellness' | 'Career' | 'Life Skills' | 'Creative';
  deadline: string;
  steps: GoalStep[];
  mentorId?: string;
  mentorName?: string;
  notes?: string;
  status: 'in-progress' | 'completed';
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorGrade: string;
  authorAvatar: string;
  type: 'win' | 'shoutout' | 'gratitude' | 'advice';
  content: string;
  timestamp: string;
  lyftsCount: number;
  isLyfted: boolean;
  tags: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'mentor' | 'coach-spark';
  senderName: string;
  text: string;
  timestamp: string;
  isAudio?: boolean;
  audioDuration?: string;
  actionPrompt?: string;
}

export interface VoiceJournal {
  id: string;
  title: string;
  date: string;
  durationSec: number;
  audioBlobUrl?: string;
  prompt: string;
  mood: '🔥 Hyped' | '✨ Inspired' | '🌿 Peaceful' | '🌧️ Challenging' | '⚡ Focused';
}

export interface Course {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  textContent: string;
  estimatedTime: string;
  isCompleted: boolean;
}
