const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const catalogSource = fs.readFileSync(path.join(root,'assets/js/locales.js'),'utf8');
const runtime = fs.readFileSync(path.join(root,'assets/js/i18n.js'),'utf8');
const page = fs.readFileSync(path.join(root,'index.html'),'utf8');
const container = {window:{}};
vm.runInNewContext(catalogSource,container);
const catalog=container.window.SkinmetricsCatalog;
const keys=Object.keys(catalog.locales.en).sort();
for(const language of catalog.languages){
  assert.deepEqual(Object.keys(catalog.locales[language.code]).sort(),keys,language.code);
  for(const value of Object.values(catalog.locales[language.code]))assert(value.trim());
  for(const badge of [language.apple,language.play].filter(Boolean))assert(fs.existsSync(path.join(root,badge)),badge);
}
for(const [,key] of page.matchAll(/data-i18n(?:-aria-label|-alt|-content|-placeholder)?="([^"]+)"/g))assert(keys.includes(key),key);
assert.equal((page.match(/data-language-open/g)||[]).length,3,'menu, mobile label and footer');
assert(!page.includes('data-language-search'),'language picker stays search-free');
assert(page.includes('<dialog id="language-dialog"'));
assert(!page.includes('data-language-picker'));
assert(page.includes('assets/css/i18n.css?v=63'));
assert(page.includes('assets/css/hero6.css?v=16'));
assert(page.includes('assets/js/hero6.js?v=11'));
assert(page.indexOf('assets/js/i18n.js')<page.indexOf('assets/js/mobile-story.js'));
console.log('PASS all '+catalog.languages.length+' catalogues are complete; labels, assets and all three controls are wired');

function setup({languages=['en-US'],saved=null,url='https://skinmetrics.example/?ref=test#fragen',blocked=false}={}){
  const store=new Map(saved?[['skinmetrics.language',saved]]:[]),events=new Map();
  const currentLabels=[{textContent:''}];
  const icon={},text={nodeType:3,nodeValue:'Datenschutz '};
  const labelled={childNodes:[text],children:[icon],getAttribute(n){return n==='data-i18n'?'nav.privacy':null;},setAttribute(){}};
  const aria={attrs:{'data-i18n-aria-label':'nav.closeMenu'},childNodes:[],children:[],getAttribute(n){return this.attrs[n]||null;},setAttribute(n,v){this.attrs[n]=v;}};
  const images=[{},{}],play=[{}];
  const document={documentElement:{classList:{add(){}},lang:'de',dir:'ltr'},createElement:()=>({}),
    querySelectorAll(s){return s==='[data-language-current]'?currentLabels:s==='.store-badge img'?images:s==='.play-store-badge img'?play:[labelled,aria];},dispatchEvent(e){this.lastEvent=e;}};
  const window={SkinmetricsCatalog:catalog,location:{href:url},history:{replaceState(a,b,u){window.location.href=u;}},addEventListener:(n,f)=>events.set(n,f)};
  const navigator={languages,language:languages[0]};
  const localStorage={getItem(k){if(blocked)throw Error('blocked');return store.get(k)||null;},setItem(k,v){if(blocked)throw Error('blocked');store.set(k,v);},removeItem(k){if(blocked)throw Error('blocked');store.delete(k);}};
  vm.runInNewContext(runtime,{window,document,navigator,localStorage,URL,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}}});
  return {window,document,navigator,store,currentLabels,events,images,play,text,icon,labelled,aria,api:window.SkinmetricsI18n};
}
{
  const t=setup({languages:['zz-ZZ','fr-CA']});assert.equal(t.api.getLocale(),'fr');
  assert.equal(t.document.documentElement.lang,'fr');assert.equal(t.document.documentElement.dir,'ltr');
  assert.equal(t.text.nodeValue,catalog.locales.fr['nav.privacy']+' ');assert.equal(t.labelled.children[0],t.icon);
  assert.equal(t.aria.attrs['aria-label'],catalog.locales.fr['nav.closeMenu']);
  assert(t.images[0].src.endsWith('app-store-fr.svg'));
  console.log('PASS browser language negotiation, regional matching, translated accessibility and intact nested icons');
}
{
  const t=setup({languages:['en-US'],saved:'de',url:'https://skinmetrics.example/?lang=es&ref=test#fragen'});
  assert.equal(t.api.getLocale(),'es','explicit links override saved preferences');
  t.api.select('fr',true);
  assert.equal(t.store.get('skinmetrics.language'),'fr');assert.equal(t.api.getChoice(),'fr');assert.equal(t.currentLabels[0].textContent,'Français');
  const url=new URL(t.window.location.href);assert.equal(url.searchParams.get('lang'),'fr');assert.equal(url.searchParams.get('ref'),'test');assert.equal(url.hash,'#fragen');
  const reloaded=setup({languages:['en-US'],saved:t.store.get('skinmetrics.language'),url:t.window.location.href});assert.equal(reloaded.api.getLocale(),'fr');
  t.api.select('auto',true);assert.equal(t.api.getLocale(),'en');
  assert(!t.store.has('skinmetrics.language'));assert(!new URL(t.window.location.href).searchParams.has('lang'));assert.equal(t.api.getChoice(),'auto');
  t.navigator.languages=['it-IT'];t.events.get('languagechange')();assert.equal(t.api.getLocale(),'it');
  console.log('PASS menu selection persists, synchronises all controls and can return to automatic language detection');
}
{
  const t=setup({languages:['ar-EG'],blocked:true,url:'file:///Users/example/index.html'});
  assert.equal(t.api.getLocale(),'ar');assert.equal(t.document.documentElement.dir,'rtl');
  t.api.select('he',true);assert.equal(t.document.documentElement.dir,'rtl');
  t.api.select('de',true);assert.equal(t.document.documentElement.dir,'ltr');
  assert.equal(t.api.resolve('pt_BR'),'pt-BR');assert.equal(t.api.resolve('iw-IL'),'he');
  assert.equal(t.api.resolve('../../bad-script'),null);
  assert.equal(t.api.resolve('constructor'),null);
  console.log('PASS RTL switching, native language aliases and blocked storage/file URL handling');
}
console.log('Internationalisation checks passed.');
