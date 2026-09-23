/* Scene: the face scan (FaceScanView) and the wait for the result
   (CheckInAnalyzingOverlay).

   Inside the phone everything follows the app's layout code: the oval guide is
   72% of the screen width and 46% of its height, centred at 45% height, with the
   area outside dimmed to 55% black. The ring around it brightens as the face
   lines up and turns green with a soft glow when it locks. The shutter fires by
   itself: white flash at 45%, the step badge counts on, a chevron on the rim
   shows which way to turn. After the third photo a sage disc with a checkmark
   pops in the middle of the oval. The camera preview is our point cloud face
   (face3d.js), standing in for the live picture.

   The analysis overlay is the app's: its illustration (portrait card under a
   magnifying glass), a spinner and one stage line at a time, no percentage.
   The app deliberately does not show your face while it waits, so the face
   and its zones appear outside the phone instead, in the callouts layer: a
   larger point cloud with a scan line, glowing zones and labels on hairlines.
   Inside the phone five zone chips under the status line light up in step
   with that scan line and get a check each, so the phone stays alive too.

   Local timeline (t in [0, 1], stage range [.22, .70]; captions switch at
   t .229, .406 and .667):
     0     to .05   camera slides up as a full screen cover, "Kamera startet…"
     .07   to .175  the face comes into the oval, ring brightens, lock
     .195           photo 1 (flash), badge 2/3
     .235  to .345  chevron left, turn left to about 30°, lock
     .365           photo 2, badge 3/3
     .37   to .52   back through the middle and on to the right, lock .54
     .56            photo 3, checkmark at .575
     .63   to .645  analysis overlay replaces the camera
     .645  to .95   one stage line after another, zone chips light up,
                    "Analyse fertig!" at .95
     .635  to .96   callouts: face assembles, scan line sweeps, zones and labels */

import { seg, ease, css, attr, text, pulse, lerp, clamp } from '../engine.js';
import { UI_W, UI_H } from '../phone.js';
import { statusBar, icon, h } from '../ui-kit.js';
import { analysisSteps } from './data.js';

/* ---------------------------------------------------------------- app geometry (FaceScanView, FaceGuideLayout) */
const GUIDE_W = Math.min(UI_W * .72, 320);                  // 283
const GUIDE_H = Math.min(UI_H * .46, 420);                  // 392
const STROKE = 3;
const CUT_W = Math.max(GUIDE_W - STROKE * 2, GUIDE_W * .92); // 277
const CUT_H = Math.max(GUIDE_H - STROKE * 2, GUIDE_H * .92); // 386
const CX = UI_W / 2;
const CY = UI_H * .45;
const PILL_Y = CY + CUT_H / 2 + 68;
const HINT_Y = CY + CUT_H / 2 + 118;
const CUE_REACH = CUT_W / 2 - 36;                           // RimDirectionCue inset

/* face3d fit: the mesh (hairline to chin) fills the oval, like a face held at arm's length */
const FACE_FIT = (CUT_H * .98) / (UI_W * 17.7 / 15.5);
const FACE_Y = (CY - UI_H / 2) / (UI_H / 2);

/* ---------------------------------------------------------------- timeline */
const T = {
  cover: [0, .05],
  loading: [.03, .055],
  preview: [.055, .085],
  assemble: [.06, .13],
  approach: [.07, .17],
  hint: [.12, .14],
  capture: [.195, .365, .56],
  lock: [.175, .345, .54],
  cueL: [.235, .335], turnL: [.245, .335],
  center: [.37, .405],                   // after photo 2 the head comes back to the middle
  cueR: [.38, .525], turnR: [.405, .52],
  done: [.575, .6],
  overlay: [.63, .645],
  steps: [.645, .95],
  coIn: [.635, .72],
  sweep: [.67, .905],
  coOut: [.955, 1],
};
const TURN = .86;                        // face3d yaw unit is 35°, so .86 is about 30°
const FLASH = .02;                       // flash length in t (0.06 s hold + 0.3 s fade in the app)

/* zones of the face in callout order, with the model height of each landmark
   (face3d scan line runs from y 9.8 at scan 0 to y -10.4 at scan 1) */
const ZONES = [
  { key: 'stirn', name: 'Stirn', y: 6.5, side: 1 },
  { key: 'wangeL', name: 'Linke Wange', y: -1.5, side: -1 },
  { key: 'nase', name: 'Nase', y: -.5, side: 1 },
  { key: 'wangeR', name: 'Rechte Wange', y: -1.5, side: 1 },
  { key: 'kinn', name: 'Kinn', y: -7.9, side: -1 },
];
const scanY = s => 9.8 - 20.2 * s;
const zoneLit = (z, s) => clamp((z.y + .8 - scanY(s)) / 1.6);

/* ---------------------------------------------------------------- local drawing helpers */
const chevron = dir => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="${dir < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}"/></svg>`;

/* The alignment ring as an SVG path (FaceScanAlignmentRing draws a full ellipse). */
const ellipsePath = (w, hgt) => `M${CX} ${CY - hgt / 2}a${w / 2} ${hgt / 2} 0 1 1 0 ${hgt}a${w / 2} ${hgt / 2} 0 1 1 0 ${-hgt}`;

/* SwiftUI UnevenRoundedRectangle, centred on 0 0 */
function unevenRect(w, hgt, tl, bl, br, tr) {
  const x = -w / 2, y = -hgt / 2;
  return `M${x + tl} ${y}H${x + w - tr}Q${x + w} ${y} ${x + w} ${y + tr}V${y + hgt - br}Q${x + w} ${y + hgt} ${x + w - br} ${y + hgt}H${x + bl}Q${x} ${y + hgt} ${x} ${y + hgt - bl}V${y + tl}Q${x} ${y} ${x + tl} ${y}Z`;
}

/* OnboardingStoryArtwork(kind: .analysis): a portrait card under a magnifying glass.
   Palette from OnboardingArtPalette (light appearance). Scene space is 300 × 190. */
function analysisArtwork() {
  const ink = '#334A40', sage = '#B0C4A6', cream = '#FAF2DE', clay = '#CC7559', peach = '#F0B88F';
  // WelcomePortrait, drawn in its own 145 × 168 space
  const portrait = `
    <path fill="${ink}" d="M29 121C18 71 24 46 37 39C63 10 106 21 116 47C130 70 113 96 119 128Z"/>
    <path fill="${clay}" d="M4 168C6 139 27 132 55 125L94 125C125 129 139 145 143 168Z"/>
    <rect x="59" y="101" width="30" height="37" rx="13" fill="${peach}"/>
    <ellipse cx="73.5" cy="87" rx="37.5" ry="34" fill="${peach}"/>
    <path fill="${ink}" d="M34 76C46 77 68 61 78 42C86 65 101 74 113 74L111 43L36 36Z"/>
    <path fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M50 82Q56 86 61 82M87 82Q92 86 98 82M76 83L73 94L78 94M65 105Q74 112 83 105"/>`;
  return `<svg class="sc-art" viewBox="0 0 300 190" width="316" height="200">
    <path d="${unevenRect(238, 160, 86, 65, 74, 62)}" fill="${sage}" fill-opacity=".3" transform="translate(150 100) rotate(-8)"/>
    <g transform="translate(126 91) rotate(-8) translate(-53 -66.5)">
      <rect width="106" height="133" rx="19" fill="${cream}"/>
      <rect x=".5" y=".5" width="105" height="132" rx="18.5" fill="none" stroke="${ink}" stroke-opacity=".13"/>
      <clipPath id="sc-pc"><rect x="10" y="10" width="86" height="102" rx="12"/></clipPath>
      <g clip-path="url(#sc-pc)">
        <rect x="10" y="10" width="86" height="102" fill="${sage}" fill-opacity=".36"/>
        <g transform="translate(10 10) scale(${86 / 145} ${102 / 168})">${portrait}</g>
      </g>
      <rect x="33" y="120" width="40" height="3" rx="1.5" fill="${ink}" fill-opacity=".25"/>
    </g>
    <g class="sc-glass"><g transform="translate(-6 -6)">
      <circle cx="-8" cy="-8" r="25" fill="none" stroke="${ink}" stroke-width="6.5"/>
      <path d="M10.5 10.5L30 30" stroke="${ink}" stroke-width="9.5" stroke-linecap="round"/>
    </g></g>
  </svg>`;
}

/* UIActivityIndicatorView, large: eight spokes, the bright one steps round */
const spinner = () => `<svg class="sc-spin" viewBox="-19 -19 38 38" width="37" height="37">${
  Array.from({ length: 8 }, (_, i) => `<rect x="-2" y="-17" width="4" height="10" rx="2" transform="rotate(${i * 45})"/>`).join('')
}</svg>`;

export default function scan({ phone, callouts, rail }) {
  let cam, ana, faceCanvas, face = null, co, coCanvas, coFace = null, coSvg, chipEls;
  let createFace = null;
  const $ = {};
  const labels = [];
  const wideQuery = window.matchMedia('(min-width: 1101px)');
  let wide = wideQuery.matches;
  let box = null;                        // callout geometry in callout layer coordinates
  let scene = null;

  /* Layout offsets ignore the panel's intro transform, which is what we want here. */
  const frameRect = () => {
    const f = phone.frame;
    let x = f.offsetLeft, y = f.offsetTop, n = f.offsetParent;
    while (n && n !== callouts.offsetParent) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { left: x, top: y, width: f.offsetWidth, height: f.offsetHeight };
  };

  const layoutCallouts = () => {
    wide = wideQuery.matches;
    const f = frameRect();
    css(co, 'display', wide ? 'block' : 'none');
    if (!wide) return;
    const W = callouts.clientWidth;
    const right = f.left + f.width;
    const room = W - right;
    const left = right + Math.max(28, room * .1);
    const width = Math.max(200, W - left - Math.max(24, room * .1));
    box = { left, top: f.top, width, height: f.height, W, minX: right + 24, labelW: labels.map(L => L.el.offsetWidth) };
    Object.assign(coCanvas.style, { left: `${left}px`, top: `${box.top}px`, width: `${width}px`, height: `${box.height}px` });
    attr(coSvg, 'viewBox', `0 0 ${W} ${callouts.clientHeight}`);
    ensureCalloutFace();
  };

  /* The big callout face only exists where it can be shown. */
  function ensureCalloutFace() {
    if (coFace || !wide || !createFace) return;
    coFace = createFace(coCanvas, { theme: 'light', fit: .6, initial: { assemble: 0 } });
    coFace.onFrame(() => drawCallouts(scene.lastT ?? 0));
  }

  /* Zone labels and hairlines, anchored to the projected landmarks every frame. */
  function drawCallouts(t) {
    if (!coFace || !box) return;
    const b = coFace.project('bounds');
    if (!b) return;
    const tIn = seg(t, ...T.coIn);
    const out = 1 - seg(t, ...T.coOut);
    const s = seg(t, ...T.sweep);
    const rows = { '-1': [], 1: [] };
    ZONES.forEach((z, i) => {
      const p = coFace.project(z.key);
      const lit = zoneLit(z, s) * (t < T.sweep[0] ? 0 : 1);
      const k = ease.outQuint(seg(lit, 0, 1));
      rows[z.side].push({ i, z, x: box.left + p.x, y: box.top + p.y, k, facing: p.facing });
    });
    // labels sit in two columns beside the face, spread symmetrically so neighbours
    // (Nase and Rechte Wange sit at almost the same height) get their own lane
    const GAP = 46;
    for (const side of [-1, 1]) {
      const list = rows[side].sort((a, c) => a.y - c.y);
      list.forEach(r => { r.ly = r.y; });
      for (let pass = 0; pass < 6; pass++) {
        for (let k = 1; k < list.length; k++) {
          const d = GAP - (list[k].ly - list[k - 1].ly);
          if (d > 0) { list[k - 1].ly -= d / 2; list[k].ly += d / 2; }
        }
      }
      for (const r of list) {
        const L = labels[r.i];
        const lw = box.labelW[r.i];
        // the label's inner edge, kept clear of the phone and of the panel edge
        let edge = side < 0 ? box.left + b.left - 30 : box.left + b.right + 30;
        edge = side < 0 ? Math.max(edge, box.minX + lw) : Math.min(edge, box.W - 24 - lw);
        const a = r.k * out * tIn * clamp(r.facing * 3 + .4);
        const x = (side < 0 ? edge - lw : edge) + side * (1 - r.k) * 18;
        css(L.el, 'transform', `translate(${x.toFixed(1)}px, ${r.ly.toFixed(1)}px) translateY(-50%)`);
        css(L.el, 'opacity', a.toFixed(3));
        // hairline: leaves the landmark level, bends into the label's lane, drawn as it grows
        const ex = edge - side * 6;
        const mx = lerp(r.x, ex, .45);
        attr(L.line, 'd', `M${r.x.toFixed(1)} ${r.y.toFixed(1)}C${mx.toFixed(1)} ${r.y.toFixed(1)} ${mx.toFixed(1)} ${r.ly.toFixed(1)} ${ex.toFixed(1)} ${r.ly.toFixed(1)}`);
        css(L.line, 'strokeDashoffset', (1 - r.k).toFixed(3));
        css(L.line, 'opacity', a.toFixed(3));
        css(L.dot, 'transform', `translate(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px) scale(${r.k.toFixed(3)})`);
        css(L.dot, 'opacity', a.toFixed(3));
      }
    }
  }

  return scene = {
    init() {
      /* ---------------------------------------------------------- camera (FaceScanView) */
      cam = phone.addScreen(h(`<div class="scr sc-cam">
        <canvas class="sc-face"></canvas>
        <div class="sc-mask"></div>
        <i class="sc-ring-glow"></i>
        <svg class="sc-ring" viewBox="0 0 ${UI_W} ${UI_H}" width="${UI_W}" height="${UI_H}">
          <path class="sc-ring-track" d="${ellipsePath(CUT_W, CUT_H)}"/>
        </svg>
        <span class="sc-cue sc-cue-l">${chevron(-1)}</span>
        <span class="sc-cue sc-cue-r">${chevron(1)}</span>
        <p class="sc-pill">Zentriere dein Gesicht im Oval</p>
        <p class="sc-hint">Halt dein Handy auf Augenhöhe bei gleichmäßigem Licht.</p>
        <div class="sc-loading">${spinner()}<span>Kamera startet…</span></div>
        <div class="sc-flash"></div>
        <span class="sc-done">${icon.check(36)}</span>
        <header class="sc-head">
          <span class="sc-close">${icon.xmark(20)}</span>
          <span class="sc-step"><b>1</b>/3</span>
          <span class="sc-title">Gesichtsscan</span>
        </header>
      </div>`));
      Object.assign($, {
        faceWrap: cam.querySelector('.sc-face'),
        mask: cam.querySelector('.sc-mask'),
        glow: cam.querySelector('.sc-ring-glow'),
        track: cam.querySelector('.sc-ring-track'),
        cueL: cam.querySelector('.sc-cue-l'),
        cueR: cam.querySelector('.sc-cue-r'),
        pill: cam.querySelector('.sc-pill'),
        hint: cam.querySelector('.sc-hint'),
        loading: cam.querySelector('.sc-loading'),
        loadSpin: cam.querySelector('.sc-loading .sc-spin'),
        flash: cam.querySelector('.sc-flash'),
        done: cam.querySelector('.sc-done'),
        head: cam.querySelector('.sc-head'),
        step: cam.querySelector('.sc-step b'),
      });
      faceCanvas = $.faceWrap;
      css($.pill, 'top', `${PILL_Y}px`);
      css($.hint, 'top', `${HINT_Y}px`);

      /* ---------------------------------------------------------- analysis (CheckInAnalyzingOverlay) */
      ana = phone.addScreen(h(`<div class="scr sc-ana">
        ${statusBar('dark')}
        <div class="sc-ana-stack">
          <div class="sc-ana-art">${analysisArtwork()}<span class="sc-ana-ok">${icon.check(22)}</span></div>
          <div class="sc-ana-spin">${spinner()}</div>
          <p class="sc-ana-label"></p>
        </div>
        <div class="sc-chips">${ZONES.map(z => `<span class="sc-chip"><i>${icon.check(10)}</i>${z.name}</span>`).join('')}</div>
      </div>`));
      Object.assign($, {
        stack: ana.querySelector('.sc-ana-stack'),
        glass: ana.querySelector('.sc-glass'),
        ok: ana.querySelector('.sc-ana-ok'),
        spinWrap: ana.querySelector('.sc-ana-spin'),
        spin: ana.querySelector('.sc-ana-spin .sc-spin'),
        label: ana.querySelector('.sc-ana-label'),
        chips: ana.querySelector('.sc-chips'),
      });
      chipEls = [...$.chips.children];

      /* ---------------------------------------------------------- callouts: face, hairlines, labels */
      co = h(`<div class="sc-co">
        <svg class="sc-co-lines"></svg>
        <canvas class="sc-co-face"></canvas>
      </div>`);
      callouts.appendChild(co);
      coCanvas = co.querySelector('.sc-co-face');
      coSvg = co.querySelector('.sc-co-lines');
      const NS = 'http://www.w3.org/2000/svg';
      ZONES.forEach(z => {
        const line = coSvg.appendChild(document.createElementNS(NS, 'path'));
        line.setAttribute('pathLength', '1');
        line.classList.add('sc-co-line');
        const dot = co.appendChild(h('<i class="sc-co-dot"></i>'));
        const el = co.appendChild(h(`<span class="sc-co-label">${z.name}</span>`));
        labels.push({ line, dot, el });
      });
      layoutCallouts();

      // The faces load lazily; the scene renders fine without them meanwhile.
      import('../face3d.js').then(m => {
        createFace = m.createFace;
        face = createFace(faceCanvas, { theme: 'dark', fit: FACE_FIT, initial: { assemble: 0, y: FACE_Y } });
        ensureCalloutFace();
        this.update(this.lastT ?? 0, { active: null });
      }).catch(err => console.warn('scan face:', err));
    },

    resize() { layoutCallouts(); },

    update(t, ctx) {
      this.lastT = t;
      const active = ctx.active === this;
      if (active) phone.finger({ show: 0 });

      /* ---------------------------------------------------------- camera screen */
      const camOn = t > 0 && t < T.overlay[1];
      css(cam, 'visibility', t > 0 ? 'visible' : 'hidden');
      // The 393 × 852 canvas is a touch shorter than the screen glass, so the
      // strip below it takes the camera's black while the camera is up.
      css(phone.screen, 'background', t > .02 && t < T.overlay[0] ? '#000' : '');
      // full screen cover: slides up from the bottom edge
      const up = ease.outQuint(seg(t, ...T.cover));
      css(cam, 'transform', `translateY(${((1 - up) * UI_H).toFixed(1)}px)`);
      // the canvas (or face3d's SVG stand in) leaves the layout while hidden, so face3d stops drawing
      css(face ? face.element : faceCanvas, 'display', camOn ? 'block' : 'none');

      const load = pulse(t, T.loading[0] - .03, T.loading[1]);
      css($.loading, 'opacity', Math.min(1, load * 1.6).toFixed(3));
      css($.loadSpin, 'transform', `rotate(${Math.floor(t * 900) * 45}deg)`);
      const ready = ease.out(seg(t, ...T.preview));

      // which photo we're on, and whether the shutter has fired
      const shots = T.capture.filter(c => t >= c).length;
      text($.step, Math.min(3, shots + 1));
      const finished = t >= T.done[0];
      css($.head, 'opacity', (1 - ease.out(seg(t, T.done[0] - .012, T.done[0]))).toFixed(3));

      /* face: comes in from low right, too far and tilted, then turns left and right */
      const a = ease.inOut(seg(t, ...T.approach));
      const jitter = (1 - a) * Math.sin(t * 90) * .012;
      const turnL = ease.inOut(seg(t, ...T.turnL));
      const center = ease.inOut(seg(t, ...T.center));
      const turnR = ease.inOut(seg(t, ...T.turnR));
      const back = ease.inOut(seg(t, T.done[0], T.overlay[1]));
      const yaw = lerp(.24, 0, a) - TURN * turnL + TURN * center + TURN * turnR - TURN * back;
      // people lean in a little while they turn
      const lean = .08 * Math.max(pulse(t, T.turnL[0] - .01, T.lock[1] + .005), pulse(t, T.center[0], T.lock[2] + .005));
      if (face) {
        face.set({
          assemble: ease.out(seg(t, ...T.assemble)),
          x: lerp(.3, 0, a) + jitter,
          y: lerp(FACE_Y + .2, FACE_Y, a) + jitter * .6,
          scale: lerp(.66, 1, a) + lean,
          pitch: lerp(-.3, 0, a),
          yaw,
          dim: 1 - ready,
        }, { immediate: true });
      }
      css($.mask, 'opacity', ready.toFixed(3));

      /* alignment ring: brightness follows how well the face sits, green and glowing when locked */
      const align = shots === 0 ? a : shots === 1 ? turnL : shots === 2 ? turnR * center : 1;
      const locked = !finished && T.lock.some((l, i) => t >= l && t < T.capture[i] + FLASH * .5);
      const lockIdx = T.lock.findIndex((l, i) => t >= l && t < T.capture[i] + FLASH);
      const lockK = lockIdx < 0 ? 0 : pulse(t, T.lock[lockIdx], T.lock[lockIdx] + .03);
      css($.track, 'stroke', locked ? '#246B3D' : `rgba(255,255,255,${(.14 + .3 * (shots < 3 ? align : 0)).toFixed(3)})`);
      css($.glow, 'opacity', locked ? (.6 + .4 * lockK).toFixed(3) : '0');
      // the lock haptic, felt as a small bump of the ring
      const bump = 1 + lockK * .018;
      css($.track, 'transform', `scale(${bump.toFixed(4)})`);
      css($.glow, 'transform', `translate(-50%, -50%) scale(${bump.toFixed(4)})`);
      css($.track, 'opacity', ready.toFixed(3));

      /* rim cues: chevron on the oval's edge, nudging outward in the app's 0.55 s rhythm */
      const cue = (el, [c0, c1], dir) => {
        const on = seg(t, c0, c0 + .015) * (1 - seg(t, c1 - .015, c1));
        const nudge = (1 - Math.cos(seg(t, c0, c1) * Math.PI * 2 * 7)) / 2 * 7;
        const k = ease.out(on);
        css(el, 'opacity', k.toFixed(3));
        css(el, 'transform', `translate(${(CX + dir * (CUE_REACH + nudge)).toFixed(1)}px, ${CY}px) translate(-50%, -50%) scale(${lerp(.8, 1, k).toFixed(3)})`);
      };
      cue($.cueL, T.cueL, -1);
      cue($.cueR, T.cueR, 1);

      /* instruction pill and the one time setup hint (it goes once a face is seen) */
      const pillOn = ready * (1 - seg(t, T.lock[0] - .005, T.lock[0] + .012));
      css($.pill, 'opacity', pillOn.toFixed(3));
      css($.hint, 'opacity', (ready * (1 - seg(t, ...T.hint))).toFixed(3));

      /* shutter flash: 45% white, held briefly, then eased out */
      const flash = Math.max(...T.capture.map(c => (t >= c && t < c + FLASH ? .45 * (1 - ease.out(seg(t, c + FLASH * .18, c + FLASH))) : 0)));
      css($.flash, 'opacity', flash.toFixed(3));

      /* completion checkmark: spring pop in the centre of the oval */
      const pop = seg(t, T.done[0], T.done[0] + .03);
      css($.done, 'opacity', Math.min(1, pop * 3).toFixed(3));
      css($.done, 'transform', `translate(-50%, -50%) scale(${lerp(.3, 1, ease.outBack(pop)).toFixed(3)})`);

      /* ---------------------------------------------------------- analysis overlay */
      const ov = ease.inOut(seg(t, ...T.overlay));
      css(ana, 'visibility', ov > 0 ? 'visible' : 'hidden');
      css(ana, 'opacity', ov.toFixed(3));
      // the glass drifts over the card, like the app's 1.4 s back and forth loop
      const g = (1 - Math.cos(seg(t, T.overlay[0], 1) * Math.PI * 2 * 3.5)) / 2;
      css($.glass, 'transform', `translate(${lerp(200, 212, g).toFixed(2)}px, ${lerp(132, 118, g).toFixed(2)}px) rotate(${lerp(-14, -6, g).toFixed(2)}deg) scale(${lerp(.96, 1.06, g).toFixed(3)})`);

      const [s0, s1] = T.steps;
      const n = analysisSteps.length - 1;
      const u = seg(t, s0, s1) * n;
      const idx = Math.min(n, Math.floor(u));
      text($.label, analysisSteps[idx]);
      // each change fades out in 0.14 s and back in over 0.18 s
      const f = u - idx;
      css($.label, 'opacity', (idx === n ? 1 : Math.min(seg(f, 0, .12), 1 - seg(f, .92, 1))).toFixed(3));

      const complete = seg(t, s1, s1 + .025);
      css($.spinWrap, 'opacity', (1 - complete).toFixed(3));
      // the app drops the spinner from the stack, so its height and one 28 pt gap close up
      const keep = 1 - ease.inOut(complete);
      css($.spinWrap, 'height', `${(keep * 37).toFixed(2)}px`);
      css($.spinWrap, 'marginTop', `${((keep - 1) * 28).toFixed(2)}px`);
      css($.spin, 'transform', `rotate(${Math.floor(t * 900) * 45}deg)`);
      css($.ok, 'opacity', complete.toFixed(3));
      css($.ok, 'transform', `translate(-50%, -50%) scale(${lerp(.5, 1, ease.outBack(complete)).toFixed(3)})`);

      /* ---------------------------------------------------------- callouts */
      const sweep = seg(t, ...T.sweep);
      const lit = Object.fromEntries(ZONES.map(z => [z.key, t < T.sweep[0] ? 0 : zoneLit(z, sweep)]));
      const out = 1 - seg(t, ...T.coOut);
      const coOn = t > T.coIn[0] && t < 1;
      css(co, 'visibility', wide && coOn ? 'visible' : 'hidden');
      if (coFace) css(coFace.element, 'display', wide && coOn ? 'block' : 'none');
      if (coFace && wide && coOn) {
        const cin = ease.out(seg(t, ...T.coIn));
        coFace.set({
          assemble: cin,
          yaw: lerp(-.45, .3, ease.inOut(seg(t, T.coIn[0], 1))),
          pitch: -.06,
          x: lerp(-.35, 0, cin),
          scale: lerp(.8, 1, cin),
          scan: t >= T.sweep[0] && t < T.sweep[1] ? ease.inOut(sweep) : -1,
          zoneGlow: lit,
          dim: 1 - out,
        }, { immediate: true });
      }
      if (!coOn) labels.forEach(L => { css(L.el, 'opacity', '0'); css(L.dot, 'opacity', '0'); css(L.line, 'opacity', '0'); });

      // the zone chips in the phone light up with the scan line and get their check
      // as the matching label comes out beside the phone
      const chipsIn = ease.out(seg(t, T.overlay[1], T.overlay[1] + .03));
      css($.chips, 'opacity', chipsIn.toFixed(3));
      css($.chips, 'transform', `translate(-50%, ${((1 - chipsIn) * 8).toFixed(1)}px)`);
      ZONES.forEach((z, i) => css(chipEls[i], '--k', ease.out(lit[z.key]).toFixed(3)));

      /* ---------------------------------------------------------- stat rail beside the phone */
      if (active) {
        const fade = (a0, a1, b0, b1) => seg(t, a0, a1) * (1 - seg(t, b0, b1));
        if (t < T.capture[0] + .03) {
          rail.set({ num: '1', unit: '/3', label: 'Foto von vorne', k: fade(.06, .09, T.capture[0] + .01, T.capture[0] + .03) });
        } else if (t < T.capture[1] + .01) {
          rail.set({ num: `${Math.round(30 * turnL)}°`, label: 'nach links', k: fade(T.cueL[0], T.cueL[0] + .02, T.capture[1], T.capture[1] + .01) });
        } else if (t < T.capture[2] + .01) {
          rail.set({ num: `${Math.round(30 * turnR)}°`, label: 'nach rechts', k: fade(T.capture[1] + .01, T.center[1] - .01, T.capture[2] - .005, T.capture[2] + .01) });
        } else if (t < T.coIn[0] + .01) {
          // from here the callout face takes the space beside the phone
          rail.set({ num: '≈ 5', unit: 's', label: 'für alle drei Fotos', k: fade(T.capture[2] + .01, T.capture[2] + .03, T.coIn[0] - .01, T.coIn[0] + .01) });
        }
      }
    },
  };
}
