import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {AdminHeaderComponent} from './admin-header.component';

@Component({
  selector: 'app-admin-content',
  imports: [AdminHeaderComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-admin-header />
    <main>
      <span class="eyebrow">Platform control</span>
      <h1>Media CMS</h1>
      <p>Your dedicated content workspace is protected by super-admin authentication.</p>
      <section aria-labelledby="workspace-status">
        <h2 id="workspace-status">Content tools are not connected yet</h2>
        <p>This branch does not contain a media editor. No existing course content has been changed.</p>
        <a routerLink="/admin/sponsors">Open Partner Co-Branding →</a>
      </section>
    </main>
  `,
  styles: `
    :host{--admin-bg:#1e242b;--admin-panel:#272f39;--admin-text:#f4f7fa;--admin-muted:#aab8c7;--admin-accent:#8bcbea;display:block;min-height:100dvh;background:var(--admin-bg);color:var(--admin-text);font-size:16px;line-height:1.6}
    main{max-width:960px;margin:0 auto;padding:48px 24px}
    .eyebrow{color:var(--admin-accent);font-size:14px}
    h1{font-size:36px;font-weight:650;margin:12px 0;letter-spacing:-.03em}
    p{color:var(--admin-muted);max-width:620px;margin:12px 0}
    section{margin-top:32px;padding:28px;background:var(--admin-panel);border-radius:16px}
    h2{margin:0;font-size:20px;font-weight:600;text-wrap:balance}
    a{display:inline-block;margin-top:20px;color:var(--admin-accent)}
    a:focus-visible{outline:2px solid var(--admin-accent);outline-offset:4px}
  `,
})
export class AdminContentComponent {}
