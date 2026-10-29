import {TestBed} from '@angular/core/testing';
import {AdminAuthService} from './admin-auth.service';

const KEY = 'lyftd_super_admin_session';
const token = 'a'.repeat(64);
const session = () => ({sessionToken: token, expiresAt: Date.now() + 60000});

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  const fetchMock = vi.fn();
  const result = (value: unknown) => ({ok: true, json: async () => ({result: value})});

  beforeEach(() => {
    sessionStorage.clear();
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminAuthService);
  });
  afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });

  it('does not trust the old boolean marker, malformed JSON, or expired data', () => {
    for (const value of ['broken', 'null', JSON.stringify({authenticated: true}), JSON.stringify({...session(), expiresAt: 0})]) {
      sessionStorage.setItem(KEY, value);
      expect(service.hasValidSession()).toBe(false);
      expect(service.isAuthenticated()).toBe(false);
    }
  });

  it('saves only a server-issued session and leaves student storage unchanged', async () => {
    localStorage.setItem('student-test', 'profile-and-onboarding');
    sessionStorage.setItem('unrelated-session', 'untouched');
    const before = JSON.stringify(localStorage);
    fetchMock.mockResolvedValue(result(session()));
    expect(await service.loginWithMasterKey(' private-key ')).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(KEY)!).sessionToken).toBe(token);
    expect(JSON.stringify(localStorage)).toBe(before);
    expect(sessionStorage.getItem('unrelated-session')).toBe('untouched');
    expect(fetchMock.mock.calls[0][1].credentials).toBe('omit');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({data: {passkey: 'private-key'}});
    localStorage.removeItem('student-test');
  });

  it('returns false for the wrong key without storing a session', async () => {
    fetchMock.mockResolvedValue({ok: false, json: async () => ({error: {status: 'PERMISSION_DENIED'}})});
    expect(await service.loginWithMasterKey('wrong')).toBe(false);
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('revalidates the server token after service recreation (page reload)', async () => {
    sessionStorage.setItem(KEY, JSON.stringify(session()));
    fetchMock.mockResolvedValue(result({authenticated: true}));
    const reloaded = new AdminAuthService();
    expect(reloaded.isAuthenticated()).toBe(false);
    expect(await reloaded.validateSession()).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toContain('superAdminValidate');
  });

  it('fails closed without tab storage and does not call the server', async () => {
    expect(await service.validateSession()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed if browser privacy settings deny storage', async () => {
    vi.stubGlobal('sessionStorage', {getItem() { throw new Error('Denied'); }, removeItem() { throw new Error('Denied'); }});
    expect(await service.validateSession()).toBe(false);
  });

  it('removes revoked sessions', async () => {
    sessionStorage.setItem(KEY, JSON.stringify(session()));
    fetchMock.mockResolvedValue({ok: false, json: async () => ({error: {status: 'UNAUTHENTICATED'}})});
    expect(await service.validateSession()).toBe(false);
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('clears only the admin key on logout, including when the network fails', async () => {
    sessionStorage.setItem(KEY, JSON.stringify(session()));
    sessionStorage.setItem('unrelated-session', 'untouched');
    fetchMock.mockRejectedValue(new Error('Offline'));
    await expect(service.logout()).rejects.toThrow('Offline');
    expect(service.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(sessionStorage.getItem('unrelated-session')).toBe('untouched');
  });
});
