/* One initial forward gesture stops at the first phone. The rest scrolls natively.
   The frame follows the visual viewport immediately, without easing its size. */
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
    story.setAttribute('data-i18n-aria-label', 'story.label');
    story.innerHTML = '<div class="ms-sticky">'
      + '<div class="ms-heading" aria-hidden="true"><div class="ms-count"><b>01</b><span> / 03</span></div></div>'
      + '<div class="ms-window">'
      + '<figure class="ms-phone"><img src="assets/img/product/analysis.png" width="540" height="1114" data-i18n-alt="story.analysisAlt" alt="Analyse: Hautscore, Kennzahlen und Hautzonen" decoding="async"></figure>'
      + '<figure class="ms-phone"><img src="assets/img/product/routine.png" width="540" height="1114" data-i18n-alt="story.routineAlt" alt="Routine: Hautpflege für morgens und abends" decoding="async"></figure>'
      + '<figure class="ms-phone"><img src="assets/img/product/progress.png" width="540" height="1114" data-i18n-alt="story.progressAlt" alt="Fortschritt: Hautscore und Entwicklung im Verlauf" decoding="async"></figure>'
      + '</div>'
      + '<div class="ms-footer"><p class="ms-label" data-i18n="features.analysis" aria-hidden="true">Analyse</p>'
      + '<div class="ms-steps" role="group" data-i18n-aria-label="story.choose" aria-label="App-Ansicht wählen">'
      + '<button class="ms-step" type="button" data-i18n-aria-label="story.showAnalysis" aria-label="Analyse anzeigen" aria-current="step"></button>'
      + '<button class="ms-step" type="button" data-i18n-aria-label="story.showRoutine" aria-label="Routine anzeigen"></button>'
      + '<button class="ms-step" type="button" data-i18n-aria-label="story.showProgress" aria-label="Verlauf anzeigen"></button></div></div>'
      + '<svg class="ms-border" aria-hidden="true"><rect class="ms-border-track"/><rect class="ms-border-fill" pathLength="100"/></svg>'
      + '</div>';
    section.appendChild(story);
    if (window.SkinmetricsI18n) window.SkinmetricsI18n.apply(story);
    document.documentElement.classList.add('has-mobile-story');

    var sticky = story.querySelector('.ms-sticky');
    var frame = story.querySelector('.ms-window');
    var phones = Array.from(story.querySelectorAll('.ms-phone'));
    var steps = Array.from(story.querySelectorAll('.ms-step'));
    var border = story.querySelector('.ms-border');
    var fill = story.querySelector('.ms-border-fill');
    var count = story.querySelector('.ms-count b');
    var label = story.querySelector('.ms-label');
    var viewport = window.visualViewport, viewportHeight = 0;
    var raf = 0, start = 0, distance = 1, width = 1, height = 1, span = 1;
    var index = -1, active = false;
    var entryMotion = null, entryRaf = 0;
    var entryCeiling = false;
    var zoomEnd = .24;
    var touch = null, origin = null, previousY = window.scrollY;
    var swipe = null;
    var phonePositions = [.275, .58, .91];
    var clamp = function (n) { return Math.min(1, Math.max(0, n)); };
    var phase = function (p, a, b) { return clamp((p - a) / (b - a)); };
    // C2 continuous: velocity AND acceleration settle at each reading position.
    // Direct mapping keeps touch scrolling reversible, without delayed interpolation.
    var smooth = function (n) { return n * n * n * (n * (n * 6 - 15) + 10); };
    function slideAt(p) {
      return smooth(phase(p, .31, .53)) + smooth(phase(p, .63, .85));
    }
    function progressAtSlide(slide) {
      if (slide === Math.round(slide)) return phonePositions[slide];
      var segment = Math.floor(slide), fraction = slide - segment;
      // Invert the existing scroll curve so a horizontal drag tracks the finger
      // 1:1 while keeping the vertical position and progress frame in sync.
      var low = 0, high = 1;
      for (var i = 0; i < 16; i++) {
        var mid = (low + high) / 2;
        if (smooth(mid) < fraction) low = mid;
        else high = mid;
      }
      return (segment ? .63 : .31) + .22 * (low + high) / 2;
    }

    function render() {
      raf = 0;
      if (syncViewport()) measureGeometry();
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
      var zoom = .7 + .3 * smooth(phase(p, 0, zoomEnd));
      var slide = slideAt(p);
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
        var labelKey = ['features.analysis', 'features.routine', 'features.progress'][index];
        label.setAttribute('data-i18n', labelKey);
        label.textContent = window.SkinmetricsI18n ? window.SkinmetricsI18n.t(labelKey) : ['Analyse', 'Routine', 'Verlauf'][index];
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
    function syncViewport() {
      // dvh may update in steps while the address bar is moving. Use the actual
      // visible height before drawing, but leave pinch zoom to the browser.
      if (!viewport || Math.abs(viewport.scale - 1) > .01 || !viewport.height) return false;
      var next = Math.round(viewport.height * 100) / 100;
      if (next === viewportHeight) return false;
      viewportHeight = next;
      story.style.setProperty('--ms-viewport-height', next + 'px');
      return true;
    }
    function measureGeometry() {
      var storyBox = story.getBoundingClientRect();
      var nextStart = storyBox.top + window.scrollY;
      var box = sticky.getBoundingClientRect();
      var nextHeight = box.height, nextWidth = box.width;
      var nextDistance = Math.max(1, storyBox.height - nextHeight);
      // FAQ disclosure below the story need not rewrite the whole SVG frame.
      if (nextStart === start && nextHeight === height && nextWidth === width && nextDistance === distance) return false;
      start = nextStart; height = nextHeight; width = nextWidth; distance = nextDistance;
      var win = frame.getBoundingClientRect();
      span = win.width;
      var radius = usedLength(sticky, '--ms-frame-radius', 36);
      border.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      story.querySelectorAll('.ms-border rect').forEach(function (rect) {
        rect.setAttribute('x', String(win.left - box.left));
        rect.setAttribute('y', String(win.top - box.top));
        rect.setAttribute('width', String(Math.max(0, win.width)));
        rect.setAttribute('height', String(Math.max(0, win.height)));
        rect.setAttribute('rx', String(radius));
      });
      return true;
    }
    var measureRaf = 0;
    function measureNow() {
      cancelAnimationFrame(measureRaf);
      measureRaf = 0;
      syncViewport();
      if (measureGeometry()) queue();
    }
    function measure() {
      if (measureRaf) return;
      measureRaf = requestAnimationFrame(function () {
        measureRaf = 0;
        measureNow();
      });
    }
    // The barrier and the zoom share one endpoint: stop at the first frame
    // where the phone is full-sized, before any horizontal screen transition.
    function entryPosition() { return start + distance * zoomEnd; }
    function entryActive() { return !!(entryMotion || entryRaf); }
    function releaseEntry() {
      cancelAnimationFrame(entryRaf);
      entryRaf = 0; entryMotion = null; origin = null;
      entryCeiling = false;
      if (touch) touch.held = false;
    }
    function finishEntry() {
      cancelAnimationFrame(entryRaf);
      entryRaf = 0; entryMotion = null;
      // Stop rogue fling momentum at full size, but never trap the tour here.
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
      if (done) finishEntry();
      else entryRaf = requestAnimationFrame(animateEntry);
    }
    function catchEntry(kind) {
      entryUsed = true;
      entryCeiling = true;
      origin = null;
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
      swipe = null;
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) { releaseEntry(); return; }
      var delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
      if (!delta) return;
      if (delta < 0) { releaseEntry(); return; }
      if (delta > 0 && entryUsed) entryCeiling = false;
      if (entryActive()) {
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
      if (event.touches.length !== 1) { finishSwipe(true); touch = null; releaseEntry(); return; }
      var finger = event.touches[0];
      var p = clamp((window.scrollY - start) / distance);
      swipe = null;
      // Swiping belongs to the full-size phone window, not the hero or footer.
      if (frame.contains(event.target) && p >= zoomEnd - .001 && p < .985 && (!viewport || Math.abs(viewport.scale - 1) < .01)) {
        swipe = { id:finger.identifier, x:finger.clientX, y:finger.clientY, from:slideAt(p), current:slideAt(p), dragging:false, samples:[] };
        sampleSwipe(finger.clientX);
      }
      entryCeiling = false;
      if (entryUsed && !entryActive()) { touch = null; return; }
      touch = { id:finger.identifier, x:finger.clientX, y:finger.clientY, lastY:finger.clientY,
        held:entryActive(), fresh:false, manual:false };
    }
    function onTouchMove(event) {
      if (event.touches.length !== 1) return;
      var finger = event.touches[0];
      if (swipe && finger.identifier === swipe.id) {
        var dx = swipe.x - finger.clientX, dy = swipe.y - finger.clientY;
        if (!swipe.dragging && Math.max(Math.abs(dx), Math.abs(dy)) >= 10) {
          if (Math.abs(dy) >= Math.abs(dx)) swipe = null;
          else if (event.cancelable) {
            releaseEntry(); touch = null; entryUsed = true;
            swipe.from = swipe.current = slideAt(clamp((window.scrollY - start) / distance));
            swipe.dragging = true;
            // Stop any previous smooth selection at its current visible value.
            window.scrollTo({ top:window.scrollY, behavior:'instant' });
          }
        }
        if (swipe && swipe.dragging) {
          if (event.cancelable) event.preventDefault();
          sampleSwipe(finger.clientX);
          var home = Math.round(swipe.from);
          swipe.current = Math.max(Math.max(0, home - 1), Math.min(Math.min(2, home + 1), swipe.from + dx / span));
          window.scrollTo({ top:start + progressAtSlide(swipe.current) * distance, behavior:'instant' });
          return;
        }
      }
      if (!touch) return;
      if (finger.identifier !== touch.id) return;
      var delta = touch.lastY - finger.clientY;
      touch.lastY = finger.clientY;
      if (!delta || (!touch.held && !touch.manual && Math.abs(finger.clientX - touch.x) > Math.abs(finger.clientY - touch.y))) return;
      if (touch.manual || (touch.held && (delta < 0 || !entryActive()))) {
        // After preventDefault during arrival, the same finger must keep driving
        // scroll until the tour is free again. Reversing is always allowed.
        if (!entryActive()) entryCeiling = false;
        releaseEntry(); touch.held = false; touch.manual = true;
        if (event.cancelable) event.preventDefault();
        window.scrollTo({ top:window.scrollY + delta, behavior:'instant' });
        return;
      }
      if (touch.held && entryActive()) {
        if (event.cancelable) event.preventDefault();
        return;
      }
      if (delta < 0) { origin = null; return; }
      origin = 'touch';
      if (!entryUsed && window.scrollY < entryPosition() && window.scrollY + delta >= entryPosition() && event.cancelable) {
        event.preventDefault();
        catchEntry('touch');
      }
    }
    function sampleSwipe(x) {
      var now = performance.now();
      swipe.samples.push({ x:x, time:now });
      swipe.samples = swipe.samples.filter(function (sample) { return now - sample.time <= 100; });
    }
    function finishSwipe(cancelled, event) {
      if (!swipe) return;
      var drag = swipe;
      if (drag.dragging) {
        var finger = event && event.changedTouches && event.changedTouches[0];
        sampleSwipe(finger ? finger.clientX : drag.samples[drag.samples.length - 1].x);
        var first = drag.samples[0], last = drag.samples[drag.samples.length - 1];
        var velocity = !cancelled && last.time > first.time ? (first.x - last.x) / (last.time - first.time) : 0;
        // Project a flick's momentum; a slow drag simply uses the nearest screen.
        var projected = drag.current + velocity * .998 / (1 - .998) / span;
        var home = Math.round(drag.from);
        var target = Math.max(Math.max(0, home - 1), Math.min(Math.min(2, home + 1), Math.round(projected)));
        swipe = null;
        window.scrollTo({ top:start + phonePositions[target] * distance, behavior:'smooth' });
      } else swipe = null;
    }
    function onTouchEnd(event) { finishSwipe(false, event); touch = null; }
    // Native cancellation can still be followed by scroll momentum. Keep the
    // ceiling until a new intentional gesture; pinch starts release it above.
    function onTouchCancel() { finishSwipe(true); touch = null; }
    function onScroll() {
      // Also sample on direct/fast entry: some browsers deliver the visual
      // viewport resize event after the corresponding document scroll event.
      if (syncViewport()) measureGeometry();
      var y = window.scrollY;
      if (entryCeiling && y > entryPosition() + .5) {
        // Native flings may keep producing scroll positions after touchend,
        // including non-cancelable Android moves. They cannot cross this ceiling.
        window.scrollTo({ top:entryPosition(), behavior:'instant' });
        if (entryActive()) finishEntry();
        previousY = window.scrollY;
        queue();
        return;
      }
      if (!entryUsed && y >= entryPosition()) {
        if (origin && y > previousY && previousY < entryPosition()) catchEntry(origin);
        else entryUsed = true; // Deep links and restored positions are never trapped.
      }
      previousY = window.scrollY;
      queue();
    }
    function onNavigate() { swipe = null; touch = null; releaseEntry(); }
    function restore(event) {
      // The initial pageshow can arrive while images are still loading and the
      // visitor is already scrolling. Only history restoration cancels a gate.
      if (event && event.persisted) onNavigate();
      measure();
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
    if (viewport) viewport.addEventListener('resize', measureNow, { passive:true });
    window.addEventListener('pageshow', restore);
    // Content above the tour can change size after image/font loading.
    var resize = new ResizeObserver(measure);
    resize.observe(section);
    resize.observe(sticky);
    measureNow();
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
      if (viewport) viewport.removeEventListener('resize', measureNow);
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
