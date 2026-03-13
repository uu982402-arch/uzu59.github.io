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

      const anyKey = Object.keys(saved.fields || {}).length;
      if(!anyKey) return;

      if(document.getElementById('vvipRestoreInline')) return;

      const path = String(location.pathname || '');
      const pick = (sel)=>document.querySelector(sel);

      let host = null;
      if(path.indexOf('/tool-minigame')===0){
        host = pick('.mg-copy-row') || pick('.mg-kpis') || pick('.mg-kpi');
      }else if(path.indexOf('/tool-casino')===0){
        host = pick('.cs-next') || pick('.cs-actions') || pick('.cs-kpi');
      }else if(path.indexOf('/tool-slot')===0 || path.indexOf('/slot')===0){
        host = pick('.slot-actions') || pick('.slot-head-actions') || pick('.slot-kpi-actions') || pick('.tool-actions');
      }else if(path.indexOf('/analysis')===0){
        host = pick('.a-actions') || pick('.a-kpi-actions') || pick('.tool-actions');
      }else{
        host = pick('.kpi-actions, .tool-actions, .mg-copy-row, .cs-actions, .stx-actions, .hub-actions');
      }

      if(!host) return;

      const t = saved.ts ? relTime(saved.ts) : '';
      const wrap = el('div', { id:'vvipRestoreInline', class:'vvip-restore-inline' });
      const btn = el('button', { type:'button', class:'vvip-inline-btn' }, '최근 복원');
      const menu = el('button', { type:'button', class:'vvip-inline-menu', title:'최근 입력 지우기' }, '⋯');

      if(t){ wrap.setAttribute('title', '최근 저장: '+t); }

      wrap.appendChild(btn);
      wrap.appendChild(menu);

      const setBtn = (label, done)=>{
        try{
          btn.textContent = label;
          if(done){ btn.classList.add('done'); } else { btn.classList.remove('done'); }
        }catch(e){}
      };

      btn.addEventListener('click', ()=>{
        const ok = restorePersist();
        if(!ok){
          setBtn('복원 실패', false);
          setTimeout(()=>setBtn('최근 복원', false), 900);
        }else{
          setBtn('복원 ✓', true);
          setTimeout(()=>setBtn('최근 복원', false), 900);
        }
      });

      menu.addEventListener('click', (e)=>{
        e.preventDefault();
        const ok = confirm('저장된 최근 입력을 삭제할까요?');
        if(!ok) return;
        clearPersist();
        try{ wrap.remove(); }catch(err){}
      });

      host.appendChild(wrap);
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

      // Community nav patch
    function patchCommunityNav(){
      try{
        const anchors = document.querySelectorAll('a,button,summary');
        anchors.forEach(el=>{
          const t = (el.textContent||'').trim();
          if(t === '커뮤니티'){
            el.textContent = '홍보게시판';
            if(el.tagName === 'A'){
              el.setAttribute('href','/community/promo/');
            }
          }
        });

        // Move guide menu to the far right (desktop header)
        const nav = document.querySelector('.st-shell-nav');
        if(nav){
          const guideBtn = Array.from(nav.querySelectorAll('button, a')).find(x => ((x.textContent||'').trim()==='가이드'));
          if(guideBtn){
            const wrap = guideBtn.closest('.st-shell-dd') || guideBtn.closest('a') || guideBtn.parentElement;
            if(wrap && wrap.parentElement === nav){
              wrap.style.marginLeft = 'auto';
              nav.appendChild(wrap);
            }
          }
        }
      }catch(e){}
    }

    try{ patchCommunityNav(); }catch(e){}
})();

/* OPS console: optional global DOM patch rules (deploy + local override) */
;(function(){
  const LOCAL_KEY = 'vvip_ops_dom_patch_v1';
  const DEPLOY_URL = '/assets/config/ops.dom.patch.json';
  const BUILD_VER = (window.__BUILD_VER || '0') + '';
  const REMOTE_CACHE_KEY = '__ops_deploy_patch_cache_v1';
  const REMOTE_CACHE_TTL_MS = 60 * 1000; // 60s (fast ops iteration)

  let remoteCfg = null;
  let remoteTried = false;

  function safeParse(s, fallback){
    try{ return JSON.parse(s); }catch(_){ return fallback; }
  }

  function normalize(cfg){
    if(!cfg || typeof cfg !== 'object') return null;
    const out = {
      enabled: cfg.enabled === true,
      mode: String(cfg.mode || 'merge'),
      rules: Array.isArray(cfg.rules) ? cfg.rules : []
    };
    // sanitize
    out.rules = out.rules
      .filter(r=>r && typeof r === 'object')
      .map(r=>({
        selector: String(r.selector || '').trim(),
        type: String(r.type || '').trim(),
        attr: String(r.attr || '').trim(),
        value: (r.value == null) ? '' : String(r.value)
      }))
      .filter(r=>!!r.selector);
    // safety caps
    if(out.rules.length > 200) out.rules = out.rules.slice(0, 200);
    return out;
  }

  function readLocal(){
    try{
      const raw = localStorage.getItem(LOCAL_KEY);
      if(!raw) return null;
      return normalize(safeParse(raw, null));
    }catch(e){
      return null;
    }
  }

  function readRemoteCache(){
    try{
      const raw = sessionStorage.getItem(REMOTE_CACHE_KEY);
      if(!raw) return null;
      const wrap = safeParse(raw, null);
      if(!wrap || typeof wrap !== 'object') return null;
      const ts = Number(wrap.ts || 0);
      if(!ts || (Date.now() - ts) > REMOTE_CACHE_TTL_MS) return null;
      return normalize(wrap.cfg);
    }catch(e){
      return null;
    }
  }

  function writeRemoteCache(cfg){
    try{
      sessionStorage.setItem(REMOTE_CACHE_KEY, JSON.stringify({ts: Date.now(), cfg}));
    }catch(e){}
  }

  async function loadRemote(){
    if(remoteTried) return remoteCfg;
    remoteTried = true;

    // session cache
    const cached = readRemoteCache();
    if(cached){ remoteCfg = cached; return remoteCfg; }

    try{
      if(!('fetch' in window)) return null;
      const url = DEPLOY_URL + (DEPLOY_URL.indexOf('?')>=0 ? '&' : '?') + 'v=' + encodeURIComponent(BUILD_VER) + '&t=' + Date.now();
      const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
      if(!res || !res.ok) return null;
      const data = await res.json().catch(()=>null);
      const norm = normalize(data);
      remoteCfg = norm;
      if(norm) writeRemoteCache(norm);
      return remoteCfg;
    }catch(e){
      return null;
    }
  }

  function applyOne(rule){
    try{
      if(!rule || typeof rule !== 'object') return;
      const sel = String(rule.selector||'').trim();
      if(!sel) return;
      const type = String(rule.type||'').trim();
      const value = (rule.value==null) ? '' : String(rule.value);
      const attr = String(rule.attr||'').trim();

      let nodes = [];
      try{ nodes = Array.from(document.querySelectorAll(sel)); }catch(_){ return; }
      if(!nodes.length) return;

      // Safety caps
      if(nodes.length > 500) nodes = nodes.slice(0, 500);

      nodes.forEach(n=>{
        try{
          switch(type){
            case 'text':
              n.textContent = value;
              break;
            case 'html':
              n.innerHTML = value;
              break;
            case 'attr':
              if(attr) n.setAttribute(attr, value);
              break;
            case 'hide':
              n.dataset.opsHidden = '1';
              n.style.setProperty('display','none','important');
              n.style.setProperty('visibility','hidden','important');
              n.style.setProperty('pointer-events','none','important');
              break;
            case 'show':
              if(n.dataset.opsHidden === '1') delete n.dataset.opsHidden;
              n.style.removeProperty('display');
              n.style.removeProperty('visibility');
              n.style.removeProperty('pointer-events');
              break;
            case 'addClass':
              if(value) n.classList.add(value);
              break;
            case 'removeClass':
              if(value) n.classList.remove(value);
              break;
            default:
              break;
          }
        }catch(e){}
      });
    }catch(e){}
  }

  function effectiveConfig(){
    const local = readLocal();
    const remote = remoteCfg;

    // Local override mode
    if(local && local.mode === 'override'){
      return local.enabled ? local : {enabled:false, rules:[]};
    }

    const rules = [];
    let enabled = false;

    if(remote && remote.enabled){
      enabled = true;
      if(Array.isArray(remote.rules)) rules.push.apply(rules, remote.rules);
    }

    if(local && local.enabled){
      enabled = true;
      if(Array.isArray(local.rules)) rules.push.apply(rules, local.rules);
    }

    // Safety cap (remote + local)
    if(rules.length > 160) rules.length = 160;

    return { enabled, rules };
  }

  function applyAll(){
    try{
      const p = location.pathname || '/';
      if(p.startsWith('/ops')) return; // do not self-patch console

      const cfg = effectiveConfig();
      if(!cfg || cfg.enabled !== true) return;
      const rules = Array.isArray(cfg.rules) ? cfg.rules : [];
      if(!rules.length) return;

      rules.forEach(applyOne);
    }catch(e){}
  }

  function boot(){
    // 1) apply local immediately
    applyAll();

    // 2) fetch deploy config and re-apply
    try{
      loadRemote().then(()=>{ applyAll(); }).catch(()=>{});
    }catch(e){}

    // 3) Late-render safety window
    try{
      let ticks = 0;
      const iv = setInterval(()=>{
        applyAll();
        if(++ticks >= 10) clearInterval(iv);
      }, 320);

      const mo = new MutationObserver(()=>{ applyAll(); });
      mo.observe(document.documentElement, {childList:true, subtree:true});
      setTimeout(()=>{ try{ mo.disconnect(); }catch(e){} }, 2600);
    }catch(e){}
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
