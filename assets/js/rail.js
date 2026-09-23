/* Stat rail: one large number with a short label to the right of the phone,
   shared by every scene so the page speaks with one visual voice.

   Scenes call rail.set({ num, unit, label, k }) from update() while they are
   active; k (0..1) fades it. The rail helper, placed last in the stage, applies
   whatever was set this frame and hides the rail if nothing was. */

import { css, text, toggle } from './engine.js';

export function createRail(panel, phone) {
  const el = document.createElement('div');
  el.className = 'rail';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<span class="rail-rule"></span><b class="rail-num"><span></span><small></small></b><span class="rail-label"></span>';
  panel.appendChild(el);
  const num = el.querySelector('.rail-num span');
  const unit = el.querySelector('.rail-num small');
  const label = el.querySelector('.rail-label');

  /* Position from layout offsets, which ignore the panel's intro transform. */
  const copy = panel.querySelector('.stage-copy');
  const place = () => {
    if (window.innerWidth <= 1100 && copy) {
      // tablets: below the caption column, near the panel's bottom
      css(el, 'left', `${copy.offsetLeft}px`);
      css(el, 'top', `${panel.clientHeight - 120}px`);
      return;
    }
    const f = phone.frame;
    let x = f.offsetLeft, y = f.offsetTop, n = f.offsetParent;
    while (n && n !== panel) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    css(el, 'left', `${x + f.offsetWidth + 72}px`);
    css(el, 'top', `${y + f.offsetHeight * .5}px`);
  };
  new ResizeObserver(place).observe(panel);

  let want = null;
  const rail = {
    set(v) { want = v; },
    helper: {
      range: [0, 1],
      helper: true,
      update() {
        const k = want ? (want.k ?? 1) : 0;
        css(el, 'opacity', k.toFixed(3));
        css(el, 'transform', `translate(${((1 - k) * 12).toFixed(1)}px, -50%)`);
        if (want) {
          text(num, want.num);
          text(unit, want.unit || '');
          text(label, want.label || '');
          toggle(el, 'rail-small', String(want.num).length > 4);
        }
        want = null;
      },
    },
  };
  return rail;
}
