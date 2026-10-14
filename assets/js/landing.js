/* Product tabs, the photo comparison and the existing magnetic CTA feel. */
(function () {
  'use strict';
  // Store presentation only: Safari keeps the iOS badge; Chrome also previews
  // Android. No Google Play link is offered until the app is published there.
  var userAgent = navigator.userAgent;
  var isChrome = /(?:Chrome|CriOS)\//.test(userAgent) && !/(?:Edg|EdgiOS|EdgA|OPR|Opera|SamsungBrowser)\//.test(userAgent);
  document.querySelectorAll('[data-google-play]').forEach(function (badge) {
    badge.hidden = !isChrome;
  });
  document.querySelectorAll('[data-explorer]').forEach(function (explorer) {
    var tabs = Array.from(explorer.querySelectorAll('[role="tab"]'));
    var panels = Array.from(explorer.querySelectorAll('[role="tabpanel"]'));
    function select(index) {
      tabs.forEach(function (tab, i) {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
        panels[i].classList.toggle('on', i === index);
        panels[i].setAttribute('aria-hidden', String(i !== index));
      });
    }
    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function (event) {
        explorer.toggleAttribute('data-instant', event.detail === 0);
        select(index);
      });
      tab.addEventListener('keydown', function (event) {
        var next = index;
        var direction = document.documentElement.dir === 'rtl' ? -1 : 1;
        if (event.key === 'ArrowRight') next = (index + tabs.length + direction) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index + tabs.length - direction) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        explorer.setAttribute('data-instant', '');
        select(next); tabs[next].focus();
      });
    });
    select(0);
  });

  // Keep native details semantics, with interruptible pointer-only disclosure.
  var reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)');
  document.querySelectorAll('.faq-list details').forEach(function (details) {
    var summary = details.querySelector('summary');
    var animation = null, targetOpen = details.open;
    function settle() {
      if (!animation) return;
      animation.onfinish = null;
      animation.cancel();
      animation = null;
      details.open = targetOpen;
      details.style.height = '';
      details.style.overflow = '';
      details.removeAttribute('data-expanded');
    }
    summary.addEventListener('click', function (event) {
      if (event.detail === 0 || reducedMotion.matches || !details.animate) { settle(); return; }
      event.preventDefault();
      var from = details.getBoundingClientRect().height;
      targetOpen = animation ? !targetOpen : !details.open;
      details.style.height = from + 'px';
      details.style.overflow = 'hidden';
      if (animation) { animation.onfinish = null; animation.cancel(); }
      details.open = true;
      details.setAttribute('data-expanded', String(targetOpen));
      details.style.height = 'auto';
      var styles = getComputedStyle(details);
      var to = targetOpen ? details.getBoundingClientRect().height
        : summary.getBoundingClientRect().height + parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
      details.style.height = from + 'px';
      var next = details.animate([{ height:from + 'px' }, { height:to + 'px' }], {
        duration:200, easing:getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim(), fill:'forwards'
      });
      animation = next;
      next.onfinish = function () { if (animation === next) settle(); };
    });
    details.addEventListener('pointerdown', function () { details.removeAttribute('data-instant'); });
    details.addEventListener('keydown', function () { details.setAttribute('data-instant', ''); settle(); });
    details.addEventListener('toggle', function () { if (!animation) targetOpen = details.open; });
    reducedMotion.addEventListener('change', function () { if (reducedMotion.matches) settle(); });
    window.addEventListener('resize', settle);
  });

  var faqList = document.querySelector('.faq-list');
  var faqMore = faqList && faqList.querySelector('[data-faq-more]');
  if (faqList && faqMore) {
    var faqLabel = faqMore.querySelector('[data-faq-label]');
    faqList.classList.add('is-collapsed');
    faqMore.addEventListener('click', function () {
      var expanded = !faqList.classList.toggle('is-collapsed');
      faqMore.setAttribute('aria-expanded', String(expanded));
      if (faqLabel) {
        var key = expanded ? 'faq.less' : 'faq.more';
        faqLabel.setAttribute('data-i18n', key);
        faqLabel.textContent = window.SkinmetricsI18n ? window.SkinmetricsI18n.t(key) : expanded ? 'Weniger Fragen' : 'Weitere Fragen';
      }
      if (!expanded) faqList.querySelectorAll('.faq-extra').forEach(function (item) { item.open = false; });
    });
  }

  // CSS owns the constant motion; JS only measures and controls playback.
  document.querySelectorAll('[data-reviews-marquee]').forEach(function (ribbon) {
    var track = ribbon.querySelector('.rev-track');
    var set = ribbon.querySelector('.rev-set');
    var inView = false;
    function sync() {
      ribbon.classList.toggle('is-visible', inView && !document.hidden);
    }
    function measure() {
      var width = set.getBoundingClientRect().width;
      if (!width) return;
      track.style.setProperty('--rev-shift', width + 'px');
      track.style.setProperty('--rev-dur', width / 36 + 's');
    }
    var observer = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting; sync();
    });
    observer.observe(ribbon);
    var resize = new ResizeObserver(measure);
    resize.observe(set);
    document.addEventListener('visibilitychange', sync);
    measure();
  });

  var pointer = window.matchMedia('(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
  var teardown = null;
  function syncPointer() {
    if (teardown) { teardown(); teardown = null; }
    if (!pointer.matches) return;
    var disposers = [];
    document.querySelectorAll('[data-magnetic]').forEach(function (button) {
      var x = 0, y = 0, tx = 0, ty = 0, hot = false, pressed = false;
      var scale = 1, frame = 0, lastTime = 0;
      function tick(now) {
        frame = 0;
        var elapsed = lastTime ? Math.min(64, now - lastTime) : 1000 / 60;
        lastTime = now;
        // Same response at 60/120 Hz; use the existing smoothing factor.
        var blend = 1 - Math.pow(1 - .34, elapsed / (1000 / 60));
        x += (tx - x) * blend;
        y += (ty - y) * blend;
        var targetScale = pressed ? .97 : hot ? 1.02 : 1;
        scale += (targetScale - scale) * blend;
        button.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px) scale(' + scale.toFixed(4) + ')';
        if (Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(targetScale - scale) > .002) wake();
        else { lastTime = 0; if (!hot && !pressed) button.style.transform = ''; }
      }
      function wake() { if (!frame) frame = requestAnimationFrame(tick); }
      function enter() { hot = true; wake(); }
      function move(event) {
        var r = button.getBoundingClientRect();
        // Measure from the resting center, not the translated button itself.
        tx = Math.max(-8, Math.min(8, (event.clientX - (r.left + r.width / 2 - x)) * .21));
        ty = Math.max(-6, Math.min(6, (event.clientY - (r.top + r.height / 2 - y)) * .21));
        wake();
      }
      function leave() { hot = false; pressed = false; tx = 0; ty = 0; wake(); }
      function down() { pressed = true; wake(); }
      function up() { pressed = false; wake(); }
      var listeners = { pointerenter:enter, pointermove:move, pointerleave:leave, pointerdown:down, pointerup:up, pointercancel:leave, blur:leave };
      Object.keys(listeners).forEach(function (name) { button.addEventListener(name, listeners[name]); });
      disposers.push(function () {
        cancelAnimationFrame(frame);
        button.style.transform = '';
        Object.keys(listeners).forEach(function (name) { button.removeEventListener(name, listeners[name]); });
      });
    });
    // Restore the original desktop hero's small, interruptible spring tilt.
    document.querySelectorAll('[data-tilt-area]').forEach(function (area) {
      var device = area.querySelector('[data-tilt]');
      var x = 0, y = 0, tx = 0, ty = 0, vx = 0, vy = 0, frame = 0;
      var max = Number(device.getAttribute('data-tilt')) || 5;
      function tick() {
        frame = 0;
        vx = (vx + (tx - x) * .18) * .72;
        vy = (vy + (ty - y) * .18) * .72;
        x += vx; y += vy;
        device.style.transform = 'perspective(1100px) rotateY(' + x.toFixed(3) + 'deg) rotateX(' + y.toFixed(3) + 'deg)';
        if (Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(vx) + Math.abs(vy) > .002) wake();
        else if (!tx && !ty) device.style.transform = '';
      }
      function wake() { if (!frame) frame = requestAnimationFrame(tick); }
      function move(event) {
        var r = area.getBoundingClientRect();
        tx = ((event.clientX - r.left) / r.width - .5) * max;
        ty = ((event.clientY - r.top) / r.height - .5) * -max;
        wake();
      }
      function leave() { tx = 0; ty = 0; wake(); }
      area.addEventListener('pointermove', move);
      area.addEventListener('pointerleave', leave);
      disposers.push(function () {
        cancelAnimationFrame(frame); device.style.transform = '';
        area.removeEventListener('pointermove', move);
        area.removeEventListener('pointerleave', leave);
      });
    });
    document.querySelectorAll('[data-pointer-stage]').forEach(function (stage) {
      function move(event) {
        var r = stage.getBoundingClientRect();
        stage.style.setProperty('--hx', (event.clientX - r.left) / r.width * 100 + '%');
        stage.style.setProperty('--hy', (event.clientY - r.top) / r.height * 100 + '%');
      }
      function enter() { stage.classList.add('is-lit'); }
      function leave() { stage.classList.remove('is-lit'); }
      stage.addEventListener('pointermove', move);
      stage.addEventListener('pointerenter', enter);
      stage.addEventListener('pointerleave', leave);
      disposers.push(function () {
        leave(); stage.style.removeProperty('--hx'); stage.style.removeProperty('--hy');
        stage.removeEventListener('pointermove', move);
        stage.removeEventListener('pointerenter', enter);
        stage.removeEventListener('pointerleave', leave);
      });
    });
    teardown = function () { disposers.forEach(function (dispose) { dispose(); }); };
  }
  pointer.addEventListener('change', syncPointer);
  syncPointer();
})();
