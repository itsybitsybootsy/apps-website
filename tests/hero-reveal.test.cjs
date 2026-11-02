const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/hero6.js'), 'utf8');
const flush = () => new Promise(setImmediate);
function element() {
  const classes = new Set();
  return { classes, classList: {
    add(...x) { x.forEach(v => classes.add(v)); }, remove(...x) { x.forEach(v => classes.delete(v)); },
    toggle(x, on) { on ? classes.add(x) : classes.delete(x); }
  }, values: {}, style: {setProperty(k, v) { this[k] = v; }},
  setAttribute(k, v) { this.values[k] = v; }, getAttribute(k) { return this.values[k]; } };
}
async function setup(g, reduce = false, manual = false) {
  const photo = element(), hero = element(), flash = element(), root = element(), requests = [], queue = new Map();
  let now = 0, frameId = 0, fades = 0;
  const live = {before: element(), after: element()};
  function replaceWith(node) {
    if (live.before === this) live.before = node;
    else if (live.after === this) live.after = node;
    else throw Error('Attempt to replace a detached image');
  }
  live.before.src = 'assets/img/hero/f/before-body.webp'; live.after.src = 'assets/img/hero/f/after.webp';
  live.before.replaceWith = live.after.replaceWith = replaceWith;
  photo.querySelector = s => s.includes('before') ? live.before : live.after;
  photo.animate = () => { fades++; return {cancel() {}}; };
  const buttons = ['f', 'm'].map(g => Object.assign(element(), {dataset: {g}, handlers: {}, addEventListener(k, f) {this.handlers[k] = f;}}));
  hero.querySelector = s => s === '[data-photo]' ? photo : s === '.hero6-flash' ? flash : element();
  hero.querySelectorAll = () => buttons;
  class Image {
    constructor() { Object.assign(this, element()); this.replaceWith = replaceWith; }
    set src(value) {
      this._src = value;
      requests.push(this);
      if (!manual) queueMicrotask(() => this.onload && this.onload());
    }
    get src() { return this._src; }
    decode() { return manual ? new Promise((resolve, reject) => { this.decoded = resolve; this.decodeFailed = reject; }) : Promise.resolve(); }
  }
  const context = { document: {getElementById: () => hero, querySelector: () => null, documentElement: root, body: element()},
    matchMedia: q => ({matches: q.includes('reduced-motion') && reduce}), IntersectionObserver: class {observe() {}},
    URLSearchParams, URL, location: {search: '?g=' + g, href: 'http://localhost/?g=' + g},
    sessionStorage: {getItem() {}, setItem() {}}, history: {replaceState() {}}, performance: {now: () => now},
    requestAnimationFrame: f => { queue.set(++frameId, f); return frameId; }, cancelAnimationFrame: id => queue.delete(id), Image,
    fetch: () => Promise.reject(Error('No metadata in harness')) };
  vm.runInNewContext(source, context); await flush();
  return {photo, hero, root, queue, requests, get before() {return live.before;}, get after() {return live.after;}, get fades() {return fades;},
    tick(t) { now = t; assert(queue.size, 'animation scheduled'); const frames = [...queue.values()]; queue.clear(); frames.forEach(f => f(t)); },
    switch(g, keyboard = false) { buttons.find(b => b.dataset.g === g).handlers.click({detail: keyboard ? 0 : 1}); },
    async finish(g, {fail = false, maskFail = false, delayDecode = false} = {}) {
      const batch = requests.filter(img => img.src.includes('/' + g + '/') && (img.className || img.src.endsWith('mask.webp')) && !img.settled);
      for (const img of batch) {
        img.settled = true;
        if (fail || (maskFail && img.src.endsWith('mask.webp'))) img.onerror();
        else { img.onload(); if (!delayDecode) img.decoded(); }
      }
      await flush(); return batch;
    }
  };
}
(async () => {
  for (const g of ['f', 'm']) {
    const x = await setup(g); x.tick(5099);
    assert(x.photo.classes.has('live')); assert(!x.photo.classes.has('done'));
    x.tick(5100); assert(x.photo.classes.has('done')); assert(!x.photo.classes.has('live'));
    assert.equal(x.photo.style['--p'], '0.00%'); assert.equal(x.queue.size, 1);
    x.tick(6000); assert.equal(x.photo.style['--sc'], '1.0000'); assert.equal(x.queue.size, 0);
    assert(x.before.src.includes('/' + g + '/'));
    console.log('PASS ' + g + ': reveal and camera settle retain the original timing');
  }
  const initial = await setup('m', false, true);
  assert.equal(initial.photo.values['data-ready'], undefined, 'hide the HTML woman on a direct male visit');
  const decoding = await initial.finish('m', {delayDecode: true});
  assert.equal(initial.photo.values['data-ready'], undefined, 'loading alone is insufficient; wait for decode');
  decoding.forEach(img => img.decoded()); await flush();
  assert(initial.before.src.includes('/m/')); assert(initial.after.src.includes('/m/'));
  assert.equal(initial.photo.values['data-ready'], ''); assert.equal(initial.root.values['data-g'], 'm');
  console.log('PASS direct male entry stays hidden until both selected images decode');

  const pending = await setup('f', false, true); await pending.finish('f'); pending.tick(6000);
  const oldBefore = pending.before, oldProgress = pending.photo.style['--p'];
  pending.switch('m');
  assert.equal(pending.before, oldBefore); assert.equal(pending.root.values['data-g'], 'f');
  assert.equal(pending.photo.style['--p'], oldProgress, 'do not reveal the old before-image while waiting');
  await pending.finish('m'); assert(pending.before.src.includes('/m/')); assert(pending.after.src.includes('/m/'));
  assert.equal(pending.fades, 1);
  console.log('PASS switching retains the previous frame until the decoded pair is committed together');

  const race = await setup('m', false, true); race.switch('f'); race.switch('m');
  await race.finish('m'); const committed = race.before; await race.finish('f');
  assert.equal(race.before, committed); assert.equal(race.root.values['data-g'], 'm');
  assert(race.photo.style['--mask'].includes('/m/'));
  console.log('PASS out-of-order image and mask completion cannot restore a stale portrait');

  const failed = await setup('m', false, true); await failed.finish('m'); failed.tick(2000);
  failed.switch('f'); await failed.finish('f', {fail: true});
  assert(failed.before.src.includes('/m/')); assert(failed.after.src.includes('/m/'));
  assert.equal(failed.root.values['data-g'], 'm'); assert.equal(failed.hero.values['aria-busy'], 'false');
  assert(failed.photo.classes.has('done')); assert.equal(failed.photo.style['--p'], '0.00%');
  failed.switch('f'); await failed.finish('f', {maskFail: true});
  assert(failed.before.src.includes('/f/')); assert(failed.photo.style['--mask'].includes('/f/after.webp'));
  console.log('PASS failed requests retain the current person, can retry, and tolerate a missing mask');

  const reduced = await setup('f', true); assert(reduced.photo.classes.has('done')); assert.equal(reduced.queue.size, 0);
  reduced.switch('m'); await flush(); assert.equal(reduced.fades, 0); assert(reduced.before.src.includes('/m/'));
  const keyboard = await setup('f'); keyboard.switch('m', true); await flush(); assert.equal(keyboard.fades, 0);
  console.log('PASS reduced motion and keyboard switching omit the transition fade');
})().catch(e => { console.error(e); process.exitCode = 1; });
