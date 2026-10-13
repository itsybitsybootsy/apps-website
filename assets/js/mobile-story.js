/* One initial forward gesture stops at the first phone. The rest scrolls natively.
   Geometry is measured on resize; scroll frames write transform + progress only. */
(function () {
  'use strict';
  var section = document.querySelector('#funktionen');
  if (!section) return;
  var media = window.matchMedia('(max-width:640px) and (prefers-reduced-motion:no-preference)');
  var story = null;
  var cleanup = null;
  // Keep this across breakpoint / reduced-motion remounts, but reset on reload.
  var entryUsed = false;

  function mount() {
    if (!media.matches || story) return;
    story = document.createElement('div');
    story.className = 'mobile-story';
    story.setAttribute('aria-label', 'Skinmetrics: Analyse, Routine und Fortschritt');
    story.innerHTML = '<div class="ms-sticky">'
      + '<div class="ms-heading" aria-hidden="true"><div class="ms-count"><b>01</b><span> / 03</span></div></div>'
      + '<div class="ms-window">'
      + '<figure class="ms-phone"><img src="assets/img/product/analysis.png" width="540" height="1114" alt="Analyse: Hautscore, Kennzahlen und Hautzonen" decoding="async"></figure>'
      + '<figure class="ms-phone"><img src="assets/img/product/routine.png" width="540" height="1114" alt="Routine: Hautpflege für morgens und abends" decoding="async"></figure>'
      + '<figure class="ms-phone"><img src="assets/img/product/progress.png" width="540" height="1114" alt="Fortschritt: Hautscore und Entwicklung im Verlauf" decoding="async"></figure>'
      + '</div>'
      + '<div class="ms-footer"><p class="ms-label" aria-hidden="true">Analyse</p>'
      + '<div class="ms-steps" role="group" aria-label="App-Ansicht wählen">'
      + '<button class="ms-step" type="button" aria-label="Analyse anzeigen" aria-current="step"></button>'
      + '<button class="ms-step" type="button" aria-label="Routine anzeigen"></button>'
      + '<button class="ms-step" type="button" aria-label="Verlauf anzeigen"></button></div></div>'
      + '<svg class="ms-border" aria-hidden="true"><rect class="ms-border-track"/><rect class="ms-border-fill" pathLength="100"/></svg>'
      + '</div>';
    section.appendChild(story);
    document.documentElement.classList.add('has-mobile-story');

    var sticky = story.querySelector('.ms-sticky');
    var frame = story.querySelector('.ms-window');
    var phones = Array.from(story.querySelectorAll('.ms-phone'));
    var steps = Array.from(story.querySelectorAll('.ms-step'));
    var border = story.querySelector('.ms-border');
    var fill = story.querySelector('.ms-border-fill');
    var count = story.querySelector('.ms-count b');
    var label = story.querySelector('.ms-label');
    var raf = 0, start = 0, distance = 1, width = 1, height = 1, span = 1;
    var index = -1, active = false;
    var entryMotion = null, entryRaf = 0, holdWheel = false;
    var wheelTime = -Infinity, touch = null, origin = null, previousY = window.scrollY;
    var phonePositions = [.275, .58, .91];
    var clamp = function (n) { return Math.min(1, Math.max(0, n)); };
    var phase = function (p, a, b) { return clamp((p - a) / (b - a)); };
    // C2 continuous: velocity AND acceleration settle at each reading position.
    // Direct mapping keeps touch scrolling reversible, without delayed interpolation.
    var smooth = function (n) { return n * n * n * (n * (n * 6 - 15) + 10); };

    function render() {
      raf = 0;
      var y = window.scrollY;
      var p = clamp((y - start) / distance);
      var visible = y > start - height && y < start + distance + height;
      // Clear the frame at completion, including fast jumps past the tour.
      // Scrolling back restores it from the same progress position.
      border.style.opacity = (phase(p, 0, .06) * (1 - smooth(phase(p, .985, 1)))).toFixed(3);
      border.style.visibility = p > 0 && p < 1 ? 'visible' : 'hidden';
      fill.style.strokeDashoffset = ((1 - p) * 100).toFixed(3);
      var nextActive = y >= start - 12 && y < start + distance + 12;
      if (nextActive !== active) {
        active = nextActive;
        document.documentElement.classList.toggle('mobile-scroll-active', active);
      }
      if (!visible && index !== -1) return;
      var zoom = .7 + .3 * smooth(phase(p, 0, .24));
      var slide = smooth(phase(p, .31, .53)) + smooth(phase(p, .63, .85));
      phones.forEach(function (phone, i) {
        var x = (i - slide) * span;
        var away = Math.min(1, Math.abs(i - slide));
        var scale = zoom * (1 - .025 * away);
        phone.style.transform = 'translate3d(calc(-50% + ' + x.toFixed(2) + 'px), calc(-50% + ' + (away * 6).toFixed(2) + 'px), 0) scale(' + scale.toFixed(4) + ')';
        phone.style.opacity = (1 - .18 * away).toFixed(3);
        // Keep the three renders composited. The window clips offscreen phones;
        // toggling visibility during a fast reversal can drop a frame in WebKit.
        phone.style.visibility = 'visible';
      });
      var nextIndex = Math.round(slide);
      if (nextIndex !== index) {
        index = nextIndex;
        count.textContent = '0' + (index + 1);
        label.textContent = ['Analyse', 'Routine', 'Verlauf'][index];
        steps.forEach(function (step, i) {
          if (i === index) step.setAttribute('aria-current', 'step');
          else step.removeAttribute('aria-current');
          phones[i].setAttribute('aria-hidden', i === index ? 'false' : 'true');
        });
      }
    }
    function queue() { if (!raf) raf = requestAnimationFrame(render); }
    function usedLength(el, name, fallback) {
      var raw = getComputedStyle(el).getPropertyValue(name).trim();
      var value = parseFloat(raw);
      if (value) return value;
      var probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;left:0;top:0;height:0;visibility:hidden;width:var(' + name + ')';
      el.appendChild(probe);
      value = probe.getBoundingClientRect().width;
      probe.remove();
      return value || fallback;
    }
    function measure() {
      var nextStart = story.getBoundingClientRect().top + window.scrollY;
      var box = sticky.getBoundingClientRect();
      var nextHeight = Math.round(box.height), nextWidth = Math.round(box.width);
      var nextDistance = Math.max(1, story.offsetHeight - nextHeight);
      // FAQ disclosure below the story need not rewrite the whole SVG frame.
      if (nextStart === start && nextHeight === height && nextWidth === width && nextDistance === distance) return;
      start = nextStart; height = nextHeight; width = nextWidth; distance = nextDistance;
      var host = sticky.getBoundingClientRect();
      var win = frame.getBoundingClientRect();
      span = win.width;
      var radius = usedLength(sticky, '--ms-frame-radius', 36);
      border.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      story.querySelectorAll('.ms-border rect').forEach(function (rect) {
        rect.setAttribute('x', String(win.left - host.left));
        rect.setAttribute('y', String(win.top - host.top));
        rect.setAttribute('width', String(Math.max(0, win.width)));
        rect.setAttribute('height', String(Math.max(0, win.height)));
        rect.setAttribute('rx', String(radius));
      });
      queue();
    }
    function entryPosition() { return start + distance * phonePositions[0]; }
    function releaseEntry() {
      cancelAnimationFrame(entryRaf);
      entryRaf = 0; entryMotion = null; holdWheel = false; origin = null;
    }
    function animateEntry(now) {
      entryRaf = 0;
      if (!entryMotion) return;
      var dt = Math.min(.032, Math.max(0, (now - entryMotion.time) / 1000));
      entryMotion.time = now;
      var destination = entryPosition();
      // Critically damped response 0.4s: this is only the initial arrival.
      var omega = 2 * Math.PI / .4;
      var delta = entryMotion.y - destination;
      var c = entryMotion.velocity + omega * delta;
      var decay = Math.exp(-omega * dt);
      entryMotion.y = destination + (delta + c * dt) * decay;
      entryMotion.velocity = (entryMotion.velocity - omega * c * dt) * decay;
      var done = Math.abs(entryMotion.y - destination) < .5 && Math.abs(entryMotion.velocity) < 5;
      window.scrollTo({ top:done ? destination : entryMotion.y, behavior:'instant' });
      cancelAnimationFrame(raf); render();
      if (done) entryMotion = null;
      else entryRaf = requestAnimationFrame(animateEntry);
    }
    function catchEntry(kind) {
      entryUsed = true;
      origin = null;
      holdWheel = kind === 'wheel';
      if (touch && kind === 'touch') touch.held = true;
      // A native fling can cross the boundary after touchend. Clamp before
      // painting, rather than animating backwards from a skipped screen.
      var y = Math.min(window.scrollY, entryPosition());
      window.scrollTo({ top:y, behavior:'instant' });
      entryMotion = { y:y, velocity:0, time:performance.now() };
      entryRaf = requestAnimationFrame(animateEntry);
    }
    function onWheel(event) {
      if (event.defaultPrevented) return;
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) { releaseEntry(); return; }
      var delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
      if (!delta) return;
      var now = performance.now(), fresh = now - wheelTime > 180;
      wheelTime = now;
      if (delta < 0) { releaseEntry(); return; }
      // Only the incoming burst is held. A new gesture is always the user's
      // own navigation, even if the arrival animation has not quite finished.
      if (holdWheel || entryMotion) {
        if (fresh) { releaseEntry(); return; }
        if (event.cancelable) event.preventDefault();
        return;
      }
      if (entryUsed) return;
      origin = 'wheel';
      if (window.scrollY < entryPosition() && window.scrollY + delta >= entryPosition() && event.cancelable) {
        event.preventDefault();
        catchEntry('wheel');
      }
    }
    function onTouchStart(event) {
      releaseEntry();
      if (entryUsed || event.touches.length !== 1) { touch = null; return; }
      var finger = event.touches[0];
      touch = { id:finger.identifier, x:finger.clientX, y:finger.clientY, lastY:finger.clientY, held:false, manual:false };
    }
    function onTouchMove(event) {
      if (!touch || event.touches.length !== 1) return;
      var finger = event.touches[0];
      if (finger.identifier !== touch.id) return;
      var delta = touch.lastY - finger.clientY;
      touch.lastY = finger.clientY;
      if (!delta || (!touch.held && !touch.manual && Math.abs(finger.clientX - touch.x) > Math.abs(finger.clientY - touch.y))) return;
      if (touch.manual || (touch.held && delta < 0)) {
        // Reversing the captured touch is free too. Native scrolling cannot
        // restart mid-touch after preventDefault, so follow this finger directly.
        releaseEntry(); touch.held = false; touch.manual = true;
        if (event.cancelable) event.preventDefault();
        window.scrollTo({ top:window.scrollY + delta, behavior:'instant' });
        return;
      }
      if (touch.held) { if (event.cancelable) event.preventDefault(); return; }
      if (delta < 0) { origin = null; return; }
      origin = 'touch';
      if (!entryUsed && window.scrollY < entryPosition() && window.scrollY + delta >= entryPosition() && event.cancelable) {
        event.preventDefault();
        catchEntry('touch');
      }
    }
    function onTouchEnd() { touch = null; }
    function onTouchCancel() { touch = null; releaseEntry(); }
    function onScroll() {
      var y = window.scrollY;
      if (!entryUsed && y >= entryPosition()) {
        if (origin && y > previousY && previousY < entryPosition()) catchEntry(origin);
        else entryUsed = true; // Deep links and restored positions are never trapped.
      }
      previousY = window.scrollY;
      queue();
    }
    function onNavigate() { touch = null; releaseEntry(); }
    function restore() {
      onNavigate(); measure();
      previousY = window.scrollY;
      if (window.scrollY >= entryPosition() - 1) entryUsed = true;
      queue();
    }
    steps.forEach(function (step, i) {
      step.addEventListener('click', function () {
        entryUsed = true;
        onNavigate();
        window.scrollTo({ top:start + phonePositions[i] * distance, behavior:'smooth' });
      });
    });
    window.addEventListener('scroll', onScroll, { passive:true });
    window.addEventListener('wheel', onWheel, { passive:false });
    window.addEventListener('touchstart', onTouchStart, { passive:true });
    window.addEventListener('touchmove', onTouchMove, { passive:false });
    window.addEventListener('touchend', onTouchEnd, { passive:true });
    window.addEventListener('touchcancel', onTouchCancel, { passive:true });
    window.addEventListener('keydown', onNavigate);
    document.addEventListener('click', onNavigate, true);
    window.addEventListener('resize', measure);
    window.addEventListener('pageshow', restore);
    // Content above the tour can change size after image/font loading.
    var resize = new ResizeObserver(measure);
    resize.observe(document.body);
    resize.observe(sticky);
    measure();
    if (window.scrollY >= entryPosition() - 1) entryUsed = true;
    // Position every phone before the first paint, also on restored scroll positions.
    cancelAnimationFrame(raf);
    render();
    cleanup = function () {
      cancelAnimationFrame(raf);
      releaseEntry();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
      window.removeEventListener('keydown', onNavigate);
      document.removeEventListener('click', onNavigate, true);
      window.removeEventListener('resize', measure);
      window.removeEventListener('pageshow', restore);
      resize.disconnect();
      document.documentElement.classList.remove('has-mobile-story', 'mobile-scroll-active');
      story.remove(); story = null;
    };
  }
  function sync() {
    if (media.matches) mount();
    else if (cleanup) { cleanup(); cleanup = null; }
  }
  media.addEventListener('change', sync);
  sync();
})();
