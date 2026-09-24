/* Scene: the "Profil" segment of the Progress tab (SkinScoreDetailView /
   SkinScoreInfoSheet): the score dial, the Kennzahlen breakdown with its tick
   bars, and the Radar. Opens with the finger tapping "Profil" in the same
   segmented control the Verlauf scene left on "Verlauf", so it reads as one
   continuous tab rather than a hard cut.

   Spatial motion (the crossfade, the finger, the body scroll) follows scroll
   directly. The three discrete beats - the dial's count up and arc sweep,
   the Kennzahlen bars, and the radar growing in - play on the clock via
   once() once scroll reaches them, so they read the same snap regardless of
   scroll speed and always finish on a readable, held plateau rather than
   stopping mid-motion if the user pauses. The dial still replays the real
   SkinScoreDial's band/colour thresholds as it climbs, not just at the final
   value; the radar is gated on the card actually being visible, not a guess
   at scroll position. */

import { seg, ease, css, attr, text, toggle, lerp, clamp, once } from '../engine.js?v=3';
import { fingerPath } from '../phone.js?v=3';
import { statusBar, tabBar, icon, h } from '../ui-kit.js?v=3';
import { score as scoreData, bandFor, metrics } from './data.js?v=3';

/* ---------------------------------------------------------------- dial geometry (SkinScoreDial) */
const DIAM = 248, R = DIAM / 2;
const RULER_INSET = 24, RULER_W = 5, VALUE_INSET = 37, VALUE_W = 16;
const RULER_R = R - RULER_INSET - RULER_W / 2;
const VALUE_R = R - VALUE_INSET - VALUE_W / 2;
const TICK_R = R - (RULER_INSET - 12);
const START_DEG = 135, SWEEP_DEG = 270, GAP = .008;
const BANDS = [
  { key: 'needsCare', from: 0, to: .4 },
  { key: 'fair', from: .4, to: .6 },
  { key: 'good', from: .6, to: .8 },
  { key: 'great', from: .8, to: 1 },
];
const pt = (cx, cy, r, deg) => { const a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
const arcD = (cx, cy, r, d0, d1) => {
  if (d1 <= d0) return '';
  const [x0, y0] = pt(cx, cy, r, d0), [x1, y1] = pt(cx, cy, r, d1);
  const large = (d1 - d0) > 180 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r.toFixed(2)} ${r.toFixed(2)} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};
const angleAt = f => START_DEG + SWEEP_DEG * clamp(f);
const bandIndex = b => ['needsCare', 'fair', 'good', 'great'].indexOf(b);
const bandKeyFor = score => { const t = bandFor(score); return t === 'Sehr gut' ? 'great' : t === 'Gut' ? 'good' : t === 'Mittel' ? 'fair' : 'needsCare'; };
const TICKS = [0, .4, .6, .8, 1];

/* ---------------------------------------------------------------- radar geometry (SkinScoreRadarChart) */
const RAD_SIZE = 280, RAD_C = RAD_SIZE / 2, RAD_R = RAD_SIZE * .32, RAD_LABEL_R = RAD_SIZE * .46;
const N = metrics.length;
const angleFor = i => (Math.PI * 2 / N) * i - Math.PI / 2;
const radarPoint = (i, val, progress) => {
  const a = angleFor(i), r = RAD_R * clamp(val) * progress;
  return [RAD_C + Math.cos(a) * r, RAD_C + Math.sin(a) * r];
};
const polyD = pts => `M${pts.map(p => p.join(' ')).join('L')}Z`;
const radarGrid = () => {
  let g = '';
  for (let level = 1; level <= 3; level++) {
    const pts = Array.from({ length: N }, (_, i) => radarPoint(i, level / 3, 1));
    g += `<path class="ss-radar-grid-ring${level === 3 ? ' edge' : ''}" d="${polyD(pts)}"></path>`;
  }
  for (let i = 0; i < N; i++) {
    const [x, y] = radarPoint(i, 1, 1);
    g += `<line class="ss-radar-spoke" x1="${RAD_C}" y1="${RAD_C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"></line>`;
  }
  return g;
};
const radarLabels = () => metrics.map((m, i) => {
  const a = angleFor(i);
  const x = RAD_C + Math.cos(a) * RAD_LABEL_R, y = RAD_C + Math.sin(a) * RAD_LABEL_R;
  return `<text class="ss-radar-label" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${m.name}</text>`;
}).join('');

// visible band the phone content is judged against for "on screen": below
// the status bar / topmask, above the floating tab bar
const VIEW_TOP = 54, VIEW_BOTTOM = 852 - 88;

/* UI-point position of an element via the offsetLeft/offsetParent chain
   instead of phone.at()'s getBoundingClientRect math. Needed for finger
   targets read during the score push-in (main.js zooms the whole phone
   wrapper 1.45x via a transform on an ancestor of .ui): phone.at() divides
   by phone.scale alone, which tracks the iphone frame's own fit and knows
   nothing about that extra wrapper transform, so it returns the wrong point
   whenever the wrapper zoom isn't 1. offsetLeft/offsetTop are pure layout
   values and are never affected by an ancestor's CSS transform, so this is
   correct at any zoom level. Safe to cache once: these targets don't move. */
const uiPoint = (phone, el) => {
  let x = el.offsetLeft, y = el.offsetTop, n = el.offsetParent;
  while (n && n !== phone.ui) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return [x + el.offsetWidth / 2, y + el.offsetHeight / 2];
};

export default function scoreScene({ phone }) {
  let el, body, scrollMax = 0, tabRoutine;
  let segProfil, segVerlauf, segHl, segRects = {};
  let dialNum, dialBand, valueArc, knob, rulerArcs = [];
  let rows = [], radarFill, radarLine, radarGhost, radarDots = [];
  let radarTop = 0, radarH = 0;
  let tabRoutinePt = [0, 0], rowPts = [];

  return {
    init() {
      const rulerArcsHTML = BANDS.map((b, i) => {
        const d0 = angleAt(b.from + (i === 0 ? 0 : GAP));
        const d1 = angleAt(b.to - (i === BANDS.length - 1 ? 0 : GAP));
        return `<path class="ss-ruler-arc ${i < 2 ? 'ss-ruler-a' : 'ss-ruler-b'}" d="${arcD(R, R, RULER_R, d0, d1)}"></path>`;
      }).join('');
      const tickLabelsHTML = TICKS.map(f => {
        const [x, y] = pt(R, R, TICK_R, angleAt(f));
        return `<text class="ss-tick-label" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${Math.round(f * 100)}</text>`;
      }).join('');
      const trackD = arcD(R, R, VALUE_R, START_DEG, START_DEG + SWEEP_DEG);

      el = phone.addScreen(h(`<div class="scr ss-scr">
        ${statusBar('dark')}
        <div class="ss-topmask" aria-hidden="true"></div>
        <div class="scr-body">
          <div class="ss-title">Verlauf</div>
          <div class="ss-seg"><span class="ss-seg-i" data-seg="profil">Profil</span><span class="ss-seg-i" data-seg="verlauf">Verlauf</span><i class="ss-seg-hl"></i></div>

          <div class="ss-content">
          <section class="card ss-dial">
            <svg class="ss-dial-svg" viewBox="0 0 ${DIAM} ${DIAM}" width="228" height="228">
              <g class="ss-ruler">${rulerArcsHTML}</g>
              <path class="ss-track" d="${trackD}"></path>
              <path class="ss-value" d=""></path>
              <circle class="ss-knob" r="${(VALUE_W - 5) / 2}"></circle>
              <g class="ss-ticklabels">${tickLabelsHTML}</g>
            </svg>
            <div class="ss-center">
              <div class="ss-num"><b>0</b><small>/100</small></div>
              <div class="ss-band"></div>
            </div>
          </section>

          <section class="card ss-kz">
            <div class="ss-card-title">Kennzahlen</div>
            <div class="ss-card-sub">Veränderung seit deinem letzten Check-in.</div>
            <div class="ss-rows">
              ${metrics.map((m, i) => {
                const d = m.value - m.prev;
                return `<div class="ss-row" data-row="${i}">
                  <div class="ss-row-top">
                    <span class="ss-row-name">${m.name}</span>
                    ${d !== 0 ? `<span class="ss-row-delta${d < 0 ? ' down' : ''}">${d < 0 ? icon.arrowDown(9) : icon.arrowUp(9)}${Math.abs(d)}</span>` : '<span class="ss-row-delta empty"></span>'}
                    <span class="ss-row-val"><b>0</b><small>/10</small></span>
                  </div>
                  <div class="ss-ticks">${Array.from({ length: 10 }, (_, ti) => `<i class="ss-tick" data-i="${ti + 1}"></i>`).join('')}</div>
                </div>`;
              }).join('')}
            </div>
          </section>

          <section class="card ss-radar">
            <div class="ss-card-title">Radar</div>
            <div class="ss-card-sub">Bei jedem Wert gilt: höher ist besser.</div>
            <svg class="ss-radar-svg" viewBox="0 0 ${RAD_SIZE} ${RAD_SIZE}" width="100%" height="${RAD_SIZE}">
              <g class="ss-radar-grid">${radarGrid()}</g>
              <path class="ss-radar-ghost" d=""></path>
              <path class="ss-radar-fill" d=""></path>
              <path class="ss-radar-line" d=""></path>
              <g class="ss-radar-dots">${metrics.map(() => '<circle r="4"></circle>').join('')}</g>
              <g class="ss-radar-labels">${radarLabels()}</g>
            </svg>
          </section>

          <p class="ss-disclaimer">Nur zur persönlichen Verfolgung, keine medizinische Beurteilung.</p>
          </div>
        </div>
        ${tabBar('verlauf')}
      </div>`));

      body = el.querySelector('.scr-body');
      segProfil = el.querySelector('[data-seg="profil"]');
      segVerlauf = el.querySelector('[data-seg="verlauf"]');
      segHl = el.querySelector('.ss-seg-hl');
      segRects = { profil: { left: segProfil.offsetLeft, width: segProfil.offsetWidth }, verlauf: { left: segVerlauf.offsetLeft, width: segVerlauf.offsetWidth } };
      // segmented pill is two equal flex:1 columns: width never changes, set once
      css(segHl, 'width', `${segRects.profil.width}px`);
      tabRoutine = el.querySelector('[data-tab="routine"]');

      dialNum = el.querySelector('.ss-num b');
      dialBand = el.querySelector('.ss-band');
      valueArc = el.querySelector('.ss-value');
      knob = el.querySelector('.ss-knob');
      rulerArcs = [...el.querySelectorAll('.ss-ruler-arc')];

      rows = [...el.querySelectorAll('.ss-row')].map((row, i) => ({
        row,
        val: row.querySelector('.ss-row-val b'),
        ticks: [...row.querySelectorAll('.ss-tick')],
        target: metrics[i].value,
      }));

      radarFill = el.querySelector('.ss-radar-fill');
      radarLine = el.querySelector('.ss-radar-line');
      radarGhost = el.querySelector('.ss-radar-ghost');
      radarDots = [...el.querySelectorAll('.ss-radar-dots circle')];

      scrollMax = Math.max(0, body.scrollHeight - 852);

      // radar card's position within the scrollable body, in UI points: the
      // gap between its rect and the body's rect is invariant to the body's
      // own translateY, so this is safe to measure once, and dividing out
      // phone.scale keeps it in the same 393x852 space scrollMax already is.
      const radarSection = el.querySelector('.ss-radar');
      const bodyRect0 = body.getBoundingClientRect();
      const radarRect0 = radarSection.getBoundingClientRect();
      radarTop = (radarRect0.top - bodyRect0.top) / phone.scale;
      radarH = radarRect0.height / phone.scale;

      // cached UI-point targets for the finger during the push-in zoom (see uiPoint above)
      tabRoutinePt = uiPoint(phone, tabRoutine);
      rowPts = rows.map(({ row }) => uiPoint(phone, row));
    },

    update(t, ctx) {
      // Until the finger actually taps, this screen must stay fully
      // transparent so the Verlauf body underneath (not ours to touch) keeps
      // showing undisturbed: no separate, earlier "screen fade" that could
      // go opaque before there is anything to show. The tap at .02 is the
      // one moment both curves below start moving, and they move together,
      // so the new Profil body can never be less than 50% in while the old
      // one is still more than 50% out (they cross at the same instant).
      const shown = t <= 0 ? 0 : ease.out(clamp(seg(t, .02, .07)));
      css(el, 'opacity', shown.toFixed(3));

      // segmented control slides from Verlauf to Profil on the press itself,
      // timed inside the fade above so the slide is actually seen happening
      // rather than resolved while still near invisible
      const su = ease.inOut(clamp(seg(t, .02, .05)));
      const rf = segRects.verlauf, rt = segRects.profil;
      css(segHl, 'transform', `translateX(${lerp(rf.left, rt.left, su).toFixed(1)}px)`);
      toggle(segProfil, 'on', su >= .5);
      toggle(segVerlauf, 'on', su < .5);

      // dial: sweep + count, on the clock once reached (900ms, the same
      // duration the real SkinScoreDial.replay() uses), replaying the real
      // band/colour thresholds as it climbs rather than only at the final value
      const dialK = once('ss-dial', t > .08, 900);
      const dialP = ease.outQuint(dialK);
      const displayed = Math.round(scoreData.after * dialP);
      text(dialNum, displayed);
      const bandKey = bandKeyFor(Math.max(1, displayed));
      const bandTitle = bandFor(Math.max(1, displayed)).toUpperCase();
      text(dialBand, displayed > 0 ? bandTitle : '');
      const fraction = (scoreData.after / 100) * dialP;
      attr(valueArc, 'd', arcD(R, R, VALUE_R, START_DEG, angleAt(fraction)));
      const [kx, ky] = pt(R, R, VALUE_R, angleAt(fraction));
      attr(knob, 'cx', kx.toFixed(2));
      attr(knob, 'cy', ky.toFixed(2));
      css(knob, 'opacity', displayed > 0 ? '1' : '0');
      const bi = bandIndex(bandKey);
      rulerArcs.forEach((arc, i) => css(arc, 'opacity', (i === bi ? .85 : .35).toFixed(2)));
      css(valueArc, 'stroke', `var(--ss-${bandKey})`);
      css(knob, 'stroke', `var(--ss-${bandKey})`);
      css(dialBand, 'color', `var(--ss-${bandKey}-ink)`);
      css(dialBand, 'background', displayed > 0 ? `var(--ss-${bandKey}-fill)` : 'transparent');

      // Kennzahlen rows: one clock-driven beat, staggered per row from the
      // same progress (700ms) rather than five separate scroll windows
      const kzK = once('ss-kz', t > .22, 700);
      rows.forEach(({ val, ticks, target }, i) => {
        const p = ease.outQuint(clamp((kzK - i * .15) / (1 - i * .15)));
        text(val, Math.round(target * p));
        const filled = target * p;
        ticks.forEach((tick, ti) => {
          const amt = clamp(filled - ti);
          css(tick, '--f', amt.toFixed(3));
        });
      });

      // scroll down to reveal the radar, finger drags (spatial, stays scroll driven)
      const scrollP = ease.inOut(clamp(seg(t, .74, .90)));
      css(body, 'transform', `translateY(${(-scrollMax * scrollP).toFixed(1)}px)`);

      // literally "is the radar card at least half on screen", from the same
      // scroll math driving the body's transform above, not a fixed t guess
      const cardTop = radarTop - scrollMax * scrollP;
      const cardVisible = Math.max(0, Math.min(cardTop + radarH, VIEW_BOTTOM) - Math.max(cardTop, VIEW_TOP));
      const radarOnScreen = radarH > 0 && cardVisible / radarH >= .5;

      // radar grows in on the clock once it is actually visible, not a t guess
      const radarK = once('ss-radar', radarOnScreen, 700);
      const radarP = ease.outBack(radarK);
      const values = metrics.map(m => m.value / 10);
      const ghostValues = metrics.map(m => m.prev / 10);
      const pts = values.map((v, i) => radarPoint(i, v, radarP));
      attr(radarFill, 'd', polyD(pts));
      attr(radarLine, 'd', polyD(pts));
      attr(radarGhost, 'd', polyD(ghostValues.map((v, i) => radarPoint(i, v, radarP))));
      radarDots.forEach((c, i) => { attr(c, 'cx', pts[i][0].toFixed(1)); attr(c, 'cy', pts[i][1].toFixed(1)); });
      css(radarFill, 'opacity', clamp(radarK * 1.3).toFixed(3));

      if (ctx.active === this) {
        phone.finger(fingerPath(phone, t, [
          // already waiting just below "Profil", not flying in from off
          // screen (Verlauf's own exit isn't ours to touch)
          { t: 0, at: () => { const [x, y] = phone.at(segProfil); return [x, y + 34]; }, show: 0 },
          { t: .008, at: segProfil, show: 1 },
          { t: .02, at: segProfil, show: 1, tap: true },
          { t: .10, at: segProfil, show: 1 },
          // drifts down over the Kennzahlen rows while they fill (continuous
          // motion instead of parking, so nothing sits idle mid scene). Uses
          // the cached rowPts, not a live phone.at(row) read, because this
          // whole stretch plays during the score push-in zoom (see uiPoint).
          { t: .16, at: [rowPts[0][0] + 60, rowPts[0][1]], show: 1 },
          { t: .40, at: [rowPts[3][0] + 60, rowPts[3][1]], show: 1 },
          { t: .60, at: [196, 640], show: 1 },
          { t: .74, at: [196, 640], show: 1, press: .8 },
          { t: .90, at: [196, 300], show: 1, press: .8 },
          { t: .93, at: [196, 300], show: 0 },
          // taps "Routine" in the tab bar at the very end, so the next
          // scene's tab switch reads as caused by this gesture (cached
          // tabRoutinePt, not a live read: still inside the zoom's release)
          { t: .965, at: tabRoutinePt, show: 1 },
          { t: .985, at: tabRoutinePt, show: 1, tap: true },
          { t: 1, at: tabRoutinePt, show: 0 },
        ]));
      }
    },
  };
}
