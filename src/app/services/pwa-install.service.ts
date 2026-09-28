import {Injectable, signal, computed} from '@angular/core';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const LOCAL_STORAGE_KEY_PWA_DISMISSED = 'belyftd_pwa_banner_dismissed';

@Injectable({
  providedIn: 'root',
})
export class PwaInstallService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  // Signal state
  readonly canNativeInstall = signal<boolean>(false);
  readonly isAppInstalled = signal<boolean>(false);
  readonly isBannerDismissed = signal<boolean>(false);

  // Computed banner visibility
  readonly showInstallBanner = computed(() => {
    return !this.isAppInstalled() && !this.isBannerDismissed();
  });

  constructor() {
    if (typeof window !== 'undefined') {
      // 1. Check if already installed / standalone mode
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      
      if (isStandalone) {
        this.isAppInstalled.set(true);
      }

      // 2. Check if user previously dismissed banner
      const dismissed = localStorage.getItem(LOCAL_STORAGE_KEY_PWA_DISMISSED) === 'true';
      this.isBannerDismissed.set(dismissed);

      // 3. Listen for Chrome / Android / Edge PWA install prompt
      window.addEventListener('beforeinstallprompt', (event: Event) => {
        // Prevent default mini-infobar
        event.preventDefault();
        this.deferredPrompt = event as BeforeInstallPromptEvent;
        this.canNativeInstall.set(true);
        console.log('[PwaInstallService] Captured beforeinstallprompt event');
      });

      // 4. Listen for app installed event
      window.addEventListener('appinstalled', () => {
        this.isAppInstalled.set(true);
        this.deferredPrompt = null;
        this.canNativeInstall.set(false);
        console.log('[PwaInstallService] App was successfully installed!');
      });
    }
  }

  /**
   * Triggers the native browser install prompt if available.
   * If not available (e.g. Safari iOS or Firefox), provides instructions.
   */
  async promptInstall(): Promise<'accepted' | 'dismissed' | 'unsupported'> {
    if (this.deferredPrompt) {
      try {
        await this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;
        console.log(`[PwaInstallService] User install choice outcome: ${choice.outcome}`);
        
        if (choice.outcome === 'accepted') {
          this.isAppInstalled.set(true);
        }
        
        this.deferredPrompt = null;
        this.canNativeInstall.set(false);
        return choice.outcome;
      } catch (err) {
        console.warn('[PwaInstallService] Error triggering native prompt:', err);
        return 'unsupported';
      }
    } else {
      console.log('[PwaInstallService] Native prompt not available. Displaying manual instructions.');
      return 'unsupported';
    }
  }

  /**
   * Dismisses the banner and persists the dismissal in localStorage
   */
  dismissBanner(): void {
    this.isBannerDismissed.set(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY_PWA_DISMISSED, 'true');
    }
    console.log('[PwaInstallService] PWA Install Banner dismissed.');
  }

  /**
   * Resets the dismissal flag (for testing or re-prompts)
   */
  resetDismissal(): void {
    this.isBannerDismissed.set(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEY_PWA_DISMISSED);
    }
  }
}
