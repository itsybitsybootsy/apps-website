/* Scene: check-in results (CheckInVisualResultsView). The sheet pushes in
   over the analysis screen, the score counts up inside a stylized hero
   (the photo from the scan), the profile bars grow, then a drag scrolls the
   sheet to reveal the close-up cards and the per-zone grid before the
   finger taps "Check-in abschließen".

   No screenshots: everything is live HTML; the only image is the scan's
   front frame, cropped like the app crops the check-in photo. */

import { seg, ease, css, text, attr, once, resetOnce, lerp } from '../engine.js?v=4';
import { fingerPath } from '../phone.js?v=4';
import { statusBar, h } from '../ui-kit.js?v=4';
import { score, metrics, zones, closeUps, sparkline } from './data.js?v=4';

/* ---------------------------------------------------------------- local icons (not in ui-kit) */
const expandIcon = (w = 15) =>
  `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 15 3 21M3 21v-5M3 21h5"/><path d="M15 9l6-6M21 3v5M21 3h-5"/></svg>`;
const checkGlyph = (w = 12) =>
  `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7"/></svg>`;
const checkCircle = (w = 20) =>
  `<svg viewBox="0 0 24 24" width="${w}" height="${w}"><circle cx="12" cy="12" r="11" fill="#fff"/><path d="M7 12.4l3.3 3.3L17.3 8" fill="none" stroke="var(--sage)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const trendIcon = (w = 18) =>
  `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 19.5h17"/><path d="M5 15.5l4.5-4.5 3.5 3 6-6.5"/><path d="M15.5 7.5H19V11"/></svg>`;

/* ---------------------------------------------------------------- the check-in photo
   Like the app, the hero and the close ups show the photo from the scan: the
   front frame of the rendered head (Lee Perry-Smith scan, CC BY 3.0). */
const PHOTO = new URL('../../face/front.webp', import.meta.url).href;
const CROPS = {
  hero: 'background-size: 150%; background-position: 50% 44%;',
  kinn: 'background-size: 330%; background-position: 48% 86%;',
  wangeL: 'background-size: 330%; background-position: 22% 60%;',
};
const photo = (cls, crop) => `<span class="rs-photo ${cls}" style="background-image: url('${PHOTO}'); ${CROPS[crop]}" aria-hidden="true"></span>`;

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

export default function results({ phone }) {
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
              ${photo('rs-photo-hero', 'hero')}
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
                  ${photo('rs-photo-close', i === 0 ? 'kinn' : 'wangeL')}
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
      css(el, 'opacity', ease.out(seg(t, 0, .05)).toFixed(3));
      const enter = ease.out(seg(t, 0, .08));
      css(el, 'transform', `translateY(${((1 - enter) * 46).toFixed(1)}px)`);
      if (hidden) {
        resetOnce('rs-');
        return;
      }

      // The whole scene now plays inside ~63svh of scroll, far too little to
      // let every readout animate at scroll speed: a fast flick would snap
      // numbers instead of counting them, a slow one would leave the sheet
      // looking stuck. Spatial motion (the sheet sliding in, the body being
      // dragged up, the finger) still follows scroll directly; content
      // beats (counts, bars, badges, the tap) fire once their moment on the
      // scrollbar is reached and then play out on their own clock via
      // once(), so they always read at the same, comfortable pace.
      const countK = once('rs-count', t >= .03, 900);
      const count = ease.outQuint(countK);
      text(num, Math.round(score.after * count));

      const pillK = once('rs-pill', t >= .05, 550);
      css(pill, 'opacity', Math.min(1, pillK * 1.6).toFixed(3));
      css(pill, 'transform', `scale(${lerp(.7, 1, ease.outBack(pillK)).toFixed(3)})`);
      css(expandBtn, 'opacity', once('rs-expand', t >= .07, 400).toFixed(3));

      const sideK = once('rs-side', t >= .08, 450);
      css(sideLabel, 'opacity', sideK.toFixed(3));
      css(sideLabel, 'transform', `translateY(${(6 * (1 - ease.out(sideK))).toFixed(1)}px)`);

      // delta row + sparkline
      const infoK = ease.out(once('rs-delta', t >= .09, 550));
      css(infoRow, 'opacity', infoK.toFixed(3));
      css(infoRow, 'transform', `translateY(${(10 * (1 - infoK)).toFixed(1)}px)`);
      attr(spark, 'stroke-dashoffset', (sparkLen * (1 - ease.inOut(once('rs-spark', t >= .11, 700)))).toFixed(1));

      // profile card, staggered in right behind the hero instead of after it
      const profK = ease.out(once('rs-profile', t >= .13, 500));
      css(profileCard, 'opacity', profK.toFixed(3));
      css(profileCard, 'transform', `translateY(${(14 * (1 - profK)).toFixed(1)}px)`);

      const barsK = once('rs-bars', t >= .17, 950);
      metrics.forEach((m, i) => {
        const a = i * .12, b = a + .45;
        const k = ease.outQuint(seg(barsK, a, b));
        text(barNums[i], Math.round(m.value * k));
        css(barFills[i], '--v', (m.value / 10 * k).toFixed(3));
        const pk = seg(barsK, b, b + .15);
        css(barPrevs[i], 'opacity', pk.toFixed(3));
        css(barPrevs[i], 'transform', `translateY(${(-68 * (m.prev / 10) * pk).toFixed(1)}px)`);
      });
      css(legend, 'opacity', once('rs-legend', t >= .34, 450).toFixed(3));

      // drag the sheet up to reveal close-ups and the zone grid: this one
      // stays tied to scroll itself, it's the reader's own drag gesture
      const scrollP = ease.inOut(seg(t, .40, .78));
      css(body, 'transform', `translateY(${(-maxScroll * scrollP).toFixed(1)}px)`);
      css(navSep, 'opacity', Math.min(1, scrollP * 6).toFixed(3));

      const close0 = ease.out(once('rs-close0', t >= .46, 550));
      const close1 = ease.out(once('rs-close1', t >= .54, 550));
      [close0, close1].forEach((k, i) => {
        css(closeupCards[i], 'opacity', k.toFixed(3));
        css(closeupCards[i], 'transform', `translateY(${(16 * (1 - k)).toFixed(1)}px)`);
      });

      css(zonesCard, 'opacity', once('rs-zonescard', t >= .60, 450).toFixed(3));
      const zoneBarsK = once('rs-zonebars', t >= .65, 900);
      zones.forEach((z, i) => {
        const a = i * .15, b = a + .5;
        const k = ease.outQuint(seg(zoneBarsK, a, b));
        text(zoneNums[i], Math.round(z.value * k));
        css(zoneFills[i], '--v', (z.value / 100 * k).toFixed(3));
      });

      // finish: finger drags, taps at .85, well clear of t = 1 so the
      // saved state (button label swap + a checkmark pop) has room to
      // fully play out on its own clock and rest on a readable plateau,
      // instead of trailing off into a dead final stretch.
      const tapK = once('rs-tap', t >= .85, 650);
      const tapShape = Math.sin(tapK * Math.PI); // press then release, once() already returns 0..1
      const saved = tapK >= .55;
      css(btn, 'transform', `scale(${(1 - tapShape * .06).toFixed(3)})`);
      css(btn, 'filter', `brightness(${(1 + tapShape * .14).toFixed(3)})`);
      css(btnIcon, 'transform', `scale(${(1 + tapShape * .24).toFixed(3)})`);
      css(pill, 'transform', `scale(${(lerp(.7, 1, ease.outBack(pillK)) * (1 + tapShape * .05)).toFixed(3)})`);
      text(btnLabel, saved ? 'Check-in gespeichert' : 'Check-in abschließen');

      if (ctx.active === this) {
        phone.finger(fingerPath(phone, t, [
          { t: .38, at: [196, 760], show: 0 },
          { t: .44, at: [196, 760], show: 1 },
          { t: .55, at: [196, 300], show: 1 },
          { t: .68, at: [196, 300], show: 1 },
          { t: .73, at: [196, 700], show: 0 },
          { t: .78, at: btn, show: 0 },
          { t: .81, at: btn, show: 1 },
          { t: .85, at: btn, show: 1, tap: true },
          { t: .90, at: btn, show: 0 },
          { t: 1, at: btn, show: 0 },
        ]));
      }
    },
  };
}
