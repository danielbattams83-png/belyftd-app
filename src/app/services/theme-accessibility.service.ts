import {Injectable, signal, effect} from '@angular/core';

export type AppTheme = 'dark' | 'light';
export type AppFontSize = 'normal' | 'large' | 'extra-large';

@Injectable({
  providedIn: 'root',
})
export class ThemeAccessibilityService {
  readonly theme = signal<AppTheme>('light');
  readonly highContrast = signal<boolean>(false);
  readonly fontSize = signal<AppFontSize>('normal');
  readonly screenReaderMessage = signal<string>('');

  constructor() {
    // Restore from localStorage if in browser
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('belyftd_theme') as AppTheme;
      if (savedTheme) {
        this.theme.set(savedTheme);
      } else {
        this.theme.set('light');
      }

      const savedContrast = localStorage.getItem('belyftd_contrast') === 'true';
      this.highContrast.set(savedContrast);

      const savedFontSize = localStorage.getItem('belyftd_font_size') as AppFontSize;
      if (savedFontSize === 'normal' || savedFontSize === 'large' || savedFontSize === 'extra-large') {
        this.fontSize.set(savedFontSize);
      }
    }

    // Effect to apply theme classes to the document element
    effect(() => {
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        const currentTheme = this.theme();
        const contrast = this.highContrast();
        const font = this.fontSize();

        if (currentTheme === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
        }

        if (contrast) {
          root.classList.add('high-contrast');
        } else {
          root.classList.remove('high-contrast');
        }

        root.classList.remove('text-lg-scale', 'text-size-large', 'text-size-extra-large');
        if (font === 'large') root.classList.add('text-size-large');
        if (font === 'extra-large') root.classList.add('text-size-extra-large');

        // Save preferences
        if (typeof window !== 'undefined') {
          localStorage.setItem('belyftd_theme', currentTheme);
          localStorage.setItem('belyftd_contrast', String(contrast));
          localStorage.setItem('belyftd_font_size', font);
        }
      }
    });
  }

  toggleTheme(): void {
    const nextTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(nextTheme);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    }
    this.announce(`Theme changed to ${nextTheme} mode`);
  }

  toggleHighContrast(): void {
    const nextVal = !this.highContrast();
    this.highContrast.set(nextVal);
    this.announce(nextVal ? 'High contrast enabled' : 'Standard contrast enabled');
  }

  setFontSize(size: AppFontSize): void {
    const nextSize = size === 'large' || size === 'extra-large' ? size : 'normal';
    this.fontSize.set(nextSize);
    const label = nextSize === 'extra-large' ? 'extra large' : nextSize === 'large' ? 'large' : 'default';
    this.announce(`Text size set to ${label}`);
  }

  announce(message: string): void {
    this.screenReaderMessage.set(message);
    setTimeout(() => {
      this.screenReaderMessage.set('');
    }, 3000);
  }
}
