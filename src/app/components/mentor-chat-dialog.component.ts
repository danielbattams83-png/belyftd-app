import {ChangeDetectionStrategy, Component, inject, input, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule, FormControl, FormGroup, Validators} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {Mentor} from '../models/app.models';
import {MentorshipDataService} from '../services/mentorship-data.service';
import {AudioPlayerService} from '../services/audio-player.service';

@Component({
  selector: 'app-mentor-chat-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        id="mentor-chat-dialog"
        class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 h-[88vh] sm:h-[650px] shadow-2xl flex flex-col overflow-hidden"
      >
        <!-- Header -->
        <div class="p-4 sm:p-5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="relative">
              <img
                [src]="mentor().avatar"
                [alt]="mentor().name"
                class="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                referrerpolicy="no-referrer"
              />
              @if (mentor().verified) {
                <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                  ✓
                </span>
              }
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 font-display">
                  {{ mentor().name }}
                </h3>
                <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  Verified
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                {{ mentor().title }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Listen to Audio Intro -->
            <button
              id="listen-mentor-intro-btn"
              type="button"
              (click)="playMentorIntro()"
              class="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition focus-accessible shadow-xs"
              title="Play Mentor Voice Greeting"
            >
              <mat-icon class="text-sm">record_voice_over</mat-icon>
              <span>Intro</span>
            </button>

            <!-- Close -->
            <button
              id="close-mentor-dialog-btn"
              type="button"
              (click)="closeDialog.emit()"
              class="w-8 h-8 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer focus-accessible"
            >
              <mat-icon class="text-base">close</mat-icon>
            </button>
          </div>
        </div>

        <!-- Mentor Bio & Quick Booking Banner -->
        <div class="px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
            <mat-icon class="text-sm text-emerald-600">event_available</mat-icon>
            <span>Next Available: <strong class="text-slate-800 dark:text-slate-200">{{ mentor().availableNext }}</strong></span>
          </div>

          <button
            id="book-session-btn"
            type="button"
            (click)="toggleBooking()"
            class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer transition focus-accessible shadow-xs"
          >
            <mat-icon class="text-xs">calendar_month</mat-icon>
            <span>{{ isBookingOpen() ? 'Close Schedule' : 'Schedule 1-on-1' }}</span>
          </button>
        </div>

        <!-- Schedule Booking Drawer -->
        @if (isBookingOpen()) {
          <div class="p-5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 animate-in slide-in-from-top duration-200 space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Select 1-on-1 Mentorship Check-in Slot
            </h4>
            <div class="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                (click)="selectedSlot.set('Today 4:30 PM (20m Zoom/Voice)')"
                [class]="selectedSlot() === 'Today 4:30 PM (20m Zoom/Voice)' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
                class="p-3 rounded-2xl border text-left text-xs cursor-pointer transition shadow-xs"
              >
                <div class="font-bold">Today 4:30 PM</div>
                <div class="text-[11px] text-slate-400">20-min Voice Review</div>
              </button>
              <button
                type="button"
                (click)="selectedSlot.set('Tomorrow 5:00 PM (30m Strategy)')"
                [class]="selectedSlot() === 'Tomorrow 5:00 PM (30m Strategy)' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
                class="p-3 rounded-2xl border text-left text-xs cursor-pointer transition shadow-xs"
              >
                <div class="font-bold">Tomorrow 5:00 PM</div>
                <div class="text-[11px] text-slate-400">30-min Goal Strategy</div>
              </button>
            </div>
            @if (bookingSuccess()) {
              <div class="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                <mat-icon class="text-sm">check</mat-icon>
                <span>Check-in booked! Added to your Quests and Calendar.</span>
              </div>
            } @else {
              <button
                id="confirm-booking-btn"
                type="button"
                (click)="confirmBooking()"
                class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs"
              >
                Confirm Appointment with {{ mentor().name.split(' ')[0] }}
              </button>
            }
          </div>
        }

        <!-- Message List -->
        <div class="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-900">
          <!-- Welcome Guidance Message -->
          <div class="text-center py-2">
            <span class="px-3.5 py-1 text-[11px] font-semibold rounded-full bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 shadow-xs">
              Direct Mentor Thread • Safe & Positive
            </span>
          </div>

          @for (msg of currentMessages(); track msg.id) {
            <div
              [class]="msg.sender === 'user' ? 'flex justify-end' : 'flex justify-start'"
            >
              <div
                [class]="msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-3xl rounded-tr-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-3xl rounded-tl-xs'"
                class="max-w-[82%] p-4 text-sm shadow-xs space-y-1.5"
              >
                <div class="flex items-center justify-between gap-3 text-[11px] opacity-75">
                  <span class="font-semibold">{{ msg.senderName }}</span>
                  <span>{{ msg.timestamp }}</span>
                </div>
                <p class="leading-relaxed text-xs sm:text-sm">{{ msg.text }}</p>
                @if (msg.actionPrompt) {
                  <div class="pt-2">
                    <button
                      type="button"
                      (click)="toggleBooking()"
                      class="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 flex items-center gap-1 hover:bg-amber-100 cursor-pointer"
                    >
                      <mat-icon class="text-xs">bolt</mat-icon>
                      <span>{{ msg.actionPrompt }}</span>
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Input Bar -->
        <form [formGroup]="chatForm" (ngSubmit)="sendMessage()" class="p-4 bg-white dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <input
            id="mentor-message-input"
            type="text"
            formControlName="text"
            placeholder="Ask {{ mentor().name.split(' ')[0] }} a question or share a win..."
            class="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus-accessible"
          />
          <button
            id="send-mentor-msg-btn"
            type="submit"
            [disabled]="!chatForm.valid"
            class="w-11 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center cursor-pointer transition focus-accessible shadow-xs shrink-0"
            aria-label="Send message"
          >
            <mat-icon class="text-base">send</mat-icon>
          </button>
        </form>
      </div>
    </div>
  `,
})
export class MentorChatDialogComponent {
  readonly mentor = input.required<Mentor>();
  readonly closeDialog = output<void>();

  private readonly dataService = inject(MentorshipDataService);
  private readonly player = inject(AudioPlayerService);

  readonly isBookingOpen = signal<boolean>(false);
  readonly selectedSlot = signal<string>('Today 4:30 PM (20m Zoom/Voice)');
  readonly bookingSuccess = signal<boolean>(false);

  readonly chatForm = new FormGroup({
    text: new FormControl('', [Validators.required]),
  });

  currentMessages(): ReturnType<MentorshipDataService['mentorChats']>[string] {
    const mentorId = this.mentor().id;
    return this.dataService.mentorChats()[mentorId] || [
      {
        id: `init-${mentorId}`,
        sender: 'mentor',
        senderName: this.mentor().name,
        text: `Hey Jordan! I'm ${this.mentor().name.split(' ')[0]}. What are you working on this week that we can tackle together?`,
        timestamp: 'Today'
      }
    ];
  }

  sendMessage(): void {
    const text = this.chatForm.value.text;
    if (!text) return;
    this.dataService.sendMentorMessage(this.mentor().id, text);
    this.chatForm.reset();
  }

  toggleBooking(): void {
    this.isBookingOpen.update(v => !v);
  }

  confirmBooking(): void {
    this.bookingSuccess.set(true);
    setTimeout(() => {
      this.bookingSuccess.set(false);
      this.isBookingOpen.set(false);
    }, 2000);
  }

  playMentorIntro(): void {
    this.player.speakCustomScript(
      `Voice Intro with ${this.mentor().name}`,
      this.mentor().voiceIntroPrompt,
      this.mentor().name,
      'Confidence'
    );
  }
}
