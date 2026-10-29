import {ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, output, signal, untracked, viewChild} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {Mentor, VoiceJournal} from '../models/app.models';

@Component({
  selector: 'app-courses-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './courses-overview.component.html',
  styleUrl: './courses-overview.component.scss',
})
export class CoursesOverviewComponent {
  readonly mentors = input<Mentor[]>([]);
  readonly selectedMentorIds = input<string[]>([]);
  readonly journals = input<VoiceJournal[]>([]);
  readonly progress = input(0);
  readonly completedSteps = input(0);
  readonly totalSteps = input(0);
  readonly viewQuests = output<void>();
  readonly recordNote = output<void>();
  readonly playJournal = output<VoiceJournal>();
  readonly mentorSelected = output<Mentor>();
  readonly chooseMentors = output<void>();
  readonly chosenMentors = computed(() => [...new Set(this.selectedMentorIds())]
    .map(id => this.mentors().find(mentor => mentor.id === id))
    .filter((mentor): mentor is Mentor => !!mentor).slice(0, 2));
  readonly labels = computed(() => ['Upcoming Session', 'Weekly Growth Progress', 'My Voice Reflections', ...this.chosenMentors().map(mentor => mentor.name)]);
  readonly activeIndex = signal(0);
  readonly journalIndex = signal(0);
  readonly currentJournal = computed(() => this.journals()[Math.min(this.journalIndex(), Math.max(0, this.journals().length - 1))]);
  readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private wheelLockedUntil = 0;
  private scrolling = false;
  private scrollTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(onCleanup => {
      const track = this.track()?.nativeElement;
      const count = this.labels().length;
      if (!track) return;
      const sync = () => {
        if (this.scrolling) return;
        const cards = Array.from(track.querySelectorAll<HTMLElement>('.overview-card'));
        const center = track.scrollLeft + track.clientWidth / 2;
        let closest = 0;
        cards.forEach((card, index) => {
          if (Math.abs(card.offsetLeft + card.offsetWidth / 2 - center) < Math.abs(cards[closest].offsetLeft + cards[closest].offsetWidth / 2 - center)) closest = index;
        });
        this.activeIndex.set(closest);
      };
      const resize = () => this.select(Math.min(untracked(this.activeIndex), count - 1), false);
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
      observer?.observe(track);
      const initial = setTimeout(resize, 0);
      track.addEventListener('scroll', sync, {passive: true});
      track.addEventListener('wheel', this.onWheel, {passive: false});
      onCleanup(() => {
        clearTimeout(initial);
        clearTimeout(this.scrollTimer);
        observer?.disconnect();
        track.removeEventListener('scroll', sync);
        track.removeEventListener('wheel', this.onWheel);
        this.scrolling = false;
      });
    });
  }

  select(index: number, animate = true): void {
    if (index < 0 || index >= this.labels().length) return;
    this.activeIndex.set(index);
    const track = this.track()?.nativeElement;
    const card = track?.querySelectorAll<HTMLElement>('.overview-card')[index];
    if (!track || !card) return;
    const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scrolling = true;
    clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(() => this.scrolling = false, 420);
    const left = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
    if (typeof track.scrollTo === 'function') track.scrollTo({left, behavior: animate && !reduced ? 'smooth' : 'instant'});
    else track.scrollLeft = left;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    this.select(this.activeIndex() + (event.key === 'ArrowRight' ? 1 : -1));
  }

  private onWheel = (event: WheelEvent): void => {
    if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const next = this.activeIndex() + (event.deltaY > 0 ? 1 : -1);
    if (next < 0 || next >= this.labels().length) return;
    event.preventDefault();
    const now = performance.now();
    if (now < this.wheelLockedUntil) return;
    this.wheelLockedUntil = now + 420;
    this.select(next);
  };

  changeJournal(direction: -1 | 1): void {
    const count = this.journals().length;
    if (count) this.journalIndex.set((Math.min(this.journalIndex(), count - 1) + direction + count) % count);
  }

  duration(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
}
