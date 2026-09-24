/* Live iPhone: a fixed 393 × 852 point canvas of HTML (the logical size of an
   iPhone 17 screen) scaled to whatever size the frame has on the page. Scenes
   build their screens inside `ui` and design in real iOS points.

   The finger is a touch indicator like iOS screen recordings show. Scenes
   describe it with keyframes, so it scrubs backwards cleanly. */

import { clamp, lerp, ease, css } from './engine.js?v=3';

export const UI_W = 393;
export const UI_H = 852;

export function mountPhone(frame) {
  const screen = frame.querySelector('.iphone-screen');
  const ui = frame.querySelector('.ui');
  const fingerEl = document.createElement('div');
  fingerEl.className = 'finger';
  fingerEl.setAttribute('aria-hidden', 'true');
  ui.appendChild(fingerEl);

  const phone = { frame, screen, ui, scale: 1 };

  const fit = () => {
    phone.scale = screen.clientWidth / UI_W;
    ui.style.setProperty('--s', phone.scale);
  };
  new ResizeObserver(fit).observe(screen);
  fit();

  /* Scenes add their screens here; later screens stack above earlier ones,
     the finger always stays on top. */
  phone.addScreen = el => { ui.insertBefore(el, fingerEl); return el; };

  /* Center of an element in UI points, transforms included. */
  phone.at = (el, dx = 0, dy = 0) => {
    // the rendered scale includes any zoom applied to the phone from outside
    const u = ui.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const k = u.width / UI_W || phone.scale;
    return [
      (r.left + r.width / 2 - u.left) / k + dx,
      (r.top + r.height / 2 - u.top) / k + dy,
    ];
  };

  /* Finger state: x, y in UI points; show 0..1; press 0..1 */
  phone.finger = ({ x = UI_W / 2, y = UI_H + 60, show = 0, press = 0 } = {}) => {
    css(fingerEl, 'transform', `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(1 - press * .22).toFixed(3)})`);
    css(fingerEl, 'opacity', show.toFixed(3));
    css(fingerEl, '--press', press.toFixed(3));
  };
  phone.finger();

  return phone;
}

/**
 * Evaluate a finger path at local time t.
 * keys: [{ t, at: [x, y] | Element | () => [x, y], show?, press? }, ...] sorted by t.
 * Position eases between keys; show and press interpolate linearly.
 * A key with `tap: true` produces a short press pulse centred on its t.
 */
export function fingerPath(phone, t, keys) {
  const pos = k => (typeof k.at === 'function' ? k.at() : k.at instanceof Element ? phone.at(k.at) : k.at);
  let i = 0;
  while (i < keys.length - 1 && t > keys[i + 1].t) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const span = b.t - a.t;
  const u = span > 0 ? clamp((t - a.t) / span) : 0;
  const e = ease.inOut(u);
  const pa = pos(a), pb = pos(b);
  const show = lerp(a.show ?? 1, b.show ?? 1, u);
  let press = lerp(a.press ?? 0, b.press ?? 0, u);
  for (const k of keys) {
    if (!k.tap) continue;
    const d = Math.abs(t - k.t);
    const w = k.tapWidth ?? .035;
    if (d < w) press = Math.max(press, Math.cos((d / w) * Math.PI / 2));
  }
  return { x: lerp(pa[0], pb[0], e), y: lerp(pa[1], pb[1], e), show, press };
}
