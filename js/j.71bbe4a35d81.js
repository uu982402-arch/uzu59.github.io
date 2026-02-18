/* 88ST Vendor Teasers
 * - Fixed cards always shown
 * - Rotating cards: pick N from pool deterministically (per-page, daily)
 * Usage:
 *   <div id="vendorTeaser" data-vt-fixed="1,2,3,4" data-vt-pool="10,11,8,7" data-vt-pick="2">
 *     ...
 *     <div class="vendor-grid" data-vt-grid="fixed"></div>
 *     <div class="vendor-grid" data-vt-grid="rot"></div>
 *   </div>
 */
(function(){
  'use strict';

  // Minimal card metadata (matches index.html CARD_DATA; keep in sync)
  const CARD = {
    card1:{ title:"어느날", code:"ST95", benefit:"고액전용 · 입플 5+2/10+3/20+4 · 첫충 10%" },
    card2:{ title:"OK Bet", code:"88ST", benefit:"신규 77만원 · 코인 입/출금 · 업데이트" },
    card3:{ title:"SPEED Bet", code:"88ST", benefit:"신규 77만원 · 코인 입/출금 · 업데이트" },
    card4:{ title:"VEGAS", code:"6789", benefit:"고액전용 · 입플 최대 30% · 카지노 입플" },
    card7:{ title:"CAPS", code:"RUST", benefit:"미겜 첫충 5% · 페이백 5% · 출석 30만원" },
    card8:{ title:"BETZY", code:"BANGU", benefit:"스포츠 첫충 10% · 미겜 5% · 페이백 5%" },
    card10:{ title:"RED HULK", code:"HERO", benefit:"신규 30% · 매충 10% · 페이백 5%" },
    card11:{ title:"TOP GUN", code:"GAS7", benefit:"신규 30% · 매충 10% · 페이백 5%" },
  };

  const DEFAULT_FIXED = [1,2,3,4];
  const DEFAULT_POOL  = [10,11,8,7];
  const DEFAULT_PICK  = 2;


  // UTM propagation for dynamically created links (analytics module runs before we render)
  const UTM_STORE_KEY = '88_utm';
  const UTM_KEYS = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'];

  function loadStoredUtm(){
    try{
      const raw = localStorage.getItem(UTM_STORE_KEY);
      if(!raw) return null;
      const obj = JSON.parse(raw);
      if(!obj || !obj.__ts) return null;
      // TTL is handled by analytics; if missing, still safe to use.
      return obj;
    }catch(e){ return null; }
  }

  function appendUtm(urlStr){
    try{
      const obj = loadStoredUtm();
      if(!obj) return urlStr;
      const u = new URL(urlStr, window.location.href);
      if(u.origin !== window.location.origin) return urlStr;
      const sp = new URLSearchParams(u.search);
      // do not override if already has any utm
      for(const k of UTM_KEYS){ if(sp.get(k)) return u.toString(); }
      for(const k of UTM_KEYS){ if(obj[k]) sp.set(k, obj[k]); }
      u.search = sp.toString();
      return u.toString();
    }catch(e){ return urlStr; }
  }

  function parseList(str){
    if(!str) return [];
    return String(str).split(',').map(s=>s.trim()).filter(Boolean).map(n=>parseInt(n,10)).filter(n=>Number.isFinite(n));
  }

  function localDateKey(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  // FNV-1a hash (fast, deterministic)
  function hash32(str){
    let h = 0x811c9dc5;
    for(let i=0;i<str.length;i++){
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function pickFromPool(pool, k, seed){
    const scored = pool.map(id => ({id, s: hash32(seed + '|' + id)}));
    scored.sort((a,b)=>a.s-b.s);
    return scored.slice(0, k).map(x=>x.id);
  }

  function uniq(arr){
    return Array.from(new Set(arr));
  }

  function buildCardEl(id){
    const key = 'card' + id;
    const meta = CARD[key] || { title: `CARD ${id}`, code: '88ST', benefit: '' };
    const a = document.createElement('a');
    a.className = 'vendor-item';
    a.href = appendUtm(`/cert/?v=${key}`);
    a.setAttribute('data-cta', `vendor_teaser_${key}`);
    // Keep UTM propagation for pages that use data-utm attribute
    a.setAttribute('data-utm', '1');

    const top = document.createElement('div');
    top.className = 'v-top';

    const title = document.createElement('div');
    title.className = 'v-title';
    title.textContent = meta.title;

    const badge = document.createElement('div');
    badge.className = 'v-badge';
    badge.textContent = `코드 ${meta.code}`;

    top.appendChild(title);
    top.appendChild(badge);

    const note = document.createElement('div');
    note.className = 'v-note';
    note.textContent = meta.benefit;

    a.appendChild(top);
    a.appendChild(note);

    return a;
  }

  function renderOne(teaserEl){
    const fixed = parseList(teaserEl.getAttribute('data-vt-fixed'));
    const pool  = parseList(teaserEl.getAttribute('data-vt-pool'));
    const pick  = parseInt(teaserEl.getAttribute('data-vt-pick') || DEFAULT_PICK, 10) || DEFAULT_PICK;

    const fixedIds = fixed.length ? fixed : DEFAULT_FIXED;
    const poolIds  = pool.length ? pool : DEFAULT_POOL;

    const path = (location.pathname || '/').replace(/\/+$/,'/') || '/';
    const seed = `${path}|${localDateKey()}`;

    const rot = pickFromPool(poolIds, Math.max(0, Math.min(pick, poolIds.length)), seed);
    const rotIds = uniq(rot).filter(id => !fixedIds.includes(id));

    const fixedGrid = teaserEl.querySelector('[data-vt-grid="fixed"]');
    const rotGrid   = teaserEl.querySelector('[data-vt-grid="rot"]');

    if(fixedGrid){
      fixedGrid.innerHTML = '';
      fixedIds.forEach(id => fixedGrid.appendChild(buildCardEl(id)));
    }
    if(rotGrid){
      rotGrid.innerHTML = '';
      rotIds.forEach(id => rotGrid.appendChild(buildCardEl(id)));
    }

    // Optional: track which rotating cards were shown (GA4)
    try{
      if(typeof window.track === 'function'){
        window.track('vendor_teaser_impression', {
          path,
          fixed: fixedIds.join(','),
          rot: rotIds.join(','),
          mode: 'daily'
        });
      }
    }catch(_){}
  }

  function boot(){
    const el = document.getElementById('vendorTeaser');
    if(!el) return;
    renderOne(el);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }
})();