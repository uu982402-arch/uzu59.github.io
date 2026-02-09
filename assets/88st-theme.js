/*
  88ST Theme Toggle
  - Modes: system / dark / light
  - Persistence: localStorage key '88st_theme_mode'
  - Applies resolved theme on <html data-theme="..."> and stores mode on data-theme-mode
  - Injects a small floating control on every page
*/
(function(){
  "use strict";

  var KEY = "88st_theme_mode";
  var docEl = document.documentElement;
  var mql = null;
  try { mql = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null; } catch(e) { mql = null; }

  function safeGet(){
    try { return localStorage.getItem(KEY); } catch(e) { return null; }
  }
  function safeSet(v){
    try { localStorage.setItem(KEY, v); } catch(e) {}
  }

  function resolve(mode){
    if(mode === "dark" || mode === "light") return mode;
    // system
    var prefersDark = mql ? !!mql.matches : false;
    return prefersDark ? "dark" : "light";
  }

  function apply(mode){
    var resolved = resolve(mode);
    docEl.setAttribute("data-theme", resolved);
    docEl.setAttribute("data-theme-mode", mode);
  }

  function nextMode(cur){
    if(cur === "system") return "dark";
    if(cur === "dark") return "light";
    return "system";
  }

  // Early apply (avoid flash)
  var mode = safeGet();
  if(mode !== "dark" && mode !== "light" && mode !== "system") mode = "system";
  apply(mode);

  // Keep in sync with OS theme when in system mode
  function onSystemChange(){
    var now = safeGet();
    if((now || "system") !== "system") return;
    apply("system");
    updateUI();
  }
  if(mql && mql.addEventListener){
    mql.addEventListener("change", onSystemChange);
  } else if(mql && mql.addListener){
    mql.addListener(onSystemChange);
  }

  // UI injection
  var btn = null;
  function iconFor(resolved){
    return resolved === "light" ? "☀️" : "🌙";
  }
  function labelFor(mode, resolved){
    if(mode === "system") return "자동";
    return resolved === "light" ? "라이트" : "다크";
  }
  function modeHint(mode){
    if(mode === "system") return "SYSTEM";
    return mode.toUpperCase();
  }

  function ensureButton(){
    if(btn) return;
    btn = document.getElementById("stThemeToggle");
    if(btn) return;

    btn = document.createElement("button");
    btn.id = "stThemeToggle";
    btn.type = "button";
    btn.setAttribute("aria-label", "테마 변경 (자동/다크/라이트)");
    btn.innerHTML =
      '<span class="stIcon" aria-hidden="true">🌙</span>' +
      '<span class="stLabel">테마</span>' +
      '<span class="stMode">SYSTEM</span>';

    // Avoid interfering with page layout; append to body
    (document.body || docEl).appendChild(btn);

    btn.addEventListener("click", function(){
      var cur = safeGet();
      if(cur !== "dark" && cur !== "light" && cur !== "system") cur = "system";
      var nm = nextMode(cur);
      safeSet(nm);
      apply(nm);
      updateUI();
      toast(nm);
    });

    // Right click: reset to system
    btn.addEventListener("contextmenu", function(ev){
      ev.preventDefault();
      safeSet("system");
      apply("system");
      updateUI();
      toast("system");
      return false;
    });
  }

  // Avoid overlapping with page-specific fixed docks (analysis/action bars, etc.)
  function adjustForDock(){
    if(!btn) return;
    try{
      var extra = 0;
      var candidates = [
        document.getElementById("mobileDock"),
        document.getElementById("resultDock"),
        document.querySelector(".mobile-dock"),
        document.querySelector(".result-dock"),
        document.querySelector(".cta-dock"),
        document.querySelector(".dock"),
      ].filter(Boolean);

      for(var i=0;i<candidates.length;i++){
        var el = candidates[i];
        var cs = window.getComputedStyle(el);
        if(!cs) continue;
        if(cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
        // only consider fixed/sticky elements that could collide near bottom
        var pos = cs.position;
        if(pos !== "fixed" && pos !== "sticky") continue;
        var r = el.getBoundingClientRect();
        if(r.height <= 10) continue;
        // If it lives near the bottom, reserve space
        if(r.bottom > (window.innerHeight - 30)){
          extra = Math.max(extra, Math.min(120, r.height));
        }
      }

      var base = 14;
      var px = base + (extra ? (extra + 10) : 0);
      btn.style.bottom = "calc(" + px + "px + env(safe-area-inset-bottom))";
    } catch(e) {}
  }

  var toastEl = null;
  var toastTimer = null;
  function toast(mode){
    try{
      if(!toastEl){
        toastEl = document.createElement("div");
        toastEl.id = "stThemeToast";
        toastEl.style.position = "fixed";
        toastEl.style.right = "14px";
        toastEl.style.bottom = "64px";
        toastEl.style.zIndex = "9999";
        toastEl.style.padding = "10px 12px";
        toastEl.style.borderRadius = "14px";
        toastEl.style.border = "1px solid rgba(255,255,255,.16)";
        toastEl.style.background = "rgba(20,20,24,.55)";
        toastEl.style.backdropFilter = "blur(10px)";
        toastEl.style.webkitBackdropFilter = "blur(10px)";
        toastEl.style.color = "rgba(255,255,255,.92)";
        toastEl.style.fontWeight = "900";
        toastEl.style.fontSize = "12px";
        toastEl.style.opacity = "0";
        toastEl.style.transform = "translateY(6px)";
        toastEl.style.transition = "opacity .18s ease, transform .18s ease";
        (document.body || docEl).appendChild(toastEl);
      }

      var resolved = resolve(mode);
      var txt = (mode === "system" ? "자동" : (mode === "dark" ? "다크" : "라이트")) + " · " + (resolved === "light" ? "라이트 적용" : "다크 적용");
      toastEl.textContent = txt + " (우클릭=자동)";

      // Light theme tweaks for toast
      if(docEl.getAttribute("data-theme") === "light"){
        toastEl.style.border = "1px solid rgba(10,20,30,.12)";
        toastEl.style.background = "rgba(255,255,255,.78)";
        toastEl.style.color = "rgba(10,18,26,.92)";
      } else {
        toastEl.style.border = "1px solid rgba(255,255,255,.16)";
        toastEl.style.background = "rgba(20,20,24,.55)";
        toastEl.style.color = "rgba(255,255,255,.92)";
      }

      clearTimeout(toastTimer);
      requestAnimationFrame(function(){
        toastEl.style.opacity = "1";
        toastEl.style.transform = "translateY(0)";
      });
      toastTimer = setTimeout(function(){
        toastEl.style.opacity = "0";
        toastEl.style.transform = "translateY(6px)";
      }, 1400);
    } catch(e) {}
  }

  function updateUI(){
    if(!btn) return;
    var curMode = safeGet();
    if(curMode !== "dark" && curMode !== "light" && curMode !== "system") curMode = "system";
    var resolved = docEl.getAttribute("data-theme") || resolve(curMode);
    var icon = iconFor(resolved);
    var label = labelFor(curMode, resolved);

    var iconEl = btn.querySelector(".stIcon");
    var modeEl = btn.querySelector(".stMode");
    var labelEl = btn.querySelector(".stLabel");
    if(iconEl) iconEl.textContent = icon;
    if(labelEl) labelEl.textContent = "테마";
    if(modeEl) modeEl.textContent = modeHint(curMode) + " · " + label;

    btn.setAttribute("title", "클릭: 자동→다크→라이트 순환 / 우클릭: 자동");
    btn.setAttribute("aria-pressed", resolved === "dark" ? "true" : "false");
  }

  function init(){
    ensureButton();
    updateUI();
    adjustForDock();
    // Re-check after layout settles (some docks appear after calculation)
    setTimeout(adjustForDock, 350);
    setTimeout(adjustForDock, 1200);
    window.addEventListener("resize", function(){ setTimeout(adjustForDock, 120); });
  }

  if(document.readyState === "complete" || document.readyState === "interactive"){
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
