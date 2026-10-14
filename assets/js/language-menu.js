(function () {
  'use strict';
  var api = window.SkinmetricsI18n;
  var dialog = document.getElementById('language-dialog');
  if (!api || !dialog || !dialog.showModal) return;
  var panel = dialog.querySelector('.language-panel');
  var list = dialog.querySelector('[data-language-options]');
  var closeButton = dialog.querySelector('[data-language-close]');
  var reduced = window.matchMedia('(prefers-reduced-motion:reduce)');
  var languages = api.getLanguages(), buttons = [], animations = [];
  var opener = null, closing = false, version = 0, outsidePress = false;

  function render() {
    var browser = languages.find(function (language) { return language.code === api.getBrowserLocale(); });
    list.replaceChildren(); buttons = [];
    var options = [{ code:'auto', name:api.t('language.auto'), hint:browser ? browser.name : '' }].concat(
      languages.map(function (language) { return { code:language.code, name:language.name, dir:language.dir, hint:'' }; })
    );
    options.forEach(function (language) {
      var automatic = language.code === 'auto';
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'language-option' + (automatic ? ' language-option-auto' : '');
      button.dataset.language = language.code;
      button.setAttribute('aria-pressed', String(api.getChoice() === language.code));
      var text = document.createElement('span');
      text.className = 'language-option-text';
      var primary = document.createElement('span');
      primary.className = 'language-option-name';
      primary.textContent = language.name;
      if (!automatic) { primary.lang = language.code; primary.dir = language.dir; }
      text.appendChild(primary);
      if (automatic && language.hint) {
        var secondary = document.createElement('span');
        secondary.className = 'language-option-detail';
        secondary.textContent = language.hint;
        text.appendChild(secondary);
      }
      button.appendChild(text);
      var check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      check.setAttribute('viewBox', '0 0 24 24');
      check.setAttribute('width', '19'); check.setAttribute('height', '19');
      check.setAttribute('fill', 'none'); check.setAttribute('stroke', 'currentColor');
      check.setAttribute('stroke-width', '2'); check.setAttribute('stroke-linecap', 'round');
      check.setAttribute('stroke-linejoin', 'round'); check.setAttribute('aria-hidden', 'true');
      check.setAttribute('class', 'language-option-check');
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'm5 12 4 4L19 6'); check.appendChild(path); button.appendChild(check);
      button.addEventListener('click', function (event) {
        api.select(language.code, true);
        close(event.detail === 0);
      });
      list.appendChild(button); buttons.push(button);
    });
  }

  function cancelMotion() {
    version++;
    animations.forEach(function (animation) { animation.onfinish = null; animation.cancel(); });
    animations = [];
  }
  function transition(opening, instant, fresh, done) {
    var fromOpacity = fresh ? '0' : getComputedStyle(dialog).opacity;
    var fromTransform = fresh ? 'translateY(10px) scale(.97)' : getComputedStyle(panel).transform;
    cancelMotion();
    if (instant || reduced.matches || !panel.animate) { done(); return; }
    var token = version;
    var timing = { duration:opening ? 200 : 160, easing:getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim() || 'ease-out' };
    var fade = dialog.animate([{ opacity:fromOpacity }, { opacity:opening ? 1 : 0 }], timing);
    var move = panel.animate([{ transform:fromTransform }, { transform:opening ? 'none' : 'translateY(10px) scale(.97)' }], timing);
    animations = [fade, move];
    fade.onfinish = function () { if (token === version) { cancelMotion(); done(); } };
  }
  function visible(element) { return element && element.isConnected && element.getClientRects().length && !element.closest('[inert]'); }
  function finishClose() {
    dialog.close(); closing = false;
    document.documentElement.classList.remove('language-dialog-open');
    var target = visible(opener) ? opener : document.querySelector('[data-desktop-menu-trigger]');
    if (visible(target)) target.focus({ preventScroll:true });
  }
  function close(instant) {
    if (!dialog.open || closing) return;
    closing = true;
    transition(false, !!instant, false, finishClose);
  }
  function open(event) {
    opener = event.currentTarget;
    var fresh = !dialog.open;
    closing = false;
    render();
    document.dispatchEvent(new CustomEvent('skinmetrics:languageopen'));
    document.documentElement.classList.add('language-dialog-open');
    if (fresh) dialog.showModal();
    closeButton.focus({ preventScroll:true });
    transition(true, event.detail === 0, fresh, function () {});
  }

  document.querySelectorAll('[data-language-open]').forEach(function (button) { button.addEventListener('click', open); });
  closeButton.addEventListener('click', function (event) { close(event.detail === 0); });
  dialog.addEventListener('cancel', function (event) { event.preventDefault(); close(true); });
  dialog.addEventListener('pointerdown', function (event) { outsidePress = event.target === dialog; });
  dialog.addEventListener('click', function (event) { if (outsidePress && event.target === dialog) close(false); });
  dialog.addEventListener('close', function () {
    cancelMotion(); closing = false;
    document.documentElement.classList.remove('language-dialog-open');
  });
  list.addEventListener('keydown', function (event) {
    var index = buttons.indexOf(document.activeElement), next = index;
    if (event.key === 'ArrowDown') next = Math.min(buttons.length - 1, index + 1);
    else if (event.key === 'ArrowUp') next = Math.max(0, index - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else return;
    event.preventDefault(); if (buttons[next]) buttons[next].focus();
  });
  document.addEventListener('skinmetrics:languagechange', function () { if (dialog.open) render(); });
  reduced.addEventListener('change', function () {
    if (!reduced.matches || !dialog.open) return;
    cancelMotion(); if (closing) finishClose();
  });
})();
