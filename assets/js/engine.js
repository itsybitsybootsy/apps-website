/* Scroll timeline engine.

   A stage is a tall section with a sticky child. Its scroll position maps to a
   progress value p in [0, 1], smoothed each frame so wheel steps feel fluid.
   Scenes own a range [a, b] of that progress and render as a pure function of
   their local t = seg(p, a, b). Pure functions mean scrubbing backwards works
   for free: nothing depends on what happened in a previous frame. */

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const seg = (p, a, b) => clamp((p - a) / (b - a));
export const lerp = (a, b, t) => a + (b - a) * t;
export const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));

export const ease = {
  linear: t => t,
  in: t => t * t * t,
  out: t => 1 - Math.pow(1 - t, 3),
  inOut: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: t => 1 - Math.pow(1 - t, 5),
  outBack: t => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};

/* 0 → 1 → 0 bump inside [a, b], useful for taps and flashes */
export const pulse = (t, a, b) => { const x = seg(t, a, b); return x <= 0 || x >= 1 ? 0 : Math.sin(x * Math.PI); };

export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Style writes are cached per element so an idle frame touches nothing. */
const cache = new WeakMap();
export function css(el, prop, value) {
  if (!el) return;
  let m = cache.get(el);
  if (!m) { m = {}; cache.set(el, m); }
  if (m[prop] === value) return;
  m[prop] = value;
  if (prop.startsWith('--')) el.style.setProperty(prop, value);
  else el.style[prop] = value;
}
export function text(el, value) {
  if (!el) return;
  const v = String(value);
  if (el.textContent !== v) el.textContent = v;
}
/* Same cache for attributes (SVG path data, points, etc.) */
const attrCache = new WeakMap();
export function attr(el, name, value) {
  if (!el) return;
  let m = attrCache.get(el);
  if (!m) { m = {}; attrCache.set(el, m); }
  const v = String(value);
  if (m[name] === v) return;
  m[name] = v;
  el.setAttribute(name, v);
}
export function toggle(el, cls, on) {
  if (el && el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}

/* Formats a number the German way: 1,5 instead of 1.5 */
export const de = (n, d = 0) => n.toFixed(d).replace('.', ',');

/**
 * createStage(track, { scenes, onFrame })
 *   track   the tall element whose scroll range drives progress
 *   scenes  [{ range: [a, b], init(ctx)?, update(t, ctx), helper? }]
 *           helper: true marks page level effects that never become ctx.active
 *   onFrame optional (p, ctx) => void called after scenes each frame
 * ctx carries { p, active (the scene whose range holds p), stage }
 */
export function createStage(track, { scenes = [], onFrame } = {}) {
  let target = 0, current = 0, last = 0, running = false, visible = false;
  const ctx = { p: 0, stage: null };

  const measure = () => {
    const r = track.getBoundingClientRect();
    const span = r.height - window.innerHeight;
    target = span > 0 ? clamp(-r.top / span) : 0;
  };

  const render = () => {
    ctx.p = current;
    ctx.active = null;
    // the first real scene whose range holds p; helpers (captions, bars) never count
    for (const s of scenes) if (!s.helper && current >= s.range[0] && current <= s.range[1]) { ctx.active = s; break; }
    for (const s of scenes) {
      if (s.broken) continue;
      try { s.update(seg(current, s.range[0], s.range[1]), ctx); }
      catch (err) { s.broken = true; console.warn(`scene ${s.name || '?'} stopped:`, err); }
    }
    if (onFrame) onFrame(current, ctx);
  };

  const frame = now => {
    const dt = Math.min(64, now - (last || now));
    last = now;
    measure();
    // frame rate independent damping, roughly 0.14 per 60 Hz frame
    const k = reduceMotion ? 1 : 1 - Math.pow(1 - .14, dt / 16.67);
    current += (target - current) * k;
    if (Math.abs(target - current) < 1e-5) current = target;
    try { render(); }
    finally {
      // settle, then sleep until the next scroll or resize wakes us
      if (visible && current !== target) requestAnimationFrame(frame);
      else { running = false; last = 0; }
    }
  };

  const kick = () => {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  };

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) kick();
  }, { rootMargin: '20% 0px' }).observe(track);

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', () => { scenes.forEach(s => s.resize && s.resize(ctx)); kick(); });

  const stage = {
    ctx,
    get progress() { return current; },
    start() {
      scenes.forEach(s => {
        try { if (s.init) s.init(ctx); }
        catch (err) { s.broken = true; console.warn(`scene ${s.name || '?'} failed to init:`, err); }
      });
      measure(); current = target; render(); kick();
      return stage;
    },
  };
  ctx.stage = stage;
  return stage;
}

/* Captions: one text block per start value, crossfaded with classes. */
export function captions(els, ranges) {
  return {
    range: [0, 1],
    helper: true,
    update(_t, ctx) {
      let idx = 0;
      ranges.forEach((start, i) => { if (ctx.p >= start) idx = i; });
      els.forEach((el, i) => {
        toggle(el, 'on', i === idx);
        toggle(el, 'past', i < idx);
      });
    },
  };
}
