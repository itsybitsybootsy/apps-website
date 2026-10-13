/* Keep the native top layer alive until the visual exit has finished.
   Safari does not reliably defer hidePopover() with display/overlay transitions. */
(function () {
  'use strict';
  var panel = document.getElementById('desktop-menu');
  var trigger = document.querySelector('[data-desktop-menu-trigger]');
  if (!panel || !trigger) return;
  var root = document.documentElement;
  var shell = panel.querySelector('.desktop-menu-shell');
  var closeButton = panel.querySelector('.desktop-menu-close');
  var desktop = window.matchMedia('(min-width:641px)');
  var reduced = window.matchMedia('(prefers-reduced-motion:reduce)');
  var state = 'closed';
  var closeTimer = 0, restoreFocus = false;
  function instant() { return !desktop.matches || reduced.matches || panel.hasAttribute('data-instant'); }
  function cancelPending() { clearTimeout(closeTimer); }
  function setState(next) { state = next; panel.setAttribute('data-state', next); }
  function finishClose() {
    if (state !== 'closing') return;
    cancelPending();
    var active = document.activeElement;
    var returnFocus = restoreFocus && (active === document.body || active === trigger || panel.contains(active));
    setState('closed');
    // Restore the trigger BEFORE removing the card. There is no empty frame.
    root.classList.remove('desktop-menu-present', 'desktop-menu-closing');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.tabIndex = 0;
    if (panel.matches(':popover-open')) panel.hidePopover();
    if (returnFocus && desktop.matches) trigger.focus({ preventScroll:true });
  }
  function open() {
    if (!desktop.matches || state === 'open' || state === 'opening') return;
    cancelPending();
    restoreFocus = false;
    panel.inert = false;
    root.classList.add('desktop-menu-present');
    root.classList.remove('desktop-menu-closing');
    trigger.setAttribute('aria-expanded', 'true');
    trigger.tabIndex = -1;
    if (panel.matches(':popover-open')) {
      // A reversal changes only visual state, never hides/recreates the surface.
      setState('open');
    } else {
      setState('opening');
      panel.showPopover();
      if (instant()) setState('open');
      else {
        // Establish the collapsed silhouette before changing the visual target.
        // Flush the initial style synchronously. Safari can suspend animation
        // frames for an occluded window, leaving a disclosure stuck at entry.
        shell.getBoundingClientRect();
        window.getComputedStyle(shell).clipPath;
        setState('open');
      }
    }
    closeButton.focus({ preventScroll:true });
  }
  function close(shouldRestoreFocus) {
    if (state === 'closed') return;
    restoreFocus = Boolean(shouldRestoreFocus);
    if (state === 'closing') { if (instant()) finishClose(); return; }
    cancelPending();
    setState('closing');
    panel.inert = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (instant()) finishClose();
    else {
      root.classList.add('desktop-menu-closing');
      // Fallback for interrupted transitions/background tabs. CSS ends at 400ms.
      closeTimer = setTimeout(finishClose, 450);
    }
  }
  panel.querySelectorAll('.desktop-menu-column').forEach(function (column) {
    Array.from(column.children).forEach(function (item, index) { item.style.setProperty('--menu-order', index); });
  });
  panel.addEventListener('transitionend', function (event) {
    if (event.target === panel && event.propertyName === 'opacity') finishClose();
  });
  // Recover cleanly if the browser dismisses the top layer during a resize/navigation.
  panel.addEventListener('toggle', function (event) {
    if (event.newState === 'closed' && state !== 'closed' && !panel.matches(':popover-open')) {
      setState('closing'); finishClose();
    }
  });
  function usePointer() { panel.removeAttribute('data-instant'); panel.setAttribute('data-pointer', ''); }
  [trigger, closeButton].forEach(function (button) {
    button.addEventListener('pointerdown', usePointer);
    button.addEventListener('keydown', function () {
      panel.setAttribute('data-instant', ''); panel.removeAttribute('data-pointer');
    });
  });
  trigger.addEventListener('click', function () {
    if (state === 'closed' || state === 'closing') open();
    else close(true);
  });
  closeButton.addEventListener('click', function () { close(true); });
  document.addEventListener('pointerdown', function (event) {
    if (state === 'closed') return;
    usePointer();
    if (!panel.contains(event.target) && !trigger.contains(event.target)) close(false);
  }, { capture:true });
  document.addEventListener('keydown', function (event) {
    if (state === 'closed') return;
    panel.removeAttribute('data-pointer');
    if (event.key === 'Escape') {
      event.preventDefault(); panel.setAttribute('data-instant', ''); close(true);
    } else if (event.key === 'Enter') panel.setAttribute('data-instant', '');
  });
  panel.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { close(false); });
  });
  desktop.addEventListener('change', function () { if (!desktop.matches) close(false); });
  reduced.addEventListener('change', function () { if (reduced.matches && state === 'closing') finishClose(); });
})();
