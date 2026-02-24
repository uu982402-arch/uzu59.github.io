/**
 * Global asset loader (CSS/JS) with cache-busting via window.__BUILD_VER.
 *
 * v107+: The list of "core assets" is auto-detected at build time and embedded into
 *         window.__BUILD_ASSETS by scripts/gen-build-ver.mjs.
 *         This keeps the loader stable even if filenames/hashes change.
 */
(function () {
  try {

    // --- Analytics bridge (always-available track function) ---
    try {
      if (typeof window.track !== "function") {
        window.track = function (name, params) {
          try {
            if (typeof window.gtag === "function") {
              window.gtag("event", name, params || {});
            }
          } catch (e) {}
        };
      }
    } catch (e) {}

    // --- Early OPS smoke flag (used to disable heavy assets during smoke checks) ---
    var __sp = null;
    try { __sp = new URLSearchParams(window.location.search || ""); } catch (e) { __sp = null; }
    var __smokeOn = false;
    try { if (__sp && (__sp.get("smoke") === "1" || __sp.get("smoke") === "true")) __smokeOn = true; } catch (e) {}
    try { if (__smokeOn) window.__OPS_SMOKE__ = 1; } catch (e) {}

    var v = (window.__BUILD_VER || "0") + "";
    var head = document.head || document.getElementsByTagName("head")[0];

    // --- Hard cache reset (optional safety net) ---
    // If a browser had a stale Service Worker / CacheStorage from older deployments,
    // it can keep serving outdated assets even after new builds.
    // We clear SW + caches ONCE per build version.
    try {
      var swKey = "__88st_cache_reset__" + v;
      if (window.localStorage && localStorage.getItem(swKey) !== "1") {
        if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {
          navigator.serviceWorker.getRegistrations().then(function (regs) {
            return Promise.all(regs.map(function (r) { return r.unregister(); }));
          }).catch(function () {});
        }
        if ("caches" in window && caches.keys) {
          caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) { return caches.delete(k); }));
          }).catch(function () {});
        }
        try { localStorage.setItem(swKey, "1"); } catch (e) {}
      }
    } catch (e) {}


    function withVer(url) {
      return url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + encodeURIComponent(v);
    }

    function hasTag(selector, attr, baseUrl) {
      var nodes = document.querySelectorAll(selector);
      for (var i = 0; i < nodes.length; i++) {
        var val = nodes[i].getAttribute(attr) || "";
        if (val.indexOf(baseUrl) === 0) return true;
      }
      return false;
    }

    function addCSS(href) {
      // prevent duplicates if a page already includes it
      if (hasTag('link[rel="stylesheet"]', "href", href)) return;
      var l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = withVer(href);
      head.appendChild(l);
    }

    function addJS(src) {
      if (hasTag("script", "src", src)) return;
      var s = document.createElement("script");
      s.src = withVer(src);
      // Dynamic scripts: prefer ordered execution across browsers
      s.async = false;
      head.appendChild(s);
    }

    // --- Core global assets (loaded on every page) ---
    var assets = window.__BUILD_ASSETS;
    var cssList = (assets && assets.css && assets.css.length) ? assets.css : [
      "/assets/css/vvip-luxe.v75.css",
      "/assets/css/vvip-hub.v85.css",
      "/assets/css/patch.v100.premiumdash.20260222.css",
      "/assets/css/pro-suite.v2.css"
    ];
    var jsList = (assets && assets.js && assets.js.length) ? assets.js : [
      "/assets/js/vvip-global.v75.js",
      "/assets/js/j.searchtyping.v83.20260219.js",
      "/assets/js/pro-suite.v2.js"
    ];


    // --- Page-specific bundle gating (stability-first) ---
    // /cert is latency/interaction-sensitive and already has its own page script (j.cert).
    // Loading heavy PRO SUITE here can cause freezes in some browsers (Firefox) and can interfere with the popup lifecycle.
    // So we skip PRO SUITE assets on /cert and /ops.
    try {
      var __p = (window.location && window.location.pathname) ? (window.location.pathname + "") : "/";
      var __isCert = __p.indexOf("/cert") === 0;
      var __isOps = __p.indexOf("/ops") === 0;
      if (__isCert || __isOps) {
        cssList = cssList.filter(function (href) { return href.indexOf("pro-suite") === -1; });
        jsList  = jsList.filter(function (src)  { return src.indexOf("pro-suite") === -1; });
      }
    } catch (e) {}
    // In OPS smoke mode, skip heavy global bundles. Page-specific scripts still run (e.g., j.cert).
    if (__smokeOn) {
      jsList = [];
    }

    for (var i = 0; i < cssList.length; i++) addCSS(cssList[i]);

    function loadJS(){
      for (var j = 0; j < jsList.length; j++) addJS(jsList[j]);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function(){ loadJS(); });
    } else {
      loadJS();
    }

    // --- OPS smoke check mode (runs ONLY when ?smoke=1) ---
    try {
      var sp = __sp;
      var smokeOn = __smokeOn;

      if (smokeOn) {
        var smokeToken = (sp.get("smoke_token") || "") + "";
        var smokeOrigin = (sp.get("smoke_origin") || "") + "";
        var smokeState = {
          token: smokeToken,
          path: (window.location && window.location.pathname) || "",
          href: (window.location && window.location.href) || "",
          build: v,
          errors: [],
          rejections: [],
          checks: {}
        };

        function smokePost(payload) {
          try {
            if (window.opener && typeof window.opener.postMessage === "function") {
              window.opener.postMessage(payload, smokeOrigin || "*");
            }
          } catch (e) {}
        }

        window.addEventListener("error", function (ev) {
          try {
            smokeState.errors.push({
              message: (ev && ev.message) || "error",
              filename: ev && ev.filename,
              lineno: ev && ev.lineno,
              colno: ev && ev.colno
            });
          } catch (e) {}
        }, true);

        window.addEventListener("unhandledrejection", function (ev) {
          try { smokeState.rejections.push({ reason: String((ev && ev.reason) || "") }); } catch (e) {}
        }, true);

        function isVisible(el) {
          try {
            if (!el || !el.getBoundingClientRect) return false;
            var cs = null;
            try { cs = window.getComputedStyle ? getComputedStyle(el) : null; } catch (e) {}
            if (cs) {
              if (cs.display === "none") return false;
              if (cs.visibility === "hidden") return false;
              if (Number(cs.opacity || "1") <= 0.02) return false;
            }
            var r = el.getBoundingClientRect();
            if (!r || r.width < 2 || r.height < 2) return false;
            if (r.bottom < 0 || r.right < 0) return false;
            var vw = window.innerWidth || 0, vh = window.innerHeight || 0;
            if (vw && r.left > vw) return false;
            if (vh && r.top > vh) return false;
            return true;
          } catch (e) { return false; }
        }

        function topHit(el) {
          try {
            if (!el || !el.getBoundingClientRect) return true;
            var r = el.getBoundingClientRect();
            var vw = window.innerWidth || 0, vh = window.innerHeight || 0;
            var x = r.left + Math.min(r.width / 2, 24);
            var y = r.top + Math.min(r.height / 2, 24);
            if (vw) x = Math.max(0, Math.min(vw - 1, x));
            if (vh) y = Math.max(0, Math.min(vh - 1, y));
            var hit = document.elementFromPoint(x, y);
            if (!hit) return true;
            return (hit === el) || (el.contains && el.contains(hit));
          } catch (e) { return true; }
        }

        function isClickable(el) {
          try {
            if (!isVisible(el)) return false;
            if (el.disabled) return false;
            var cs = null;
            try { cs = window.getComputedStyle ? getComputedStyle(el) : null; } catch (e) {}
            if (cs && cs.pointerEvents === "none") return false;
            if (!topHit(el)) return false;
            return true;
          } catch (e) { return false; }
        }

        function pickCTAs() {
          var out = [];
          try {
            // Avoid querying ALL anchors on large pages (can freeze Firefox).
            // We focus on likely CTA elements first.
            var sels = [
              "a.btn, a.cta, a.button, a.primary, a.chip, a.tab",
              "button.btn, button.cta, button.button, button.primary, button.chip, button.tab",
              "button, [role='button']",
              "input[type='button'], input[type='submit']"
            ];

            for (var si = 0; si < sels.length; si++) {
              var nodes = null;
              try { nodes = document.querySelectorAll(sels[si]); } catch (e) { nodes = null; }
              if (!nodes || !nodes.length) continue;

              for (var i = 0; i < nodes.length; i++) {
                if (out.length >= 40) break;
                var el = nodes[i];
                if (!el) continue;
                if (el.closest && el.closest("[aria-hidden='true']")) continue;

                var cls = (el.className || "") + "";
                var role = (el.getAttribute && (el.getAttribute("role") || "")) || "";
                var txt = ((el.innerText || el.textContent || el.value || "") + "").trim();

                var good = false;
                if (/(^|\s)(btn|button|cta|primary|chip|tab)(\s|$)/i.test(cls)) good = true;
                if (/(계산|복사|이동|문의|열기|저장|확인|보기|시작|접속|바로|로그)/.test(txt)) good = true;
                if (role === "button") good = true;

                if (!good) continue;
                out.push(el);
              }

              if (out.length >= 40) break;
            }
          } catch (e) {}
          return out;
        }

        function waitFor(fn, timeoutMs) {
          return new Promise(function (resolve) {
            var start = Date.now();
            (function tick() {
              var v2 = null;
              try { v2 = fn(); } catch (e) {}
              if (v2) { resolve(v2); return; }
              if ((Date.now() - start) > timeoutMs) { resolve(null); return; }
              setTimeout(tick, 80);
            })();
          });
        }

        function runCertModalCheck() {
          // cert card click -> popup open check
          return waitFor(function () {
            return document.querySelector("#vendorGrid .card[data-card]");
          }, 2500).then(function (card) {
            var cnt = 0;
            try { cnt = document.querySelectorAll("#vendorGrid .card[data-card]").length; } catch (e) {}
            smokeState.checks.cert_card_count = cnt;
            smokeState.checks.cert_modal_exists = !!document.getElementById("cardPopup");

            if (!card) {
              smokeState.checks.cert_modal_opens = false;
              return null;
            }

            try { if (card.scrollIntoView) card.scrollIntoView({ block: "center", inline: "nearest" }); } catch (e) {}
            try {
              if (window.PointerEvent) {
                card.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
              }
            } catch (e) {}
            try { if (card.click) card.click(); } catch (e) {}

            return waitFor(function () {
              var p = document.getElementById("cardPopup");
              if (!p) return null;
              var open = (p.classList && p.classList.contains("open")) || (p.getAttribute && p.getAttribute("aria-hidden") === "false");
              return open ? p : null;
            }, 1200).then(function (p2) {
              smokeState.checks.cert_modal_opens = !!p2;
              try { var cbtn = document.getElementById("closeBtn"); if (cbtn && cbtn.click) cbtn.click(); } catch (e) {}
              return p2;
            });
          });
        }

        function finalizeAndReport() {
          try {
            smokeState.checks.track = (typeof window.track === "function");
            smokeState.checks.build_ver = (window.__BUILD_VER || "") + "";

            // CTA scan can be expensive on very large pages (e.g., /cert).
            if (smokeState.path.indexOf('/cert') === 0) {
              smokeState.checks.cta_total = null;
              smokeState.checks.cta_clickable = null;
            } else {
              var ctas = pickCTAs();
              smokeState.checks.cta_total = ctas.length;

              var clickable = 0;
              for (var i = 0; i < ctas.length; i++) {
                if (isClickable(ctas[i])) clickable++;
              }
              smokeState.checks.cta_clickable = clickable;
            }

            var ok = (smokeState.errors.length === 0 && smokeState.rejections.length === 0);
            // cert modal must be operable if modal exists
            if (smokeState.path.indexOf("/cert") === 0) {
              if (smokeState.checks.cert_modal_exists && !smokeState.checks.cert_modal_opens) ok = false;
            }
            smokeState.ok = ok;

            smokePost({ __88st_smoke: 1, token: smokeToken, ok: ok, state: smokeState });

            // Unload ASAP to prevent long-running scripts from slowing down the browser during batch checks.
            try {
              setTimeout(function () {
                try { if (window.stop) window.stop(); } catch (e) {}
                try { window.location.replace('about:blank'); } catch (e) {}
              }, 180);
            } catch (e) {}
          } catch (e) {
            smokePost({ __88st_smoke: 1, token: smokeToken, ok: false, state: smokeState });
          }
        }

        // Run after page load + a small settle time (lets deferred scripts finish)
        window.addEventListener("load", function () {
          setTimeout(function () {
            try {
              if (smokeState.path.indexOf("/cert") === 0 && typeof Promise !== "undefined") {
                runCertModalCheck().then(finalizeAndReport).catch(finalizeAndReport);
              } else {
                finalizeAndReport();
              }
            } catch (e) {
              finalizeAndReport();
            }
          }, 900);
        });

        // early ping (lets OPS UI show "loading")
        smokePost({ __88st_smoke: 1, token: smokeToken, phase: "boot", state: { path: smokeState.path, build: smokeState.build } });
      }
    } catch (e) {}


  } catch (e) {
    // fail silently; page will still render basic HTML
  }
})();
