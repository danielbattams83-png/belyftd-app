/**
 * @fileoverview Standalone View Controller for the Be Lyft'd Course Content Screen.
 * 
 * Provides end-to-end management for:
 * 1. Top navigation back to course catalog/dashboard
 * 2. Course Title and estimated duration header presentation
 * 3. Interactive HTML5 Audio Player with custom scrubber, duration counters, play/pause controls
 * 4. Markdown text parsing and typography-rich reader area
 * 5. Lesson completion workflow with XP reward confirmation toast and redirect callback
 * 
 * @module CourseContentController
 */

/**
 * @typedef {Object} Course
 * @property {string} id - Unique slug for the course
 * @property {string} title - Full course title
 * @property {string} description - Overview/synopsis of the course
 * @property {string} audioUrl - Audio stream source URL
 * @property {string} textContent - Markdown formatted lesson content
 * @property {string} estimatedTime - Estimated duration (e.g., '6 mins')
 * @property {boolean} isCompleted - Completion flag
 */

/**
 * @typedef {Object} ControllerOptions
 * @property {Course} course - The course model instance to display
 * @property {string} [rootSelector='#course-screen-root'] - DOM container selector
 * @property {function(string): void} [onComplete] - Callback when course is marked complete
 * @property {function(): void} [onNavigateBack] - Callback when back button is pressed
 * @property {function(): void} [onRedirectDashboard] - Callback for dashboard redirect
 */

export class CourseContentController {
  /**
   * Initializes the Course Content View Controller.
   * @param {ControllerOptions} options
   */
  constructor(options = {}) {
    if (!options.course) {
      throw new Error('[CourseContentController] A valid course object is required.');
    }

    this.course = { ...options.course };
    this.rootSelector = options.rootSelector || '#course-screen-root';
    this.onComplete = options.onComplete || ((id) => console.log(`Course ${id} completed.`));
    this.onNavigateBack = options.onNavigateBack || (() => window.history.back());
    this.onRedirectDashboard = options.onRedirectDashboard || (() => {
      window.location.hash = '#/dashboard';
    });

    // Internal Audio Player State
    this.audioElement = null;
    this.isPlaying = false;
    this.isScrubbing = false;
    this.duration = 0;
    this.currentTime = 0;

    // Bound Event Handlers
    this._handleTimeUpdate = this._handleTimeUpdate.bind(this);
    this._handleLoadedMetadata = this._handleLoadedMetadata.bind(this);
    this._handleAudioEnded = this._handleAudioEnded.bind(this);
    this._handleAudioError = this._handleAudioError.bind(this);
  }

  /**
   * Mounts the controller and attaches all event listeners to the DOM.
   */
  mount() {
    this._cacheDomElements();
    this._renderHeaderAndMeta();
    this._renderMarkdownContent();
    this._initAudioPlayer();
    this._bindUserInteractions();
    this._updateCompletionButtonUI();
  }

  /**
   * Caches references to DOM elements in the view.
   * @private
   */
  _cacheDomElements() {
    this.rootEl = document.querySelector(this.rootSelector) || document.body;

    // Navigation & Header Elements
    this.btnBack = this.rootEl.querySelector('#btn-back-to-catalog');
    this.titleText = this.rootEl.querySelector('#course-title-text');
    this.durationText = this.rootEl.querySelector('#course-duration-text');
    this.statusBadge = this.rootEl.querySelector('#course-status-badge');
    this.descriptionText = this.rootEl.querySelector('#course-description-text');

    // Audio Widget Elements
    this.audioElement = this.rootEl.querySelector('#course-html5-audio');
    this.btnAudioToggle = this.rootEl.querySelector('#btn-audio-toggle');
    this.playPauseIcon = this.rootEl.querySelector('#play-pause-icon');
    this.timelineSlider = this.rootEl.querySelector('#audio-timeline-slider');
    this.currentTimeDisplay = this.rootEl.querySelector('#audio-current-time');
    this.totalDurationDisplay = this.rootEl.querySelector('#audio-total-duration');
    this.trackTitle = this.rootEl.querySelector('#player-track-title');
    this.trackSubtitle = this.rootEl.querySelector('#player-track-subtitle');

    // Reader Area Element
    this.readerContent = this.rootEl.querySelector('#course-text-reader-content');

    // Completion & Overlay Elements
    this.btnMarkComplete = this.rootEl.querySelector('#btn-mark-complete');
    this.btnCompleteText = this.rootEl.querySelector('#btn-complete-text');
    this.successOverlay = this.rootEl.querySelector('#success-confirmation-overlay');
    this.btnRedirectDashboard = this.rootEl.querySelector('#btn-redirect-dashboard');
  }

  /**
   * Populates the title, estimated time, and synopsis.
   * @private
   */
  _renderHeaderAndMeta() {
    if (this.titleText) this.titleText.textContent = this.course.title;
    if (this.durationText) this.durationText.textContent = this.course.estimatedTime;
    if (this.descriptionText) this.descriptionText.textContent = this.course.description;

    if (this.trackTitle) this.trackTitle.textContent = `${this.course.title} (Narration)`;
    if (this.trackSubtitle) this.trackSubtitle.textContent = `Estimated Lesson Time: ${this.course.estimatedTime}`;

    this._updateStatusBadge();
  }

  /**
   * Updates the in-progress / completed status badge in the header.
   * @private
   */
  _updateStatusBadge() {
    if (!this.statusBadge) return;

    if (this.course.isCompleted) {
      this.statusBadge.innerHTML = `
        <span class="material-icons-outlined" style="color:var(--success);">check_circle</span>
        <span style="color:var(--success); font-weight:700;">Completed</span>
      `;
    } else {
      this.statusBadge.innerHTML = `
        <span class="material-icons-outlined">radio_button_unchecked</span>
        <span>In Progress</span>
      `;
    }
  }

  /**
   * Parses Markdown syntax to clean HTML for the reader area.
   * @private
   */
  _renderMarkdownContent() {
    if (!this.readerContent) return;

    const rawMarkdown = this.course.textContent || '';
    const parsedHtml = this._parseMarkdown(rawMarkdown);
    this.readerContent.innerHTML = parsedHtml;
  }

  /**
   * Lightweight, robust Markdown to HTML parser.
   * Handles headings, blockquotes, bold/italic, lists, code blocks, dividers.
   * @param {string} md - Markdown string
   * @returns {string} Safe HTML string
   * @private
   */
  _parseMarkdown(md) {
    if (!md) return '<p>No lesson content available.</p>';

    let html = md
      // Escape basic HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Code blocks ```
      .replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Horizontal Rules
      .replace(/^---$/gm, '<hr />')
      // Headings
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Blockquotes
      .replace(/^\&gt; (.*$)/gim, '<blockquote>$1</blockquote>')
      // Bold and Italics
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Unordered lists (- item or * item)
      .replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');

    // Wrap adjacent <li> in <ul>
    html = html.replace(/(<li>.*<\/li>(\s*<li>.*<\/li>)*)/g, '<ul>$1</ul>');

    // Paragraphs: Wrap lines that aren't tags
    const paragraphs = html
      .split('\n\n')
      .map((block) => {
        const trimmed = block.trim();
        if (
          !trimmed.startsWith('<h') &&
          !trimmed.startsWith('<blockquote') &&
          !trimmed.startsWith('<pre') &&
          !trimmed.startsWith('<ul') &&
          !trimmed.startsWith('<hr')
        ) {
          return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
        }
        return trimmed;
      })
      .join('\n');

    return paragraphs;
  }

  /**
   * Configures the HTML5 Audio element and listeners.
   * @private
   */
  _initAudioPlayer() {
    if (!this.audioElement) return;

    this.audioElement.src = this.course.audioUrl || '';
    this.audioElement.addEventListener('timeupdate', this._handleTimeUpdate);
    this.audioElement.addEventListener('loadedmetadata', this._handleLoadedMetadata);
    this.audioElement.addEventListener('ended', this._handleAudioEnded);
    this.audioElement.addEventListener('error', this._handleAudioError);

    // Default duration calculation based on estimatedTime if metadata isn't ready
    const minutesMatch = (this.course.estimatedTime || '').match(/\d+/);
    const estimatedSeconds = minutesMatch ? parseInt(minutesMatch[0], 10) * 60 : 300;
    if (this.totalDurationDisplay) {
      this.totalDurationDisplay.textContent = this._formatTime(estimatedSeconds);
    }
  }

  /**
   * Binds UI click, drag, and toggle handlers.
   * @private
   */
  _bindUserInteractions() {
    // Back navigation
    if (this.btnBack) {
      this.btnBack.addEventListener('click', () => {
        this._stopAudio();
        this.onNavigateBack();
      });
    }

    // Play/Pause button
    if (this.btnAudioToggle) {
      this.btnAudioToggle.addEventListener('click', () => this.toggleAudioPlayback());
    }

    // Scrubber / timeline events
    if (this.timelineSlider) {
      this.timelineSlider.addEventListener('input', (e) => {
        this.isScrubbing = true;
        const seekPercent = parseFloat(e.target.value);
        const duration = this.audioElement.duration || this.duration || 1;
        const seekTime = (seekPercent / 100) * duration;
        if (this.currentTimeDisplay) {
          this.currentTimeDisplay.textContent = this._formatTime(seekTime);
        }
      });

      this.timelineSlider.addEventListener('change', (e) => {
        const seekPercent = parseFloat(e.target.value);
        const duration = this.audioElement.duration || this.duration || 1;
        this.audioElement.currentTime = (seekPercent / 100) * duration;
        this.isScrubbing = false;
      });
    }

    // Mark as Complete button
    if (this.btnMarkComplete) {
      this.btnMarkComplete.addEventListener('click', () => this.markAsComplete());
    }

    // Dashboard redirect after completion confirmation
    if (this.btnRedirectDashboard) {
      this.btnRedirectDashboard.addEventListener('click', () => {
        if (this.successOverlay) {
          this.successOverlay.classList.remove('active');
        }
        this.onRedirectDashboard();
      });
    }
  }

  /**
   * Toggles audio playback (with Web Speech fallback if offline / asset mock).
   */
  toggleAudioPlayback() {
    if (!this.audioElement) return;

    if (this.isPlaying) {
      this.pauseAudio();
    } else {
      this.playAudio();
    }
  }

  /**
   * Plays lesson audio.
   */
  playAudio() {
    if (!this.audioElement) return;

    const playPromise = this.audioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this._updatePlayPauseIcon();
        })
        .catch((error) => {
          console.warn('[CourseContentController] Remote MP3 not found or blocked. Using Web Speech API fallback.', error);
          this._fallbackSpeechAudio();
        });
    }
  }

  /**
   * Pauses audio playback.
   */
  pauseAudio() {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.isPlaying = false;
    this._updatePlayPauseIcon();
  }

  /**
   * Stops audio and resets to beginning.
   * @private
   */
  _stopAudio() {
    this.pauseAudio();
    if (this.audioElement) {
      this.audioElement.currentTime = 0;
    }
  }

  /**
   * Web Speech synthesis fallback for interactive narration if audioUrl is a dummy asset.
   * @private
   */
  _fallbackSpeechAudio() {
    if (!('speechSynthesis' in window)) {
      alert('Audio playback is not supported on this browser.');
      return;
    }

    window.speechSynthesis.cancel();

    // Narration text combining title and description
    const narrationText = `${this.course.title}. ${this.course.description}. Lesson content: ${this.course.textContent.replace(/#|\*|>|-/g, ' ')}`;
    const utterance = new SpeechSynthesisUtterance(narrationText.slice(0, 1000));
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.isPlaying = true;
      this._updatePlayPauseIcon();
    };

    utterance.onend = () => {
      this.isPlaying = false;
      this._updatePlayPauseIcon();
      if (this.currentTimeDisplay) this.currentTimeDisplay.textContent = '0:00';
      if (this.timelineSlider) this.timelineSlider.value = 0;
    };

    utterance.onerror = () => {
      this.isPlaying = false;
      this._updatePlayPauseIcon();
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Synchronizes play/pause icon.
   * @private
   */
  _updatePlayPauseIcon() {
    if (!this.playPauseIcon) return;
    this.playPauseIcon.textContent = this.isPlaying ? 'pause' : 'play_arrow';
    if (this.btnAudioToggle) {
      this.btnAudioToggle.setAttribute(
        'aria-label',
        this.isPlaying ? 'Pause lesson audio' : 'Play lesson audio'
      );
    }
  }

  /**
   * Handles real-time audio time updates.
   * @private
   */
  _handleTimeUpdate() {
    if (this.isScrubbing || !this.audioElement) return;

    const current = this.audioElement.currentTime || 0;
    const duration = this.audioElement.duration || this.duration || 1;

    if (this.currentTimeDisplay) {
      this.currentTimeDisplay.textContent = this._formatTime(current);
    }

    if (this.timelineSlider && duration > 0) {
      this.timelineSlider.value = ((current / duration) * 100).toFixed(1);
    }
  }

  /**
   * Handles audio metadata loaded event.
   * @private
   */
  _handleLoadedMetadata() {
    if (!this.audioElement) return;
    this.duration = this.audioElement.duration;
    if (this.totalDurationDisplay && !isNaN(this.duration)) {
      this.totalDurationDisplay.textContent = this._formatTime(this.duration);
    }
  }

  /**
   * Handles audio end event.
   * @private
   */
  _handleAudioEnded() {
    this.isPlaying = false;
    this._updatePlayPauseIcon();
    if (this.timelineSlider) this.timelineSlider.value = 100;
  }

  /**
   * Handles audio error.
   * @private
   */
  _handleAudioError() {
    console.info('[CourseContentController] Remote audio source unavailable. Web Speech fallback active.');
  }

  /**
   * Completes the lesson, updates model state, triggers visual success confirmation, and redirects.
   */
  markAsComplete() {
    this.course.isCompleted = true;
    this._updateStatusBadge();
    this._updateCompletionButtonUI();

    // Trigger parent callback
    this.onComplete(this.course.id);

    // Show visual celebration confirmation overlay
    if (this.successOverlay) {
      this.successOverlay.classList.add('active');
    }

    // Auto redirect fallback after 2.8 seconds if user doesn't click
    setTimeout(() => {
      if (this.successOverlay && this.successOverlay.classList.contains('active')) {
        this.successOverlay.classList.remove('active');
        this.onRedirectDashboard();
      }
    }, 2800);
  }

  /**
   * Updates the styling and label of the completion action button.
   * @private
   */
  _updateCompletionButtonUI() {
    if (!this.btnMarkComplete || !this.btnCompleteText) return;

    if (this.course.isCompleted) {
      this.btnMarkComplete.classList.add('completed-state');
      this.btnCompleteText.textContent = 'Completed (Claimed +100 XP)';
    } else {
      this.btnMarkComplete.classList.remove('completed-state');
      this.btnCompleteText.textContent = 'Mark as Complete';
    }
  }

  /**
   * Helper to format seconds into mm:ss strings.
   * @param {number} seconds
   * @returns {string}
   * @private
   */
  _formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  /**
   * Destroys listeners and cleans up audio elements on unmount.
   */
  destroy() {
    this._stopAudio();
    if (this.audioElement) {
      this.audioElement.removeEventListener('timeupdate', this._handleTimeUpdate);
      this.audioElement.removeEventListener('loadedmetadata', this._handleLoadedMetadata);
      this.audioElement.removeEventListener('ended', this._handleAudioEnded);
      this.audioElement.removeEventListener('error', this._handleAudioError);
    }
  }
}
