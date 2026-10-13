// Behavioral regressions for mobile input. No browser dependencies required.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/mobile-story.js'), 'utf8');
function setup(initialY = 0) {
  let time = 0, id = 0, frames = new Map(), mounted;
  const events = new Map(), docEvents = new Map(), classes = new Set();
  const node = () => ({style:{}, setAttribute(){}, removeAttribute(){}, textContent:''});
  const phones = Array.from({length:3}, node), steps = Array.from({length:3},node);
  const sticky = {...node(),getBoundingClientRect:()=>({width:390,height:844,left:0,top:0})};
  const frame = {...node(),getBoundingClientRect:()=>({width:352.2,height:806.2,left:18.9,top:18.9})};
  const selectors = {'.ms-sticky':sticky,'.ms-window':frame,'.ms-border':node(),'.ms-border-fill':node(),'.ms-count b':node(),'.ms-label':node()};
  const window = {scrollY:initialY,matchMedia:()=>({matches:true,addEventListener(){}}),
    addEventListener:(n,f)=>{if(!events.has(n)) events.set(n,new Set());events.get(n).add(f);},
    removeEventListener:(n,f)=>events.get(n)?.delete(f),
    scrollTo({top}){this.scrollY=Math.round(top*2)/2;fire('scroll',{});}};
  const story = {...node(),offsetHeight:3882,querySelector:s=>selectors[s],
    querySelectorAll:s=>s==='.ms-phone'?phones:s==='.ms-steps span'?steps:[node(),node()],
    getBoundingClientRect:()=>({top:720-window.scrollY}),remove(){mounted=null;}};
  const section = {appendChild(e){mounted=e;}};
  const document = {querySelector:s=>s==='#funktionen'?section:null,createElement:()=>story,body:{},
    documentElement:{classList:{add:c=>classes.add(c),remove:(...cs)=>cs.forEach(c=>classes.delete(c)),toggle:(c,b)=>b?classes.add(c):classes.delete(c)}},
    addEventListener:(n,f)=>docEvents.set(n,f),removeEventListener:(n)=>docEvents.delete(n)};
  function fire(name,event){for(const f of events.get(name)||[])f(event);}
  vm.runInNewContext(source,{window,document,performance:{now:()=>time},
    requestAnimationFrame:f=>{frames.set(++id,f);return id;},cancelAnimationFrame:i=>frames.delete(i),
    getComputedStyle:()=>({getPropertyValue:()=> '36px'}),ResizeObserver:class{observe(){}disconnect(){}}});
  function tick(ms=16){time+=ms;const batch=[...frames];frames.clear();for(const [,f]of batch)f(time);}
  function settle(){for(let i=0;frames.size&&i<300;i++)tick();assert.equal(frames.size,0,'animation must settle');}
  function wheel(delta,dt=220){time+=dt;let canceled=false;fire('wheel',{deltaY:delta,deltaX:0,deltaMode:0,cancelable:true,preventDefault(){canceled=true;}});if(!canceled)window.scrollTo({top:window.scrollY+delta});return canceled;}
  function finger(y,x=190){return {identifier:1,clientX:x,clientY:y};}
  function touchStart(y){fire('touchstart',{touches:[finger(y)]});}
  function touchMove(y,x=190){let canceled=false;fire('touchmove',{touches:[finger(y,x)],cancelable:true,preventDefault(){canceled=true;}});return canceled;}
  const touchEnd=()=>fire('touchend',{});
  const nativeY=y=>window.scrollTo({top:y});
  return {window,phones,selectors,wheel,tick,settle,touchStart,touchMove,touchEnd,nativeY,fire,docEvents};
}
const targets=[720,1555.5,2482,3484.5,3758];
function at(t,index){assert.equal(t.window.scrollY,targets[index]);}
{
  const t=setup();assert(t.wheel(9000));t.tick();assert(t.wheel(9000,10));t.settle();at(t,1);
  for(let i=2;i<5;i++){assert(t.wheel(9000));t.settle();at(t,i);}
  assert.equal(t.wheel(100),false,'leave after final boundary');assert(t.window.scrollY>3758);
  console.log('PASS fast forward input: each screen, then free exit');
}
{
  const t=setup(targets[1]);t.wheel(9000);t.tick(32);t.wheel(9000,220);t.settle();at(t,2);
  t.wheel(9000);t.tick(32);const before=t.window.scrollY;t.wheel(-9000,10);
  assert.equal(t.window.scrollY,before,'retarget must not teleport');t.settle();at(t,2);
  t.wheel(-9000);t.settle();at(t,1);t.wheel(-9000);t.settle();at(t,0);
  assert.equal(t.wheel(-100),false,'leave above first boundary');
  console.log('PASS consecutive flicks, live reversal and backward exit');
}
{
  const t=setup(targets[1]);t.touchStart(700);assert(t.touchMove(697));t.settle();at(t,1);
  assert(t.touchMove(500));t.tick(32);assert(t.touchMove(200));t.touchEnd();t.settle();at(t,2);
  t.touchStart(200);assert(t.touchMove(500));t.touchEnd();t.settle();at(t,1);
  t.touchStart(700);t.touchMove(500);t.tick(32);t.touchMove(300);t.touchMove(340);t.touchEnd();t.settle();at(t,1);
  console.log('PASS touch threshold, long swipe, reverse swipe and live touch reversal');
}
{
  const t=setup();t.touchStart(700);assert.equal(t.touchMove(600),false);t.nativeY(100);t.touchEnd();t.nativeY(3600);t.settle();at(t,1);
  const up=setup(5000);up.touchStart(300);assert.equal(up.touchMove(400),false);up.nativeY(4900);up.touchEnd();up.nativeY(1000);up.settle();at(up,3);
  console.log('PASS native touch momentum entering from either side');
}
{
  const t=setup(targets[1]);t.wheel(9000);t.tick(32);t.docEvents.get('click')({target:{closest:()=>({})}});t.nativeY(0);t.settle();assert.equal(t.window.scrollY,0);
  console.log('PASS navigation interrupts motion');
}

{
  const t=setup(targets[1]);
  for(let i=0;i<200;i++){t.wheel(2,0);t.tick(16);}
  t.settle();assert(t.window.scrollY>=targets[3], 'continuous gentle scrolling must progress without a pause');
  console.log('PASS continuous 2px wheel input advances through screens');
}
{
  const t=setup();t.wheel(9000);
  for(let i=0;i<200;i++){t.wheel(2,0);t.tick(16);}
  t.settle();at(t,1);
  console.log('PASS a hard flick with a long soft momentum tail still stops at one screen');
}
{
  const t=setup(targets[1]);t.wheel(1);t.wheel(1,16);t.wheel(1,16);t.wheel(1,16);t.settle();at(t,2);
  console.log('PASS tiny wheel deltas accumulate instead of being discarded');
}
{
  const t=setup(targets[1]);t.touchStart(700);
  for(let i=1;i<=600;i++){t.tick(16);assert(t.touchMove(700-i));}
  t.touchEnd();t.settle();assert(t.window.scrollY>targets[4], 'one slow drag should be able to reach the exit and continue into the page');
  console.log('PASS slow 1px touch moves continue through the tour and into the page');
}
{
  const t=setup(targets[1]);t.touchStart(700);t.tick(16);t.touchMove(692);t.touchEnd();t.settle();at(t,2);
  console.log('PASS a short gentle touch gesture reaches the next full screen');
}

{
  const t=setup(targets[3]);
  for(let i=0;i<160;i++){t.wheel(-2,0);t.tick(16);}
  t.settle();assert(t.window.scrollY<=targets[1], 'gentle reverse scrolling must keep advancing without a pause');
  console.log('PASS continuous gentle wheel input works backward');
}
{
  const t=setup(5000);t.wheel(-9000);
  for(let i=0;i<200;i++){t.wheel(-2,0);t.tick(16);}
  t.settle();at(t,3);
  console.log('PASS backward hard flick retains its stop through a soft momentum tail');
}
{
  const t=setup(targets[3]);t.touchStart(200);
  for(let i=1;i<=600;i++){t.tick(16);assert(t.touchMove(200+i));}
  t.touchEnd();t.settle();assert(t.window.scrollY<targets[0]);
  console.log('PASS a continuous slow backward drag reaches and leaves the start');
}
{
  const t=setup(targets[1]);t.touchStart(700);t.touchMove(600,193);t.tick(32);
  assert(t.touchMove(700,193));t.touchEnd();t.settle();at(t,1);
  console.log('PASS reverse touch crossing its original start keeps its vertical intent');
}
{
  const t=setup(targets[1]);t.wheel(9000);
  for(let i=0;i<30;i++){t.wheel(-1,16);t.tick(16);t.wheel(2,16);t.tick(16);}
  t.settle();at(t,2);
  t.wheel(-1);t.wheel(-1,16);t.wheel(-1,16);t.wheel(-1,16);t.settle();at(t,1);
  console.log('PASS trackpad noise does not reverse; a deliberate tiny reverse does');
}
{
  for(const direction of [-1,1]) {
    const gentle=setup(targets[2]), firm=setup(targets[2]);
    gentle.wheel(direction);firm.wheel(direction*9000);
    for(let i=0;i<10;i++){gentle.tick(16);firm.tick(16);}
    const gentleTravel=Math.abs(gentle.window.scrollY-targets[2]);
    const firmTravel=Math.abs(firm.window.scrollY-targets[2]);
    assert(gentleTravel>0 && gentleTravel<firmTravel*.8, 'a tiny input starts immediately but moves more calmly');
    gentle.settle();at(gentle,direction>0?3:1);
  }
  console.log('PASS a single 1px wheel input commits and completes more slowly in both directions');
}
{
  for(const direction of [-1,1]) {
    const t=setup(targets[2]);t.touchStart(500);t.tick(16);
    assert(t.touchMove(500-direction*4));t.touchEnd();
    t.settle();at(t,direction>0?3:1);
  }
  console.log('PASS a single gentle 4px touch move completes after release in both directions');
}
