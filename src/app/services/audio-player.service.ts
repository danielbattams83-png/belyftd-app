import {Injectable, signal, computed} from '@angular/core';
import {AudioTrack} from '../models/app.models';

@Injectable({
  providedIn: 'root',
})
export class AudioPlayerService {
  readonly activeTrack = signal<AudioTrack | null>(null);
  readonly isPlaying = signal<boolean>(false);
  readonly currentTime = signal<number>(0);
  readonly duration = signal<number>(60);
  readonly playbackRate = signal<number>(1);
  readonly volume = signal<number>(0.9);
  readonly showFullPlayer = signal<boolean>(false);
  readonly showTranscript = signal<boolean>(false);
  readonly isSpeaking = signal<boolean>(false);

  readonly progressPercent = computed(() => {
    const dur = this.duration();
    if (dur <= 0) return 0;
    return Math.min(100, Math.max(0, (this.currentTime() / dur) * 100));
  });

  private audioElem: HTMLAudioElement | null = null;
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private audioCtx: AudioContext | null = null;
  private synthNodes: {osc1?: OscillatorNode; osc2?: OscillatorNode; gain?: GainNode} = {};

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioElem = new Audio();
      this.audioElem.addEventListener('timeupdate', () => {
        if (this.audioElem) {
          this.currentTime.set(this.audioElem.currentTime);
        }
      });
      this.audioElem.addEventListener('loadedmetadata', () => {
        if (this.audioElem && !isNaN(this.audioElem.duration) && this.audioElem.duration > 0) {
          this.duration.set(this.audioElem.duration);
        }
      });
      this.audioElem.addEventListener('ended', () => {
        this.onPlaybackEnded();
      });
    }
  }

  playTrack(track: AudioTrack): void {
    this.stopAll();
    this.activeTrack.set(track);
    this.duration.set(track.durationSec || 60);
    this.currentTime.set(0);

    // If track has an actual audio file, play it
    if (track.audioUrl && this.audioElem) {
      this.audioElem.src = track.audioUrl;
      this.audioElem.playbackRate = this.playbackRate();
      this.audioElem.volume = this.volume();
      this.audioElem.play().then(() => {
        this.isPlaying.set(true);
      }).catch(() => {
        // Fallback to spoken narration with speech synthesis & soothing ambient chords
        this.playSynthesizedTrack(track);
      });
    } else {
      // Use interactive speech synthesis + ambient soundscape
      this.playSynthesizedTrack(track);
    }
  }

  private playSynthesizedTrack(track: AudioTrack): void {
    this.startAmbientSoundscape(track.ambientTone || 'lofi-warm');
    this.speakText(track.transcript, track.durationSec, () => {
      this.onPlaybackEnded();
    });
    this.isPlaying.set(true);
  }

  togglePlay(): void {
    if (!this.activeTrack()) return;

    if (this.isPlaying()) {
      this.pause();
    } else {
      this.resume();
    }
  }

  pause(): void {
    this.isPlaying.set(false);
    if (this.audioElem && this.audioElem.src) {
      this.audioElem.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    this.stopProgressTimer();
    this.pauseAmbientSoundscape();
  }

  resume(): void {
    if (!this.activeTrack()) return;
    this.isPlaying.set(true);

    if (this.audioElem && this.audioElem.src && !this.isSpeaking()) {
      this.audioElem.play();
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.startProgressTimer();
      this.resumeAmbientSoundscape();
    } else {
      const track = this.activeTrack();
      if (track) {
        this.playSynthesizedTrack(track);
      }
    }
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
    // If speaking, restart speech with updated rate
    if (this.isSpeaking() && this.activeTrack()) {
      const track = this.activeTrack()!;
      this.stopAll();
      this.activeTrack.set(track);
      this.playSynthesizedTrack(track);
    }
  }

  setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume.set(clamped);
    if (this.audioElem) {
      this.audioElem.volume = clamped;
    }
    if (this.synthNodes.gain) {
      this.synthNodes.gain.gain.value = clamped * 0.15;
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
      speaker: speakerName,
      speakerRole: 'Be Lyft\'d AI Coach',
      speakerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      category,
      duration: '0:45',
      durationSec: 45,
      transcript: scriptText,
      moodTags: ['Custom', 'Motivational', 'Personalized'],
      likes: 1,
      isFavorite: true,
      ambientTone: 'ambient-synth',
    };

    this.playTrack(customTrack);
    this.showFullPlayer.set(true);
  }

  private speakText(text: string, estDurationSec: number, onEnd: () => void): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.startProgressTimer(estDurationSec, onEnd);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.playbackRate() * 0.95;
    utterance.pitch = 1.05;
    utterance.volume = this.volume();

    // Pick warm natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex'))));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    this.isSpeaking.set(true);

    utterance.onend = () => {
      this.isSpeaking.set(false);
      onEnd();
    };

    utterance.onerror = () => {
      this.isSpeaking.set(false);
      onEnd();
    };

    window.speechSynthesis.speak(utterance);
    this.startProgressTimer(estDurationSec, onEnd);
  }

  private startProgressTimer(maxSec?: number, onComplete?: () => void): void {
    this.stopProgressTimer();
    const targetDur = maxSec || this.duration();
    this.progressInterval = setInterval(() => {
      if (this.isPlaying()) {
        const next = this.currentTime() + 0.5 * this.playbackRate();
        if (next >= targetDur) {
          this.currentTime.set(targetDur);
          this.stopProgressTimer();
          if (onComplete) onComplete();
        } else {
          this.currentTime.set(next);
        }
      }
    }, 500);
  }

  private stopProgressTimer(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private startAmbientSoundscape(tone: string): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.stopAmbientSoundscape();

      const gain = this.audioCtx.createGain();
      gain.gain.value = this.volume() * 0.08; // subtle soothing background layer

      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();

      // Root harmonic warm drone chords (e.g. 216Hz and 432Hz calming tuning)
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(tone === 'energizing' ? 261.63 : 216, this.audioCtx.currentTime); // C4 or Calming tone

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(tone === 'energizing' ? 329.63 : 324, this.audioCtx.currentTime); // E4 harmonic

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start();
      osc2.start();

      this.synthNodes = {osc1, osc2, gain};
    } catch {
      // AudioContext might be blocked until user gesture, graceful bypass
    }
  }

  private pauseAmbientSoundscape(): void {
    if (this.synthNodes.gain && this.audioCtx) {
      this.synthNodes.gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    }
  }

  private resumeAmbientSoundscape(): void {
    if (this.synthNodes.gain && this.audioCtx) {
      this.synthNodes.gain.gain.setValueAtTime(this.volume() * 0.08, this.audioCtx.currentTime);
    }
  }

  private stopAmbientSoundscape(): void {
    try {
      if (this.synthNodes.osc1) {
        this.synthNodes.osc1.stop();
        this.synthNodes.osc1.disconnect();
      }
      if (this.synthNodes.osc2) {
        this.synthNodes.osc2.stop();
        this.synthNodes.osc2.disconnect();
      }
      if (this.synthNodes.gain) {
        this.synthNodes.gain.disconnect();
      }
      this.synthNodes = {};
    } catch {
      // Cleanup safe
    }
  }

  private onPlaybackEnded(): void {
    this.isPlaying.set(false);
    this.isSpeaking.set(false);
    this.currentTime.set(this.duration());
    this.stopProgressTimer();
    this.stopAmbientSoundscape();
  }

  stopAll(): void {
    this.isPlaying.set(false);
    this.isSpeaking.set(false);
    this.stopProgressTimer();
    this.stopAmbientSoundscape();
    if (this.audioElem) {
      this.audioElem.pause();
      this.audioElem.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}
