(function () {
  var hero = document.getElementById('hero6');
  if (!hero) return;
  var photo = hero.querySelector('[data-photo]');
  var imgs = { before: photo.querySelector('[data-img="before"]'), after: photo.querySelector('[data-img="after"]') };
  var btns = [].slice.call(hero.querySelectorAll('[data-g]'));
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  new IntersectionObserver(function (e) { document.body.classList.toggle('h6-on', e[0].isIntersecting); }).observe(hero);

  /* Which version: ?g=m or ?g=f in the link (one link per audience), else the last choice, else f. */
  function pick() {
    var q = new URLSearchParams(location.search).get('g');
    if (q === 'm' || q === 'f') return q;
    try { var s = sessionStorage.getItem('sm-g'); if (s === 'm' || s === 'f') return s; } catch (e) {}
    return 'f';
  }
  var g = pick(), run = 0;

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
  var load = function (img, src, fb) {
    return new Promise(function (res) {
      img.onerror = function () { img.onerror = null; img.src = fb; img.decode ? img.decode().then(res, res) : res(); };
      img.src = src; img.decode ? img.decode().then(res, function () {}) : res();
    });
  };

  function show(next, replay) {
    g = next; var id = ++run;
    try { sessionStorage.setItem('sm-g', g); } catch (e) {}
    document.documentElement.setAttribute('data-g', g);
    btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.g === g)); });
    photo.classList.remove('live', 'done');
    frame({ p: 100, k: 0, inn: replay ? 1 : 0, sc: replay ? 1.035 : 1.06 });
    var base = 'assets/img/hero/' + g + '/', fb = 'assets/img/hero/f/';
    Promise.all([load(imgs.before, base + 'before.webp', fb + 'before.webp'), load(imgs.after, base + 'after.webp', fb + 'after.webp')]).then(function () {
      if (id !== run) return;
      var mk = new Image();                         // a tightened silhouette keeps the light inside the figure
      mk.onload = function () { photo.style.setProperty('--mask', 'url("' + mk.src + '")'); };
      mk.onerror = function () { photo.style.setProperty('--mask', 'url("' + imgs.after.currentSrc + '")'); };
      mk.src = (imgs.after.currentSrc || imgs.after.src).replace('after.webp', 'mask.webp');
      if (reduce) { frame({ p: 0, k: 1, inn: 1, sc: 1 }); photo.classList.add('done'); return; }
      /* timeline in ms: the old version comes up out of the dark (0 to 1000), holds, the light sweeps across (SWEEP), the camera settles */
      var T_SWEEP = replay ? 350 : 1700, SWEEP = 3400, SETTLE = 900, TOTAL = T_SWEEP + SWEEP + SETTLE;
      var from = replay ? 1.035 : 1.06;
      var t0 = performance.now();
      (function step(now) {
        if (id !== run) return;
        var t = now - t0;
        var inn = replay ? 1 : easeOut(k01(t / 1000));
        var s = k01((t - T_SWEEP) / SWEEP), k = ease(s);
        var sc = from - (from - 1) * easeOut(k01(t / TOTAL));
        frame({ p: 100 - 100 * k, k: k, inn: inn, sc: sc });
        if (s > 0) photo.classList.add('live');
        if (t < TOTAL) requestAnimationFrame(step);
        else { photo.classList.add('done'); frame({ p: 0, k: 1, inn: 1, sc: 1 }); }
      })(t0);
    });
  }

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var next = b.dataset.g; if (next === g) return;
      var u = new URL(location.href); u.searchParams.set('g', next); history.replaceState(null, '', u);
      show(next, true);
    });
  });
  show(g, false);
})();
