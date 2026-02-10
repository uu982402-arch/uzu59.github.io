/* 88ST Theme Toggle — System/Dark/Light (saved) + auto docking */
(function(){
  const KEY = "88st_theme_mode_v1"; // system|dark|light
  const root = document.documentElement;

  function getSaved(){ return localStorage.getItem(KEY) || "system"; }
  function save(v){ localStorage.setItem(KEY, v); }
  function prefersDark(){ return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches; }

  function resolve(mode){
    if(mode === "dark") return "dark";
    if(mode === "light") return "light";
    return prefersDark() ? "dark" : "light";
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

  function cycle(mode){
    if(mode === "system") return "dark";
    if(mode === "dark") return "light";
    return "system";
  }

  function iconFor(theme){
    return theme === "light" ? "☀️" : "🌙";
  }
  function labelFor(mode){
    if(mode === "system") return "SYSTEM";
    if(mode === "dark") return "DARK";
    return "LIGHT";
  }

  function ensureToggle(){
    if(document.getElementById("_88stThemeToggle")) return;
    const btn = document.createElement("div");
    btn.id = "_88stThemeToggle";
    btn.setAttribute("role","button");
    btn.setAttribute("aria-label","테마 변경");
    btn.innerHTML = `
      <div class="icon" aria-hidden="true">🌙</div>
      <div style="display:flex;flex-direction:column;gap:2px;line-height:1;">
        <div class="label">테마</div>
        <div class="mode">SYSTEM</div>
      </div>
    `;
    btn.addEventListener("click", ()=>{
      const current = getSaved();
      const next = cycle(current);
      save(next);
      setTheme(next);
    });
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

  // Docking: avoid overlapping with bottom fixed UI (FAB, dock, CTA bar)
  function dockToggle(){
    const btn = document.getElementById("_88stThemeToggle");
    if(!btn) return;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const base = 18; // px
    let extra = 0;

    const selectors = [
      ".fab", ".floating-fab", ".floating-actions", ".floating-buttons",
      "#bottomDock", ".cta-dock", ".dock", ".bottom-dock", ".action-dock",
      ".stickyDock", ".analysisDock", ".fixedDock", ".fixed-dock", ".dock-wrap"
    ];

    const candidates = [];
    selectors.forEach(sel=>{
      document.querySelectorAll(sel).forEach(el=>candidates.push(el));
    });

    candidates.forEach(el=>{
      const st = getComputedStyle(el);
      if(st.display === "none" || st.visibility === "hidden" || st.opacity === "0") return;
      if(st.position !== "fixed") return;
      const rect = el.getBoundingClientRect();
      if(rect.height < 24) return;
      // Only consider elements occupying bottom band
      if(rect.bottom > (vh - 80) && rect.top > (vh - 420)){
        const needed = Math.max(0, vh - rect.top + 12);
        extra = Math.max(extra, needed);
      }
    });

    btn.style.bottom = `calc(${base + extra}px + env(safe-area-inset-bottom, 0px))`;
  }

  function initMetaThemeColor(){
    // Helps mobile address bar match theme
    const ensure = (content, media)=>{
      const m = document.createElement("meta");
      m.name = "theme-color";
      m.content = content;
      if(media) m.media = media;
      document.head.appendChild(m);
    };
    // Add only if not already present
    const existing = Array.from(document.querySelectorAll('meta[name="theme-color"]'));
    if(existing.length === 0){
      ensure("#0b0c10", "(prefers-color-scheme: dark)");
      ensure("#f6f8ff", "(prefers-color-scheme: light)");
    }
  }

  function bindSystemListener(){
    if(!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = ()=>{
      if(getSaved() === "system") setTheme("system");
    };
    if(mq.addEventListener) mq.addEventListener("change", handler);
    else if(mq.addListener) mq.addListener(handler);
  }

  function boot(){
    ensureToggle();
    initMetaThemeColor();
    bindSystemListener();
    setTheme(getSaved());
    window.addEventListener("resize", dockToggle);
    window.addEventListener("orientationchange", dockToggle);
    window.addEventListener("scroll", ()=>{ window.requestAnimationFrame(dockToggle); }, {passive:true});
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();