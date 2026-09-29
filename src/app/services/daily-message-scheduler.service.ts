import {Injectable, signal} from '@angular/core';
import {Capacitor} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import {DailyAffirmationDocument} from '../models/firestore.models';
import {FirebaseService} from './firebase.service';

const DATABASE_NAME = 'belyftd-offline';
const DATABASE_VERSION = 1;
const AFFIRMATIONS_STORE = 'dailyAffirmations';
const SETTINGS_STORE = 'schedulerSettings';
const REMINDERS_ENABLED_KEY = 'belyftd_daily_reminders_enabled';
const PERIODIC_SYNC_TAG = 'belyftd-daily-affirmation';
const REMINDER_HOUR = 8;
const MAX_CACHE_DAYS = 60;

interface SchedulerSetting {
  key: string;
  value: unknown;
}

interface PeriodicSyncManagerLike {
  register(tag: string, options: {minInterval: number}): Promise<void>;
  unregister(tag: string): Promise<void>;
}

@Injectable({providedIn: 'root'})
export class DailyMessageSchedulerService {
  readonly notificationsEnabled = signal(false);
  readonly notificationStatus = signal<string | null>(null);

  private refreshInFlight: Promise<void> | null = null;
  private webScheduleTimer: number | null = null;

  constructor(private readonly firebaseService: FirebaseService) {
    if (typeof window === 'undefined') return;

    this.notificationsEnabled.set(localStorage.getItem(REMINDERS_ENABLED_KEY) === 'true');
    window.addEventListener('online', () => void this.refreshAffirmations());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.refreshAffirmations();
        void this.deliverWebNotificationIfDue();
      }
    });
    window.setInterval(() => void this.refreshAffirmations(), 12 * 60 * 60 * 1000);

    void this.refreshAffirmations();
    if (this.notificationsEnabled()) {
      void this.activateScheduler();
    }
  }

  async toggleNotifications(): Promise<void> {
    if (this.notificationsEnabled()) {
      await this.disableNotifications();
    } else {
      await this.enableNotifications();
    }
  }

  async enableNotifications(): Promise<void> {
    this.notificationStatus.set(null);

    try {
      if (Capacitor.isNativePlatform()) {
        let permission = await LocalNotifications.checkPermissions();
        if (permission.display !== 'granted') {
          permission = await LocalNotifications.requestPermissions();
        }
        if (permission.display !== 'granted') {
          this.setStatus('Allow notifications in device settings to enable daily reminders.');
          return;
        }
      } else {
        if (!('Notification' in window)) {
          this.setStatus('This browser does not support notifications.');
          return;
        }
        let permission = Notification.permission;
        if (permission === 'default') permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          this.setStatus('Allow notifications in browser settings to enable daily reminders.');
          return;
        }
      }

      this.notificationsEnabled.set(true);
      localStorage.setItem(REMINDERS_ENABLED_KEY, 'true');
      await this.writeSetting('notificationsEnabled', true);
      await this.postWorkerMessage({type: 'SET_DAILY_NOTIFICATIONS_ENABLED', enabled: true});
      await this.refreshAffirmations();
      await this.activateScheduler();
      this.setStatus('Daily message reminders enabled for 8:00 AM.');
    } catch (error) {
      console.warn('[DailyMessageScheduler] Could not enable notifications:', error);
      this.setStatus('Could not enable daily reminders on this device.');
    }
  }

  async disableNotifications(): Promise<void> {
    this.notificationsEnabled.set(false);
    localStorage.setItem(REMINDERS_ENABLED_KEY, 'false');
    await this.writeSetting('notificationsEnabled', false);

    if (Capacitor.isNativePlatform()) {
      await this.cancelNativeNotifications();
    } else {
      await this.unregisterPeriodicSync();
      if (this.webScheduleTimer !== null) window.clearTimeout(this.webScheduleTimer);
      this.webScheduleTimer = null;
    }

    await this.postWorkerMessage({type: 'SET_DAILY_NOTIFICATIONS_ENABLED', enabled: false});
    this.setStatus('Daily message reminders disabled.');
  }

  async refreshAffirmations(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.onLine) return;
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = (async () => {
      try {
        const affirmations = await this.firebaseService.getDailyAffirmationsCache(MAX_CACHE_DAYS);
        if (affirmations.length === 0) return;

        await this.writeAffirmations(affirmations);

        if (this.notificationsEnabled() && Capacitor.isNativePlatform()) {
          await this.scheduleNativeNotifications(affirmations);
        }
      } catch (error) {
        console.warn('[DailyMessageScheduler] Keeping existing offline affirmations:', error);
      }
    })().finally(() => {
      this.refreshInFlight = null;
    });

    return this.refreshInFlight;
  }

  private async activateScheduler(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const affirmations = await this.readAffirmations();
      await this.scheduleNativeNotifications(affirmations);
      return;
    }

    await this.registerPeriodicSync();
    this.scheduleNextWebCheck();
    await this.deliverWebNotificationIfDue();
  }

  private async scheduleNativeNotifications(affirmations: DailyAffirmationDocument[]): Promise<void> {
    const pending = await LocalNotifications.getPending();
    const existing = pending.notifications
      .filter(notification => notification.extra?.kind === 'daily-affirmation')
      .map(notification => ({id: notification.id}));
    if (existing.length) await LocalNotifications.cancel({notifications: existing});

    const now = Date.now();
    const notifications = affirmations.flatMap(affirmation => {
      const scheduledAt = this.dateAtReminderTime(affirmation.date);
      if (!scheduledAt || scheduledAt.getTime() <= now) return [];

      return [{
        id: this.notificationId(affirmation.date),
        title: 'Your daily Be Lyft\'d message',
        body: affirmation.text,
        largeBody: affirmation.text,
        schedule: {at: scheduledAt, allowWhileIdle: true},
        extra: {kind: 'daily-affirmation', date: affirmation.date, url: '/?dailyMsg=true'}
      }];
    });

    if (notifications.length) {
      const result = await LocalNotifications.schedule({notifications});
      if (result.warning) console.warn('[DailyMessageScheduler] Exact alarm warning:', result.warning.message);
    }
  }

  private async cancelNativeNotifications(): Promise<void> {
    const pending = await LocalNotifications.getPending();
    const notifications = pending.notifications
      .filter(notification => notification.extra?.kind === 'daily-affirmation')
      .map(notification => ({id: notification.id}));
    if (notifications.length) await LocalNotifications.cancel({notifications});
  }

  private scheduleNextWebCheck(): void {
    if (!this.notificationsEnabled() || Capacitor.isNativePlatform()) return;
    if (this.webScheduleTimer !== null) window.clearTimeout(this.webScheduleTimer);

    const nextReminder = new Date();
    nextReminder.setHours(REMINDER_HOUR, 0, 0, 0);
    if (nextReminder.getTime() <= Date.now()) nextReminder.setDate(nextReminder.getDate() + 1);

    this.webScheduleTimer = window.setTimeout(async () => {
      await this.deliverWebNotificationIfDue();
      this.scheduleNextWebCheck();
    }, nextReminder.getTime() - Date.now());
  }

  private async deliverWebNotificationIfDue(): Promise<void> {
    if (
      Capacitor.isNativePlatform() ||
      !this.notificationsEnabled() ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) return;

    const now = new Date();
    if (now.getHours() < REMINDER_HOUR) return;

    const today = this.localDateString(now);
    const affirmation = (await this.readAffirmations()).find(item => item.date === today);
    if (!affirmation || !await this.claimNotificationDate(today)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Your daily Be Lyft\'d message', {
        body: affirmation.text,
        icon: '/icon-192.svg',
        badge: '/icon-192.svg',
        tag: `daily-affirmation-${today}`,
        data: {url: '/?dailyMsg=true'}
      });
    } catch (error) {
      console.warn('[DailyMessageScheduler] Could not display cached affirmation:', error);
    }
  }

  private async registerPeriodicSync(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const periodicSync = (registration as ServiceWorkerRegistration & {periodicSync?: PeriodicSyncManagerLike}).periodicSync;
    if (periodicSync) {
      try {
        await periodicSync.register(PERIODIC_SYNC_TAG, {minInterval: 24 * 60 * 60 * 1000});
      } catch (error) {
        console.info('[DailyMessageScheduler] Periodic background sync is unavailable:', error);
      }
    }
  }

  private async unregisterPeriodicSync(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const periodicSync = (registration as ServiceWorkerRegistration & {periodicSync?: PeriodicSyncManagerLike}).periodicSync;
    if (periodicSync) await periodicSync.unregister(PERIODIC_SYNC_TAG).catch(() => undefined);
  }

  private async postWorkerMessage(message: unknown): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active || registration.waiting || registration.installing;
    worker?.postMessage(message);
  }

  private async writeAffirmations(affirmations: DailyAffirmationDocument[]): Promise<void> {
    const database = await this.openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(AFFIRMATIONS_STORE, 'readwrite');
      const store = transaction.objectStore(AFFIRMATIONS_STORE);
      for (const affirmation of affirmations) store.put(affirmation);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  }

  private async readAffirmations(): Promise<DailyAffirmationDocument[]> {
    const database = await this.openDatabase();
    const affirmations = await new Promise<DailyAffirmationDocument[]>((resolve, reject) => {
      const request = database.transaction(AFFIRMATIONS_STORE, 'readonly').objectStore(AFFIRMATIONS_STORE).getAll();
      request.onsuccess = () => resolve(request.result as DailyAffirmationDocument[]);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return affirmations.sort((left, right) => left.date.localeCompare(right.date));
  }

  private async writeSetting(key: string, value: unknown): Promise<void> {
    const database = await this.openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(SETTINGS_STORE, 'readwrite');
      transaction.objectStore(SETTINGS_STORE).put({key, value} satisfies SchedulerSetting);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  }

  private async claimNotificationDate(date: string): Promise<boolean> {
    const database = await this.openDatabase();
    const claimed = await new Promise<boolean>((resolve, reject) => {
      const transaction = database.transaction(SETTINGS_STORE, 'readwrite');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get('lastNotificationDate');
      let canNotify = false;
      request.onsuccess = () => {
        if (request.result?.value !== date) {
          canNotify = true;
          store.put({key: 'lastNotificationDate', value: date} satisfies SchedulerSetting);
        }
      };
      transaction.oncomplete = () => resolve(canNotify);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
    return claimed;
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(AFFIRMATIONS_STORE)) {
          database.createObjectStore(AFFIRMATIONS_STORE, {keyPath: 'id'});
        }
        if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
          database.createObjectStore(SETTINGS_STORE, {keyPath: 'key'});
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private dateAtReminderTime(date: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
    if (!match) return null;
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), REMINDER_HOUR, 0, 0, 0);
  }

  private notificationId(date: string): number {
    return Number(date.replace(/\D/g, '').slice(0, 8));
  }

  private localDateString(date: Date): string {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  private setStatus(message: string): void {
    this.notificationStatus.set(message);
    window.setTimeout(() => {
      if (this.notificationStatus() === message) this.notificationStatus.set(null);
    }, 6000);
  }
}
