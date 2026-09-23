/* Page wiring. The whole choreography of the pinned show lives here, so it can
   be read and retimed in one place.

   Scene contract (assets/js/scenes/*.js):
     export default function ({ phone, cam, callouts, panel }) {
       return { init(ctx), update(t, ctx), resize?(ctx) };
     }
   - init builds the scene's own screen(s) with phone.addScreen(el)
   - update(t) renders the scene from local t in [0, 1] (0 before its range,
     1 after). Spatial motion follows scroll; one shot events (shutter, checks,
     count ups) use once() from engine.js and play on the clock.
   - hide your screen while t === 0 so scrolling back reveals the previous one
   - only drive the finger while ctx.active === this scene
   - sample data lives in scenes/data.js so all scenes tell the same story */

import { createStage, captions, seg, css, ease, lerp, reduceMotion, toggle } from './engine.js';
import { mountPhone } from './phone.js';

/* index.html sets .anim early and drops it again unless this module reports in,
   so the page still reads fine without JS or if a module fails to load. */
window.smReady = true;
document.documentElement.classList.add('anim');

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const narrow = () => window.innerWidth <= 860;

/* ---------------------------------------------------------------- timeline
   Stage progress p runs 0..1 over 700svh of scroll (800svh track). */
const T = {
  hero: [0, .05],
  camera: [.05, .49],     // front .05, left .15, right .25, analysis .34, shrink into the phone .44
  results: [.49, .58],
  verlauf: [.58, .685],
  score: [.685, .79],
  routine: [.79, .895],
  streak: [.895, 1],
};
const CAPTIONS = [.05, .15, .25, .34, .475, .58, .685, .79, .895];

/* Phone placement per beat: x in vw from centre, y in svh, scale, opacity.
   Between keys it eases; at each key the phone rests. */
const PLACE_WIDE = [
  { p: .478, x: 10, y: 0, s: 1, o: 0 },     // the camera lands in the screen first,
  { p: .488, x: 10, y: 0, s: 1, o: 1 },     // then the frame appears around it (same 60vw axis as the oval)
  { p: .69, x: 10, y: 0, s: 1, o: 1 },
  { p: .71, x: 10, y: 24, s: 1.45, o: 1 },   // push in on the score dial
  { p: .77, x: 10, y: 24, s: 1.45, o: 1 },
  { p: .8, x: -18, y: 0, s: 1, o: 1 },       // the one sideways move: phone left for the routine
  { p: .885, x: -18, y: 0, s: 1, o: 1 },
  { p: .91, x: 10, y: 0, s: 1, o: 1 },
];
const PLACE_NARROW = [
  { p: .478, x: 0, y: 0, s: 1, o: 0 },
  { p: .488, x: 0, y: 0, s: 1, o: 1 },
  { p: .69, x: 0, y: 0, s: 1, o: 1 },
  { p: .71, x: 0, y: 16, s: 1.25, o: 1 },
  { p: .77, x: 0, y: 16, s: 1.25, o: 1 },
  { p: .8, x: 0, y: 0, s: 1, o: 1 },
];
function placeAt(keys, p) {
  if (p <= keys[0].p) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (p <= b.p) {
      const e = ease.inOut(seg(p, a.p, b.p));
      return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), s: lerp(a.s, b.s, e), o: lerp(a.o, b.o, e) };
    }
  }
  return keys[keys.length - 1];
}

/* Scenes load independently: a missing or broken scene must not take the page down. */
const load = name => import(`./scenes/${name}.js`).then(m => m.default).catch(err => { console.warn(`scene ${name}:`, err); return null; });

async function buildShow() {
  const track = $('[data-track="app"]');
  const panel = $('[data-panel="app"]');
  const cam = $('[data-cam]');
  const callouts = $('[data-callouts="app"]');
  const phoneWrap = $('[data-phone-wrap]');
  const phone = mountPhone($('[data-phone="app"]'));
  const heroCopy = $('[data-hero-copy]');
  const caps = $('[data-caps]');
  const note = $('[data-note]');
  const rail = { set() {} };  // the stat rail was retired; scenes may still call it

  const names = ['camera', 'results', 'verlauf', 'score', 'routine', 'streak'];
  const factories = await Promise.all(names.map(load));
  const scenes = [];
  names.forEach((name, i) => {
    if (!factories[i]) return;
    try {
      const s = factories[i]({ phone, cam, callouts, panel, rail });
      s.name = name;
      s.range = T[name];
      scenes.push(s);
    } catch (err) { console.warn(`scene ${name}:`, err); }
  });

  const page = {
    range: [0, 1],
    helper: true,
    update(_t, ctx) {
      const p = ctx.p;
      // the headline leaves as the scan begins
      const h = ease.inOut(seg(p, 0, T.hero[1] * .9));
      css(heroCopy, 'opacity', (1 - h).toFixed(3));
      css(heroCopy, 'filter', h > 0 ? `blur(${(h * 8).toFixed(1)}px)` : 'none');
      css(heroCopy, 'translate', `0 ${(-h * 50).toFixed(1)}px`);
      css(heroCopy, 'visibility', h >= 1 ? 'hidden' : 'visible');

      const k = placeAt(narrow() ? PLACE_NARROW : PLACE_WIDE, p);
      css(phoneWrap, '--px', `${k.x.toFixed(3)}vw`);
      css(phoneWrap, '--py', `${k.y.toFixed(3)}svh`);
      css(phoneWrap, '--ps', k.s.toFixed(4));
      css(phoneWrap, '--po', k.o.toFixed(3));

      toggle(caps, 'right', !narrow() && p >= .79 && p < .895);
      toggle(note, 'on', p > .47);
    },
  };

  const capEls = $$('.cap', caps);
  return createStage(track, { scenes: [...scenes, captions(capEls, CAPTIONS), page] }).start();
}
buildShow();

/* ---------------------------------------------------------------- nav */
const nav = $('#nav');
const navToggle = $('.nav-toggle');
const setOpen = open => { toggle(nav, 'open', open); navToggle.setAttribute('aria-expanded', String(open)); };
navToggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
$$('.nav-links a').forEach(a => a.addEventListener('click', () => setOpen(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
document.addEventListener('click', e => { if (!nav.contains(e.target)) setOpen(false); });

// over black sections the button turns white and the white band stays off
const darkUnder = new Set();
const darkObs = new IntersectionObserver(entries => {
  entries.forEach(e => (e.isIntersecting ? darkUnder.add(e.target) : darkUnder.delete(e.target)));
  toggle(nav, 'on-dark', darkUnder.size > 0);
}, { rootMargin: '0px 0px -95% 0px' });
$$('.show, .cta-sec').forEach(el => darkObs.observe(el));
window.addEventListener('scroll', () => toggle(nav, 'scrolled', window.scrollY > 8), { passive: true });

const links = $$('.nav-links a');
const byId = Object.fromEntries(links.map(a => [a.getAttribute('href').slice(1), a]));
const secObs = new IntersectionObserver(entries => entries.forEach(e => {
  if (!e.isIntersecting) return;
  links.forEach(x => x.removeAttribute('aria-current'));
  if (byId[e.target.id]) byId[e.target.id].setAttribute('aria-current', 'true');
}), { rootMargin: '-45% 0px -50% 0px' });
$$('main > section').forEach(s => secObs.observe(s));

/* ---------------------------------------------------------------- word reveal
   Words turn from grey to ink as the statement moves up the viewport. */
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
    const k = seg(window.innerHeight * .8 - r.top, 0, r.height + window.innerHeight * .2);
    const n = Math.round(k * words.length);
    words.forEach((w, i) => toggle(w, 'on', i < n));
  };
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) paint(); }).observe(el);
  window.addEventListener('scroll', () => { if (inView && !queued) { queued = true; requestAnimationFrame(paint); } }, { passive: true });
});

const year = $('[data-year]');
if (year) year.textContent = String(new Date().getFullYear());
