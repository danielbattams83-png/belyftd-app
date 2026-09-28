/**
 * Be Lyft'd Mobile App MVP - Course Catalog
 * 
 * ES6 Module containing curated courses designed to empower youth with
 * foundational mindset, character, emotional resilience, and leadership skills.
 * 
 * @module coursesData
 */

/**
 * @typedef {Object} Course
 * @property {string} id - Unique slug identifier for the course.
 * @property {string} title - The official course title.
 * @property {string} description - 2-3 sentence overview of the module.
 * @property {string} audioUrl - Audio stream placeholder for spoken lesson/pep talk.
 * @property {string} textContent - Full lesson body formatted with Markdown.
 * @property {string} estimatedTime - Estimated duration to finish the module (e.g. '5 mins').
 * @property {boolean} isCompleted - Boolean flag tracking mentee completion status.
 */

export const coursesData = [
  {
    id: 'behavioral-accountability',
    title: 'Behavioral Accountability',
    description:
      'True power begins the moment you stop blaming circumstances and start owning your choices. This course teaches youth how to recognize personal agency in school, relationships, and digital spaces. You will master practical methods to turn setbacks into growth through active ownership.',
    audioUrl: 'https://assets.belyftd.org/audio/courses/behavioral-accountability.mp3',
    textContent: `# Behavioral Accountability: Owning Your Path

> "Accountability is the bridge between intention and real transformation."

## Why Accountability Matters
When things don't go according to plan, human instinct often looks outward for someone or something to blame. However, when you give away credit for your mistakes, you also give away your power to fix them. **Behavioral accountability** means recognizing that while you cannot control every situation, you hold 100% ownership over your response.

### The O.W.N. Framework
1. **Observe Without Judgment**: Notice what happened without instantly making excuses.
2. **Weigh Your Choices**: Ask yourself, *“What part of this outcome did my choices influence?”*
3. **Navigate the Next Step**: Focus all your energy on corrective action instead of defensive explanation.

---

### Daily Action Prompt
- **Reflection**: Think of a situation this past week that did not go well. Identify one choice you made that contributed to the result.
- **Micro-Commitment**: Write down the exact phrase you will use next time you make a mistake: *"I own that mistake, and here is how I will make it right."*`,
    estimatedTime: '6 mins',
    isCompleted: false
  },
  {
    id: 'changing-habits',
    title: 'Changing Habits',
    description:
      'Our daily routines quietly construct the person we become tomorrow. In this lesson, you will discover the science of the habit loop and how micro-adjustments lead to compounding self-confidence. Learn how to replace draining behavioral patterns with empowering rituals.',
    audioUrl: 'https://assets.belyftd.org/audio/courses/changing-habits.mp3',
    textContent: `# Changing Habits: The Architecture of Daily Wins

> "You do not rise to the level of your goals; you fall to the level of your systems."

## The Science of the Habit Loop
Every single habit—from checking your phone first thing in the morning to studying consistently—runs on a three-part neural cycle:

\`\`\`text
[ CUE ] ──────> [ ROUTINE ] ──────> [ REWARD ]
(Trigger)       (Action taken)      (Dopamine / relief)
\`\`\`

### The Golden Rule of Habit Transformation
Do not try to eliminate the cue; change the **routine** that follows it to receive a healthier reward.

### 3 Steps to Build Atomic Habits
- **Habit Stacking**: Attach a new habit to an established one (e.g., *“After I pack my school backpack, I will read 5 pages of my book”*).
- **Environment Design**: Make good choices frictionless (place your workout shoes or notebook where you see them first).
- **The Two-Minute Rule**: Scale new habits down so they take less than two minutes to begin.

---

### Quick Challenge
Pick one negative habit you want to shift. Identify its primary **Cue** and choose a substitute **Action** you will practice today.`,
    estimatedTime: '7 mins',
    isCompleted: true
  },
  {
    id: 'commitment-the-power-of-stickability',
    title: 'Commitment: The Power of Stickability',
    description:
      'Starting a new journey is easy, but staying the course when enthusiasm fades is what separates dreamers from achievers. This module dives into the mindset of stickability and grit. You will build stamina to stay loyal to what you said you would do long after the mood of saying it has left.',
    audioUrl: 'https://assets.belyftd.org/audio/courses/stickability-commitment.mp3',
    textContent: `# Commitment: The Power of Stickability

> "Stickability is the quiet refusal to let temporary discomfort dictate permanent defeat."

## What Is Stickability?
Motivation is like weather—it changes constantly. Some days you will wake up energized, and other days you will feel completely uninspired. **Stickability** is your ability to maintain commitment regardless of your emotional state.

### The 3 Enemies of Commitment
1. **The 'Dip'**: The frustrating middle phase when initial excitement fades and results are not yet visible.
2. **Comparison Paralysis**: Looking at someone else's highlight reel and feeling behind.
3. **All-or-Nothing Thinking**: Giving up entirely because you missed one session or milestone.

### Building Your Stickability Muscle
- **Lower the Bar, Don't Stop**: On low-energy days, do the minimum viable rep rather than skipping altogether.
- **Anchor to Your 'Why'**: Clarify who benefits when you keep your word—your family, your future self, your community.
- **Accountability Partnerships**: Share your commitment with a trusted mentor or peer on Be Lyft'd.

---

### Reflection Question
*What is one goal you previously abandoned because it became difficult? What is one reason to revive it today?*`,
    estimatedTime: '5 mins',
    isCompleted: false
  },
  {
    id: 'contribution',
    title: 'Contribution',
    description:
      'True leadership and self-worth grow fastest when we lift others up along our journey. This course explores how small acts of service, peer encouragement, and community involvement create lasting personal fulfillment. Learn how to leverage your unique strengths to be a positive catalyst in your world.',
    audioUrl: 'https://assets.belyftd.org/audio/courses/contribution-leadership.mp3',
    textContent: `# Contribution: The Multiplier of Purpose

> "We make a living by what we get, but we make a life by what we give."

## Shifting From Consumption to Contribution
When we only focus on what we want to *get*—grades, followers, accolades—life feels heavy and competitive. When we shift our focus to what we can *give*, our perspective expands and confidence follows naturally.

### Everyday Ways Youth Can Contribute
- **Lift Up a Peer**: Send an unexpected encouragement note or voice shoutout on Be Lyft'd.
- **Share Knowledge**: Help a classmate understand a difficult homework concept without judgment.
- **Active Listening**: Give your full attention to a friend or family member who needs a safe sounding board.
- **Community Care**: Organize a neighborhood clean-up, food drive, or youth study club.

---

### The Contribution Exercise
1. Identify one person in your circle who has been working hard or feeling overwhelmed.
2. Deliver a genuine 30-second Lyft (praise or assistance) before the day ends.`,
    estimatedTime: '5 mins',
    isCompleted: false
  },
  {
    id: 'dont-give-up',
    title: "Don't Give Up",
    description:
      'Every champion encounters dark valleys where throwing in the towel feels like the easiest option. This course is an injection of perseverance, showing you how to reframe adversity as mental conditioning. You will develop the resilience needed to stand back up one more time than you fall.',
    audioUrl: 'https://assets.belyftd.org/audio/courses/dont-give-up.mp3',
    textContent: `# Don't Give Up: Reframing Failure as Fuel

> "Fall seven times, stand up eight." — Proverb

## The Truth About the Plateau
When you are working toward something meaningful—a sport, coding, learning an instrument, or turning your grades around—progress is rarely a straight upward line. You will inevitably hit plateaus and obstacles that tempt you to quit.

### 3 Mindset Shifts for Tough Days
1. **Change the Verb**: Replace *"I failed"* with *"I gathered data on what doesn't work yet."*
2. **Remember the Compound Effect**: Invisible progress is still progress; bamboo shoots grow underground for years before exploding upward.
3. **Zoom Out**: Ask yourself: *“Will this challenge matter in 5 years?”* If not, don't give it more than 5 minutes of panic.

---

### The Resilience Checklist
- [ ] Take three deep belly breaths to calm your nervous system.
- [ ] Talk to yourself like you would speak to a friend who is struggling.
- [ ] Focus on taking just **one micro-step** forward today.`,
    estimatedTime: '6 mins',
    isCompleted: false
  },
  {
    id: 'emotional-intelligence',
    title: 'Emotional Intelligence',
    description:
      'Understanding your emotional triggers gives you an unbeatable superpower in school, sports, and life. This course breaks down self-awareness, active empathy, and stress regulation into actionable daily tools. Discover how to respond with calm clarity rather than reacting out of impulse.',
    audioUrl: 'https://assets.belyftd.org/audio/courses/emotional-intelligence.mp3',
    textContent: `# Emotional Intelligence (EQ): Mastering Your Internal Compass

> "Between stimulus and response there is a space. In that space is our power to choose our response." — Viktor Frankl

## The 4 Pillars of EQ
Emotional intelligence is not about suppressing feelings—it is about understanding them so they guide you rather than hijack you.

### 1. Self-Awareness
Naming the emotion before it controls you. Is it frustration, anxiety, hunger, or exhaustion?

### 2. Self-Management
Creating a pause between an emotional trigger and your physical response.
- **The 5-Second Pause**: Inhale for 4 seconds, hold for 2, exhale for 6 before typing back or replying angrily.

### 3. Social Awareness (Empathy)
Tuning into body language, vocal tone, and the unspoken needs of peers and mentors.

### 4. Relationship Leadership
Resolving disagreements with respect and expressing your needs without aggression.

---

### Reflection Exercise
Next time you feel a surge of frustration, write down:
- What triggered it?
- What physical sensation did I feel in my body?
- What is the most constructive response I can choose right now?`,
    estimatedTime: '8 mins',
    isCompleted: false
  },
  {
    id: 'goal-setting',
    title: 'Goal Setting',
    description:
      'A goal without a concrete structure is just a daydream waiting to evaporate. In this hands-on course, you will learn the S.M.A.R.T. goal framework and reverse-engineering techniques used by elite leaders. Turn your biggest ambitions into manageable weekly milestones.',
    audioUrl: 'https://assets.belyftd.org/audio/courses/goal-setting-framework.mp3',
    textContent: `# Goal Setting: Engineering Your Dreams Into Reality

> "A dream written down with a date becomes a goal. A goal broken down into steps becomes a plan."

## Why Vague Goals Fail
Saying *"I want to do better in math"* or *"I want to get fit"* rarely works because your brain needs clear coordinates. Clear targets generate targeted effort.

### The S.M.A.R.T.+ Execution Model
- **Specific**: Exactly what do you want to accomplish?
- **Measurable**: How will you know when you've reached it? (numbers, test scores, reps)
- **Achievable**: Is it realistic given your current season and resources?
- **Relevant**: Does this align with your personal vision and values?
- **Time-Bound**: What is the hard deadline?

### Reverse Engineering: The 30-Day Milestone Sprint
\`\`\`text
[ 90-Day Vision Target ]
       │
       ▼
[ 30-Day Critical Checkpoint ]
       │
       ▼
[ Weekly Must-Win Battles (3 Steps) ]
       │
       ▼
[ Today's 1 Non-Negotiable Action ]
\`\`\`

---

### Hands-On Quest
Draft one S.M.A.R.T. goal right now and add it to your **Quests** tab in Be Lyft'd!`,
    estimatedTime: '6 mins',
    isCompleted: false
  },
  {
    id: 'integrity-the-cornerstone-of-character',
    title: 'Integrity: The Cornerstone of Character',
    description:
      'Integrity is doing the right thing even when no one is watching and nobody will ever know. This module explores personal honor, honesty in the digital era, and standing firm in your values against peer pressure. Build an unshakeable reputation that opens doors for your future.',
    audioUrl: 'https://assets.belyftd.org/audio/courses/integrity-cornerstone.mp3',
    textContent: `# Integrity: The Cornerstone of Character

> "Reputation is who you are in public; character is who you are in the dark."

## The Bedrock of Self-Trust
Integrity is often defined as honesty with others, but its most powerful dimension is **honesty with yourself**. Every time you follow through on a promise you made to yourself, your self-esteem strengthens. Every time you cut corners or cheat, self-doubt creeps in.

### 3 Pillars of Youth Integrity
1. **Digital Integrity**: Not participating in online slander, gossip, or leaking private conversations.
2. **Academic & Athletic Honor**: Doing your own work and competing with true sportsmanship.
3. **Congruence**: Ensuring your private actions align with your public words.

### The "Mirror Test"
Before making a questionable decision, look in the mirror and ask: *“Will the person looking back at me be proud of this choice tomorrow morning?”*

---

### Key Takeaway
Integrity is rarely tested in massive crises; it is forged in small, unnoticed daily decisions.`,
    estimatedTime: '5 mins',
    isCompleted: false
  },
  {
    id: 'momentum-principles',
    title: 'Momentum Principles',
    description:
      'Objects in motion stay in motion—and the same rule applies to your productivity and personal drive. This course reveals how to break procrastination, engineer quick wins, and ride positive momentum loops. Learn how starting small creates an unstoppable chain reaction.',
    audioUrl: 'https://assets.belyftd.org/audio/courses/momentum-principles.mp3',
    textContent: `# Momentum Principles: Igniting the Flywheel of Progress

> "Action creates motivation, not the other way around."

## The Law of Personal Momentum
Newton's First Law of Motion states that an object at rest stays at rest, and an object in motion stays in motion. If you wait until you feel 100% motivated before starting a project or homework, you will lose weeks.

### The Physics of Quick Wins
\`\`\`text
[ Micro-Action ] ──> [ Dopamine Hit ] ──> [ Momentum ] ──> [ Bigger Win ]
\`\`\`

### 3 Strategies to Ignite Instant Momentum
- **The 5-Minute Rule**: Tell yourself you will work on the dreaded task for just 5 minutes. If you want to stop after 5, you can. 80% of the time, the friction disappears and you keep going.
- **The Lead Domino**: Identify the one task that makes everything else easier (e.g., getting a full 8 hours of sleep or clearing your desk).
- **Protect the Streak**: Never miss twice in a row.

---

### Challenge for Today
Pick the hardest task on your to-do list. Set a timer for 5 minutes and begin immediately.`,
    estimatedTime: '6 mins',
    isCompleted: false
  },
  {
    id: 'moral-compass',
    title: 'Moral Compass',
    description:
      'In a world full of noise, social media trends, and conflicting advice, having a grounded internal compass keeps you centered. This lesson guides youth through discovering their core values and moral courage. Learn how to navigate tough ethical dilemmas with conviction.',
    audioUrl: 'https://assets.belyftd.org/audio/courses/moral-compass.mp3',
    textContent: `# Moral Compass: Navigating the Storms of Life

> "Stand for something, or you will fall for anything."

## Calibrating Your True North
A physical compass doesn't control the terrain you walk on—it simply points True North so you don't get lost in the forest. Your **Moral Compass** is your internal set of principles that guides your decisions when peer pressure or social trends urge you off course.

### Discovering Your Core Value Triad
Choose 3 non-negotiable core values that define who you strive to be:
- *Courage*
- *Compassion*
- *Justice & Fairness*
- *Respect & Honor*
- *Wisdom & Curiosity*
- *Loyalty & Reliability*

### Practicing Moral Courage
Moral courage is speaking up when an injustice occurs, even when your voice shakes. It is standing beside a peer who is being excluded, even when it isn't socially convenient.

---

### Life Application
Write down your Top 3 Core Values on an index card or phone lockscreen. Use them as the litmus test for every major choice you make this week.`,
    estimatedTime: '7 mins',
    isCompleted: false
  }
];

export default coursesData;
