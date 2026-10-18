// Behavioral coverage for mobile entry, viewport alignment and horizontal swipes.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/mobile-story.js'), 'utf8');
function setup(initialY = 0, withViewport = false) {
  let time = 0, id = 0, frames = new Map(), timers = new Map(), mounted;
  const events = new Map(), docEvents = new Map(), classes = new Set();
  const node = () => ({style:{setProperty(n,v){this[n]=v;}}, attrs:{}, listeners:{}, setAttribute(n,v){this.attrs[n]=v;}, removeAttribute(n){delete this.attrs[n];}, addEventListener(n,f){this.listeners[n]=f;}, click(){this.listeners.click?.();}, textContent:''});
  const phones = Array.from({length:3}, node), steps = Array.from({length:3},node);
  const visibleHeight = () => parseFloat(story.style['--ms-viewport-height']) || 844;
  const sticky = {...node(),getBoundingClientRect:()=>({width:390,height:visibleHeight(),left:0,top:0})};
  const frame = {...node(),contains:target=>target===frame || phones.includes(target),getBoundingClientRect:()=>({width:352.2,height:visibleHeight()-37.8,left:18.9,top:18.9})};
  const rects = [node(),node()], viewportEvents = new Set();
  const viewport = {height:844,scale:1,addEventListener:(n,f)=>viewportEvents.add(f),removeEventListener:(n,f)=>viewportEvents.delete(f)};
  const selectors = {'.ms-sticky':sticky,'.ms-window':frame,'.ms-border':node(),'.ms-border-fill':node(),'.ms-count b':node(),'.ms-label':node()};
  const media={matches:true,addEventListener(n,f){this.change=f;}};
  const window = {scrollY:initialY,matchMedia:()=>media,
    addEventListener:(n,f)=>{if(!events.has(n)) events.set(n,new Set());events.get(n).add(f);},
    removeEventListener:(n,f)=>events.get(n)?.delete(f),
    scrollTo({top}){this.scrollY=Math.max(0,Math.min(7000,Math.round(top*2)/2));fire('scroll',{});}};
  if (withViewport) window.visualViewport = viewport;
  const story = {...node(),offsetHeight:3376,querySelector:s=>selectors[s],
    querySelectorAll:s=>s==='.ms-phone'?phones:s==='.ms-step'?steps:rects,
    getBoundingClientRect:()=>({top:720-window.scrollY,height:2532+visibleHeight()}),remove(){mounted=null;}};
  const section = {appendChild(e){mounted=e;}};
  const document = {querySelector:s=>s==='#funktionen'?section:null,createElement:()=>story,body:{},
    documentElement:{classList:{add:c=>classes.add(c),remove:(...cs)=>cs.forEach(c=>classes.delete(c)),toggle:(c,b)=>b?classes.add(c):classes.delete(c)}},
    addEventListener:(n,f)=>docEvents.set(n,f),removeEventListener:(n)=>docEvents.delete(n)};
  function fire(name,event){for(const f of events.get(name)||[])f(event);}
  vm.runInNewContext(source,{window,document,performance:{now:()=>time},
    requestAnimationFrame:f=>{frames.set(++id,f);return id;},cancelAnimationFrame:i=>frames.delete(i),
    setTimeout:(f,ms)=>{timers.set(++id,{f,at:time+ms});return id;},clearTimeout:i=>timers.delete(i),
    getComputedStyle:()=>({getPropertyValue:()=> '36px'}),ResizeObserver:class{observe(){}disconnect(){}}});
  function tick(ms=16){time+=ms;const batch=[...frames];frames.clear();for(const [,f]of batch)f(time);for(const [i,t]of [...timers])if(t.at<=time){timers.delete(i);t.f();}}
  function settleMotion(){for(let i=0;frames.size&&i<300;i++)tick();assert.equal(frames.size,0,'animation must settle');}
  function settle(){for(let i=0;(frames.size||timers.size)&&i<300;i++)tick();assert.equal(frames.size+timers.size,0,'arrival and pause must settle');}
  function wheel(delta,dt=220){time+=dt;let canceled=false;fire('wheel',{deltaY:delta,deltaX:0,deltaMode:0,cancelable:true,preventDefault(){canceled=true;}});if(!canceled)window.scrollTo({top:window.scrollY+delta});return canceled;}
  function finger(y,x=190){return {identifier:1,clientX:x,clientY:y};}
  function touchStart(y,x=190,target=null){fire('touchstart',{touches:[finger(y,x)],target});}
  function touchMove(y,x=190,dt=0){time+=dt;let canceled=false;fire('touchmove',{touches:[finger(y,x)],cancelable:true,preventDefault(){canceled=true;}});return canceled;}
  const touchEnd=()=>fire('touchend',{});
  const swipeStart=(x,y=420)=>touchStart(y,x,frame);
  const swipeMove=(x,y=420,dt=16)=>touchMove(y,x,dt);
  const swipeEnd=(x,y=420,dt=16)=>{time+=dt;fire('touchend',{changedTouches:[finger(y,x)]});};
  const nativeY=y=>window.scrollTo({top:y});
  const remount=()=>{media.matches=false;media.change();media.matches=true;media.change();};
  const resizeViewport=(height,emit=true,scale=1)=>{viewport.height=height;viewport.scale=scale;if(emit)for(const f of viewportEvents)f();};
  const unmount=()=>{media.matches=false;media.change();};
  return {window,phones,steps,selectors,wheel,tick,settle,settleMotion,touchStart,touchMove,touchEnd,nativeY,fire,docEvents,remount,classes,story,rects,viewportEvents,resizeViewport,unmount,swipeStart,swipeMove,swipeEnd};
}

const first=1327.5; // End of zoom: 720 + .24 * (3376 - 844), rounded to half a px.
{
  const t=setup();assert(t.wheel(9000));
  t.settle();assert.equal(t.window.scrollY,first);
  assert.equal(t.wheel(1),false);assert.equal(t.window.scrollY,first+1);
  assert.equal(t.wheel(9000,16),false);assert.equal(t.window.scrollY,7000);
  console.log('PASS first fast entry stops once; the next gesture and the rest of the tour are free');
}
{
  const t=setup();t.wheel(9000);t.tick(32);const before=t.window.scrollY;
  assert.equal(t.wheel(-100,10),false);t.settle();assert.equal(t.window.scrollY,before-100);
  t.nativeY(0);assert.equal(t.wheel(9000),false);assert.equal(t.window.scrollY,7000);
  console.log('PASS backward input interrupts the initial arrival and does not rearm it');
}
{
  const t=setup(5000);assert.equal(t.wheel(-9000),false);assert.equal(t.window.scrollY,0);
  assert.equal(t.wheel(9000),false);assert.equal(t.window.scrollY,7000);
  console.log('PASS entering backward from below is never caught');
}
{
  const t=setup(1200);t.touchStart(300);assert(t.touchMove(100));t.tick(32);
  assert(t.touchMove(0));t.touchEnd();t.settle();assert.equal(t.window.scrollY,first);
  t.touchStart(700);assert.equal(t.touchMove(500),false);t.nativeY(first+200);t.touchEnd();t.settle();assert.equal(t.window.scrollY,first+200);
  console.log('PASS only the incoming touch is held; subsequent touches scroll natively');
}
{
  const t=setup();t.touchStart(700);assert.equal(t.touchMove(600),false);t.nativeY(100);t.touchEnd();
  t.nativeY(5000);t.settle();assert.equal(t.window.scrollY,first);
  t.nativeY(300);t.settle();assert.equal(t.window.scrollY,300);
  console.log('PASS a fling entering after touch release is caught once, with free return');
}
{
  const t=setup(1200);t.touchStart(300);t.touchMove(100);t.tick(32);const before=t.window.scrollY;
  assert(t.touchMove(200));assert(t.touchMove(300));t.touchEnd();t.settle();assert.equal(t.window.scrollY,before-200);
  console.log('PASS the captured finger can reverse freely within the same touch');
}
{
  const t=setup(1000);assert.equal(t.wheel(1),false);t.settle();assert.equal(t.window.scrollY,1001);
  t.fire('scrollend',{});t.settle();assert.equal(t.window.scrollY,1001);
  console.log('PASS slow scrolling before entry has no automatic advance or snapping');
}
{
  const t=setup();t.wheel(9000);t.settle();t.nativeY(0);t.remount();
  assert.equal(t.wheel(9000),false);
  const fresh=setup();assert(fresh.wheel(9000));fresh.settle();assert.equal(fresh.window.scrollY,first);
  console.log('PASS breakpoint remount keeps the used entry; a new page load resets it');
}
{
  const t=setup();const positions=[1416.5,2188.5,3024];
  for(const i of [0,2,1,0]){t.steps[i].click();t.settle();assert.equal(t.window.scrollY,positions[i]);assert.equal(t.steps[i].attrs['aria-current'],'step');}
  assert.equal(t.wheel(-9000),false);assert.equal(t.window.scrollY,0);
  assert.equal(t.wheel(9000),false);
  console.log('PASS all three manual controls select their screens without rearming entry');
}
{
  const t=setup();t.wheel(9000);t.tick(32);
  assert(t.wheel(50,220),'an early new wheel event cannot cancel the zoom');
  t.settleMotion();assert.equal(t.window.scrollY,first);
  assert.equal(t.wheel(1,0),false);assert.equal(t.window.scrollY,first+1);
  console.log('PASS arrival completes at full size without a scroll lock');
}
{
  const t=setup();t.touchStart(700);t.touchMove(600);t.touchEnd();t.nativeY(5000);
  t.settle();
  for(const y of [1600,4000,6000]){t.nativeY(y);t.settle();assert.equal(t.window.scrollY,first);}
  assert(/scale\(1(?:\.0+)?\)/.test(t.phones[0].style.transform));
  t.touchStart(500);assert.equal(t.touchMove(480),false);t.nativeY(first+20);t.touchEnd();
  assert.equal(t.window.scrollY,first+20);
  console.log('PASS residual native fling positions cannot bypass the full-size ceiling');
}
{
  const t=setup();t.wheel(9000);t.tick(32);t.touchStart(500);
  assert(t.touchMove(480),'a new touch cannot cancel the arrival before full size');
  t.settleMotion();assert.equal(t.window.scrollY,first);
  assert(t.touchMove(460));assert.equal(t.window.scrollY,first+20);
  t.touchEnd();t.settle();assert.equal(t.window.scrollY,first+20);
  console.log('PASS a touch begun during the pause continues freely afterwards');
}
{
  const t=setup();t.wheel(9000);t.settleMotion();
  assert.equal(t.wheel(-1,0),false);t.settle();assert.equal(t.window.scrollY,first-1);
  console.log('PASS backward input stays free after the first arrival');
}
{
  const t=setup();t.touchStart(700);t.touchMove(600);t.fire('touchcancel',{});
  t.nativeY(5000);t.settle();assert.equal(t.window.scrollY,first);
  t.nativeY(6000);t.settle();assert.equal(t.window.scrollY,first);
  console.log('PASS native touch cancellation does not release incoming momentum');
}
{
  const t=setup();t.wheel(9000);t.tick(32);t.fire('pageshow',{persisted:false});
  t.settleMotion();assert.equal(t.window.scrollY,first);
  t.fire('pageshow',{persisted:true});
  assert.equal(t.wheel(100),false);
  console.log('PASS initial pageshow preserves arrival; history restoration leaves it free');
}
{
  const t=setup(0,true);
  // The document scroll can precede both CSS dvh and the viewport resize event.
  t.resizeViewport(764.375,false);
  assert(t.wheel(9000));
  assert.equal(t.story.style['--ms-viewport-height'],'764.38px');
  assert(Math.abs(Number(t.rects[0].attrs.height)-(764.38-37.8))<.001,
    'the SVG and visible frame must align without waiting for ResizeObserver');
  t.settle();assert.equal(t.window.scrollY,first);
  assert(/scale\(1(?:\.0+)?\)/.test(t.phones[0].style.transform));
  assert.equal(t.wheel(1),false);
  console.log('PASS fast entry aligns the frame immediately even before the viewport resize event');
}
{
  const t=setup(0,true);t.steps[1].click();t.settle();
  const y=t.window.scrollY, transform=t.phones[1].style.transform;
  const progress=t.selectors['.ms-border-fill'].style.strokeDashoffset;
  for(const height of [764,784.25,824.75,844]){
    t.resizeViewport(height);
    assert.equal(Number(t.rects[0].attrs.height),height-37.8);
    assert.equal(t.rects[0].attrs.height,t.rects[1].attrs.height);
    t.settle();assert.equal(t.window.scrollY,y);
    assert.equal(t.phones[1].style.transform,transform);
    assert.equal(t.selectors['.ms-border-fill'].style.strokeDashoffset,progress);
    assert.equal(t.steps[1].attrs['aria-current'],'step');
  }
  console.log('PASS browser-bar movement keeps all frame edges aligned without changing the screen or scroll progress');
}
{
  const t=setup(0,true);t.resizeViewport(764);t.settle();
  const frame=t.rects[0].attrs.height;
  t.resizeViewport(382,true,2);t.settle();
  assert.equal(t.rects[0].attrs.height,frame,'pinch zoom must not resize the tour');
  t.resizeViewport(844);t.settle();assert.equal(Number(t.rects[0].attrs.height),844-37.8);
  assert.equal(t.viewportEvents.size,1);t.remount();assert.equal(t.viewportEvents.size,1);
  t.unmount();assert.equal(t.viewportEvents.size,0);
  console.log('PASS pinch zoom remains native and viewport listeners are cleaned up on unmount');
}
{
  const t=setup();t.steps[0].click();t.settle();
  for(const [from,to,screen,y] of [[300,60,1,2188.5],[300,60,2,3024],[60,300,1,2188.5],[60,300,0,1416.5]]){
    t.swipeStart(from);assert(t.swipeMove(to,420,300));t.swipeEnd(to,420,150);t.settle();
    assert.equal(t.window.scrollY,y);assert.equal(t.steps[screen].attrs['aria-current'],'step');
  }
  assert.equal(t.wheel(10),false);
  console.log('PASS horizontal swipes select all three phones forwards and backwards and preserve native vertical scrolling');
}
{
  const t=setup();t.steps[0].click();t.settle();t.swipeStart(300);
  assert(t.swipeMove(210,420,200));t.tick();
  const x=Number(t.phones[0].style.transform.match(/-50% \+ ([-\d.]+)px/)[1]);
  assert(Math.abs(x+90)<.3,'the screen must follow the finger, not wait until release');
  t.swipeEnd(210,420,150);t.settle();assert.equal(t.window.scrollY,1416.5);
  console.log('PASS dragging follows the finger and a small slow swipe returns to a complete screen');
}
{
  const t=setup();t.steps[0].click();t.settle();
  t.swipeStart(300);t.swipeMove(265,420,40);t.swipeEnd(265,420,10);t.settle();assert.equal(t.window.scrollY,2188.5);
  t.swipeStart(100);t.swipeMove(135,420,40);t.swipeEnd(135,420,10);t.settle();assert.equal(t.window.scrollY,1416.5);
  t.swipeStart(300);t.swipeMove(265,420,40);t.swipeEnd(265,420,200);t.settle();assert.equal(t.window.scrollY,1416.5);
  console.log('PASS short flicks work in both directions and holding before release clears stale momentum');
}
{
  const t=setup();t.steps[0].click();t.settle();const y=t.window.scrollY;
  t.swipeStart(190,500);assert.equal(t.swipeMove(194,400,100),false);t.nativeY(y+100);
  t.swipeEnd(194,400);t.settle();assert.equal(t.window.scrollY,y+100);
  t.touchStart(420,300);assert.equal(t.touchMove(420,60,100),false);t.touchEnd();t.settle();
  assert.equal(t.window.scrollY,y+100,'a swipe outside the phone window must do nothing');
  console.log('PASS vertical gestures stay native and horizontal gestures outside the phone window are ignored');
}
{
  const t=setup();t.wheel(9000);t.settleMotion();
  t.swipeStart(300);assert(t.swipeMove(60,420,300));t.swipeEnd(60,420,150);t.settle();
  assert.equal(t.window.scrollY,2188.5);
  t.nativeY(0);assert.equal(t.wheel(9000),false);
  console.log('PASS an explicit swipe continues from the first full-size pause without rearming the entry barrier');
}
{
  const t=setup();t.steps[0].click();t.settle();
  t.swipeStart(100);t.swipeMove(300,420,40);t.swipeEnd(300);t.settle();assert.equal(t.window.scrollY,1416.5);
  t.swipeStart(380);t.swipeMove(-400,420,40);t.swipeEnd(-400);t.settle();assert.equal(t.window.scrollY,2188.5);
  t.steps[2].click();t.settle();t.swipeStart(300);t.swipeMove(60,420,40);t.swipeEnd(60);t.settle();
  assert.equal(t.window.scrollY,3024);
  console.log('PASS swipe bounds do not wrap and a strong gesture advances at most one phone');
}
{
  const t=setup();t.steps[0].click();t.settle();
  t.swipeStart(300);t.swipeMove(60,420,200);t.fire('touchcancel',{});t.settle();assert.equal(t.window.scrollY,2188.5);
  t.swipeStart(300);t.swipeMove(270,420,200);t.fire('touchstart',{touches:[{},{}]});t.settle();
  assert.equal(t.window.scrollY,2188.5,'pinch handoff must not throw the next screen');
  assert.equal(t.swipeMove(60),false);
  console.log('PASS cancellation settles on a complete phone and multi-touch hands control back to the browser');
}
