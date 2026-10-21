import {PRODUCTION_MENTORS, productionMentorForLabel} from './production-mentors';
import {parseMentorLabel, isProductionMentorVariant} from './course-assets';
import {Injectable, inject, signal, effect} from '@angular/core';
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
    effect(() => {
      const user = this.firebaseService.currentUser();
      const tier = this.firebaseService.subscriptionTier();
      const request = ++this.catalogRequest;
      this.audioTracks.set([]);
      this.audioCatalogError.set(null);
      this.audioCatalogLoading.set(false);
      if (user && tier) void this.loadAudioCatalog(request);
    });
  }

  // Foundational Courses (10 Modules)
  readonly courses = signal<Course[]>([
    {
      id: 'hope',
      title: 'Hope',
      description: 'Hope is a guiding light through challenging times. Explore how a positive outlook, opportunities, perseverance, and empowerment can help you create a brighter future.',
      textContent: `LET'S TALK ABOUT HOPE\n\nHope is like a guiding light that helps us navigate through challenging times. Imagine you're on a journey and encounter obstacles or dark patches. Hope is that beacon of light that keeps shining, even when things seem tough.\n\nH - HAVING A POSITIVE OUTLOOK\nBelieve that things can get better, even when they seem difficult.\n\nO - OPPORTUNITIES\nHope reminds us to look for opportunities, even in the midst of adversity. It encourages us to see possibilities and solutions, rather than focusing only on problems.\n\nP - PERSEVERANCE\nHope gives us the strength to keep going, even when the road is rough. It means not giving up, but pushing forward with determination.\n\nE - EMPOWERMENT\nHope empowers us to take action and make positive changes in our lives. It gives us the courage to pursue our dreams and goals, even when faced with challenges.\n\n“Hope is not just wishful thinking.”\n\nIt's a powerful force that inspires us to stay optimistic, seek opportunities, persevere, and take action to create a brighter future. It's something we can all hold onto, especially when times are tough.\n\nMY TO-DO LIST\n1. Identify 3 aspects of today's topic that you would like further clarification on.\n2. Set aside 30 Golden minutes daily for thoughts and reflection.\n3. Read a minimum of 30 minutes each day.\n4. My goals today are: ______________________________________________________________\n\nMEDITATE / THINK\nThink about these words daily: HOPE\n\n“Hope is being able to see that there is light despite all of the darkness.”\n\nCheck the video link today using the Watch Video button below.`,
      estimatedTime: '2 pages',
      isCompleted: false
    },
    {
      id: 'changing-habits',
      title: 'Changing Habits',
      description: 'Our daily routines quietly construct the person we become tomorrow. In this lesson, you will discover the science of the habit loop and how micro-adjustments lead to compounding self-confidence. Learn how to replace draining behavioral patterns with empowering rituals.',
      textContent: `# Changing Habits: The Architecture of Daily Wins\n\n> "You do not rise to the level of your goals; you fall to the level of your systems."\n\n## The Science of the Habit Loop\nEvery single habit—from checking your phone first thing in the morning to studying consistently—runs on a three-part neural cycle:\n\n\`\`\`text\n[ CUE ] ──────> [ ROUTINE ] ──────> [ REWARD ]\n(Trigger)       (Action taken)      (Dopamine / relief)\n\`\`\`\n\n### The Golden Rule of Habit Transformation\nDo not try to eliminate the cue; change the **routine** that follows it to receive a healthier reward.\n\n### 3 Steps to Build Atomic Habits\n- **Habit Stacking**: Attach a new habit to an established one (e.g., *“After I pack my school backpack, I will read 5 pages of my book”*).\n- **Environment Design**: Make good choices frictionless (place your workout shoes or notebook where you see them first).\n- **The Two-Minute Rule**: Scale new habits down so they take less than two minutes to begin.\n\n---\n\n### Quick Challenge\nPick one negative habit you want to shift. Identify its primary **Cue** and choose a substitute **Action** you will practice today.`,
      estimatedTime: '7 mins',
      isCompleted: true
    },
    {
      id: 'commitment-the-power-of-stickability',
      title: 'Commitment: The Power of Stickability',
      description: 'Starting a new journey is easy, but staying the course when enthusiasm fades is what separates dreamers from achievers. This module dives into the mindset of stickability and grit. You will build stamina to stay loyal to what you said you would do long after the mood of saying it has left.',
      textContent: `# Commitment: The Power of Stickability\n\n> "Stickability is the quiet refusal to let temporary discomfort dictate permanent defeat."\n\n## What Is Stickability?\nMotivation is like weather—it changes constantly. Some days you will wake up energized, and other days you will feel completely uninspired. **Stickability** is your ability to maintain commitment regardless of your emotional state.\n\n### The 3 Enemies of Commitment\n1. **The 'Dip'**: The frustrating middle phase when initial excitement fades and results are not yet visible.\n2. **Comparison Paralysis**: Looking at someone else's highlight reel and feeling behind.\n3. **All-or-Nothing Thinking**: Giving up entirely because you missed one session or milestone.\n\n### Building Your Stickability Muscle\n- **Lower the Bar, Don't Stop**: On low-energy days, do the minimum viable rep rather than skipping altogether.\n- **Anchor to Your 'Why'**: Clarify who benefits when you keep your word—your family, your future self, your community.\n- **Accountability Partnerships**: Share your commitment with a trusted mentor or peer on Lyftd.\n\n---\n\n### Reflection Question\n*What is one goal you previously abandoned because it became difficult? What is one reason to revive it today?*`,
      estimatedTime: '5 mins',
      isCompleted: false
    },
    {
      id: 'contribution',
      title: 'Contribution',
      description: 'True leadership and self-worth grow fastest when we lift others up along our journey. This course explores how small acts of service, peer encouragement, and community involvement create lasting personal fulfillment. Learn how to leverage your unique strengths to be a positive catalyst in your world.',
      textContent: `# Contribution: The Multiplier of Purpose\n\n> "We make a living by what we get, but we make a life by what we give."\n\n## Shifting From Consumption to Contribution\nWhen we only focus on what we want to *get*—grades, followers, accolades—life feels heavy and competitive. When we shift our focus to what we can *give*, our perspective expands and confidence follows naturally.\n\n### Everyday Ways Youth Can Contribute\n- **Lift Up a Peer**: Send an unexpected encouragement note or voice shoutout on Lyftd.\n- **Share Knowledge**: Help a classmate understand a difficult homework concept without judgment.\n- **Active Listening**: Give your full attention to a friend or family member who needs a safe sounding board.\n- **Community Care**: Organize a neighborhood clean-up, food drive, or youth study club.\n\n---\n\n### The Contribution Exercise\n1. Identify one person in your circle who has been working hard or feeling overwhelmed.\n2. Deliver a genuine 30-second Lyft (praise or assistance) before the day ends.`,
      estimatedTime: '5 mins',
      isCompleted: false
    },
    {
      id: 'dont-give-up',
      title: "Don't Give Up",
      description: 'Every champion encounters dark valleys where throwing in the towel feels like the easiest option. This course is an injection of perseverance, showing you how to reframe adversity as mental conditioning. You will develop the resilience needed to stand back up one more time than you fall.',
      textContent: `# Don't Give Up: Reframing Failure as Fuel\n\n> "Fall seven times, stand up eight." — Proverb\n\n## The Truth About the Plateau\nWhen you are working toward something meaningful—a sport, coding, learning an instrument, or turning your grades around—progress is rarely a straight upward line. You will inevitably hit plateaus and obstacles that tempt you to quit.\n\n### 3 Mindset Shifts for Tough Days\n1. **Change the Verb**: Replace *"I failed"* with *"I gathered data on what doesn't work yet."*\n2. **Remember the Compound Effect**: Invisible progress is still progress; bamboo shoots grow underground for years before exploding upward.\n3. **Zoom Out**: Ask yourself: *“Will this challenge matter in 5 years?”* If not, don't give it more than 5 minutes of panic.\n\n---\n\n### The Resilience Checklist\n- [ ] Take three deep belly breaths to calm your nervous system.\n- [ ] Talk to yourself like you would speak to a friend who is struggling.\n- [ ] Focus on taking just **one micro-step** forward today.`,
      estimatedTime: '6 mins',
      isCompleted: false
    },
    {
      id: 'emotional-intelligence',
      title: 'Emotional Intelligence',
      description: 'Understanding your emotional triggers gives you an unbeatable superpower in school, sports, and life. This course breaks down self-awareness, active empathy, and stress regulation into actionable daily tools. Discover how to respond with calm clarity rather than reacting out of impulse.',
      textContent: `# Emotional Intelligence (EQ): Mastering Your Internal Compass\n\n> "Between stimulus and response there is a space. In that space is our power to choose our response." — Viktor Frankl\n\n## The 4 Pillars of EQ\nEmotional intelligence is not about suppressing feelings—it is about understanding them so they guide you rather than hijack you.\n\n### 1. Self-Awareness\nNaming the emotion before it controls you. Is it frustration, anxiety, hunger, or exhaustion?\n\n### 2. Self-Management\nCreating a pause between an emotional trigger and your physical response.\n- **The 5-Second Pause**: Inhale for 4 seconds, hold for 2, exhale for 6 before typing back or replying angrily.\n\n### 3. Social Awareness (Empathy)\nTuning into body language, vocal tone, and the unspoken needs of peers and mentors.\n\n### 4. Relationship Leadership\nResolving disagreements with respect and expressing your needs without aggression.\n\n---\n\n### Reflection Exercise\nNext time you feel a surge of frustration, write down:\n- What triggered it?\n- What physical sensation did I feel in my body?\n- What is the most constructive response I can choose right now?`,
      estimatedTime: '8 mins',
      isCompleted: false
    },
    {
      id: 'goal-setting',
      title: 'Goal Setting',
      description: 'A goal without a concrete structure is just a daydream waiting to evaporate. In this hands-on course, you will learn the S.M.A.R.T. goal framework and reverse-engineering techniques used by elite leaders. Turn your biggest ambitions into manageable weekly milestones.',
      textContent: `# Goal Setting: Engineering Your Dreams Into Reality\n\n> "A dream written down with a date becomes a goal. A goal broken down into steps becomes a plan."\n\n## Why Vague Goals Fail\nSaying *"I want to do better in math"* or *"I want to get fit"* rarely works because your brain needs clear coordinates. Clear targets generate targeted effort.\n\n### The S.M.A.R.T.+ Execution Model\n- **Specific**: Exactly what do you want to accomplish?\n- **Measurable**: How will you know when you've reached it? (numbers, test scores, reps)\n- **Achievable**: Is it realistic given your current season and resources?\n- **Relevant**: Does this align with your personal vision and values?\n- **Time-Bound**: What is the hard deadline?\n\n### Reverse Engineering: The 30-Day Milestone Sprint\n\`\`\`text\n[ 90-Day Vision Target ]\n       │\n       ▼\n[ 30-Day Critical Checkpoint ]\n       │\n       ▼\n[ Weekly Must-Win Battles (3 Steps) ]\n       │\n       ▼\n[ Today's 1 Non-Negotiable Action ]\n\`\`\`\n\n---\n\n### Hands-On Quest\nDraft one S.M.A.R.T. goal right now and add it to your **Quests** tab in Lyftd!`,
      estimatedTime: '6 mins',
      isCompleted: false
    },
    {
      id: 'integrity-the-cornerstone-of-character',
      title: 'Integrity: The Cornerstone of Character',
      description: 'Integrity is doing the right thing even when no one is watching and nobody will ever know. This module explores personal honor, honesty in the digital era, and standing firm in your values against peer pressure. Build an unshakeable reputation that opens doors for your future.',
      textContent: `# Integrity: The Cornerstone of Character\n\n> "Reputation is who you are in public; character is who you are in the dark."\n\n## The Bedrock of Self-Trust\nIntegrity is often defined as honesty with others, but its most powerful dimension is **honesty with yourself**. Every time you follow through on a promise you made to yourself, your self-esteem strengthens. Every time you cut corners or cheat, self-doubt creeps in.\n\n### 3 Pillars of Youth Integrity\n1. **Digital Integrity**: Not participating in online slander, gossip, or leaking private conversations.\n2. **Academic & Athletic Honor**: Doing your own work and competing with true sportsmanship.\n3. **Congruence**: Ensuring your private actions align with your public words.\n\n### The "Mirror Test"\nBefore making a questionable decision, look in the mirror and ask: *“Will the person looking back at me be proud of this choice tomorrow morning?”*\n\n---\n\n### Key Takeaway\nIntegrity is rarely tested in massive crises; it is forged in small, unnoticed daily decisions.`,
      estimatedTime: '5 mins',
      isCompleted: false
    },
    {
      id: 'momentum-principles',
      title: 'Momentum Principles',
      description: 'Objects in motion stay in motion—and the same rule applies to your productivity and personal drive. This course reveals how to break procrastination, engineer quick wins, and ride positive momentum loops. Learn how starting small creates an unstoppable chain reaction.',
      textContent: `# Momentum Principles: Igniting the Flywheel of Progress\n\n> "Action creates motivation, not the other way around."\n\n## The Law of Personal Momentum\nNewton's First Law of Motion states that an object at rest stays at rest, and an object in motion stays in motion. If you wait until you feel 100% motivated before starting a project or homework, you will lose weeks.\n\n### The Physics of Quick Wins\n\`\`\`text\n[ Micro-Action ] ──> [ Dopamine Hit ] ──> [ Momentum ] ──> [ Bigger Win ]\n\`\`\`\n\n### 3 Strategies to Ignite Instant Momentum\n- **The 5-Minute Rule**: Tell yourself you will work on the dreaded task for just 5 minutes. If you want to stop after 5, you can. 80% of the time, the friction disappears and you keep going.\n- **The Lead Domino**: Identify the one task that makes everything else easier (e.g., getting a full 8 hours of sleep or clearing your desk).\n- **Protect the Streak**: Never miss twice in a row.\n\n---\n\n### Challenge for Today\nPick the hardest task on your to-do list. Set a timer for 5 minutes and begin immediately.`,
      estimatedTime: '6 mins',
      isCompleted: false
    },
    {
      id: 'moral-compass',
      title: 'Moral Compass',
      description: 'In a world full of noise, social media trends, and conflicting advice, having a grounded internal compass keeps you centered. This lesson guides youth through discovering their core values and moral courage. Learn how to navigate tough ethical dilemmas with conviction.',
      textContent: `# Moral Compass: Navigating the Storms of Life\n\n> "Stand for something, or you will fall for anything."\n\n## Calibrating Your True North\nA physical compass doesn't control the terrain you walk on—it simply points True North so you don't get lost in the forest. Your **Moral Compass** is your internal set of principles that guides your decisions when peer pressure or social trends urge you off course.\n\n### Discovering Your Core Value Triad\nChoose 3 non-negotiable core values that define who you strive to be:\n- *Courage*\n- *Compassion*\n- *Justice & Fairness*\n- *Respect & Honor*\n- *Wisdom & Curiosity*\n- *Loyalty & Reliability*\n\n### Practicing Moral Courage\nMoral courage is speaking up when an injustice occurs, even when your voice shakes. It is standing beside a peer who is being excluded, even when it isn't socially convenient.\n\n---\n\n### Life Application\nWrite down your Top 3 Core Values on an index card or phone lockscreen. Use them as the litmus test for every major choice you make this week.`,
      estimatedTime: '7 mins',
      isCompleted: false
    }
  ]);

  // Active selected course for modal / detailed reader
  readonly activeSelectedCourse = signal<Course | null>(null);

  // Only expose audio actually registered on ingested Firestore units.
  readonly audioTracks = signal<AudioTrack[]>([]);
  readonly audioCatalogLoading = signal(false);
  readonly audioCatalogError = signal<string | null>(null);
  private catalogRequest = 0;

  private async loadAudioCatalog(request: number): Promise<void> {
    this.audioCatalogLoading.set(true);
    this.audioCatalogError.set(null);
    // These are the module IDs produced by seed-real-content.js.
    const moduleIds = ['module-1', 'module-2', 'module-3', 'module-4', 'module-5'];
    const results = await Promise.allSettled(moduleIds.map(async moduleId => {
      const units = await this.firebaseService.getModuleUnits(moduleId);
      const tracks = units.flatMap(unit => Object.entries(unit.audioUrls ?? {}).flatMap(([label, storagePath]) => {
        if (typeof storagePath !== 'string' || !storagePath.trim() || !storagePath.startsWith(`course-content/${moduleId}/${unit.id}/audio/`) || !isProductionMentorVariant(label)) return [];
        const {mentorName, language} = parseMentorLabel(label);
        return [{
          id: storagePath,
          title: unit.title || unit.id,
          speaker: `${mentorName} - ${language}`,
          mentorName, language,
          speakerRole: 'Course mentor',
          speakerAvatar: productionMentorForLabel(label)?.avatar || '/logo.png',
          category: 'Mindset' as const,
          duration: 'Listen', durationSec: 0,
          audioUrl: storagePath,
          transcript: unit.textContent,
          moodTags: [], likes: 0, isFavorite: false,
        }];
      }));
      const checked = await Promise.allSettled(tracks.map(async track => {
        const url = await this.firebaseService.getCourseMediaUrlFromPath(track.audioUrl);
        if (!url?.trim()) throw new Error('Recording unavailable.');
        return track;
      }));
      return checked.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
    }));
    if (request !== this.catalogRequest) return;
    this.audioTracks.set(results.flatMap(result => result.status === 'fulfilled' ? result.value : []));
    if (results.some(result => result.status === 'rejected')) {
      this.audioCatalogError.set('Some mentor recordings could not be loaded. Please try again.');
    }
    this.audioCatalogLoading.set(false);
  }

  readonly mentors = signal<Mentor[]>(PRODUCTION_MENTORS.filter(mentor => mentor.mediaPaths.length > 0));

  // Quests & Real-World Goals
  readonly goalQuests = signal<GoalQuest[]>([
    {
      id: 'quest-1',
      title: 'Launch Personal Portfolio Web App',
      category: 'Career',
      deadline: 'In 2 weeks',
      notes: 'Focus on 2 core projects and an accessible about me page.',
      status: 'in-progress',
      steps: [
        {id: 's1', title: 'Choose 2 favorite coding projects to showcase', completed: true, xp: 50},
        {id: 's2', title: 'Draft bio highlighting career interests & values', completed: true, xp: 50},
        {id: 's3', title: 'Test responsive mobile layout and dark mode', completed: false, xp: 75},
        {id: 's4', title: 'Review the portfolio for 15 minutes', completed: false, xp: 100}
      ]
    },
    {
      id: 'quest-2',
      title: 'Scholarship & College Essay Drafts',
      category: 'Academic',
      deadline: 'This Month',
      notes: 'Tell your authentic story overcoming challenges.',
      status: 'in-progress',
      steps: [
        {id: 's5', title: 'Brainstorm 3 core life experiences that shaped you', completed: true, xp: 50},
        {id: 's6', title: 'Write 500-word first draft without self-editing', completed: false, xp: 80},
        {id: 's7', title: 'Review feedback notes', completed: false, xp: 60}
      ]
    },
    {
      id: 'quest-3',
      title: 'Mindful Morning Routine (7-Day Streak)',
      category: 'Wellness',
      deadline: 'Ongoing',
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
      content: 'Celebrating a milestone! Just got accepted into my dream summer STEM internship program! To everyone working on their applications right now: DO NOT GIVE UP. Your effort matters!',
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
      content: 'Was feeling super overwhelmed about midterms today, but listened to the "Tackling Imposter Syndrome" audio track on Lyftd. Deep breath taken. Let\'s get after it today family!',
      timestamp: '2h ago',
      lyftsCount: 29,
      isLyfted: false,
      tags: ['#Mindset', '#ExamPrep', '#Lyftd']
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

  readonly mentorChats = signal<Record<string, ChatMessage[]>>({});

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
      tags: tags.length > 0 ? tags : ['#Lyftd', '#YouthPower']
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
