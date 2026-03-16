/* 88ST.Cloud - SEO meta auto apply (static, zero-cost)
 * Reads /assets/config/seo.meta.json and applies title/meta/og/canonical
 * Supports exact path match and wildcard keys like "/cert/*".
 * Uses sessionStorage cache to avoid repeated fetch.
 */
(function(){
  'use strict';

  var STORE_KEY = 'vvip_seo_meta_v1';

  function safeJsonParse(s){
    try { return JSON.parse(s); } catch(e){ return null; }
  }

  function normalizePath(p){
    try {
      // keep trailing slash for directory-like paths
      if (!p) return '/';
      if (p.indexOf('?') !== -1) p = p.split('?')[0];
      if (p.indexOf('#') !== -1) p = p.split('#')[0];
      if (!p.startsWith('/')) p = '/' + p;
      // if it looks like a file, don't force slash
      var last = p.split('/').pop();
      if (last && last.indexOf('.') !== -1) return p;
      return p.endsWith('/') ? p : (p + '/');
    } catch(e){
      return '/';
    }
  }

  function getMetaMap(){
    // session cache
    var cached = null;
    try { cached = safeJsonParse(sessionStorage.getItem(STORE_KEY) || ''); } catch(e) { cached = null; }
    if (cached) return cached;

    // sync XHR during initial parse (best-effort). Falls back to async fetch.
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/assets/config/seo.meta.json', false);
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
        var map = safeJsonParse(xhr.responseText);
        if (map && typeof map === 'object') {
          try { sessionStorage.setItem(STORE_KEY, JSON.stringify(map)); } catch(e) {}
          return map;
        }
      }
    } catch(e) {}

    // async (non-blocking) as last resort
    try {
      fetch('/assets/config/seo.meta.json', { cache: 'no-store' })
        .then(function(r){ return r.ok ? r.text() : ''; })
        .then(function(t){
          var map = safeJsonParse(t);
          if (map && typeof map === 'object') {
            try { sessionStorage.setItem(STORE_KEY, JSON.stringify(map)); } catch(e) {}
            apply(map);
          }
        })
        .catch(function(){});
    } catch(e) {}

    return null;
  }

  function pickEntry(map, path){
    if (!map || typeof map !== 'object') return null;

    // allow "default" entry
    var exact = map[path] || map[path.replace(/\/$/, '')];
    if (exact) return exact;

    // wildcard: "/cert/*"
    var best = null;
    var bestLen = -1;
    for (var k in map) {
      if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
      if (typeof k !== 'string') continue;
      if (k.endsWith('/*')) {
        var prefix = k.slice(0, -1); // keep trailing slash
        if (path.startsWith(prefix) && prefix.length > bestLen) {
          best = map[k];
          bestLen = prefix.length;
        }
      }
    }
    if (best) return best;

    return map.default || map['*'] || null;
  }

  function setMeta(name, content){
    if (!content) return;
    var el = document.querySelector('meta[name="' + name + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setProp(prop, content){
    if (!content) return;
    var el = document.querySelector('meta[property="' + prop + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', prop);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setCanonical(url){
    if (!url) return;
    var link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  function apply(map){
    try {
      var path = normalizePath(location.pathname);
      var entry = pickEntry(map, path);
      if (!entry || typeof entry !== 'object') return;

      if (entry.title) {
        document.title = entry.title;
        setProp('og:title', entry.title);
        setProp('twitter:title', entry.title);
      }

      if (entry.description) {
        setMeta('description', entry.description);
        setProp('og:description', entry.description);
        setProp('twitter:description', entry.description);
      }

      if (entry.keywords) {
        setMeta('keywords', entry.keywords);
      }

      // basic og url + canonical
      var canonical = entry.canonical;
      if (!canonical) {
        canonical = location.origin + path;
      }
      setCanonical(canonical);
      setProp('og:url', canonical);

      // optional image
      if (entry.og_image) {
        setProp('og:image', entry.og_image);
      }

      // optional robots override
      if (entry.robots) {
        setMeta('robots', entry.robots);
      }

      // optional: twitter card
      if (entry.twitter_card) {
        setMeta('twitter:card', entry.twitter_card);
      }
    } catch(e) {}
  }

  var map = getMetaMap();
  if (map) apply(map);
})();
