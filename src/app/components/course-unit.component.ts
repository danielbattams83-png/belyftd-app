import {CurriculumService} from '../services/curriculum.service';
import {cleanContent} from '../services/reading-content';
import {canAccessModule} from '../services/tier.service';
import {AudioPlayerService} from '../services/audio-player.service';
import {productionMentorForLabel} from '../services/production-mentors';
import {MentorAudioComponent} from './mentor-audio.component';
import {AudioTrack} from '../models/app.models';
import {parseMentorLabel, isProductionMentorVariant} from '../services/course-assets';
import {NavigationService} from '../services/navigation.service';
import {TenantService} from '../services/tenant.service';
import {ChangeDetectionStrategy, Component, ElementRef, OnInit, OnDestroy, afterNextRender, computed, effect, inject, input, output, signal, viewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {ModuleUnitDocument} from '../models/firestore.models';
import {FirebaseService, SponsorProfileDocument} from '../services/firebase.service';

@Component({
  selector: 'app-course-unit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MentorAudioComponent, CommonModule, MatIconModule],
  styleUrl: './course-unit.component.scss',
  host: {'(document:keydown.escape)': 'onEscape()'},
  template: `
    <section class="fullscreen-page fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-slate-50 dark:bg-slate-950" role="dialog" aria-modal="true" [attr.aria-label]="unit()?.title || 'Course unit'">
      <header class="unit-modal-header sticky top-0 z-10 flex items-center justify-between gap-4 border-b-2 border-(--brand-accent) bg-slate-200/95 px-4 pb-2 shadow-sm backdrop-blur-md dark:bg-slate-900/95">
        @if (tenantService.activeTenant(); as tenant) {
          <img [src]="tenant.branding.logoUrl" [alt]="tenant.organizationName" width="140" height="72" class="unit-modal-logo" />
        } @else {
          <img src="/logo-wordmark-dark.png" alt="Lyftd" width="140" height="70" class="unit-modal-logo logo-on-light" />
          <img src="/logo-wordmark-light.png" alt="Lyftd" width="140" height="63" class="unit-modal-logo logo-on-dark" />
        }
        <button #closeButton type="button" (click)="close()" aria-label="Close lesson" title="Close lesson"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-200 hover:text-(--brand-accent) dark:text-slate-200 dark:hover:bg-slate-800 focus-accessible">
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </header>
      <div class="page-container space-y-6">

        @if (loading()) {
          <p class="rounded-2xl bg-white p-6 text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300" role="status">Loading lesson…</p>
        } @else if (errorMessage()) {
          <p class="rounded-2xl bg-white p-6 text-rose-700 shadow-sm dark:bg-slate-900 dark:text-rose-300" role="alert">{{ errorMessage() }}</p>
        } @else if (unit(); as lesson) {
          <article class="unit-reading-card card space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
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

            @if (hasMediaAccess() && lesson.videoUrl) {
              <div class="unit-media-wrapper video-container">
                <video [src]="lesson.videoUrl" controls playsinline preload="metadata" class="reader-video">
                  Your browser does not support video playback.
                </video>
              </div>
            }

            @if (hasMediaAccess() && lesson.audioUrl) {
              <div class="unit-media-wrapper audio-dock">
                <div class="audio-dock__info">
                  <div class="audio-icon-wrap"><mat-icon aria-hidden="true">headphones</mat-icon></div>
                  <div class="audio-meta">
                    <span class="audio-label">Mentor Narration</span>
                    <span class="audio-sub">{{ lesson.mentorName || 'Listen with your mentor' }}</span>
                  </div>
                </div>
                <audio controls [src]="lesson.audioUrl" preload="metadata" class="reader-audio-player">
                  Your browser does not support audio playback.
                </audio>
              </div>
            }

            @if (hasMediaAccess() && visibleVideoMedia().length > 0) {
              <section class="space-y-3">
                <div class="flex flex-wrap gap-2" aria-label="Choose video avatar or language">
                  @for (media of visibleVideoMedia(); track media.path) {
                    <button
                      type="button"
                      (click)="selectVideo(media)"
                      [attr.aria-pressed]="activeVideo()?.url === media.url"
                      class="rounded-full border px-4 py-2 text-sm font-semibold transition"
                      [class]="activeVideo()?.url === media.url
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'"
                    >{{ media.key }}</button>
                  }
                </div>
                @if (activeVideo(); as currentVideo) {
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
                    <span class="sr-only">{{ currentVideo.key }}</span>
                  </div>
                }
              </section>
            }

            @if (hasMediaAccess() && visibleAudioTracks().length) { <app-mentor-audio [tracks]="visibleAudioTracks()" /> }
            @if (mediaUnavailable()) {
              <p class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200" role="status">
                Audio and video for this lesson couldn&apos;t be loaded right now. Please sign out and back in, or try again shortly.
              </p>
            }

            <div class="unit-content-body whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-200">{{ cleanContent(lesson.textContent) }}</div>
            @if (hasMediaAccess()) {
              <button type="button" (click)="curriculum.toggleCompleted(moduleId, unitId)"
                [attr.aria-pressed]="curriculum.isCompleted(moduleId, unitId)"
                class="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus-accessible"
                [class]="curriculum.isCompleted(moduleId, unitId)
                  ? 'border border-emerald-500 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200'
                  : 'bg-indigo-400 text-slate-950 hover:bg-indigo-300'">
                @if (curriculum.isCompleted(moduleId, unitId)) {
                  <mat-icon aria-hidden="true">check_circle</mat-icon>Completed &middot; tap to undo
                } @else {
                  Mark unit completed
                }
              </button>
            }
          </article>
        }
      </div>
    </section>
  `,
})
export class CourseUnitComponent implements OnInit, OnDestroy {
  readonly cleanContent = cleanContent;
  readonly curriculum = inject(CurriculumService);
  /** Set when the reader is shown as an in-place modal; otherwise ids come from the route. */
  readonly moduleIdInput = input<string | undefined>(undefined, {alias: 'moduleId'});
  readonly unitIdInput = input<string | undefined>(undefined, {alias: 'unitId'});
  readonly closed = output<void>();
  private readonly route = inject(ActivatedRoute);
  get moduleId(): string { return String(this.moduleIdInput() ?? this.route.snapshot.paramMap.get('moduleId') ?? '').trim(); }
  get unitId(): string { return String(this.unitIdInput() ?? this.route.snapshot.paramMap.get('unitId') ?? '').trim(); }
  private readonly embedded = computed(() => this.moduleIdInput() !== undefined);
  private readonly navigation = inject(NavigationService);
  readonly tenantService = inject(TenantService);
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  close(): void {
    if (this.embedded()) this.closed.emit();
    else this.navigation.goBack('/courses');
  }

  onEscape(): void {
    if (this.embedded()) this.closed.emit();
  }
  private readonly firebaseService = inject(FirebaseService);

  private readonly audioPlayer = inject(AudioPlayerService);
  readonly hasMediaAccess = computed(() => canAccessModule(this.firebaseService.subscriptionTier(), this.moduleIdInput() ?? this.route.snapshot.paramMap.get('moduleId') ?? ''));
  private destroyed = false;
  private previousBodyOverflow: string | null = null;

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.previousBodyOverflow !== null) document.body.style.overflow = this.previousBodyOverflow;
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
  private readonly chosenMentorIds = computed(() => this.firebaseService.userProfile()?.selectedMentorIds ?? []);
  readonly visibleVideoMedia = computed(() => this.filterByChosenMentors(this.videoMedia(), media => media.key));
  readonly visibleAudioTracks = computed(() => this.filterByChosenMentors(this.audioTracks(), track => track.speaker));
  readonly activeVideo = computed(() => {
    const list = this.visibleVideoMedia();
    const chosen = this.selectedVideo();
    return list.find(media => media.url === chosen?.url) ?? list[0] ?? null;
  });
  readonly mediaUnavailable = signal(false);
  readonly videoLoading = signal(false);
  readonly videoLoadError = signal(false);
  private readonly videoPlayer = viewChild<ElementRef<HTMLVideoElement>>('videoPlayer');

  constructor() {
    afterNextRender(() => {
      if (!this.embedded()) return;
      this.previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      this.closeButton()?.nativeElement.focus();
    });
    effect(() => {
      const media = this.activeVideo();
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
    const moduleId = this.moduleId;
    const unitId = this.unitId;
    if (!moduleId || !unitId) {
      this.errorMessage.set('This lesson could not be found.');
      this.loading.set(false);
      return;
    }

    if (!this.curriculum.getUnit(moduleId, unitId)) {
      console.error(`[CourseUnit] Lookup failed for module: "${moduleId}", unit: "${unitId}"`, {
        availableModules: this.curriculum.modules().map(m => ({id: m.id, units: m.units?.map(u => u.id)})),
      });
    }

    try {
      const unit = await this.firebaseService.getModuleUnit(moduleId, unitId);
      if (!unit) {
        this.errorMessage.set('This lesson could not be found.');
      } else if (unit.published === false) {
        this.errorMessage.set('This lesson is not currently published.');
      } else {
        const [legacyVideo, legacyAudio] = this.hasMediaAccess()
          ? await Promise.all([
            this.resolveMedia(unit.videoUrls, moduleId, unitId, 'video'),
            this.resolveMedia(unit.audioUrls, moduleId, unitId, 'audio'),
          ])
          : [[], []];
        const videoMedia = legacyVideo;
        const audioMedia = legacyAudio;
        if (this.destroyed) return;
        this.audioTracks.set(audioMedia.flatMap(({key: label, path}) => {
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

        const expectedMedia = Object.keys(unit.audioUrls ?? {}).length + Object.keys(unit.videoUrls ?? {}).length;
        this.mediaUnavailable.set(this.hasMediaAccess() && expectedMedia > 0 && videoMedia.length + audioMedia.length === 0);
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
    results.forEach(result => {
      if (result.status === 'rejected') console.warn(`[CourseUnit] ${type} unavailable for ${moduleId}/${unitId}:`, result.reason);
    });
    return results.flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : []);
  }

  formatMentorLabel(key: string): string {
    if (key.includes(' - ')) return key;
    const match = key.match(/^([^(]+)\s*\(([^)]+)\)$/);
    if (match) return `${match[1].trim()} - ${match[2].trim()}`;
    return key;
  }

  // Falls back to every mentor when the user's picks have no recording in this unit, so the lesson never ends up empty.
  private filterByChosenMentors<T>(items: T[], labelOf: (item: T) => string): T[] {
    const chosen = this.chosenMentorIds();
    if (!chosen.length) return items;
    const matching = items.filter(item => {
      const mentorId = productionMentorForLabel(labelOf(item))?.id;
      return mentorId !== undefined && chosen.includes(mentorId);
    });
    return matching.length ? matching : items;
  }

  selectVideo(media: {key: string; url: string}): void {
    if (this.activeVideo()?.url === media.url) return;
    this.videoLoadError.set(false);
    this.videoLoading.set(true);
    this.selectedVideo.set(media);
  }

  handleVideoError(): void {
    this.videoLoading.set(false);
    const failed = this.activeVideo()?.url;
    this.videoMedia.update(media => media.filter(item => item.url !== failed));
    this.selectedVideo.set(this.visibleVideoMedia()[0] ?? null);
  }
}
