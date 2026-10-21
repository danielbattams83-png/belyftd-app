import {canAccessModule} from './tier.service';
import {FirebaseService} from './firebase.service';
import {Injectable, signal, computed, inject, effect} from '@angular/core';
import {AudioTrack} from '../models/app.models';

@Injectable({
  providedIn: 'root',
})
export class AudioPlayerService {
  private readonly firebaseService = inject(FirebaseService);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly unavailableTracks = signal<ReadonlySet<string>>(new Set());
  readonly mediaReady = signal(false);
  readonly hasPlayableMedia = computed(() => {
    const track = this.activeTrack();
    return !!track && this.mediaReady() && !this.errorMessage() && this.isTrackAvailable(track);
  });

  isTrackAvailable(track: AudioTrack): boolean {
    const path = track.audioUrl?.trim();
    if (!path || this.unavailableTracks().has(track.id)) return false;
    if (path.startsWith('blob:')) return true;
    const moduleId = /^course-content\/(module-[1-9][0-9]*)\/[^/]+\/audio\/[^/]+\.mp3$/.exec(path)?.[1];
    return !!moduleId && canAccessModule(this.firebaseService.subscriptionTier(), moduleId);
  }

  private hideUnavailableTrack(): void {
    const track = this.activeTrack();
    if (track) this.unavailableTracks.update(ids => new Set([...ids, track.id]));
    this.stopAll();
    this.mediaReady.set(false);
    this.errorMessage.set(null);
  }

  private playbackRequest = 0;
  private resolvedAt = 0;
  private retried = false;
  readonly activeTrack = signal<AudioTrack | null>(null);
  readonly isPlaying = signal<boolean>(false);
  readonly currentTime = signal<number>(0);
  readonly duration = signal<number>(0);
  readonly playbackRate = signal<number>(1);
  readonly volume = signal<number>(0.9);
  readonly showFullPlayer = signal<boolean>(false);
  readonly showTranscript = signal<boolean>(false);

  readonly progressPercent = computed(() => {
    const dur = this.duration();
    if (dur <= 0) return 0;
    return Math.min(100, Math.max(0, (this.currentTime() / dur) * 100));
  });

  readonly mentorLanguageLabel = computed(() => {
    const track = this.activeTrack();
    if (!track) return '';
    if (track.mentorName && track.language) {
      return `${track.mentorName} - ${track.language}`;
    }
    if (track.speaker && track.language) {
      return `${track.speaker} - ${track.language}`;
    }
    if (track.speaker) {
      if (track.speaker.includes(' - ')) return track.speaker;
      const match = track.speaker.match(/^([^(]+)\s*\(([^)]+)\)$/);
      if (match) return `${match[1].trim()} - ${match[2].trim()}`;
      return track.speaker;
    }
    return 'Mentor recording';
  });

  private audioElem: HTMLAudioElement | null = null;

  constructor() {
    let previousUserId: string | undefined;
    let previousTier: number | undefined;
    effect(() => {
      const userId = this.firebaseService.currentUser()?.uid;
      const tier = this.firebaseService.subscriptionTier();
      if (previousUserId !== userId || previousTier !== tier) {
        this.unavailableTracks.set(new Set());
      }
      previousTier = tier;
      const track = this.activeTrack();
      if (track && !this.isTrackAvailable(track)) this.close();
      if (previousUserId && previousUserId !== userId) {
        this.stopAll();
        this.activeTrack.set(null);
      }
      previousUserId = userId;
    });
    if (typeof window !== 'undefined') {
      this.audioElem = new Audio();
      this.audioElem.preload = 'metadata';
      this.audioElem.addEventListener('timeupdate', () => {
        if (this.audioElem) {
          this.currentTime.set(this.audioElem.currentTime);
        }
      });
      this.audioElem.addEventListener('loadedmetadata', () => {
        if (this.audioElem && Number.isFinite(this.audioElem.duration) && this.audioElem.duration > 0) {
          this.duration.set(this.audioElem.duration);
        }
      });
      this.audioElem.addEventListener('ended', () => {
        this.onPlaybackEnded();
      });
      this.audioElem.addEventListener('playing', () => {
        if (!this.audioElem?.getAttribute('src') || !this.activeTrack()) return;
        this.isLoading.set(false);
        this.isPlaying.set(true);
      });
      this.audioElem.addEventListener('waiting', () => {
        if (this.audioElem?.getAttribute('src') && this.activeTrack()) this.isLoading.set(true);
      });
      this.audioElem.addEventListener('pause', () => this.isPlaying.set(false));
      this.audioElem.addEventListener('error', () => {
        if (!this.audioElem?.getAttribute('src') || !this.activeTrack()) return;
        const track = this.activeTrack();
        if (track?.audioUrl?.startsWith('course-content/') && !this.retried && Date.now() - this.resolvedAt > 9 * 60 * 1000) {
          this.retried = true;
          void this.playTrack(track, this.currentTime(), true);
          return;
        }
        this.hideUnavailableTrack();
      });
    }
  }

  async playTrack(track: AudioTrack, startTime = 0, retry = false): Promise<void> {
    this.stopAll();
    const request = this.playbackRequest;
    this.retried = retry;
    this.activeTrack.set(track);
    this.errorMessage.set(null);
    this.duration.set(track.durationSec || 0);
    this.currentTime.set(startTime);
    if (!this.audioElem) return;
    if (!this.isTrackAvailable(track)) return;
    this.isLoading.set(true);
    try {
      // Course media must go through the tier-checked, ten-minute signed URL endpoint.
      // Blob URLs belong to the user's own voice journal recordings.
      const path = track.audioUrl!.trim();
      const url = path.startsWith('blob:')
        ? path
        : await this.firebaseService.getCourseMediaUrlFromPath(path);
      if (request !== this.playbackRequest) return;
      if (!url?.trim()) { this.hideUnavailableTrack(); return; }
      this.mediaReady.set(true);
      this.resolvedAt = Date.now();
      this.audioElem.src = url;
      this.audioElem.preload = 'metadata';
      this.audioElem.playbackRate = this.playbackRate();
      this.audioElem.volume = this.volume();
      if (startTime > 0) this.audioElem.currentTime = startTime;
      await this.audioElem.play();
      if (request !== this.playbackRequest) return;
      this.isPlaying.set(true);
      this.isLoading.set(false);
    } catch (error: unknown) {
      if (request !== this.playbackRequest) return;
      const code = (error as {code?: string} | null)?.code;
      if (['functions/permission-denied', 'functions/unauthenticated', 'functions/not-found'].includes(code ?? '')) {
        this.hideUnavailableTrack();
        return;
      }
      this.errorMessage.set(this.playbackErrorMessage(error));
      this.isLoading.set(false);
      this.isPlaying.set(false);
    }
  }

  private playbackErrorMessage(error: unknown): string {
    const code = (error as {code?: string} | null)?.code;
    if (code === 'functions/permission-denied') return 'Your current course access does not include this recording. Redeem a sponsor code or choose a lesson included in your plan.';
    if (code === 'functions/unauthenticated') return 'Please sign in again to play this recording.';
    if (code === 'functions/not-found') return 'This recording is not available yet. Please choose another recording.';
    if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded') return 'Unable to connect. Check your internet connection and try again.';
    return 'This recording could not start. Please try again.';
  }

  stop(): void {
    this.stopAll();
    this.currentTime.set(0);
    this.errorMessage.set(null);
  }

  close(): void {
    this.stop();
    this.activeTrack.set(null);
    this.duration.set(0);
    this.showFullPlayer.set(false);
    this.showTranscript.set(false);
  }

  togglePlay(): void {
    if (!this.activeTrack()) return;

    if (this.isPlaying() || this.isLoading()) {
      this.pause();
    } else {
      this.resume();
    }
  }

  pause(): void {
    ++this.playbackRequest;
    this.isLoading.set(false);
    this.isPlaying.set(false);
    if (this.audioElem && this.audioElem.src) {
      this.audioElem.pause();
    }
  }

  resume(): void {
    const track = this.activeTrack();
    if (!track) return;
    if (this.errorMessage() || !this.audioElem?.getAttribute('src') ||
        (track.audioUrl?.startsWith('course-content/') && Date.now() - this.resolvedAt > 9 * 60 * 1000)) {
      void this.playTrack(track, this.currentTime());
      return;
    }
    this.isLoading.set(true);
    const request = this.playbackRequest;
    void this.audioElem.play().then(() => {
      if (request !== this.playbackRequest) return;
      this.isPlaying.set(true);
      this.isLoading.set(false);
    }).catch(() => {
      if (request !== this.playbackRequest) return;
      this.isLoading.set(false);
      this.isPlaying.set(false);
      this.errorMessage.set('Playback could not start. Please try again.');
    });
  }

  seek(seconds: number): void {
    const target = Math.max(0, Math.min(this.duration(), seconds));
    this.currentTime.set(target);
    if (this.audioElem && this.audioElem.src) {
      this.audioElem.currentTime = target;
    }
  }

  skip(seconds: number): void {
    this.seek(this.currentTime() + seconds);
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate.set(rate);
    if (this.audioElem) {
      this.audioElem.playbackRate = rate;
    }
  }

  setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume.set(clamped);
    if (this.audioElem) {
      this.audioElem.volume = clamped;
    }
  }

  toggleFullPlayer(): void {
    this.showFullPlayer.update((v) => !v);
  }

  toggleTranscript(): void {
    this.showTranscript.update((v) => !v);
  }

  speakCustomScript(title: string, scriptText: string, speakerName: string, category: AudioTrack['category'] = 'Mindset'): void {
    const customTrack: AudioTrack = {
      id: `custom-${Date.now()}`,
      title,
      speaker: speakerName || 'Coach Spark',
      speakerRole: 'Lyftd AI Mentor',
      speakerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      category,
      duration: '',
      durationSec: 0,
      // Generated text has no ingested recording. Never substitute a lesson audio file.
      transcript: scriptText,
      moodTags: ['Custom', 'Motivational', 'Personalized'],
      likes: 1,
      isFavorite: true,
    };

    this.playTrack(customTrack);
    this.showFullPlayer.set(true);
    this.showTranscript.set(true);
  }

  private onPlaybackEnded(): void {
    this.isPlaying.set(false);
    this.currentTime.set(this.duration());
  }

  stopAll(): void {
    this.mediaReady.set(false);
    ++this.playbackRequest;
    this.isLoading.set(false);
    this.isPlaying.set(false);
    if (this.audioElem) {
      this.audioElem.pause();
      this.audioElem.removeAttribute('src');
      this.audioElem.load();
    }
  }

  formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}
