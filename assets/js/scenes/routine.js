/* Scene: the "Routine" tab (RoutineTabView / RoutineShelfVisual). The score
   scene ends with the finger tapping the Routine tab, so this screen switches
   in instantly (real iOS tab switches are a hard cut, not a crossfade) with
   the tab already highlighted. Scroll decides WHEN the finger reaches each
   product; the check pop, the progress bar/count and the AI audit card
   ("Routinekontrolle") play on the clock (engine once()) once reached, so
   they read the same at any scroll speed. */

import { seg, ease, css, text, toggle, lerp, once } from '../engine.js';
import { fingerPath } from '../phone.js';
import { statusBar, tabBar, icon, h } from '../ui-kit.js';
import { routine } from './data.js';

/* Small local icon, not in ui-kit: the "slider.horizontal.3" management glyph. */
const filterIcon = (w = 18) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
  <path d="M4 7h10.5M18.5 7H20M4 17h1M8.5 17H20"/>
  <circle cx="17" cy="7" r="2.4" fill="var(--bg)"/>
  <circle cx="6" cy="17" r="2.4" fill="var(--bg)"/>
</svg>`;

const stepIcon = { 'Reiniger': icon.bottle, 'Serum': icon.drop, 'Feuchtigkeitspflege': icon.jar, 'Sonnenschutz': icon.shield };

/* Scroll reaches a check at these local t's, in order (retimed for the
   shorter [.79, .895] range: ≈.07-.12 apart, never a bare stretch). */
const TAP = [.15, .34, .53, .72];

export default function routineScene({ phone }) {
  let el, segCount, progressText, progressCheck, barFill, checks, auditCard;
  const morgens = routine.morgens;

  return {
    init() {
      el = phone.addScreen(h(`<div class="scr rt-scr">
        ${statusBar('dark')}
        <div class="scr-body rt-body">
          <header class="rt-nav">
            <span class="rt-navbtn">${filterIcon(17)}</span>
            <h1 class="rt-title">Routine</h1>
            <span class="rt-navbtn">${icon.plus(18)}</span>
          </header>
          <div class="rt-seg">
            <span class="rt-seg-btn on">${icon.sun(14)}<span>Morgens</span><b class="rt-seg-count">0/${morgens.length}</b></span>
            <span class="rt-seg-btn">${icon.moon(14)}<span>Abends</span><b class="rt-seg-count">0/${routine.abends.length}</b></span>
          </div>
          <div class="rt-progress">
            <span class="rt-progress-text">0 von ${morgens.length} erledigt</span>
            <span class="rt-done-check">${icon.check(12)}</span>
          </div>
          <div class="bar rt-bar"><i></i></div>
          <div class="rt-list">
            ${morgens.map((p, i) => `<div class="rt-card">
              <span class="rt-card-ic">${(stepIcon[p.step] || icon.bottle)(22)}</span>
              <div class="rt-card-txt">
                <span class="rt-card-step">${String(i + 1).padStart(2, '0')} · ${p.step}</span>
                <span class="rt-card-name">${p.name}</span>
              </div>
              ${icon.chevronDown(13)}
              <span class="check off rt-check">${icon.check(12)}</span>
            </div>`).join('')}
          </div>
          <section class="card rt-audit">
            <div class="rt-audit-head">${icon.shield(16)}<b>Routinekontrolle</b></div>
            <p>Die KI hat diese Routine geprüft. Keine Wirkstoffkonflikte gefunden.</p>
          </section>
        </div>
        ${tabBar('routine')}
      </div>`));

      segCount = el.querySelector('.rt-seg-btn.on .rt-seg-count');
      progressText = el.querySelector('.rt-progress-text');
      progressCheck = el.querySelector('.rt-done-check');
      barFill = el.querySelector('.rt-bar i');
      checks = [...el.querySelectorAll('.rt-check')];
      auditCard = el.querySelector('.rt-audit');
    },

    update(t, ctx) {
      // the previous scene already animated tapping into this tab; the
      // switch itself is an instant cut, like real iOS tab bars
      css(el, 'opacity', t > 0 ? '1' : '0');

      const done = TAP.filter(tc => t >= tc).length;
      const total = TAP.length;
      text(segCount, `${done}/${total}`);
      text(progressText, `${done} von ${total} erledigt`);

      // each check pops and adds its share of the bar on its own clock, not
      // tied to further scrolling, so a fast scroll never skips the pop
      let frac = 0;
      checks.forEach((c, i) => {
        const on = t >= TAP[i];
        toggle(c, 'off', !on);
        const k = once(`rt-check-${i}`, on, 380);
        frac += k / total;
        const sc = ease.outBack(k);
        css(c, 'transform', `scale(${(on ? lerp(.55, 1, sc) : 1).toFixed(3)})`);
      });
      css(barFill, '--v', frac.toFixed(3));

      const ae = ease.outQuint(once('rt-audit', done === total, 480));
      css(progressCheck, 'opacity', ae.toFixed(3));
      css(auditCard, 'opacity', ae.toFixed(3));
      css(auditCard, 'transform', `translateY(${lerp(16, 0, ae).toFixed(1)}px) scale(${lerp(.97, 1, ae).toFixed(3)})`);

      if (ctx.active === this) {
        phone.finger(fingerPath(phone, t, [
          { t: 0, at: [200, 940], show: 0 },
          { t: .08, at: checks[0], show: 1 },
          { t: TAP[0], at: checks[0], show: 1, tap: true },
          { t: .27, at: checks[1], show: 1 },
          { t: TAP[1], at: checks[1], show: 1, tap: true },
          { t: .46, at: checks[2], show: 1 },
          { t: TAP[2], at: checks[2], show: 1, tap: true },
          { t: .65, at: checks[3], show: 1 },
          { t: TAP[3], at: checks[3], show: 1, tap: true },
          { t: .82, at: checks[3], show: 0 },
          { t: 1, at: checks[3], show: 0 },
        ]));
      }
    },
  };
}
