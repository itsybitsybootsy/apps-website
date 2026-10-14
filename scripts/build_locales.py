#!/usr/bin/env python3
"""Bundle the authored catalogues; the published site needs no build or server API."""
from pathlib import Path
import json
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/i18n'
schema = json.loads((SOURCE / 'schema.json').read_text())
registry = [
 ('de','Deutsch','de-de','de'),('en','English','en-us','en'),
 ('fr','Français','fr-fr','fr'),('es','Español','es-es','es'),
 ('it','Italiano','it-it','it'),('pt','Português','pt-pt','pt-pt'),
 ('pt-BR','Português (Brasil)','pt-br','pt-br'),('nl','Nederlands','nl-nl','nl'),
 ('sv','Svenska','sv-se','sv'),('da','Dansk','da-dk','da'),
 ('pl','Polski','pl-pl','pl'),('cs','Čeština','cs-cz','cs'),
 ('hu','Magyar','hu-hu','hu'),('ro','Română','ro-ro','ro'),
 ('ru','Русский','ru-ru','ru'),('uk','Українська','uk-ua','uk'),
 ('tr','Türkçe','tr-tr','tr'),('ar','العربية','ar-sa','ar'),
 ('he','עברית','he-il','iw'),('hi','हिन्दी','hi-in','hi'),
 ('ja','日本語','ja-jp','ja'),('ko','한국어','ko-kr','ko'),
 ('zh-Hans','简体中文','zh-cn','zh-cn'),('zh-Hant','繁體中文','zh-tw','zh-tw'),
 ('id','Bahasa Indonesia','id-id','id')]
catalog={'languages':[], 'locales':{}}
for code,name,apple,play in registry:
 path=SOURCE / (code+'.json')
 if not path.exists():continue
 data=json.loads(path.read_text())
 if set(data)!=set(schema):raise ValueError(f'{code}: incorrect sections')
 flattened={}
 for section,keys in schema.items():
  values=data[section]
  if len(values)!=len(keys):raise ValueError(f'{code}.{section}: expected {len(keys)} values, got {len(values)}')
  for key,value in zip(keys,values):
   if not isinstance(value,str) or not value.strip():raise ValueError(f'{code}.{section}.{key}: empty translation')
   flattened[section+'.'+key]=value
 language={'code':code,'name':name,'dir':'rtl' if code in ('ar','he') else 'ltr'}
 badge=ROOT/'assets/img/badges'/('app-store-'+code+'.svg')
 if badge.exists():language['apple']='assets/img/badges/'+badge.name
 badge=ROOT/'assets/img/badges'/('google-play-'+code+'.png')
 if badge.exists():language['play']='assets/img/badges/'+badge.name
 catalog['languages'].append(language)
 catalog['locales'][code]=flattened
(ROOT/'assets/js/locales.js').write_text('/* Authored translations. Rebuild with python3 scripts/build_locales.py. */\nwindow.SkinmetricsCatalog = '+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\n')
print(f'{len(catalog["languages"])} complete languages, {len(catalog["locales"]["en"])} entries each')
