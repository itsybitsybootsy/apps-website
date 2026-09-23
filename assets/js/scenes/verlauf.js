/* Scene: the "Verlauf" segment of the Progress tab (ProgressTrendChart +
   ProgressMetricTrendChart). Hidden at t = 0; the finger taps the Verlauf
   tab (fixed position, same spot in every screen) and this screen fades in
   over Results. The line and its typical-range band morph between 7 T /
   14 T / 30 T as the finger taps the range pill, three times in a row,
   entirely as a pure function of t: every range's data is resampled once at
   module load onto the same fixed grid, so any two ranges can be linearly
   blended frame by frame with nothing to remember between frames. The
   initial dots' pop-in is the one discrete (clock driven, once()) beat here;
   everything else is spatial and follows scroll directly. */

import { seg, ease, css, attr, text, lerp, clamp, once } from '../engine.js';
import { fingerPath } from '../phone.js';
import { statusBar, tabBar, h } from '../ui-kit.js';
import { blemishes, metrics } from './data.js';

/* ---------------------------------------------------------------- data prep (pure, once) */
const RANGES = [7, 14, 30];
const M = 36; // fixed sample count every range is resampled onto, so ranges can be lerped
const Y_MAX = 11.5; // fixed axis ceiling (blemish counts top out at 10 + headroom)
const CHART_W = 306, CHART_H = 150;

const resample = (vals, m) => {
  const n = vals.length;
  return Array.from({ length: m }, (_, i) => {
    const x = (i / (m - 1)) * (n - 1);
    const i0 = Math.floor(x), i1 = Math.min(n - 1, i0 + 1), f = x - i0;
    return vals[i0] * (1 - f) + vals[i1] * f;
  });
};
const bandOf = vals => vals.map((_, i, arr) => {
  const win = arr.slice(Math.max(0, i - 2), Math.min(arr.length, i + 3));
  return [Math.max(0, Math.min(...win) - 1.4), Math.max(...win) + 1.6];
});

const rangeData = {};
RANGES.forEach(days => {
  const values = blemishes.slice(-days);
  const band = bandOf(values);
  rangeData[days] = {
    values,
    dots: values.map((v, i) => [(i / (values.length - 1)) * CHART_W, CHART_H - clamp(v / Y_MAX) * CHART_H]),
    line: resample(values, M),
    low: resample(band.map(b => b[0]), M),
    high: resample(band.map(b => b[1]), M),
  };
});

const X = i => (i / (M - 1)) * CHART_W;
const Y = v => CHART_H - clamp(v / Y_MAX) * CHART_H;

/* Catmull-Rom to cubic Bezier, tension 1/6: gives the chart its soft, hand
   drawn curve instead of a faceted polyline. */
const smoothPath = pts => {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};
const areaPath = (top, bottom) => {
  const t = smoothPath(top);
  const b = smoothPath([...bottom].reverse()).replace(/^M/, 'L');
  return `${t} ${b} Z`;
};

const MONTHS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'];
const ANCHOR = Date.UTC(2026, 8, 21); // a Monday late in the month, like the reference shot
const DAY = 86400000;
const fmtDate = ms => { const d = new Date(ms); return `${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]}`; };
const axisLabels = days => [fmtDate(ANCHOR - Math.round(days / 2) * DAY), fmtDate(ANCHOR)];

/* Four taps' worth of range switching, entirely as a function of t: which two
   ranges are blending, and how far between them. */
const phaseOf = t => {
  if (t < .20) return { from: 14, to: 14, u: 0 };
  if (t < .33) return { from: 14, to: 7, u: ease.inOut(seg(t, .20, .33)) };
  if (t < .45) return { from: 7, to: 7, u: 0 };
  if (t < .58) return { from: 7, to: 14, u: ease.inOut(seg(t, .45, .58)) };
  if (t < .70) return { from: 14, to: 14, u: 0 };
  if (t < .85) return { from: 14, to: 30, u: ease.inOut(seg(t, .70, .85)) };
  return { from: 30, to: 30, u: 0 };
};

/* ---------------------------------------------------------------- Kennzahl-Trends lane data */
const LANE_W = 230, LANE_H = 26;
const laneSeries = (value, idx) => {
  const n = 12;
  return Array.from({ length: n }, (_, i) => {
    if (i === n - 1) return value;
    const wig = Math.sin(idx * 1.7 + i * .9) * .55 * (1 - i / (n - 1) * .3);
    return Math.max(0, Math.min(10, value + wig));
  });
};
const laneD = series => smoothPath(series.map((v, i) => [(i / (series.length - 1)) * LANE_W, LANE_H - (v / 10) * LANE_H]));

export default function verlauf({ phone }) {
  let el, body, chartClip, bandPath, linePath, dotGroups = {};
  let hl, rangeEls = {}, rangeRects = {};
  let axisA, axisB, tabVerlauf;
  let laneEls = [];

  return {
    init() {
      el = phone.addScreen(h(`<div class="scr vl-scr">
        ${statusBar('dark')}
        <div class="scr-body">
          <div class="vl-title">Verlauf</div>
          <div class="vl-seg"><span class="vl-seg-i">Profil</span><span class="vl-seg-i on">Verlauf</span><i class="vl-seg-hl on-verlauf"></i></div>
          <div class="vl-range">
            ${RANGES.map(d => `<span class="vl-range-i" data-range="${d}">${d} T</span>`).join('')}
            <i class="vl-range-hl"></i>
          </div>
          <section class="card vl-trend">
            <div class="vl-card-title">Trend</div>
            <div class="vl-card-sub">Der schattierte Bereich zeigt deine typische Spanne, nicht die tägliche Veränderung</div>
            <div class="vl-chart-wrap">
              <span class="vl-ylabel" style="top:0">10</span>
              <span class="vl-ylabel" style="top:${(1 - 5 / Y_MAX) * CHART_H}px">5</span>
              <span class="vl-ylabel" style="top:${CHART_H}px">0</span>
              <svg class="vl-svg" viewBox="0 0 ${CHART_W} ${CHART_H}" width="100%" height="${CHART_H}" preserveAspectRatio="none">
                <g class="vl-clip">
                  <path class="vl-band"></path>
                  <path class="vl-line"></path>
                  ${RANGES.map(d => `<g class="vl-dots" data-dots="${d}">${rangeData[d].dots.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6"></circle>`).join('')}</g>`).join('')}
                </g>
              </svg>
            </div>
            <div class="vl-xaxis"><span data-axis="a"></span><span data-axis="b"></span></div>
          </section>
          <section class="card vl-metrics">
            <div class="vl-card-title">Trend</div>
            <div class="vl-card-sub">Jede Zeile ist eine Kennzahl aus deinen Check-ins</div>
            ${metrics.map((m, i) => `<div class="vl-lane vl-lane-c${i}">
              <span class="vl-lane-name">${m.name}</span>
              <svg class="vl-lane-chart" viewBox="0 0 ${LANE_W} ${LANE_H}" width="${LANE_W}" height="${LANE_H}" preserveAspectRatio="none">
                <g class="vl-lane-clip"><path d="${laneD(laneSeries(m.value, i))}"></path></g>
              </svg>
              <span class="vl-lane-val">${m.value}</span>
            </div>`).join('')}
          </section>
        </div>
        ${tabBar('verlauf')}
      </div>`));

      body = el.querySelector('.scr-body');
      chartClip = el.querySelector('.vl-clip');
      bandPath = el.querySelector('.vl-band');
      linePath = el.querySelector('.vl-line');
      RANGES.forEach(d => { dotGroups[d] = [...el.querySelectorAll(`[data-dots="${d}"] circle`)]; });
      hl = el.querySelector('.vl-range-hl');
      el.querySelectorAll('.vl-range-i').forEach(x => { rangeEls[x.dataset.range] = x; });
      RANGES.forEach(d => {
        const r = rangeEls[d];
        rangeRects[d] = { left: r.offsetLeft, width: r.offsetWidth };
      });
      // all three pills are equal-width flex:1 siblings, so the sliding
      // highlight's width never actually changes: set it once, animate only
      // translateX per frame (no per-frame layout-affecting width writes)
      css(hl, 'width', `${rangeRects[7].width}px`);
      axisA = el.querySelector('[data-axis="a"]');
      axisB = el.querySelector('[data-axis="b"]');
      tabVerlauf = el.querySelector('[data-tab="verlauf"]');
      laneEls = [...el.querySelectorAll('.vl-lane')].map(row => ({
        row, clip: row.querySelector('.vl-lane-clip'),
      }));
    },

    update(t, ctx) {
      // hidden until its turn, then a quick fade over the results screen
      css(el, 'opacity', ease.out(seg(t, 0, .04)).toFixed(3));
      css(el, 'visibility', t > 0 ? 'visible' : 'hidden');
      const { from, to, u } = phaseOf(t);
      const A = rangeData[from], B = rangeData[to];

      const linePts = [], topPts = [], botPts = [];
      for (let i = 0; i < M; i++) {
        const x = X(i);
        linePts.push([x, Y(lerp(A.line[i], B.line[i], u))]);
        topPts.push([x, Y(lerp(A.high[i], B.high[i], u))]);
        botPts.push([x, Y(lerp(A.low[i], B.low[i], u))]);
      }
      attr(linePath, 'd', smoothPath(linePts));
      attr(bandPath, 'd', areaPath(topPts, botPts));

      // draws itself: a clip that opens left-to-right, once the tab tap has
      // landed and the screen is actually on screen (see the finger path)
      const reveal = ease.outQuint(seg(t, .05, .16));
      css(chartClip, 'clipPath', `inset(0 ${((1 - reveal) * 100).toFixed(2)}% 0 0)`);
      css(bandPath, 'opacity', (clamp(seg(t, .07, .18)) * .18).toFixed(3));

      // the first dots are a one-shot pop, on the clock so they read the
      // same snap regardless of scroll speed; later range switches just
      // crossfade the dot groups (still scroll driven, no re-pop)
      RANGES.forEach(d => {
        const w = (d === from ? 1 - u : 0) + (d === to ? u : 0);
        dotGroups[d].forEach((c, i) => {
          css(c, 'opacity', w.toFixed(3));
          if (d === 14) {
            const k = once(`vl-dot${i}`, t > .06 + i * .015, 300);
            css(c, 'transform', `scale(${lerp(.3, 1, ease.outBack(k)).toFixed(3)})`);
          } else {
            css(c, 'transform', 'scale(1)');
          }
        });
      });

      // sliding range pill, continuous between the two blended ranges (width
      // is fixed, set once in init; only the transform moves per frame)
      const rf = rangeRects[from], rt = rangeRects[to];
      css(hl, 'transform', `translateX(${lerp(rf.left, rt.left, u).toFixed(1)}px)`);
      RANGES.forEach(d => {
        const active = (u < .5 ? from : to) === d;
        css(rangeEls[d], 'color', active ? '#fff' : '');
      });

      const cur = u < .5 ? from : to;
      const [a, b] = axisLabels(cur);
      text(axisA, a);
      text(axisB, b);

      laneEls.forEach(({ row, clip }, i) => {
        const rt0 = .10 + i * .022, rt1 = rt0 + .12;
        const p = clamp(seg(t, rt0, rt1));
        css(row, 'opacity', ease.out(p).toFixed(3));
        css(row, 'transform', `translateY(${(1 - ease.out(p)) * 8}px)`);
        css(clip, 'clipPath', `inset(0 ${((1 - ease.outQuint(p)) * 100).toFixed(2)}% 0 0)`);
      });

      if (ctx.active === this) {
        phone.finger(fingerPath(phone, t, [
          // the tap that causes this screen: the finger lands on the
          // Verlauf tab (fixed position, same spot the tab bar always
          // occupies) just as the screen fades in over Results
          { t: 0, at: tabVerlauf, show: 0 },
          { t: .015, at: tabVerlauf, show: 1 },
          { t: .03, at: tabVerlauf, show: 1, tap: true },
          { t: .08, at: tabVerlauf, show: 0 },
          { t: .12, at: [350, 960], show: 0 },
          { t: .17, at: rangeEls[7], show: 1 },
          { t: .20, at: rangeEls[7], show: 1, tap: true },
          { t: .31, at: rangeEls[7], show: 1 },
          { t: .42, at: rangeEls[14], show: 1 },
          { t: .45, at: rangeEls[14], show: 1, tap: true },
          { t: .56, at: rangeEls[14], show: 1 },
          { t: .67, at: rangeEls[30], show: 1 },
          { t: .70, at: rangeEls[30], show: 1, tap: true },
          { t: .85, at: rangeEls[30], show: 1 },
          { t: .96, at: [350, 960], show: 0 },
        ]));
      }
    },
  };
}
