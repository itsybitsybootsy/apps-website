/* Page wiring. Both pinned stages and their timelines are defined here, so the
   whole choreography can be read (and retimed) in one place.

   Scene contract (assets/js/scenes/*.js):
     export default function ({ phone, callouts, panel }) {
       return { init(ctx), update(t, ctx), resize?(ctx) };
     }
   - init builds the scene's own screen(s) with phone.addScreen(el)
   - update(t) renders the scene as a pure function of local t in [0, 1]
     (t is 0 before the range, 1 after it). Hide your screen while t === 0
     so scrolling back up reveals the previous scene.
   - only drive the finger while ctx.active === this scene
   - big numbers beside the phone go through rail.set({ num, unit, label, k })
   - sample data lives in scenes/data.js so all scenes tell the same story */

import { createStage, captions, seg, css, ease, reduceMotion, toggle } from './engine.js';
import { mountPhone } from './phone.js';
import { createRail } from './rail.js';

/* Animated start states only apply once this module actually runs, so the
   page still reads fine without JS or if a module fails to load. */
document.documentElement.classList.add('anim');

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* Scenes load independently: a missing or broken scene must not take the page down. */
const load = name => import(`./scenes/${name}.js`).then(m => m.default).catch(err => { console.warn(`scene ${name}:`, err); return null; });

async function buildStage(key, timeline, extra = []) {
  const track = $(`[data-track="${key}"]`);
  const panel = $(`[data-panel="${key}"]`);
  const callouts = $(`[data-callouts="${key}"]`);
  const phone = mountPhone($(`[data-phone="${key}"]`));
  const rail = createRail(panel, phone);
  const factories = await Promise.all(timeline.map(([name]) => load(name)));
  const scenes = [];
  timeline.forEach(([name, a, b], i) => {
    const make = factories[i];
    if (!make) return;
    try {
      const s = make({ phone, callouts, panel, rail });
      s.name = name;
      s.range = [a, b];
      scenes.push(s);
    } catch (err) { console.warn(`scene ${name}:`, err); }
  });
  const caps = $$(`[data-caps="${key}"] .cap`);
  const bars = $$(`[data-bars="${key}"] i`);
  return createStage(track, { scenes: [...scenes, ...extra(panel, caps, bars, track), rail.helper] }).start();
}

/* ---------------------------------------------------------------- stage 1: scan */
const heroCopy = $('[data-hero-copy]');
const heroFace = $('[data-hero-face]');
const hint = $('[data-hint="scan"]');
const INTRO = .07;

buildStage('scan', [
  ['today', INTRO, .22],
  ['scan', .22, .70],
  ['results', .70, 1],
], (panel, caps, bars) => [
  captions(caps, [0, .22, .315, .40, .54, .70, .86]),
  segments(bars, [[INTRO, .22], [.22, .70], [.70, 1]]),
  {
    // the panel rises out of the hero and the hero text blurs away, as on spacefs.com
    range: [0, INTRO],
    helper: true,
    update(t, ctx) {
      const e = ease.inOut(t);
      css(panel, '--rise', `${((1 - e) * (window.innerWidth <= 860 ? 82 : 70)).toFixed(2)}svh`);
      css(panel, '--sc', (.92 + .08 * e).toFixed(4));
      const h = seg(t, 0, .8);
      const heroStyle = `translateY(${(-h * 60).toFixed(1)}px)`;
      css(heroCopy, 'opacity', (1 - h).toFixed(3));
      css(heroCopy, 'transform', heroStyle);
      css(heroCopy, 'filter', `blur(${(h * 10).toFixed(1)}px)`);
      if (heroFace) { css(heroFace, 'opacity', (1 - h).toFixed(3)); css(heroFace, 'transform', heroStyle); }
      css(hint, 'opacity', ctx.p > .09 ? '0' : '1');
    },
  },
]);

/* ---------------------------------------------------------------- stage 2: im Alltag */
buildStage('life', [
  ['verlauf', 0, .25],
  ['score', .25, .5],
  ['routine', .5, .75],
  ['streak', .75, 1],
], (panel, caps, bars, track) => [
  captions(caps, [0, .25, .5, .75]),
  segments(bars, [[0, .25], [.25, .5], [.5, .75], [.75, 1]]),
  {
    // the dark panel settles into place as it scrolls in, echoing stage 1
    range: [0, 1],
    helper: true,
    update() {
      const r = track.getBoundingClientRect();
      const k = ease.out(seg(1 - r.top / window.innerHeight, 0, 1));
      css(panel, '--sc', (.94 + .06 * k).toFixed(4));
      css(panel, '--rise', `${((1 - k) * 6).toFixed(2)}svh`);
    },
  },
]);

/* Progress bars under the captions, one segment per scene. */
function segments(bars, ranges) {
  return {
    range: [0, 1],
    helper: true,
    update(_t, ctx) { bars.forEach((b, i) => css(b, '--p', seg(ctx.p, ...ranges[i]).toFixed(3))); },
  };
}

/* ---------------------------------------------------------------- face models in hero and CTA */
/* Runs fn every frame, but only while el is on screen. */
const whileVisible = (el, fn) => {
  let on = false;
  const loop = now => { if (!on) return; fn(now); requestAnimationFrame(loop); };
  new IntersectionObserver(([e]) => {
    const was = on;
    on = e.isIntersecting;
    if (on && !was) requestAnimationFrame(loop);
  }).observe(el);
};

import('./face3d.js').then(({ createFace }) => {
  const heroCanvas = $('canvas', heroFace);
  if (heroCanvas && getComputedStyle(heroFace).display !== 'none') {
    const f = createFace(heroCanvas, { theme: 'light', fit: window.innerWidth <= 960 ? .92 : .62 });
    f.set({ assemble: 1 });
    // slow idle turn, and a little follow of the pointer
    let mx = 0;
    if (!reduceMotion) {
      window.addEventListener('pointermove', e => { mx = (e.clientX / window.innerWidth) * 2 - 1; }, { passive: true });
      whileVisible(heroCanvas, now => f.set({ yaw: Math.sin(now / 2600) * .45 + mx * .25 }));
    }
  }
  const ctaCanvas = $('[data-cta-face] canvas');
  if (ctaCanvas) {
    const f = createFace(ctaCanvas, { theme: 'dark' });
    new IntersectionObserver(([e]) => f.set({ assemble: e.isIntersecting ? 1 : 0 }), { threshold: .3 }).observe(ctaCanvas);
    if (!reduceMotion) {
      whileVisible(ctaCanvas, now => f.set({ yaw: Math.sin(now / 3200) * .6 }));
    }
  }
}).catch(err => console.warn('face3d:', err));

/* ---------------------------------------------------------------- nav */
const nav = $('#nav');
const navToggle = $('.nav-toggle');
const setOpen = open => { toggle(nav, 'open', open); navToggle.setAttribute('aria-expanded', String(open)); };
navToggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
$$('.nav-links a').forEach(a => a.addEventListener('click', () => setOpen(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
document.addEventListener('click', e => { if (!nav.contains(e.target)) setOpen(false); });
// blur band under the nav once the page has left the very top
new IntersectionObserver(([e]) => toggle(nav, 'scrolled', !e.isIntersecting)).observe($('[data-top-sentinel]'));
// over dark panels the white band would smear a grey seam and the black button would vanish
const darkUnder = new Set();
new IntersectionObserver(entries => {
  entries.forEach(e => (e.isIntersecting ? darkUnder.add(e.target) : darkUnder.delete(e.target)));
  toggle(nav, 'on-dark', darkUnder.size > 0);
}, { rootMargin: '0px 0px -92% 0px' }).observe($('[data-panel="life"]'));
new IntersectionObserver(entries => {
  entries.forEach(e => (e.isIntersecting ? darkUnder.add(e.target) : darkUnder.delete(e.target)));
  toggle(nav, 'on-dark', darkUnder.size > 0);
}, { rootMargin: '0px 0px -92% 0px' }).observe($('.cta-panel'));

const links = $$('.nav-links a');
const byId = Object.fromEntries(links.map(a => [a.getAttribute('href').slice(1), a]));
const secObs = new IntersectionObserver(entries => entries.forEach(e => {
  if (!e.isIntersecting) return;
  links.forEach(x => x.removeAttribute('aria-current'));
  if (byId[e.target.id]) byId[e.target.id].setAttribute('aria-current', 'true');
}), { rootMargin: '-45% 0px -50% 0px' });
$$('main > section').forEach(s => secObs.observe(s));

/* ---------------------------------------------------------------- word reveal
   Words turn from grey to ink as the paragraph moves up the viewport. */
$$('[data-words]').forEach(el => {
  const walk = node => [...node.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(part); return; }
        const w = document.createElement('span');
        w.className = 'w';
        w.textContent = part;
        frag.append(w);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1) walk(n);
  });
  walk(el);
  const words = $$('.w', el);
  if (reduceMotion) { words.forEach(w => w.classList.add('on')); return; }
  let queued = false, inView = false;
  const paint = () => {
    queued = false;
    const r = el.getBoundingClientRect();
    const k = seg(window.innerHeight * .85 - r.top, 0, r.height + window.innerHeight * .35);
    const n = Math.round(k * words.length);
    words.forEach((w, i) => toggle(w, 'on', i < n));
  };
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) paint(); }).observe(el);
  window.addEventListener('scroll', () => { if (inView && !queued) { queued = true; requestAnimationFrame(paint); } }, { passive: true });
});

/* ---------------------------------------------------------------- reveal */
if (!reduceMotion) {
  const rvObs = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); rvObs.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach(el => rvObs.observe(el));
} else {
  $$('.rv').forEach(el => el.classList.add('in'));
}

const year = $('[data-year]');
if (year) year.textContent = String(new Date().getFullYear());
