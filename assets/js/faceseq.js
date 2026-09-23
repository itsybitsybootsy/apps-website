/*
 * faceseq.js: a photoreal head turning left and right, scrubbed from a
 * pre-rendered image sequence (65 frames, yaw -32° to +32° in 1° steps), with
 * landmarks exported from the same render so overlays register exactly.
 *
 *   import { createFaceSeq } from './faceseq.js';
 *   const face = createFaceSeq(canvas);            // canvas sized by CSS
 *   await face.ready;                              // landmarks + front frame
 *   face.set({ yaw: -.6, scale: 1.1 });            // draws synchronously
 *   const p = face.project('nase');                // { x, y, facing } in css px
 *
 * No animation loop of its own: set() and draw() render immediately, so the
 * page's scroll engine stays in charge of timing and easing.
 *
 * Head model: "Infinite, 3D Head Scan" by Lee Perry-Smith, licensed under
 * CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/). Rendered in
 * Blender with website-shots/tools/render-head.py.
 */

const BASE = new URL('../face/', import.meta.url);
const FRAMES = 65;
const FRONT = 32;
const ASPECT = 820 / 1000;      // width / height of every frame

/** landmarks.json, shared by every instance */
let landmarksPromise = null;
const loadLandmarks = () => (landmarksPromise ??= fetch(new URL('landmarks.json', BASE)).then((r) => {
  if (!r.ok) throw new Error(`faceseq: landmarks HTTP ${r.status}`);
  return r.json();
}));

/**
 * Load order: the front frame first (poster), then a coarse spread outwards
 * (every 8th, then every 4th, ...), so any yaw has a nearby frame early.
 */
function loadOrder() {
  const order = [FRONT];
  for (const step of [16, 8, 4, 2, 1]) {
    for (let d = step; d <= FRONT; d += step) {
      for (const i of [FRONT - d, FRONT + d]) if (!order.includes(i)) order.push(i);
    }
  }
  return order;
}

/**
 * createFaceSeq(canvas, opts)
 *   opts.set      'auto' (default) | 1000 | 640: which resolution to load; auto
 *                 picks 1000 when the canvas is taller than 700 device pixels
 *   opts.fit      image height at scale 1 as a share of the canvas (default 1,
 *                 the frame is contained in the canvas)
 *   opts.initial  starting values for set()
 */
export function createFaceSeq(canvas, opts = {}) {
  const ctx = canvas.getContext('2d');
  const state = { yaw: 0, x: 0, y: 0, scale: 1, dim: 0 };
  const images = new Array(FRAMES).fill(null);   // decoded <img> or null
  let size = { w: 1, h: 1, dpr: 1 };
  let data = null;
  let destroyed = false;
  let set = opts.set ?? 'auto';

  const measure = () => {
    size = { w: canvas.clientWidth || 1, h: canvas.clientHeight || 1, dpr: Math.min(2, window.devicePixelRatio || 1) };
    canvas.width = Math.round(size.w * size.dpr);
    canvas.height = Math.round(size.h * size.dpr);
  };
  measure();
  if (set === 'auto') set = size.h * size.dpr > 700 ? 1000 : 640;

  const ro = new ResizeObserver(() => { measure(); draw(); });
  ro.observe(canvas);

  // ------------------------------------------------------------ loading
  const loadFrame = (i) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = new URL(`seq-${set}/${String(i).padStart(2, '0')}.webp`, BASE).href;
    return img.decode().then(() => {
      if (destroyed) return;
      images[i] = img;
      draw();
    }, () => {});                        // a missing frame just leaves a gap the neighbours cover
  };
  const order = loadOrder();
  const poster = loadFrame(order[0]);
  // the rest, a few at a time so the poster and near frames win the bandwidth
  (async () => {
    await poster;
    const queue = order.slice(1);
    const worker = async () => { while (queue.length && !destroyed) await loadFrame(queue.shift()); };
    await Promise.all([worker(), worker(), worker(), worker()]);
  })();

  const ready = Promise.all([loadLandmarks(), poster]).then(([lm]) => {
    data = lm;
    draw();
    return api;
  });

  // ------------------------------------------------------------ geometry
  /** Fractional frame index for the current yaw (-1..1). */
  const frameIndex = () => ((Math.max(-1, Math.min(1, state.yaw)) + 1) / 2) * (FRAMES - 1);

  /** The frame's box in css px. */
  function box() {
    const fit = opts.fit ?? 1;
    const hgt = Math.min(size.h, size.w / ASPECT) * fit * state.scale;
    const wid = hgt * ASPECT;
    const cx = (size.w / 2) * (1 + state.x);
    const cy = (size.h / 2) * (1 + state.y);
    return { left: cx - wid / 2, top: cy - hgt / 2, width: wid, height: hgt };
  }

  /** Nearest loaded neighbours of fractional index f and the blend between them. */
  function neighbours(f, have) {
    let lo = Math.floor(f), hi = Math.ceil(f);
    while (lo > 0 && !have(lo)) lo--;
    while (hi < FRAMES - 1 && !have(hi)) hi++;
    if (!have(lo)) lo = hi;
    if (!have(hi)) hi = lo;
    const w = hi > lo ? (f - lo) / (hi - lo) : 0;
    return { lo, hi, w };
  }

  // ------------------------------------------------------------ drawing
  function draw() {
    if (destroyed) return;
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    const { lo, hi, w } = neighbours(frameIndex(), (i) => images[i]);
    if (!images[lo]) return;
    const b = box();
    const alpha = 1 - Math.max(0, Math.min(1, state.dim));
    ctx.imageSmoothingQuality = 'high';
    // additive crossfade of premultiplied frames = an exact linear blend, alpha included
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * (1 - w);
    ctx.drawImage(images[lo], b.left, b.top, b.width, b.height);
    if (w > 0.001 && hi !== lo) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * w;
      ctx.drawImage(images[hi], b.left, b.top, b.width, b.height);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  /** Landmark row [x, y, facing] (image 0..1) for table index k at the current yaw. */
  function row(k) {
    const { lo, hi, w } = neighbours(frameIndex(), (i) => data.frames[i]);
    // stored as integers: x, y in 1/1000 of the frame, facing in 1/100
    const a = data.frames[lo][k], c = data.frames[hi][k];
    return [(a[0] + (c[0] - a[0]) * w) / 1000, (a[1] + (c[1] - a[1]) * w) / 1000, (a[2] + (c[2] - a[2]) * w) / 100];
  }
  const toCanvas = (r, b = box()) => ({ x: b.left + r[0] * b.width, y: b.top + r[1] * b.height, facing: r[2] });

  // ------------------------------------------------------------ API
  const api = {
    ready,
    /** Current values; set() replaces any subset and draws unless { draw: false }. */
    get state() { return { ...state }; },
    set(params = {}, { draw: now = true } = {}) {
      for (const k of Object.keys(state)) if (typeof params[k] === 'number' && Number.isFinite(params[k])) state[k] = params[k];
      if (now) draw();
      return api;
    },
    draw,
    /**
     * Screen position of a landmark in canvas css px:
     *   'stirn' | 'wangeL' | 'wangeR' | 'nase' | 'kinn' (named anchors), or
     *   0..59 (the sparse landmark points). facing: 1 toward the camera, <= 0 turned away.
     * Returns null until ready.
     */
    project(name) {
      if (!data) return null;
      const k = typeof name === 'number' ? data.points[name] : data.anchors[name];
      if (k === undefined) throw new Error(`faceseq: unknown landmark "${name}"`);
      return toCanvas(row(k));
    },
    /** All sparse landmark points, projected. */
    points() {
      if (!data) return [];
      const b = box();
      return data.points.map((k) => toCanvas(row(k), b));
    },
    /** Zone outlines in canvas css px: { stirn: [{x, y, facing}, ...], wangeL, wangeR, nase, kinn } */
    zones() {
      if (!data) return {};
      const b = box();
      return Object.fromEntries(Object.entries(data.zones).map(([key, ring]) => [key, ring.map((k) => toCanvas(row(k), b))]));
    },
    /** The frame's box in canvas css px (useful for masks and vignettes). */
    box,
    get pointCount() { return data ? data.points.length : 0; },
    destroy() {
      destroyed = true;
      ro.disconnect();
      images.fill(null);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
  if (opts.initial) api.set(opts.initial, { draw: false });
  return api;
}
