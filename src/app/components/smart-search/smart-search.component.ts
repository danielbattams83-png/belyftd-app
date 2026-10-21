import {ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, signal, viewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {DISCOVERY_INTENTS, DiscoveryLesson, SmartSearchService, rankDiscoveryLessons} from './smart-search.service';

@Component({
  selector: 'app-smart-search',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './smart-search.component.html',
  styleUrl: './smart-search.component.css',
})
export class SmartSearchComponent {
  readonly search = inject(SmartSearchService);
  private readonly router = inject(Router);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');
  readonly query = signal('');
  readonly navigationError = signal('');
  readonly navigating = signal(false);
  readonly intents = DISCOVERY_INTENTS;
  readonly matches = computed(() => rankDiscoveryLessons(this.search.lessons(), this.query()));
  readonly results = computed(() => this.matches().slice(0, 30));

  @HostListener('document:keydown', ['$event'])
  shortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.open();
    }
  }

  open(): void {
    if (!this.dialog().nativeElement.open) this.dialog().nativeElement.showModal();
    this.input().nativeElement.focus();
    this.navigationError.set('');
    void this.search.load();
  }

  close(): void { this.dialog().nativeElement.close(); }

  chooseIntent(query: string): void {
    this.query.set(query);
    this.input().nativeElement.focus();
  }

  mediaLabels(lesson: DiscoveryLesson): string {
    return [...new Set(lesson.variants.map(variant => `${variant.mentorName} · ${variant.language} ${variant.type}`))].join(' / ') || 'Reading lesson';
  }

  async select(lesson: DiscoveryLesson): Promise<void> {
    if (this.navigating()) return;
    this.navigating.set(true);
    this.navigationError.set('');
    try {
      if (await this.router.navigate(['/courses', lesson.moduleId, 'units', lesson.unitId])) this.close();
      else this.navigationError.set('This lesson needs course access. Sign in or check your subscription to continue.');
    } catch {
      this.navigationError.set('Unable to open this lesson. Please try again.');
    } finally {
      this.navigating.set(false);
    }
  }
}
