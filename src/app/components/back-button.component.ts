import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {NavigationService} from '../services/navigation.service';

@Component({
  selector: 'app-back-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="goBack()" aria-label="Go back"
      class="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-800 focus-accessible">
      <span aria-hidden="true">&larr;</span> Back
    </button>
  `,
})
export class BackButtonComponent {
  readonly fallback = input('/dashboard');
  private readonly navigation = inject(NavigationService);

  goBack(): void {
    this.navigation.goBack(this.fallback());
  }
}
