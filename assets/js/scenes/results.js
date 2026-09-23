/* Scene: check-in results (CheckInVisualResultsView). The sheet pushes in
   over the analysis screen, the score counts up inside a stylized hero
   (never a real photo), the profile bars grow, then a drag scrolls the
   sheet to reveal the close-up cards and the per-zone grid before the
   finger taps "Check-in abschließen".

   No screenshots: the hero and the close-up crops reuse the app's own
   face-points point cloud (assets/models/face-points.svg), tinted and
   cropped, never a picture of a person. */

import { seg, ease, css, text, attr, pulse, lerp } from '../engine.js';
import { fingerPath } from '../phone.js';
import { statusBar, h } from '../ui-kit.js';
import { score, metrics, zones, closeUps, sparkline } from './data.js';

/* ---------------------------------------------------------------- local icons (not in ui-kit) */
const expandIcon = (w = 15) =>
  `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 15 3 21M3 21v-5M3 21h5"/><path d="M15 9l6-6M21 3v5M21 3h-5"/></svg>`;
const checkGlyph = (w = 12) =>
  `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7"/></svg>`;
const checkCircle = (w = 20) =>
  `<svg viewBox="0 0 24 24" width="${w}" height="${w}"><circle cx="12" cy="12" r="11" fill="#fff"/><path d="M7 12.4l3.3 3.3L17.3 8" fill="none" stroke="var(--sage)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const trendIcon = (w = 18) =>
  `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 19.5h17"/><path d="M5 15.5l4.5-4.5 3.5 3 6-6.5"/><path d="M15.5 7.5H19V11"/></svg>`;

/* ---------------------------------------------------------------- face point cloud (shared, loaded once) */
const MESH_ID = 'rs-facepoints-path';
const MESH_VB = '-8.04 -8.56 16.09 18.27';
let meshPromise = null;
function loadMesh(root) {
  if (!meshPromise) {
    meshPromise = fetch(new URL('../../models/face-points.svg', import.meta.url))
      .then(r => r.text())
      .then(txt => new DOMParser().parseFromString(txt, 'image/svg+xml').querySelector('path'))
      .catch(() => null);
  }
  meshPromise.then(path => {
    if (!path || document.getElementById(MESH_ID)) return;
    const host = h('<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs></defs></svg>');
    const clone = path.cloneNode(false);
    clone.id = MESH_ID;
    host.querySelector('defs').appendChild(clone);
    root.appendChild(host);
  });
}
const mesh = (cls, vb = MESH_VB) =>
  `<svg class="rs-mesh ${cls}" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><use href="#${MESH_ID}"/></svg>`;

/* fixed 0..100 scale sparkline, same rule as the app: small changes must look small */
const sparkPath = () => {
  const w = 48, hgt = 26;
  return sparkline.map((v, i) => `${i ? 'L' : 'M'}${(w * i / (sparkline.length - 1)).toFixed(1)} ${(hgt * (1 - v / 100)).toFixed(1)}`).join(' ');
};

const delta = score.after - score.before;
const deltaSign = delta > 0 ? '+' : '';
const deltaNum = `${deltaSign}${delta}`;
/* "Check-in" must not break at its own hyphen mid word: the phrase sits in
   its own nowrap span, the rest of the line still wraps normally. */
const deltaHtml = `${deltaNum} Punkte seit dem letzten <span class="rs-nowrap">Check-in</span>`;

export default function results({ phone, rail }) {
  let el, body, num, sideLabel, pill, expandBtn, infoRow, spark, sparkLen;
  let barNums, barFills, barPrevs, legend;
  let closeupCards;
  let zoneNums, zoneFills;
  let btn, btnIcon, btnLabel;
  let profileCard, zonesCard, navSep;
  let maxScroll = 0;

  return {
    init(ctx) {
      el = phone.addScreen(h(`<div class="scr rs-scr">
        <div class="rs-topmask"></div>
        ${statusBar('dark')}
        <div class="rs-navbar"><span>Analyseergebnisse</span><i class="rs-navbar-sep"></i></div>
        <div class="scr-body rs-body">
          <section class="card rs-hero">
            <div class="rs-hero-photo">
              ${mesh('rs-mesh-hero')}
              <div class="rs-hero-grad"></div>
              <span class="rs-pill">${checkGlyph(11)} Check-in gespeichert</span>
              <span class="rs-expand">${expandIcon(16)}</span>
              <div class="rs-score">
                <span class="rs-score-cap">DEINE HAUT HEUTE</span>
                <div class="rs-score-row">
                  <span class="rs-score-num"><b>0</b><small>/ 100</small></span>
                  <span class="rs-score-side">
                    <b>HAUTSCORE</b>
                    <span>Heutige Momentaufnahme</span>
                  </span>
                </div>
              </div>
            </div>
            <div class="rs-hero-info">
              <span class="rs-hero-ic">${trendIcon(18)}</span>
              <div class="rs-hero-text">
                <b>${deltaHtml}</b>
                <span>Ein Scan ist eine Momentaufnahme, kein Trend.</span>
              </div>
              <svg class="rs-spark" viewBox="-2 -2 52 30" width="48" height="26"><path d="${sparkPath()}"/></svg>
            </div>
          </section>

          <section class="card rs-profile">
            <div class="rs-row"><span class="t-title rs-h">Hautprofil</span><span class="t-cap">VON 10</span></div>
            <div class="rs-bars">
              ${metrics.map(m => `<div class="rs-bar-col">
                <b class="rs-bar-num t-num">0</b>
                <div class="rs-bar-track">
                  <i class="rs-bar-fill"></i>
                  ${[1, 2, 3, 4].map(tk => `<span class="rs-bar-tick" style="bottom:${(72 * tk / 5).toFixed(1)}px"></span>`).join('')}
                  <i class="rs-bar-prev"></i>
                </div>
                <span class="rs-bar-label">${m.name}</span>
              </div>`).join('')}
            </div>
            <div class="rs-legend">
              <span class="rs-legend-prev"><i></i>Vorheriger Scan</span>
              <span class="rs-legend-note">Höher = besser · Rötung = weniger rot</span>
            </div>
          </section>

          <section class="rs-closeups">
            <div class="rs-row"><span class="t-title rs-h">Genauer hinsehen</span><span class="t-cap">IM BLICK BEHALTEN</span></div>
            <div class="rs-closeup-row">
              ${closeUps.map((cUp, i) => `<div class="card rs-closeup">
                <div class="rs-closeup-photo">
                  ${mesh('rs-mesh-close', i === 0 ? '-3.2 3.4 6.4 6' : '1.4 -1.2 6.6 7')}
                  <span class="rs-closeup-expand">${expandIcon(13)}</span>
                </div>
                <div class="rs-closeup-body">
                  <div class="rs-row"><b>${cUp.name}</b><span class="rs-active">${cUp.active} aktiv</span></div>
                  <p>${cUp.note}</p>
                </div>
              </div>`).join('')}
            </div>
          </section>

          <section class="card rs-zones">
            <div class="rs-row"><span class="t-title rs-h">Nach Gesichtsbereich</span><span class="t-cap">/ 100</span></div>
            <div class="rs-zone-grid">
              ${zones.map(z => `<div class="rs-zone-tile">
                <div class="rs-row"><span>${z.name}</span><b class="t-num">0</b></div>
                <div class="bar"><i></i></div>
                <span class="rs-zone-prev">Zuvor ${z.prev}</span>
              </div>`).join('')}
            </div>
          </section>
        </div>
        <div class="rs-cta">
          <button class="btn-app rs-btn" type="button">${checkCircle(20)}<span class="rs-btn-label">Check-in abschließen</span></button>
        </div>
      </div>`));

      loadMesh(el);

      body = el.querySelector('.rs-body');
      num = el.querySelector('.rs-score-num b');
      sideLabel = el.querySelector('.rs-score-side');
      pill = el.querySelector('.rs-pill');
      expandBtn = el.querySelector('.rs-expand');
      infoRow = el.querySelector('.rs-hero-info');
      spark = el.querySelector('.rs-spark path');
      sparkLen = spark.getTotalLength();
      spark.style.strokeDasharray = sparkLen;
      legend = el.querySelector('.rs-legend');

      barNums = [...el.querySelectorAll('.rs-bar-num')];
      barFills = [...el.querySelectorAll('.rs-bar-fill')];
      barPrevs = [...el.querySelectorAll('.rs-bar-prev')];

      closeupCards = [...el.querySelectorAll('.rs-closeup')];

      zoneNums = [...el.querySelectorAll('.rs-zone-tile b')];
      zoneFills = [...el.querySelectorAll('.rs-zone-tile .bar i')];

      btn = el.querySelector('.rs-btn');
      btnIcon = btn.querySelector('svg');
      btnLabel = btn.querySelector('.rs-btn-label');
      profileCard = el.querySelector('.rs-profile');
      zonesCard = el.querySelector('.rs-zones');
      navSep = el.querySelector('.rs-navbar-sep');

      // content is laid out in fixed iOS points, so its scrollable height
      // never changes with the viewport: measure once.
      maxScroll = Math.max(0, body.scrollHeight - 852);
    },

    update(t, ctx) {
      const hidden = t <= 0;
      css(el, 'opacity', ease.out(seg(t, 0, .04)).toFixed(3));
      const enter = ease.out(seg(t, 0, .06));
      css(el, 'transform', `translateY(${((1 - enter) * 46).toFixed(1)}px)`);
      if (hidden) {
        return;
      }

      // hero: pill, expand button, score count. Front loaded so the sheet
      // is never mostly empty while it's still arriving (t .70-.76 on the
      // page): the count starts immediately and the profile card follows
      // right behind the hero instead of waiting for it to finish.
      const successK = pulse(t, .93, .985);
      const pillK = ease.outBack(seg(t, .02, .10));
      css(pill, 'opacity', seg(t, .02, .08).toFixed(3));
      css(pill, 'transform', `scale(${(lerp(.7, 1, pillK) * (1 + successK * .06)).toFixed(3)})`);
      css(expandBtn, 'opacity', seg(t, .04, .10).toFixed(3));

      const count = ease.outQuint(seg(t, .02, .26));
      text(num, Math.round(score.after * count));
      css(sideLabel, 'opacity', seg(t, .06, .14).toFixed(3));
      css(sideLabel, 'transform', `translateY(${(6 * (1 - seg(t, .06, .16))).toFixed(1)}px)`);

      // delta row + sparkline
      const infoK = seg(t, .08, .16);
      css(infoRow, 'opacity', infoK.toFixed(3));
      css(infoRow, 'transform', `translateY(${(10 * (1 - ease.out(infoK))).toFixed(1)}px)`);
      attr(spark, 'stroke-dashoffset', (sparkLen * (1 - ease.inOut(seg(t, .10, .26)))).toFixed(1));

      // profile card, staggered in right behind the hero instead of after it
      const profK = seg(t, .07, .14);
      css(profileCard, 'opacity', profK.toFixed(3));
      css(profileCard, 'transform', `translateY(${(14 * (1 - ease.out(profK))).toFixed(1)}px)`);

      metrics.forEach((m, i) => {
        const a = .10 + i * .022, b = a + .10;
        const k = ease.outQuint(seg(t, a, b));
        text(barNums[i], Math.round(m.value * k));
        css(barFills[i], '--v', (m.value / 10 * k).toFixed(3));
        const pk = seg(t, b, b + .05);
        css(barPrevs[i], 'opacity', pk.toFixed(3));
        css(barPrevs[i], 'transform', `translateY(${(-68 * (m.prev / 10) * pk).toFixed(1)}px)`);
      });
      css(legend, 'opacity', seg(t, .30, .36).toFixed(3));

      // drag the sheet up to reveal close-ups and the zone grid
      const scrollP = ease.inOut(seg(t, .44, .78));
      css(body, 'transform', `translateY(${(-maxScroll * scrollP).toFixed(1)}px)`);
      css(navSep, 'opacity', Math.min(1, scrollP * 6).toFixed(3));

      const closeK = seg(scrollP, .12, .55);
      closeupCards.forEach((card, i) => {
        const k = seg(closeK, i * .12, i * .12 + .6);
        css(card, 'opacity', k.toFixed(3));
        css(card, 'transform', `translateY(${(16 * (1 - ease.out(k))).toFixed(1)}px)`);
      });

      const zoneK = seg(scrollP, .55, .95);
      css(zonesCard, 'opacity', seg(zoneK, 0, .3).toFixed(3));
      zones.forEach((z, i) => {
        const a = i * .12, b = a + .5;
        const k = ease.outQuint(seg(zoneK, a, b));
        text(zoneNums[i], Math.round(z.value * k));
        css(zoneFills[i], '--v', (z.value / 100 * k).toFixed(3));
      });

      // finish: finger drags, taps at .93. The tap has a real payoff instead
      // of trailing off into dead scroll: the button settles into a saved
      // state (its own label swaps to the app's real "Check-in gespeichert"
      // string, matching the pill above) and the rail hands off to the
      // final score so it's never empty on the way to t = 1.
      const pressK = pulse(t, .885, .93);
      const saved = t >= .945;
      css(btn, 'transform', `scale(${(1 - pressK * .06).toFixed(3)})`);
      css(btn, 'filter', `brightness(${(1 + successK * .12).toFixed(3)})`);
      css(btnIcon, 'transform', `scale(${(1 + successK * .22).toFixed(3)})`);
      text(btnLabel, saved ? 'Check-in gespeichert' : 'Check-in abschließen');

      if (ctx.active === this) {
        phone.finger(fingerPath(phone, t, [
          { t: .40, at: [196, 760], show: 0 },
          { t: .47, at: [196, 760], show: 1 },
          { t: .60, at: [196, 300], show: 1 },
          { t: .74, at: [196, 300], show: 1 },
          { t: .79, at: [196, 700], show: 0 },
          { t: .84, at: btn, show: 0 },
          { t: .885, at: btn, show: 1 },
          { t: .93, at: btn, show: 1, tap: true },
          { t: .97, at: btn, show: 0 },
          { t: 1, at: btn, show: 0 },
        ]));

        // shared stat rail beside the phone: live score while it counts,
        // then the delta, then the saved score again as the final payoff
        // of the tap, held all the way to t = 1 so the rail is never empty.
        const k1 = seg(t, 0, .05) * (1 - seg(t, .26, .34));
        const k2 = seg(t, .36, .42) * (1 - seg(t, .60, .68));
        const k3 = ease.out(seg(t, .90, 1));
        if (k3 > 0) rail.set({ num: String(score.after), unit: '/100', label: 'Gespeichert, bis morgen', k: k3 });
        else if (k1 >= k2) rail.set({ num: Math.round(score.after * count), unit: '/100', label: 'Hautscore heute', k: k1 });
        else rail.set({ num: deltaNum, label: 'seit dem letzten Scan', k: k2 });
      }
    },
  };
}
