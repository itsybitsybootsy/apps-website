#!/usr/bin/env python3
"""Generate the SEO layer: per-language static pages, sitemap.xml and robots.txt.

Run after scripts/build_locales.py (it reads assets/js/locales.js):
    python3 scripts/build_locales.py && python3 scripts/build_seo.py

- index.html stays the hand-edited source (German text, auto-detects language in JS).
  This script only refreshes the block between the seo markers in its <head>.
- /<lang>/index.html are fully translated copies of index.html so search engines
  see real text and can index every language under its own URL.
Requires beautifulsoup4 (build-time only; the published site needs no build step).
"""
from pathlib import Path
import datetime
import json
import re
from bs4 import BeautifulSoup, NavigableString

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://skinmetrics.app'
OG_IMAGE = SITE + '/assets/img/og.jpg'
START, END = '<!-- seo:start -->', '<!-- seo:end -->'
OG_LOCALE = {
    'de': 'de_DE', 'en': 'en_US', 'fr': 'fr_FR', 'es': 'es_ES', 'it': 'it_IT',
    'pt-BR': 'pt_BR', 'nl': 'nl_NL', 'sv': 'sv_SE', 'da': 'da_DK', 'pl': 'pl_PL',
    'cs': 'cs_CZ', 'hu': 'hu_HU', 'ro': 'ro_RO', 'ru': 'ru_RU', 'uk': 'uk_UA',
    'tr': 'tr_TR', 'ar': 'ar_AR', 'he': 'he_IL', 'hi': 'hi_IN'}


def load_catalog():
    text = (ROOT / 'assets/js/locales.js').read_text()
    return json.loads(text[text.index('{'):text.rindex('}') + 1])


def page_url(code):
    return SITE + '/' + code.lower() + '/'


def esc(value):
    return (value.replace('&', '&amp;').replace('"', '&quot;')
            .replace('<', '&lt;').replace('>', '&gt;'))


def faq_pairs(strings):
    pairs = []
    for key in strings:
        if key.startswith('faq.') and key.endswith('Q') and key[:-1] + 'A' in strings:
            pairs.append((strings[key], strings[key[:-1] + 'A']))
    return pairs


def seo_block(code, strings, canonical, codes):
    title, description = strings['meta.title'], strings['meta.description']
    graph = [
        {'@type': 'Organization', '@id': SITE + '/#org', 'name': 'Q Systems', 'url': SITE + '/',
         'email': 'hello@q-systems.app'},
        {'@type': 'WebSite', '@id': SITE + '/#site', 'name': 'Skinmetrics', 'url': SITE + '/',
         'publisher': {'@id': SITE + '/#org'}},
        {'@type': 'MobileApplication', '@id': SITE + '/#app', 'name': 'Skinmetrics',
         'operatingSystem': 'iOS', 'applicationCategory': 'HealthApplication',
         'description': description, 'image': OG_IMAGE, 'url': canonical, 'inLanguage': code,
         'publisher': {'@id': SITE + '/#org'}},
    ]
    pairs = faq_pairs(strings)
    if pairs:
        graph.append({'@type': 'FAQPage', 'inLanguage': code, 'mainEntity': [
            {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}}
            for q, a in pairs]})
    ld = json.dumps({'@context': 'https://schema.org', '@graph': graph},
                    ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    lines = [START, f'<link rel="canonical" href="{canonical}" />']
    for other in codes:
        lines.append(f'<link rel="alternate" hreflang="{other}" href="{page_url(other)}" />')
    lines.append(f'<link rel="alternate" hreflang="x-default" href="{SITE}/" />')
    lines += [
        '<meta property="og:type" content="website" />',
        '<meta property="og:site_name" content="Skinmetrics" />',
        f'<meta property="og:title" content="{esc(title)}" />',
        f'<meta property="og:description" content="{esc(description)}" />',
        f'<meta property="og:url" content="{canonical}" />',
        f'<meta property="og:image" content="{OG_IMAGE}" />',
        '<meta property="og:image:width" content="1200" />',
        '<meta property="og:image:height" content="630" />',
        f'<meta property="og:locale" content="{OG_LOCALE.get(code, "en_US")}" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        f'<meta name="twitter:title" content="{esc(title)}" />',
        f'<meta name="twitter:description" content="{esc(description)}" />',
        f'<meta name="twitter:image" content="{OG_IMAGE}" />',
        f'<script type="application/ld+json">{ld}</script>',
        END]
    return '\n'.join(lines)


def translate(soup, strings, language):
    def t(key):
        return strings[key]

    for el in soup.select('[data-i18n]'):
        value = t(el['data-i18n'])
        text = next((n for n in el.contents if isinstance(n, NavigableString) and n.strip()), None)
        if text is not None:  # keep icons / nested spans, as assets/js/i18n.js does
            text.replace_with(value + (' ' if el.find(True, recursive=False) else ''))
        else:
            el.string = value
    for el in soup.find_all(True):
        for attr in ('aria-label', 'alt', 'content', 'placeholder', 'title'):
            key = el.get('data-i18n-' + attr)
            if key:
                el[attr] = t(key)
    for el in soup.select('[data-language-current]'):
        el.string = language['name']
    for el in soup.select('.store-badge img'):
        el['src'] = '/' + language.get('apple', 'assets/img/badges/app-store-en.svg').lstrip('/')
    for el in soup.select('.play-store-badge img'):
        el['src'] = '/' + language.get('play', 'assets/img/badges/google-play-en.png').lstrip('/')


def absolutize(soup):
    skip = ('#', '/', 'http:', 'https:', 'mailto:', 'tel:', 'data:', 'javascript:')
    for tag, attr in (('link', 'href'), ('script', 'src'), ('img', 'src'), ('a', 'href')):
        for el in soup.find_all(tag):
            value = el.get(attr)
            if value and not value.startswith(skip):
                el[attr] = '/' + value


def main():
    catalog = load_catalog()
    languages = {item['code']: item for item in catalog['languages']}
    codes = [item['code'] for item in catalog['languages']]
    source = (ROOT / 'index.html').read_text()
    source = re.sub(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', '', source, flags=re.S)

    # Root page: German source text, language auto-detected in the browser -> x-default.
    de = catalog['locales']['de']
    block = seo_block('de', de, SITE + '/', codes)
    root = source.replace('</head>', block + '\n</head>', 1)
    (ROOT / 'index.html').write_text(root)

    for code in codes:
        soup = BeautifulSoup(source, 'html.parser')
        strings, language = catalog['locales'][code], languages[code]
        html = soup.html
        html['lang'] = code
        html['dir'] = language['dir']
        html['data-static-locale'] = code
        translate(soup, strings, language)
        absolutize(soup)
        soup.head.append(BeautifulSoup(seo_block(code, strings, page_url(code), codes), 'html.parser'))
        out = ROOT / code.lower()
        out.mkdir(exist_ok=True)
        (out / 'index.html').write_text('<!DOCTYPE html>\n' + str(soup.html) + '\n')

    today = datetime.date.today().isoformat()
    alternates = ''.join(
        f'<xhtml:link rel="alternate" hreflang="{c}" href="{page_url(c)}"/>' for c in codes
    ) + f'<xhtml:link rel="alternate" hreflang="x-default" href="{SITE}/"/>'
    urls = [(SITE + '/', '1.0')] + [(page_url(c), '0.8') for c in codes]
    body = ''.join(
        f'<url><loc>{loc}</loc><lastmod>{today}</lastmod><priority>{prio}</priority>{alternates}</url>\n'
        for loc, prio in urls)
    (ROOT / 'sitemap.xml').write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + body + '</urlset>\n')
    (ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n')
    print(f'{len(codes)} language pages + root, sitemap.xml, robots.txt')


if __name__ == '__main__':
    main()
