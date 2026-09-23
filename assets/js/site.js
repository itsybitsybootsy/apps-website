/* Skinmetrics landing page. Vanilla JS, no dependencies.
   Every section renders complete without this file; JS only adds motion and demos. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var fmt = function (n, d) { return n.toFixed(d || 0).replace('.', ','); };

  /* ---------------------------------------------------------------- nav */
  var nav = $('.nav');
  var onScrollNav = function () { nav.classList.toggle('scrolled', window.scrollY > 8); };
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  // Dark nav while a dark section sits under it.
  var darkSecs = $$('[data-dark]');
  if ('IntersectionObserver' in window && darkSecs.length) {
    var under = new Set();
    var darkObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) under.add(e.target); else under.delete(e.target); });
      nav.classList.toggle('on-dark', under.size > 0);
    }, { rootMargin: '-8px 0px -' + Math.max(0, window.innerHeight - 56) + 'px 0px' });
    darkSecs.forEach(function (s) { darkObs.observe(s); });
  }

  var navLinks = $$('.nav-links a');
  if ('IntersectionObserver' in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var a = byId[e.target.id];
        if (!a) return;
        if (e.isIntersecting) {
          navLinks.forEach(function (x) { x.removeAttribute('aria-current'); });
          a.setAttribute('aria-current', 'true');
        } else if (a.getAttribute('aria-current')) {
          a.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) secObs.observe(el); });
  }

  /* ------------------------------------------------------------- reveal */
  if ('IntersectionObserver' in window && !reduce) {
    var rvObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); rvObs.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    var pending = [];
    $$('.rv').forEach(function (el) {
      // Anything already on screen at load shows immediately, no blank first paint.
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) el.classList.add('in');
      else { rvObs.observe(el); pending.push(el); }
    });
    // Safety net for fast flings and anchor jumps: whatever is at or above the
    // viewport bottom is revealed, even if the observer never saw it intersect.
    var sweepQueued = false;
    var sweep = function () {
      sweepQueued = false;
      var vh = window.innerHeight;
      pending = pending.filter(function (el) {
        if (el.classList.contains('in')) return false;
        if (el.getBoundingClientRect().top < vh) { el.classList.add('in'); rvObs.unobserve(el); return false; }
        return true;
      });
      if (!pending.length) window.removeEventListener('scroll', onSweep);
    };
    var onSweep = function () { if (!sweepQueued) { sweepQueued = true; setTimeout(sweep, 120); } };
    window.addEventListener('scroll', onSweep, { passive: true });
  } else {
    $$('.rv').forEach(function (el) { el.classList.add('in'); });
  }

  /* ----------------------------------------------------- hero parallax */
  var heroArt = $('.hero-art');
  if (heroArt && !reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var front = $('.phone-front', heroArt);
    var back = $('.phone-back', heroArt);
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    var tick = function () {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      if (front) front.style.transform = 'rotate(-2deg) translate3d(' + (cx * -6) + 'px,' + (cy * -6) + 'px,0)';
      if (back) back.style.transform = 'rotate(4deg) translate3d(' + (cx * 10) + 'px,' + (cy * 10) + 'px,0)';
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) raf = requestAnimationFrame(tick); else raf = 0;
    };
    $('.hero').addEventListener('pointermove', function (e) {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
      if (!raf) raf = requestAnimationFrame(tick);
    });
  }

  /* ------------------------------------------------- statement words */
  var stmt = $('.statement p');
  if (stmt) {
    // Split text nodes into word spans, keeping inline elements (the italic highlight).
    var wrapWords = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          wrapWords(child);
        }
      });
    };
    wrapWords(stmt);
    var words = $$('.w', stmt);
    if (reduce) {
      words.forEach(function (w) { w.classList.add('on'); });
    } else {
      var lit = -1;
      var paint = function () {
        var r = stmt.getBoundingClientRect();
        var vh = window.innerHeight;
        // Fully lit once the paragraph's middle passes 45% of the viewport.
        var start = vh * 0.9, end = vh * 0.42;
        var mid = r.top + r.height * 0.35;
        var t = Math.min(1, Math.max(0, (start - mid) / (start - end)));
        var n = Math.round(t * words.length);
        if (n === lit) return;
        lit = n;
        words.forEach(function (w, i) { w.classList.toggle('on', i < n); });
      };
      paint();
      window.addEventListener('scroll', function () { requestAnimationFrame(paint); }, { passive: true });
      window.addEventListener('resize', paint);
    }
  }

  /* ------------------------------------------------------------- steps */
  var steps = $$('.step');
  var shots = $$('.steps-sticky .shot');
  if (steps.length && 'IntersectionObserver' in window) {
    var setStep = function (i) {
      steps.forEach(function (s, j) { s.classList.toggle('active', j === i); });
      shots.forEach(function (img, j) { img.classList.toggle('on', j === i); });
    };
    setStep(0);
    var stObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setStep(steps.indexOf(e.target));
      });
    }, { rootMargin: '-48% 0px -48% 0px' });
    steps.forEach(function (s) { stObs.observe(s); });
  } else {
    steps.forEach(function (s) { s.classList.add('active'); });
  }

  /* ------------------------------------------------------------- score */
  var scoreSec = $('#hautscore');
  if (scoreSec) {
    var ring = $('.ring', scoreSec);
    var ringNum = $('.ring-num b', scoreSec);
    var metrics = $$('.metric', scoreSec);
    var info = $('.metric-info', scoreSec);
    var target = parseInt(ringNum.textContent, 10);
    var played = false;

    var countTo = function (el, to, ms) {
      if (reduce) { el.textContent = to; return; }
      var t0 = performance.now();
      var step = function (now) {
        var p = Math.min(1, (now - t0) / ms);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    var play = function () {
      if (played) return; played = true;
      ring.style.setProperty('--p', target);
      countTo(ringNum, target, 1400);
      metrics.forEach(function (m, i) {
        var v = parseInt(m.getAttribute('data-v'), 10) / 10;
        setTimeout(function () { $('.track i', m).style.setProperty('--v', v); }, reduce ? 0 : 120 + i * 90);
      });
    };

    // Resting state before the section is seen: empty ring, empty bars. The number keeps
    // its real value in the markup so crawlers and no JS visitors see the right figure.
    if ('IntersectionObserver' in window && !reduce) {
      ring.style.setProperty('--p', 0);
      metrics.forEach(function (m) { $('.track i', m).style.setProperty('--v', 0); });
      ringNum.textContent = '0';
      var scObs = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { play(); scObs.disconnect(); }
      }, { threshold: 0.35 });
      scObs.observe($('.score-grid', scoreSec));
    } else {
      played = true;
      ring.style.setProperty('--p', target);
      metrics.forEach(function (m) { $('.track i', m).style.setProperty('--v', parseInt(m.getAttribute('data-v'), 10) / 10); });
    }

    metrics.forEach(function (m) {
      m.addEventListener('click', function () {
        metrics.forEach(function (x) { x.setAttribute('aria-pressed', x === m ? 'true' : 'false'); });
        info.innerHTML = '<b>' + $('.name', m).textContent + '.</b> ' + m.getAttribute('data-info');
      });
    });
  }

  /* ------------------------------------------------------------ trend demo */
  var trend = $('[data-trend]');
  if (trend) {
    // 30 illustrative days of inflamed blemish counts, oldest first.
    var COUNTS = [9,10,7,6,8,10,8,6,6,11,8,6,6,6,6,5,6,6,8,5,6,4,10,5,4,4,5,4,5,6];
    var W = 600, TOP = 20, BOT = 200, YMAX = 12;
    var y = function (v) { return TOP + (YMAX - v) / YMAX * (BOT - TOP); };
    var median = function (a) {
      var s = a.slice().sort(function (p, q) { return p - q; }), m = s.length >> 1;
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };
    var sd = function (a) {
      var m = a.reduce(function (x, z) { return x + z; }, 0) / a.length;
      return Math.sqrt(a.reduce(function (x, z) { return x + (z - m) * (z - m); }, 0) / Math.max(1, a.length - 1));
    };
    var line = $('.trend-line', trend), band = $('.trend-band', trend), dots = $('.trend-dots', trend);
    var tabs = $$('.demo-tab', trend);
    var out = {}; $$('[data-t]', trend).forEach(function (el) { out[el.getAttribute('data-t')] = el; });
    var NS = 'http://www.w3.org/2000/svg';

    var render = function (days) {
      var start = COUNTS.length - days;
      var d = COUNTS.slice(start), n = d.length, step = W / (n - 1);
      var pts = d.map(function (v, i) { return [i * step, y(v)]; });
      // Typical range, as in the app: median of the last 7 days, plus and minus
      // a 95 % interval (1.96 x 1.2533 x SD / sqrt(n)).
      var lo = [], hi = [];
      d.forEach(function (v, i) {
        var idx = start + i;
        var win = COUNTS.slice(Math.max(0, idx - 6), idx + 1);
        var m = median(win), h = win.length > 2 ? 1.96 * 1.2533 * sd(win) / Math.sqrt(win.length) : 1.5;
        hi.push([i * step, y(m + h)]); lo.push([i * step, y(Math.max(0, m - h))]);
      });
      var path = function (arr) { return arr.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' '); };
      line.setAttribute('d', path(pts));
      band.setAttribute('d', path(hi) + ' ' + path(lo.slice().reverse()).replace('M', 'L') + ' Z');
      while (dots.firstChild) dots.removeChild(dots.firstChild);
      if (n <= 14) pts.forEach(function (p) {
        var c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]); c.setAttribute('r', 4);
        dots.appendChild(c);
      });
      var last = COUNTS.slice(-7);
      var first = days >= 14 ? d.slice(0, 7) : COUNTS.slice(-14, -7);
      out.now.textContent = fmt(median(last), median(last) % 1 ? 1 : 0);
      out.then.textContent = fmt(median(first), median(first) % 1 ? 1 : 0);
      out.thenLabel.textContent = days >= 14 ? 'Median, erste Woche' : 'Median, Vorwoche';
      out.out.textContent = n;
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-days') === String(days);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
    };

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { render(parseInt(t.getAttribute('data-days'), 10)); });
      t.addEventListener('keydown', function (e) {
        var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!k) return;
        e.preventDefault();
        var next = tabs[(i + k + tabs.length) % tabs.length];
        next.focus(); render(parseInt(next.getAttribute('data-days'), 10));
      });
    });
    render(30);
  }

  /* ----------------------------------------------------- before / after */
  $$('[data-ba]').forEach(function (ba) {
    var range = $('.ba-range', ba);
    var set = function (v) { ba.style.setProperty('--p', v + '%'); };
    set(range.value);
    range.addEventListener('input', function () { set(range.value); });
    var drag = false;
    var move = function (e) {
      var r = ba.getBoundingClientRect();
      var v = Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100));
      range.value = v; set(v);
    };
    ba.addEventListener('pointerdown', function (e) {
      drag = true; ba.classList.add('dragging'); move(e);
      try { ba.setPointerCapture(e.pointerId); } catch (err) {}
    });
    ba.addEventListener('pointermove', function (e) { if (drag) move(e); });
    var stop = function () { drag = false; ba.classList.remove('dragging'); };
    ba.addEventListener('pointerup', stop);
    ba.addEventListener('pointercancel', stop);

    // One gentle hint the first time the slider is seen, so it reads as draggable.
    if (!reduce && 'IntersectionObserver' in window) {
      var hinted = false;
      var hObs = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting || hinted) return;
        hinted = true; hObs.disconnect();
        var t0 = null, from = parseFloat(range.value);
        var anim = function (now) {
          if (drag) return;
          if (t0 === null) t0 = now;
          var p = Math.min(1, (now - t0) / 1600);
          var v = from + Math.sin(p * Math.PI * 2) * 12 * (1 - p);
          range.value = v; set(v);
          if (p < 1) requestAnimationFrame(anim);
        };
        setTimeout(function () { requestAnimationFrame(anim); }, 350);
      }, { threshold: 0.6 });
      hObs.observe(ba);
    }
  });

  /* ---------------------------------------------------------------- faq */
  $$('.faq details').forEach(function (d) {
    var sum = $('summary', d);
    var body = $('.ans', d);
    sum.addEventListener('click', function (e) {
      if (reduce || !body.animate) return;
      e.preventDefault();
      if (d.open) {
        var h = body.offsetHeight;
        var a = body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.65,0,.35,1)' });
        a.onfinish = function () { d.open = false; };
      } else {
        d.open = true;
        var full = body.offsetHeight;
        body.animate([{ height: '0px', opacity: 0 }, { height: full + 'px', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    });
  });

  /* ----------------------------------------------------- mobile cta bar */
  var mbar = $('.mbar');
  var heroCta = $('.hero .cta-row');
  var endCta = $('#start');
  if (mbar && heroCta && 'IntersectionObserver' in window) {
    var heroGone = false, endVisible = false;
    var sync = function () { var on = heroGone && !endVisible; mbar.classList.toggle('show', on); nav.classList.toggle('bar-on', on && getComputedStyle(mbar).display !== 'none'); };
    new IntersectionObserver(function (e) {
      heroGone = !e[0].isIntersecting && e[0].boundingClientRect.top < 0; sync();
    }).observe(heroCta);
    if (endCta) new IntersectionObserver(function (e) { endVisible = e[0].isIntersecting; sync(); }).observe(endCta);
  }

  /* ----------------------------------------------------------- year */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
