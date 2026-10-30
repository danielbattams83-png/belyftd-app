import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, effect, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CurriculumModule, CurriculumUnit} from '../../models/curriculum.model';
import {CurriculumService} from '../../services/curriculum.service';
import {CmsMediaType, CurriculumUnitUpdate, MediaCmsService} from '../../services/media-cms.service';
import {AdminHeaderComponent} from './admin-header.component';

@Component({
  selector: 'app-admin-content',
  imports: [AdminHeaderComponent, CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-content.component.html',
  styleUrl: './admin-content.component.scss',
})
export class AdminContentComponent {
  readonly curriculum = inject(CurriculumService);
  readonly mediaCms = inject(MediaCmsService);
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
    this.expanded.update(current => new Set(current).add(module.id));
    this.loadingUnit.set(true);
    this.message.set('');
    this.error.set('');
    try {
      const stored = await this.mediaCms.getUnit(module.id, unit.id);
      if (request !== this.selectionRequest) return;
      this.draft.set({
        title: stored?.title || unit.title,
        description: stored?.description || unit.description || '',
        estimatedDuration: stored?.estimatedDuration || '',
        videoUrl: stored?.videoUrl || '',
        audioUrl: stored?.audioUrl || '',
        mentorName: stored?.mentorName || 'Sophie',
        content: stored?.content || stored?.textContent || '',
        published: stored?.published !== false,
        requiresTierUnlock: stored?.requiresTierUnlock ?? false,
      });
    } catch (error) {
      if (request === this.selectionRequest) this.error.set(this.errorText(error, 'Unable to load this unit.'));
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
      this.message.set(`${type === 'video' ? 'Video' : 'Audio'} uploaded. Save changes to publish it.`);
    } catch (error) {
      this.error.set(this.errorText(error, `Unable to upload the ${type}.`));
    } finally {
      this.uploading.set(null);
    }
  }

  async save(): Promise<void> {
    const update = this.draft();
    if (!update || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await this.mediaCms.saveUnit(this.activeModuleId(), this.activeUnitId(), update);
      this.curriculum.updateUnit(this.activeModuleId(), this.activeUnitId(), {
        title: update.title,
        description: update.description,
        content: update.content,
        audioUrl: update.audioUrl,
        videoUrl: update.videoUrl,
        mentorName: update.mentorName,
      });
      this.message.set('Changes saved and available to student views.');
    } catch (error) {
      this.error.set(this.errorText(error, 'Unable to save this unit.'));
    } finally {
      this.saving.set(false);
    }
  }

  private errorText(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
  }
}
