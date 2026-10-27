// @ts-nocheck
// Vanilla <video-carousel> custom element from the Lyft'd carousel pack, kept as shipped.
// Browser only: import it dynamically (see VideoCarouselComponent) so SSR never evaluates it.
// <video-carousel> — Lyft'd PWA video carousel. Vanilla custom element, no dependencies, offline-safe.
// Swipe/drag/wheel/arrow keys; centred card autoplays muted; press-and-hold (or hover) previews; tap opens a glass floating player.
// Usage: <link rel="stylesheet" href="video-carousel.css"> <video-carousel class="vc-theme-lyftd"></video-carousel>
//        import "./video-carousel.js"; el.videos = [{ src, poster, title, caption, duration? }]
const SVG = (d, vb = "0 0 24 24") => `<svg viewBox="${vb}" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
const I = {
  play: SVG("M8 5.14v13.72a1 1 0 0 0 1.52.85l10.29-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z"),
  pause: SVG("M7 4h3.5v16H7zM13.5 4H17v16h-3.5z"),
  vol: SVG("M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"),
  mute: SVG("M4 9v6h4l5 4V5L8 9H4zm12.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z"),
  close: SVG("M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7l-1.4-1.4L9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z"),
  pip: SVG("M19 7h-8v6h8V7zm2-4H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H3V5h18v14z"),
  prev: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`,
  next: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>`,
};
const SPRING = "linear(0,0.019,0.069,0.141,0.228,0.324,0.423,0.52,0.614,0.7,0.778,0.847,0.906,0.956,0.996,1.027,1.05,1.067,1.077,1.082,1.083,1.081,1.077,1.071,1.063,1.055,1.047,1.039,1.031,1.024,1.017,1.012,1.007,1.003,1,0.997,0.996,0.994,0.993,0.993,1)";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (s) => { if (!isFinite(s)) return "0:00"; s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const mq = (q) => window.matchMedia?.(q);
let uid = 0;

class VideoCarousel extends HTMLElement {
  constructor() {
    super();
    this._videos = []; this._i = 0; this._cards = []; this._p = null; this._preview = null; this._player = null;
    this._visible = true; this._eat = false; this._raf = 0; this._wheelLock = 0; this._id = `vc${++uid}`;
    this._onScroll = () => { if (!this._sraf) this._sraf = requestAnimationFrame(() => { this._sraf = 0; this._layout(); }); };
    this._onVis = () => this._resume();
    this._onResize = () => this._layout();
  }
  get videos() { return this._videos; }
  set videos(v) { this._videos = Array.isArray(v) ? v : []; if (this.isConnected) this._render(); }
  get active() { return this._i; }
  set active(i) { this.go(+i, false); }
  get holdDelay() { return +(this.getAttribute("hold-delay") || 300); }
  get _reduced() { return !!mq("(prefers-reduced-motion: reduce)")?.matches; }
  get _saveData() { return !!navigator.connection?.saveData; }
  get _autoOK() {
    return !this._reduced && !this._saveData && !this.hasAttribute("no-autoplay") && this._visible && !document.hidden && !this._player;
  }

  connectedCallback() {
    this.classList.add("vc");
    if (!this.hasAttribute("role")) this.setAttribute("role", "region");
    this.setAttribute("aria-roledescription", "carousel");
    if (!this.hasAttribute("aria-label")) this.setAttribute("aria-label", this.getAttribute("label") || "Videos");
    document.addEventListener("visibilitychange", this._onVis);
    window.addEventListener("resize", this._onResize);
    this._hostIO = new IntersectionObserver((es) => { this._visible = es[es.length - 1].isIntersecting; this._resume(); }, { threshold: 0.25 });
    this._hostIO.observe(this);
    this._render();
  }
  disconnectedCallback() {
    document.removeEventListener("visibilitychange", this._onVis);
    window.removeEventListener("resize", this._onResize);
    this._hostIO?.disconnect(); this._lazyIO?.disconnect();
    this._closePlayer(true);
  }

  // ---------- render ----------
  _render() {
    this._lazyIO?.disconnect();
    const n = this._videos.length;
    this.innerHTML = `
      <p class="vc-sr" id="${this._id}-hint">Swipe or use arrow keys to browse. Press and hold a video to preview it, tap to open the player.</p>
      <div class="vc-track" tabindex="-1">${this._videos.map((v, i) => `
        <div class="vc-card" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${n}: ${esc(v.title)}" data-i="${i}"
             style="${v.aspect ? `--vc-aspect:${esc(v.aspect)};` : ""}${v.position ? `--vc-pos:${esc(v.position)};` : ""}">
          <div class="vc-cf"><div class="vc-lift"><div class="vc-inner">
            <img src="${esc(v.poster)}" alt="" draggable="false" loading="${i < 3 ? "eager" : "lazy"}" decoding="async">
            <video muted playsinline webkit-playsinline loop preload="none" disablepictureinpicture disableremoteplayback
                   poster="${esc(v.poster)}" data-src="${esc(v.src)}" aria-hidden="true" tabindex="-1"></video>
            <div class="vc-scrim"></div>
            <div class="vc-meta"><div class="vc-row"><h3 class="vc-title">${esc(v.title)}</h3><span class="vc-dur">${esc(v.duration || "")}</span></div>
              ${v.caption ? `<p class="vc-cap">${esc(v.caption)}</p>` : ""}</div>
            <div class="vc-prog"><i></i></div>
            <div class="vc-dim"></div>
          </div></div></div>
          <button class="vc-hit" type="button" tabindex="${i === this._i ? 0 : -1}" aria-label="Play ${esc(v.title)}" aria-describedby="${this._id}-hint"></button>
        </div>`).join("")}
      </div>
      <div class="vc-bar">
        <button class="vc-nav vc-prev" type="button" aria-label="Previous video">${I.prev}</button>
        <div class="vc-dots">${this._videos.map((v, i) => `<button type="button" aria-label="Go to ${esc(v.title)}" data-i="${i}"></button>`).join("")}</div>
        <button class="vc-nav vc-next" type="button" aria-label="Next video">${I.next}</button>
      </div>
      <div class="vc-sr" aria-live="polite" aria-atomic="true"></div>`;
    this._track = this.querySelector(".vc-track");
    this._cards = [...this.querySelectorAll(".vc-card")];
    this._live = this.querySelector('[aria-live]');
    this._cards.forEach((c, i) => {
      const v = c.querySelector("video");
      v.muted = true; v.defaultMuted = true;
      v.addEventListener("playing", () => { c.classList.add("vc-playing"); this._tick(); });
      v.addEventListener("loadedmetadata", () => {
        const d = c.querySelector(".vc-dur"); if (!this._videos[i].duration) d.textContent = fmt(v.duration);
        if (!this._videos[i].aspect && v.videoWidth) c.style.setProperty("--vc-aspect", `${v.videoWidth} / ${v.videoHeight}`);
      });
      c.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && !e.buttons && !this._dragging) { clearTimeout(this._hoverT); this._hoverT = setTimeout(() => this._startPreview(c), 90); } });
      c.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { clearTimeout(this._hoverT); if (this._preview === c) this._endPreview(); } });
      c.querySelector(".vc-hit").addEventListener("click", (e) => {
        if (this._eat) { e.preventDefault(); return; }
        this.open(i);
      });
      c.querySelector(".vc-hit").addEventListener("focus", () => { if (i !== this._i && !this._p) this.go(i); });
    });
    // lazy-load: attach src only when a card is within ~1 viewport of the track
    this._lazyIO = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && this._load(e.target)), { root: this._track, rootMargin: "0px 110% 0px 110%" });
    this._cards.forEach((c) => this._lazyIO.observe(c));

    const t = this._track;
    t.addEventListener("scroll", this._onScroll, { passive: true });
    t.addEventListener("scrollend", () => this._settle());
    t.addEventListener("pointerdown", (e) => this._down(e));
    t.addEventListener("pointermove", (e) => this._move(e));
    t.addEventListener("pointerup", (e) => this._up(e));
    t.addEventListener("pointercancel", (e) => this._cancel(e));
    t.addEventListener("contextmenu", (e) => { if (e.target.closest(".vc-card")) e.preventDefault(); });
    t.addEventListener("selectstart", (e) => e.preventDefault());
    t.addEventListener("dragstart", (e) => e.preventDefault());
    t.addEventListener("wheel", (e) => this._wheel(e), { passive: false });
    this.addEventListener("keydown", (e) => this._key(e));
    this.querySelector(".vc-prev").addEventListener("click", () => this.go(this._i - 1));
    this.querySelector(".vc-next").addEventListener("click", () => this.go(this._i + 1));
    this.querySelectorAll(".vc-dots button").forEach((b) => b.addEventListener("click", () => this.go(+b.dataset.i)));
    this._i = Math.min(this._i, Math.max(0, n - 1));
    requestAnimationFrame(() => { this.go(this._i, false); this._layout(true); });
  }

  // ---------- coverflow-lite layout ----------
  _layout(force) {
    const t = this._track; if (!t || !this._cards.length) return;
    const mid = t.scrollLeft + t.clientWidth / 2;
    const step = this._cards[0].offsetWidth + (parseFloat(getComputedStyle(t).columnGap) || 14);
    const flat = this._reduced;
    let best = 0, bestD = Infinity;
    this._cards.forEach((c, i) => {
      const d = (c.offsetLeft + c.offsetWidth / 2 - mid) / step, ad = Math.abs(d);
      if (ad < bestD) { bestD = ad; best = i; }
      const k = Math.min(ad, 1), far = Math.max(0, Math.min(ad, 3) - 1);
      const scale = 1.03 - k * 0.17 - far * 0.05;
      const rot = flat ? 0 : Math.max(-1.6, Math.min(1.6, d)) * -14;
      const tx = -Math.sign(d) * (k * 0.06 + far * 0.1) * c.offsetWidth;
      c.querySelector(".vc-cf").style.transform = `translateX(${tx.toFixed(1)}px) rotateY(${rot.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      c.style.setProperty("--dim", (Math.min(ad, 1.4) * 0.4).toFixed(3));
      c.style.zIndex = String(20 - Math.round(ad * 2));
    });
    if (best !== this._i || force) this._setActive(best);
  }
  _setActive(i) {
    const changed = i !== this._i; this._i = i;
    this._cards.forEach((c, k) => { c.classList.toggle("vc-active", k === i); c.querySelector(".vc-hit").tabIndex = k === i ? 0 : -1; });
    this.querySelectorAll(".vc-dots button").forEach((b, k) => b.setAttribute("aria-current", String(k === i)));
    this.querySelector(".vc-prev").disabled = i <= 0;
    this.querySelector(".vc-next").disabled = i >= this._cards.length - 1;
    if (changed) {
      this._live.textContent = `${this._videos[i]?.title ?? ""}, ${i + 1} of ${this._cards.length}`;
      this.dispatchEvent(new CustomEvent("vc-change", { detail: { index: i, video: this._videos[i] }, bubbles: true }));
    }
    clearTimeout(this._autoT); this._autoT = setTimeout(() => this._resume(), 140);
  }
  _settle() { if (!this._dragging) this._track.classList.remove("vc-dragging"); this._layout(); }

  go(i, smooth = true) {
    const t = this._track, c = this._cards[Math.max(0, Math.min(this._cards.length - 1, i | 0))]; if (!t || !c) return;
    const left = c.offsetLeft + c.offsetWidth / 2 - t.clientWidth / 2;
    t.scrollTo({ left, behavior: smooth && !this._reduced ? "smooth" : "auto" });
    if (!smooth) this._layout();
  }
  next() { this.go(this._i + 1); }
  prev() { this.go(this._i - 1); }

  // ---------- video control ----------
  _load(c) {
    const v = c.querySelector("video");
    if (!v.getAttribute("src") && v.dataset.src) { v.src = v.dataset.src; v.preload = this._saveData ? "none" : "metadata"; }
    return v;
  }
  _playOnly(c) {
    this._cards.forEach((o) => { if (o !== c) this._stop(o); });
    if (!c) return;
    const v = this._load(c); v.muted = true;
    const p = v.play(); if (p) p.catch(() => {});
  }
  _stop(c, poster = true) {
    const v = c.querySelector("video"); if (!v.paused) v.pause();
    if (poster && !c.classList.contains("vc-active")) c.classList.remove("vc-playing");
  }
  _resume() {
    if (this._preview || this._player) return;
    if (this._autoOK) this._playOnly(this._cards[this._i]);
    else this._cards.forEach((c) => this._stop(c, false));
  }
  _tick() {
    if (this._raf) return;
    const loop = () => {
      let any = false;
      this._cards.forEach((c) => {
        const v = c.querySelector("video");
        if (!v.paused && v.duration) { any = true; c.querySelector(".vc-prog").style.setProperty("--p", (v.currentTime / v.duration).toFixed(4)); }
      });
      this._raf = any ? requestAnimationFrame(loop) : 0;
    };
    this._raf = requestAnimationFrame(loop);
  }
  _startPreview(c) {
    if (this._preview === c || this._player) return;
    if (this._preview) this._endPreview(true);
    this._preview = c; c.classList.add("vc-preview");
    this._playOnly(c);
    this.dispatchEvent(new CustomEvent("vc-preview", { detail: { index: +c.dataset.i }, bubbles: true }));
  }
  _endPreview(silent) {
    const c = this._preview; if (!c) return;
    this._preview = null; c.classList.remove("vc-preview");
    if (!c.classList.contains("vc-active") || !this._autoOK) this._stop(c);
    if (!silent) this._resume();
  }

  // ---------- pointer: hold / tap / mouse-drag ----------
  _down(e) {
    if (e.button !== 0 || this._player) return;
    if (e.target.closest(".vc-nav")) return;
    const c = e.target.closest(".vc-card");
    this._p = { id: e.pointerId, type: e.pointerType, x: e.clientX, y: e.clientY, t: performance.now(), c, sl: this._track.scrollLeft, moved: false, held: false, vs: [] };
    if (c && e.pointerType !== "mouse") {
      this._holdT = setTimeout(() => {
        const p = this._p; if (!p || p.moved) return;
        p.held = true; this._startPreview(c);
        try { navigator.vibrate?.(8); } catch {}
      }, this.holdDelay);
    }
  }
  _move(e) {
    const p = this._p; if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (!p.moved && Math.hypot(dx, dy) > 8) {
      p.moved = true; clearTimeout(this._holdT);
      if (p.type === "mouse") {
        this._dragging = true; clearTimeout(this._hoverT); this._endPreview();
        this._track.classList.add("vc-dragging");
        try { this._track.setPointerCapture(e.pointerId); } catch {}
      }
    }
    if (this._dragging) {
      this._track.scrollLeft = p.sl - dx;
      p.vs.push([performance.now(), e.clientX]); if (p.vs.length > 6) p.vs.shift();
    }
  }
  _up(e) {
    const p = this._p; if (!p || p.id !== e.pointerId) return;
    clearTimeout(this._holdT); this._p = null;
    if (p.held) this._endPreview();
    if (p.held || p.moved) { this._eat = true; setTimeout(() => (this._eat = false), 60); }
    if (this._dragging) {
      this._dragging = false;
      const vs = p.vs, a = vs[0], b = vs[vs.length - 1];
      const vel = a && b && b[0] > a[0] ? (b[1] - a[1]) / (b[0] - a[0]) : 0; // px/ms
      const step = this._cards[0].offsetWidth + 14;
      const target = this._track.scrollLeft - vel * 220;
      const t = this._track, mid0 = this._cards[0].offsetLeft + this._cards[0].offsetWidth / 2 - t.clientWidth / 2;
      this.go(Math.round((target - mid0) / step));
      setTimeout(() => { if (!this._dragging) t.classList.remove("vc-dragging"); }, 650);
    }
  }
  _cancel(e) {
    const p = this._p; if (!p || p.id !== e.pointerId) return;
    clearTimeout(this._holdT); this._p = null;
    if (p.held) this._endPreview();
    this._dragging = false; this._track.classList.remove("vc-dragging");
  }
  _wheel(e) {
    if (this.hasAttribute("no-wheel") || Math.abs(e.deltaX) >= Math.abs(e.deltaY) || e.ctrlKey) return; // trackpads scroll natively
    const dir = Math.sign(e.deltaY), to = this._i + dir;
    if (to < 0 || to >= this._cards.length) return; // let the page scroll at the ends
    e.preventDefault();
    const now = performance.now(); if (now < this._wheelLock) return;
    this._wheelLock = now + 420; this.go(to);
  }
  _key(e) {
    if (this._player || e.target.closest(".vc-dots")) return;
    const k = e.key; let to = null;
    if (k === "ArrowRight") to = this._i + 1; else if (k === "ArrowLeft") to = this._i - 1;
    else if (k === "Home") to = 0; else if (k === "End") to = this._cards.length - 1;
    if (to === null) return;
    e.preventDefault(); to = Math.max(0, Math.min(this._cards.length - 1, to));
    this.go(to);
    if (this.contains(document.activeElement)) this._cards[to].querySelector(".vc-hit").focus({ preventScroll: true });
  }

  // ---------- glass floating player ----------
  open(i) {
    const cfg = this._videos[i], card = this._cards[i]; if (!cfg || !card || this._player) return;
    clearTimeout(this._hoverT); this._endPreview(true);
    if (i !== this._i) this.go(i);
    const cv = card.querySelector("video"), t0 = cv.currentTime || 0;
    this._cards.forEach((c) => this._stop(c, false));
    const accent = getComputedStyle(this).getPropertyValue("--vc-accent").trim() || "#00baf0";
    const pipOK = !!(document.pictureInPictureEnabled && HTMLVideoElement.prototype.requestPictureInPicture);
    const el = document.createElement("div");
    el.className = "vcp"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", `${this._id}-pt`); el.style.setProperty("--vc-accent", accent);
    el.innerHTML = `
      <div class="vcp-backdrop"></div>
      <div class="vcp-panel">
        <div class="vcp-grab" aria-hidden="true"></div>
        <div class="vcp-media">
          <video playsinline webkit-playsinline loop preload="auto" poster="${esc(cfg.poster)}" src="${esc(cfg.src)}"></video>
          <div class="vcp-info"><h2 class="vcp-title" id="${this._id}-pt">${esc(cfg.title)}</h2>${cfg.caption ? `<p class="vcp-cap">${esc(cfg.caption)}</p>` : ""}</div>
          <button class="vcp-bigplay" type="button" tabindex="-1" aria-hidden="true"><span>${I.play}</span></button>
          <button class="vcp-close" type="button" aria-label="Close player">${I.close}</button>
        </div>
        <div class="vcp-ctrls">
          <button class="vcp-btn vcp-play" type="button" aria-label="Pause">${I.pause}</button>
          <span class="vcp-time vcp-cur">0:00</span>
          <input class="vcp-scrub" type="range" min="0" max="1000" step="1" value="0" aria-label="Seek">
          <span class="vcp-time vcp-tot">${esc(cfg.duration || "0:00")}</span>
          <button class="vcp-btn vcp-mute" type="button" aria-label="Mute">${I.vol}</button>
          ${pipOK ? `<button class="vcp-btn vcp-pip" type="button" aria-label="Picture in picture">${I.pip}</button>` : ""}
        </div>
      </div>`;
    const $ = (s) => el.querySelector(s);
    const panel = $(".vcp-panel"), media = $(".vcp-media"), v = $("video"), bd = $(".vcp-backdrop");
    const scrub = $(".vcp-scrub"), playB = $(".vcp-play"), muteB = $(".vcp-mute");
    // size: keep the video's aspect, fit the viewport (88vw on phones, up to 500px on desktop)
    const asp = (() => { const s = cfg.aspect || (cv.videoWidth ? `${cv.videoWidth}/${cv.videoHeight}` : "9/16"); const [a, b] = String(s).split("/").map(Number); return a && b ? a / b : 9 / 16; })();
    const vw = window.innerWidth, vh = window.innerHeight;
    const chrome = 10 + 12 + 50 + (mq("(pointer: coarse)")?.matches ? 12 : 0);
    const w = Math.round(Math.min(vw * 0.88, vw >= 768 ? 500 : 9999, (vh * 0.92 - chrome) * asp + 20));
    el.style.setProperty("--vcp-w", `${w}px`); el.style.setProperty("--vcp-aspect", String(asp));
    document.body.appendChild(el);
    document.documentElement.classList.add("vcp-lock");
    this._player = { el, i, card, v, returnTo: document.activeElement?.closest?.(".vc-card") ? card.querySelector(".vc-hit") : document.activeElement };

    // state + controls
    const sync = () => {
      const paused = v.paused;
      el.classList.toggle("vcp-paused", paused);
      playB.innerHTML = paused ? I.play : I.pause; playB.setAttribute("aria-label", paused ? "Play" : "Pause");
      muteB.innerHTML = v.muted ? I.mute : I.vol; muteB.setAttribute("aria-label", v.muted ? "Unmute" : "Mute");
    };
    const toggle = () => { if (v.paused) v.play().catch(() => {}); else v.pause(); };
    let scrubbing = false;
    const loop = () => {
      if (!this._player || this._player.el !== el) return;
      if (v.duration && !scrubbing) {
        const f = v.currentTime / v.duration; scrub.value = String(Math.round(f * 1000));
        scrub.style.setProperty("--p", `${(f * 100).toFixed(2)}%`); $(".vcp-cur").textContent = fmt(v.currentTime);
      }
      requestAnimationFrame(loop);
    };
    v.addEventListener("loadedmetadata", () => {
      $(".vcp-tot").textContent = fmt(v.duration);
      if (t0 > 0.05 && t0 < v.duration) v.currentTime = t0;
    });
    ["play", "pause", "volumechange"].forEach((n) => v.addEventListener(n, sync));
    playB.addEventListener("click", toggle);
    muteB.addEventListener("click", () => { v.muted = !v.muted; });
    scrub.addEventListener("input", () => {
      scrubbing = true; const f = +scrub.value / 1000; scrub.style.setProperty("--p", `${f * 100}%`);
      if (v.duration) { v.currentTime = f * v.duration; $(".vcp-cur").textContent = fmt(v.currentTime); }
    });
    scrub.addEventListener("change", () => (scrubbing = false));
    scrub.addEventListener("pointerup", () => (scrubbing = false));
    $(".vcp-close").addEventListener("click", () => this.close());
    bd.addEventListener("click", () => this.close());
    $(".vcp-pip")?.addEventListener("click", async () => {
      try {
        await v.requestPictureInPicture();
        v.addEventListener("leavepictureinpicture", () => { if (this._pip === el) { this._pip = null; el.remove(); } }, { once: true });
        this._pip = el; this.close({ keepVideo: true });
      } catch {}
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); this.close(); }
      else if (e.key === "Tab") { // focus trap
        const f = [...el.querySelectorAll("button:not([tabindex='-1']), input")]; const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      } else if (e.target === scrub) return;
      else if (e.key === " " || e.key === "k") { if (!e.target.closest("button")) { e.preventDefault(); toggle(); } }
      else if (e.key === "m") muteB.click();
      else if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime + (e.key === "ArrowRight" ? 5 : -5)); }
    });
    // swipe down to close; tap the video to play/pause
    let d = null;
    panel.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button, input") || e.button !== 0) return;
      d = { id: e.pointerId, y: e.clientY, x: e.clientX, t: performance.now(), dy: 0 };
      try { panel.setPointerCapture(e.pointerId); } catch {}
    });
    panel.addEventListener("pointermove", (e) => {
      if (!d || d.id !== e.pointerId) return;
      d.dy = Math.max(0, e.clientY - d.y);
      if (d.dy > 4) { panel.style.transform = `translateY(${d.dy}px) scale(${1 - Math.min(d.dy, 400) / 2200})`; bd.style.opacity = String(1 - Math.min(d.dy, 360) / 480); }
    });
    const end = (e) => {
      if (!d || d.id !== e.pointerId) return;
      const { dy, t, x, y } = d; d = null;
      const vel = dy / Math.max(1, performance.now() - t);
      if (dy > 110 || (dy > 40 && vel > 0.6)) return this.close();
      if (dy < 6 && Math.hypot(e.clientX - x, e.clientY - y) < 8 && e.type === "pointerup" && e.target.closest(".vcp-media")) toggle();
      panel.animate([{ transform: panel.style.transform || "none" }, { transform: "none" }], { duration: 420, easing: SPRING });
      bd.animate([{ opacity: bd.style.opacity || 1 }, { opacity: 1 }], { duration: 200 });
      panel.style.transform = ""; bd.style.opacity = "";
    };
    panel.addEventListener("pointerup", end); panel.addEventListener("pointercancel", end);
    el.addEventListener("contextmenu", (e) => { if (e.target.closest(".vcp-media")) e.preventDefault(); });

    // play with sound (we're inside the tap's user gesture); fall back to muted if the browser refuses
    v.muted = false;
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); sync(); });
    sync(); requestAnimationFrame(loop);

    // FLIP: grow from the tapped card into the floating glass panel
    card.classList.add("vc-hidden");
    const from = card.querySelector(".vc-inner").getBoundingClientRect();
    const pr = panel.getBoundingClientRect(), mr = media.getBoundingClientRect();
    if (this._reduced) {
      panel.animate([{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 200, easing: "ease-out" });
    } else {
      const s = from.width / mr.width;
      const tx = from.left - pr.left - s * (mr.left - pr.left), ty = from.top - pr.top - s * (mr.top - pr.top);
      panel.animate([{ transform: `translate(${tx}px, ${ty}px) scale(${s})`, borderRadius: `${24 / s}px` }, { transform: "none", borderRadius: "24px" }], { duration: 640, easing: SPRING });
      $(".vcp-ctrls").animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], { duration: 640 });
    }
    bd.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease-out" });
    setTimeout(() => (this._player?.el === el) && playB.focus({ preventScroll: true }), 30);
    this.dispatchEvent(new CustomEvent("vc-open", { detail: { index: i, video: cfg }, bubbles: true }));
  }

  close(opts = {}) { this._closePlayer(false, opts); }
  _closePlayer(instant, { keepVideo } = {}) {
    const P = this._player; if (!P) return;
    this._player = null;
    const { el, card, v } = P, panel = el.querySelector(".vcp-panel"), bd = el.querySelector(".vcp-backdrop");
    const cv = card.querySelector("video");
    if (v.currentTime && cv.getAttribute("src")) { card.classList.remove("vc-playing"); try { cv.currentTime = v.currentTime; } catch {} } // poster shows until the card video is playing again
    document.documentElement.classList.remove("vcp-lock");
    const finish = () => {
      card.classList.remove("vc-hidden");
      if (keepVideo) { el.style.cssText += ";visibility:hidden;pointer-events:none"; } else { v.pause(); el.remove(); }
      this.dispatchEvent(new CustomEvent("vc-close", { detail: { index: P.i }, bubbles: true }));
      this._resume();
    };
    if (!instant) P.returnTo?.focus?.({ preventScroll: true });
    if (instant || keepVideo) return finish();
    const to = card.querySelector(".vc-inner").getBoundingClientRect();
    const onScreen = to.right > 0 && to.left < innerWidth && to.bottom > 0 && to.top < innerHeight;
    const cur = getComputedStyle(panel).transform;
    panel.style.transform = "";
    const pr = panel.getBoundingClientRect(), mr = el.querySelector(".vcp-media").getBoundingClientRect();
    let anim;
    if (onScreen && !this._reduced) {
      const s = to.width / mr.width;
      const tx = to.left - pr.left - s * (mr.left - pr.left), ty = to.top - pr.top - s * (mr.top - pr.top);
      el.querySelector(".vcp-ctrls").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" });
      anim = panel.animate([{ transform: cur === "none" ? "none" : cur }, { transform: `translate(${tx}px, ${ty}px) scale(${s})` }], { duration: 360, easing: "cubic-bezier(.3,.7,.2,1)", fill: "forwards" });
    } else {
      anim = panel.animate([{ transform: cur === "none" ? "none" : cur, opacity: 1 }, { transform: "translateY(40px) scale(.94)", opacity: 0 }], { duration: 240, easing: "ease-in", fill: "forwards" });
    }
    bd.animate([{ opacity: getComputedStyle(bd).opacity }, { opacity: 0 }], { duration: 320, fill: "forwards" });
    anim.onfinish = finish;
  }
}
if (!customElements.get("video-carousel")) customElements.define("video-carousel", VideoCarousel);
export default VideoCarousel;
