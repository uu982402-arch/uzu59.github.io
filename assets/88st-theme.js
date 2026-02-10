/* 88ST Theme Toggle — System/Dark/Light (saved) + auto docking */
(function(){
  "use strict";

  const KEY = "88st_theme_mode_v1"; // system|dark|light
  const root = document.documentElement;

  function getSaved(){
    try{ return localStorage.getItem(KEY) || "system"; }catch(e){ return "system"; }
  }
  function save(v){
    try{ localStorage.setItem(KEY, v); }catch(e){}
  }
  function prefersDark(){
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  function resolve(mode){
    if(mode === "dark") return "dark";
    if(mode === "light") return "light";
    return prefersDark() ? "dark" : "light";
  }

  function iconFor(theme){
    return theme === "light" ? "☀️" : "🌙";
  }
  function labelFor(mode){
    if(mode === "system") return "SYSTEM";
    if(mode === "dark") return "DARK";
    return "LIGHT";
  }

  function cycle(mode){
    if(mode === "system") return "dark";
    if(mode === "dark") return "light";
    return "system";
  }

  function ensureToggle(){
    if(document.getElementById("_88stThemeToggle")) return;
    const btn = document.createElement("div");
    btn.id = "_88stThemeToggle";
    btn.setAttribute("role","button");
    btn.setAttribute("aria-label","테마 변경");
    btn.tabIndex = 0;
    btn.innerHTML = `
      <div class="icon" aria-hidden="true">🌙</div>
      <div style="display:flex;flex-direction:column;gap:2px;line-height:1;">
        <div class="label">테마</div>
        <div class="mode">SYSTEM</div>
      </div>
    `;

    const onClick = ()=>{
      const current = getSaved();
      const next = cycle(current);
      save(next);
      setTheme(next);
    };
    btn.addEventListener("click", onClick);
    btn.addEventListener("keydown", (e)=>{
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        onClick();
      }
    });

    // Right-click: reset to system
    btn.addEventListener("contextmenu", (e)=>{
      e.preventDefault();
      save("system");
      setTheme("system");
    });

    document.body.appendChild(btn);
  }

  function updateToggleLabel(){
    const btn = document.getElementById("_88stThemeToggle");
    if(!btn) return;
    const theme = root.dataset.theme || "dark";
    const mode = root.dataset.themeMode || "system";
    const icon = btn.querySelector(".icon");
    const modeEl = btn.querySelector(".mode");
    if(icon) icon.textContent = iconFor(theme);
    if(modeEl) modeEl.textContent = labelFor(mode);
  }

  // Docking: avoid overlapping with bottom fixed UI (FABs / docks)
  function dockToggle(){
    const btn = document.getElementById("_88stThemeToggle");
    if(!btn) return;

    const vh = window.innerHeight || document.documentElement.clientHeight;
    let extraBottom = 0;

    const selectors = [
      ".fab",
      ".mobile-dock",
      "#resultDock",
      ".result-dock",
      ".st-fab",
      ".floating-dock",
      ".quick-dock",
      ".st-bottom-dock"
    ];

    const candidates = [];
    selectors.forEach(sel=>{
      document.querySelectorAll(sel).forEach(el=>candidates.push(el));
    });

    candidates.forEach(el=>{
      if(el === btn) return;
      const st = getComputedStyle(el);
      if(st.display === "none" || st.visibility === "hidden" || st.opacity === "0") return;
      if(st.position !== "fixed") return;

      const rect = el.getBoundingClientRect();
      if(rect.height < 36) return;

      // Consider elements touching the bottom band
      if(rect.bottom >= (vh - 2) && rect.top < vh){
        const reserved = Math.round(vh - rect.top) + 10; // breathing room
        extraBottom = Math.max(extraBottom, reserved);
      }
    });

    // Hard cap: never push toggle completely off-screen
    extraBottom = Math.min(extraBottom, Math.max(0, vh - 120));
    root.style.setProperty('--_88stToggleBottomExtra', `${extraBottom}px`);
  }

  function setTheme(mode){
    const theme = resolve(mode);
    root.classList.add("_themeTransition");
    window.setTimeout(()=>root.classList.remove("_themeTransition"), 260);

    root.dataset.theme = theme;
    root.dataset.themeMode = mode;
    updateToggleLabel();
    dockToggle();
    try{ window.dispatchEvent(new CustomEvent('88st:theme', {detail:{theme: theme, mode: mode}})); }catch(e){}
  }

  function init(){
    ensureToggle();
    setTheme(getSaved());

    // Re-dock on resize / orientation changes
    window.addEventListener("resize", ()=>dockToggle(), {passive:true});
    window.addEventListener("orientationchange", ()=>setTimeout(dockToggle, 80), {passive:true});

    // Re-dock after shell/dock injection
    window.addEventListener("88st:shellReady", ()=>setTimeout(dockToggle, 0));
    window.addEventListener("88st:dock", ()=>setTimeout(dockToggle, 0));

    // Update when OS theme changes (system mode only)
    try{
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = ()=>{ if(getSaved() === "system") setTheme("system"); };
      if(mq.addEventListener) mq.addEventListener("change", onChange);
      else if(mq.addListener) mq.addListener(onChange);
    }catch(e){}
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init, {once:true});
  }else{
    init();
  }
})();
