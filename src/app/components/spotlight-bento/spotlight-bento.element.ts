// Spotlight Bento web component, ported to TypeScript from the Lyft'd bento pack.
// Browser only: import it dynamically (see SpotlightBentoComponent) so SSR never evaluates it.

export interface BentoCard {
  tag?: string;
  heading: string;
  text?: string;
  detail?: string;
  chips?: string[];
  image?: string;
  alt?: string;
  /** CSS object-position for the card image, e.g. "88% 45%". */
  position?: string;
}

const FALLBACK_EASE = 'cubic-bezier(.34,1.36,.64,1)';
const HTML_ESCAPES: Record<string, string> = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
const esc = (s = ''): string => String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
let uid = 0;

/** Column spans for a layout. The active card spans the full row and leads. */
export function layoutFor(n: number, cols: number, active: number): {span: number[]; lead: number} {
  const span = new Array<number>(n).fill(1);
  if (cols === 1) return {span, lead: -1};
  if (active < 0) {
    for (let i = 0; i < n; i++) span[i] = Math.min(cols, i % 4 === 0 || i % 4 === 3 ? 2 : 1);
    let used = 0;
    for (let i = 0; i < n; i++) {
      if (used + span[i] > cols) used = 0;
      used = (used + span[i]) % cols;
    }
    if (used) span[n - 1] += cols - used;
    return {span, lead: -1};
  }
  span[active] = cols;
  const others = [...Array(n).keys()].filter((i) => i !== active);
  const rem = others.length % cols;
  if (rem && others.length) span[others[others.length - 1]] = cols - rem + 1;
  return {span, lead: active};
}

export class SpotlightBento extends HTMLElement {
  #cards: BentoCard[] | null = null;
  #active = -1;
  #cols = 0;
  #anims: Animation[] = [];
  #ro: ResizeObserver | null = null;
  #raf = 0;
  readonly #mq = matchMedia('(prefers-reduced-motion: reduce)');

  get cards(): BentoCard[] {
    return this.#cards || [];
  }
  set cards(v: BentoCard[]) {
    this.#cards = Array.isArray(v) ? v : [];
    if (this.isConnected) {
      this.#active = -1;
      this.#render();
    }
  }
  get active(): number {
    return this.#active;
  }
  set active(i: number) {
    this.#setActive(Number(i));
  }

  connectedCallback(): void {
    this.classList.add('sb');
    this.#cards ??= [];
    const d = this.getAttribute('default-active');
    this.#active = d === null || d === '' ? -1 : Number(d);
    this.#render();
    this.#ro = new ResizeObserver(() => this.#syncCols());
    this.#ro.observe(this);
    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKey);
    this.addEventListener('pointermove', this.#onPointer, {passive: true});
    this.addEventListener('pointerdown', this.#onPointer, {passive: true});
    this.addEventListener('pointerover', this.#onPointer, {passive: true});
    this.addEventListener('pointerout', this.#onPointerOut, {passive: true});
    this.addEventListener('pointerup', this.#onPointerUp, {passive: true});
    this.addEventListener('pointercancel', this.#onPointerUp, {passive: true});
  }

  disconnectedCallback(): void {
    this.#ro?.disconnect();
    this.#anims.forEach((a) => a.cancel());
    cancelAnimationFrame(this.#raf);
    this.removeEventListener('click', this.#onClick);
    this.removeEventListener('keydown', this.#onKey);
    this.removeEventListener('pointermove', this.#onPointer);
    this.removeEventListener('pointerdown', this.#onPointer);
    this.removeEventListener('pointerover', this.#onPointer);
    this.removeEventListener('pointerout', this.#onPointerOut);
    this.removeEventListener('pointerup', this.#onPointerUp);
    this.removeEventListener('pointercancel', this.#onPointerUp);
  }

  #render(): void {
    const id = `sb${++uid}`;
    this.innerHTML = this.cards
      .map(
        (c, i) => `
      <div class="sb-card" role="button" tabindex="0" aria-expanded="${i === this.#active}" aria-controls="${id}-d${i}" data-i="${i}">
        <div class="sb-inner">
          <div class="sb-media">${c.image ? `<img src="${esc(c.image)}" alt="${esc(c.alt || '')}"${c.position ? ` style="object-position:${esc(c.position)}"` : ''} loading="lazy" decoding="async" draggable="false">` : ''}</div>
          <span class="sb-hint" aria-hidden="true"></span>
          <div class="sb-body">
            ${c.tag ? `<span class="sb-tag">${esc(c.tag)}</span>` : ''}
            <h3 class="sb-heading">${esc(c.heading)}</h3>
            ${c.text ? `<p class="sb-text">${esc(c.text)}</p>` : ''}
            <div class="sb-detail" id="${id}-d${i}"><div>
              ${c.detail ? `<p style="margin:0">${esc(c.detail)}</p>` : ''}
              ${c.chips?.length ? `<ul>${c.chips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
            </div></div>
          </div>
        </div>
      </div>`,
      )
      .join('');
    this.#cols = 0;
    this.#syncCols();
  }

  get #els(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(':scope > .sb-card')];
  }

  #syncCols(): void {
    // Computed track lists include implicit columns created by wide spans, so measure with spans reset.
    this.#els.forEach((el) => el.style.setProperty('--span', '1'));
    this.#cols = getComputedStyle(this).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    this.#apply();
  }

  #apply(): void {
    const els = this.#els;
    const {span, lead} = layoutFor(els.length, this.#cols, this.#active);
    els.forEach((el, i) => {
      el.style.setProperty('--span', String(span[i]));
      el.style.order = i === lead ? '-1' : '';
      el.setAttribute('aria-expanded', String(i === this.#active));
    });
  }

  #setActive(requested: number): void {
    const els = this.#els;
    let next = requested;
    if (next >= els.length || Number.isNaN(next)) next = -1;
    if (next === this.#active) return;
    const reduce = this.#mq.matches;
    const inners = els.map((el) => el.firstElementChild as HTMLElement);
    const first = inners.map((n) => n.getBoundingClientRect());
    this.#anims.forEach((a) => a.cancel());
    this.#anims = [];
    this.#active = next;
    this.#apply();
    this.dispatchEvent(new CustomEvent('bento-change', {detail: {index: next}, bubbles: true}));
    const target = els[next];
    if (target && this.#cols === 1) target.scrollIntoView({block: 'nearest', behavior: reduce ? 'auto' : 'smooth'});
    if (reduce) return;
    const cs = getComputedStyle(this);
    const dur = parseFloat(cs.getPropertyValue('--sb-dur')) || 550;
    let ease = cs.getPropertyValue('--sb-ease').trim() || FALLBACK_EASE;
    if (!CSS.supports('transition-timing-function', ease)) ease = FALLBACK_EASE;
    els.forEach((el, i) => {
      const f = first[i];
      const l = el.getBoundingClientRect();
      const dx = f.left - l.left;
      const dy = f.top - l.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(f.width - l.width) < 0.5 && Math.abs(f.height - l.height) < 0.5) return;
      el.classList.add('sb-moving');
      el.classList.toggle('sb-lead', i === next);
      const a = inners[i].animate(
        [
          {transform: `translate(${dx}px, ${dy}px)`, width: `${f.width}px`, height: `${f.height}px`},
          {transform: 'translate(0, 0)', width: `${l.width}px`, height: `${l.height}px`},
        ],
        {duration: dur, easing: ease},
      );
      const done = () => el.classList.remove('sb-moving', 'sb-lead');
      a.onfinish = done;
      a.oncancel = done;
      this.#anims.push(a);
    });
  }

  #card(e: Event): HTMLElement | null {
    const el = (e.target as Element | null)?.closest?.<HTMLElement>('.sb-card') ?? null;
    return el && el.parentElement === this ? el : null;
  }

  #onClick = (e: Event): void => {
    const el = this.#card(e);
    if (!el) return;
    const i = Number(el.dataset['i']);
    this.#setActive(i === this.#active ? -1 : i);
  };

  #onKey = (e: KeyboardEvent): void => {
    const el = this.#card(e);
    if (!el) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.click();
    } else if (e.key === 'Escape' && this.#active >= 0) {
      this.#setActive(-1);
    }
  };

  #onPointer = (e: PointerEvent): void => {
    const el = this.#card(e);
    if (!el) return;
    if (e.pointerType !== 'mouse' && e.type === 'pointerover') return;
    const x = e.clientX;
    const y = e.clientY;
    cancelAnimationFrame(this.#raf);
    this.#raf = requestAnimationFrame(() => {
      const r = (el.firstElementChild as HTMLElement).getBoundingClientRect();
      el.style.setProperty('--x', `${x - r.left}px`);
      el.style.setProperty('--y', `${y - r.top}px`);
      el.toggleAttribute('data-glow', true);
    });
  };

  #onPointerOut = (e: PointerEvent): void => {
    const el = this.#card(e);
    if (el && !el.contains(e.relatedTarget as Node | null)) el.removeAttribute('data-glow');
  };

  #onPointerUp = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse') return;
    const el = this.#card(e);
    if (el) setTimeout(() => el.removeAttribute('data-glow'), 450);
  };
}

if (!customElements.get('spotlight-bento')) customElements.define('spotlight-bento', SpotlightBento);
