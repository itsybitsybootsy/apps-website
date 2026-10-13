// Behavioral coverage for the one-time mobile entry pause.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/mobile-story.js'), 'utf8');
function setup(initialY = 0) {
  let time = 0, id = 0, frames = new Map(), timers = new Map(), mounted;
  const events = new Map(), docEvents = new Map(), classes = new Set();
  const node = () => ({style:{}, attrs:{}, listeners:{}, setAttribute(n,v){this.attrs[n]=v;}, removeAttribute(n){delete this.attrs[n];}, addEventListener(n,f){this.listeners[n]=f;}, click(){this.listeners.click?.();}, textContent:''});
  const phones = Array.from({length:3}, node), steps = Array.from({length:3},node);
  const sticky = {...node(),getBoundingClientRect:()=>({width:390,height:844,left:0,top:0})};
  const frame = {...node(),getBoundingClientRect:()=>({width:352.2,height:806.2,left:18.9,top:18.9})};
  const selectors = {'.ms-sticky':sticky,'.ms-window':frame,'.ms-border':node(),'.ms-border-fill':node(),'.ms-count b':node(),'.ms-label':node()};
  const media={matches:true,addEventListener(n,f){this.change=f;}};
  const window = {scrollY:initialY,matchMedia:()=>media,
    addEventListener:(n,f)=>{if(!events.has(n)) events.set(n,new Set());events.get(n).add(f);},
    removeEventListener:(n,f)=>events.get(n)?.delete(f),
    scrollTo({top}){this.scrollY=Math.max(0,Math.min(7000,Math.round(top*2)/2));fire('scroll',{});}};
  const story = {...node(),offsetHeight:3882,querySelector:s=>selectors[s],
    querySelectorAll:s=>s==='.ms-phone'?phones:s==='.ms-step'?steps:[node(),node()],
    getBoundingClientRect:()=>({top:720-window.scrollY}),remove(){mounted=null;}};
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
  function finger(y){return {identifier:1,clientX:190,clientY:y};}
  function touchStart(y){fire('touchstart',{touches:[finger(y)]});}
  function touchMove(y){let canceled=false;fire('touchmove',{touches:[finger(y)],cancelable:true,preventDefault(){canceled=true;}});return canceled;}
  const touchEnd=()=>fire('touchend',{});
  const nativeY=y=>window.scrollTo({top:y});
  const remount=()=>{media.matches=false;media.change();media.matches=true;media.change();};
  return {window,phones,steps,selectors,wheel,tick,settle,settleMotion,touchStart,touchMove,touchEnd,nativeY,fire,docEvents,remount,classes};
}

const first=1449; // End of zoom: 720 + .24 * (3882 - 844), rounded to half a px.
{
  const t=setup();assert(t.wheel(9000));
  for(let i=0;i<100;i++){t.wheel(2,0);t.tick(16);}
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
  const t=setup(1350);t.touchStart(300);assert(t.touchMove(100));t.tick(32);
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
  const t=setup(1350);t.touchStart(300);t.touchMove(100);t.tick(32);const before=t.window.scrollY;
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
  const t=setup();const positions=[1555.5,2482,3484.5];
  for(const i of [0,2,1,0]){t.steps[i].click();t.settle();assert.equal(t.window.scrollY,positions[i]);assert.equal(t.steps[i].attrs['aria-current'],'step');}
  assert.equal(t.wheel(-9000),false);assert.equal(t.window.scrollY,0);
  assert.equal(t.wheel(9000),false);
  console.log('PASS all three manual controls select their screens without rearming entry');
}
{
  const t=setup();t.wheel(9000);t.tick(32);
  assert(t.wheel(50,220),'an early new wheel event cannot cancel the zoom');
  t.settleMotion();assert.equal(t.window.scrollY,first);
  assert(t.classes.has('mobile-entry-paused'));
  assert(t.wheel(1,100),'the full-size pause must actually be visible');
  assert.equal(t.window.scrollY,first);
  t.tick(210);assert(!t.classes.has('mobile-entry-paused'));
  assert.equal(t.wheel(1,0),false);assert.equal(t.window.scrollY,first+1);
  console.log('PASS arrival completes and pauses before a new forward gesture continues');
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
  t.tick(320);assert(t.touchMove(460));assert.equal(t.window.scrollY,first+20);
  t.touchEnd();t.settle();assert.equal(t.window.scrollY,first+20);
  console.log('PASS a touch begun during the pause continues freely afterwards');
}
{
  const t=setup();t.wheel(9000);t.settleMotion();assert(t.classes.has('mobile-entry-paused'));
  assert.equal(t.wheel(-1,0),false);t.settle();assert.equal(t.window.scrollY,first-1);
  assert(!t.classes.has('mobile-entry-paused'));
  console.log('PASS backward input is free even during the short full-size pause');
}
{
  const t=setup();t.touchStart(700);t.touchMove(600);t.fire('touchcancel',{});
  t.nativeY(5000);t.settle();assert.equal(t.window.scrollY,first);
  t.nativeY(6000);t.settle();assert.equal(t.window.scrollY,first);
  console.log('PASS native touch cancellation does not release incoming momentum');
}
{
  const t=setup();t.wheel(9000);t.tick(32);t.fire('pageshow',{persisted:false});
  t.settleMotion();assert.equal(t.window.scrollY,first);assert(t.classes.has('mobile-entry-paused'));
  t.fire('pageshow',{persisted:true});assert(!t.classes.has('mobile-entry-paused'));
  assert.equal(t.wheel(100),false);
  console.log('PASS initial pageshow preserves arrival; history restoration leaves it free');
}
