import {Injectable, signal} from '@angular/core';
import {environment} from '../../environments/environment';
import {Tier4PartnerDocument} from '../models/firestore.models';

interface AdminSession {
  sessionToken: string;
  expiresAt: number;
}

class AdminRequestError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

@Injectable({providedIn: 'root'})
export class AdminAuthService {
  private readonly SESSION_KEY = 'lyftd_super_admin_session';
  readonly isAuthenticated = signal(false);

  private readSession(): AdminSession | null {
    try {
      if (typeof sessionStorage === 'undefined') return null;
      const stored = sessionStorage.getItem(this.SESSION_KEY);
      if (!stored) return null;
      const session = JSON.parse(stored) as AdminSession;
      if (!/^[a-f0-9]{64}$/.test(session.sessionToken) || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) return null;
      return session;
    } catch { return null; }
  }

  hasValidSession(): boolean {
    return this.readSession() !== null;
  }

  private clearSession(): void {
    try { if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(this.SESSION_KEY); }
    catch { /* Storage can be disabled by browser privacy settings. */ }
    this.isAuthenticated.set(false);
  }

  private async request<T>(name: string, data: object): Promise<T> {
    // Call the existing Firebase backend without attaching the student's Auth token.
    const response = await fetch(`https://us-central1-${environment.firebase.projectId}.cloudfunctions.net/${name}`, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'omit',
      cache: 'no-store', body: JSON.stringify({data}), signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json() as {result?: T; error?: {status?: string; message?: string}};
    if (!response.ok || payload.error || payload.result === undefined) {
      throw new AdminRequestError(payload.error?.status ?? 'UNAVAILABLE', payload.error?.message ?? 'Admin service unavailable.');
    }
    return payload.result;
  }

  async loginWithMasterKey(passkey: string): Promise<boolean> {
    let session: AdminSession;
    try {
      session = await this.request<AdminSession>('superAdminLogin', {passkey: passkey.trim()});
    } catch (error) {
      if (error instanceof AdminRequestError && error.code === 'PERMISSION_DENIED') return false;
      throw error;
    }
    try {
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    } catch {
      await this.request('superAdminLogout', {sessionToken: session.sessionToken}).catch(() => undefined);
      throw new Error('Tab storage is unavailable. Allow session storage to sign in.');
    }
    this.isAuthenticated.set(true);
    return true;
  }

  async validateSession(): Promise<boolean> {
    const session = this.readSession();
    if (!session) {
      this.clearSession();
      return false;
    }
    try {
      const result = await this.request<{authenticated: boolean}>('superAdminValidate', {sessionToken: session.sessionToken});
      this.isAuthenticated.set(result.authenticated === true);
      return this.isAuthenticated();
    } catch (error) {
      this.isAuthenticated.set(false);
      if (error instanceof AdminRequestError && error.code === 'UNAUTHENTICATED') this.clearSession();
      return false;
    }
  }

  async logout(): Promise<void> {
    const session = this.readSession();
    this.clearSession();
    if (session) await this.request('superAdminLogout', {sessionToken: session.sessionToken});
  }

  private async authenticatedRequest<T>(name: string, data: object = {}): Promise<T> {
    const session = this.readSession();
    if (!session) {
      this.clearSession();
      throw new Error('Admin session expired. Sign in again.');
    }
    try {
      return await this.request<T>(name, {...data, sessionToken: session.sessionToken});
    } catch (error) {
      if (error instanceof AdminRequestError && error.code === 'UNAUTHENTICATED') this.clearSession();
      throw error;
    }
  }

  listTier4Partners(): Promise<Tier4PartnerDocument[]> {
    return this.authenticatedRequest('superAdminListPartners');
  }

  async saveTier4Partner(partner: Tier4PartnerDocument): Promise<void> {
    await this.authenticatedRequest('superAdminSavePartner', {partner});
  }
}
