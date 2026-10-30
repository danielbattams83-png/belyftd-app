import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, effect, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {CurriculumModule, CurriculumUnit} from '../../models/curriculum.model';
import {CurriculumService} from '../../services/curriculum.service';
import {
  BrandMediaRecord,
  CmsMediaType,
  CmsWorkspaceAssetType,
  CmsWorkspaceMedia,
  CurriculumUnitUpdate,
  MediaCmsService,
  MentorMediaRecord,
  RemoteMediaUnavailableError,
} from '../../services/media-cms.service';
import {AdminHeaderComponent} from './admin-header.component';

type WorkspaceTab = 'curriculum' | 'mentors' | 'brand';

const DEFAULT_WORKSPACE_MEDIA: CmsWorkspaceMedia = {
  mentors: [
    {id: 'sophie', name: 'Sophie', avatarUrl: '/mentors/sophie.png', videoUrl: '', audioUrl: ''},
    {id: 'hannah', name: 'Hannah', avatarUrl: '/mentors/hannah.png', videoUrl: '', audioUrl: ''},
    {id: 'omari', name: 'Omari', avatarUrl: '/mentors/omari.png', videoUrl: '', audioUrl: ''},
    {id: 'steve', name: 'Steve', avatarUrl: '/mentors/steve.png', videoUrl: '', audioUrl: ''},
  ],
  brandMedia: [
    {id: 'hero', label: 'Primary hero artwork', description: 'Site-wide hero image or video poster.', url: ''},
    {id: 'poster', label: 'Default media poster', description: 'Fallback poster shown before playback.', url: ''},
    {id: 'badge', label: 'Achievement badge set', description: 'Badge sheet or hosted asset collection.', url: ''},
  ],
};

@Component({
  selector: 'app-admin-content',
  imports: [AdminHeaderComponent, CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-content.component.html',
  styleUrl: './admin-content.component.scss',
})
export class AdminContentComponent {
  readonly curriculum = inject(CurriculumService);
  readonly mediaCms = inject(MediaCmsService);
  readonly activeTab = signal<WorkspaceTab>('curriculum');
  readonly search = signal('');
  readonly expanded = signal(new Set<string>());
  readonly activeModuleId = signal('');
  readonly activeUnitId = signal('');
  readonly draft = signal<CurriculumUnitUpdate | null>(null);
  readonly loadingUnit = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal<CmsMediaType | null>(null);
  readonly message = signal('');
  readonly error = signal('');
  readonly mentors = signal<MentorMediaRecord[]>(DEFAULT_WORKSPACE_MEDIA.mentors);
  readonly brandMedia = signal<BrandMediaRecord[]>(DEFAULT_WORKSPACE_MEDIA.brandMedia);
  readonly savingWorkspace = signal(false);
  readonly uploadingWorkspaceKey = signal<string | null>(null);
  readonly workspaceMessage = signal('');
  private selectionRequest = 0;

  readonly filteredModules = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.curriculum.modules();
    return this.curriculum.modules().flatMap(module => {
      const moduleMatch = `${module.id} ${module.title}`.toLowerCase().includes(query);
      const units = moduleMatch ? module.units : module.units.filter(unit =>
        `${unit.id} ${unit.title}`.toLowerCase().includes(query));
      return units.length ? [{...module, units}] : [];
    });
  });
  readonly activeModule = computed(() =>
    this.curriculum.modules().find(module => module.id === this.activeModuleId()) ?? null);
  readonly activeUnit = computed(() =>
    this.activeModule()?.units.find(unit => unit.id === this.activeUnitId()) ?? null);
  readonly moduleNumber = computed(() => this.activeModuleId().replace('module-', ''));

  constructor() {
    void this.loadWorkspaceMedia();
    effect(() => {
      const firstModule = this.curriculum.modules()[0];
      if (!this.activeUnitId() && firstModule?.units[0]) void this.selectUnit(firstModule, firstModule.units[0]);
    });
  }

  moduleLabel(module: CurriculumModule): string {
    return `Module ${module.id.replace('module-', '')}`;
  }

  toggleModule(moduleId: string): void {
    this.expanded.update(current => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  isExpanded(moduleId: string): boolean {
    return this.expanded().has(moduleId) || Boolean(this.search().trim());
  }

  async selectUnit(module: CurriculumModule, unit: CurriculumUnit): Promise<void> {
    const request = ++this.selectionRequest;
    this.activeModuleId.set(module.id);
    this.activeUnitId.set(unit.id);
    this.draft.set(this.defaultDraft(unit));
    this.expanded.update(current => new Set(current).add(module.id));
    this.loadingUnit.set(true);
    this.message.set('');
    this.error.set('');
    try {
      const stored = await this.mediaCms.getUnit(module.id, unit.id);
      if (request !== this.selectionRequest) return;
      if (stored) this.draft.set(this.draftFromStored(unit, stored));
    } catch (error) {
      console.warn('[AdminContent] Unit hydration unavailable; using local editor defaults.', error);
      if (request === this.selectionRequest) this.error.set('');
    } finally {
      if (request === this.selectionRequest) this.loadingUnit.set(false);
    }
  }

  patchDraft<K extends keyof CurriculumUnitUpdate>(key: K, value: CurriculumUnitUpdate[K]): void {
    this.draft.update(current => current ? {...current, [key]: value} : current);
    this.message.set('');
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  onDrop(event: DragEvent, type: CmsMediaType): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) void this.uploadFile(file, type);
  }

  onFileSelected(event: Event, type: CmsMediaType): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.uploadFile(file, type);
  }

  async uploadFile(file: File, type: CmsMediaType): Promise<void> {
    const allowed = type === 'video' ? /\.(mp4|webm|mov)$/i : /\.(mp3|wav|aac|m4a)$/i;
    if (!allowed.test(file.name)) {
      this.error.set(type === 'video'
        ? 'Choose an MP4, WebM, or MOV video.'
        : 'Choose an MP3, WAV, AAC, or M4A audio file.');
      return;
    }
    this.uploading.set(type);
    this.error.set('');
    this.message.set('');
    try {
      const url = await this.mediaCms.upload(type, this.activeModuleId(), this.activeUnitId(), file);
      this.patchDraft(type === 'video' ? 'videoUrl' : 'audioUrl', url);
      const target = await this.save();
      if (target) {
        this.message.set(target === 'remote'
          ? `${type === 'video' ? 'Video' : 'Audio'} uploaded and saved to the unit.`
          : `${type === 'video' ? 'Video' : 'Audio'} uploaded; unit metadata was cached locally.`);
      }
    } catch (error) {
      console.warn(`[AdminContent] ${type} upload unavailable; manual URL mode remains active.`, error);
      this.error.set('');
      this.message.set(error instanceof RemoteMediaUnavailableError
        ? error.message
        : `Direct ${type} upload is unavailable. Add a manual CDN URL instead.`);
    } finally {
      this.uploading.set(null);
    }
  }

  async save(): Promise<'remote' | 'local' | null> {
    const update = this.draft();
    if (!update || this.saving()) return null;
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const target = await this.mediaCms.saveUnit(this.activeModuleId(), this.activeUnitId(), update);
      this.curriculum.updateUnit(this.activeModuleId(), this.activeUnitId(), {
        title: update.title,
        description: update.description,
        content: update.content,
        audioUrl: update.audioUrl,
        videoUrl: update.videoUrl,
        mentorName: update.mentorName,
      });
      this.message.set(target === 'remote'
        ? 'Changes saved and available to student views.'
        : 'Saved locally. Manual URL mode is active until Firebase reconnects.');
      return target;
    } catch (error) {
      this.error.set(this.errorText(error, 'Unable to save this unit.'));
      return null;
    } finally {
      this.saving.set(false);
    }
  }

  private errorText(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  setTab(tab: WorkspaceTab): void {
    this.activeTab.set(tab);
    this.workspaceMessage.set('');
  }

  patchMentor(id: string, key: keyof Pick<MentorMediaRecord, 'avatarUrl' | 'videoUrl' | 'audioUrl'>, value: string): void {
    this.mentors.update(items => items.map(item => item.id === id ? {...item, [key]: value} : item));
    this.workspaceMessage.set('');
  }

  patchBrandMedia(id: string, value: string): void {
    this.brandMedia.update(items => items.map(item => item.id === id ? {...item, url: value} : item));
    this.workspaceMessage.set('');
  }

  workspaceProgressKey(scope: 'mentor' | 'brand', id: string, field: string): string {
    return `${scope}:${id}:${field}`;
  }

  async onWorkspaceFileSelected(
    event: Event,
    scope: 'mentor' | 'brand',
    id: string,
    field: 'avatarUrl' | 'videoUrl' | 'audioUrl' | 'url',
  ): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const assetType: CmsWorkspaceAssetType = field === 'videoUrl' ? 'video' : field === 'audioUrl' ? 'audio' : 'image';
    const allowed = assetType === 'image'
      ? /\.(png|jpe?g|webp|gif)$/i
      : assetType === 'video'
        ? /\.(mp4|webm|mov)$/i
        : /\.(mp3|wav|m4a|aac)$/i;
    if (!allowed.test(file.name)) {
      this.workspaceMessage.set(`Choose a supported ${assetType} file.`);
      return;
    }

    const key = this.workspaceProgressKey(scope, id, field);
    this.uploadingWorkspaceKey.set(key);
    this.workspaceMessage.set('');
    try {
      const url = await this.mediaCms.uploadWorkspaceAsset(
        scope === 'mentor' ? 'mentors' : 'brand',
        id,
        assetType,
        key,
        file,
      );
      if (scope === 'mentor' && field !== 'url') this.patchMentor(id, field, url);
      else this.patchBrandMedia(id, url);
      const target = await this.mediaCms.saveWorkspaceMedia({
        mentors: this.mentors(),
        brandMedia: this.brandMedia(),
      });
      this.workspaceMessage.set(target === 'remote'
        ? `${assetType[0].toUpperCase()}${assetType.slice(1)} uploaded and saved.`
        : `${assetType[0].toUpperCase()}${assetType.slice(1)} uploaded; workspace metadata was cached locally.`);
    } catch (error) {
      console.warn('[AdminContent] Workspace upload unavailable; manual URL mode remains active.', error);
      this.workspaceMessage.set('Direct upload is unavailable. Paste a hosted media URL instead.');
    } finally {
      this.uploadingWorkspaceKey.set(null);
    }
  }

  async saveWorkspaceMedia(): Promise<void> {
    if (this.savingWorkspace()) return;
    this.savingWorkspace.set(true);
    this.workspaceMessage.set('');
    try {
      const target = await this.mediaCms.saveWorkspaceMedia({
        mentors: this.mentors(),
        brandMedia: this.brandMedia(),
      });
      this.workspaceMessage.set(target === 'remote'
        ? 'Workspace media saved.'
        : 'Workspace media saved locally. Remote Firebase is currently unavailable.');
    } finally {
      this.savingWorkspace.set(false);
    }
  }

  private async loadWorkspaceMedia(): Promise<void> {
    const media = await this.mediaCms.loadWorkspaceMedia(DEFAULT_WORKSPACE_MEDIA);
    this.mentors.set(media.mentors);
    this.brandMedia.set(media.brandMedia);
  }

  private defaultDraft(unit: CurriculumUnit): CurriculumUnitUpdate {
    return {
      title: unit.title,
      description: unit.description || '',
      estimatedDuration: '',
      videoUrl: unit.videoUrl || '',
      audioUrl: unit.audioUrl || '',
      mentorName: unit.mentorName || 'Sophie',
      content: unit.content || '',
      published: true,
      requiresTierUnlock: false,
    };
  }

  private draftFromStored(unit: CurriculumUnit, stored: Partial<CurriculumUnitUpdate> & {textContent?: string}): CurriculumUnitUpdate {
    const fallback = this.defaultDraft(unit);
    return {
      title: stored.title || fallback.title,
      description: stored.description ?? fallback.description,
      estimatedDuration: stored.estimatedDuration ?? fallback.estimatedDuration,
      videoUrl: stored.videoUrl ?? fallback.videoUrl,
      audioUrl: stored.audioUrl ?? fallback.audioUrl,
      mentorName: stored.mentorName ?? fallback.mentorName,
      content: stored.content ?? stored.textContent ?? fallback.content,
      published: stored.published !== false,
      requiresTierUnlock: stored.requiresTierUnlock ?? false,
    };
  }
}
