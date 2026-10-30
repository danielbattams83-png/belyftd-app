import {Injectable, inject, signal} from '@angular/core';
import {getApps, initializeApp, FirebaseApp} from 'firebase/app';
import {Auth, getAuth, signInWithCustomToken} from 'firebase/auth';
import {doc, Firestore, getDoc, getFirestore, serverTimestamp, setDoc} from 'firebase/firestore';
import {FirebaseStorage, getDownloadURL, getStorage, ref, uploadBytesResumable} from 'firebase/storage';
import {environment} from '../../environments/environment';
import {ModuleUnitDocument} from '../models/firestore.models';
import {AdminAuthService} from './admin-auth.service';

export type CmsMediaType = 'video' | 'audio';

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
  private readonly adminAuth = inject(AdminAuthService);
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private storage: FirebaseStorage | null = null;
  private authenticated = false;

  readonly videoProgress = signal(0);
  readonly audioProgress = signal(0);

  private async ensureAdminFirebase(): Promise<void> {
    if (!this.app) {
      const name = 'lyftd-media-cms';
      this.app = getApps().find(app => app.name === name) ?? initializeApp(environment.firebase, name);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.storage = getStorage(this.app, `gs://${environment.firebase.storageBucket}`);
    }
    if (this.authenticated && this.auth?.currentUser) return;
    const customToken = await this.adminAuth.getFirebaseToken();
    await signInWithCustomToken(this.auth!, customToken);
    this.authenticated = true;
  }

  async getUnit(moduleId: string, unitId: string): Promise<Partial<ModuleUnitDocument> | null> {
    await this.ensureAdminFirebase();
    const snapshot = await getDoc(doc(this.db!, 'modules', moduleId, 'units', unitId));
    return snapshot.exists() ? snapshot.data() as Partial<ModuleUnitDocument> : null;
  }

  async saveUnit(moduleId: string, unitId: string, update: CurriculumUnitUpdate): Promise<void> {
    await this.ensureAdminFirebase();
    await setDoc(doc(this.db!, 'modules', moduleId, 'units', unitId), {
      ...update,
      textContent: update.content,
      updatedAt: serverTimestamp(),
    }, {merge: true});
  }

  async upload(
    type: CmsMediaType,
    moduleId: string,
    unitId: string,
    file: File,
  ): Promise<string> {
    await this.ensureAdminFirebase();
    const progress = type === 'video' ? this.videoProgress : this.audioProgress;
    progress.set(0);
    const extension = type === 'video' ? 'mp4' : 'mp3';
    const storagePath = `course-content/${type}s/${moduleId}/${unitId}.${extension}`;
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
}
