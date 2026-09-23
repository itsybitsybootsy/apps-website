/* Scene: the "Heute" tab (TodayTabView). The score counts up, the sparkline
   draws itself, the week fills in, then the finger comes in and taps the scan
   button in the middle of the tab bar. */

import { seg, ease, css, text, pulse, lerp } from '../engine.js';
import { fingerPath } from '../phone.js';
import { statusBar, tabBar, icon, h } from '../ui-kit.js';
import { user, score, sparkline, routine, weekdays } from './data.js';

export default function today({ phone, rail }) {
  let el, num, spark, sparkLen, fill, days, scanBtn;

  const sparkPath = () => {
    const w = 96, hgt = 30, min = Math.min(...sparkline) - 1, max = Math.max(...sparkline) + 1;
    // the last point is today after the scan, so this screen shows the six before it
    const pts = sparkline.slice(0, -1);
    return pts.map((v, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1) * w).toFixed(1)} ${(hgt - (v - min) / (max - min) * hgt).toFixed(1)}`).join(' ');
  };

  return {
    init() {
      el = phone.addScreen(h(`<div class="scr scr-today">
        ${statusBar('dark')}
        <div class="scr-body">
          <header class="td-head">
            <div><div class="t-title">${user.greeting}</div><div class="t-sub">${user.subtitle}</div></div>
            <span class="td-avatar">${icon.sun(20)}</span>
          </header>
          <section class="card td-score">
            <div class="td-row"><span class="t-cap">Hautscore</span><span class="pill up">${icon.arrowUp(11)} 2</span></div>
            <div class="td-row td-mid">
              <span class="td-num t-num"><b>0</b><small>/100</small></span>
              <svg class="td-spark" viewBox="-2 -2 100 34" width="100" height="34"><path d="${sparkPath()}"/></svg>
            </div>
            <div class="bar"><i></i></div>
            <span class="t-small">Gestern</span>
          </section>
          <div class="row2">
            <section class="card td-slot"><span class="check">${icon.check()}</span><div><b>Morgens</b><span>Fertig</span></div></section>
            <section class="card td-slot"><span class="check off">${icon.check()}</span><div><b>Abends</b><span>Offen</span></div></section>
          </div>
          <section class="card td-week">
            <span class="t-cap">Serie</span>
            <div class="td-days">${weekdays.map((d, i) => `<span class="td-day"><span class="check${i > 4 ? ' off' : ''}">${icon.check()}</span><small>${d}</small></span>`).join('')}</div>
          </section>
          <section class="card td-next">
            <span class="t-cap">Nächste Routine</span>
            ${routine.abends.slice(0, 2).map((p, i) => `<div class="td-prod"><span class="td-prod-ic">${i ? icon.drop(18) : icon.bottle(18)}</span><div><small>0${i + 1} · ${p.step}</small><b>${p.name}</b></div></div>`).join('')}
          </section>
        </div>
        ${tabBar('heute')}
      </div>`));

      num = el.querySelector('.td-num b');
      spark = el.querySelector('.td-spark path');
      sparkLen = spark.getTotalLength();
      spark.style.strokeDasharray = sparkLen;
      fill = el.querySelector('.td-score .bar i');
      days = [...el.querySelectorAll('.td-day .check:not(.off)')];
      scanBtn = el.querySelector('[data-scan-btn]');
    },

    update(t, ctx) {
      // the panel lands with a plausible score already showing, then it settles
      const count = ease.outQuint(seg(t, 0, .4));
      text(num, Math.round(lerp(60, score.before, count)));
      css(fill, '--v', (score.before / 100 * count).toFixed(3));
      css(spark, 'strokeDashoffset', (sparkLen * (1 - ease.inOut(seg(t, .05, .45)))).toFixed(1));
      days.forEach((d, i) => {
        const k = ease.outBack(seg(t, .1 + i * .05, .2 + i * .05));
        css(d, 'transform', `scale(${lerp(.4, 1, k).toFixed(3)})`);
        css(d, 'opacity', seg(t, .1 + i * .05, .16 + i * .05).toFixed(3));
      });

      // the button gives under the finger
      css(scanBtn, 'transform', `scale(${(1 - pulse(t, .78, .9) * .1).toFixed(3)})`);

      if (ctx.active === this) {
        rail.set({ num: Math.round(lerp(60, score.before, count)), unit: '/100', label: 'Dein letzter Hautscore', k: seg(t, .05, .2) * (1 - seg(t, .7, .85)) });
        phone.finger(fingerPath(phone, t, [
          { t: .32, at: [330, 900], show: 0 },
          { t: .5, at: [310, 700], show: 1 },
          { t: .8, at: scanBtn, show: 1 },
          { t: .84, at: scanBtn, show: 1, tap: true },
          { t: 1, at: scanBtn, show: 0 },
        ]));
      }
    },
  };
}
