import {CommonModule} from '@angular/common';
import {Component, computed, inject} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="fullscreen-page fixed inset-0 z-[60] overflow-y-auto bg-slate-50 dark:bg-slate-950" aria-labelledby="legal-title">
      <div class="page-container min-h-full">
        <header class="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">Lyftd Mentorship &amp; Lessons</p>
            <h1 id="legal-title" class="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">{{ page() === 'privacy' ? 'Privacy Policy' : 'Terms of Service' }}</h1>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Effective October 24, 2026</p>
          </div>
          <a routerLink="/dashboard" class="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" aria-label="Return to Lyftd home">Back to Lyftd</a>
        </header>

        @if (page() === 'privacy') {
          <article class="card space-y-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <section><h2>1. Introduction &amp; Safeguarding Commitment</h2><p>Lyftd respects the privacy of our users, especially young people, students, and community members. This Privacy Policy explains how we collect, store, process, and protect information in accordance with the Australian Privacy Principles, COPPA, GDPR/UK GDPR, and applicable global youth privacy frameworks.</p></section>
            <section><h2>2. Information We Collect</h2><h3>Information you provide</h3><p>Account data such as name, email, password hash, avatar, and grade or role; optional voice reflections; Hype Wall posts and reactions; Coach Spark prompts; and sponsor or partner details.</p><h3>Technical information</h3><p>We collect operating system, browser, screen resolution, IP address, general region, lesson progress, audio playback time, streaks, and cache state.</p></section>
            <section><h2>3. How We Use Information</h2><p>We use information to deliver personalized lessons, track progress, provide daily motivation, generate AI responses and audio, moderate community content, provide aggregated sponsor reporting, process subscriptions, and verify redemption codes.</p><p>Sponsors receive anonymized, aggregated cohort analytics only. We do not share private reflections, diary entries, or chat logs with institutional sponsors.</p></section>
            <section><h2>4. Children&apos;s Privacy</h2><p>Lyftd collects only the minimum data needed for educational lessons and mentor audio. Where required, verifiable parent or guardian consent is obtained. We do not sell children&apos;s or teens&apos; personal data, use targeted behavioral advertising, or run third-party marketing cookies.</p><p>Parents and guardians may request access, correction, deletion, or an end to collection by contacting <a href="mailto:privacy@lyftd.com">privacy@lyftd.com</a>.</p></section>
            <section><h2>5. Storage, Security &amp; Retention</h2><p>Lyftd uses Firebase and Vercel infrastructure. Media is protected with time-limited signed URLs, data in transit uses TLS/HTTPS, and Firestore data is encrypted at rest. Account data, progress, and community posts are retained while the profile or subscription is active. Verified deletion requests are fulfilled within 30 days.</p></section>
            <section><h2>6. Service Providers</h2><p>Trusted providers include Google Cloud/Firebase, Vercel, Stripe, ElevenLabs, and AI model providers such as Anthropic, OpenAI, and Google. We do not sell, rent, or trade personal information to data brokers or marketing firms.</p></section>
            <section><h2>7. Your Rights</h2><p>Depending on your location, you may request access, rectification, erasure, withdrawal of consent, or a copy of your personal information. Contact <a href="mailto:privacy@lyftd.com">privacy@lyftd.com</a> or <a href="mailto:support@lyftd.com">support@lyftd.com</a>.</p></section>
            <section><h2>8. Updates</h2><p>We may update these policies as the Platform, AI features, or legal frameworks evolve. We will revise the effective date and notify active users through the Platform.</p></section>
          </article>
        } @else {
          <article class="card space-y-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <section><h2>1. Acceptance &amp; Eligibility</h2><p>By accessing, installing, browsing, or using Lyftd, you agree to these Terms. Users under 13, or under 16 where required, may use Lyftd only with verifiable parent or guardian consent or through an authorized institutional partner. Parents and guardians are responsible for supervising permitted use.</p></section>
            <section><h2>2. Service &amp; Non-Clinical Disclaimer</h2><p>Lyftd provides educational, motivational, personal-development, modular curriculum, mentor media, community features, and Coach Spark. Lyftd is not a healthcare provider, psychotherapy practice, crisis counseling center, or psychiatric service.</p><p><strong>Do not use Lyftd for emergencies or severe mental distress.</strong> Contact local emergency services or an appropriate crisis hotline immediately.</p></section>
            <section><h2>3. AI Features</h2><p>Coach Spark, automated pep talks, and simulated mentor avatars use generative AI, neural speech, and language models. Outputs may be inaccurate or incomplete and are not professional legal, financial, medical, psychological, or career advice. Do not enter government IDs, payment card details, passwords, or other sensitive information into AI prompts.</p></section>
            <section><h2>4. Accounts &amp; Redemption Codes</h2><p>You must provide valid authentication details and keep credentials confidential. Partner redemption codes are non-transferable, have no cash value, and may expire. We may revoke codes or suspend accounts for fraud or abuse.</p></section>
            <section><h2>5. Plans, Billing &amp; Cancellations</h2><p>Lyftd offers monthly plans. Payments are processed by Stripe, and Lyftd does not store full payment card details. You may cancel through the in-app billing portal; access continues through the paid billing cycle. Fees are non-refundable except where required by law.</p></section>
            <section><h2>6. Community Standards</h2><p>Do not post bullying, defamatory, harassing, explicit, hateful, violent, discriminatory, unsafe, spam, promotional, impersonating, or privacy-invasive content. Do not share personal contact details of minors. We may remove content, restrict posting, or terminate accounts for violations.</p></section>
            <section><h2>7. Intellectual Property</h2><p>Course curricula, written units, audio, avatars, videos, logos, graphics, software, and PWA code belong to Lyftd or its licensors. You receive a limited, personal, non-exclusive, revocable, non-transferable license for personal, educational, non-commercial streaming and viewing. Copying, recording, scraping, reverse engineering, republishing, or commercial exploitation is prohibited.</p></section>
            <section><h2>8. Disclaimers &amp; Liability</h2><p>The Platform is provided “as is” and “as available” without warranties to the maximum extent permitted by law. Lyftd and its affiliates are not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the Platform, AI guidance, or user content.</p></section>
            <section><h2>9. Governing Law</h2><p>These Terms are governed by the laws of Queensland, Australia, or the applicable jurisdiction of Lyftd&apos;s operating commercial entity. Disputes are resolved in the competent courts of Queensland, Australia.</p></section>
          </article>
        }
        <footer class="py-8 text-center text-xs text-slate-500 dark:text-slate-400">Questions? <a href="mailto:privacy@lyftd.com">privacy@lyftd.com</a> · <a routerLink="/privacy">Privacy Policy</a> · <a routerLink="/terms">Terms of Service</a></footer>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    article h2 { margin-bottom: .65rem; font-size: 1.15rem; font-weight: 800; color: #0f172a; }
    article h3 { margin-top: 1rem; margin-bottom: .35rem; font-size: .9rem; font-weight: 750; color: #334155; }
    article p { max-width: 72ch; font-size: .94rem; line-height: 1.75; color: #475569; }
    article a, footer a { color: #4f46e5; text-decoration: underline; text-underline-offset: 3px; }
    @media (prefers-color-scheme: dark) { article h2 { color: #f8fafc; } article h3 { color: #cbd5e1; } article p { color: #cbd5e1; } }
  `],
})
export class LegalPageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly page = computed<'privacy' | 'terms'>(() => this.route.snapshot.data['page'] === 'terms' ? 'terms' : 'privacy');
}
