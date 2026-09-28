import { Injectable, signal } from '@angular/core';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  Firestore,
  serverTimestamp
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
  Auth,
  User
} from 'firebase/auth';

export interface UserRegistrationData {
  email: string;
  password?: string;
  displayName: string;
  phoneNumber: string;
  country: string;
  countryCode: string;
}

export interface UserProfileDocument {
  id: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  country: string;
  countryCode: string;
  totalXp: number;
  streakDays: number;
  completedCourses: string[];
  role: 'student' | 'mentor' | 'admin';
  createdAt: string | unknown;
  updatedAt: string | unknown;
}

export const COUNTRY_OPTIONS = [
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
  { name: 'Ghana', code: 'GH', dialCode: '+233', flag: '🇬🇭' },
  { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪' },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦' },
  { name: 'New Zealand', code: 'NZ', dialCode: '+64', flag: '🇳🇿' },
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
  { name: 'Jamaica', code: 'JM', dialCode: '+1-876', flag: '🇯🇲' }
];

const LOCAL_STORAGE_KEY_USER = 'belyftd_user_profile';
const LOCAL_STORAGE_KEY_REGISTERED = 'belyftd_user_registered';
const LOCAL_STORAGE_KEY_COMPLETED = 'belyftd_completed_courses';
const LOCAL_STORAGE_KEY_LAST_COMPLETION_DATE = 'belyftd_last_completion_date';
const LOCAL_STORAGE_KEY_LAST_COMPLETION_TS = 'belyftd_last_completion_timestamp';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private auth: Auth | null = null;

  // Reactive state signals
  readonly currentUser = signal<User | null>(null);
  readonly userProfile = signal<UserProfileDocument | null>(null);
  readonly hasRegisteredUser = signal<boolean>(false);
  readonly isConnected = signal<boolean>(false);
  readonly isUsingLocalStorageFallback = signal<boolean>(false);
  readonly authLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  // Deep-link notification target course signal
  readonly targetCourseIdFromNotification = signal<string | null>(null);
  readonly streakUpdateEvent = signal<{streak: number; timestamp: string; isNewDay: boolean; dateStr: string} | null>(null);

  constructor() {
    this._initFirebase();
    this._loadLocalStorageFallback();
    this._checkUrlForCourseDeepLink();
  }

  /**
   * Initializes the Firebase v10+ app and services
   */
  private _initFirebase(): void {
    try {
      // Configuration provisioned for the applet
      const firebaseConfig = {
        projectId: 'gen-lang-client-0044755913',
        appId: '1:177759218474:web:94777394be20ecd7110c53',
        apiKey: 'AIzaSyCm7VF1Lx-gg2WyycbGUoygOUtF5GPOrSU',
        authDomain: 'gen-lang-client-0044755913.firebaseapp.com',
        firestoreDatabaseId: 'ai-studio-belyftd-cbbf5028-4323-4b5c-b73f-d3614280646a',
        storageBucket: 'gen-lang-client-0044755913.firebasestorage.app',
        messagingSenderId: '177759218474'
      };

      this.app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      
      // Initialize firestore with custom databaseId if configured
      if (firebaseConfig.firestoreDatabaseId) {
        this.db = getFirestore(this.app, firebaseConfig.firestoreDatabaseId);
      } else {
        this.db = getFirestore(this.app);
      }

      this.isConnected.set(true);
      this.isUsingLocalStorageFallback.set(false);

      // Listen to Auth State
      onAuthStateChanged(this.auth, async (user) => {
        this.currentUser.set(user);
        if (user) {
          await this._fetchUserProfile(user.uid);
        } else {
          this.userProfile.set(this._getLocalStorageUserProfile());
        }
        this.authLoading.set(false);
      });
    } catch (err: unknown) {
      console.warn('[FirebaseService] Firebase initialization notice, activating LocalStorage fallback:', err);
      this.isConnected.set(false);
      this.isUsingLocalStorageFallback.set(true);
      this.authLoading.set(false);
      this._loadLocalStorageFallback();
    }
  }

  /**
   * Registers a new user with Phone, Email, Country, and display name
   */
  async registerUser(data: UserRegistrationData): Promise<{ success: boolean; message?: string }> {
    this.errorMessage.set(null);

    // Fallback registration if offline or Firebase disconnected
    if (!this.auth || !this.db || this.isUsingLocalStorageFallback()) {
      const localProfile: UserProfileDocument = {
        id: 'local_user_' + Date.now(),
        displayName: data.displayName || 'Be Lyft\'d Leader',
        email: data.email,
        phoneNumber: `${data.countryCode} ${data.phoneNumber}`,
        country: data.country,
        countryCode: data.countryCode,
        totalXp: 350,
        streakDays: 4,
        completedCourses: this._getLocalStorageCompletedCourses(),
        role: 'student',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this._saveLocalStorageUserProfile(localProfile);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY_REGISTERED, 'true');
      }
      this.hasRegisteredUser.set(true);
      this.userProfile.set(localProfile);
      return { success: true, message: 'Registered successfully (Saved via resilient local storage).' };
    }

    try {
      const securePassword = data.password && data.password.length >= 6 ? data.password : 'BeLyftdLeader2026!';
      const userCredential = await createUserWithEmailAndPassword(this.auth, data.email, securePassword);
      const user = userCredential.user;

      // Update Firebase Auth Display Name
      await updateProfile(user, {
        displayName: data.displayName
      });

      // Prepare Firestore User Document
      const userDoc: UserProfileDocument = {
        id: user.uid,
        displayName: data.displayName || 'Be Lyft\'d Leader',
        email: data.email,
        phoneNumber: `${data.countryCode} ${data.phoneNumber}`.trim(),
        country: data.country,
        countryCode: data.countryCode,
        totalXp: 350,
        streakDays: 4,
        completedCourses: this._getLocalStorageCompletedCourses(),
        role: 'student',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Save to Firestore
      const userRef = doc(this.db, 'users', user.uid);
      await setDoc(userRef, userDoc, { merge: true });

      // Cache locally for offline availability
      this._saveLocalStorageUserProfile(userDoc);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY_REGISTERED, 'true');
      }
      this.hasRegisteredUser.set(true);
      this.userProfile.set(userDoc);

      return { success: true, message: 'Account registered and synced with Firebase Firestore!' };
    } catch (err: unknown) {
      console.error('[FirebaseService] Registration error:', err);
      
      // If Firebase Auth throws (e.g. email in use or network timeout), gracefully fall back to local profile
      const fallbackProfile: UserProfileDocument = {
        id: 'fallback_user_' + Date.now(),
        displayName: data.displayName,
        email: data.email,
        phoneNumber: `${data.countryCode} ${data.phoneNumber}`,
        country: data.country,
        countryCode: data.countryCode,
        totalXp: 350,
        streakDays: 4,
        completedCourses: this._getLocalStorageCompletedCourses(),
        role: 'student',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this._saveLocalStorageUserProfile(fallbackProfile);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY_REGISTERED, 'true');
      }
      this.hasRegisteredUser.set(true);
      this.userProfile.set(fallbackProfile);
      this.isUsingLocalStorageFallback.set(true);

      return {
        success: true,
        message: 'Account configured successfully with local persistence fallback.'
      };
    }
  }

  /**
   * Fast Anonymous Sign-In for instant guest testing
   */
  async signInAsGuest(): Promise<void> {
    if (!this.auth) {
      this._loadLocalStorageFallback();
      return;
    }
    try {
      await signInAnonymously(this.auth);
    } catch (err) {
      console.warn('[FirebaseService] Anonymous sign-in note:', err);
      this._loadLocalStorageFallback();
    }
  }

  /**
   * Signs out current user
   */
  async logout(): Promise<void> {
    if (this.auth) {
      try {
        await signOut(this.auth);
      } catch (err) {
        console.warn('Sign out err:', err);
      }
    }
    this.currentUser.set(null);
    this._loadLocalStorageFallback();
  }

  /**
   * Fetches user profile from Firestore or falls back to LocalStorage
   */
  private async _fetchUserProfile(uid: string): Promise<void> {
    if (!this.db) {
      this.userProfile.set(this._getLocalStorageUserProfile());
      return;
    }

    try {
      const userRef = doc(this.db, 'users', uid);
      const snapshot = await getDoc(userRef);

      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfileDocument;
        this.userProfile.set(data);
        this._saveLocalStorageUserProfile(data);
      } else {
        const local = this._getLocalStorageUserProfile();
        this.userProfile.set(local);
      }
    } catch (err) {
      console.warn('[FirebaseService] Firestore fetch fallback:', err);
      this.userProfile.set(this._getLocalStorageUserProfile());
      this.isUsingLocalStorageFallback.set(true);
    }
  }

  /**
   * Synchronizes course completion to Firestore with LocalStorage mirror,
   * stores completion timestamp, and automatically updates/maintains the user's Streak Counter.
   */
  async recordCourseCompletion(courseId: string): Promise<void> {
    const now = new Date();
    const nowIso = now.toISOString();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Always update LocalStorage completed list
    const currentCompleted = this._getLocalStorageCompletedCourses();
    if (!currentCompleted.includes(courseId)) {
      currentCompleted.push(courseId);
      this._saveLocalStorageCompletedCourses(currentCompleted);
    }

    // 2. Calculate and update streak based on completion timestamp
    let lastDateStr: string | null = null;
    if (typeof window !== 'undefined') {
      lastDateStr = localStorage.getItem(LOCAL_STORAGE_KEY_LAST_COMPLETION_DATE);
      localStorage.setItem(LOCAL_STORAGE_KEY_LAST_COMPLETION_DATE, todayStr);
      localStorage.setItem(LOCAL_STORAGE_KEY_LAST_COMPLETION_TS, nowIso);
    }

    const currentProfile = this.userProfile() || this._createDefaultLocalProfile();
    let currentStreak = currentProfile.streakDays || 0;
    let isNewConsecutiveDay = false;

    if (!lastDateStr) {
      // First completion recorded
      currentStreak = Math.max(1, currentStreak);
      isNewConsecutiveDay = true;
    } else if (lastDateStr === todayStr) {
      // Already completed today, maintain current streak
      if (currentStreak === 0) currentStreak = 1;
    } else {
      // Check if last completion was yesterday
      const lastDate = new Date(lastDateStr);
      const diffMs = now.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day streak increment!
        currentStreak += 1;
        isNewConsecutiveDay = true;
      } else if (diffDays > 1) {
        // Streak lapsed, reset to 1
        currentStreak = 1;
        isNewConsecutiveDay = true;
      } else {
        currentStreak = Math.max(1, currentStreak);
      }
    }

    const updatedProfile: UserProfileDocument = {
      ...currentProfile,
      streakDays: currentStreak,
      totalXp: (currentProfile.totalXp || 350) + 100,
      completedCourses: currentCompleted,
      updatedAt: nowIso
    };

    this.userProfile.set(updatedProfile);
    this._saveLocalStorageUserProfile(updatedProfile);

    // Notify listeners of streak progress
    this.streakUpdateEvent.set({
      streak: currentStreak,
      timestamp: nowIso,
      isNewDay: isNewConsecutiveDay,
      dateStr: todayStr
    });

    console.log(`[FirebaseService] Course '${courseId}' completed at ${nowIso}. Streak updated to ${currentStreak} days.`);

    // 3. Sync to Firestore if authenticated and connected
    const user = this.currentUser();
    if (this.db && user) {
      try {
        const userRef = doc(this.db, 'users', user.uid);
        await updateDoc(userRef, {
          completedCourses: arrayUnion(courseId),
          streakDays: currentStreak,
          lastCompletionTimestamp: serverTimestamp(),
          lastActiveDate: todayStr,
          updatedAt: serverTimestamp()
        });

        const progressDocRef = doc(this.db, 'users', user.uid, 'progress', courseId);
        await setDoc(progressDocRef, {
          userId: user.uid,
          courseId,
          isCompleted: true,
          progressPercent: 100,
          completedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.warn('[FirebaseService] Cloud sync deferred (Saved to LocalStorage fallback):', err);
      }
    }
  }

  /**
   * Simulated Web Notification Handler:
   * Parses deep-link query params like app.com?courseId=changing-habits or ?dailyMsg=true
   * and triggers immediate playback modal.
   */
  handleIncomingNotification(payload: { title: string; body: string; deepLinkUrl: string }): string | null {
    const courseId = this.parseCourseIdFromUrl(payload.deepLinkUrl);
    if (courseId) {
      this.targetCourseIdFromNotification.set(courseId);
      return courseId;
    }
    return null;
  }

  /**
   * Parses course ID and dailyMsg flag from URLs like:
   * - "https://app.com?courseId=changing-habits"
   * - "?dailyMsg=true" (defaults to 'changing-habits')
   * - "?dailyMsg=true&courseId=goal-setting"
   * - "changing-habits"
   */
  parseCourseIdFromUrl(urlOrParam: string): string | null {
    if (!urlOrParam) return null;
    try {
      // Check query parameter courseId
      if (urlOrParam.includes('courseId=')) {
        const match = urlOrParam.match(/[?&]courseId=([^&#]+)/);
        if (match && match[1]) {
          return decodeURIComponent(match[1]);
        }
      }

      // Check dailyMsg query parameter
      if (urlOrParam.includes('dailyMsg=true') || urlOrParam.includes('dailyMsg=1') || urlOrParam.includes('daily=true')) {
        const match = urlOrParam.match(/[?&]courseId=([^&#]+)/);
        return match && match[1] ? decodeURIComponent(match[1]) : 'changing-habits';
      }

      // If passed directly as a clean slug
      if (!urlOrParam.includes('/') && !urlOrParam.includes('?')) {
        return urlOrParam.trim();
      }

      // If full URL with query
      const url = new URL(urlOrParam, window.location.origin);
      const paramCourse = url.searchParams.get('courseId');
      if (paramCourse) return paramCourse;

      if (url.searchParams.get('dailyMsg') === 'true' || url.searchParams.get('dailyMsg') === '1') {
        return 'changing-habits';
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Checks current window URL for ?courseId=... or ?dailyMsg=true query parameters on page load.
   * When present, automatically targets the specific course modal/player.
   */
  private _checkUrlForCourseDeepLink(): void {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const courseId = params.get('courseId');
      const isDailyMsg = params.get('dailyMsg') === 'true' || params.get('dailyMsg') === '1' || params.get('daily') === 'true';

      if (courseId) {
        this.targetCourseIdFromNotification.set(courseId);
        console.log(`[FirebaseService] Deep-link parsed from URL courseId: ${courseId}`);
      } else if (isDailyMsg) {
        const defaultDailyCourse = 'changing-habits';
        this.targetCourseIdFromNotification.set(defaultDailyCourse);
        console.log(`[FirebaseService] Deep-link parsed from URL dailyMsg=true -> targeting '${defaultDailyCourse}'`);
      }
    } catch (e) {
      console.warn('URL parse note:', e);
    }
  }

  // --- LocalStorage Fallback Helpers ---

  private _loadLocalStorageFallback(): void {
    if (typeof window !== 'undefined') {
      const isReg = localStorage.getItem(LOCAL_STORAGE_KEY_REGISTERED) === 'true';
      this.hasRegisteredUser.set(isReg);
    }
    const profile = this._getLocalStorageUserProfile();
    this.userProfile.set(profile);
  }

  private _getLocalStorageUserProfile(): UserProfileDocument {
    if (typeof window === 'undefined') {
      return this._createDefaultLocalProfile();
    }
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_USER);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }
    const defaultProfile = this._createDefaultLocalProfile();
    this._saveLocalStorageUserProfile(defaultProfile);
    return defaultProfile;
  }

  private _saveLocalStorageUserProfile(profile: UserProfileDocument): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(profile));
    } catch (e) {
      console.warn('LocalStorage write error:', e);
    }
  }

  _getLocalStorageCompletedCourses(): string[] {
    if (typeof window === 'undefined') return ['behavioral-accountability'];
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_COMPLETED);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }
    return ['behavioral-accountability'];
  }

  _saveLocalStorageCompletedCourses(courses: string[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_COMPLETED, JSON.stringify(courses));
    } catch (e) {
      console.warn('LocalStorage write error:', e);
    }
  }

  private _createDefaultLocalProfile(): UserProfileDocument {
    return {
      id: 'guest_user_default',
      displayName: 'Jordan M. (Youth Leader)',
      email: 'jordan.m@belyftd.org',
      phoneNumber: '+1 (555) 234-8901',
      country: 'United States',
      countryCode: '+1',
      totalXp: 350,
      streakDays: 4,
      completedCourses: ['behavioral-accountability'],
      role: 'student',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}
