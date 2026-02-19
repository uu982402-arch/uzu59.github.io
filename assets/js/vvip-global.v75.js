/* v86 global: legacy bottom CTA cleanup + calc accordion sync + 최근 사용/최근 입력 저장·복원 */
(function(){
  const LEGACY_IDS = [
    "vvipCtaDock",
    "vvipToolsBackdrop",
    "vvipToolsSheet",
    "stCertDock",
  ];

  const RECENT_KEY = 'vvip_recent_pages_v1';
  const PERSIST_PREFIX = 'vvip_form_persist_v1:';

  function safeJsonParse(s, fallback){
    try{ return JSON.parse(s); }catch(_){ return fallback; }
  }
  function lsRead(key, fallback){
    try{ const v = localStorage.getItem(key); return v ? safeJsonParse(v, fallback) : fallback; }catch(_){ return fallback; }
  }
  function lsWrite(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(_){ /* ignore */ }
  }

  function el(tag, attrs, html){
    const n = document.createElement(tag);
    if(attrs) for(const k in attrs){
      if(k==="class") n.className=attrs[k];
      else if(k==="id") n.id=attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    if(html!=null) n.innerHTML = html;
    return n;
  }

  function cleanupBottomCtas(){
    try{
      for(const id of LEGACY_IDS){
        const node = document.getElementById(id);
        if(node && node.parentNode) node.parentNode.removeChild(node);
      }
      document.querySelectorAll('.vvip-cta-dock, .vvip-tools-backdrop, .vvip-tools-sheet, .st-certdock')
        .forEach(n=>{ try{ n.remove(); }catch(e){} });

      // Reset any forced padding (inline only)
      if(document.body && document.body.style && document.body.style.paddingBottom){
        document.body.style.paddingBottom = "";
      }
    }catch(e){}
  }

  function normalizeAccordions(){
    // Only allow one open within calc mega dropdown accordions
    const accs = document.querySelectorAll(".st-shell-mega-acc details.st-acc");
    if(!accs || accs.length<2) return;
    accs.forEach(d=>{
      d.addEventListener("toggle", ()=>{
        if(!d.open) return;
        accs.forEach(o=>{ if(o!==d) o.removeAttribute("open"); });
      });
    });
  }

  function hardHideStyle(){
    try{
      if(document.getElementById("vvipNoBottomCtaStyle")) return;
      const s = document.createElement("style");
      s.id = "vvipNoBottomCtaStyle";
      s.textContent = `
        .vvip-cta-dock, .vvip-tools-backdrop, .vvip-tools-sheet, .st-certdock{
          display:none !important;
          visibility:hidden !important;
          pointer-events:none !important;
        }
        body{ padding-bottom: 0 !important; }
      `;
      document.head.appendChild(s);
    }catch(e){}
  }

  function watchBottomCtas(){
    try{
      // Some pages inject late. Observe for a short window and keep removing.
      let ticks = 0;
      const iv = setInterval(()=>{
        cleanupBottomCtas();
        if(++ticks >= 30) clearInterval(iv);
      }, 250);

      const mo = new MutationObserver(()=>{ cleanupBottomCtas(); });
      mo.observe(document.documentElement, {childList:true, subtree:true});
      setTimeout(()=>{ try{ mo.disconnect(); }catch(e){} }, 8000);
    }catch(e){}
  }

  function ready(fn){
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  // ---------- Recent usage tracking ----------
  function isToolLikePath(pathname){
    const p = pathname || '/';
    if(/^\/analysis\/?$/.test(p)) return true;
    return (
      /^\/(analysis|tool-|tool\/|tool-casino|tool-minigame|tool-slot|tool-virtual|tool-ev|tool-margin|tool-odds|casino-strategy)\//.test(p)
      || p==='/analysis/'
    );
  }

  function shouldTrackRecent(pathname){
    const p = pathname || '/';
    if(p.startsWith('/cert')) return false;
    if(p.startsWith('/guide')) return false;
    if(p.startsWith('/calc')) return false;
    return /^\/(analysis|tool-|tool\/|tool-casino|tool-minigame|tool-slot|tool-virtual|tool-ev|tool-margin|tool-odds|casino-strategy)\//.test(p) || p==='/analysis/';
  }

  function trackRecent(){
    try{
      const p = location.pathname || '/';
      if(!shouldTrackRecent(p)) return;
      const item = {
        path: p,
        title: String(document.title||'').slice(0, 90),
        ts: Date.now()
      };
      const list = lsRead(RECENT_KEY, []);
      const arr = Array.isArray(list) ? list : [];
      const next = [item, ...arr.filter(x=>x && x.path && x.path !== item.path)].slice(0, 10);
      lsWrite(RECENT_KEY, next);
    }catch(e){}
  }

  function escapeHtml(s){
    return String(s==null?'':s).replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function relTime(ts){
    try{
      const d = Math.max(0, Date.now() - Number(ts||0));
      const m = Math.floor(d/60000);
      if(m < 1) return '방금';
      if(m < 60) return m+'분 전';
      const h = Math.floor(m/60);
      if(h < 24) return h+'시간 전';
      const day = Math.floor(h/24);
      return day+'일 전';
    }catch(e){ return ''; }
  }

  function renderRecentHub(){
    try{
      const p = location.pathname || '/';
      if(!(p.startsWith('/guide') || p.startsWith('/calc'))) return;
      const hub = document.querySelector('.hub');
      if(!hub) return;
      if(document.getElementById('vvipRecentHub')) return;

      const list = lsRead(RECENT_KEY, []);
      const arr = (Array.isArray(list) ? list : []).filter(x=>x && x.path && !String(x.path).startsWith('/cert') && !String(x.path).startsWith('/guide') && !String(x.path).startsWith('/calc'));
      if(!arr.length) return;

      const show = arr.slice(0, 6);
      const sec = document.createElement('section');
      sec.className = 'hub-section';
      sec.id = 'vvipRecentHub';
      sec.innerHTML = `
        <div class="hub-head">
          <h2>최근 사용</h2>
          <div class="sub">최근에 사용한 도구/분석기를 1클릭으로 다시 열 수 있어요</div>
        </div>
        <div class="hub-grid cols-3 vvip-recent-grid">
          ${show.map(x=>{
            const path = escapeHtml(x.path);
            const t = escapeHtml(x.title || x.path);
            const rt = escapeHtml(relTime(x.ts));
            return `
              <a class="hub-card" href="${path}">
                <div class="top"><div class="hub-ic">⏱</div><div><div class="ttl">${t}</div><div class="desc">${path}</div></div></div>
                <div class="meta"><span class="hub-pill">${rt}</span><span class="hub-go">열기 →</span></div>
              </a>
            `;
          }).join('')}
        </div>
      `;

      const hero = hub.querySelector('.hub-hero');
      if(hero) hero.insertAdjacentElement('afterend', sec);
      else hub.prepend(sec);
    }catch(e){}
  }

  // ---------- Form persist / restore ----------
  function shouldEnablePersist(){
    const p = location.pathname || '/';
    if(p.startsWith('/cert')) return false;
    if(p.startsWith('/guide')) return false;
    if(p.startsWith('/calc')) return false;
    return /^\/(analysis|tool-|tool\/|tool-casino|tool-minigame|tool-slot|tool-virtual|tool-ev|tool-margin|tool-odds)\//.test(p) || p==='/analysis/';
  }

  function persistKey(){
    const p = (location.pathname || '/').replace(/\/$/, '') || '/';
    return PERSIST_PREFIX + p;
  }

  function collectFields(){
    const root = document.querySelector('main') || document.body;
    const nodes = Array.from(root.querySelectorAll('input, select, textarea'));
    const out = {};
    for(const n of nodes){
      try{
        if(!n) continue;
        if(n.closest('#cardPopup, .popup, dialog, [aria-hidden="true"]')) continue;
        if(n.disabled) continue;
        const type = String(n.type || '').toLowerCase();
        if(type === 'hidden' || type === 'password') continue;
        const k = n.id || n.name || n.getAttribute('data-persist-key');
        if(!k) continue;
        let v;
        if(type === 'checkbox' || type === 'radio') v = n.checked ? '1' : '0';
        else v = n.value;
        if(v == null) continue;
        out[k] = { t: type || n.tagName.toLowerCase(), v: String(v).slice(0, 2000) };
      }catch(e){ /* ignore */ }
    }
    return out;
  }

  function loadPersist(){
    const obj = lsRead(persistKey(), null);
    if(!obj || typeof obj !== 'object') return null;
    if(!obj.fields || typeof obj.fields !== 'object') return null;
    return obj;
  }

  function savePersist(){
    try{
      const payload = { ts: Date.now(), fields: collectFields() };
      lsWrite(persistKey(), payload);
    }catch(e){}
  }

  function restorePersist(){
    const saved = loadPersist();
    if(!saved) return false;
    const fields = saved.fields || {};
    let applied = 0;
    const root = document.querySelector('main') || document.body;

    const setVal = (node, type, v) => {
      try{
        if(!node) return;
        if(type === 'checkbox' || type === 'radio') node.checked = (String(v)==='1' || String(v).toLowerCase()==='true');
        else node.value = v;
        node.dispatchEvent(new Event('input', {bubbles:true}));
        node.dispatchEvent(new Event('change', {bubbles:true}));
      }catch(e){}
    };

    for(const k in fields){
      const item = fields[k];
      if(!item) continue;
      const type = String(item.t||'').toLowerCase();
      const v = item.v;

      // id first
      let node = root.querySelector('#'+CSS.escape(k));
      if(!node){
        // name
        node = root.querySelector('[name="'+CSS.escape(k)+'"]');
      }
      if(!node){
        // data key
        node = root.querySelector('[data-persist-key="'+CSS.escape(k)+'"]');
      }
      if(node){
        setVal(node, type, v);
        applied += 1;
      }
    }

    return applied > 0;
  }

  function clearPersist(){
    try{ localStorage.removeItem(persistKey()); }catch(e){}
  }

  function mountRestoreBar(){
    try{
      if(!shouldEnablePersist()) return;
      const saved = loadPersist();
      if(!saved) return;
      const main = document.querySelector('main');
      if(!main) return;
      if(document.getElementById('vvipRestoreBar')) return;

      // if there is no applicable field, do not show
      const anyKey = Object.keys(saved.fields || {}).length;
      if(!anyKey) return;

      const t = saved.ts ? relTime(saved.ts) : '';
      const bar = el('div', { id:'vvipRestoreBar', class:'vvip-restore-bar' });
      const left = el('div', { class:'vvip-restore-left' }, `<b>최근 입력 저장됨</b><span class="vvip-restore-time">${escapeHtml(t)}</span>`);
      const right = el('div', { class:'vvip-restore-right' });
      const btn = el('button', { type:'button', class:'vvip-restore-btn' }, '1클릭 복원');
      const clr = el('button', { type:'button', class:'vvip-restore-clear' }, '지우기');
      right.appendChild(btn);
      right.appendChild(clr);
      bar.appendChild(left);
      bar.appendChild(right);

      btn.addEventListener('click', ()=>{
        const ok = restorePersist();
        if(!ok){
          try{ btn.textContent='복원 실패'; setTimeout(()=>btn.textContent='1클릭 복원', 900); }catch(e){}
        }else{
          try{ btn.textContent='복원 완료 ✓'; setTimeout(()=>btn.textContent='1클릭 복원', 900); }catch(e){}
        }
      });
      clr.addEventListener('click', ()=>{ clearPersist(); try{ bar.remove(); }catch(e){} });

      // Insert after hero if exists
      const anchor = main.querySelector('.mg-hero, .st-land-hero, .st-hero, .tool-hero, .a-hero, .page-hero, section');
      if(anchor && anchor.parentNode === main){
        anchor.insertAdjacentElement('afterend', bar);
      }else{
        main.insertBefore(bar, main.firstChild);
      }
    }catch(e){}
  }

  function bindPersistListeners(){
    try{
      if(!shouldEnablePersist()) return;
      const root = document.querySelector('main') || document.body;
      const nodes = Array.from(root.querySelectorAll('input, select, textarea'));
      if(!nodes.length) return;

      let t = null;
      const schedule = ()=>{
        clearTimeout(t);
        t = setTimeout(savePersist, 260);
      };

      for(const n of nodes){
        try{
          if(!n || n.dataset.vvipPersistBound === '1') continue;
          if(n.closest('#cardPopup, .popup, dialog, [aria-hidden="true"]')) continue;
          const type = String(n.type||'').toLowerCase();
          if(type==='hidden' || type==='password') continue;
          const key = n.id || n.name || n.getAttribute('data-persist-key');
          if(!key) continue;
          n.addEventListener('input', schedule);
          n.addEventListener('change', schedule);
          n.dataset.vvipPersistBound = '1';
        }catch(e){}
      }

      // Save once after initial render
      setTimeout(()=>{ try{ savePersist(); }catch(e){} }, 700);

      // Attach again for late-rendered controls
      setTimeout(()=>{ try{ bindPersistListeners(); }catch(e){} }, 1200);
      setTimeout(()=>{ try{ bindPersistListeners(); }catch(e){} }, 2200);
    }catch(e){}
  }

  ready(()=>{
    hardHideStyle();
    cleanupBottomCtas();
    watchBottomCtas();
    trackRecent();
    renderRecentHub();

    // give shell a moment if it is injected async
    setTimeout(()=>{ normalizeAccordions(); }, 250);

    // persist/restore
    setTimeout(()=>{ mountRestoreBar(); }, 350);
    setTimeout(()=>{ bindPersistListeners(); }, 600);
  });
})();
