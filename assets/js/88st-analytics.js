/*!
 * 88ST Analytics & UTM Module
 * - GA4 bootstrap (dynamic inject)
 * - track() helper with DebugView support (?debug=1 or localStorage ga_debug=1)
 * - UTM capture + 14d persistence + internal propagation (CTAs by default)
 * - CTA click & outbound click tracking (event delegation)
 */
(function () {
  "use strict";

  // ===== Config =====
  var DEFAULT_CONFIG = {
    GA4_ID: "G-KWT87FBY6S",
    POPULAR_API: "disabled"
  };

  // Merge user-provided SITE_CONFIG (if set before this script loads)
  window.SITE_CONFIG = window.SITE_CONFIG || DEFAULT_CONFIG;
  if (!window.SITE_CONFIG.GA4_ID) window.SITE_CONFIG.GA4_ID = DEFAULT_CONFIG.GA4_ID;
  if (window.SITE_CONFIG.POPULAR_API === undefined) window.SITE_CONFIG.POPULAR_API = DEFAULT_CONFIG.POPULAR_API;

  var GA4_ID = window.SITE_CONFIG.GA4_ID;

  // ===== Debug toggle =====
  function isDebug() {
    try {
      var sp = new URLSearchParams(window.location.search);
      return sp.get("debug") === "1" || localStorage.getItem("ga_debug") === "1";
    } catch (e) { return false; }
  }

  // ===== Session id =====
  function getSessionId() {
    try {
      var k = "88st_sid";
      var sid = sessionStorage.getItem(k);
      if (sid) return sid;
      sid = "sid_" + Math.random().toString(36).slice(2) + "_" + Date.now().toString(36);
      sessionStorage.setItem(k, sid);
      return sid;
    } catch (e) {
      return "sid_na";
    }
  }

  // ===== GA4 bootstrap =====
  function initGA4() {
    try {
      if (!GA4_ID || GA4_ID === "disabled" || /^G-XXXX/i.test(GA4_ID) || GA4_ID === "G-XXXXXXXXXX") return;

      // Create stub gtag early (works even before external script loads)
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

      // Avoid double config
      if (!window.__88st_ga_inited) {
        window.__88st_ga_inited = true;
        window.gtag("js", new Date());
        window.gtag("config", GA4_ID, {
          send_page_view: true,
          anonymize_ip: true
        });
      }

      // Avoid double script injection
      if (!document.querySelector('script[src*="gtag/js?id=' + encodeURIComponent(GA4_ID) + '"]')) {
        var s = document.createElement("script");
        s.async = true;
        s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA4_ID);
        document.head.appendChild(s);
      }
    } catch (e) {}
  }

  // ===== UTM =====
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  var UTM_STORE_KEY = "88_utm";
  var UTM_TTL_MS = 14 * 24 * 60 * 60 * 1000;

  function getUrlUtm() {
    try {
      var sp = new URLSearchParams(window.location.search);
      var obj = {};
      for (var i = 0; i < UTM_KEYS.length; i++) {
        var k = UTM_KEYS[i];
        var v = sp.get(k);
        if (v) obj[k] = v;
      }
      return obj;
    } catch (e) { return {}; }
  }

  function saveUtmFromUrl() {
    try {
      var utm = getUrlUtm();
      var has = false;
      for (var k in utm) { if (utm[k]) { has = true; break; } }
      if (!has) return;

      utm.__ts = Date.now();
      localStorage.setItem(UTM_STORE_KEY, JSON.stringify(utm));
    } catch (e) {}
  }

  function loadStoredUtm() {
    try {
      var raw = localStorage.getItem(UTM_STORE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj.__ts) return null;
      if (Date.now() - obj.__ts > UTM_TTL_MS) return null;
      return obj;
    } catch (e) { return null; }
  }

  function getUtmQuery() {
    try {
      var obj = loadStoredUtm();
      if (!obj) return "";
      var sp = new URLSearchParams();
      for (var i = 0; i < UTM_KEYS.length; i++) {
        var k = UTM_KEYS[i];
        if (obj[k]) sp.set(k, obj[k]);
      }
      var qs = sp.toString();
      return qs ? ("?" + qs) : "";
    } catch (e) { return ""; }
  }

  function appendUtm(urlStr) {
    try {
      var u = new URL(urlStr, window.location.href);
      var existing = new URLSearchParams(u.search);
      var stored = new URLSearchParams(getUtmQuery().replace(/^\?/, ""));
      for (var i = 0; i < UTM_KEYS.length; i++) {
        var k = UTM_KEYS[i];
        if (!existing.get(k) && stored.get(k)) existing.set(k, stored.get(k));
      }
      u.search = existing.toString();
      return u.toString();
    } catch (e) { return urlStr; }
  }

  function propagateUtmToLinks() {
    try {
      var stored = loadStoredUtm();
      if (!stored) return;

      var links = document.querySelectorAll("a[href]");
      links.forEach(function (a) {
        try {
          var href = a.getAttribute("href") || "";
          if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

          // Only propagate by default for CTAs or key tool pages
          var isCta = a.hasAttribute("data-cta") || a.hasAttribute("data-utm") || a.hasAttribute("data-propagate-utm");
          var dest = new URL(href, window.location.href);
          if (dest.origin !== window.location.origin) return;

          var keyPath = /^\/analysis\/?$/.test(dest.pathname) ||
                        /^\/tool-/.test(dest.pathname) ||
                        /^\/tool\//.test(dest.pathname) ||
                        /^\/landing-/.test(dest.pathname) ||
                        /^\/bonus-checklist\/?$/.test(dest.pathname);

          if (!isCta && !keyPath) return;

          // Skip if already has any utm_ param
          var sp = new URLSearchParams(dest.search);
          for (var i = 0; i < UTM_KEYS.length; i++) {
            if (sp.get(UTM_KEYS[i])) return;
          }

          a.setAttribute("href", appendUtm(dest.toString()));
        } catch (e) {}
      });
    } catch (e) {}
  }

  // ===== track() =====
  function track(evt, params) {
    try {
      if (typeof window.gtag !== "function") return;

      var p = Object.assign({}, (params || {}));

      if (isDebug() && p.debug_mode === undefined) p.debug_mode = true;

      // common params
      if (p.page_path === undefined) p.page_path = window.location.pathname;
      if (p.page_location === undefined) p.page_location = window.location.href;
      if (p.page_referrer === undefined) p.page_referrer = document.referrer || "";
      if (p.page_title === undefined && document && document.title) p.page_title = (document.title || "").slice(0, 80);

      // attach utm snapshot (helps analysis even if UTM not in current URL)
      var stored = loadStoredUtm();
      if (stored) {
        for (var i = 0; i < UTM_KEYS.length; i++) {
          var k = UTM_KEYS[i];
          if (p[k] === undefined && stored[k]) p[k] = stored[k];
        }
      }

      // attach session id
      if (p.sid === undefined) p.sid = getSessionId();

      // light normalization
      if (evt === "cta_click") {
        if (p.cta && p.cta_id === undefined) p.cta_id = p.cta;
      }
      if (evt === "outbound_click") {
        if (p.type && p.outbound_type === undefined) p.outbound_type = p.type;
        if (p.destination_domain === undefined && typeof p.url === "string") {
          try { p.destination_domain = (new URL(p.url, window.location.href)).hostname; } catch (e) {}
        }
        if (p.transport_type === undefined) p.transport_type = "beacon";
      }

      if (isDebug()) {
        try { console.log("[88ST track]", evt, p); } catch (e) {}
      }
      window.gtag("event", evt, p);
    } catch (e) {}
  }

  // ===== CTA click tracking (event delegation) =====
  function detectCtaLocation(el) {
    try {
      var explicit = el.getAttribute("data-cta-location");
      if (explicit) return explicit;

      if (el.closest && el.closest(".fab")) return "fab";
      if (el.closest && el.closest("#analyzerSection")) return "hero";
      if (el.closest && el.closest(".vendor-header")) return "vendor_header";
      if (el.closest && el.closest(".vendor-tools")) return "vendor_tools";
      if (el.closest && el.closest(".landing-seo")) return "footer_links";
      return "unknown";
    } catch (e) { return "unknown"; }
  }

  function bindClickDelegates() {
    document.addEventListener("click", function (e) {
      var target = e.target;

      // CTA
      var ctaEl = target && target.closest ? target.closest("[data-cta]") : null;
      if (ctaEl) {
        var cta = ctaEl.getAttribute("data-cta") || "";
        var txt = ((ctaEl.textContent || "").replace(/\s+/g, " ").trim()).slice(0, 60);
        track("cta_click", { cta: cta, cta_location: detectCtaLocation(ctaEl), cta_text: txt });
      }

      // Outbound links
      var a = target && target.closest ? target.closest("a[href]") : null;
      if (a) {
        // allow pages to opt-out of auto outbound tracking (manual track with richer params)
        if (a.hasAttribute("data-no-auto-outbound") || a.hasAttribute("data-outbound-manual") || a.hasAttribute("data-no-auto-track")) return;
        var href = a.getAttribute("href") || "";
        if (!href) return;

        // ignore in-page anchors and non-http
        if (href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

        try {
          var url = new URL(href, window.location.href);
          if (url.origin !== window.location.origin && (url.protocol === "http:" || url.protocol === "https:")) {
            var type = "external";
            if (/^https?:\/\/t\.me\//i.test(url.toString())) type = "telegram";
            track("outbound_click", { type: type, url: url.toString() });
          }
        } catch (err) {}
      }
    }, true);
  }

  // ===== Boot =====
  window.UTM_KEYS = window.UTM_KEYS || UTM_KEYS;
  window.saveUtmFromUrl = window.saveUtmFromUrl || saveUtmFromUrl;
  window.getUtmQuery = window.getUtmQuery || getUtmQuery;
  window.appendUtm = window.appendUtm || appendUtm;
  window.appendUtmToUrl = window.appendUtmToUrl || appendUtm;
  window.track = window.track || track;

  initGA4();
  saveUtmFromUrl();

  // After DOM ready, update CTAs with UTM and bind delegates
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      propagateUtmToLinks();
      bindClickDelegates();
    });
  } else {
    propagateUtmToLinks();
    bindClickDelegates();
  }
})();