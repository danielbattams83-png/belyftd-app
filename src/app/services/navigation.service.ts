import {DOCUMENT, Location} from '@angular/common';
import {inject, Injectable} from '@angular/core';
import {Router} from '@angular/router';

@Injectable({providedIn: 'root'})
export class NavigationService {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  goBack(fallback = '/dashboard'): void {
    const history = this.document.defaultView?.history;
    if (history && history.length > 1) {
      this.location.back();
    } else {
      // Replace the direct entry so Back cannot loop between it and its parent.
      void this.router.navigateByUrl(fallback, {replaceUrl: true});
    }
  }
}
