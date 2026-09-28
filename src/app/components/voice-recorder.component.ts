import {ChangeDetectionStrategy, Component, inject, signal, output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule, FormControl, FormGroup, Validators} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {MentorshipDataService} from '../services/mentorship-data.service';
import {VoiceJournal} from '../models/app.models';

@Component({
  selector: 'app-voice-recorder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        id="voice-recorder-dialog"
        class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-md rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5"
      >
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/30">
              <mat-icon>mic</mat-icon>
            </div>
            <div>
              <h3 class="text-base font-bold font-display">Voice Reflection</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Record a quick audio note or check-in</p>
            </div>
          </div>

          <button
            id="close-recorder-btn"
            type="button"
            (click)="closeModal.emit()"
            class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer focus-accessible"
            aria-label="Close recorder"
          >
            <mat-icon class="text-lg">close</mat-icon>
          </button>
        </div>

        <!-- Prompt Card -->
        <div class="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl">
          <p class="text-xs font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
            <mat-icon class="text-sm">lightbulb</mat-icon> Reflection Prompt
          </p>
          <p class="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 mt-1.5 leading-relaxed">
            "{{ selectedPrompt() }}"
          </p>
        </div>

        <!-- Recording Visualizer & Status -->
        <div class="py-6 flex flex-col items-center justify-center border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-850">
          @if (isRecording()) {
            <div class="flex items-center gap-1.5 h-12 mb-3">
              <span class="w-1.5 bg-rose-500 rounded-full animate-audio-bar-1 h-8"></span>
              <span class="w-1.5 bg-rose-400 rounded-full animate-audio-bar-2 h-12"></span>
              <span class="w-1.5 bg-amber-400 rounded-full animate-audio-bar-3 h-10"></span>
              <span class="w-1.5 bg-rose-500 rounded-full animate-audio-bar-4 h-6"></span>
              <span class="w-1.5 bg-amber-500 rounded-full animate-audio-bar-5 h-9"></span>
            </div>
            <div class="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm font-mono font-semibold">
              <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span>Recording: {{ formatTimer(recordingSeconds()) }}</span>
            </div>
          } @else if (recordedAudioUrl()) {
            <div class="flex flex-col items-center gap-3 w-full px-4">
              <div class="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <mat-icon class="text-2xl">check_circle</mat-icon>
              </div>
              <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Voice Reflection Ready ({{ formatTimer(recordingSeconds()) }})
              </p>
              <!-- Native Player preview -->
              <audio [src]="recordedAudioUrl()" controls class="w-full h-10"></audio>
            </div>
          } @else {
            <div class="text-center py-2">
              <p class="text-xs text-slate-400 mb-2">Tap below when you're ready to speak</p>
              <div class="text-2xl font-mono text-slate-400 font-bold">00:00</div>
            </div>
          }
        </div>

        <!-- Record Trigger Buttons -->
        <div class="flex items-center justify-center gap-3">
          @if (!isRecording() && !recordedAudioUrl()) {
            <button
              id="start-record-btn"
              type="button"
              (click)="startRecording()"
              class="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition cursor-pointer focus-accessible"
            >
              <mat-icon class="text-base">mic</mat-icon>
              <span>Start Recording</span>
            </button>
          } @else if (isRecording()) {
            <button
              id="stop-record-btn"
              type="button"
              (click)="stopRecording()"
              class="px-6 py-3 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 border border-slate-700 shadow-sm transition cursor-pointer focus-accessible"
            >
              <mat-icon class="text-rose-400 text-base">stop</mat-icon>
              <span>Stop & Preview</span>
            </button>
          } @else {
            <button
              id="re-record-btn"
              type="button"
              (click)="reRecord()"
              class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 flex items-center gap-1.5 cursor-pointer focus-accessible"
            >
              <mat-icon class="text-base">refresh</mat-icon>
              <span>Re-record</span>
            </button>
          }
        </div>

        <!-- Title & Mood Form -->
        <form [formGroup]="journalForm" (ngSubmit)="saveReflection()" class="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label for="journal-title" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Reflection Title
            </label>
            <input
              id="journal-title"
              type="text"
              formControlName="title"
              placeholder="e.g. Tackling today's coding problem"
              class="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus-accessible"
            />
          </div>

          <div>
            <span class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Current Mood
            </span>
            <div class="flex flex-wrap gap-1.5">
              @for (mood of moodOptions; track mood) {
                <button
                  type="button"
                  (click)="selectedMood.set(mood)"
                  [class]="selectedMood() === mood ? 'bg-indigo-600 text-white font-semibold border-indigo-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'"
                  class="px-3 py-1 text-xs rounded-xl border cursor-pointer transition focus-accessible"
                >
                  {{ mood }}
                </button>
              }
            </div>
          </div>

          <div class="flex justify-end gap-2.5 pt-2">
            <button
              id="cancel-reflection-btn"
              type="button"
              (click)="closeModal.emit()"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer focus-accessible"
            >
              Cancel
            </button>
            <button
              id="save-reflection-btn"
              type="submit"
              [disabled]="!journalForm.valid"
              class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs cursor-pointer focus-accessible flex items-center gap-1.5"
            >
              <mat-icon class="text-sm">save</mat-icon>
              <span>Save Reflection</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class VoiceRecorderComponent {
  readonly closeModal = output<void>();
  private readonly dataService = inject(MentorshipDataService);

  readonly isRecording = signal<boolean>(false);
  readonly recordingSeconds = signal<number>(0);
  readonly recordedAudioUrl = signal<string | null>(null);
  readonly selectedPrompt = signal<string>('What is one challenge you navigated today and what did you learn about your resilience?');
  readonly selectedMood = signal<VoiceJournal['mood']>('🔥 Hyped');

  readonly moodOptions: VoiceJournal['mood'][] = [
    '🔥 Hyped',
    '✨ Inspired',
    '🌿 Peaceful',
    '⚡ Focused',
    '🌧️ Challenging',
  ];

  readonly journalForm = new FormGroup({
    title: new FormControl('Daily Audio Check-in', [Validators.required]),
  });

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  startRecording(): void {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      // Browser fallback simulation for testing in restricted iframes
      this.simulateRecording();
      return;
    }

    navigator.mediaDevices.getUserMedia({audio: true})
      .then(stream => {
        this.audioChunks = [];
        this.mediaRecorder = new MediaRecorder(stream);

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, {type: 'audio/webm'});
          const audioUrl = URL.createObjectURL(audioBlob);
          this.recordedAudioUrl.set(audioUrl);
          // Stop stream tracks
          stream.getTracks().forEach(track => track.stop());
        };

        this.mediaRecorder.start();
        this.isRecording.set(true);
        this.recordingSeconds.set(0);
        this.startTimer();
      })
      .catch(() => {
        // Fallback simulation if mic blocked
        this.simulateRecording();
      });
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording.set(false);
    this.stopTimer();
  }

  private simulateRecording(): void {
    this.isRecording.set(true);
    this.recordingSeconds.set(0);
    this.startTimer();

    // After stopping, mock an audio reflection
    setTimeout(() => {
      if (this.isRecording()) {
        this.stopRecording();
        this.recordedAudioUrl.set('https://actions.google.com/sounds/v1/water/rain_heavy.ogg');
      }
    }, 5000);
  }

  reRecord(): void {
    this.recordedAudioUrl.set(null);
    this.recordingSeconds.set(0);
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.recordingSeconds.update(s => s + 1);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTimer(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  saveReflection(): void {
    if (!this.journalForm.valid) return;

    const newJournal: VoiceJournal = {
      id: `vj-${Date.now()}`,
      title: this.journalForm.value.title || 'Voice Reflection',
      date: new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}),
      durationSec: this.recordingSeconds() || 30,
      audioBlobUrl: this.recordedAudioUrl() || undefined,
      prompt: this.selectedPrompt(),
      mood: this.selectedMood()
    };

    this.dataService.saveVoiceJournal(newJournal);
    this.closeModal.emit();
  }
}
