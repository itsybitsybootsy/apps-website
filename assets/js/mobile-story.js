/* One scroll gesture advances one complete screen, including fast flings.
   Geometry is measured on resize; scroll frames write transform + progress only. */
(function () {
  'use strict';
  var section = document.querySelector('#funktionen');
  if (!section) return;
  var media = window.matchMedia('(max-width:640px) and (prefers-reduced-motion:no-preference)');
  var story = null;
  var cleanup = null;

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
      + '<div class="ms-footer"><div class="ms-steps sr-only"><span aria-current="step">Analyse</span><span>Routine</span><span>Verlauf</span></div><p class="ms-label" aria-hidden="true">Analyse</p></div>'
      + '<svg class="ms-border" aria-hidden="true"><rect class="ms-border-track"/><rect class="ms-border-fill" pathLength="100"/></svg>'
      + '</div>';
    // The boundary positions release the tour back to normal page scrolling.
    var rests = [0, .275, .58, .91, 1];
    section.appendChild(story);
    document.documentElement.classList.add('has-mobile-story');

    var sticky = story.querySelector('.ms-sticky');
    var frame = story.querySelector('.ms-window');
    var phones = Array.from(story.querySelectorAll('.ms-phone'));
    var steps = Array.from(story.querySelectorAll('.ms-steps span'));
    var border = story.querySelector('.ms-border');
    var fill = story.querySelector('.ms-border-fill');
    var count = story.querySelector('.ms-count b');
    var label = story.querySelector('.ms-label');
    var raf = 0, start = 0, distance = 1, width = 1, height = 1, span = 1;
    var index = -1, active = false;
    var motion = null, motionRaf = 0, targetStep = 0;
    var wheelTime = -Infinity, wheelDir = 0, wheelHeld = false, wheelTravel = 0;
    var touch = null, coast = 0, previousY = window.scrollY;
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
      var restingStep = !motion && index !== -1 ? nearestStep(window.scrollY) : -1;
      var wasResting = restingStep !== -1 && Math.abs(window.scrollY - start - rests[restingStep] * distance) < 1;
      start = nextStart; height = nextHeight; width = nextWidth; distance = nextDistance;
      if (motion) motion.y = window.scrollY;
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
      if (wasResting) window.scrollTo({ top:start + rests[restingStep] * distance, behavior:'instant' });
      queue();
    }
    function restore() {
      stopMotion(); coast = 0; touch = null; wheelHeld = false;
      previousY = window.scrollY;
      measure(); queue(); settle();
    }

    function stopMotion() {
      cancelAnimationFrame(motionRaf);
      motionRaf = 0;
      motion = null;
    }
    function animate(now) {
      motionRaf = 0;
      if (!motion) return;
      var dt = Math.min(.032, Math.max(0, (now - motion.time) / 1000));
      motion.time = now;
      var destination = start + rests[targetStep] * distance;
      // Critically damped spring: response 0.4s, damping 1. No overshoot.
      // Its current position and velocity survive a direction change.
      var omega = 2 * Math.PI / .4;
      var delta = motion.y - destination;
      var c = motion.velocity + omega * delta;
      var decay = Math.exp(-omega * dt);
      motion.y = destination + (delta + c * dt) * decay;
      motion.velocity = (motion.velocity - omega * c * dt) * decay;
      var done = Math.abs(motion.y - destination) < .5 && Math.abs(motion.velocity) < 5;
      window.scrollTo({ top:done ? destination : motion.y, behavior:'instant' });
      cancelAnimationFrame(raf);
      render();
      if (done) motion = null;
      else motionRaf = requestAnimationFrame(animate);
    }
    function nearestStep(y) {
      var p = (y - start) / distance;
      return rests.reduce(function (best, rest, i) {
        return Math.abs(rest - p) < Math.abs(rests[best] - p) ? i : best;
      }, 0);
    }
    function canGuide(direction, delta) {
      var y = window.scrollY, end = start + distance;
      if (motion) return true;
      // Intercept a large input BEFORE it can leap over the pinned section.
      if (direction > 0 && y < start - 1) return y + delta >= start;
      if (direction < 0 && y > end + 1) return y + delta <= end;
      if (y < start - 1 || y > end + 1) return false;
      return direction > 0 ? y < end - 1 : y > start + 1;
    }
    function advance(direction) {
      // A second flick cannot skip a screen whose transition is still running.
      // Reversing is immediate and starts at the current presentation value.
      if (motion && direction === motion.direction) return;
      var base = motion ? targetStep : nearestStep(window.scrollY);
      targetStep = Math.max(0, Math.min(rests.length - 1, base + direction));
      var velocity = motion ? motion.velocity : 0;
      motion = { y:window.scrollY, velocity:velocity, direction:direction, time:performance.now() };
      if (!motionRaf) motionRaf = requestAnimationFrame(animate);
    }
    function settle() {
      // Fallback for scrollbar dragging and restored positions. Controlled
      // gestures already land exactly here, so their scrollend never restarts it.
      if (motion || touch || window.scrollY <= start || window.scrollY >= start + distance) return;
      var step = nearestStep(window.scrollY);
      var destination = start + rests[step] * distance;
      if (Math.abs(destination - window.scrollY) < 1) return;
      targetStep = step;
      motion = { y:window.scrollY, velocity:0, direction:destination > window.scrollY ? 1 : -1, time:performance.now() };
      motionRaf = requestAnimationFrame(animate);
    }
    function onWheel(event) {
      // Let pinch-to-zoom and horizontal trackpad gestures keep their meaning.
      if (event.defaultPrevented || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      var delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
      if (!delta) return;
      coast = 0;
      var direction = delta > 0 ? 1 : -1;
      var now = performance.now();
      // A pause or reversal starts a fresh gesture. Residual wheel momentum
      // belongs to the old gesture and cannot advance a second screen.
      if (now - wheelTime > 180 || direction !== wheelDir) {
        wheelHeld = false;
        wheelTravel = 0;
      }
      wheelTime = now; wheelDir = direction;
      if (!wheelHeld && !canGuide(direction, delta)) return;
      if (!event.cancelable) return;
      event.preventDefault();
      if (wheelHeld) return;
      wheelTravel += Math.abs(delta);
      if (wheelTravel < 12) return;
      wheelHeld = true;
      advance(direction);
    }
    function onTouchStart(event) {
      coast = 0;
      if (event.touches.length !== 1) { touch = null; stopMotion(); return; }
      var finger = event.touches[0];
      touch = { id:finger.identifier, x:finger.clientX, y:finger.clientY, lastY:finger.clientY, turnY:finger.clientY, held:false, direction:0 };
    }
    function onTouchMove(event) {
      if (!touch || event.touches.length !== 1) return;
      var finger = event.touches[0];
      if (finger.identifier !== touch.id) return;
      var dx = finger.clientX - touch.x;
      var dy = touch.y - finger.clientY;
      var delta = touch.lastY - finger.clientY;
      touch.lastY = finger.clientY;
      if (Math.abs(dx) > Math.abs(dy) || !delta) return;
      var direction = delta > 0 ? 1 : -1;
      if (!touch.held) touch.direction = direction;
      if (!touch.held && !canGuide(direction, delta)) return;
      if (!event.cancelable) return;
      event.preventDefault();
      if (touch.held) {
        // A deliberate reversal can grab the spring during the same touch.
        if (direction === touch.direction) touch.turnY = finger.clientY;
        else if (Math.abs(finger.clientY - touch.turnY) > 24) {
          touch.direction = direction;
          touch.turnY = finger.clientY;
          advance(direction);
        }
        return;
      }
      if (Math.abs(dy) < 24) return;
      touch.held = true; touch.direction = direction; touch.turnY = finger.clientY;
      advance(direction);
    }
    function onTouchEnd() {
      // A fling may start above the tour and enter it only after the finger lifts.
      coast = touch && !touch.held ? touch.direction : 0;
      touch = null;
    }
    function onTouchCancel() { touch = null; coast = 0; }
    function onScroll() {
      var y = window.scrollY;
      var direction = coast || (touch && !touch.held ? touch.direction : 0);
      if (!motion && direction && (direction > 0 ? previousY < start && y >= start
        : previousY > start + distance && y <= start + distance)) {
        coast = 0;
        // Stop incoming native momentum at the entry boundary before rendering
        // the tour, then use the same first/last-screen transition as a swipe.
        previousY = direction > 0 ? start : start + distance;
        window.scrollTo({ top:previousY, behavior:'instant' });
        if (touch) { touch.held = true; touch.turnY = touch.lastY; }
        advance(direction);
        return;
      }
      previousY = y;
      queue();
    }
    function onLink(event) {
      if (!event.target.closest('a[href]')) return;
      coast = 0; touch = null; wheelHeld = false;
      stopMotion();
    }
    function onKey(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey
        || event.target.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
      coast = 0;
      if (event.key === 'Home' || event.key === 'End') { stopMotion(); return; }
      if (event.key === 'Escape') {
        if (motion) { targetStep = nearestStep(window.scrollY); motion.velocity = 0; }
        return;
      }
      var direction = /^(ArrowDown|PageDown| )$/.test(event.key) ? (event.shiftKey ? -1 : 1)
        : /^(ArrowUp|PageUp)$/.test(event.key) ? -1 : 0;
      if (!direction || !canGuide(direction, direction * height)) return;
      event.preventDefault();
      if (!event.repeat) advance(direction);
    }

    window.addEventListener('scroll', onScroll, { passive:true });
    window.addEventListener('scrollend', settle);
    window.addEventListener('wheel', onWheel, { passive:false });
    window.addEventListener('touchstart', onTouchStart, { passive:true });
    window.addEventListener('touchmove', onTouchMove, { passive:false });
    window.addEventListener('touchend', onTouchEnd, { passive:true });
    window.addEventListener('touchcancel', onTouchCancel, { passive:true });
    window.addEventListener('keydown', onKey);
    document.addEventListener('click', onLink, true);
    window.addEventListener('resize', measure);
    window.addEventListener('pageshow', restore);
    // Content above the tour can change size after image/font loading.
    var resize = new ResizeObserver(measure);
    resize.observe(document.body);
    resize.observe(sticky);
    measure();
    // Position every phone before the first paint, also on restored scroll positions.
    cancelAnimationFrame(raf);
    render();
    cleanup = function () {
      cancelAnimationFrame(raf);
      stopMotion();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scrollend', settle);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onLink, true);
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
