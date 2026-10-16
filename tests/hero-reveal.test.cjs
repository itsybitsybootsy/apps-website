const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/js/hero6.js'),'utf8');
function element(){const classes=new Set();return {classes,classList:{add(...x){x.forEach(v=>classes.add(v))},remove(...x){x.forEach(v=>classes.delete(v))},toggle(x,on){on?classes.add(x):classes.delete(x)}},values:{},style:{setProperty(k,v){this[k]=v}},setAttribute(k,v){this.values[k]=v},getAttribute(k){return this.values[k]}};}
async function setup(g,reduce=false){
 const photo=element(),hero=element(),flash=element(),before=element(),after=element(),queue=[];
 before.decode=after.decode=()=>Promise.resolve();
 photo.querySelector=s=>s.includes('before')?before:after;
 const buttons=['f','m'].map(g=>Object.assign(element(),{dataset:{g},handlers:{},addEventListener(k,f){this.handlers[k]=f}}));
 hero.querySelector=s=>s==='[data-photo]'?photo:s==='.hero6-flash'?flash:element();hero.querySelectorAll=()=>buttons;
 let now=0;
 const context={document:{getElementById:()=>hero,querySelector:()=>null,documentElement:element(),body:element()},matchMedia:q=>({matches:q.includes('reduced-motion')&&reduce}),IntersectionObserver:class{observe(){}},URLSearchParams,URL,location:{search:'?g='+g,href:'http://localhost/?g='+g},sessionStorage:{getItem(){},setItem(){}},history:{replaceState(){}},performance:{now:()=>now},requestAnimationFrame:f=>queue.push(f),Image:class{},fetch:()=>Promise.reject(new Error('Unused avatar fetch'))};
 vm.runInNewContext(source,context);await new Promise(setImmediate);
 return {photo,queue,before,tick(t){now=t;assert(queue.length,'animation scheduled');queue.splice(0).forEach(f=>f(t))},switch(g){buttons.find(b=>b.dataset.g===g).handlers.click()}};
}
(async()=>{
 for(const g of ['f','m']){
  const end=5100;
  const x=await setup(g);x.tick(end-1);assert(x.photo.classes.has('live'));assert(!x.photo.classes.has('done'),'edge remains until its exit boundary');
  x.tick(end);assert(x.photo.classes.has('done'),'edge ends immediately at its exit boundary');assert(!x.photo.classes.has('live'));
  x.tick(5100);assert.equal(x.photo.style['--p'],'0.00%');assert.equal(x.queue.length,1,'camera still settling');
  x.tick(6000);assert.equal(x.photo.style['--sc'],'1.0000');assert.equal(x.queue.length,0);
  console.log('PASS '+g+': light ends at '+end+'ms, before camera settles at 6000ms');
 }
 const x=await setup('f');x.tick(2000);x.switch('m');await new Promise(setImmediate);assert(!x.photo.classes.has('done'));x.tick(7100);assert(x.photo.classes.has('done'),'replay uses the same sweep boundary');
 const reduced=await setup('f',true);assert(reduced.photo.classes.has('done'));assert.equal(reduced.queue.length,0);assert(reduced.before.src.endsWith('/before-body.webp'));
 console.log('PASS replay and reduced motion, including complete before-body asset');
})().catch(e=>{console.error(e);process.exitCode=1});
