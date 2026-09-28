import {ChangeDetectionStrategy, Component, inject, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule, FormControl, FormGroup} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {AiMentorService} from '../services/ai-mentor.service';
import {AudioPlayerService} from '../services/audio-player.service';
import {MentorshipDataService} from '../services/mentorship-data.service';

@Component({
  selector: 'app-custom-pep-talk-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        id="custom-pep-talk-dialog"
        class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-md rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5"
      >
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
              <mat-icon>auto_awesome</mat-icon>
            </div>
            <div>
              <h3 class="text-base font-bold font-display">Generate Instant Pep Talk</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Personalized audio boost in seconds</p>
            </div>
          </div>

          <button
            id="close-pep-dialog-btn"
            type="button"
            (click)="closeModal.emit()"
            class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer focus-accessible"
          >
            <mat-icon class="text-base">close</mat-icon>
          </button>
        </div>

        <!-- Form -->
        <form [formGroup]="pepForm" (ngSubmit)="generatePepTalk()" class="space-y-4">
          <!-- Topic Selection -->
          <div>
            <span class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              What do you need confidence for right now?
            </span>
            <div class="grid grid-cols-2 gap-2">
              @for (topic of topics; track topic.id) {
                <button
                  type="button"
                  (click)="selectedTopic.set(topic.label)"
                  [class]="selectedTopic() === topic.label
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
                  class="p-2.5 rounded-2xl border text-left text-xs transition cursor-pointer flex items-center gap-2 focus-accessible shadow-xs"
                >
                  <mat-icon class="text-sm shrink-0 text-indigo-600 dark:text-indigo-400">{{ topic.icon }}</mat-icon>
                  <span class="truncate">{{ topic.label }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Current Mood Selection -->
          <div>
            <span class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              How are you feeling at this moment?
            </span>
            <div class="flex flex-wrap gap-1.5">
              @for (m of moods; track m) {
                <button
                  type="button"
                  (click)="selectedMood.set(m)"
                  [class]="selectedMood() === m
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-semibold border-amber-300 dark:border-amber-700'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'"
                  class="px-3 py-1.5 text-xs rounded-xl border transition cursor-pointer focus-accessible"
                >
                  {{ m }}
                </button>
              }
            </div>
          </div>

          <!-- Action Button -->
          <div class="pt-2">
            <button
              id="generate-pep-audio-btn"
              type="submit"
              [disabled]="aiService.isGenerating()"
              class="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition focus-accessible"
            >
              @if (aiService.isGenerating()) {
                <mat-icon class="animate-spin text-base">autorenew</mat-icon>
                <span>Synthesizing Your Uplift Track...</span>
              } @else {
                <mat-icon class="text-base">play_circle</mat-icon>
                <span>Generate & Play Spoken Pep Talk</span>
              }
            </button>
          </div>
        </form>

        <p class="text-center text-[11px] text-slate-400">
          Powered by Be Lyft'd AI Voice Coach & Gemini 3.7
        </p>
      </div>
    </div>
  `,
})
export class CustomPepTalkModalComponent {
  readonly closeModal = output<void>();

  readonly aiService = inject(AiMentorService);
  private readonly player = inject(AudioPlayerService);
  private readonly dataService = inject(MentorshipDataService);

  readonly topics = [
    {id: 'test', label: 'Exam & Test Anxiety', icon: 'school'},
    {id: 'interview', label: 'First Job Interview', icon: 'work'},
    {id: 'speaking', label: 'Public Speaking', icon: 'record_voice_over'},
    {id: 'reset', label: 'Bad Day Reset', icon: 'refresh'},
    {id: 'creative', label: 'Creative Block', icon: 'brush'},
    {id: 'habits', label: 'Staying Consistent', icon: 'fitness_center'},
  ];

  readonly moods = [
    '😰 Anxious / Hesitant',
    '😴 Low Energy / Tired',
    '😤 Frustrated',
    '⚡ Hyped & Ready',
    '🎯 Focused',
  ];

  readonly selectedTopic = signal<string>('Exam & Test Anxiety');
  readonly selectedMood = signal<string>('😰 Anxious / Hesitant');

  readonly pepForm = new FormGroup({
    customNote: new FormControl(''),
  });

  async generatePepTalk(): Promise<void> {
    const user = this.dataService.userProfile();
    const result = await this.aiService.generateCustomPepTalk(
      this.selectedTopic(),
      this.selectedMood(),
      user.name.split(' ')[0]
    );

    // Immediately play the custom script in audio player
    this.player.speakCustomScript(
      result.title,
      result.script,
      'Coach Spark (Be Lyft\'d AI)',
      'Confidence'
    );

    this.closeModal.emit();
  }
}
