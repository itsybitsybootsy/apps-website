/* ============================================================
   Q Systems · shared interaction toolkit
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- inline SVG icon sprite (replaces all emoji) ---- */
  var SPRITE = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">'
    + '<defs>'
    + s('home','<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9.5h12V10"/>')
    + s('camera','<path d="M4 8.5h3l1.3-2h7.4L18 8.5h2v9.5H4z"/><circle cx="12" cy="13" r="3.2"/>')
    + s('target','<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.3"/>')
    + s('user','<circle cx="12" cy="8" r="3.5"/><path d="M5.5 19.5c.6-3.3 3.2-5 6.5-5s5.9 1.7 6.5 5"/>')
    + s('chat','<path d="M4 5.5h16v11h-9l-4 3.5v-3.5H4z"/>')
    + s('search','<circle cx="11" cy="11" r="6.3"/><path d="M19.5 19.5 15.5 15.5"/>')
    + s('book','<path d="M12 6.5C10 5.2 7.5 5 5 5v13c2.5 0 5 .2 7 1.5 2-1.3 4.5-1.5 7-1.5V5c-2.5 0-5 .2-7 1.5z"/><path d="M12 6.5v13"/>')
    + s('chart','<path d="M4 4v16h16"/><path d="M7.5 14l3-3 3 2 4.5-6"/>')
    + s('pencil','<path d="M5 19l1-4L16 5l3 3L9 18z"/><path d="M14 7l3 3"/>')
    + s('sliders','<path d="M5 7h14M5 17h14"/><circle cx="9" cy="7" r="2.2"/><circle cx="15" cy="17" r="2.2"/>')
    + s('leaf','<path d="M5 19C5 11 10 6 19 6c0 9-5 13-12 13"/><path d="M5 19c2.5-4.5 6-7 11-8"/>')
    + s('droplet','<path d="M12 4s6 6.5 6 10.5a6 6 0 0 1-12 0C6 10.5 12 4 12 4z"/>')
    + s('sprout','<path d="M12 20.5v-7.5"/><path d="M12 13C12 9.5 9.3 7.5 5.5 7.5c0 3.5 2.7 5.5 6.5 5.5z"/><path d="M12 12c0-3 2.4-5 6-5 0 3-2.4 5-6 5z"/>')
    + s('shield','<path d="M12 3.5l7 2.8V11c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6.3z"/><path d="M9 12l2 2 4-4"/>')
    + s('edit','<path d="M4 20h16"/><path d="M5 16l9.5-9.5 3 3L8 19H5z"/>')
    + s('cloud-rain','<path d="M7.5 15a3.8 3.8 0 0 1 .4-7.6 4.8 4.8 0 0 1 9.1 1.4A3.4 3.4 0 0 1 16.5 15z"/><path d="M8.5 17.5l-1 2M12 17.5l-1 2M15.5 17.5l-1 2"/>')
    + s('sun','<circle cx="12" cy="12" r="4"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8"/>')
    + s('grid','<rect x="4.5" y="4.5" width="6.5" height="6.5" rx="1.4"/><rect x="13" y="4.5" width="6.5" height="6.5" rx="1.4"/><rect x="4.5" y="13" width="6.5" height="6.5" rx="1.4"/><rect x="13" y="13" width="6.5" height="6.5" rx="1.4"/>')
    + s('sparkles','<path d="M12 4l1.7 4.6L18.5 10l-4.8 1.4L12 16l-1.7-4.6L5.5 10l4.8-1.4z"/><path d="M18 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>')
    + s('phone','<rect x="6.5" y="3" width="11" height="18" rx="2.4"/><path d="M10.5 18h3"/>')
    + s('cpu','<rect x="7" y="7" width="10" height="10" rx="2"/><rect x="10" y="10" width="4" height="4" rx="1"/><path d="M10 3v2M14 3v2M10 19v2M14 19v2M3 10h2M3 14h2M19 10h2M19 14h2"/>')
    + s('trash','<path d="M4.5 7h15"/><path d="M9 7V4.8h6V7"/><path d="M6.5 7l1 12.5h9L17.5 7"/><path d="M10.5 10.5v6M13.5 10.5v6"/>')
    + s('volume','<path d="M4 9.5h3.5L12 6v12L7.5 14.5H4z"/><path d="M15 9.5a4 4 0 0 1 0 5M17.5 7.5a7 7 0 0 1 0 9"/>')
    + s('trophy','<path d="M7.5 4.5h9V8a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 5.5h-3V8a3 3 0 0 0 3 3M16.5 5.5h3V8a3 3 0 0 1-3 3"/><path d="M10 12.8h4M9 19.5h6M12 12.8v6.7"/>')
    + s('bulb','<path d="M9 16.5a6 6 0 1 1 6 0c-.6.5-1 1-1 2h-4c0-1-.4-1.5-1-2z"/><path d="M9.5 20.5h5M10.5 22.5h3"/>')
    + s('bottle','<path d="M10 3.5h4v2.5l1.5 2.5V20a1.5 1.5 0 0 1-1.5 1.5H10A1.5 1.5 0 0 1 8.5 20V8.5L10 6z"/><path d="M8.5 12.5h7"/>')
    + s('map','<path d="M9 4.5 4 6.5v13l5-2 6 2 5-2v-13l-5 2-6-2z"/><path d="M9 4.5v13M15 6.5v13"/>')
    + s('route','<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 0 0 0-6H10a3 3 0 0 1 0-6h.5"/>')
    + s('bell','<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5h-14z"/><path d="M10 19.5a2 2 0 0 0 4 0"/>')
    + s('flame','<path d="M12 3c2.5 3 4.5 5.5 4.5 9a4.5 4.5 0 0 1-9 0c0-1.4.5-2.5 1.3-3.4C9 9.5 9.5 10.5 10 11 10 7.5 11 5 12 3z"/>')
    + s('chevron-left','<path d="M14.5 7 9 12l5.5 5"/><path d="M9 12h11"/>')
    + s('arrows-h','<path d="M8.5 8l-3.5 4 3.5 4M15.5 8l3.5 4-3.5 4M5 12h14"/>')
    + s('plus','<path d="M12 5.5v13M5.5 12h13"/>')
    + s('face-sad','<circle cx="12" cy="12" r="8.3"/><path d="M8.5 15.5c.9-1.1 2.1-1.7 3.5-1.7s2.6.6 3.5 1.7"/><path d="M9.3 10h0M14.7 10h0"/>')
    + s('face-neutral','<circle cx="12" cy="12" r="8.3"/><path d="M9 14.8h6"/><path d="M9.3 10h0M14.7 10h0"/>')
    + s('face-smile','<circle cx="12" cy="12" r="8.3"/><path d="M8.5 13.2c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8"/><path d="M9.3 10h0M14.7 10h0"/>')
    + s('face-grin','<circle cx="12" cy="12" r="8.3"/><path d="M8 13c1 1.6 2.4 2.4 4 2.4s3-.8 4-2.4z"/><path d="M9.3 9.8h0M14.7 9.8h0"/>')
    + s('award','<circle cx="12" cy="9" r="5"/><path d="M9 13.5 8 21l4-2 4 2-1-7.5"/>')
    + s('lock','<rect x="5" y="10.5" width="14" height="9.5" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><path d="M12 14v2.5"/>')
    + s('check','<path d="M5 12.5l4.5 4.5L19 7"/>')
    + s('ban','<circle cx="12" cy="12" r="8.5"/><path d="M6.1 6.1l11.8 11.8"/>')
    + s('database','<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>')
    /* Instead — the seven lenses + the core loop */
    + s('hourglass','<path d="M7 3.5h10M7 20.5h10"/><path d="M8 3.5v3.2c0 2 4 3.7 4 5.3s-4 3.3-4 5.3v3.2"/><path d="M16 3.5v3.2c0 2-4 3.7-4 5.3s4 3.3 4 5.3v3.2"/>')
    + s('walk','<circle cx="13" cy="4.6" r="1.9"/><path d="M11.4 20.5l1.5-5.2-2.4-2.1.9-4.4 3.1 1.5 2.1 2.4"/><path d="M10.4 9.3L7.6 11l-1.1 3.1"/><path d="M12.9 15.3l2.6 5.2"/>')
    + s('euro','<path d="M17.5 6.4A6.6 6.6 0 0 0 8 8.4a8 8 0 0 0 0 7.2 6.6 6.6 0 0 0 9.5 2"/><path d="M4.8 10.4h7.4M4.8 13.6h7.4"/>')
    + s('moon','<path d="M19 14.4A7.6 7.6 0 0 1 9.6 5a7.8 7.8 0 1 0 9.4 9.4z"/><path d="M17 4l.6 1.7 1.7.6-1.7.6L17 8.6l-.6-1.7-1.7-.6 1.7-.6z"/>')
    + s('speech','<path d="M4.5 5.5h15v9h-8.5L7 18.5V14.5H4.5z"/><path d="M8.5 9h7M8.5 11.6h4.5"/>')
    + s('hammer','<path d="M13.6 7.4 8.2 12.8l-1.4-1.4-2.3 2.3 5 5 2.3-2.3-1.4-1.4 5.4-5.4"/><path d="m14.3 3.6 6.1 6.1-2.4 2.4-6.1-6.1z"/>')
    + s('mirror','<ellipse cx="12" cy="10" rx="6" ry="7.5"/><path d="M12 17.5v3M9 20.5h6"/><path d="M9.6 7.2a4.6 5.6 0 0 0-1.3 3.4"/>')
    + s('clock','<circle cx="12" cy="12" r="8.4"/><path d="M12 7.2V12l3.2 2"/>')
    + s('eye-off','<path d="M4 12s3.2-5.2 8-5.2c1.3 0 2.5.4 3.5 1M20 12s-3.2 5.2-8 5.2c-1.4 0-2.6-.4-3.6-1"/><path d="M4.5 4.5l15 15"/>')
    + s('rewind','<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4.5 5v4h4"/>')
    + s('apple','<path d="M15.8 12.6c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8s-1.7-.8-2.8-.8c-1.4 0-2.7.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.5 2.2 2.6 2.1 1 0 1.4-.7 2.7-.7s1.6.7 2.7.7 1.8-1 2.5-2c.8-1.1 1.1-2.3 1.1-2.3s-2.1-.8-2.1-3.5z" fill="currentColor" stroke="none"/><path d="M13.7 6.1c.6-.7.9-1.7.8-2.7-.8 0-1.8.5-2.4 1.2-.5.6-1 1.6-.9 2.6.9.1 1.9-.4 2.5-1.1z" fill="currentColor" stroke="none"/>')
    + '</defs></svg>';
  function s(id, body){ return '<symbol id="ic-' + id + '" viewBox="0 0 24 24">' + body + '</symbol>'; }
  function injectSprite(){
    if (document.getElementById('ic-home')) return;
    var d = document.createElement('div'); d.innerHTML = SPRITE;
    document.body.insertBefore(d.firstChild, document.body.firstChild);
  }
  if (document.body) injectSprite();
  else document.addEventListener('DOMContentLoaded', injectSprite);

  /* ---- reveal on scroll ---- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.rev').forEach(function (el) { io.observe(el); });

  /* ---- count up ---- */
  function easeOut(t){ return 1 - Math.pow(1 - t, 3); }
  function runCount(el){
    var target = parseFloat(el.getAttribute('data-count'));
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    var pre = el.getAttribute('data-pre') || '';
    var suf = el.getAttribute('data-suf') || '';
    if (reduce){ el.textContent = pre + target.toFixed(dec).replace('.', ',') + suf; return; }
    var dur = 1400, start = null;
    function step(ts){
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var v = target * easeOut(p);
      el.textContent = pre + v.toFixed(dec).replace('.', ',') + suf;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting){ runCount(e.target); cio.unobserve(e.target); } });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(function (el) { cio.observe(el); });

  /* ---- ring fill (skin score) ---- */
  document.querySelectorAll('[data-ring]').forEach(function (ring){
    var pct = parseFloat(ring.getAttribute('data-ring'));
    var fill = ring.getAttribute('data-ring-color') || '#6f8c74';
    function paint(p){ ring.style.background = 'conic-gradient(' + fill + ' 0% ' + p + '%, #e6ece4 ' + p + '% 100%)'; }
    if (reduce){ paint(pct); return; }
    paint(0);
    var rio = new IntersectionObserver(function (entries){
      entries.forEach(function (e){
        if (!e.isIntersecting) return;
        var start=null, dur=1300;
        function step(ts){ if(!start)start=ts; var pr=Math.min((ts-start)/dur,1); paint(pct*easeOut(pr)); if(pr<1) requestAnimationFrame(step); }
        requestAnimationFrame(step); rio.unobserve(e.target);
      });
    }, { threshold:0.5 });
    rio.observe(ring);
  });

  /* ---- segmented feature explorers ---- */
  document.querySelectorAll('[data-explorer]').forEach(function (xp){
    var btns = Array.prototype.slice.call(xp.querySelectorAll('.seg button'));
    var panels = Array.prototype.slice.call(xp.querySelectorAll('.xp-panel'));
    function select(i){
      btns.forEach(function (b,bi){ b.setAttribute('aria-selected', bi===i ? 'true':'false'); });
      panels.forEach(function (p,pi){ p.classList.toggle('on', pi===i); });
    }
    btns.forEach(function (b,i){ b.addEventListener('click', function(){ select(i); }); });
    select(0);
    // auto-advance until user interacts
    var auto = true, idx = 0;
    btns.forEach(function (b){ b.addEventListener('click', function(){ auto=false; }); });
    if (!reduce){
      setInterval(function(){ if(!auto) return; idx=(idx+1)%btns.length; select(idx); }, 4200);
    }
  });

  /* ---- before / after slider ---- */
  document.querySelectorAll('[data-ba]').forEach(function (ba){
    var after = ba.querySelector('.ba-after');
    var handle = ba.querySelector('.ba-handle');
    var range = ba.querySelector('.ba-range');
    function set(p){
      p = Math.max(0, Math.min(100, p));
      ba.style.setProperty('--p', p + '%');
      if (range) range.value = p;
    }
    set(range ? parseFloat(range.value) || 48 : 48);
    if (range){ range.addEventListener('input', function(){ set(parseFloat(range.value)); }); }
    function fromEvent(clientX){
      var r = ba.getBoundingClientRect();
      set(((clientX - r.left) / r.width) * 100);
    }
    var dragging = false;
    ba.addEventListener('pointerdown', function(e){ dragging=true; ba.classList.add('dragging'); fromEvent(e.clientX); ba.setPointerCapture(e.pointerId); });
    ba.addEventListener('pointermove', function(e){ if(dragging) fromEvent(e.clientX); });
    ba.addEventListener('pointerup', function(){ dragging=false; ba.classList.remove('dragging'); });
    ba.addEventListener('pointercancel', function(){ dragging=false; ba.classList.remove('dragging'); });
  });

  /* ---- mobile reviews expand ---- */
  document.querySelectorAll('[data-rev-expand]').forEach(function (wrap) {
    var btn = wrap.querySelector('.rev-expand-btn');
    var more = wrap.querySelectorAll('.review.rev-more');
    if (!btn || !more.length) {
      if (btn) btn.hidden = true;
      return;
    }
    btn.addEventListener('click', function () {
      wrap.classList.add('is-expanded');
      btn.setAttribute('aria-expanded', 'true');
    });
  });

  /* ---- reviews marquee (both card sets are static in the HTML; JS only tunes speed) ---- */
  document.querySelectorAll('[data-rev-marquee]').forEach(function (wrap){
    var track = wrap.querySelector('.rev-track');
    var set = wrap.querySelector('.rev-set');
    if (!track || !set) return;

    var speed = 72; // px per second
    var resizeTimer;

    function setup(){
      var setWidth = set.offsetWidth;
      var duration = setWidth ? setWidth / speed : 30;
      track.style.setProperty('--rev-dur', duration + 's');
    }

    setup();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setup);
    window.addEventListener('load', setup);
    window.addEventListener('resize', function (){
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setup, 180);
    });
  });

  /* ---- 3D tilt ---- */
  if (!reduce && window.matchMedia('(pointer:fine)').matches){
    document.querySelectorAll('[data-tilt]').forEach(function (el){
      var max = parseFloat(el.getAttribute('data-tilt')) || 7;
      el.style.transition = 'transform .12s ease-out';
      var parent = el.closest('[data-tilt-area]') || el;
      parent.addEventListener('mousemove', function(e){
        var r = parent.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - .5;
        var py = (e.clientY - r.top) / r.height - .5;
        el.style.transform = 'perspective(1000px) rotateY(' + (px*max) + 'deg) rotateX(' + (-py*max) + 'deg)';
      });
      parent.addEventListener('mouseleave', function(){ el.style.transform = 'perspective(1000px) rotateY(0) rotateX(0)'; });
    });
  }

  /* ---- scrollspy for product subnav ---- */
  var spy = document.querySelectorAll('.float-seg-page a[href^="#"]');
  if (spy.length){
    var map = {};
    spy.forEach(function (a){ var id=a.getAttribute('href').slice(1); var s=document.getElementById(id); if(s) map[id]=a; });
    var sio = new IntersectionObserver(function (entries){
      entries.forEach(function (e){
        if (e.isIntersecting){
          spy.forEach(function(a){ a.classList.remove('active'); a.style.color=''; });
          if (map[e.target.id]){ map[e.target.id].classList.add('active'); map[e.target.id].style.color=''; }
        }
      });
    }, { rootMargin:'-30% 0px -60% 0px' });
    Object.keys(map).forEach(function (id){ sio.observe(document.getElementById(id)); });
  }

  /* ---- scroll progress ---- */
  var prog = document.getElementById('prog');
  if (prog){
    window.addEventListener('scroll', function(){
      var h = document.documentElement;
      prog.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
    }, { passive:true });
  }

  /* ---- mobile nav border on scroll ---- */
  var mobileNav = document.getElementById('mobile-nav');
  if (mobileNav){
    function mobileNavScroll(){
      mobileNav.classList.toggle('stuck', document.documentElement.scrollTop > 10);
    }
    window.addEventListener('scroll', mobileNavScroll, { passive:true });
    mobileNavScroll();
  }
})();
