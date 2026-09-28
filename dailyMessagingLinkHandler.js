/**
 * =============================================================================
 * Be Lyft'd — Daily Messaging URL Query-Parameter Parser & Notification Handler
 * =============================================================================
 * Core Capabilities:
 * 1. Deep Link Parser: Automatically checks window.location for parameters:
 *    - ?courseId=<courseId> (e.g. ?courseId=changing-habits, ?courseId=goal-setting)
 *    - ?dailyMsg=true (auto-targets today's featured focus course, e.g. 'changing-habits')
 * 2. Bypass Home Screen: Directly triggers the course content audio player & modal.
 * 3. Developer Testing Widget Simulator: Simulates daily SMS / Push notifications with dropdown for all 10 core courses.
 * 4. Completion & Streak Engine: Records timestamp (ISO & Date) and computes/maintains consecutive day Streak Counter.
 */

export class DailyMessagingLinkHandler {
  static STORAGE_KEY_LAST_COMPLETION_DATE = 'belyftd_last_completion_date';
  static STORAGE_KEY_LAST_COMPLETION_TS = 'belyftd_last_completion_timestamp';
  static STORAGE_KEY_COMPLETED_COURSES = 'belyftd_completed_courses';
  static STORAGE_KEY_USER_PROFILE = 'belyftd_user_profile';

  static CORE_COURSES = [
    { id: 'changing-habits', title: '1. Changing Habits & Dopamine Mastery', category: 'Mindset & Science', duration: '6 mins' },
    { id: 'emotional-intelligence', title: '2. Emotional Intelligence & Self-Regulation', category: 'Emotional Strength', duration: '7 mins' },
    { id: 'growth-mindset', title: '3. Growth Mindset & Cognitive Reframing', category: 'Psychology', duration: '5 mins' },
    { id: 'active-listening', title: '4. Active Listening & Empathetic Communication', category: 'Relationship', duration: '6 mins' },
    { id: 'financial-literacy', title: '5. Youth Financial Literacy & Money Archetypes', category: 'Life Skills', duration: '8 mins' },
    { id: 'critical-thinking', title: '6. Critical Thinking & Decision Frameworks', category: 'Cognitive Strategy', duration: '7 mins' },
    { id: 'resilience-grit', title: '7. Resilience, Anti-Fragility & Mental Grit', category: 'Character', duration: '6 mins' },
    { id: 'conflict-resolution', title: '8. Constructive Conflict Resolution', category: 'Leadership', duration: '8 mins' },
    { id: 'goal-setting', title: '9. Vision Architecture & SMART-R Goals', category: 'Achievement', duration: '5 mins' },
    { id: 'public-speaking', title: '10. Confident Public Speaking & Oratory', category: 'Communication', duration: '7 mins' }
  ];

  constructor(options = {}) {
    this.options = Object.assign(
      {
        autoParseOnLoad: true,
        defaultDailyCourseId: 'changing-habits',
        onCourseTrigger: null,
        onStreakUpdate: null,
        toastContainerId: 'daily-messaging-toast-container'
      },
      options
    );

    if (this.options.autoParseOnLoad && typeof window !== 'undefined') {
      this.initUrlListener();
    }
  }

  /**
   * Initializes URL query-parameter evaluation on launch.
   */
  initUrlListener() {
    const params = this.parseQueryParams(window.location.search);
    if (params.courseId || params.isDailyMsg) {
      const targetCourseId = params.courseId || this.options.defaultDailyCourseId;
      console.log(`[DailyMessagingLinkHandler] Deep-link query detected for: ${targetCourseId} (dailyMsg=${params.isDailyMsg})`);
      
      // Allow slight delay for app hydration if needed
      setTimeout(() => {
        this.triggerCourseModal(targetCourseId, {
          source: params.isDailyMsg ? 'daily-sms' : 'deep-link',
          dailyMsg: params.isDailyMsg
        });
      }, 100);
    }
  }

  /**
   * Parses URL search query string into structured parameters
   * @param {string} queryString (e.g. "?courseId=changing-habits&dailyMsg=true")
   * @returns {{courseId: string|null, isDailyMsg: boolean, rawParams: Record<string, string>}}
   */
  parseQueryParams(queryString) {
    if (!queryString && typeof window !== 'undefined') {
      queryString = window.location.search;
    }

    const searchParams = new URLSearchParams(queryString || '');
    const courseId = searchParams.get('courseId') || null;
    const dailyMsgParam = searchParams.get('dailyMsg') || searchParams.get('daily') || searchParams.get('sms');
    const isDailyMsg = dailyMsgParam === 'true' || dailyMsgParam === '1';

    const rawParams = {};
    searchParams.forEach((val, key) => {
      rawParams[key] = val;
    });

    return {
      courseId,
      isDailyMsg,
      rawParams
    };
  }

  /**
   * Parses course ID from a raw URL or string
   * @param {string} urlOrSlug
   * @returns {string|null}
   */
  extractCourseId(urlOrSlug) {
    if (!urlOrSlug) return null;

    try {
      if (urlOrSlug.includes('courseId=')) {
        const match = urlOrSlug.match(/[?&]courseId=([^&#]+)/);
        if (match && match[1]) return decodeURIComponent(match[1]);
      }

      if (urlOrSlug.includes('dailyMsg=true') || urlOrSlug.includes('dailyMsg=1')) {
        const match = urlOrSlug.match(/[?&]courseId=([^&#]+)/);
        return match && match[1] ? decodeURIComponent(match[1]) : this.options.defaultDailyCourseId;
      }

      // Check if it's already a valid ID
      const matching = DailyMessagingLinkHandler.CORE_COURSES.find(c => c.id === urlOrSlug.trim());
      if (matching) return matching.id;

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Bypasses the home screen and directly triggers the course content modal/player
   * @param {string} courseId
   * @param {object} metadata
   */
  triggerCourseModal(courseId, metadata = {}) {
    const course = DailyMessagingLinkHandler.CORE_COURSES.find(c => c.id === courseId) || {
      id: courseId,
      title: courseId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      duration: '6 mins'
    };

    // 1. Invoke custom callback if registered
    if (typeof this.options.onCourseTrigger === 'function') {
      this.options.onCourseTrigger(course, metadata);
    }

    // 2. Dispatch a standard browser custom event
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('belyftd:open-course-player', {
        detail: { course, courseId: course.id, metadata }
      });
      window.dispatchEvent(event);
    }

    console.log(`[DailyMessagingLinkHandler] Bypassed home screen -> Triggered course player for: "${course.title}"`);
  }

  /**
   * Records course completion timestamp and computes/maintains streak count
   * @param {string} courseId
   * @returns {{streakDays: number, timestamp: string, isConsecutiveDay: boolean}}
   */
  recordCompletionAndMaintainStreak(courseId) {
    const now = new Date();
    const nowIso = now.toISOString();
    const todayDateStr = nowIso.split('T')[0]; // YYYY-MM-DD

    let lastDateStr = null;
    let completedCourses = [];
    let userProfile = { streakDays: 0, totalXp: 350 };

    if (typeof localStorage !== 'undefined') {
      try {
        lastDateStr = localStorage.getItem(DailyMessagingLinkHandler.STORAGE_KEY_LAST_COMPLETION_DATE);
        
        const rawCompleted = localStorage.getItem(DailyMessagingLinkHandler.STORAGE_KEY_COMPLETED_COURSES);
        if (rawCompleted) completedCourses = JSON.parse(rawCompleted);
        
        const rawProfile = localStorage.getItem(DailyMessagingLinkHandler.STORAGE_KEY_USER_PROFILE);
        if (rawProfile) userProfile = JSON.parse(rawProfile);
      } catch (e) {
        console.warn('Storage read note:', e);
      }
    }

    // 1. Add to completed courses list
    if (!completedCourses.includes(courseId)) {
      completedCourses.push(courseId);
    }

    // 2. Calculate Streak
    let currentStreak = userProfile.streakDays || 0;
    let isConsecutiveDay = false;

    if (!lastDateStr) {
      currentStreak = Math.max(1, currentStreak);
      isConsecutiveDay = true;
    } else if (lastDateStr === todayDateStr) {
      // Completed already today; maintain streak
      if (currentStreak === 0) currentStreak = 1;
    } else {
      const lastDate = new Date(lastDateStr);
      const diffMs = now.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        currentStreak += 1;
        isConsecutiveDay = true;
      } else if (diffDays > 1) {
        // Lapsed
        currentStreak = 1;
        isConsecutiveDay = true;
      } else {
        currentStreak = Math.max(1, currentStreak);
      }
    }

    // 3. Save to localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(DailyMessagingLinkHandler.STORAGE_KEY_LAST_COMPLETION_DATE, todayDateStr);
        localStorage.setItem(DailyMessagingLinkHandler.STORAGE_KEY_LAST_COMPLETION_TS, nowIso);
        localStorage.setItem(DailyMessagingLinkHandler.STORAGE_KEY_COMPLETED_COURSES, JSON.stringify(completedCourses));

        userProfile.streakDays = currentStreak;
        userProfile.totalXp = (userProfile.totalXp || 350) + 100;
        userProfile.lastActiveDate = todayDateStr;
        userProfile.updatedAt = nowIso;
        localStorage.setItem(DailyMessagingLinkHandler.STORAGE_KEY_USER_PROFILE, JSON.stringify(userProfile));
      } catch (e) {
        console.warn('Storage write note:', e);
      }
    }

    const streakResult = {
      streakDays: currentStreak,
      timestamp: nowIso,
      todayDateStr,
      isConsecutiveDay
    };

    if (typeof this.options.onStreakUpdate === 'function') {
      this.options.onStreakUpdate(streakResult);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('belyftd:streak-updated', { detail: streakResult }));
    }

    return streakResult;
  }

  /**
   * Simulates an incoming SMS / Daily messaging deep-link with visual interactive toast
   * @param {string} courseId
   * @param {boolean} withDailyMsgParam
   */
  simulateDailySmsLink(courseId, withDailyMsgParam = true) {
    const course = DailyMessagingLinkHandler.CORE_COURSES.find(c => c.id === courseId) || DailyMessagingLinkHandler.CORE_COURSES[0];
    const generatedUrl = `https://belyftd.org/app?courseId=${course.id}${withDailyMsgParam ? '&dailyMsg=true' : ''}`;

    console.log(`[DailyMessagingLinkHandler] Simulating Daily SMS link for "${course.title}": ${generatedUrl}`);

    // Trigger in-app toast notification with direct action button
    this.displayNotificationToast({
      title: '💬 Be Lyft\'d Daily Push SMS',
      body: `Hey Leader! Today's 6-min Daily Lyft is ready: "${course.title}". Tap to play audio now.`,
      courseId: course.id,
      link: generatedUrl,
      course
    });
  }

  /**
   * Renders simulated SMS Notification Toast in DOM
   */
  displayNotificationToast(payload) {
    if (typeof document === 'undefined') return;

    let container = document.getElementById(this.options.toastContainerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.options.toastContainerId;
      container.className = 'fixed top-5 right-5 z-50 max-w-sm w-full space-y-2 pointer-events-none';
      document.body.appendChild(container);
    }

    const toastEl = document.createElement('div');
    toastEl.className = 'pointer-events-auto bg-slate-900/95 text-white border border-indigo-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md transform transition-all duration-300 translate-y-[-20px] opacity-0';

    toastEl.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-indigo-300 font-display uppercase tracking-wider">${payload.title}</h4>
            <span class="text-[10px] text-slate-400">Just now</span>
          </div>
          <p class="text-xs text-slate-200 mt-1 leading-snug">${payload.body}</p>
          <div class="mt-3 flex items-center gap-2">
            <button id="toast-action-btn-${Date.now()}" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition cursor-pointer shadow-xs">
              ⚡ Open Course Player
            </button>
            <span class="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">${payload.courseId}</span>
          </div>
        </div>
      </div>
    `;

    container.appendChild(toastEl);

    // Animate in
    requestAnimationFrame(() => {
      toastEl.classList.remove('translate-y-[-20px]', 'opacity-0');
    });

    // Button event handler
    const actionBtn = toastEl.querySelector('button');
    if (actionBtn) {
      actionBtn.addEventListener('click', () => {
        this.triggerCourseModal(payload.courseId, { source: 'toast-click' });
        this._dismissToast(toastEl);
      });
    }

    // Auto-dismiss after 6.5 seconds
    setTimeout(() => {
      this._dismissToast(toastEl);
    }, 6500);
  }

  _dismissToast(toastEl) {
    if (!toastEl || !toastEl.parentNode) return;
    toastEl.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
      if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    }, 300);
  }
}

// Global Browser Window attachment
if (typeof window !== 'undefined') {
  window.DailyMessagingLinkHandler = DailyMessagingLinkHandler;
}
