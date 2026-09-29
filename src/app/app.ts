import {ChangeDetectionStrategy, Component, computed, inject, signal, effect} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {AudioPlayerService} from './services/audio-player.service';
import {MentorshipDataService} from './services/mentorship-data.service';
import {ThemeAccessibilityService} from './services/theme-accessibility.service';
import {AiMentorService} from './services/ai-mentor.service';
import {FirebaseService} from './services/firebase.service';
import {PwaInstallService} from './services/pwa-install.service';
import {DailyMessageSchedulerService} from './services/daily-message-scheduler.service';
import {AudioTrack, Mentor, GoalQuest, CommunityPost, VoiceJournal} from './models/app.models';
import {AudioPlayerComponent} from './components/audio-player.component';
import {VoiceRecorderComponent} from './components/voice-recorder.component';
import {MentorChatDialogComponent} from './components/mentor-chat-dialog.component';
import {CustomPepTalkModalComponent} from './components/custom-pep-talk-modal.component';
import {ProfileModalComponent} from './components/profile-modal.component';
import {CourseModalComponent} from './components/course-modal.component';
import {RegisterModalComponent} from './components/register-modal.component';
import {PartnerWithUsComponent} from './components/partner-page.component';
import {PostAuthOnboardingWizardComponent} from './components/post-auth-onboarding-wizard.component';
import {Course} from './models/app.models';

export type MainTab = 'daily-lyft' | 'courses' | 'mentors' | 'quests' | 'coach-spark' | 'community' | 'partners' | 'profile';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    AudioPlayerComponent,
    VoiceRecorderComponent,
    MentorChatDialogComponent,
    CustomPepTalkModalComponent,
    ProfileModalComponent,
    CourseModalComponent,
    RegisterModalComponent,
    PartnerWithUsComponent,
    PostAuthOnboardingWizardComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly audioPlayer = inject(AudioPlayerService);
  readonly dataService = inject(MentorshipDataService);
  readonly themeService = inject(ThemeAccessibilityService);
  readonly aiService = inject(AiMentorService);
  readonly firebaseService = inject(FirebaseService);
  readonly pwaService = inject(PwaInstallService);
  readonly dailyMessageScheduler = inject(DailyMessageSchedulerService);

  // Active Tab navigation
  readonly activeTab = signal<MainTab>('daily-lyft');

  // Modals state
  readonly showVoiceRecorder = signal<boolean>(false);
  readonly activeChatMentor = signal<Mentor | null>(null);
  readonly showCustomPepTalk = signal<boolean>(false);
  readonly showProfileModal = signal<boolean>(false);
  readonly showRegisterModal = signal<boolean>(false);
  readonly showPostAuthOnboarding = signal<boolean>(false);
  private readonly hasResolvedInitialAuth = signal<boolean>(false);
  readonly showStreakModal = signal<boolean>(false);
  readonly showNewQuestModal = signal<boolean>(false);

  // PWA banner computed & feedback
  readonly showPwaInstallBanner = computed(() => this.pwaService.showInstallBanner());
  readonly pwaManualGuideMessage = signal<string | null>(null);

  // Developer Testing Widget & Notification State
  readonly isDevWidgetVisible = signal<boolean>(false);
  readonly isDevWidgetCollapsed = signal<boolean>(false);
  readonly selectedDevCourseId = signal<string>('changing-habits');
  readonly devIncludeDailyMsg = signal<boolean>(true);
  readonly streakNotificationToast = signal<{streak: number; timestamp: string; isNewDay: boolean; dateStr: string} | null>(null);

  // Simulated Web Notification Toast
  readonly simulatedNotificationToast = signal<{title: string; body: string; courseId: string; link: string} | null>(null);

  // Greeting computed property
  readonly userFirstName = computed(() => {
    const fbName = this.firebaseService.userProfile()?.displayName;
    if (fbName) {
      return fbName.split(' ')[0];
    }
    return this.dataService.userProfile().name.split(' ')[0] || 'Leader';
  });

  constructor() {
    effect(() => {
      const authLoading = this.firebaseService.authLoading();
      if (typeof window === 'undefined' || authLoading || this.hasResolvedInitialAuth()) return;
      this.hasResolvedInitialAuth.set(true);
      this.showRegisterModal.set(!this.firebaseService.hasActiveSession());
    });

    effect(() => {
      const authLoading = this.firebaseService.authLoading();
      const currentUser = this.firebaseService.currentUser();
      const profile = this.firebaseService.userProfile();
      const registerModalOpen = this.showRegisterModal();
      if (typeof window === 'undefined' || authLoading || !this.hasResolvedInitialAuth()) return;
      if (!currentUser) {
        this.showPostAuthOnboarding.set(false);
        return;
      }
      if (registerModalOpen) return;

      const needsOnboarding = !profile?.ageBracket ||
        !profile.country ||
        !profile.preferredLanguage ||
        !profile.avatarUrl ||
        !profile.focusAreas?.length ||
        !profile.selectedMentorIds?.length;
      this.showPostAuthOnboarding.set(needsOnboarding);
    });

    // Watch for deep links (e.g. from URL ?courseId=... or simulated push notifications)
    effect(() => {
      const targetId = this.firebaseService.targetCourseIdFromNotification();
      if (targetId) {
        this.openCourseById(targetId);
      }
    });

    // Watch for streak updates
    effect(() => {
      const streakEvent = this.firebaseService.streakUpdateEvent();
      if (streakEvent) {
        this.dataService.userProfile.update(p => ({
          ...p,
          streakDays: streakEvent.streak
        }));
        this.streakNotificationToast.set(streakEvent);
        setTimeout(() => {
          this.streakNotificationToast.set(null);
        }, 5000);
      }
    });
  }

  openRegisterModal(): void {
    if (!this.firebaseService.authLoading() && !this.firebaseService.hasActiveSession()) {
      this.showRegisterModal.set(true);
    }
  }

  handleProfileLogout(): void {
    this.showProfileModal.set(false);
    this.showPostAuthOnboarding.set(false);
    this.showRegisterModal.set(true);
  }

  editProfileOnboarding(): void {
    this.showProfileModal.set(false);
    this.showPostAuthOnboarding.set(true);
  }

  // Filter States
  readonly audioCategoryFilter = signal<string>('All');
  readonly mentorSpecialtyFilter = signal<string>('All');
  readonly mentorAgeBracketFilter = signal<string>('All');
  readonly mentorAgeBrackets = [
    {value: 'All', label: 'All ages'},
    {value: 'Under 18', label: 'Under 18'},
    {value: '18-24', label: '18–24'},
    {value: '25-34', label: '25–34'},
    {value: '35+', label: '35+'},
  ];
  readonly communityPostFilter = signal<string>('All');
  readonly courseFilter = signal<'all' | 'completed' | 'in-progress'>('all');

  // Quick Mood reaction state
  readonly activeMoodPrompt = signal<{mood: string; advice: string; trackId: string} | null>(null);

  // Course metrics
  readonly completedCoursesCount = computed(() => {
    return this.dataService.courses().filter(c => c.isCompleted).length;
  });

  readonly totalCoursesCount = computed(() => {
    return this.dataService.courses().length;
  });

  readonly coursesProgressPercent = computed(() => {
    const total = this.totalCoursesCount();
    if (!total) return 0;
    return Math.round((this.completedCoursesCount() / total) * 100);
  });

  readonly todaysLesson = computed(() => {
    const list = this.dataService.courses();
    return list.find(c => !c.isCompleted) || list[0];
  });

  readonly filteredCourses = computed(() => {
    const filter = this.courseFilter();
    const list = this.dataService.courses();
    if (filter === 'completed') return list.filter(c => c.isCompleted);
    if (filter === 'in-progress') return list.filter(c => !c.isCompleted);
    return list;
  });

  startTodaysLesson(): void {
    const lesson = this.todaysLesson();
    if (lesson) {
      this.dataService.openCourse(lesson);
    }
  }

  openCourse(c: Course): void {
    this.dataService.openCourse(c);
  }

  openCourseById(courseId: string): void {
    this.dataService.openCourseById(courseId);
    this.themeService.announce(`Opening lesson ${courseId}`);
  }

  closeCourseModal(): void {
    this.dataService.closeCourse();
  }

  /**
   * Developer Testing Tool: Simulates incoming SMS deep-link link
   * e.g. "?courseId=changing-habits&dailyMsg=true"
   * Automatically bypasses home screen and opens the course content player.
   */
  simulateDailySmsLink(courseId?: string, withDailyMsg?: boolean): void {
    const targetCourseId = courseId || this.selectedDevCourseId();
    const includeDaily = withDailyMsg !== undefined ? withDailyMsg : this.devIncludeDailyMsg();
    const course = this.dataService.courses().find(c => c.id === targetCourseId) || this.dataService.courses()[0];

    const link = `https://belyftd.org/app?courseId=${targetCourseId}${includeDaily ? '&dailyMsg=true' : ''}`;

    // Show simulated notification toast with deep-link trigger
    this.simulatedNotificationToast.set({
      title: '💬 Be Lyft\'d Daily Push SMS',
      body: `Hey ${this.userFirstName()}! Today's Daily Lyft is live: "${course.title}". Tap to play audio now.`,
      courseId: targetCourseId,
      link
    });

    // Directly trigger the Course Content modal/player, bypassing the main home screen
    this.firebaseService.handleIncomingNotification({
      title: 'Daily SMS Link Alert',
      body: `Opening course: ${course.title}`,
      deepLinkUrl: link
    });

    this.themeService.announce(`Simulating Daily SMS Link for ${course.title}`);
  }

  /**
   * Simulates receiving an incoming Web Push / Daily Message notification
   * with deep-link URL e.g. "https://app.belyftd.org?courseId=changing-habits"
   */
  triggerSimulatedNotification(courseId = 'changing-habits', courseTitle?: string): void {
    this.simulateDailySmsLink(courseId);
    if (courseTitle) {
      this.themeService.announce(`Daily Lyft: ${courseTitle}`);
    }
  }

  openFromNotificationToast(): void {
    const toast = this.simulatedNotificationToast();
    if (toast) {
      this.firebaseService.handleIncomingNotification({
        title: toast.title,
        body: toast.body,
        deepLinkUrl: toast.link
      });
      this.simulatedNotificationToast.set(null);
    }
  }

  dismissSimulatedNotification(): void {
    this.simulatedNotificationToast.set(null);
  }

  toggleDevWidgetCollapse(): void {
    this.isDevWidgetCollapsed.update(c => !c);
  }

  hideDevWidget(): void {
    this.isDevWidgetVisible.set(false);
  }

  showDevWidget(): void {
    this.isDevWidgetVisible.set(true);
    this.isDevWidgetCollapsed.set(false);
  }

  // Forms
  readonly newQuestForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    category: new FormControl<'Academic' | 'Wellness' | 'Career' | 'Life Skills' | 'Creative'>('Career', [Validators.required]),
    deadline: new FormControl('In 2 weeks', [Validators.required]),
    step1: new FormControl('', [Validators.required]),
    step2: new FormControl(''),
    step3: new FormControl(''),
  });

  readonly newPostForm = new FormGroup({
    content: new FormControl('', [Validators.required]),
    type: new FormControl<CommunityPost['type']>('win', [Validators.required]),
    tagInput: new FormControl('#YouthWins #BeLyftd'),
  });

  readonly coachChatForm = new FormGroup({
    prompt: new FormControl('', [Validators.required]),
  });

  // Computed lists
  readonly filteredTracks = computed(() => {
    const cat = this.audioCategoryFilter();
    const list = this.dataService.audioTracks();
    if (cat === 'All') return list;
    return list.filter(t => t.category === cat);
  });

  readonly filteredMentors = computed(() => {
    const specialtyFilter = this.mentorSpecialtyFilter();
    const ageBracketFilter = this.mentorAgeBracketFilter();
    const list = this.dataService.mentors();
    return list.filter(mentor => {
      const matchesSpecialty = specialtyFilter === 'All' || mentor.specialties.some(specialty =>
        specialty.toLowerCase().includes(specialtyFilter.toLowerCase())
      );
      const matchesAgeBracket = ageBracketFilter === 'All' || mentor.ageBrackets?.includes(ageBracketFilter);
      return matchesSpecialty && matchesAgeBracket;
    });
  });

  readonly filteredCommunityPosts = computed(() => {
    const filter = this.communityPostFilter();
    const list = this.dataService.communityPosts();
    if (filter === 'All') return list;
    return list.filter(p => p.type === filter);
  });

  readonly totalQuestXp = computed(() => {
    return this.dataService.goalQuests().reduce((acc, quest) => {
      const questXp = quest.steps.reduce((sum, s) => s.completed ? sum + s.xp : sum, 0);
      return acc + questXp;
    }, 0);
  });

  readonly completedStepsCount = computed(() => {
    return this.dataService.goalQuests().reduce((acc, quest) => {
      return acc + quest.steps.filter(s => s.completed).length;
    }, 0);
  });

  readonly totalStepsCount = computed(() => {
    return this.dataService.goalQuests().reduce((acc, quest) => {
      return acc + quest.steps.length;
    }, 0);
  });

  readonly growthProgressPercent = computed(() => {
    const total = this.totalStepsCount();
    if (!total) return 85;
    return Math.round((this.completedStepsCount() / total) * 100);
  });

  readonly Math = Math;

  // Mood Quick Check-in presets
  readonly moodCheckins = [
    {
      mood: '⚡ Hyped & Ready',
      emoji: '⚡',
      advice: 'You have tremendous momentum right now! Channel this energy into your biggest quest step today.',
      trackId: 'track-1',
    },
    {
      mood: '😰 Nervous / Doubting',
      emoji: '😰',
      advice: 'Pause and take 3 deep breaths. Nervousness is just excitement without breath. You belong here.',
      trackId: 'track-2',
    },
    {
      mood: '😴 Low Energy / Tired',
      emoji: '😴',
      advice: 'Do not quit on yourself. Rest if you must, but take 1 tiny step before wrapping up.',
      trackId: 'track-3',
    },
    {
      mood: '🎯 Laser Focused',
      emoji: '🎯',
      advice: 'Lock in. Eliminate distractions and conquer your top priority for the next 25 minutes.',
      trackId: 'track-3',
    },
    {
      mood: '🌧️ Overwhelmed',
      emoji: '🌧️',
      advice: 'You do not have to solve the entire semester or career today. Just handle the next 10 minutes.',
      trackId: 'track-5',
    }
  ];

  setMoodCheckin(item: typeof this.moodCheckins[0]): void {
    this.activeMoodPrompt.set({
      mood: item.mood,
      advice: item.advice,
      trackId: item.trackId,
    });
    this.themeService.announce(`Mood updated to ${item.mood}`);
  }

  playMoodTrack(trackId: string): void {
    const track = this.dataService.audioTracks().find(t => t.id === trackId);
    if (track) {
      this.audioPlayer.playTrack(track);
    }
  }

  openMentorChat(mentor: Mentor): void {
    this.activeChatMentor.set(mentor);
  }

  closeMentorChat(): void {
    this.activeChatMentor.set(null);
  }

  submitNewQuest(): void {
    if (!this.newQuestForm.valid) return;
    const formVal = this.newQuestForm.value;

    const steps = [
      {id: `s-${Date.now()}-1`, title: formVal.step1 || 'Step 1', completed: false, xp: 50},
    ];
    if (formVal.step2?.trim()) {
      steps.push({id: `s-${Date.now()}-2`, title: formVal.step2.trim(), completed: false, xp: 60});
    }
    if (formVal.step3?.trim()) {
      steps.push({id: `s-${Date.now()}-3`, title: formVal.step3.trim(), completed: false, xp: 90});
    }

    const newQuest: GoalQuest = {
      id: `quest-${Date.now()}`,
      title: formVal.title || 'New Quest',
      category: formVal.category || 'Career',
      deadline: formVal.deadline || 'In 2 weeks',
      steps,
      status: 'in-progress',
    };

    this.dataService.addGoalQuest(newQuest);
    this.newQuestForm.reset({
      category: 'Career',
      deadline: 'In 2 weeks',
    });
    this.showNewQuestModal.set(false);
    this.themeService.announce(`New quest ${newQuest.title} created`);
  }

  submitCommunityPost(): void {
    if (!this.newPostForm.valid) return;
    const {content, type, tagInput} = this.newPostForm.value;
    if (!content) return;

    this.dataService.addCommunityPost(type || 'win', content, tagInput || '');
    this.newPostForm.reset({
      type: 'win',
      tagInput: '#YouthWins #BeLyftd'
    });
    this.themeService.announce('Post published to Hype Wall');
  }

  async sendCoachSparkMessage(): Promise<void> {
    const prompt = this.coachChatForm.value.prompt;
    if (!prompt?.trim()) return;

    const user = this.dataService.userProfile();
    this.coachChatForm.reset();
    await this.aiService.askCoach(prompt, user.name.split(' ')[0], user.focusAreas.join(', '));
  }

  askCoachQuickQuestion(question: string): void {
    const user = this.dataService.userProfile();
    this.aiService.askCoach(question, user.name.split(' ')[0], user.focusAreas.join(', '));
  }

  speakAiResponse(text: string): void {
    this.audioPlayer.speakCustomScript(
      'Coach Spark Voice Guidance',
      text,
      'Coach Spark (AI Mentor)',
      'Mindset'
    );
  }

  /**
   * Triggers the native browser PWA install prompt when the banner is clicked.
   */
  async handleInstallBannerClick(): Promise<void> {
    const outcome = await this.pwaService.promptInstall();
    if (outcome === 'accepted') {
      this.themeService.announce("Be Lyft'd is now installing to your home screen!");
    } else if (outcome === 'unsupported') {
      // Show manual install guidance toast for iOS or browsers without native prompt
      this.pwaManualGuideMessage.set(
        "To install on iOS or desktop: Tap your browser Share icon (or menu ⋮) and select 'Add to Home Screen'."
      );
      setTimeout(() => {
        this.pwaManualGuideMessage.set(null);
      }, 7000);
    }
  }

  /**
   * Dismisses the top install banner when 'Got it' is clicked.
   */
  dismissPwaBanner(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.pwaService.dismissBanner();
    this.themeService.announce('Install banner dismissed.');
  }

  playRecordedJournal(journal: VoiceJournal): void {
    if (journal.audioBlobUrl) {
      const mockTrack: AudioTrack = {
        id: journal.id,
        title: journal.title,
        speaker: this.dataService.userProfile().name,
        speakerRole: 'My Voice Reflection',
        speakerAvatar: this.dataService.userProfile().avatar,
        category: 'Wellness',
        duration: `0:${journal.durationSec < 10 ? '0' : ''}${journal.durationSec}`,
        durationSec: journal.durationSec,
        audioUrl: journal.audioBlobUrl,
        transcript: `Reflection on: "${journal.prompt}" (Mood: ${journal.mood})`,
        moodTags: ['Journal', journal.mood],
        likes: 1,
        isFavorite: true,
      };
      this.audioPlayer.playTrack(mockTrack);
    } else {
      this.audioPlayer.speakCustomScript(
        journal.title,
        `This was your personal audio check-in: "${journal.prompt}". Your recorded mood was ${journal.mood}. Be proud of taking time to reflect on your journey.`,
        this.dataService.userProfile().name,
        'Wellness'
      );
    }
  }
}
