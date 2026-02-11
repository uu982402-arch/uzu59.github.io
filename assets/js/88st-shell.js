/* 88ST Global Shell — v2.2 unified header/footer + search + user menu */
(function(){
  "use strict";

  const SHELL_CSS    = "/assets/88st-shell.css?v=20260211_v22";
  const UNIFY_CSS    = "/assets/88st-unify.css?v=20260210_LUX2";
  const LUX2_CSS     = "/assets/88st-luxury-v2.css?v=20260210_LUX2";
  const TOOL_HIS_CSS = "/assets/88st-tool-history.css?v=20260210_LUX2";

  function ensureCss(href){
    try{
      const base = String(href).split("?")[0];
      const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(l=> (l.getAttribute('href')||"").split("?")[0]);
      if(existing.includes(base)) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }catch(e){}
  }

  const $$ = (sel, root=document)=> Array.from(root.querySelectorAll(sel));

  // ===== Local storage helpers (safe) =====
  function lsRead(key, fallback){
    try{
      const v = localStorage.getItem(key);
      if(!v) return fallback;
      return JSON.parse(v);
    }catch(e){
      return fallback;
    }
  }
  function lsWrite(key, val){
    try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
  }

  const KEY_FAV_VENDORS = "88st_fav_vendors_v1";
  const KEY_FAV_TOOLS   = "88st_fav_tools_v1";
  const KEY_REC_VENDORS = "88st_recent_vendors_v1";

  function isFavVendor(id){
    const list = lsRead(KEY_FAV_VENDORS, []);
    return Array.isArray(list) && list.some(x=> x && x.id === id);
  }

  function toggleFavVendor(item){
    const id = String(item?.id||"").trim();
    if(!id) return false;
    const title = String(item?.title||"").trim();

    let list = lsRead(KEY_FAV_VENDORS, []);
    if(!Array.isArray(list)) list = [];

    const idx = list.findIndex(x=> x && x.id === id);
    let on = false;
    if(idx >= 0){
      list.splice(idx, 1);
      on = false;
    }else{
      list.unshift({ id, title, ts: Date.now() });
      if(list.length > 60) list = list.slice(0,60);
      on = true;
    }
    lsWrite(KEY_FAV_VENDORS, list);
    return on;
  }

  function addRecentVendor(item){
    const id = String(item?.id||"").trim();
    if(!id) return;
    const title = String(item?.title||"").trim();
    const href = String(item?.href||"").trim();

    let list = lsRead(KEY_REC_VENDORS, []);
    if(!Array.isArray(list)) list = [];
    list = list.filter(x=> x && x.id !== id);
    list.unshift({ id, title, href, ts: Date.now() });
    if(list.length > 30) list = list.slice(0,30);
    lsWrite(KEY_REC_VENDORS, list);
  }

  function getRecentCalcs(){
    // Try known keys (tools save history here)
    const keys = ["88st_tool_history_v1", "88st_tool_history", "tool_history_v1", "tool_history"];
    for(const k of keys){
      const v = lsRead(k, null);
      if(Array.isArray(v) && v.length) return v;
      if(v && typeof v === 'object' && Array.isArray(v.items) && v.items.length) return v.items;
    }
    return [];
  }

  function fmtTime(ts){
    try{
      const d = new Date(ts);
      if(Number.isNaN(d.getTime())) return "";
      const m = String(d.getMonth()+1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      return `${m}.${day} ${hh}:${mm}`;
    }catch(e){ return ""; }
  }

  // Expose globals for pages (index/tools) to update lists
  window.__88stIsFavVendor = isFavVendor;
  window.__88stToggleFavVendor = toggleFavVendor;
  window.__88stAddRecentVendor = addRecentVendor;

  // ===== Search items =====
  const SEARCH_ITEMS = [
    {group:"섹션", title:"보증업체", href:"/#vendors-guarantee", tag:"업체"},
    {group:"섹션", title:"인증업체", href:"/#vendors-verified", tag:"업체"},
    {group:"메뉴", title:"분석기", href:"/analysis/", tag:"도구"},
    {group:"계산기", title:"마진 계산기", href:"/tool-margin/", tag:"계산기"},
    {group:"계산기", title:"EV 계산기", href:"/tool-ev/", tag:"계산기"},
    {group:"계산기", title:"배당↔확률 변환", href:"/tool-odds/", tag:"계산기"},
    {group:"계산기", title:"Kelly 비중", href:"/tool/kelly/", tag:"계산기"},
    {group:"가이드", title:"입플 체크리스트", href:"/bonus-checklist/", tag:"가이드"},
    {group:"가이드", title:"카지노", href:"/casino/", tag:"가이드"},
    {group:"가이드", title:"슬롯", href:"/slot/", tag:"가이드"},
    {group:"가이드", title:"미니게임", href:"/minigame/", tag:"가이드"},
    {group:"가이드", title:"IPL", href:"/ipl/", tag:"가이드"},
    {group:"보증사이트", title:"SPEED", href:"/speed/", tag:"보증"},
    {group:"보증사이트", title:"OK", href:"/ok/", tag:"보증"},
  ];

  const RECOMMENDED = ["보증업체", "인증업체", "분석기", "마진", "EV", "SPEED", "OK", "카지노", "슬롯", "IPL"];

  function inject(){
    if(document.getElementById("_88stShellHeader")) return;

    document.body.classList.add("st-shell-on", "st-lux2");

    const notice = document.querySelector(".notice-bar");
    const insertAfter = notice || null;

    // ===== Header =====
    const header = document.createElement("header");
    header.className = "st-shell-header";
    header.id = "_88stShellHeader";

    header.innerHTML = `
      <div class="st-shell-inner">
        <a class="st-shell-brand" href="/" aria-label="88ST 홈">
          <div class="st-shell-logo" aria-hidden="true"><img src="/img/logo.png" alt=""/></div>
          <div>
            <div class="st-shell-title">88ST.CLOUD</div>
            <div class="st-shell-sub">보증 · 인증 · 분석기 · 계산기 · 가이드</div>
          </div>
        </a>

        <div class="st-shell-center">
          <nav class="st-shell-nav" aria-label="주요 메뉴">
            <a class="st-shell-link" href="/#vendors-guarantee">보증업체</a>
            <a class="st-shell-link" href="/#vendors-verified">인증업체</a>

            <div class="st-shell-dd">
              <button class="st-shell-link" type="button" aria-haspopup="menu" aria-expanded="false">보증사이트</button>
              <div class="st-shell-menu mega" role="menu" aria-label="보증사이트">
                <a href="/speed/" role="menuitem"><span>SPEED</span></a>
                <a href="/ok/" role="menuitem"><span>OK</span></a>
              </div>
            </div>

            <a class="st-shell-link" href="/analysis/">분석기</a>

            <div class="st-shell-dd">
              <button class="st-shell-link" type="button" aria-haspopup="menu" aria-expanded="false">계산기</button>
              <div class="st-shell-menu mega" role="menu" aria-label="계산기 목록">
                <a href="/tool-margin/" role="menuitem"><span>마진 계산기</span><span class="hint">오버라운드</span></a>
                <a href="/tool-ev/" role="menuitem"><span>EV 계산기</span><span class="hint">기대값</span></a>
                <a href="/tool-odds/" role="menuitem"><span>배당↔확률</span><span class="hint">변환</span></a>
                <a href="/tool/kelly/" role="menuitem"><span>Kelly 비중</span><span class="hint">리스크</span></a>
              </div>
            </div>

            <div class="st-shell-dd">
              <button class="st-shell-link" type="button" aria-haspopup="menu" aria-expanded="false">가이드</button>
              <div class="st-shell-menu mega" role="menu" aria-label="가이드 목록">
                <a href="/bonus-checklist/" role="menuitem"><span>입플 체크</span><span class="hint">필수</span></a>
                <a href="/casino/" role="menuitem"><span>카지노</span><span class="hint">기초</span></a>
                <a href="/slot/" role="menuitem"><span>슬롯</span><span class="hint">기초</span></a>
                <a href="/minigame/" role="menuitem"><span>미니게임</span><span class="hint">기초</span></a>
                <a href="/ipl/" role="menuitem"><span>IPL</span><span class="hint">기초</span></a>
              </div>
            </div>
          </nav>

          <button class="st-shell-search" type="button" id="_88stSearchOpen" aria-label="통합검색 열기">
            <span class="g" aria-hidden="true"></span>
            <span class="q">구글창처럼 <b>팔팔커뮤니티</b> 검색 →</span>
            <span class="kbd">Ctrl K</span>
          </button>
        </div>

        <div class="st-shell-actions">
          <button class="st-shell-btn ghost" type="button" id="_88stUserOpen">내 메뉴</button>
          <button class="st-shell-btn ghost" type="button" id="_88stShellBurger" aria-label="메뉴" aria-expanded="false">☰</button>
        </div>
      </div>
    `;

    if(insertAfter && insertAfter.parentNode) insertAfter.parentNode.insertBefore(header, insertAfter.nextSibling);
    else document.body.insertBefore(header, document.body.firstChild);

    // ===== Drawer (mobile) =====
    const drawer = document.createElement('div');
    drawer.id = '_88stShellDrawer';
    drawer.innerHTML = `
      <div class="st-shell-drawer" aria-hidden="true">
        <div class="st-shell-drawer-backdrop" data-close="1"></div>
        <div class="st-shell-drawer-panel" role="dialog" aria-modal="true" aria-label="모바일 메뉴">
          <div class="st-shell-drawer-head">
            <div class="st-shell-title">메뉴</div>
            <button class="st-shell-btn ghost" type="button" data-close="1" aria-label="닫기">✕</button>
          </div>
          <div class="st-shell-drawer-body">
            <a class="st-shell-link" href="/#vendors-guarantee">보증업체</a>
            <a class="st-shell-link" href="/#vendors-verified">인증업체</a>

            <details class="st-shell-acc" open>
              <summary class="st-shell-link">보증사이트</summary>
              <div class="st-shell-acc-body">
                <a class="st-shell-link" href="/speed/">SPEED</a>
                <a class="st-shell-link" href="/ok/">OK</a>
              </div>
            </details>

            <a class="st-shell-link" href="/analysis/">분석기</a>

            <details class="st-shell-acc" open>
              <summary class="st-shell-link">계산기</summary>
              <div class="st-shell-acc-body">
                <a class="st-shell-link" href="/tool-margin/">마진 계산기</a>
                <a class="st-shell-link" href="/tool-ev/">EV 계산기</a>
                <a class="st-shell-link" href="/tool-odds/">배당↔확률</a>
                <a class="st-shell-link" href="/tool/kelly/">Kelly 비중</a>
              </div>
            </details>

            <details class="st-shell-acc" open>
              <summary class="st-shell-link">가이드</summary>
              <div class="st-shell-acc-body">
                <a class="st-shell-link" href="/bonus-checklist/">입플 체크</a>
                <a class="st-shell-link" href="/casino/">카지노</a>
                <a class="st-shell-link" href="/slot/">슬롯</a>
                <a class="st-shell-link" href="/minigame/">미니게임</a>
                <a class="st-shell-link" href="/ipl/">IPL</a>
              </div>
            </details>
          </div>
          <div class="st-shell-drawer-foot">
            <button class="st-shell-btn ghost" type="button" id="_88stDrawerSearch">검색</button>
            <button class="st-shell-btn" type="button" id="_88stDrawerUser">내 메뉴</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(drawer);

    // ===== Modals =====
    const modalWrap = document.createElement('div');
    modalWrap.id = '_88stShellModals';
    modalWrap.innerHTML = `
      <div class="st-shell-modal" id="_88stSearchModal" aria-hidden="true">
        <div class="st-shell-modal-backdrop" data-close="1"></div>
        <div class="st-shell-modal-box" role="dialog" aria-modal="true" aria-label="통합검색">
          <div class="st-shell-modal-head">
            <div class="st-shell-modal-title">통합검색</div>
            <button class="st-shell-icon" type="button" data-close="1" aria-label="닫기">✕</button>
          </div>
          <div class="st-shell-modal-body">
            <input class="st-shell-input" id="_88stSearchInput" placeholder="검색어 입력 (예: 마진, 인증, SPEED, 카지노)" />
            <div class="st-shell-chips" id="_88stSearchChips"></div>
            <div class="st-shell-results" id="_88stSearchResults"></div>
            <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
              <a class="st-shell-chip" href="https://www.google.com/search?q=%ED%8C%94%ED%8C%94%EC%BB%A4%EB%AE%A4%EB%8B%88%ED%8B%B0" target="_blank" rel="noopener">구글에서 팔팔커뮤니티 검색</a>
            </div>
          </div>
          <div class="st-shell-modal-foot">
            <span class="st-shell-kbd">팁: Ctrl/Cmd + K</span>
          </div>
        </div>
      </div>

      <div class="st-shell-modal" id="_88stUserModal" aria-hidden="true">
        <div class="st-shell-modal-backdrop" data-close="1"></div>
        <div class="st-shell-modal-box" role="dialog" aria-modal="true" aria-label="내 메뉴">
          <div class="st-shell-modal-head">
            <div class="st-shell-modal-title">내 메뉴</div>
            <button class="st-shell-icon" type="button" data-close="1" aria-label="닫기">✕</button>
          </div>
          <div class="st-shell-modal-body">
            <div class="st-shell-tabs" role="tablist">
              <button class="st-shell-tab is-on" type="button" data-tab="fav">즐겨찾기</button>
              <button class="st-shell-tab" type="button" data-tab="recent">최근</button>
            </div>
            <div id="_88stUserBody"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalWrap);

    // ===== Behavior =====
    function openDrawer(){
      const el = drawer.querySelector('.st-shell-drawer');
      if(!el) return;
      el.classList.add('open');
      header.querySelector('#_88stShellBurger')?.setAttribute('aria-expanded','true');
      document.body.classList.add('st-no-scroll');
    }
    function closeDrawer(){
      const el = drawer.querySelector('.st-shell-drawer');
      if(!el) return;
      el.classList.remove('open');
      header.querySelector('#_88stShellBurger')?.setAttribute('aria-expanded','false');
      document.body.classList.remove('st-no-scroll');
    }

    function openModal(id){
      const m = document.getElementById(id);
      if(!m) return;
      m.classList.add('open');
      m.setAttribute('aria-hidden','false');
      document.body.classList.add('st-no-scroll');
    }
    function closeModal(el){
      if(!el) return;
      el.classList.remove('open');
      el.setAttribute('aria-hidden','true');
      // If no other open modals/drawer
      const anyOpen = !!document.querySelector('.st-shell-modal.open') || !!drawer.querySelector('.st-shell-drawer.open');
      if(!anyOpen) document.body.classList.remove('st-no-scroll');
    }

    // Dropdown click-to-open (PC) + close on outside click
    (function bindDropdowns(){
      const dds = $$('.st-shell-dd', header);
      const closeAll = (except)=>{
        dds.forEach(dd=>{
          if(except && dd === except) return;
          dd.classList.remove('open');
          const b = dd.querySelector('[aria-haspopup="menu"]');
          if(b) b.setAttribute('aria-expanded','false');
        });
      };
      dds.forEach(dd=>{
        const btn = dd.querySelector('[aria-haspopup="menu"]');
        const menu = dd.querySelector('.st-shell-menu');
        if(!btn || !menu) return;
        btn.addEventListener('click', (e)=>{
          e.preventDefault();
          e.stopPropagation();
          const isOpen = dd.classList.contains('open');
          if(isOpen) closeAll();
          else{
            closeAll(dd);
            dd.classList.add('open');
            btn.setAttribute('aria-expanded','true');
          }
        });
        menu.querySelectorAll('a').forEach(a=> a.addEventListener('click', ()=> closeAll()));
      });
      document.addEventListener('click', (e)=>{
        const t = e.target;
        if(!(t instanceof HTMLElement)) return;
        if(!header.contains(t)) closeAll();
      });
      document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeAll(); });
    })();

    // Drawer events
    header.querySelector('#_88stShellBurger')?.addEventListener('click', (e)=>{
      e.preventDefault();
      const open = drawer.querySelector('.st-shell-drawer')?.classList.contains('open');
      if(open) closeDrawer();
      else openDrawer();
    });
    drawer.querySelectorAll('[data-close="1"]').forEach(el=> el.addEventListener('click', closeDrawer));
    drawer.querySelector('#_88stDrawerSearch')?.addEventListener('click', ()=>{ closeDrawer(); openSearch(); });
    drawer.querySelector('#_88stDrawerUser')?.addEventListener('click', ()=>{ closeDrawer(); openUser(); });

    // Search modal
    const searchModal = document.getElementById('_88stSearchModal');
    const searchOpenBtn = document.getElementById('_88stSearchOpen');
    const searchInput = document.getElementById('_88stSearchInput');
    const searchChips = document.getElementById('_88stSearchChips');
    const searchResults = document.getElementById('_88stSearchResults');

    function renderSearch(q){
      if(!searchResults) return;
      const query = (q||'').trim().toLowerCase();
      const items = SEARCH_ITEMS.filter(it=>{
        if(!query) return true;
        const hay = (it.title + ' ' + (it.tag||'') + ' ' + (it.group||'')).toLowerCase();
        return hay.includes(query);
      });
      const grouped = new Map();
      items.forEach(it=>{
        const g = it.group || '기타';
        if(!grouped.has(g)) grouped.set(g, []);
        grouped.get(g).push(it);
      });

      let html = '';
      for(const [g, list] of grouped.entries()){
        html += `<div class="st-shell-sec"><div class="st-shell-sec-title">${g}</div><div class="st-shell-list">`;
        for(const it of list){
          html += `<div class="st-shell-row"><a class="st-shell-rowlink" href="${it.href}"><span class="st-shell-tag">${it.tag||''}</span>${it.title}</a><span class="st-shell-ext">→</span></div>`;
        }
        html += `</div></div>`;
      }
      if(!html) html = `<div class="st-shell-empty">검색 결과가 없습니다.</div>`;
      searchResults.innerHTML = html;
    }

    function openSearch(){
      openModal('_88stSearchModal');
      setTimeout(()=>{ try{ searchInput?.focus(); }catch(e){} }, 0);
      renderSearch(searchInput?.value||'');
    }

    // Chips
    if(searchChips){
      searchChips.innerHTML = RECOMMENDED.map(k=> `<button class="st-shell-chip" type="button" data-k="${k}">${k}</button>`).join('');
      searchChips.querySelectorAll('button[data-k]').forEach(b=>{
        b.addEventListener('click', ()=>{
          const k = b.getAttribute('data-k')||'';
          if(searchInput) searchInput.value = k;
          renderSearch(k);
          searchInput?.focus();
        });
      });
    }

    searchOpenBtn?.addEventListener('click', openSearch);
    searchInput?.addEventListener('input', ()=> renderSearch(searchInput.value));
    searchInput?.addEventListener('keydown', (e)=>{
      if(e.key==='Enter'){
        const first = searchResults?.querySelector('a[href]');
        if(first){
          e.preventDefault();
          (first).click();
          closeModal(searchModal);
        }
      }
      if(e.key==='Escape') closeModal(searchModal);
    });

    // User modal
    const userModal = document.getElementById('_88stUserModal');
    const userOpenBtn = document.getElementById('_88stUserOpen');
    const userBody = document.getElementById('_88stUserBody');

    function renderUser(tab){
      if(!userBody) return;
      const active = tab || (userModal?.getAttribute('data-tab') || 'fav');
      userModal?.setAttribute('data-tab', active);

      const favV = lsRead(KEY_FAV_VENDORS, []);
      const favT = lsRead(KEY_FAV_TOOLS, []);
      const recV = lsRead(KEY_REC_VENDORS, []);
      const recC = getRecentCalcs();

      const sec = (title, rows)=>{
        if(!rows || !rows.length) return `<div class="st-shell-sec"><div class="st-shell-sec-title">${title}</div><div class="st-shell-empty">비어있음</div></div>`;
        return `<div class="st-shell-sec"><div class="st-shell-sec-title">${title}</div><div class="st-shell-list">${rows.join('')}</div></div>`;
      };

      const rowLink = (title, href, meta, delKey, delId)=>{
        const m = meta ? `<span class="st-shell-kbd">${meta}</span>` : '';
        const del = (delKey && delId) ? `<button class="st-shell-x" type="button" data-del="${delKey}" data-id="${delId}">✕</button>` : '';
        return `<div class="st-shell-row"><a class="st-shell-rowlink" href="${href}">${title}</a><div style="display:flex; gap:10px; align-items:center;">${m}${del}</div></div>`;
      };

      const favVendorRows = (Array.isArray(favV)?favV:[]).slice(0,30).map(x=>{
        const href = `/?v=${encodeURIComponent(x.id)}#vendors-verified`;
        return rowLink(x.title||x.id, href, '', 'fv', x.id);
      });

      const favToolRows = (Array.isArray(favT)?favT:[]).slice(0,30).map(x=>{
        return rowLink(x.title||x.href, x.href||'/', x.tag||'', 'ft', x.href||'');
      });

      const recVendorRows = (Array.isArray(recV)?recV:[]).slice(0,20).map(x=>{
        const href = x.href || `/?v=${encodeURIComponent(x.id)}`;
        return rowLink(x.title||x.id, href, fmtTime(x.ts), 'rv', x.id);
      });

      const recCalcRows = (Array.isArray(recC)?recC:[]).slice(0,20).map(x=>{
        const tool = x.tool || x.page || x.type || '계산';
        const href = x.href || x.url || (tool.includes('ev') ? '/tool-ev/' : tool.includes('odds') ? '/tool-odds/' : '/tool-margin/');
        const t = x.ts || x.time || x.date;
        const meta = t ? fmtTime(t) : '';
        const title = x.title || `${tool}`;
        return rowLink(title, href, meta, '', '');
      });

      if(active === 'recent'){
        userBody.innerHTML = sec('최근 본 업체', recVendorRows) + sec('최근 저장된 계산', recCalcRows);
      }else{
        userBody.innerHTML = sec('업체', favVendorRows) + sec('도구', favToolRows);
      }

      // delete handlers
      userBody.querySelectorAll('button[data-del]').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
          const del = btn.getAttribute('data-del');
          const id = btn.getAttribute('data-id');
          if(!del || !id) return;
          if(del==='fv'){
            let list = lsRead(KEY_FAV_VENDORS, []);
            if(Array.isArray(list)){
              list = list.filter(x=> x && x.id !== id);
              lsWrite(KEY_FAV_VENDORS, list);
            }
          }
          if(del==='ft'){
            let list = lsRead(KEY_FAV_TOOLS, []);
            if(Array.isArray(list)){
              list = list.filter(x=> (x && x.href) !== id);
              lsWrite(KEY_FAV_TOOLS, list);
            }
          }
          if(del==='rv'){
            let list = lsRead(KEY_REC_VENDORS, []);
            if(Array.isArray(list)){
              list = list.filter(x=> x && x.id !== id);
              lsWrite(KEY_REC_VENDORS, list);
            }
          }
          renderUser(active);
        });
      });
    }

    function setTab(tab){
      const tabs = userModal?.querySelectorAll('.st-shell-tab');
      tabs?.forEach(t=> t.classList.toggle('is-on', t.getAttribute('data-tab')===tab));
      renderUser(tab);
    }

    function openUser(){
      openModal('_88stUserModal');
      setTab(userModal?.getAttribute('data-tab')||'fav');
    }

    userOpenBtn?.addEventListener('click', openUser);
    userModal?.querySelectorAll('.st-shell-tab').forEach(btn=>{
      btn.addEventListener('click', ()=> setTab(btn.getAttribute('data-tab')||'fav'));
    });

    // Close on backdrop/close button
    document.querySelectorAll('#_88stShellModals [data-close="1"]').forEach(el=>{
      el.addEventListener('click', (e)=>{
        const m = el.closest('.st-shell-modal');
        closeModal(m);
      });
    });

    // Global shortcuts
    document.addEventListener('keydown', (e)=>{
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if(mod && (e.key==='k' || e.key==='K')){
        e.preventDefault();
        openSearch();
      }
      if(e.key==='Escape'){
        // close modals first
        const openM = document.querySelector('.st-shell-modal.open');
        if(openM){
          closeModal(openM);
          return;
        }
        const openD = drawer.querySelector('.st-shell-drawer.open');
        if(openD) closeDrawer();
      }
    });

    // Utility for other pages
    window.__88stRefreshUserMenu = ()=>{
      if(userModal && userModal.classList.contains('open')){
        renderUser(userModal.getAttribute('data-tab')||'fav');
      }
    };
  }

  function addDrawerStyles(){
    if(document.getElementById('_88stShellDrawerStyle')) return;
    const s = document.createElement('style');
    s.id = '_88stShellDrawerStyle';
    s.textContent = `
      .st-shell-btn#_88stShellBurger{ display:none; }
      @media (max-width: 860px){ .st-shell-btn#_88stShellBurger{ display:inline-flex; } }
      .st-shell-drawer{ position:fixed; inset:0; z-index:3500; display:none; }
      .st-shell-drawer.open{ display:block; }
      .st-shell-drawer-backdrop{ position:absolute; inset:0; background:rgba(0,0,0,.68); }
      .st-shell-drawer-panel{ position:absolute; right:10px; top:10px; width:min(92vw, 360px); max-height:calc(100vh - 20px); overflow:auto; border-radius:22px; border:1px solid var(--panel-border-2); background:color-mix(in srgb, var(--panel) 92%, rgba(0,0,0,.18)); backdrop-filter: blur(16px); box-shadow:var(--shadow-lg); padding:12px; }
      .st-shell-drawer-head{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; }
      .st-shell-drawer-body{ display:flex; flex-direction:column; gap:8px; }
      .st-shell-drawer-foot{ margin-top:12px; display:flex; gap:8px; }
      .st-shell-acc{ border:1px solid var(--panel-border); border-radius:18px; overflow:hidden; background:color-mix(in srgb, var(--panel-2) 92%, transparent); }
      .st-shell-acc > summary{ list-style:none; cursor:pointer; }
      .st-shell-acc > summary::-webkit-details-marker{ display:none; }
      .st-shell-acc-body{ padding:10px; display:flex; flex-direction:column; gap:8px; }
      .st-shell-acc .st-shell-link{ width:100%; justify-content:space-between; }
    `;
    document.head.appendChild(s);
  }

  function boot(){
    ensureCss(SHELL_CSS);
    ensureCss(UNIFY_CSS);
    ensureCss(LUX2_CSS);
    ensureCss(TOOL_HIS_CSS);
    addDrawerStyles();
    inject();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
