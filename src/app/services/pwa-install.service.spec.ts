import {PwaInstallService} from './pwa-install.service';

describe('PwaInstallService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({matches: false}));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows the install button until the browser reports a completed install', () => {
    const service = new PwaInstallService();

    expect(service.showInstallButton()).toBe(true);

    window.dispatchEvent(new Event('appinstalled'));

    expect(service.showInstallButton()).toBe(false);
  });

  it('does not show the install button when running as an installed app', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({matches: true}));

    const service = new PwaInstallService();

    expect(service.showInstallButton()).toBe(false);
  });

  it('hides the install button after the native install prompt is accepted', async () => {
    const service = new PwaInstallService();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{outcome: 'accepted'; platform: string}>;
      platforms: string[];
    };
    event.prompt = prompt;
    event.userChoice = Promise.resolve({outcome: 'accepted', platform: 'web'});
    event.platforms = ['web'];
    window.dispatchEvent(event);

    await expect(service.promptInstall()).resolves.toBe('accepted');
    expect(prompt).toHaveBeenCalledOnce();
    expect(service.showInstallButton()).toBe(false);
  });
});
