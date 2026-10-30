import {Injectable, inject, signal} from '@angular/core';
import {getApps, initializeApp, FirebaseApp} from 'firebase/app';
import {Auth, getAuth, signInWithCustomToken} from 'firebase/auth';
import {doc, Firestore, getDoc, getFirestore, serverTimestamp, setDoc} from 'firebase/firestore';
import {FirebaseStorage, getDownloadURL, getStorage, ref, uploadBytesResumable} from 'firebase/storage';
import {environment} from '../../environments/environment';
import {ModuleUnitDocument} from '../models/firestore.models';
import {AdminAuthService} from './admin-auth.service';

export type CmsMediaType = 'video' | 'audio';
export type CmsWorkspaceAssetType = 'image' | 'video' | 'audio';
export type CmsSaveTarget = 'remote' | 'local';

export interface MentorMediaRecord {
  id: string;
  name: string;
  avatarUrl: string;
  videoUrl: string;
  audioUrl: string;
}

export interface BrandMediaRecord {
  id: string;
  label: string;
  description: string;
  url: string;
}

export interface CmsWorkspaceMedia {
  mentors: MentorMediaRecord[];
  brandMedia: BrandMediaRecord[];
}

export class RemoteMediaUnavailableError extends Error {
  constructor() {
    super('Direct upload is unavailable. Add a manual CDN URL instead.');
    this.name = 'RemoteMediaUnavailableError';
  }
}

export interface CurriculumUnitUpdate {
  title: string;
  description: string;
  estimatedDuration: string;
  videoUrl: string;
  audioUrl: string;
  mentorName: string;
  content: string;
  published: boolean;
  requiresTierUnlock: boolean;
}

@Injectable({providedIn: 'root'})
export class MediaCmsService {
  private readonly unitCachePrefix = 'lyftd-cms-unit:';
  private readonly workspaceCacheKey = 'lyftd-cms-workspace-media';
  private readonly adminAuth = inject(AdminAuthService);
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private storage: FirebaseStorage | null = null;
  private authenticated = false;
  private remoteDisabled = false;

  readonly videoProgress = signal(0);
  readonly audioProgress = signal(0);
  readonly workspaceUploadProgress = signal<Record<string, number>>({});
  readonly remoteAvailable = signal<boolean | null>(null);

  private async ensureAdminFirebase(): Promise<boolean> {
    if (this.remoteDisabled) return false;
    try {
      if (!environment.firebase.storageBucket?.trim()) {
        throw new Error('Firebase Storage bucket is not configured.');
      }
      if (!this.app) {
        const name = 'lyftd-media-cms';
        this.app = getApps().find(app => app.name === name) ?? initializeApp(environment.firebase, name);
        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);
        this.storage = getStorage(this.app, `gs://${environment.firebase.storageBucket}`);
      }
      if (!this.authenticated || !this.auth?.currentUser) {
        const customToken = await this.adminAuth.getFirebaseToken();
        await signInWithCustomToken(this.auth!, customToken);
        this.authenticated = true;
      }
      this.remoteAvailable.set(true);
      return true;
    } catch (error) {
      this.disableRemote(error);
      return false;
    }
  }

  async getUnit(moduleId: string, unitId: string): Promise<Partial<ModuleUnitDocument> | null> {
    const cached = this.readLocal<Partial<ModuleUnitDocument>>(this.unitCacheKey(moduleId, unitId));
    if (!await this.ensureAdminFirebase()) return cached;
    try {
      const snapshot = await getDoc(doc(this.db!, 'modules', moduleId, 'units', unitId));
      const remote = snapshot.exists() ? snapshot.data() as Partial<ModuleUnitDocument> : null;
      if (remote) this.writeLocal(this.unitCacheKey(moduleId, unitId), remote);
      return remote ? {...cached, ...remote} : cached;
    } catch (error) {
      this.disableRemote(error);
      return cached;
    }
  }

  async saveUnit(moduleId: string, unitId: string, update: CurriculumUnitUpdate): Promise<CmsSaveTarget> {
    this.writeLocal(this.unitCacheKey(moduleId, unitId), update);
    if (!await this.ensureAdminFirebase()) return 'local';
    try {
      await setDoc(doc(this.db!, 'modules', moduleId, 'units', unitId), {
        ...update,
        textContent: update.content,
        updatedAt: serverTimestamp(),
      }, {merge: true});
      return 'remote';
    } catch (error) {
      this.disableRemote(error);
      return 'local';
    }
  }

  async loadWorkspaceMedia(fallback: CmsWorkspaceMedia): Promise<CmsWorkspaceMedia> {
    const cached = this.readLocal<CmsWorkspaceMedia>(this.workspaceCacheKey);
    const local = cached ?? fallback;
    if (!await this.ensureAdminFirebase()) return local;
    try {
      const snapshot = await getDoc(doc(this.db!, 'adminMedia', 'workspace'));
      const remote = snapshot.exists() ? snapshot.data() as Partial<CmsWorkspaceMedia> : null;
      const result = {
        mentors: remote?.mentors?.length ? remote.mentors : local.mentors,
        brandMedia: remote?.brandMedia?.length ? remote.brandMedia : local.brandMedia,
      };
      this.writeLocal(this.workspaceCacheKey, result);
      return result;
    } catch (error) {
      this.disableRemote(error);
      return local;
    }
  }

  async saveWorkspaceMedia(media: CmsWorkspaceMedia): Promise<CmsSaveTarget> {
    this.writeLocal(this.workspaceCacheKey, media);
    if (!await this.ensureAdminFirebase()) return 'local';
    try {
      await setDoc(doc(this.db!, 'adminMedia', 'workspace'), {
        ...media,
        updatedAt: serverTimestamp(),
      }, {merge: true});
      return 'remote';
    } catch (error) {
      this.disableRemote(error);
      return 'local';
    }
  }

  async upload(
    type: CmsMediaType,
    moduleId: string,
    unitId: string,
    file: File,
  ): Promise<string> {
    if (!await this.ensureAdminFirebase() || !this.storage) throw new RemoteMediaUnavailableError();
    const progress = type === 'video' ? this.videoProgress : this.audioProgress;
    progress.set(0);
    const extension = type === 'video' ? 'mp4' : 'mp3';
    const folder = type === 'video' ? 'videos' : 'audio';
    const storagePath = `course-content/${folder}/${moduleId}/${unitId}.${extension}`;
    const task = uploadBytesResumable(ref(this.storage!, storagePath), file, {
      contentType: file.type || (type === 'video' ? 'video/mp4' : 'audio/mpeg'),
      customMetadata: {originalName: file.name},
    });

    return new Promise<string>((resolve, reject) => {
      task.on('state_changed',
        snapshot => progress.set(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)),
        error => {
          progress.set(0);
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            progress.set(100);
            resolve(url);
          } catch (error) {
            progress.set(0);
            reject(error);
          }
        },
      );
    });
  }

  async uploadWorkspaceAsset(
    scope: 'mentors' | 'brand',
    ownerId: string,
    assetType: CmsWorkspaceAssetType,
    progressKey: string,
    file: File,
  ): Promise<string> {
    if (!await this.ensureAdminFirebase() || !this.storage) throw new RemoteMediaUnavailableError();
    const safeOwnerId = ownerId.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const extension = this.fileExtension(file, assetType);
    const fileName = assetType === 'image' ? 'artwork' : assetType === 'video' ? 'greeting' : 'voice-sample';
    const storagePath = `admin-media/${scope}/${safeOwnerId}/${fileName}.${extension}`;
    this.setWorkspaceProgress(progressKey, 0);
    const task = uploadBytesResumable(ref(this.storage, storagePath), file, {
      contentType: file.type || this.defaultContentType(assetType, extension),
      customMetadata: {originalName: file.name},
    });

    return new Promise<string>((resolve, reject) => {
      task.on('state_changed',
        snapshot => this.setWorkspaceProgress(
          progressKey,
          Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100),
        ),
        error => {
          this.setWorkspaceProgress(progressKey, 0);
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            this.setWorkspaceProgress(progressKey, 100);
            resolve(url);
          } catch (error) {
            this.setWorkspaceProgress(progressKey, 0);
            reject(error);
          }
        },
      );
    });
  }

  workspaceProgress(key: string): number {
    return this.workspaceUploadProgress()[key] ?? 0;
  }

  private disableRemote(error: unknown): void {
    this.remoteDisabled = true;
    this.authenticated = false;
    this.remoteAvailable.set(false);
    console.warn('[MediaCmsService] Remote Firebase media is unavailable; using manual URL and local fallback mode.', error);
  }

  private unitCacheKey(moduleId: string, unitId: string): string {
    return `${this.unitCachePrefix}${moduleId}/${unitId}`;
  }

  private readLocal<T>(key: string): T | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) as T : null;
    } catch (error) {
      console.warn('[MediaCmsService] Local CMS cache could not be read.', error);
      return null;
    }
  }

  private writeLocal(key: string, value: unknown): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('[MediaCmsService] Local CMS cache could not be written.', error);
    }
  }

  private setWorkspaceProgress(key: string, progress: number): void {
    this.workspaceUploadProgress.update(current => ({...current, [key]: progress}));
  }

  private fileExtension(file: File, assetType: CmsWorkspaceAssetType): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowed = assetType === 'image'
      ? ['png', 'jpg', 'jpeg', 'webp', 'gif']
      : assetType === 'video'
        ? ['mp4', 'webm', 'mov']
        : ['mp3', 'wav', 'm4a', 'aac'];
    return extension && allowed.includes(extension)
      ? extension
      : assetType === 'image' ? 'png' : assetType === 'video' ? 'mp4' : 'mp3';
  }

  private defaultContentType(assetType: CmsWorkspaceAssetType, extension: string): string {
    if (assetType === 'image') return extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
    if (assetType === 'video') return extension === 'mov' ? 'video/quicktime' : `video/${extension}`;
    if (extension === 'mp3') return 'audio/mpeg';
    if (extension === 'm4a') return 'audio/mp4';
    return `audio/${extension}`;
  }
}
