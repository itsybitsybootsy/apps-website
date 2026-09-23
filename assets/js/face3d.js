/*
 * face3d.js: a luminous point cloud face with a faint wireframe, drawn with
 * raw WebGL 1. No dependencies. Driven from outside through face.set().
 *
 *   import { createFace } from './face3d.js';
 *   const face = createFace(canvas, { theme: 'dark' });
 *   face.set({ assemble: 1, yaw: -0.85 });          // targets, eased internally
 *   face.onFrame(() => { const p = face.project('nase'); ... });
 *
 * NOTICE: the geometry (assets/models/face.bin, face-points.svg) is derived from
 * the MediaPipe canonical face model, Copyright Google LLC, licensed under the
 * Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0).
 */

const MESH_URL = new URL('../models/face.bin', import.meta.url);
const SVG_URL = new URL('../models/face-points.svg', import.meta.url);

// Model space: 1 unit is about 1 cm, x mirrored like a selfie camera (the
// subject's left cheek is on screen left), y up, z toward the viewer.
const PIVOT = [0, -0.57, 1.5];     // rotation centre, roughly the middle of the head
const CAMERA = 42;                 // camera distance for the perspective
const FACE_H = 17.7;               // chin to hairline
const FACE_W = 15.5;               // cheek to cheek
const SVG_BOX = [-8.04, -8.56, 16.09, 18.27]; // viewBox of face-points.svg
const YAW_MAX = 35 * Math.PI / 180;
const PITCH_MAX = 20 * Math.PI / 180;
const SCAN_TOP = 9.8;              // model y of the scan line at scan = 0
const SCAN_BOTTOM = -10.4;         // ... and at scan = 1

// Named landmarks (canonical mesh vertex index) and zone ids used in face.bin.
const LANDMARKS = { stirn: 151, wangeL: 425, wangeR: 205, nase: 4, kinn: 199 };
const ZONE_KEYS = ['stirn', 'wangeL', 'wangeR', 'nase', 'kinn']; // zone ids 1..5

const THEMES = {
  // Additive light on a dark background.
  dark: {
    blend: 'add', back: '#7F9E86', front: '#DCE8DD', lit: '#F2FFF4', beam: '#E4F7E8',
    spot: '#DB7C72', point: 1, line: 1, glow: 0.075, size: 1,
  },
  // Ink on a light (cream) background, e.g. inside a recreated camera screen.
  light: {
    blend: 'over', back: '#A6BCA9', front: '#4F6152', lit: '#2A382D', beam: '#6F9A77',
    spot: '#C76F66', point: 1.1, line: 1.2, glow: 0.03, size: 1.1,
  },
};

const DEFAULTS = {
  assemble: 1, yaw: 0, pitch: 0, x: 0, y: 0, scale: 1, scan: -1, dim: 0,
  zoneGlow: { stirn: 0, wangeL: 0, wangeR: 0, nase: 0, kinn: 0 },
};

// ------------------------------------------------------------------ shaders
const POINT_VS = `
attribute vec3 aPos;
attribute vec3 aScatter;
attribute vec2 aInfo;           // x: zone id 0..5 (+8 for filler points), y: seed 0..1

uniform mat3 uRot;
uniform vec3 uPivot;
uniform vec2 uCenter;           // css px, origin top left
uniform vec2 uRes;              // css px
uniform float uScale;           // css px per model unit at pivot depth
uniform float uCam;
uniform float uDpr;
uniform float uAssemble;        // 0 scattered, 1 face
uniform float uTime;
uniform float uAmbient;         // 0 disables drift, twinkle and breathing
uniform float uScanY;           // model y of the scan line
uniform float uScan;            // scan line strength
uniform vec4 uZoneA;            // glow of zones 1..4
uniform float uZoneB;           // glow of zone 5
uniform float uAlpha;
uniform float uLine;            // 1 while drawing the wireframe
uniform float uGlow;            // 1 for the wide, faint halo pass
uniform vec3 uBack, uFront, uLit, uBeam, uSpot;
uniform vec4 uGain;             // theme: point alpha, line alpha, halo alpha, point size

varying vec3 vColor;
varying float vAlpha;
varying float vRound;           // 1 for round point sprites, 0 for lines

void main() {
  vRound = 1.0 - uLine;
  // Filler points (random samples inside triangles) stay smaller and dimmer so
  // the regular landmark grid reads as the structure.
  float filler = step(7.5, aInfo.x);
  float zone = floor(aInfo.x - filler * 8.0 + 0.5);
  float seed = aInfo.y;

  // Staggered fly in: every point leaves at its own time and eases out.
  float t = clamp(uAssemble * 1.6 - seed * 0.6, 0.0, 1.0);
  float e = 1.0 - pow(1.0 - t, 3.0);
  vec3 p = mix(aScatter, aPos, e);

  // Slow drift and breathing so the cloud never looks frozen.
  p += uAmbient * (1.0 - uLine) * 0.04 * vec3(sin(uTime * 0.7 + seed * 31.0),
                                              cos(uTime * 0.6 + seed * 17.0),
                                              sin(uTime * 0.5 + seed * 11.0));
  float breath = 1.0 + uAmbient * 0.006 * sin(uTime * 1.3);

  vec3 q = uRot * ((p - uPivot) * breath);
  float persp = uCam / (uCam - q.z);
  vec2 s = uCenter + vec2(q.x, -q.y) * uScale * persp;
  gl_Position = vec4(s.x / uRes.x * 2.0 - 1.0, 1.0 - s.y / uRes.y * 2.0, 0.0, 1.0);

  float depth = smoothstep(-4.5, 7.0, q.z);                  // 0 back, 1 front
  float beam = uScan * exp(-pow((aPos.y - uScanY) * 1.3, 2.0));
  vec4 m = vec4(equal(vec4(zone), vec4(1.0, 2.0, 3.0, 4.0)));
  float lit = dot(uZoneA, m) + uZoneB * step(4.5, zone);
  float spot = step(seed, 0.035) * lit;                      // a few warm dots per lit zone
  float twinkle = mix(1.0, 0.72 + 0.28 * sin(uTime * (0.8 + seed * 2.2) + seed * 50.0), uAmbient);

  vec3 col = mix(uBack, uFront, depth);
  col = mix(col, uLit, lit * 0.6);
  col = mix(col, uSpot, spot);
  col = mix(col, uBeam, min(1.0, beam));
  vColor = col;

  float fade = smoothstep(0.0, 0.2, uAssemble) * uAlpha;
  if (uLine > 0.5) {
    vAlpha = (0.04 + 0.14 * depth) * (1.0 + lit * 1.2 + beam * 2.5)
           * smoothstep(0.7, 1.0, uAssemble) * fade * uGain.y;
  } else {
    float a = (0.35 + 0.9 * depth) * twinkle * mix(0.3, 1.0, e) * (1.0 + lit * 0.5 + beam * 0.6);
    a *= 1.0 - filler * 0.45;
    vAlpha = min(1.0, a * mix(uGain.x, uGain.z, uGlow)) * fade;
    float size = (1.6 + seed * 1.5) * (0.6 + 0.55 * depth) * (1.0 - filler * 0.35);
    size *= clamp(uScale / 22.0, 0.5, 1.6) * uGain.w;
    size *= 1.0 + beam * 0.9 + lit * 0.3 + spot * 1.2;
    gl_PointSize = size * uDpr * mix(1.0, 5.0, uGlow);
  }
}`;

const POINT_FS = `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
varying float vRound;
void main() {
  float a = vAlpha;
  if (vRound > 0.5) {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float d = dot(c, c);
    if (d > 1.0) discard;
    a *= 1.0 - smoothstep(0.2, 1.0, d);    // solid core, soft rim
  }
  gl_FragColor = vec4(vColor * a, a);   // premultiplied
}`;

// The scan line: one screen aligned quad with a bright core and a soft halo.
const BEAM_VS = `
attribute vec2 aQuad;           // -1..1
uniform vec2 uRes;
uniform vec3 uLine;             // centre x, y, half width in css px
uniform float uHalf;            // half height of the quad in css px
varying vec2 vUv;               // x: -1..1 along the line, y: css px from the line
void main() {
  vUv = vec2(aQuad.x, aQuad.y * uHalf);
  vec2 s = vec2(uLine.x + aQuad.x * uLine.z, uLine.y + aQuad.y * uHalf);
  gl_Position = vec4(s.x / uRes.x * 2.0 - 1.0, 1.0 - s.y / uRes.y * 2.0, 0.0, 1.0);
}`;

const BEAM_FS = `
precision mediump float;
uniform vec3 uColor;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  float x = 1.0 - smoothstep(0.35, 1.0, abs(vUv.x));
  float d = abs(vUv.y);
  float a = (exp(-d * d * 0.9) + 0.22 * exp(-d * 0.09)) * x * uAlpha;
  gl_FragColor = vec4(uColor * a, a);
}`;

// ------------------------------------------------------------------ helpers
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Column major rotation: yaw around Y, then pitch around X (radians). */
function rotation(yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return new Float32Array([cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy]);
}

/** One download and decode of face.bin, shared by every face on the page. */
let meshPromise = null;
const sharedMesh = () => (meshPromise ??= loadMesh(MESH_URL));

/** Fetches face.bin: u32 n, u32 e, f32 quant, i16 pos[n*3], u16 edges[e*2], u8 zone[n], u8 seed[n]. */
async function loadMesh(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`face3d: mesh HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const view = new DataView(buf);
  const n = view.getUint32(0, true);
  const e = view.getUint32(4, true);
  const q = view.getFloat32(8, true);
  let off = 12;
  const raw = new Int16Array(buf, off, n * 3); off += n * 6;
  const edges = new Uint16Array(buf, off, e * 2); off += e * 4;
  const zone = new Uint8Array(buf, off, n); off += n;
  const seed = new Uint8Array(buf, off, n);

  const pos = Float32Array.from(raw, (v) => v * q);

  // Fly in start positions: a wide, flat ring around the face, deterministic
  // so the assemble looks the same on every visit.
  let s = 1234567;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const scatter = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 10 + Math.pow(rnd(), 0.6) * 34;
    scatter[i * 3] = Math.cos(a) * r * 1.3;
    scatter[i * 3 + 1] = Math.sin(a) * r * 0.75;
    scatter[i * 3 + 2] = -24 + rnd() * 40;
  }
  // The first 468 + e points are landmarks and edge midpoints, the rest filler.
  const info = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    info[i * 2] = zone[i] + (i >= 468 + e ? 8 : 0);
    info[i * 2 + 1] = seed[i] / 255;
  }
  return { count: n, pos, scatter, info, edges };
}

// ------------------------------------------------------------------ WebGL
function createGL(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) return null;

  const program = (vs, fs) => {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      gl.attachShader(p, sh);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    for (let i = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i--;) {
      const name = gl.getActiveUniform(p, i).name;
      u[name] = gl.getUniformLocation(p, name);
    }
    return { p, u };
  };
  const buffer = (target, data) => {
    const b = gl.createBuffer();
    gl.bindBuffer(target, b);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    return b;
  };
  const attrib = (prog, name, buf, size) => {
    const loc = gl.getAttribLocation(prog.p, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    return loc;
  };

  const points = program(POINT_VS, POINT_FS);
  const beam = program(BEAM_VS, BEAM_FS);
  const quad = buffer(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
  let mesh = null;
  let bufs = null;
  let enabled = [];

  return {
    setMesh(m) {
      mesh = m;
      bufs = {
        pos: buffer(gl.ARRAY_BUFFER, m.pos),
        scatter: buffer(gl.ARRAY_BUFFER, m.scatter),
        info: buffer(gl.ARRAY_BUFFER, m.info),
        edges: buffer(gl.ELEMENT_ARRAY_BUFFER, m.edges),
      };
    },

    resize(w, h, dpr) {
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    },

    /** r: frame state computed by createFace (see frameState()). */
    draw(r) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!mesh || r.alpha <= 0.001) return;
      const th = r.theme;
      gl.enable(gl.BLEND);
      if (th.blend === 'add') gl.blendFunc(gl.ONE, gl.ONE);
      else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      // Point cloud and wireframe share one program and one set of buffers.
      const { p, u } = points;
      gl.useProgram(p);
      enabled.forEach((l) => gl.disableVertexAttribArray(l));
      enabled = [attrib(points, 'aPos', bufs.pos, 3), attrib(points, 'aScatter', bufs.scatter, 3), attrib(points, 'aInfo', bufs.info, 2)];
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufs.edges);
      gl.uniformMatrix3fv(u.uRot, false, r.rot);
      gl.uniform3fv(u.uPivot, PIVOT);
      gl.uniform2f(u.uCenter, r.cx, r.cy);
      gl.uniform2f(u.uRes, r.w, r.h);
      gl.uniform1f(u.uScale, r.scale);
      gl.uniform1f(u.uCam, CAMERA);
      gl.uniform1f(u.uDpr, r.dpr);
      gl.uniform1f(u.uAssemble, r.assemble);
      gl.uniform1f(u.uTime, r.time);
      gl.uniform1f(u.uAmbient, r.ambient);
      gl.uniform1f(u.uScanY, r.scanY);
      gl.uniform1f(u.uScan, r.scan);
      gl.uniform4f(u.uZoneA, r.zones[0], r.zones[1], r.zones[2], r.zones[3]);
      gl.uniform1f(u.uZoneB, r.zones[4]);
      gl.uniform1f(u.uAlpha, r.alpha);
      gl.uniform3fv(u.uBack, th.rgb.back);
      gl.uniform3fv(u.uFront, th.rgb.front);
      gl.uniform3fv(u.uLit, th.rgb.lit);
      gl.uniform3fv(u.uBeam, th.rgb.beam);
      gl.uniform3fv(u.uSpot, th.rgb.spot);
      gl.uniform4f(u.uGain, th.point, th.line, th.glow, th.size);

      // Wireframe, then a wide faint halo pass, then the crisp points.
      gl.uniform1f(u.uLine, 1);
      gl.uniform1f(u.uGlow, 0);
      gl.drawElements(gl.LINES, mesh.edges.length, gl.UNSIGNED_SHORT, 0);
      gl.uniform1f(u.uLine, 0);
      gl.uniform1f(u.uGlow, 1);
      gl.drawArrays(gl.POINTS, 0, mesh.count);
      gl.uniform1f(u.uGlow, 0);
      gl.drawArrays(gl.POINTS, 0, mesh.count);

      if (r.scan > 0.001) {
        gl.useProgram(beam.p);
        enabled.forEach((l) => gl.disableVertexAttribArray(l));
        enabled = [attrib(beam, 'aQuad', quad, 2)];
        const half = 60;
        gl.uniform2f(beam.u.uRes, r.w, r.h);
        gl.uniform3f(beam.u.uLine, r.beam.x, r.beam.y, r.beam.width / 2);
        gl.uniform1f(beam.u.uHalf, half);
        gl.uniform3fv(beam.u.uColor, th.rgb.beam);
        gl.uniform1f(beam.u.uAlpha, r.scan * r.alpha * (th.blend === 'add' ? 0.9 : 0.75));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    },

    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

// ------------------------------------------------------------------ SVG fallback
/**
 * Replaces the canvas with a div holding the static point SVG. The div takes
 * over the canvas's class, style and attributes so page CSS keeps applying.
 */
function createSvgFallback(canvas) {
  const host = document.createElement('div');
  for (const { name, value } of canvas.attributes) {
    if (name !== 'width' && name !== 'height') host.setAttribute(name, value);
  }
  host.setAttribute('aria-hidden', 'true');
  host.dataset.face3d = 'svg';
  const img = document.createElement('div');
  img.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;will-change:transform,opacity';
  host.append(img);
  canvas.replaceWith(host);
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  if (getComputedStyle(host).display === 'inline') host.style.display = 'block';
  host.style.overflow = 'hidden';

  fetch(SVG_URL)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`face3d: svg HTTP ${r.status}`))))
    .then((txt) => {
      img.innerHTML = txt;
      const svg = img.firstElementChild;
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.display = 'block';
    })
    .catch(() => {});

  return {
    host,
    draw(r) {
      // Place the SVG box so model units line up with the WebGL projection
      // (front plane), then fake the yaw with a CSS 3D turn.
      const k = r.scale * CAMERA / (CAMERA - 4);
      const [bx, by, bw, bh] = SVG_BOX;
      img.style.width = `${bw * k}px`;
      img.style.height = `${bh * k}px`;
      img.style.color = r.theme.front;
      const left = r.cx + (bx - PIVOT[0]) * k;
      const top = r.cy + (by + PIVOT[1]) * k;
      const ox = (PIVOT[0] - bx) * k, oy = (-PIVOT[1] - by) * k;
      img.style.transformOrigin = `${ox}px ${oy}px`;
      img.style.transform = `translate(${left}px,${top}px) perspective(${(CAMERA * k).toFixed(0)}px) rotateX(${(r.pitchRad * 57.3).toFixed(2)}deg) rotateY(${(r.yawRad * 57.3).toFixed(2)}deg)`;
      img.style.opacity = (r.alpha * clamp(r.assemble * 1.4 - 0.2, 0, 1) * (r.theme.blend === 'add' ? 0.85 : 0.9)).toFixed(3);
    },
    destroy() {
      host.replaceWith(canvas);
    },
  };
}

// ------------------------------------------------------------------ public API
/**
 * createFace(canvas, opts)
 *   opts.theme        'dark' | 'light' | { blend, back, front, lit, beam, spot, point, line, glow, size } (default 'dark')
 *   opts.fit          face height at scale 1 as a share of the canvas (default 0.8)
 *   opts.damping      follow speed of all parameters, 1/s (default 6); Infinity snaps
 *   opts.ambient      shimmer, drift and breathing (default: off when reduced motion is requested)
 *   opts.initial      starting values, same shape as set() (applied without easing)
 *   opts.onFrame      called after every drawn frame with the face instance
 *   opts.forceFallback  use the SVG fallback even if WebGL works (testing)
 */
export function createFace(canvas, opts = {}) {
  const fit = opts.fit ?? 0.8;
  const damping = opts.damping ?? (reducedMotion() ? Infinity : 6);
  const ambient = opts.ambient ?? !reducedMotion();
  const listeners = new Set(opts.onFrame ? [opts.onFrame] : []);

  const target = { ...DEFAULTS, zoneGlow: { ...DEFAULTS.zoneGlow } };
  const cur = { ...DEFAULTS, zoneGlow: { ...DEFAULTS.zoneGlow }, scanOn: 0 };
  let theme = resolveTheme(opts.theme ?? 'dark');
  let mesh = null;
  let size = { w: 1, h: 1, dpr: 1 };
  let frame = null;              // last frame state, used by project()
  let visible = false;
  let raf = 0;
  let last = 0;
  let dirty = true;
  let destroyed = false;
  let drawnSync = false;

  let gl = null;
  try {
    gl = opts.forceFallback ? null : createGL(canvas);
  } catch (err) {
    console.warn(err);
  }
  let fallback = gl ? null : createSvgFallback(canvas);
  const surface = () => (fallback ? fallback.host : canvas);

  if (gl) {
    canvas.addEventListener('webglcontextlost', onContextLost);
  }
  function onContextLost(e) {
    e.preventDefault();
    gl = null;
    fallback = createSvgFallback(canvas);
    observe();
    invalidate();
  }

  // Resolves true once the mesh is on the GPU (or ready for project()), false if it failed.
  const ready = sharedMesh().then((m) => {
    if (destroyed) return false;
    mesh = m;
    gl?.setMesh(m);
    invalidate();
    return true;
  }, (err) => {
    console.warn(err);
    return false;
  });

  // Visibility and size.
  let io, ro;
  function observe() {
    io?.disconnect();
    ro?.disconnect();
    const el = surface();
    io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      invalidate();
    }, { rootMargin: '10% 0px' });
    io.observe(el);
    ro = new ResizeObserver(() => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      size = { w, h, dpr: Math.min(2, window.devicePixelRatio || 1) };
      gl?.resize(w, h, size.dpr);
      invalidate();
      // Redraw right away so a resize never shows a stretched or empty frame.
      if (visible) draw(performance.now());
    });
    ro.observe(el);
  }
  observe();
  document.addEventListener('visibilitychange', invalidate);

  // -------------------------------------------------------------- loop
  function invalidate() {
    dirty = true;
    if (!raf && visible && !destroyed && !document.hidden) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    const moving = step(dt);
    // set(..., { immediate }) may already have drawn this state synchronously
    if (!drawnSync) draw(now);
    drawnSync = false;
    dirty = false;
    // Keep going while something moves or the ambient shimmer is on.
    if (visible && !document.hidden && (moving || ambient)) raf = requestAnimationFrame(tick);
  }

  /** Eases every current value toward its target. Returns true while anything still moves. */
  function step(dt) {
    const k = damping === Infinity ? 1 : 1 - Math.exp(-dt * damping);
    let moving = false;
    const follow = (obj, tgt, key, eps = 1e-4) => {
      const d = tgt[key] - obj[key];
      if (Math.abs(d) < eps) obj[key] = tgt[key];
      else { obj[key] += d * k; moving = true; }
    };
    for (const key of ['assemble', 'yaw', 'pitch', 'x', 'y', 'scale', 'dim']) follow(cur, target, key);
    for (const key of ZONE_KEYS) follow(cur.zoneGlow, target.zoneGlow, key);
    // The scan line fades in and out; its position only follows while it is on.
    const on = target.scan >= 0 ? 1 : 0;
    follow(cur, { scanOn: on }, 'scanOn');
    if (on) {
      if (cur.scanOn < 0.02) cur.scan = target.scan;   // appear in place, do not slide in
      else follow(cur, target, 'scan');
    }
    return moving || dirty;
  }

  function frameState(now) {
    const { w, h, dpr } = size;
    const faceH = Math.min(h * fit, w * fit * FACE_H / FACE_W) * cur.scale;
    const scale = faceH / (FACE_H * CAMERA / (CAMERA - 4));
    const yawRad = cur.yaw * YAW_MAX;
    const pitchRad = cur.pitch * PITCH_MAX;
    const s = clamp(cur.scan, 0, 1);
    const scanY = SCAN_TOP + (SCAN_BOTTOM - SCAN_TOP) * s;
    // Soft fade at both ends of the sweep, so the line never pops at the edges.
    const edge = Math.min(1, s / 0.05, (1 - s) / 0.05);
    const r = {
      w, h, dpr, theme, scale, yawRad, pitchRad,
      rot: rotation(yawRad, -pitchRad),
      cx: w / 2 * (1 + cur.x),
      cy: h / 2 * (1 + cur.y),
      assemble: cur.assemble,
      alpha: 1 - cur.dim,
      time: ambient ? now / 1000 : 0,
      ambient: ambient ? 1 : 0,
      scanY,
      scan: cur.scanOn * Math.max(0, edge),
      zones: ZONE_KEYS.map((key) => cur.zoneGlow[key]),
    };
    // The line runs across the face at the height where it meets the front of the
    // face, centred on the face outline so it follows turns and offsets.
    const by = projectPoint([0, scanY, 5.2], r)[1];
    const b = (r.bounds = faceBounds(r));
    r.beam = { x: b.cx, y: by, width: b.width * 1.3 };
    return r;
  }

  function draw(now) {
    frame = frameState(now);
    if (gl) gl.draw(frame);
    else fallback.draw(frame);
    listeners.forEach((fn) => fn(api));
  }

  // -------------------------------------------------------------- projection
  function projectPoint(p, r) {
    const x = p[0] - PIVOT[0], y = p[1] - PIVOT[1], z = p[2] - PIVOT[2];
    const m = r.rot;
    const qx = m[0] * x + m[3] * y + m[6] * z;
    const qy = m[1] * x + m[4] * y + m[7] * z;
    const qz = m[2] * x + m[5] * y + m[8] * z;
    const k = r.scale * CAMERA / (CAMERA - qz);
    return [r.cx + qx * k, r.cy - qy * k, qz];
  }

  /** Screen box of the 468 landmarks; before the mesh loads, an estimate from the face size. */
  function faceBounds(r) {
    if (!mesh) {
      const hw = FACE_W / 2 * r.scale, hh = FACE_H / 2 * r.scale;
      return { left: r.cx - hw, top: r.cy - hh, right: r.cx + hw, bottom: r.cy + hh, width: hw * 2, height: hh * 2, cx: r.cx, cy: r.cy };
    }
    let l = Infinity, t = Infinity, rt = -Infinity, b = -Infinity;
    for (let i = 0; i < 468; i++) {
      const [x, y] = projectPoint(landmark(i), r);
      if (x < l) l = x;
      if (x > rt) rt = x;
      if (y < t) t = y;
      if (y > b) b = y;
    }
    return { left: l, top: t, right: rt, bottom: b, width: rt - l, height: b - t, cx: (l + rt) / 2, cy: (t + b) / 2 };
  }

  function landmark(i) {
    return [mesh.pos[i * 3], mesh.pos[i * 3 + 1], mesh.pos[i * 3 + 2]];
  }

  // -------------------------------------------------------------- API
  function set(params = {}, { immediate = false } = {}) {
    for (const key of ['assemble', 'yaw', 'pitch', 'x', 'y', 'scale', 'scan', 'dim']) {
      if (typeof params[key] === 'number' && Number.isFinite(params[key])) target[key] = params[key];
    }
    target.assemble = clamp(target.assemble, 0, 1);
    target.yaw = clamp(target.yaw, -1, 1);
    target.pitch = clamp(target.pitch, -1, 1);
    target.dim = clamp(target.dim, 0, 1);
    target.scale = Math.max(0, target.scale);
    if (target.scan >= 0) target.scan = Math.min(1, target.scan);
    if (params.zoneGlow) {
      for (const key of ZONE_KEYS) {
        const v = params.zoneGlow[key];
        if (typeof v === 'number') target.zoneGlow[key] = clamp(v, 0, 1);
      }
    }
    if (params.theme) theme = resolveTheme(params.theme);
    if (immediate) {
      Object.assign(cur, target, { zoneGlow: { ...target.zoneGlow }, scanOn: target.scan >= 0 ? 1 : 0 });
      // Draw right away, so a face driven from a scroll frame never trails the
      // page elements positioned in that same frame.
      if (visible && !document.hidden && size.w > 1) {
        draw(performance.now());
        drawnSync = true;
      }
    }
    invalidate();
    return api;
  }

  /**
   * Screen position (css px, relative to the canvas box) of a named point, using
   * the values of the last drawn frame. Returns null until the mesh is loaded.
   *   'stirn' | 'wangeL' | 'wangeR' | 'nase' | 'kinn'
   *        -> { x, y, depth, facing, glow }
   *   'bounds' -> { left, top, right, bottom, width, height, cx, cy }
   *   'scan'   -> { x, y, width, strength }
   */
  function project(name) {
    if (!mesh) return null;
    const r = frame ?? frameState(performance.now());
    if (name === 'scan') return { ...r.beam, strength: r.scan };
    if (name === 'bounds') return { ...r.bounds };
    const idx = LANDMARKS[name];
    if (idx === undefined) throw new Error(`face3d: unknown landmark "${name}"`);
    const p = landmark(idx);
    const [x, y, depth] = projectPoint(p, r);
    // How much the spot faces the viewer: 1 straight on, 0 edge on, < 0 turned away.
    // The head is treated as round around an axis 3 units behind the face.
    const m = r.rot, nx = p[0], nz = p[2] + 3;
    const facing = (m[2] * nx + m[8] * nz) / Math.max(1e-6, Math.hypot(nx, nz));
    return { x, y, depth, facing, glow: cur.zoneGlow[name] };
  }

  function onFrame(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function destroy() {
    destroyed = true;
    cancelAnimationFrame(raf);
    io?.disconnect();
    ro?.disconnect();
    document.removeEventListener('visibilitychange', invalidate);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    listeners.clear();
    gl?.destroy();
    fallback?.destroy();
  }

  const api = {
    set,
    project,
    onFrame,
    destroy,
    ready,
    get mode() { return gl ? 'webgl' : 'svg'; },
    get element() { return surface(); },
    get state() { return structuredClone({ ...cur, zoneGlow: cur.zoneGlow }); },
  };
  if (opts.initial) set(opts.initial, { immediate: true });
  return api;
}

function resolveTheme(t) {
  const base = typeof t === 'string' ? THEMES[t] ?? THEMES.dark : { ...THEMES[t.blend === 'over' ? 'light' : 'dark'], ...t };
  const rgb = {};
  for (const key of ['back', 'front', 'lit', 'beam', 'spot']) rgb[key] = hex(base[key]);
  return { ...base, rgb };
}
