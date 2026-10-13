/* Three original device renders, mapped directly to native vertical scrolling.
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
    section.appendChild(story);
    document.documentElement.classList.add('has-mobile-story');

    var sticky = story.querySelector('.ms-sticky');
    var phones = Array.from(story.querySelectorAll('.ms-phone'));
    var steps = Array.from(story.querySelectorAll('.ms-steps span'));
    var border = story.querySelector('.ms-border');
    var fill = story.querySelector('.ms-border-fill');
    var count = story.querySelector('.ms-count b');
    var label = story.querySelector('.ms-label');
    var raf = 0, start = 0, distance = 1, width = 1, height = 1;
    var index = -1, active = false;
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
      if (!visible) return;
      var zoom = .7 + .3 * smooth(phase(p, 0, .24));
      var slide = smooth(phase(p, .31, .53)) + smooth(phase(p, .63, .85));
      phones.forEach(function (phone, i) {
        var x = (i - slide) * (width + 24);
        var away = Math.min(1, Math.abs(i - slide));
        var scale = zoom * (1 - .025 * away);
        phone.style.transform = 'translate3d(calc(-50% + ' + x.toFixed(2) + 'px), calc(-50% + ' + (away * 6).toFixed(2) + 'px), 0) scale(' + scale.toFixed(4) + ')';
        phone.style.opacity = (1 - .18 * away).toFixed(3);
        phone.style.visibility = Math.abs(i - slide) < 1.05 ? 'visible' : 'hidden';
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
    function measure() {
      var nextStart = story.getBoundingClientRect().top + window.scrollY;
      var nextHeight = sticky.clientHeight, nextWidth = sticky.clientWidth;
      var nextDistance = Math.max(1, story.offsetHeight - nextHeight);
      // FAQ disclosure below the story need not rewrite the whole SVG frame.
      if (nextStart === start && nextHeight === height && nextWidth === width && nextDistance === distance) return;
      start = nextStart; height = nextHeight; width = nextWidth; distance = nextDistance;
      border.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      story.querySelectorAll('.ms-border rect').forEach(function (rect) {
        rect.setAttribute('x', '9'); rect.setAttribute('y', '9');
        rect.setAttribute('width', Math.max(0, width - 18));
        rect.setAttribute('height', Math.max(0, height - 18));
        rect.setAttribute('rx', '25');
      });
      queue();
    }
    function restore() { measure(); queue(); }
    window.addEventListener('scroll', queue, { passive:true });
    window.addEventListener('resize', measure);
    window.addEventListener('pageshow', restore);
    // Content above the tour can change size after image/font loading.
    var resize = new ResizeObserver(measure);
    resize.observe(document.body);
    resize.observe(sticky);
    measure();
    cleanup = function () {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', queue);
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
