import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {ModuleUnitDocument} from '../models/firestore.models';
import {FirebaseService, SponsorProfileDocument} from '../services/firebase.service';

@Component({
  selector: 'app-course-unit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, RouterLink],
  template: `
    <section class="fixed inset-0 z-50 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950 sm:p-8">
      <div class="mx-auto max-w-3xl space-y-6">
        <a routerLink="/" class="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-900">
          <mat-icon>arrow_back</mat-icon>
          Back to Lyftd
        </a>

        @if (loading()) {
          <p class="rounded-2xl bg-white p-6 text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300" role="status">Loading lesson…</p>
        } @else if (errorMessage()) {
          <p class="rounded-2xl bg-white p-6 text-rose-700 shadow-sm dark:bg-slate-900 dark:text-rose-300" role="alert">{{ errorMessage() }}</p>
        } @else if (unit(); as lesson) {
          <article class="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            @if (sponsor(); as activeSponsor) {
              <aside class="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 p-4 dark:border-indigo-900 dark:from-indigo-950/60 dark:to-violet-950/40">
                <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <mat-icon>volunteer_activism</mat-icon>
                </span>
                <span>
                  <span class="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Supported by</span>
                  <span class="block text-sm font-bold text-slate-900 dark:text-white">{{ activeSponsor.sponsorName }}</span>
                </span>
              </aside>
            }
            <header class="space-y-2">
              <p class="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Tier {{ lesson.minTier }} course unit</p>
              <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white">{{ lesson.title || lesson.id }}</h1>
            </header>

            @for (media of videoMedia(); track media.key) {
              <video class="w-full rounded-2xl bg-black" controls preload="metadata" [src]="media.url">
                Your browser does not support video playback.
              </video>
            }

            @for (media of audioMedia(); track media.key) {
              <section class="space-y-2 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ media.key }}</h2>
                <audio class="w-full" controls preload="metadata" [src]="media.url">
                  Your browser does not support audio playback.
                </audio>
              </section>
            }

            <div class="whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-200">{{ lesson.textContent }}</div>
          </article>
        }
      </div>
    </section>
  `,
})
export class CourseUnitComponent implements OnDestroy, OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly firebaseService = inject(FirebaseService);

  readonly unit = signal<ModuleUnitDocument | null>(null);
  readonly sponsor = signal<SponsorProfileDocument | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly audioMedia = signal<{key: string; url: string}[]>([]);
  readonly videoMedia = signal<{key: string; url: string}[]>([]);

  private readonly objectUrls: string[] = [];

  ngOnDestroy(): void {
    this.objectUrls.forEach(url => URL.revokeObjectURL(url));
  }

  ngOnInit(): void {
    void this.loadUnit();
  }

  private async loadUnit(): Promise<void> {
    const moduleId = this.route.snapshot.paramMap.get('moduleId');
    const unitId = this.route.snapshot.paramMap.get('unitId');
    if (!moduleId || !unitId) {
      this.errorMessage.set('This lesson could not be found.');
      this.loading.set(false);
      return;
    }

    try {
      const unit = await this.firebaseService.getModuleUnit(moduleId, unitId);
      if (!unit) {
        this.errorMessage.set('This lesson could not be found.');
      } else {
        const [audioMedia, videoMedia] = await Promise.all([
          this.resolveMedia(unit.audioUrls),
          this.resolveMedia(unit.videoUrls),
        ]);
        const user = this.firebaseService.currentUser();
        if (user) {
          this.sponsor.set(await this.firebaseService.getSponsorProfile(user.uid));
        }
        this.unit.set(unit);
        this.audioMedia.set(audioMedia);
        this.videoMedia.set(videoMedia);
      }
    } catch (error: unknown) {
      console.error('[CourseUnitComponent] Unable to load course unit:', error);
      this.errorMessage.set('The lesson could not be loaded. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  private async resolveMedia(
    storagePaths: Record<string, string>
  ): Promise<{key: string; url: string}[]> {
    const media = await Promise.all(Object.entries(storagePaths ?? {}).map(async ([key, storagePath]) => {
      const url = await this.firebaseService.getCourseMediaObjectUrlFromPath(storagePath);
      this.objectUrls.push(url);
      return {key, url};
    }));
    return media;
  }
}
