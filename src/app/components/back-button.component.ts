import {ChangeDetectionStrategy, Component, inject, input, output} from '@angular/core';
import {NavigationService} from '../services/navigation.service';

@Component({
  selector: 'app-back-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `:host { display: inline-flex; flex-shrink: 0; } button { width: 36px; height: 36px; min-width: 36px; min-height: 36px; margin-top: 25px; } :host(.profile-back) button { width: 44px; height: 44px; min-width: 44px; min-height: 44px; margin-top: 0; }`,
  template: `
    <button type="button" (click)="goBack()" [attr.aria-label]="label()" [title]="label()"
      [class]="profile()
        ? 'inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-(--brand-accent) dark:text-slate-300 dark:hover:bg-slate-800 focus-accessible'
        : 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-(--brand-accent) dark:text-slate-300 dark:hover:bg-slate-800 focus-accessible'">
      <svg aria-hidden="true" [attr.width]="iconSize()" [attr.height]="iconSize()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 10 4 15l5 5M4 15h11a5 5 0 0 0 5-5V4" />
      </svg>
    </button>
  `,
})
export class BackButtonComponent {
  readonly fallback = input('/dashboard');
  readonly label = input('Go back');
  readonly navigate = input(true);
  readonly iconSize = input(23);
  /** Profile uses a 44px target and leaves navigation to the parent. */
  readonly profile = input(false);
  readonly pressed = output<void>();
  private readonly navigation = inject(NavigationService);

  goBack(): void {
    this.pressed.emit();
    if (this.navigate()) this.navigation.goBack(this.fallback());
  }
}
