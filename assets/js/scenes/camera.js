/* Scene: the scan, at page scale. The whole stage is the app's camera
   (FaceScanView): a face glides into the oval, the ring lights up and locks,
   the shutter fires three times (front, left 30°, right 30°) and each photo
   lands as a thumbnail. Then the analysis runs on the big face: landmarks,
   then zones with their values. Finally the camera shrinks into the iPhone
   screen, where the results take over.

   Spatial motion follows scroll; the shutter flash, thumbnails and value
   count ups play on the clock once their moment is reached (engine once()). */

import { seg, ease, css, attr, text, toggle, lerp, clamp, once } from '../engine.js?v=4';
import { h } from '../ui-kit.js?v=4';
import { analysisSteps, zones } from './data.js?v=4';

/* beats in local t (camera range .05 → .49 of the stage) */
const B = {
  glide: [0, .12],          // from the hero position into the oval
  align: [.08, .18],        // ring brightens as the face settles
  shot1: .19,
  left: [.25, .37], shot2: .40,
  right: [.46, .59], shot3: .61,
  center: [.62, .66],
  dots: [.67, .73],
  zones: [.72, .8],
  status: [.66, .88],
  shrink: [.885, 1],
};
const YAW = 1;              // ±1 = the full ±30° turn of the app

const ZONE_LABELS = [
  { key: 'stirn', name: 'Stirn', value: zones[0].value },
  { key: 'wangeL', name: 'Wangen', value: zones[1].value },
  { key: 'nase', name: 'Nase', value: zones[2].value },
  { key: 'kinn', name: 'Kinn', value: zones[3].value },
];

/* The photographic head sequence (faceseq.js) behind a small adapter that maps
   the scene's oval geometry onto the frame. */
async function makeFace(canvas) {
  const { createFaceSeq } = await import('../faceseq.js?v=4');
  const f = createFaceSeq(canvas, {});
  await f.ready;
  const base = new URL('../../face/seq-640/', import.meta.url);
  return {
    set: v => {
      // framed like the app: eyes at about 42% of the oval, chin just inside the rim
      // (calibrated from landmarks.json). The frame fits the tighter side of the
      // canvas; portrait frames are width bound on phones.
      const H = canvas.clientHeight, base = Math.min(H, canvas.clientWidth / .82);
      const scale = (v.ovalH / base) * 1.21 * (v.scale || 1);
      f.set({ yaw: v.yaw || 0, x: v.nx || 0, y: (v.ny || 0) - .01 * scale * base / H, scale, dim: v.dim || 0 }, { draw: false });
    },
    draw: () => f.draw(),
    project: n => f.project(n),
    zones: () => f.zones(),
    count: () => f.pointCount || 0,
    frameUrl: yaw => new URL(String(Math.round((yaw + 1) * 32)).padStart(2, '0') + '.webp', base).href,
  };
}

export default function camera({ phone, cam }) {
  let lines, head, thumbsRow, asleep = false, mask, root, view, canvas, ring, ringGlow, pill, hint, arrowL, arrowR, flash, badge, done, status, statusText, thumbs, dots, zoneLayer, labels, inPhone;
  let face = null;
  let W = 0, H = 0;

  const layout = () => { W = cam.clientWidth; H = cam.clientHeight; };
  const narrow = () => W <= 860;

  /* oval geometry in stage px; the hero parks it to the right of the headline */
  const oval = () => {
    const oh = narrow() ? H * .44 : H * .56;
    return { w: oh * .74, h: oh };
  };

  return {
    init(ctx) {
      root = cam.appendChild(h(`<div class="cm">
        <div class="cm-view">
          <canvas class="cm-face"></canvas>
          <span class="cm-mask"></span>
          <svg class="cm-zones"></svg>
          <div class="cm-dots"></div>
          <div class="cm-ring"><span class="cm-ring-glow"></span><svg viewBox="0 0 100 100" preserveAspectRatio="none"><ellipse cx="50" cy="50" rx="49.4" ry="49.6"/></svg></div>
          <span class="cm-arrow cm-arrow-l"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></span>
          <span class="cm-arrow cm-arrow-r"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></span>
          <div class="cm-head"><b>Gesichtsscan</b><span class="cm-badge">1/3</span></div>
          <div class="cm-pill"><b>Zentriere dein Gesicht im Oval</b><small>Halt dein Handy auf Augenhöhe bei gleichmäßigem Licht.</small></div>
          <span class="cm-done"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span>
          <div class="cm-status"><i class="cm-spin"></i><span></span></div>
          <svg class="cm-lines">${ZONE_LABELS.map(() => '<g><line/><circle r="3"/></g>').join('')}</svg>
          <div class="cm-labels">${ZONE_LABELS.map(z => `<span class="cm-label" data-z="${z.key}"><b>${z.name}</b><em>0</em></span>`).join('')}</div>
          <div class="cm-thumbs">${[0, 1, 2].map(i => `<span class="cm-thumb" data-i="${i}"><i></i><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span>`).join('')}</div>
        </div>
        <span class="cm-flash"></span>
      </div>`));
      view = root.querySelector('.cm-view');
      canvas = root.querySelector('.cm-face');
      ring = root.querySelector('.cm-ring');
      mask = root.querySelector('.cm-mask');
      head = root.querySelector('.cm-head');
      thumbsRow = root.querySelector('.cm-thumbs');
      ringGlow = root.querySelector('.cm-ring-glow');
      pill = root.querySelector('.cm-pill');
      hint = pill.querySelector('small');
      arrowL = root.querySelector('.cm-arrow-l');
      arrowR = root.querySelector('.cm-arrow-r');
      flash = root.querySelector('.cm-flash');
      badge = root.querySelector('.cm-badge');
      done = root.querySelector('.cm-done');
      status = root.querySelector('.cm-status');
      statusText = status.querySelector('span');
      thumbs = [...root.querySelectorAll('.cm-thumb')];
      dots = root.querySelector('.cm-dots');
      zoneLayer = root.querySelector('.cm-zones');
      labels = [...root.querySelectorAll('.cm-label')];
      lines = [...root.querySelectorAll('.cm-lines g')];

      // the same moment, inside the phone: shown while the camera lands in it
      inPhone = phone.addScreen(h(`<div class="scr cm-inphone"><div class="cm-inphone-oval"></div><span class="cm-done on"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span><p>Analyse fertig!</p></div>`));

      layout();
      new ResizeObserver(layout).observe(cam);
      makeFace(canvas).catch(err => { console.warn('face sequence:', err); return null; }).then(f => {
        if (!f) return;
        face = f;
        // the stage only renders on scroll, so place the late arriving head now
        asleep = false;
        ctx.stage.refresh();
        // thumbnails show the actual captured angle when frames exist
        [-0, -YAW, YAW].forEach((yaw, i) => {
          const url = f.frameUrl(yaw);
          if (url) thumbs[i].querySelector('i').style.backgroundImage = `url("${url}")`;
        });
        const n = f.count();
        if (n) dots.innerHTML = Array.from({ length: n }, () => '<i></i>').join('');
      });
    },

    update(t, ctx) {
      // once the camera has landed in the phone it rests until scrolled back to
      if (t >= 1 && asleep) return;
      asleep = t >= 1;
      // all layout reads first, before this frame writes anything
      const target = phone.screen.getBoundingClientRect();
      const box = cam.getBoundingClientRect();
      const o0 = oval();
      const axis = narrow() ? 0 : W * .1;            // desktop: oval and phone share one axis at 60vw
      const heroX = axis;
      const heroY = narrow() ? H * .24 : 0;          // mobile hero: oval below the headline
      const g = ease.inOut(seg(t, ...B.glide));
      // on phones the hero oval sits smaller under the headline, then grows into place
      const os = narrow() ? lerp(.72, 1, g) : 1;
      const o = { w: o0.w * os, h: o0.h * os };
      const cx = W / 2 + lerp(heroX, axis, g);
      const cy = H / 2 + lerp(heroY, 0, g) + (narrow() ? H * .04 : 0);

      /* ---- ring, positioned in stage px */
      css(ring, 'width', `${o.w.toFixed(1)}px`);
      css(ring, 'height', `${o.h.toFixed(1)}px`);
      css(ring, 'transform', `translate(${(cx - o.w / 2).toFixed(1)}px, ${(cy - o.h / 2).toFixed(1)}px)`);
      // the mask is a fixed size hole, placed and scaled with a transform only
      css(mask, 'transform', `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) scale(${(o.w / 300).toFixed(4)}, ${(o.h / 405).toFixed(4)})`);
      const chrome = seg(t, .02, .1) * (1 - seg(t, .64, .7));
      const lock1 = seg(t, .16, .185), lock2 = seg(t, .375, .395), lock3 = seg(t, .585, .605);
      const bright = Math.max(ease.out(seg(t, ...B.align)) * (1 - seg(t, .2, .24)), lock2, lock3, lock1);
      const green = Math.max(lock1 * (1 - seg(t, .2, .23)), lock2 * (1 - seg(t, .41, .44)), lock3);
      toggle(ring, 'lock', green > .5);
      css(ring, '--b', (.35 + .65 * bright).toFixed(3));
      css(ringGlow, 'opacity', (green * .9).toFixed(3));
      css(ring, 'opacity', (.55 + .45 * seg(t, 0, .06) - seg(t, .82, .88) * .6).toFixed(3));

      /* ---- the face: glides in, settles, turns left, then right, back to centre */
      const yaw = lerp(0, -YAW, ease.inOut(seg(t, ...B.left)))
        + lerp(0, 2 * YAW, ease.inOut(seg(t, ...B.right)))
        - lerp(0, YAW, ease.inOut(seg(t, ...B.center)));
      const settle = ease.out(seg(t, ...B.align));
      const jitter = (1 - settle) * (1 - g);
      const faceScale = narrow() ? .86 : 1;
      if (face) {
        face.set({
          yaw,
          x: cx - W / 2 + jitter * o.w * .18,
          y: cy - H / 2 + jitter * o.h * .12,
          nx: (cx - W / 2) / (W / 2),
          ny: (cy - H / 2) / (H / 2),
          ovalH: o.h,
          scale: faceScale * lerp(.9, 1, settle) * (1 + .06 * (seg(t, .24, .3) - seg(t, .62, .66))),
          dim: seg(t, .74, .82) * .35,
        });
        face.draw();
      }

      /* ---- chrome: title with badge above the oval, pill below, arrows on the rim */
      css(head, 'transform', `translate(${cx.toFixed(1)}px, ${(cy - o.h / 2 - 54).toFixed(1)}px) translateX(-50%)`);
      css(head, 'opacity', chrome.toFixed(3));
      text(badge, t < B.shot1 + .01 ? '1/3' : t < B.shot2 + .01 ? '2/3' : '3/3');
      css(pill, 'transform', `translate(${cx.toFixed(1)}px, ${(cy + o.h / 2 + 28).toFixed(1)}px) translateX(-50%)`);
      css(pill, 'opacity', (chrome * (1 - seg(t, .21, .25))).toFixed(3));
      css(hint, 'opacity', (1 - seg(t, .08, .14)).toFixed(3));
      const nudge = Math.sin(t * 120) * 4;
      css(arrowL, 'transform', `translate(${(cx - o.w / 2 - 34 + nudge).toFixed(1)}px, ${cy.toFixed(1)}px) translateY(-50%)`);
      css(arrowL, 'opacity', (seg(t, .22, .25) * (1 - seg(t, .36, .39))).toFixed(3));
      css(arrowR, 'transform', `translate(${(cx + o.w / 2 + 10 - nudge).toFixed(1)}px, ${cy.toFixed(1)}px) translateY(-50%)`);
      css(arrowR, 'opacity', (seg(t, .43, .46) * (1 - seg(t, .57, .6))).toFixed(3));

      /* ---- shutter: flash and a thumbnail per photo, on the clock */
      const shots = [B.shot1, B.shot2, B.shot3];
      let fl = 0;
      shots.forEach((at, i) => {
        const k = once(`cm-shot-${i}`, t >= at, 700);
        // a short shutter blink in the first ~120 ms, the thumbnail keeps flying
        const blink = seg(k, 0, .17);
        fl = Math.max(fl, k > 0 && blink < 1 ? Math.pow(1 - blink, 2) : 0);
        const th = thumbs[i];
        const fly = ease.outQuint(k);
        // from the oval centre to its slot in the row under the pill
        css(th, '--fly', (1 - fly).toFixed(3));
        css(th, 'opacity', ((k > 0 ? 1 : 0) * (1 - seg(t, .66, .7))).toFixed(3));
        toggle(th, 'ok', k >= 1);
      });
      css(flash, 'opacity', (fl * .5).toFixed(3));
      css(thumbsRow, 'transform', `translate(${cx.toFixed(1)}px, ${(cy + o.h / 2 + 96).toFixed(1)}px) translateX(-50%)`);
      // thumbnails start at the oval centre, which is this far above their row
      css(thumbsRow, '--dy', `${(-(o.h / 2 + 96 + 40)).toFixed(1)}px`);
      const ok = once('cm-done', t >= .62 && t < .7, 500);
      css(done, 'transform', `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) translate(-50%, -50%) scale(${(.6 + .4 * ease.outBack(ok)).toFixed(3)})`);
      css(done, 'opacity', (ok * (1 - seg(t, .66, .69))).toFixed(3));

      /* ---- analysis: landmarks appear, then give way to zones with values */
      const dk = seg(t, ...B.dots), zk = seg(t, ...B.zones);
      const dotEls = dots.children;
      if (face && dotEls.length) {
        for (let i = 0; i < dotEls.length; i++) {
          const pt = face.project(i);
          const show = seg(dk, i / dotEls.length * .7, i / dotEls.length * .7 + .3) * (1 - zk);
          css(dotEls[i], 'opacity', show > 0 && pt ? (show * clamp(pt.facing * 3)).toFixed(3) : '0');
          if (!pt || show <= 0) continue;
          css(dotEls[i], 'transform', `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px)`);
        }
      }
      if (face && zk > 0) {
        const polys = face.zones();
        if (polys) {
          if (!zoneLayer.querySelector('polygon')) {
            zoneLayer.innerHTML = '<defs><filter id="cm-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter></defs>'
              + Object.keys(polys).map(k => `<polygon data-z="${k}" filter="url(#cm-soft)"/>`).join('');
          }
          // each zone lights up together with its chip
          const order = { stirn: 0, wangeL: 1, wangeR: 1, nase: 2, kinn: 3 };
          zoneLayer.querySelectorAll('polygon').forEach(pg => {
            const pts = polys[pg.dataset.z];
            const at = .15 + order[pg.dataset.z] * .18;
            if (pts) attr(pg, 'points', pts.map(q => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' '));
            css(pg, 'opacity', (seg(zk, at - .1, at + .08) * (1 - seg(t, .86, .9))).toFixed(3));
          });
        }
      }
      css(zoneLayer, 'opacity', zk > 0 ? '1' : '0');
      // chips on the right are stacked at their zones' heights, pushed apart if they collide
      const chipY = ZONE_LABELS.map(z => { const q = face && face.project(z.key); return q ? q.y : 0; });
      for (let i = 1; i < chipY.length; i++) chipY[i] = Math.max(chipY[i], chipY[i - 1] + 46);
      labels.forEach((lab, i) => {
        const z = ZONE_LABELS[i];
        const pt = face && face.project(z.key);
        const k = once(`cm-zone-${i}`, zk >= .15 + i * .18, 700);
        if (pt && narrow()) {
          // phones: a 2 × 2 grid of chips under the oval, no hairlines
          const lx = cx + (i % 2 ? 6 : -6), ly = cy + o.h / 2 + 34 + Math.floor(i / 2) * 44;
          css(lab, 'transform', `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px) translate(${i % 2 ? '0' : '-100%'}, -50%)`);
          toggle(lab, 'flat', true);
        } else if (pt) {
          toggle(lab, 'flat', false);
          // labels sit outside the face, on the side of their zone
          // all chips sit right of the oval, each at its zone's height
          const side = 1;
          const lx = cx + o.w * .64;
          css(lab, 'transform', `translate(${lx.toFixed(1)}px, ${chipY[i].toFixed(1)}px) translate(${side < 0 ? '-100%' : '0'}, -50%)`);
          // hairline from the chip to its point on the face
          const [ln, dot] = lines[i].children;
          attr(ln, 'x1', lx.toFixed(1)); attr(ln, 'y1', chipY[i].toFixed(1));
          attr(ln, 'x2', pt.x.toFixed(1)); attr(ln, 'y2', pt.y.toFixed(1));
          attr(dot, 'cx', pt.x.toFixed(1)); attr(dot, 'cy', pt.y.toFixed(1));
          toggle(lab, 'left', side < 0);
        }
        const labK = (ease.out(k) * (1 - seg(t, .86, .9))).toFixed(3);
        css(lab, 'opacity', labK);
        css(lines[i], 'opacity', narrow() ? '0' : labK);
        text(lab.querySelector('em'), Math.round(z.value * ease.outQuint(k)));
      });

      const st = seg(t, ...B.status);
      css(status, 'transform', `translate(${cx.toFixed(1)}px, ${(cy + o.h / 2 + (narrow() ? 136 : 34)).toFixed(1)}px) translateX(-50%)`);
      css(status, 'opacity', (seg(t, .66, .69) * (1 - seg(t, .87, .89))).toFixed(3));
      text(statusText, analysisSteps[Math.min(analysisSteps.length - 1, Math.floor(st * analysisSteps.length))]);
      toggle(status, 'fin', st >= 1);

      /* ---- the camera lands in the phone screen */
      const s = ease.inOut(seg(t, ...B.shrink));
      const rx = target.left - box.left, ry = target.top - box.top;
      const L = lerp(0, rx, s), Tp = lerp(0, ry, s);
      const R = lerp(W, rx + target.width, s), Bt = lerp(H, ry + target.height, s);
      const radius = lerp(0, 52 * phone.scale, s);
      css(root, 'clipPath', s > 0 ? `inset(${Tp.toFixed(1)}px ${(W - R).toFixed(1)}px ${(H - Bt).toFixed(1)}px ${L.toFixed(1)}px round ${radius.toFixed(1)}px)` : 'none');
      const sc = lerp(1, target.height / H, s);
      const vx = lerp(0, rx + target.width / 2 - W / 2, s), vy = lerp(0, ry + target.height / 2 - H / 2, s);
      css(view, 'transform', s > 0 ? `translate(${vx.toFixed(1)}px, ${vy.toFixed(1)}px) scale(${sc.toFixed(4)})` : 'none');
      css(root, 'opacity', (1 - seg(t, .985, 1)).toFixed(3));
      css(root, 'visibility', t >= 1 ? 'hidden' : 'visible');
      css(inPhone, 'visibility', t >= B.shrink[0] ? 'visible' : 'hidden');

      if (ctx.active === this) phone.finger({ show: 0 });
    },
  };
}
