import {cleanContent} from '../services/reading-content';
import {canAccessModule} from '../services/tier.service';
import {AudioPlayerService} from '../services/audio-player.service';
import {productionMentorForLabel} from '../services/production-mentors';
import {MentorAudioComponent} from './mentor-audio.component';
import {AudioTrack} from '../models/app.models';
import {parseMentorLabel, isProductionMentorVariant} from '../services/course-assets';
import {BackButtonComponent} from './back-button.component';
import {ChangeDetectionStrategy, Component, ElementRef, OnInit, OnDestroy, computed, effect, inject, signal, viewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {ModuleUnitDocument} from '../models/firestore.models';
import {FirebaseService, SponsorProfileDocument} from '../services/firebase.service';

@Component({
  selector: 'app-course-unit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MentorAudioComponent, BackButtonComponent, CommonModule, MatIconModule],
  template: `
    <section class="fixed inset-0 z-50 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950 sm:p-8">
      <div class="mx-auto max-w-3xl space-y-6">
        <app-back-button fallback="/courses" />

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

            @if (hasMediaAccess() && videoMedia().length > 0) {
              <section class="space-y-3">
                <div class="flex flex-wrap gap-2" aria-label="Choose video avatar or language">
                  @for (media of videoMedia(); track media.path) {
                    <button
                      type="button"
                      (click)="selectVideo(media)"
                      [attr.aria-pressed]="selectedVideo()?.url === media.url"
                      class="rounded-full border px-4 py-2 text-sm font-semibold transition"
                      [class]="selectedVideo()?.url === media.url
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'"
                    >{{ media.key }}</button>
                  }
                </div>
                @if (selectedVideo(); as activeVideo) {
                  <div class="relative overflow-hidden rounded-2xl bg-black">
                    <video
                      #videoPlayer
                      class="block w-full"
                      controls
                      preload="metadata"
                      playsinline
                      webkit-playsinline
                      (loadstart)="videoLoading.set(true)"
                      (loadeddata)="videoLoading.set(false); videoLoadError.set(false)"
                      (canplay)="videoLoading.set(false)"
                      (error)="handleVideoError()"
                    >
                      Your browser does not support video playback.
                    </video>
                    @if (videoLoading()) {
                      <div class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35" role="status" aria-label="Loading video">
                        <span class="h-10 w-10 animate-spin rounded-full border-4 border-white/35 border-t-white"></span>
                      </div>
                    }
                    <span class="sr-only">{{ activeVideo.key }}</span>
                  </div>
                }
              </section>
            }

            @if (hasMediaAccess() && audioTracks().length) { <app-mentor-audio [tracks]="audioTracks()" /> }

            <div class="whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-200">{{ cleanContent(lesson.textContent) }}</div>
          </article>
        }
      </div>
    </section>
  `,
})
export class CourseUnitComponent implements OnInit, OnDestroy {
  readonly cleanContent = cleanContent;
  private readonly route = inject(ActivatedRoute);
  private readonly firebaseService = inject(FirebaseService);

  private readonly audioPlayer = inject(AudioPlayerService);
  readonly hasMediaAccess = computed(() => canAccessModule(this.firebaseService.subscriptionTier(), this.route.snapshot.paramMap.get('moduleId') ?? ''));
  private destroyed = false;

  ngOnDestroy(): void {
    this.destroyed = true;
    const video = this.videoPlayer()?.nativeElement;
    if (video) { video.pause(); video.currentTime = 0; video.removeAttribute('src'); video.load(); }
    this.audioPlayer.close();
  }

  readonly unit = signal<ModuleUnitDocument | null>(null);
  readonly sponsor = signal<SponsorProfileDocument | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly audioTracks = signal<AudioTrack[]>([]);
  readonly videoMedia = signal<{key: string; url: string; path: string}[]>([]);
  readonly selectedVideo = signal<{key: string; url: string} | null>(null);
  readonly videoLoading = signal(false);
  readonly videoLoadError = signal(false);
  private readonly videoPlayer = viewChild<ElementRef<HTMLVideoElement>>('videoPlayer');

  constructor() {
    effect(() => {
      const media = this.selectedVideo();
      const player = this.videoPlayer()?.nativeElement;
      if (!media || !player) return;

      if (!this.hasMediaAccess()) { player.pause(); player.currentTime = 0; return; }
      player.src = media.url;
      player.load();
    });
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
        const [videoMedia, audioMedia] = this.hasMediaAccess() ? await Promise.all([this.resolveMedia(unit.videoUrls, moduleId, unitId, 'video'), this.resolveMedia(unit.audioUrls, moduleId, unitId, 'audio')]) : [[], []];
        if (this.destroyed) return;
        this.audioTracks.set(audioMedia.flatMap(({key: label, path}) => {
          if (!path.startsWith(`course-content/${moduleId}/${unitId}/audio/`)) return [];
          const {mentorName, language} = parseMentorLabel(label);
          return [{
            id: path, title: unit.title || unit.id,
            speaker: `${mentorName} - ${language}`, mentorName, language,
            speakerRole: 'Course mentor', speakerAvatar: productionMentorForLabel(label)?.avatar || '/logo.png', category: 'Mindset' as const,
            duration: 'Listen', durationSec: 0, audioUrl: path, transcript: unit.textContent,
            moodTags: [], likes: 0, isFavorite: false,
          }];
        }));
        const user = this.firebaseService.currentUser();
        if (user) {
          this.sponsor.set(await this.firebaseService.getSponsorProfile(user.uid));
        }
        this.unit.set(unit);

        this.videoMedia.set(videoMedia);
        this.selectedVideo.set(videoMedia[0] ?? null);
        this.videoLoading.set(videoMedia.length > 0);
      }
    } catch (error: unknown) {
      console.error('[CourseUnitComponent] Unable to load course unit:', error);
      this.errorMessage.set('The lesson could not be loaded. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  private async resolveMedia(
    storagePaths: Record<string, string>, moduleId: string, unitId: string, type: 'audio' | 'video'
  ): Promise<{key: string; url: string; path: string}[]> {
    const results = await Promise.allSettled(Object.entries(storagePaths ?? {}).map(async ([key, path]) => {
      if (typeof path !== 'string' || !path.trim() || !path.startsWith(`course-content/${moduleId}/${unitId}/${type}/`) || !isProductionMentorVariant(key)) return null;
      const url = await this.firebaseService.getCourseMediaUrlFromPath(path);
      if (typeof url !== 'string' || !url.trim()) return null;
      const {mentorName, language} = parseMentorLabel(key);
      return {key: `${mentorName} - ${language}${/ 2$/.test(key) ? ' (alternate)' : ''}`, url, path};
    }));
    return results.flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : []);
  }

  formatMentorLabel(key: string): string {
    if (key.includes(' - ')) return key;
    const match = key.match(/^([^(]+)\s*\(([^)]+)\)$/);
    if (match) return `${match[1].trim()} - ${match[2].trim()}`;
    return key;
  }

  selectVideo(media: {key: string; url: string}): void {
    if (this.selectedVideo()?.url === media.url) return;
    this.videoLoadError.set(false);
    this.videoLoading.set(true);
    this.selectedVideo.set(media);
  }

  handleVideoError(): void {
    this.videoLoading.set(false);
    const failed = this.selectedVideo()?.url;
    this.videoMedia.update(media => media.filter(item => item.url !== failed));
    this.selectedVideo.set(this.videoMedia()[0] ?? null);
  }
}
