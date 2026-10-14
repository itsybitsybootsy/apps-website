/* Curated local text; no translation API, network inference or user data transfer. */
(function () {
  'use strict';
  var catalog = window.SkinmetricsCatalog;
  if (!catalog || !catalog.locales.en) return;
  var storageKey = 'skinmetrics.language';
  var languages = catalog.languages;
  var locale = 'en', choice = 'auto';
  function resolve(value) {
    var tag = String(value || '').replace(/_/g, '-').toLowerCase();
    if (/^zh(?:-|$)/.test(tag)) {
      var chinese = /(?:hant|tw|hk|mo)(?:-|$)/.test(tag) ? 'zh-Hant' : 'zh-Hans';
      return catalog.locales[chinese] ? chinese : null;
    }
    if (/^pt-br(?:-|$)/.test(tag) && catalog.locales['pt-BR']) return 'pt-BR';
    if (/^iw(?:-|$)/.test(tag)) tag = 'he';
    var exact = languages.find(function (language) { return language.code.toLowerCase() === tag; });
    if (exact) return exact.code;
    var base = tag.split('-')[0];
    return languages.some(function (language) { return language.code === base; }) ? base : null;
  }
  function browserLocale() {
    var preferences = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (var i = 0; i < preferences.length; i++) {
      var match = resolve(preferences[i]);
      if (match && catalog.locales[match]) return match;
    }
    return 'en';
  }
  function t(key, fallback) { return catalog.locales[locale][key] || catalog.locales.en[key] || fallback || key; }
  function translateText(element, value) {
    // Preserve icons, line breaks, nested spans and links inside labelled nodes.
    var text = Array.from(element.childNodes).find(function (node) { return node.nodeType === 3 && node.nodeValue.trim(); });
    if (text) text.nodeValue = value + (element.children.length ? ' ' : '');
    else element.textContent = value;
  }
  function apply(scope) {
    scope = scope || document;
    var selector = '[data-i18n],[data-i18n-aria-label],[data-i18n-alt],[data-i18n-content],[data-i18n-placeholder]';
    var nodes = Array.from(scope.querySelectorAll(selector));
    if (scope.matches && scope.matches(selector)) nodes.unshift(scope);
    nodes.forEach(function (element) {
      var key = element.getAttribute('data-i18n');
      if (key) translateText(element, t(key));
      ['aria-label','alt','content','placeholder'].forEach(function (attribute) {
        var attrKey = element.getAttribute('data-i18n-' + attribute);
        if (attrKey) element.setAttribute(attribute, t(attrKey));
      });
    });
  }
  function select(value, remember) {
    choice = value === 'auto' ? 'auto' : resolve(value) || 'auto';
    locale = choice === 'auto' ? browserLocale() : choice;
    var language = languages.find(function (item) { return item.code === locale; });
    document.documentElement.lang = locale;
    document.documentElement.dir = language.dir;
    apply(document);
    document.querySelectorAll('[data-language-current]').forEach(function (label) { label.textContent = language.name; });
    document.querySelectorAll('.store-badge img').forEach(function (image) {
      image.src = language.apple || 'assets/img/badges/app-store-en.svg';
    });
    document.querySelectorAll('.play-store-badge img').forEach(function (image) {
      image.src = language.play || 'assets/img/badges/google-play-en.png';
    });
    if (remember) {
      try { if (choice === 'auto') localStorage.removeItem(storageKey); else localStorage.setItem(storageKey, choice); } catch (_) {}
      try {
        var url = new URL(window.location.href);
        if (choice === 'auto') url.searchParams.delete('lang'); else url.searchParams.set('lang', choice);
        window.history.replaceState(null, '', url.href);
      } catch (_) {} // file:// and private-browser storage restrictions are harmless.
    }
    document.dispatchEvent(new CustomEvent('skinmetrics:languagechange', { detail:{ locale:locale } }));
  }
  window.SkinmetricsI18n = {
    t:t, apply:apply, select:select, resolve:resolve,
    getLocale:function () { return locale; }, getChoice:function () { return choice; },
    getBrowserLocale:browserLocale,
    getLanguages:function () { return languages.map(function (item) { return { code:item.code, name:item.name, dir:item.dir }; }); }
  };
  var requested = null, saved = null;
  try { requested = resolve(new URL(window.location.href).searchParams.get('lang')); } catch (_) {}
  try { saved = resolve(localStorage.getItem(storageKey)); } catch (_) {}
  select(requested || saved || 'auto', false);
  document.documentElement.classList.add('has-i18n');
  window.addEventListener('languagechange', function () { if (choice === 'auto') select('auto', false); });
})();
