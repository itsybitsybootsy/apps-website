/* Scene: the "Serie" sheet (StreakProfileView) and the full screen milestone
   celebration (StreakMilestoneCelebrationView). The sheet slides up while the
   qualifying-scan count and the twelve week "Konsequenz" mosaic fill in
   together (one cell flagged as a grace day), the milestone ladder lights up
   row by row, then the screen scrolls to reveal it before the milestone
   moment takes over full screen: a restrained, static acknowledgement (no
   confetti, matching StreakMilestoneCelebrationView's Fitness.app style
   rebuild) where the medal crest settles in, the finger taps "Weiter", and
   the celebration dismisses back to the settled Serie sheet. */

import { seg, ease, css, text, toggle, pulse, lerp, clamp } from '../engine.js';
import { fingerPath } from '../phone.js';
import { statusBar, icon, h } from '../ui-kit.js';
import { streak } from './data.js';

/* Small deterministic PRNG so the mosaic history is the same on every load
   and scrubs cleanly (no Math.random in a pure update). */
const seeded = seed => { let s = seed >>> 0; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; };

const TIERS = [
  { name: 'Erster Funke', threshold: 0, icon: icon.sparkles },
  { name: 'Erste Woche', threshold: 7, icon: icon.check },
  { name: 'Zwei Wochen', threshold: 14, icon: icon.shield },
  { name: 'Vollständiger Zyklus', threshold: 28, icon: icon.medal },
];
const NEXT_TIER_GOAL = `${56 - streak.days} Tage bis Stetiger Rhythmus`;

const MOSAIC_COLS = 12, MOSAIC_ROWS = 7, MOSAIC_TOTAL = MOSAIC_COLS * MOSAIC_ROWS;

function buildMosaic() {
  const rand = seeded(424242);
  const tail = streak.days;
  const days = [];
  for (let i = 0; i < MOSAIC_TOTAL - tail; i++) days.push(rand() > .34);
  for (let i = 0; i < tail; i++) days.push(true);
  return { days, graceIndex: MOSAIC_TOTAL - 6 };
}

const SHEET_ENTER = [0, .08];
/* count and mosaic share a window so the number and the grid always read as
   the same progress, never "28" over an empty grid */
const COUNT = [.03, .30];
const MOSAIC = [.03, .30];
const CELL_DUR = .05;
const TIER = [.26, .32];
const RUNLINE = [.30, .36];
const MILE_LABEL = [.36, .40];
const MILE_START = .38, MILE_STEP = .025, MILE_DUR = .07;
const SCROLL = [.54, .68];
const CELEB = [.84, .88];
const MEDAL = [.85, .89];
const CTEXT = [.87, .905];
const BTN = [.875, .90];
const TAP_T = .93;
const DISMISS = [.935, .985];

export default function streakScene({ phone, rail }) {
  let sheetEl, celebEl, sheetPanel, sheetBody, headNum, tierCrest, runLine;
  let cells, mosaicCount, gracePill, consLabel, mileLabel, mileRows, weiterBtn, medalEl, celebTexts;
  const { days: mosaicDays, graceIndex } = buildMosaic();
  const cellStart = i => MOSAIC[0] + (i / MOSAIC_TOTAL) * (MOSAIC[1] - MOSAIC[0]);

  return {
    init() {
      sheetEl = phone.addScreen(h(`<div class="scr st-sheet-scr">
        ${statusBar('dark')}
        <div class="st-sheet">
          <div class="st-grabber"></div>
          <div class="st-sheet-nav">
            <span class="st-close">Schließen</span>
            <span class="st-sheet-title">Serie</span>
            <span class="st-sheet-spacer"></span>
          </div>
          <div class="st-sheet-body">
            <section class="card st-head-card">
              <div class="st-head-num"><b>0</b><span>scannt</span></div>
              <div class="st-head-tier">
                <span class="st-tier-crest">${icon.medal(20)}</span>
                <div><b>${streak.milestone}</b><span>${NEXT_TIER_GOAL}</span></div>
              </div>
              <p class="st-head-run">Heute ist Tag ${streak.days} deiner aktuellen Serie.</p>
            </section>

            <span class="st-label st-cons-label">Konsequenz</span>
            <div class="st-mosaic-card">
              <div class="st-mosaic">${Array.from({ length: MOSAIC_TOTAL }, () => '<i class="st-cell"></i>').join('')}</div>
              <p class="st-mosaic-note">Eine Spalte pro Woche, die älteste links.</p>
              <p class="st-mosaic-note st-mosaic-count">0 dieser ${MOSAIC_TOTAL} Tage sind gefüllt.</p>
              <span class="st-grace-pill">${icon.shield(13)}Gnadentag im Einsatz</span>
            </div>

            <span class="st-label st-mile-label">Erreichte Meilensteine</span>
            <div class="st-mile-card">
              ${TIERS.map(t => `<div class="st-mile-row">
                <span class="st-crest">${t.icon(17)}</span>
                <b>${t.name}</b>
                <span class="st-mile-reached">${icon.check(11)}Erreicht</span>
              </div>`).join('')}
            </div>
          </div>
        </div>
      </div>`));

      celebEl = phone.addScreen(h(`<div class="scr st-celeb-scr">
        ${statusBar('dark')}
        <div class="st-celeb-body">
          <span class="st-medal">${icon.medal(40)}</span>
          <h2 class="st-celeb-title">${streak.milestone}</h2>
          <p class="st-celeb-text">${streak.milestoneText}</p>
          <span class="st-celeb-count">${streak.days} scannt</span>
        </div>
        <button class="st-celeb-btn" type="button">Weiter</button>
      </div>`));

      sheetPanel = sheetEl.querySelector('.st-sheet');
      sheetBody = sheetEl.querySelector('.st-sheet-body');
      headNum = sheetEl.querySelector('.st-head-num b');
      tierCrest = sheetEl.querySelector('.st-tier-crest');
      runLine = sheetEl.querySelector('.st-head-run');
      cells = [...sheetEl.querySelectorAll('.st-cell')];
      mosaicCount = sheetEl.querySelector('.st-mosaic-count');
      gracePill = sheetEl.querySelector('.st-grace-pill');
      consLabel = sheetEl.querySelector('.st-cons-label');
      mileLabel = sheetEl.querySelector('.st-mile-label');
      mileRows = [...sheetEl.querySelectorAll('.st-mile-row')].map(row => ({
        row, crest: row.querySelector('.st-crest'), badge: row.querySelector('.st-mile-reached'),
      }));
      weiterBtn = celebEl.querySelector('.st-celeb-btn');
      medalEl = celebEl.querySelector('.st-medal');
      celebTexts = [...celebEl.querySelectorAll('.st-celeb-title, .st-celeb-text, .st-celeb-count')];
    },

    update(t, ctx) {
      // sheet: slides up over a dimmed backdrop
      const enter = ease.inOut(seg(t, SHEET_ENTER[0], SHEET_ENTER[1]));
      css(sheetEl, 'opacity', seg(t, 0, .01).toFixed(3));
      css(sheetEl, '--scrim', enter.toFixed(3));
      css(sheetPanel, 'transform', `translateY(${lerp(798, 0, ease.outQuint(seg(t, SHEET_ENTER[0], SHEET_ENTER[1]))).toFixed(1)}px)`);

      const count = Math.round(streak.days * ease.outQuint(seg(t, COUNT[0], COUNT[1])));
      text(headNum, count);

      const tierE = ease.outQuint(seg(t, TIER[0], TIER[1]));
      css(tierCrest.parentElement, 'opacity', tierE.toFixed(3));
      css(tierCrest.parentElement, 'transform', `translateY(${lerp(10, 0, tierE).toFixed(1)}px)`);

      const runE = ease.outQuint(seg(t, RUNLINE[0], RUNLINE[1]));
      css(runLine, 'opacity', runE.toFixed(3));

      // mosaic: cells are always visible as empty cells, and fill in place
      // (oldest column first) in the same window as the count above, so the
      // number and the grid always read as one synced progress
      let revealed = 0;
      cells.forEach((cell, i) => {
        const start = cellStart(i);
        const on = t >= start;
        if (on) revealed++;
        toggle(cell, 'on', on && mosaicDays[i] && i !== graceIndex);
        toggle(cell, 'miss', on && !mosaicDays[i]);
        toggle(cell, 'grace', on && i === graceIndex);
        const k = ease.outBack(seg(t, start, start + CELL_DUR));
        css(cell, 'transform', `scale(${(on ? lerp(.82, 1, k) : 1).toFixed(3)})`);
      });
      let filled = 0;
      for (let i = 0; i < revealed; i++) if (mosaicDays[i]) filled++;
      text(mosaicCount, `${filled} dieser ${MOSAIC_TOTAL} Tage sind gefüllt.`);

      const graceE = ease.outQuint(seg(t, cellStart(graceIndex) + CELL_DUR, cellStart(graceIndex) + CELL_DUR + .08));
      css(gracePill, 'opacity', graceE.toFixed(3));
      css(gracePill, 'transform', `translateY(${lerp(6, 0, graceE).toFixed(1)}px)`);

      const clE = ease.outQuint(seg(t, MOSAIC[0], MOSAIC[0] + .04));
      css(consLabel, 'opacity', clE.toFixed(3));
      const mlE = ease.outQuint(seg(t, MILE_LABEL[0], MILE_LABEL[1]));
      css(mileLabel, 'opacity', mlE.toFixed(3));

      // milestone rows are always visible (name readable, crest neutral),
      // never a blank card; each crest lights up and gets its "Erreicht"
      // badge in turn, like a checklist filling in rather than appearing
      mileRows.forEach(({ crest, badge }, i) => {
        const a = MILE_START + i * MILE_STEP;
        const on = t >= a;
        toggle(crest, 'on', on);
        const k = ease.outBack(seg(t, a, a + MILE_DUR));
        css(crest, 'transform', `scale(${(on ? lerp(.8, 1, k) : 1).toFixed(3)})`);
        css(badge, 'opacity', (on ? ease.outQuint(seg(t, a, a + MILE_DUR)) : 0).toFixed(3));
      });

      const scrollE = ease.inOut(seg(t, SCROLL[0], SCROLL[1]));
      css(sheetBody, 'transform', `translateY(${(-190 * scrollE).toFixed(1)}px)`);

      // milestone celebration, full screen, over the sheet: a restrained,
      // static acknowledgement that rises in, holds, then dismisses back to
      // the (already settled) Serie sheet once "Weiter" is tapped
      const celebIn = ease.outQuint(seg(t, CELEB[0], CELEB[1]));
      const celebOut = ease.inOut(seg(t, DISMISS[0], DISMISS[1]));
      const celebK = celebIn * (1 - celebOut);
      css(celebEl, 'opacity', celebK.toFixed(3));
      css(celebEl, 'transform', `translateY(${(lerp(50, 0, celebIn) + lerp(0, 40, celebOut)).toFixed(1)}px) scale(${(lerp(.97, 1, celebIn) - .05 * celebOut).toFixed(3)})`);

      const medalE = ease.outBack(seg(t, MEDAL[0], MEDAL[1]));
      css(medalEl, 'transform', `scale(${lerp(.6, 1, clamp(medalE, 0, 1.15)).toFixed(3)})`);
      css(medalEl, 'opacity', ease.out(seg(t, MEDAL[0], MEDAL[0] + .04)).toFixed(3));

      const textE = ease.outQuint(seg(t, CTEXT[0], CTEXT[1]));
      celebTexts.forEach((elx, i) => {
        css(elx, 'opacity', ease.outQuint(seg(t, CTEXT[0] + i * .008, CTEXT[1] + i * .008)).toFixed(3));
        css(elx, 'transform', `translateY(${lerp(10, 0, textE).toFixed(1)}px)`);
      });

      const btnE = ease.outQuint(seg(t, BTN[0], BTN[1]));
      css(weiterBtn, 'opacity', btnE.toFixed(3));
      css(weiterBtn, 'transform', `translateY(${lerp(10, 0, btnE).toFixed(1)}px) scale(${(1 - pulse(t, TAP_T - .012, TAP_T + .1) * .05).toFixed(3)})`);

      if (ctx.active === this) {
        // stays populated through the dismiss and to the very end
        rail.set({ num: count, label: 'Tage in Folge', k: seg(t, .04, .12) });

        phone.finger(fingerPath(phone, t, [
          { t: 0, at: [200, 940], show: 0 },
          { t: BTN[0] - .005, at: weiterBtn, show: 0 },
          { t: BTN[1], at: weiterBtn, show: 1 },
          { t: TAP_T, at: weiterBtn, show: 1, tap: true, tapWidth: .02 },
          { t: DISMISS[0] + .02, at: weiterBtn, show: 0 },
          { t: 1, at: weiterBtn, show: 0 },
        ]));
      }
    },
  };
}
