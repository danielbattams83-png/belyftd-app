import {Injectable, inject, signal} from '@angular/core';
import {UserProfile, AudioTrack, Mentor, GoalQuest, CommunityPost, ChatMessage, VoiceJournal, Course} from '../models/app.models';
import {FirebaseService} from './firebase.service';

@Injectable({
  providedIn: 'root',
})
export class MentorshipDataService {
  private readonly firebaseService = inject(FirebaseService);

  // Current Youth User State
  readonly userProfile = signal<UserProfile>({
    id: 'user-youth-1',
    name: 'Jordan Rivers',
    pronouns: 'they/them',
    gradeOrAge: '11th Grade • Age 17',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
    focusAreas: ['Coding & Tech', 'College Prep', 'Confidence & Speaking', 'Mindset'],
    streakDays: 7,
    totalLyftsReceived: 48,
    totalLyftsSent: 35,
    theme: 'dark',
    highContrast: false,
    fontSize: 'normal',
    role: 'mentee',
    dailyGoalProgress: 65,
  });

  constructor() {
    // If FirebaseService loads a registered profile from localStorage or Firestore, sync name & details
    const currentFbProfile = this.firebaseService.userProfile();
    if (currentFbProfile && this.firebaseService.hasRegisteredUser()) {
      this.userProfile.update(p => ({
        ...p,
        name: currentFbProfile.displayName || p.name,
        email: currentFbProfile.email || p.email,
        phone: currentFbProfile.phoneNumber || p.phone,
        country: currentFbProfile.country || 'United States'
      }));
    }
    this._syncInitialCourseCompletions();
  }

  // Foundational Courses (10 Modules)
  readonly courses = signal<Course[]>([
    {
      id: 'behavioral-accountability',
      title: 'Behavioral Accountability',
      description: 'True power begins the moment you stop blaming circumstances and start owning your choices. This course teaches youth how to recognize personal agency in school, relationships, and digital spaces. You will master practical methods to turn setbacks into growth through active ownership.',
      audioUrl: 'https://assets.belyftd.org/audio/courses/behavioral-accountability.mp3',
      textContent: `# Behavioral Accountability: Owning Your Path\n\n> "Accountability is the bridge between intention and real transformation."\n\n## Why Accountability Matters\nWhen things don't go according to plan, human instinct often looks outward for someone or something to blame. However, when you give away credit for your mistakes, you also give away your power to fix them. **Behavioral accountability** means recognizing that while you cannot control every situation, you hold 100% ownership over your response.\n\n### The O.W.N. Framework\n1. **Observe Without Judgment**: Notice what happened without instantly making excuses.\n2. **Weigh Your Choices**: Ask yourself, *“What part of this outcome did my choices influence?”*\n3. **Navigate the Next Step**: Focus all your energy on corrective action instead of defensive explanation.\n\n---\n\n### Daily Action Prompt\n- **Reflection**: Think of a situation this past week that did not go well. Identify one choice you made that contributed to the result.\n- **Micro-Commitment**: Write down the exact phrase you will use next time you make a mistake: *"I own that mistake, and here is how I will make it right."*`,
      estimatedTime: '6 mins',
      isCompleted: false
    },
    {
      id: 'changing-habits',
      title: 'Changing Habits',
      description: 'Our daily routines quietly construct the person we become tomorrow. In this lesson, you will discover the science of the habit loop and how micro-adjustments lead to compounding self-confidence. Learn how to replace draining behavioral patterns with empowering rituals.',
      audioUrl: 'https://assets.belyftd.org/audio/courses/changing-habits.mp3',
      textContent: `# Changing Habits: The Architecture of Daily Wins\n\n> "You do not rise to the level of your goals; you fall to the level of your systems."\n\n## The Science of the Habit Loop\nEvery single habit—from checking your phone first thing in the morning to studying consistently—runs on a three-part neural cycle:\n\n\`\`\`text\n[ CUE ] ──────> [ ROUTINE ] ──────> [ REWARD ]\n(Trigger)       (Action taken)      (Dopamine / relief)\n\`\`\`\n\n### The Golden Rule of Habit Transformation\nDo not try to eliminate the cue; change the **routine** that follows it to receive a healthier reward.\n\n### 3 Steps to Build Atomic Habits\n- **Habit Stacking**: Attach a new habit to an established one (e.g., *“After I pack my school backpack, I will read 5 pages of my book”*).\n- **Environment Design**: Make good choices frictionless (place your workout shoes or notebook where you see them first).\n- **The Two-Minute Rule**: Scale new habits down so they take less than two minutes to begin.\n\n---\n\n### Quick Challenge\nPick one negative habit you want to shift. Identify its primary **Cue** and choose a substitute **Action** you will practice today.`,
      estimatedTime: '7 mins',
      isCompleted: true
    },
    {
      id: 'commitment-the-power-of-stickability',
      title: 'Commitment: The Power of Stickability',
      description: 'Starting a new journey is easy, but staying the course when enthusiasm fades is what separates dreamers from achievers. This module dives into the mindset of stickability and grit. You will build stamina to stay loyal to what you said you would do long after the mood of saying it has left.',
      audioUrl: 'https://assets.belyftd.org/audio/courses/stickability-commitment.mp3',
      textContent: `# Commitment: The Power of Stickability\n\n> "Stickability is the quiet refusal to let temporary discomfort dictate permanent defeat."\n\n## What Is Stickability?\nMotivation is like weather—it changes constantly. Some days you will wake up energized, and other days you will feel completely uninspired. **Stickability** is your ability to maintain commitment regardless of your emotional state.\n\n### The 3 Enemies of Commitment\n1. **The 'Dip'**: The frustrating middle phase when initial excitement fades and results are not yet visible.\n2. **Comparison Paralysis**: Looking at someone else's highlight reel and feeling behind.\n3. **All-or-Nothing Thinking**: Giving up entirely because you missed one session or milestone.\n\n### Building Your Stickability Muscle\n- **Lower the Bar, Don't Stop**: On low-energy days, do the minimum viable rep rather than skipping altogether.\n- **Anchor to Your 'Why'**: Clarify who benefits when you keep your word—your family, your future self, your community.\n- **Accountability Partnerships**: Share your commitment with a trusted mentor or peer on Be Lyft'd.\n\n---\n\n### Reflection Question\n*What is one goal you previously abandoned because it became difficult? What is one reason to revive it today?*`,
      estimatedTime: '5 mins',
      isCompleted: false
    },
    {
      id: 'contribution',
      title: 'Contribution',
      description: 'True leadership and self-worth grow fastest when we lift others up along our journey. This course explores how small acts of service, peer encouragement, and community involvement create lasting personal fulfillment. Learn how to leverage your unique strengths to be a positive catalyst in your world.',
      audioUrl: 'https://assets.belyftd.org/audio/courses/contribution-leadership.mp3',
      textContent: `# Contribution: The Multiplier of Purpose\n\n> "We make a living by what we get, but we make a life by what we give."\n\n## Shifting From Consumption to Contribution\nWhen we only focus on what we want to *get*—grades, followers, accolades—life feels heavy and competitive. When we shift our focus to what we can *give*, our perspective expands and confidence follows naturally.\n\n### Everyday Ways Youth Can Contribute\n- **Lift Up a Peer**: Send an unexpected encouragement note or voice shoutout on Be Lyft'd.\n- **Share Knowledge**: Help a classmate understand a difficult homework concept without judgment.\n- **Active Listening**: Give your full attention to a friend or family member who needs a safe sounding board.\n- **Community Care**: Organize a neighborhood clean-up, food drive, or youth study club.\n\n---\n\n### The Contribution Exercise\n1. Identify one person in your circle who has been working hard or feeling overwhelmed.\n2. Deliver a genuine 30-second Lyft (praise or assistance) before the day ends.`,
      estimatedTime: '5 mins',
      isCompleted: false
    },
    {
      id: 'dont-give-up',
      title: "Don't Give Up",
      description: 'Every champion encounters dark valleys where throwing in the towel feels like the easiest option. This course is an injection of perseverance, showing you how to reframe adversity as mental conditioning. You will develop the resilience needed to stand back up one more time than you fall.',
      audioUrl: 'https://assets.belyftd.org/audio/courses/dont-give-up.mp3',
      textContent: `# Don't Give Up: Reframing Failure as Fuel\n\n> "Fall seven times, stand up eight." — Proverb\n\n## The Truth About the Plateau\nWhen you are working toward something meaningful—a sport, coding, learning an instrument, or turning your grades around—progress is rarely a straight upward line. You will inevitably hit plateaus and obstacles that tempt you to quit.\n\n### 3 Mindset Shifts for Tough Days\n1. **Change the Verb**: Replace *"I failed"* with *"I gathered data on what doesn't work yet."*\n2. **Remember the Compound Effect**: Invisible progress is still progress; bamboo shoots grow underground for years before exploding upward.\n3. **Zoom Out**: Ask yourself: *“Will this challenge matter in 5 years?”* If not, don't give it more than 5 minutes of panic.\n\n---\n\n### The Resilience Checklist\n- [ ] Take three deep belly breaths to calm your nervous system.\n- [ ] Talk to yourself like you would speak to a friend who is struggling.\n- [ ] Focus on taking just **one micro-step** forward today.`,
      estimatedTime: '6 mins',
      isCompleted: false
    },
    {
      id: 'emotional-intelligence',
      title: 'Emotional Intelligence',
      description: 'Understanding your emotional triggers gives you an unbeatable superpower in school, sports, and life. This course breaks down self-awareness, active empathy, and stress regulation into actionable daily tools. Discover how to respond with calm clarity rather than reacting out of impulse.',
      audioUrl: 'https://assets.belyftd.org/audio/courses/emotional-intelligence.mp3',
      textContent: `# Emotional Intelligence (EQ): Mastering Your Internal Compass\n\n> "Between stimulus and response there is a space. In that space is our power to choose our response." — Viktor Frankl\n\n## The 4 Pillars of EQ\nEmotional intelligence is not about suppressing feelings—it is about understanding them so they guide you rather than hijack you.\n\n### 1. Self-Awareness\nNaming the emotion before it controls you. Is it frustration, anxiety, hunger, or exhaustion?\n\n### 2. Self-Management\nCreating a pause between an emotional trigger and your physical response.\n- **The 5-Second Pause**: Inhale for 4 seconds, hold for 2, exhale for 6 before typing back or replying angrily.\n\n### 3. Social Awareness (Empathy)\nTuning into body language, vocal tone, and the unspoken needs of peers and mentors.\n\n### 4. Relationship Leadership\nResolving disagreements with respect and expressing your needs without aggression.\n\n---\n\n### Reflection Exercise\nNext time you feel a surge of frustration, write down:\n- What triggered it?\n- What physical sensation did I feel in my body?\n- What is the most constructive response I can choose right now?`,
      estimatedTime: '8 mins',
      isCompleted: false
    },
    {
      id: 'goal-setting',
      title: 'Goal Setting',
      description: 'A goal without a concrete structure is just a daydream waiting to evaporate. In this hands-on course, you will learn the S.M.A.R.T. goal framework and reverse-engineering techniques used by elite leaders. Turn your biggest ambitions into manageable weekly milestones.',
      audioUrl: 'https://assets.belyftd.org/audio/courses/goal-setting-framework.mp3',
      textContent: `# Goal Setting: Engineering Your Dreams Into Reality\n\n> "A dream written down with a date becomes a goal. A goal broken down into steps becomes a plan."\n\n## Why Vague Goals Fail\nSaying *"I want to do better in math"* or *"I want to get fit"* rarely works because your brain needs clear coordinates. Clear targets generate targeted effort.\n\n### The S.M.A.R.T.+ Execution Model\n- **Specific**: Exactly what do you want to accomplish?\n- **Measurable**: How will you know when you've reached it? (numbers, test scores, reps)\n- **Achievable**: Is it realistic given your current season and resources?\n- **Relevant**: Does this align with your personal vision and values?\n- **Time-Bound**: What is the hard deadline?\n\n### Reverse Engineering: The 30-Day Milestone Sprint\n\`\`\`text\n[ 90-Day Vision Target ]\n       │\n       ▼\n[ 30-Day Critical Checkpoint ]\n       │\n       ▼\n[ Weekly Must-Win Battles (3 Steps) ]\n       │\n       ▼\n[ Today's 1 Non-Negotiable Action ]\n\`\`\`\n\n---\n\n### Hands-On Quest\nDraft one S.M.A.R.T. goal right now and add it to your **Quests** tab in Be Lyft'd!`,
      estimatedTime: '6 mins',
      isCompleted: false
    },
    {
      id: 'integrity-the-cornerstone-of-character',
      title: 'Integrity: The Cornerstone of Character',
      description: 'Integrity is doing the right thing even when no one is watching and nobody will ever know. This module explores personal honor, honesty in the digital era, and standing firm in your values against peer pressure. Build an unshakeable reputation that opens doors for your future.',
      audioUrl: 'https://assets.belyftd.org/audio/courses/integrity-cornerstone.mp3',
      textContent: `# Integrity: The Cornerstone of Character\n\n> "Reputation is who you are in public; character is who you are in the dark."\n\n## The Bedrock of Self-Trust\nIntegrity is often defined as honesty with others, but its most powerful dimension is **honesty with yourself**. Every time you follow through on a promise you made to yourself, your self-esteem strengthens. Every time you cut corners or cheat, self-doubt creeps in.\n\n### 3 Pillars of Youth Integrity\n1. **Digital Integrity**: Not participating in online slander, gossip, or leaking private conversations.\n2. **Academic & Athletic Honor**: Doing your own work and competing with true sportsmanship.\n3. **Congruence**: Ensuring your private actions align with your public words.\n\n### The "Mirror Test"\nBefore making a questionable decision, look in the mirror and ask: *“Will the person looking back at me be proud of this choice tomorrow morning?”*\n\n---\n\n### Key Takeaway\nIntegrity is rarely tested in massive crises; it is forged in small, unnoticed daily decisions.`,
      estimatedTime: '5 mins',
      isCompleted: false
    },
    {
      id: 'momentum-principles',
      title: 'Momentum Principles',
      description: 'Objects in motion stay in motion—and the same rule applies to your productivity and personal drive. This course reveals how to break procrastination, engineer quick wins, and ride positive momentum loops. Learn how starting small creates an unstoppable chain reaction.',
      audioUrl: 'https://assets.belyftd.org/audio/courses/momentum-principles.mp3',
      textContent: `# Momentum Principles: Igniting the Flywheel of Progress\n\n> "Action creates motivation, not the other way around."\n\n## The Law of Personal Momentum\nNewton's First Law of Motion states that an object at rest stays at rest, and an object in motion stays in motion. If you wait until you feel 100% motivated before starting a project or homework, you will lose weeks.\n\n### The Physics of Quick Wins\n\`\`\`text\n[ Micro-Action ] ──> [ Dopamine Hit ] ──> [ Momentum ] ──> [ Bigger Win ]\n\`\`\`\n\n### 3 Strategies to Ignite Instant Momentum\n- **The 5-Minute Rule**: Tell yourself you will work on the dreaded task for just 5 minutes. If you want to stop after 5, you can. 80% of the time, the friction disappears and you keep going.\n- **The Lead Domino**: Identify the one task that makes everything else easier (e.g., getting a full 8 hours of sleep or clearing your desk).\n- **Protect the Streak**: Never miss twice in a row.\n\n---\n\n### Challenge for Today\nPick the hardest task on your to-do list. Set a timer for 5 minutes and begin immediately.`,
      estimatedTime: '6 mins',
      isCompleted: false
    },
    {
      id: 'moral-compass',
      title: 'Moral Compass',
      description: 'In a world full of noise, social media trends, and conflicting advice, having a grounded internal compass keeps you centered. This lesson guides youth through discovering their core values and moral courage. Learn how to navigate tough ethical dilemmas with conviction.',
      audioUrl: 'https://assets.belyftd.org/audio/courses/moral-compass.mp3',
      textContent: `# Moral Compass: Navigating the Storms of Life\n\n> "Stand for something, or you will fall for anything."\n\n## Calibrating Your True North\nA physical compass doesn't control the terrain you walk on—it simply points True North so you don't get lost in the forest. Your **Moral Compass** is your internal set of principles that guides your decisions when peer pressure or social trends urge you off course.\n\n### Discovering Your Core Value Triad\nChoose 3 non-negotiable core values that define who you strive to be:\n- *Courage*\n- *Compassion*\n- *Justice & Fairness*\n- *Respect & Honor*\n- *Wisdom & Curiosity*\n- *Loyalty & Reliability*\n\n### Practicing Moral Courage\nMoral courage is speaking up when an injustice occurs, even when your voice shakes. It is standing beside a peer who is being excluded, even when it isn't socially convenient.\n\n---\n\n### Life Application\nWrite down your Top 3 Core Values on an index card or phone lockscreen. Use them as the litmus test for every major choice you make this week.`,
      estimatedTime: '7 mins',
      isCompleted: false
    }
  ]);

  // Active selected course for modal / detailed reader
  readonly activeSelectedCourse = signal<Course | null>(null);

  // Daily Audio Pep Talks & Inspiration Tracks
  readonly audioTracks = signal<AudioTrack[]>([
    {
      id: 'track-1',
      title: 'Own Your Morning: The 3-Minute Power Shift',
      speaker: 'Marcus Vance',
      speakerRole: 'Software Engineer & Youth Lead',
      speakerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      category: 'Mindset',
      duration: '1:15',
      durationSec: 75,
      transcript: `Listen up, champion. Right now, this morning is yours. You do not need anyone else's permission to be great today. When you step out your door, or open your laptop, remember why you started. Every single obstacle you faced last week made you stronger, sharper, and more resilient. Take a deep breath in... hold it... and exhale any self-doubt. You have everything inside you right now to win today. Let's make it count.`,
      moodTags: ['High Energy', 'Morning Routine', 'Resilience'],
      likes: 142,
      isFavorite: true,
      ambientTone: 'energizing',
    },
    {
      id: 'track-2',
      title: 'Tackling Imposter Syndrome & Speaking Up',
      speaker: 'Dr. Maya Lin',
      speakerRole: 'Biochemist & Youth Mentor',
      speakerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      category: 'Confidence',
      duration: '1:30',
      durationSec: 90,
      transcript: `Have you ever sat in a classroom or a meeting and felt like you didn't belong? I want to tell you the truth: you earned your seat at the table. Your unique perspective, your lived experience, and your questions are valuable. Don't shrink to make others comfortable. Stand in your authenticity. The next time you feel that nervous hesitation, remember: courage isn't feeling fearless, it's raising your hand even when your heart is racing.`,
      moodTags: ['Courage', 'School', 'Belonging'],
      likes: 218,
      isFavorite: false,
      ambientTone: 'calm-piano',
    },
    {
      id: 'track-3',
      title: 'Level Up Your Game: The Power of 1% Daily Gains',
      speaker: 'Coach David O\'Connor',
      speakerRole: 'Youth Athletics & Leadership Director',
      speakerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      category: 'Leadership',
      duration: '1:10',
      durationSec: 70,
      transcript: `You don't need a miracle to reach your dreams; you just need consistency. If you get just one percent better each day at your craft, your studies, your attitude—by the end of the year, you are thirty-seven times better than where you started. Don't look at the whole mountain today. Just take the next single stride with focus. Be disciplined, stay hungry, and Lyft each other up along the way.`,
      moodTags: ['Focus', 'Discipline', 'Daily Habits'],
      likes: 96,
      isFavorite: true,
      ambientTone: 'lofi-warm',
    },
    {
      id: 'track-4',
      title: 'Financial Freedom 101: Your First Budget & Mindset',
      speaker: 'Elena Rostova',
      speakerRole: 'Youth Financial Coach',
      speakerAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      category: 'Career & Goals',
      duration: '1:20',
      durationSec: 80,
      transcript: `Money isn't just numbers in an account—it's a tool for your freedom and future options. The earlier you master the habit of paying yourself first and investing in your skills, the less stress you will carry into adulthood. Even if it is five dollars a week into savings, you are building the muscle of wealth and peace of mind. Your future self will thank you for the decisions you make right now.`,
      moodTags: ['Life Skills', 'Independence', 'Future'],
      likes: 184,
      isFavorite: false,
      ambientTone: 'ambient-synth',
    },
    {
      id: 'track-5',
      title: 'Reset & Recharge: Deep Breathing for Stress Relief',
      speaker: 'Keisha Taylor',
      speakerRole: 'Creative Arts & Youth Wellness Advocate',
      speakerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      category: 'Overcoming Anxiety',
      duration: '1:40',
      durationSec: 100,
      transcript: `Let's take a quick pause together. Place one hand over your heart and unclench your jaw. Drop your shoulders away from your ears. Inhale slowly for four counts: one, two, three, four... Hold gently... and release for six counts: one, two, three, four, five, six. Whatever is stressing you right now, you are safe in this present moment. You have the power to calm your mind and restart whenever you need to.`,
      moodTags: ['Calm', 'Mindfulness', 'Stress Relief'],
      likes: 310,
      isFavorite: true,
      ambientTone: 'calm-piano',
    }
  ]);

  // Verified Youth Mentors
  readonly mentors = signal<Mentor[]>([
    {
      id: 'mentor-1',
      name: 'Marcus Vance',
      title: 'Senior Software Engineer & STEM Mentor',
      organization: 'TechForward Initiative',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      bannerGradient: 'from-blue-600 to-indigo-800',
      specialties: ['Coding & Web Apps', 'Tech Careers', 'Portfolio Reviews', 'College Tech Pathways'],
      bio: 'First-generation college grad turned software engineer. Passionate about empowering youth to build real-world software, ace coding bootcamps, and build high-confidence careers.',
      rating: 4.9,
      menteesCount: 24,
      quote: '"Code is just a tool; your imagination and empathy are the superpowers."',
      availableNext: 'Today at 4:30 PM',
      verified: true,
      recommendedFor: ['Coding & Tech', 'College Prep'],
      voiceIntroPrompt: 'Hey! I\'m Marcus. Whether you want to debug your first app or map out college tech majors, I\'ve got your back.'
    },
    {
      id: 'mentor-2',
      name: 'Dr. Maya Lin',
      title: 'Biochemist & Pre-Health Academic Advisor',
      organization: 'Youth Discovery Labs',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
      bannerGradient: 'from-emerald-600 to-teal-800',
      specialties: ['Pre-Med & Science', 'Study Strategies', 'Scholarship Essays', 'Anxiety & Balance'],
      bio: 'PhD in Biochemistry with 8+ years guiding high school and undergraduate students through STEM research, test-taking confidence, and scholarship applications.',
      rating: 5.0,
      menteesCount: 31,
      quote: '"Curiosity is the antidote to fear. Ask every question on your mind."',
      availableNext: 'Tomorrow at 11:00 AM',
      verified: true,
      recommendedFor: ['College Prep', 'Mindset'],
      voiceIntroPrompt: 'Hello! Dr. Maya here. Let\'s work on your study habits and get your scholarship essays shining!'
    },
    {
      id: 'mentor-3',
      name: 'Coach David O\'Connor',
      title: 'Youth Leadership & Mindset Coach',
      organization: 'NextGen Athletics & Leadership',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
      bannerGradient: 'from-amber-600 to-orange-800',
      specialties: ['Leadership Habits', 'Athletics & Academics', 'Public Speaking', 'Goal Execution'],
      bio: 'Former collegiate athlete and certified youth mindset coach. Dedicated to helping youth turn big dreams into structured daily routines and bulletproof confidence.',
      rating: 4.9,
      menteesCount: 19,
      quote: '"Champions are built on the days when nobody is watching."',
      availableNext: 'Friday at 3:00 PM',
      verified: true,
      recommendedFor: ['Confidence & Speaking', 'Mindset'],
      voiceIntroPrompt: 'Coach David here! Let\'s build discipline, crush procrastination, and win your week.'
    },
    {
      id: 'mentor-4',
      name: 'Keisha Taylor',
      title: 'Creative Director & Media Producer',
      organization: 'Vibrant Voices Studio',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      bannerGradient: 'from-purple-600 to-pink-800',
      specialties: ['Digital Storytelling', 'Graphic Design', 'Podcasting & Audio', 'Personal Branding'],
      bio: 'Creative arts producer helping young storytellers, podcasters, and visual artists express their true voice and monetize their creative talents ethically.',
      rating: 4.8,
      menteesCount: 18,
      quote: '"Your story is your signature. Own it with pride."',
      availableNext: 'Thursday at 5:00 PM',
      verified: true,
      recommendedFor: ['Confidence & Speaking'],
      voiceIntroPrompt: 'Hey creative soul! Keisha here. Ready to turn your ideas into a standout portfolio?'
    },
    {
      id: 'mentor-5',
      name: 'Elena Rostova',
      title: 'Financial Wellness & Life Skills Educator',
      organization: 'Youth Wealth Builders',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
      bannerGradient: 'from-cyan-600 to-blue-800',
      specialties: ['First Job Preparation', 'Budgeting & Saving', 'Credit Basics', 'Resume Polish'],
      bio: 'Specialist in making personal finance simple, relatable, and actionable for young adults getting their first job or preparing for independent living.',
      rating: 4.9,
      menteesCount: 22,
      quote: '"Knowledge about money gives you freedom to choose your own path."',
      availableNext: 'Monday at 2:00 PM',
      verified: true,
      recommendedFor: ['Career & Goals'],
      voiceIntroPrompt: 'Hi there! Elena here. Let\'s get your resume interview-ready and set up your first savings plan.'
    }
  ]);

  // Quests & Real-World Goals
  readonly goalQuests = signal<GoalQuest[]>([
    {
      id: 'quest-1',
      title: 'Launch Personal Portfolio Web App',
      category: 'Career',
      deadline: 'In 2 weeks',
      mentorId: 'mentor-1',
      mentorName: 'Marcus Vance',
      notes: 'Focus on 2 core projects and an accessible about me page.',
      status: 'in-progress',
      steps: [
        {id: 's1', title: 'Choose 2 favorite coding projects to showcase', completed: true, xp: 50},
        {id: 's2', title: 'Draft bio highlighting career interests & values', completed: true, xp: 50},
        {id: 's3', title: 'Test responsive mobile layout and dark mode', completed: false, xp: 75},
        {id: 's4', title: 'Schedule 15-min code review check-in with Marcus', completed: false, xp: 100}
      ]
    },
    {
      id: 'quest-2',
      title: 'Scholarship & College Essay Drafts',
      category: 'Academic',
      deadline: 'This Month',
      mentorId: 'mentor-2',
      mentorName: 'Dr. Maya Lin',
      notes: 'Tell your authentic story overcoming challenges.',
      status: 'in-progress',
      steps: [
        {id: 's5', title: 'Brainstorm 3 core life experiences that shaped you', completed: true, xp: 50},
        {id: 's6', title: 'Write 500-word first draft without self-editing', completed: false, xp: 80},
        {id: 's7', title: 'Review feedback notes from Dr. Maya Lin', completed: false, xp: 60}
      ]
    },
    {
      id: 'quest-3',
      title: 'Mindful Morning Routine (7-Day Streak)',
      category: 'Wellness',
      deadline: 'Ongoing',
      mentorName: 'Coach David',
      notes: 'Listen to Daily Lyft audio before checking notifications.',
      status: 'in-progress',
      steps: [
        {id: 's8', title: 'Day 1-3 Daily Lyft audio completion', completed: true, xp: 40},
        {id: 's9', title: 'Day 4-6 10-minute focus journaling', completed: true, xp: 60},
        {id: 's10', title: 'Day 7 celebrate full week consistency', completed: false, xp: 100}
      ]
    }
  ]);

  // Community Uplift Board (Hype Wall)
  readonly communityPosts = signal<CommunityPost[]>([
    {
      id: 'post-1',
      authorName: 'Amara K.',
      authorGrade: '12th Grade',
      authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      type: 'win',
      content: 'Huge shoutout to Coach Marcus! Just got accepted into my dream summer STEM internship program! To everyone working on their applications right now: DO NOT GIVE UP. Your effort matters!',
      timestamp: '25m ago',
      lyftsCount: 42,
      isLyfted: true,
      tags: ['#STEMWins', '#Internship', '#Gratitude']
    },
    {
      id: 'post-2',
      authorName: 'Tariq S.',
      authorGrade: '10th Grade',
      authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
      type: 'shoutout',
      content: 'Was feeling super overwhelmed about midterms today, but listened to the "Tackling Imposter Syndrome" audio track on Be Lyft\'d. Deep breath taken. Let\'s get after it today family!',
      timestamp: '2h ago',
      lyftsCount: 29,
      isLyfted: false,
      tags: ['#Mindset', '#ExamPrep', '#BeLyftd']
    },
    {
      id: 'post-3',
      authorName: 'Zoe M.',
      authorGrade: 'College Freshman',
      authorAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
      type: 'advice',
      content: 'Pro-tip for all the high schoolers: building a relationship with your mentor isn\'t about having all the answers—it\'s about showing up consistently and asking questions with zero shame!',
      timestamp: '5h ago',
      lyftsCount: 68,
      isLyfted: true,
      tags: ['#YouthWisdom', '#MentorshipGoals']
    }
  ]);

  // Mentor Chat History (Keyed by mentorId)
  readonly mentorChats = signal<Record<string, ChatMessage[]>>({
    'mentor-1': [
      {
        id: 'm1',
        sender: 'mentor',
        senderName: 'Marcus Vance',
        text: 'Hey Jordan! Stoked to connect with you. How is your web portfolio project coming along?',
        timestamp: 'Yesterday at 4:15 PM'
      },
      {
        id: 'm2',
        sender: 'user',
        senderName: 'Jordan Rivers',
        text: 'Hey Marcus! Finished building the layout in Tailwind, now working on making the dark/light mode accessible and adding my project descriptions.',
        timestamp: 'Yesterday at 4:22 PM'
      },
      {
        id: 'm3',
        sender: 'mentor',
        senderName: 'Marcus Vance',
        text: 'Awesome progress! Remember to keep the navigation thumb-friendly for mobile. Let\'s do a quick live review this Thursday.',
        timestamp: 'Yesterday at 4:30 PM',
        actionPrompt: 'Schedule Check-in for Thursday'
      }
    ],
    'mentor-2': [
      {
        id: 'm4',
        sender: 'mentor',
        senderName: 'Dr. Maya Lin',
        text: 'Welcome Jordan! Whenever you are ready with your first essay outline, drop it here or record a quick voice reflection.',
        timestamp: '2 days ago'
      }
    ]
  });

  // Recorded Voice Journals / Reflections
  readonly voiceJournals = signal<VoiceJournal[]>([
    {
      id: 'vj-1',
      title: 'Overcoming fear before math presentation',
      date: 'Aug 24, 2026',
      durationSec: 38,
      prompt: 'What was a moment today where you chose courage over comfort?',
      mood: '✨ Inspired'
    },
    {
      id: 'vj-2',
      title: 'Weekly Wins & Next Milestone Reflection',
      date: 'Aug 21, 2026',
      durationSec: 52,
      prompt: 'What are 3 things you are proud of accomplishing this week?',
      mood: '🔥 Hyped'
    }
  ]);

  // Methods for mutations
  toggleGoalStep(questId: string, stepId: string): void {
    this.goalQuests.update(quests =>
      quests.map(quest => {
        if (quest.id !== questId) return quest;
        const updatedSteps = quest.steps.map(step => {
          if (step.id !== stepId) return step;
          return {...step, completed: !step.completed};
        });
        const allDone = updatedSteps.every(s => s.completed);
        return {
          ...quest,
          steps: updatedSteps,
          status: allDone ? 'completed' : 'in-progress'
        };
      })
    );
  }

  addGoalQuest(quest: GoalQuest): void {
    this.goalQuests.update(list => [quest, ...list]);
  }

  sendMentorMessage(mentorId: string, text: string): void {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      senderName: this.userProfile().name,
      text,
      timestamp: 'Just now'
    };

    this.mentorChats.update(chats => {
      const existing = chats[mentorId] || [];
      return {
        ...chats,
        [mentorId]: [...existing, newMsg]
      };
    });

    // Simulate mentor thoughtful response
    setTimeout(() => {
      const mentor = this.mentors().find(m => m.id === mentorId);
      const mentorReply: ChatMessage = {
        id: `mentor-rep-${Date.now()}`,
        sender: 'mentor',
        senderName: mentor?.name || 'Mentor',
        text: `Got your message! I'm proud of how consistently you are showing up. Let's make sure you take a quick break, then tackle the next step!`,
        timestamp: 'Just now'
      };

      this.mentorChats.update(chats => ({
        ...chats,
        [mentorId]: [...(chats[mentorId] || []), mentorReply]
      }));
    }, 1500);
  }

  toggleLyftPost(postId: string): void {
    this.communityPosts.update(posts =>
      posts.map(p => {
        if (p.id !== postId) return p;
        const nextLyfted = !p.isLyfted;
        return {
          ...p,
          isLyfted: nextLyfted,
          lyftsCount: nextLyfted ? p.lyftsCount + 1 : Math.max(0, p.lyftsCount - 1)
        };
      })
    );

    this.userProfile.update(u => ({
      ...u,
      totalLyftsSent: u.totalLyftsSent + 1
    }));
  }

  addCommunityPost(type: CommunityPost['type'], content: string, tagInput: string): void {
    const tags = tagInput.split(' ').filter(t => t.startsWith('#') || t.length > 0).map(t => t.startsWith('#') ? t : `#${t}`);
    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      authorName: this.userProfile().name,
      authorGrade: this.userProfile().gradeOrAge.split('•')[0].trim(),
      authorAvatar: this.userProfile().avatar,
      type,
      content,
      timestamp: 'Just now',
      lyftsCount: 1,
      isLyfted: true,
      tags: tags.length > 0 ? tags : ['#BeLyftd', '#YouthPower']
    };

    this.communityPosts.update(posts => [newPost, ...posts]);
  }

  private _syncInitialCourseCompletions(): void {
    const completedList = this.firebaseService._getLocalStorageCompletedCourses();
    if (completedList && completedList.length > 0) {
      this.courses.update(courses =>
        courses.map(c => ({
          ...c,
          isCompleted: completedList.includes(c.id)
        }))
      );
    }
  }

  saveVoiceJournal(journal: VoiceJournal): void {
    this.voiceJournals.update(list => [journal, ...list]);
  }

  toggleCourseCompletion(courseId: string): void {
    this.courses.update(courses =>
      courses.map(c => c.id === courseId ? {...c, isCompleted: !c.isCompleted} : c)
    );
    if (this.activeSelectedCourse()?.id === courseId) {
      this.activeSelectedCourse.update(c => c ? {...c, isCompleted: !c.isCompleted} : null);
    }
    this.firebaseService.recordCourseCompletion(courseId);
  }

  markCourseCompleted(courseId: string): void {
    this.courses.update(courses =>
      courses.map(c => c.id === courseId ? {...c, isCompleted: true} : c)
    );
    if (this.activeSelectedCourse()?.id === courseId) {
      this.activeSelectedCourse.update(c => c ? {...c, isCompleted: true} : null);
    }
    this.firebaseService.recordCourseCompletion(courseId);
  }

  openCourseById(courseId: string): void {
    const found = this.courses().find(c => c.id === courseId);
    if (found) {
      this.activeSelectedCourse.set(found);
    }
  }

  openCourse(course: Course): void {
    this.activeSelectedCourse.set(course);
  }

  closeCourse(): void {
    this.activeSelectedCourse.set(null);
  }
}
