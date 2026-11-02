(function () {
  var hero = document.getElementById('hero6');
  if (!hero) return;
  var lite = matchMedia('(max-width:640px)').matches || matchMedia('(pointer:coarse)').matches;
  if (lite) hero.classList.add('hero6-lite');
  var photo = hero.querySelector('[data-photo]'), flash = hero.querySelector('.hero6-flash');
  var imgs = { before: photo.querySelector('[data-img="before"]'), after: photo.querySelector('[data-img="after"]') };
  var btns = [].slice.call(hero.querySelectorAll('[data-g]'));
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var themeMeta = document.querySelector('meta[name="theme-color"]'), themeLight = themeMeta && themeMeta.getAttribute('content');
  new IntersectionObserver(function (e) {
    var on = e[0].isIntersecting;
    document.body.classList.toggle('h6-on', on); document.documentElement.classList.toggle('h6-on', on);
    if (themeMeta) themeMeta.setAttribute('content', on ? '#070908' : themeLight);   /* phone browser bars follow the hero */
  }).observe(hero);

  /* Which version: ?g=m or ?g=f in the link (one link per audience), else the last choice, else f. */
  function pick() {
    var q = new URLSearchParams(location.search).get('g');
    if (q === 'm' || q === 'f') return q;
    try { var s = sessionStorage.getItem('sm-g'); if (s === 'm' || s === 'f') return s; } catch (e) {}
    return 'f';
  }
  var g = pick(), displayed = null, run = 0, raf = null, fade = null;
  var assets = Object.create(null);

  /* The switcher shows each version's own portrait. meta.json holds the face position (share of the image). */
  var DEFAULT_META = { cx: .5, cy: .38, s: .5 };
  function avatar(gv) {
    var i = hero.querySelector('[data-g="' + gv + '"] i'), base = 'assets/img/hero/' + gv + '/';
    var probe = new Image();
    var use = function (dir) {
      fetch(dir + 'meta.json').then(function (r) { return r.ok ? r.json() : DEFAULT_META; }).catch(function () { return DEFAULT_META; }).then(function (m) {
        var r = 1402 / 1122, s = m.s, px = (m.cx - .5 * s) / (1 - s) * 100, py = (m.cy * r - .5 * s) / (r - s) * 100;
        i.style.backgroundImage = 'url(' + dir + 'after.webp)';
        i.style.backgroundSize = (100 / s).toFixed(1) + '% auto';
        i.style.backgroundPosition = px.toFixed(1) + '% ' + py.toFixed(1) + '%';
      });
    };
    probe.onload = function () { use(base); };
    probe.onerror = function () { use('assets/img/hero/f/'); };
    probe.src = base + 'after.webp';
  }
  avatar('f'); avatar('m');

  var k01 = function (v) { return Math.min(1, Math.max(0, v)); };
  var ease = function (k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  var easeOut = function (k) { return 1 - Math.pow(1 - k, 3); };
  /* o.p: wipe position in percent (100 = all old, 0 = all new); o.k: progress 0..1; o.inn: old version opacity; o.sc: camera scale */
  var frame = function (o) {
    photo.style.setProperty('--p', o.p.toFixed(2) + '%');
    photo.style.setProperty('--k', o.k.toFixed(4));
    photo.style.setProperty('--in', o.inn.toFixed(3));
    photo.style.setProperty('--sc', o.sc.toFixed(4));
    hero.style.setProperty('--k', o.k.toFixed(4));
  };
  /* Decode detached nodes. Never mutate a visible image while a request is pending. */
  function loadImage(src, kind) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.alt = '';
      img.decoding = 'async';
      if (kind) { img.className = kind; img.width = 1122; img.height = 1402; img.setAttribute('data-img', kind); }
      img.onload = function () {
        var decoded = img.decode ? img.decode() : Promise.resolve();
        decoded.then(function () { resolve(img); }, reject);
      };
      img.onerror = function () { reject(new Error('Could not load hero image: ' + src)); };
      img.src = src;
    });
  }
  function prepare(next) {
    if (assets[next]) return assets[next];
    var base = 'assets/img/hero/' + next + '/';
    var before = loadImage(base + (next === 'f' ? 'before-body.webp' : 'before.webp'), 'before');
    var after = loadImage(base + 'after.webp', 'after');
    var mask = loadImage(base + 'mask.webp').catch(function () { return null; });
    assets[next] = Promise.all([before, after, mask]).catch(function (error) {
      delete assets[next]; // A later click can retry a failed request.
      throw error;
    });
    return assets[next];
  }
  function markSelection(next) {
    btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.g === next)); });
  }
  function remember(next) {
    try { sessionStorage.setItem('sm-g', next); } catch (e) {}
  }
  function show(next, replay, keyboard) {
    g = next;
    var id = ++run;
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    if (fade) { fade.cancel(); fade = null; }
    markSelection(next);
    hero.setAttribute('aria-busy', 'true');
    /* Keep the current portrait and framing unchanged until the entire new pair is ready. */
    prepare(next).then(function (pair) {
      if (id !== run) return;
      imgs.before.replaceWith(pair[0]); imgs.after.replaceWith(pair[1]);
      imgs.before = pair[0]; imgs.after = pair[1];
      displayed = next;
      remember(next);
      document.documentElement.setAttribute('data-g', next);
      photo.style.setProperty('--mask', 'url("' + (pair[2] || pair[1]).src + '")');
      photo.classList.remove('live', 'done'); hero.classList.remove('glow'); flash.classList.remove('pop');
      frame({ p: 100, k: 0, inn: replay ? 1 : 0, sc: replay ? 1.035 : 1.06 });
      photo.setAttribute('data-ready', '');
      hero.setAttribute('aria-busy', 'false');
      if (replay && !reduce && !keyboard && photo.animate) {
        fade = photo.animate([{ opacity: .6 }, { opacity: 1 }], { duration: 180, easing: 'cubic-bezier(.23,1,.32,1)' });
      }
      if (reduce) { frame({ p: 0, k: 1, inn: 1, sc: 1 }); photo.classList.add('done'); return; }
      /* timeline in ms: hold, light sweeps across, camera settles — same pacing on first load and when switching */
      var T_SWEEP = 1700;
      var SWEEP = 3400;
      var SETTLE = 900;
      var TOTAL = T_SWEEP + SWEEP + SETTLE, fired = false;
      var from = replay ? 1.035 : 1.06;
      var t0 = performance.now();
      (function step(now) {
        if (id !== run) return;
        var t = now - t0;
        var inn = replay ? 1 : easeOut(k01(t / 1000));
        var s = k01((t - T_SWEEP) / SWEEP), k = ease(s);
        var sc = from - (from - 1) * easeOut(k01(t / TOTAL));
        frame({ p: 100 - 100 * k, k: k, inn: inn, sc: sc });
        // Both portraits use the same light exit at the end of the wipe.
        var lightFinished = s >= 1;
        if (s > 0 && !lightFinished) photo.classList.add('live');
        if (lightFinished) { photo.classList.remove('live'); photo.classList.add('done'); }
        if (s >= .965 && !fired) { fired = true; flash.classList.add('pop'); hero.classList.add('glow'); }
        if (t < TOTAL) raf = requestAnimationFrame(step);
        else { raf = null; photo.classList.add('done'); frame({ p: 0, k: 1, inn: 1, sc: 1 }); }
      })(t0);
      // Warm the other portrait only after the selected version is visible.
      prepare(next === 'f' ? 'm' : 'f').catch(function () {});
    }).catch(function () {
      if (id !== run) return;
      hero.setAttribute('aria-busy', 'false');
      // A network failure keeps the current person; it must never substitute the woman.
      g = displayed;
      markSelection(displayed);
      if (displayed) {
        remember(displayed);
        photo.classList.remove('live'); photo.classList.add('done');
        hero.classList.remove('glow'); flash.classList.remove('pop');
        frame({ p: 0, k: 1, inn: 1, sc: 1 });
        var u = new URL(location.href); u.searchParams.set('g', displayed); history.replaceState(null, '', u);
      }
    });
  }

  btns.forEach(function (b) {
    b.addEventListener('click', function (event) {
      var next = b.dataset.g; if (next === g) return;
      var u = new URL(location.href); u.searchParams.set('g', next); history.replaceState(null, '', u);
      show(next, true, event.detail === 0);
    });
  });
  show(g, false);
})();
