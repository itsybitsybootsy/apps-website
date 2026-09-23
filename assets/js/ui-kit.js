/* Shared pieces of the recreated Skinmetrics UI. Icons are drawn to read like
   SF Symbols at small sizes. All markup is decorative (the phone is aria-hidden);
   captions next to the phone carry the real text. */

const svg = (d, { w = 24, sw = 1.8, fill = 'none' } = {}) =>
  `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const icon = {
  house: (w) => svg('<path d="M3.5 10.5 12 4l8.5 6.5V19a1 1 0 0 1-1 1H15v-5.5H9V20H4.5a1 1 0 0 1-1-1z"/>', { w }),
  chart: (w) => svg('<path d="M3.5 19.5h17"/><path d="M5 15.5l4.5-4.5 3.5 3 6-6.5"/><path d="M15.5 7.5H19V11"/>', { w }),
  grid: (w) => svg('<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>', { w }),
  person: (w) => svg('<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20c.9-3.8 3.9-5.8 7.5-5.8s6.6 2 7.5 5.8"/>', { w }),
  scan: (w) => svg('<path d="M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5"/><circle cx="12" cy="11" r="2.6"/><path d="M8 17c.8-1.7 2.2-2.6 4-2.6s3.2.9 4 2.6"/>', { w }),
  check: (w) => svg('<path d="M5 12.5l4.2 4.2L19 7"/>', { w, sw: 2.6 }),
  xmark: (w) => svg('<path d="M6 6l12 12M18 6L6 18"/>', { w, sw: 2.2 }),
  sun: (w) => svg('<circle cx="12" cy="12" r="3.6"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>', { w }),
  moon: (w) => svg('<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>', { w }),
  chevron: (w) => svg('<path d="M9 5l7 7-7 7"/>', { w, sw: 2.2 }),
  chevronDown: (w) => svg('<path d="M5 9l7 7 7-7"/>', { w, sw: 2.2 }),
  plus: (w) => svg('<path d="M12 5v14M5 12h14"/>', { w, sw: 2.2 }),
  arrowDown: (w) => svg('<path d="M12 5v14M6 13l6 6 6-6"/>', { w, sw: 2.4 }),
  arrowUp: (w) => svg('<path d="M12 19V5M6 11l6-6 6 6"/>', { w, sw: 2.4 }),
  arrowLeft: (w) => svg('<path d="M19 12H5M11 6l-6 6 6 6"/>', { w, sw: 2.4 }),
  arrowRight: (w) => svg('<path d="M5 12h14M13 6l6 6-6 6"/>', { w, sw: 2.4 }),
  sparkles: (w) => svg('<path d="M12 3.5l1.6 4.4 4.4 1.6-4.4 1.6L12 15.5l-1.6-4.4L6 9.5l4.4-1.6z"/><path d="M18.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>', { w, sw: 1.5 }),
  shield: (w) => svg('<path d="M12 3.5l7 2.8v5.2c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6.3z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.6"/>', { w }),
  flame: (w) => svg('<path d="M12 21c3.9 0 6.5-2.6 6.5-6.2 0-3.4-2.4-5.6-3.6-8.3-.5 1.9-1.6 3-2.9 3.6.2-2.9-.9-5.4-3-7.1.2 3.1-1.5 5.1-2.9 6.9C4.9 11.6 5.5 13 5.5 14.8 5.5 18.4 8.1 21 12 21z"/>', { w }),
  medal: (w) => svg('<circle cx="12" cy="14" r="5.5"/><path d="M8.5 9.6 6 3.5h4l2 4.2 2-4.2h4l-2.5 6.1"/><path d="M12 11.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z" fill="currentColor" stroke="none"/>', { w, sw: 1.6 }),
  drop: (w) => svg('<path d="M12 3.5c3.2 4 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2.3-6 5.5-10z"/>', { w }),
  bottle: (w) => svg('<path d="M10 2.5h4v3h-4z"/><path d="M9 5.5h6l1 3v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-11z"/><path d="M8.5 12h7"/>', { w, sw: 1.6 }),
  jar: (w) => svg('<rect x="5" y="8" width="14" height="12" rx="3"/><path d="M6.5 8V5.5h11V8"/><path d="M5 12.5h14"/>', { w, sw: 1.6 }),
};

/* iOS status bar, 9:41 like every Apple marketing shot. `tone` is 'dark' or 'light'. */
export function statusBar(tone = 'dark') {
  return `<div class="sb sb-${tone}">
    <span class="sb-time">9:41</span>
    <span class="sb-icons">
      <svg viewBox="0 0 18 12" width="18" height="12"><rect x="0" y="8" width="3" height="4" rx=".8"/><rect x="5" y="5.5" width="3" height="6.5" rx=".8"/><rect x="10" y="3" width="3" height="9" rx=".8"/><rect x="15" y="0" width="3" height="12" rx=".8"/></svg>
      <svg viewBox="0 0 16 12" width="16" height="12"><path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.2-1.3A10.3 10.3 0 0 0 8 .4 10.3 10.3 0 0 0 .8 3.3L2 4.6a8.6 8.6 0 0 1 6-2.4zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.3-1.3A6.6 6.6 0 0 0 8 4a6.6 6.6 0 0 0-4.7 1.8l1.3 1.3A4.9 4.9 0 0 1 8 5.8zM8 9.5l1.9-1.9a2.8 2.8 0 0 0-3.8 0z"/></svg>
      <svg viewBox="0 0 27 13" width="27" height="13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.5"/><path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2z" opacity=".45"/></svg>
    </span>
  </div>`;
}

/* Bottom tab bar with the round scan button in the middle, as in MainTabView. */
export function tabBar(active = 'heute') {
  const item = (key, label, ic) =>
    `<span class="tab${key === active ? ' on' : ''}" data-tab="${key}">${ic(24)}<b>${label}</b></span>`;
  return `<nav class="tabbar">
    ${item('heute', 'Heute', icon.house)}
    ${item('verlauf', 'Verlauf', icon.chart)}
    <span class="tab-scan" data-scan-btn>${icon.scan(28)}</span>
    ${item('routine', 'Routine', icon.grid)}
    ${item('profil', 'Profil', icon.person)}
  </nav>`;
}

/* Parses an HTML string into a single element. */
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
