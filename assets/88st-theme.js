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

  // Docking: avoid overlapping with TOP fixed UI (notice bar, sticky header)
  function dockToggle(){
    const btn = document.getElementById("_88stThemeToggle");
    if(!btn) return;

    const vh = window.innerHeight || document.documentElement.clientHeight;
    let extraBottom = 0;

    // Candidates that often occupy bottom space (FABs / action docks)
    const selectors = [
      ".fab",
      ".mobile-dock",
      "#resultDock",
      ".result-dock",
      ".st-fab",
      ".floating-dock",
      ".quick-dock"
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
        const reserved = Math.round(vh - rect.top) + 10; // add breathing room
        extraBottom = Math.max(extraBottom, reserved);
      }
    });

    // If nothing detected but iOS bottom bars are present, safe-area inset handles it.
    root.style.setProperty('--_88stToggleBottomExtra', `${extraBottom}px`);
  })();