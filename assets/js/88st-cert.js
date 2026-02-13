/* 88ST CERT (v14) — unified vendor landing */
(() => {
  'use strict';

  const BUILD = 'VIP4_20260214_15';

  const CARD_DATA = {
  card1:{ title:"어느날", code:"ST95", link:"http://oday-147.com", telegram:"UZU59",
    benefit:"고액전용 전용 무제제 삼치기OK / 입금플러스5+2 10+3 20+4 외 첫충 10%",
    notice:"가입코드 미입력 시 혜택 적용 불가" },
  card2:{ title:"OK Bet", code:"88ST", link:"https://ok-8888.com/?code=88ST", telegram:"UZU59",
    benefit:"신규가입 77만원 쿠폰지급, 코인 입/출금 가능, 롤 세트별 베팅, 벤픽 후 마감, BJ, 스타리그 업데이트",
    notice:"가입코드 미입력 시 혜택 적용 불가" },
  card3:{ title:"SPEED Bet", code:"88ST", link:"/speed/", telegram:"UZU59",
    benefit:"신규가입 77만원 쿠폰지급, 코인 입/출금 가능, 롤 세트별 베팅, 벤픽 후 마감, BJ, 스타리그 업데이트",
    notice:"가입코드 미입력 시 혜택 적용 불가" },
  card4:{ title:"VEGAS", code:"6789", link:"https://las403.com", telegram:"UZU59",
    benefit:"스포츠·고액전용 입플 최대 30% 페이백 / 카지노 입플",
    notice:"가입코드 미입력 시 혜택 적용 불가" },
  card5:{ title:"LULA BET", code:"ZZ99", link:"https://lula.ws", telegram:"PSC991",
    benefit:"원화·USDT 무기명가입 / 페이백 10%",
    notice:"가입코드 미입력 시 혜택 적용 불가" },
  card6:{ title:"CHOY BET", code:"TAN", link:"https://cy-40.com", telegram:"DY0302",
    benefit:"신규 30% / 매충 10% / 페이백 10 / 입플 %",
    notice:"가입코드 미입력 시 혜택 적용 불가" },

  card7:{ title:"CAPS", code:"RUST", link:"https://caps-22.com/", telegram:"UZU59",
    benefit:"미겜 첫충 5% / 페이백 5% / 출석 30만원",
    notice:"가입코드 미입력 시 혜택 적용 불가" },

  card8:{ title:"BETZY", code:"BANGU", link:"https://b88-et.com", telegram:"UZU59",
    benefit:"스포츠 첫충 10% / 미겜 첫충 5% / 페이백 5% / 출석 30만원",
    notice:"가입코드 미입력 시 혜택 적용 불가" },

  card9:{ title:"RIO", code:"opop", link:"https://rio2.casino/?b=OPOP", telegram:"Aven47",
    benefit:"고액전용 카지노 입플/페이백 중심 · 고액 유저 기준 혜택 안내",
    notice:"가입코드 미입력 시 혜택 적용이 어려울 수 있습니다." },
  card10:{ title:"RED HULK", code:"HERO", link:"https://rhk-777.com", telegram:"SDTR8",
    benefit:"입금플러스 신규 30% / 매충 10% / 페이백5% 콤프(1%/3%)%",
    notice:"가입코드 미입력 시 혜택 적용 불가" },
   card11:{ title:"TOP GUN", code:"GAS7", link:"https://topgun-88.com", telegram:"SDTR8",
    benefit:"입금플러스 신규 30% / 매충 10% / 페이백5% 콤프(1%/3%)%",
    notice:"가입코드 미입력 시 혜택 적용 불가" },
};

  // 보증(상단) 카드 순서: 1 → 2 → 3
  const GUARANTEE_ORDER = ["card1","card2","card3"];
  const GUARANTEE_SET = new Set(GUARANTEE_ORDER);

  const CLICK_KEY_PREFIX = "88_card_click_";
  let currentFilter = "all";      // all | guarantee | verified | rec | new
  let currentSort   = "default";  // default | pop
  let isCleanText   = false;

  function norm(s){ return String(s||"").toLowerCase().replace(/\s+/g,""); }
  function getClickCount(id){ return Number(localStorage.getItem(CLICK_KEY_PREFIX + id) || 0); }
  function incCardClick(id){ try{ localStorage.setItem(CLICK_KEY_PREFIX + id, String(getClickCount(id) + 1)); }catch(e){} }

  function cleanBenefit(s){
    const t = String(s||"")
      .replace(/[•]/g,"·")
      .replace(/\s*\/\s*/g," / ")
      .replace(/\s+/g," ")
      .trim();
    return t;
  }

  // 이미지 소스(기존 구조 호환)
  function cardSourcesById(id){
    const n = String(id).replace("card","");
    const GIF_OVERRIDES = {
      card2: ["img/img2.gif", "img/imj2.gif"],
      card3: ["img/img3.gif"],
    };
    const g = GIF_OVERRIDES[id];
    const gif  = Array.isArray(g) ? (g[0] || "") : (g || "");
    const gif2 = Array.isArray(g) ? (g[1] || "") : "";
    return {
      gif,
      gif2,
      webp: `img/img${n}.webp`,
      jpg:  `img/img${n}.jpg`,
    };
  }

  function appendUtmSafe(url){
    try{
      if(typeof window.appendUtm === 'function') return window.appendUtm(url);
    }catch(e){}
    return url;
  }

  function trackSafe(name, props){
    try{ if(typeof window.track === 'function') window.track(name, props || {}); }catch(e){}
  }

  function setFilter(v){
    currentFilter = v;
    const sel = document.getElementById('filterSelect');
    if(sel) sel.value = v;
    renderGrid();
  }

  function setSort(v){
    currentSort = v;
    const sel = document.getElementById('sortSelect');
    if(sel) sel.value = v;
    renderGrid();
  }

  function renderGrid(){
    const grid = document.getElementById('vendorGrid');
    if(!grid) return;

    const q = norm(document.getElementById('searchInput')?.value || "");

    const ids = Object.keys(CARD_DATA);
    // 보정
    ids.forEach(id=>{
      const d = CARD_DATA[id] || {};
      if(!d.priority) d.priority = 'normal';
      if(!d.tag) d.tag = '';
    });

    const isGuarantee = (id)=> GUARANTEE_SET.has(id);

    const shuffle = (arr)=> arr.slice().sort(()=> Math.random()-0.5);
    const orderByPriority = (arr)=>{
      const high = arr.filter(id=> (CARD_DATA[id].priority||'normal')==='high');
      const normal = arr.filter(id=> (CARD_DATA[id].priority||'normal')==='normal');
      const ad = arr.filter(id=> (CARD_DATA[id].priority||'normal')==='ad');
      return [...shuffle(high), ...shuffle(normal), ...ad];
    };

    const guaranteeAll = [
      ...GUARANTEE_ORDER.filter(id=> ids.includes(id)),
      ...ids.filter(id=> isGuarantee(id) && !GUARANTEE_ORDER.includes(id))
    ];
    const verifiedAll = ids.filter(id=> !isGuarantee(id));

    let listG = guaranteeAll;
    let listV = orderByPriority(verifiedAll);

    const match = (id)=>{
      const d = CARD_DATA[id] || {};
      if(currentFilter==='guarantee' && !isGuarantee(id)) return false;
      if(currentFilter==='verified' &&  isGuarantee(id)) return false;
      if(currentFilter==='rec' && d.tag!=='rec') return false;
      if(currentFilter==='new' && d.tag!=='new') return false;

      if(q){
        const hay = norm((d.title||'') + (d.code||'') + (d.benefit||'') + (d.notice||''));
        if(!hay.includes(q)) return false;
      }
      return true;
    };

    listG = listG.filter(match);
    listV = listV.filter(match);

    if(currentSort==='pop'){
      listG.sort((a,b)=> getClickCount(b)-getClickCount(a));
      listV.sort((a,b)=> getClickCount(b)-getClickCount(a));
    }

    const cardHTML = (id)=>{
      const d = CARD_DATA[id] || {};
      const src = cardSourcesById(id);
      const firstSrc = src.gif || src.webp || src.jpg || '';
      const isFeatured = GUARANTEE_SET.has(id); // 1~3 순서 카드에만 은은한 강조

      return `
        <div class="card card--imageOnly ${isFeatured ? 'featured' : ''}" data-card="${id}" role="button" tabindex="0"
             aria-label="${(d.title||'카드').replace(/"/g,'&quot;')} 열기">
          <div class="img-box">
            <img class="cardThumb"
                 src="${firstSrc}"
                 data-gif="${src.gif}"
                 data-gif2="${src.gif2||''}"
                 data-webp="${src.webp}"
                 data-jpg="${src.jpg}"
                 loading="lazy" decoding="async"
                 alt="${(d.title||'').replace(/"/g,'&quot;')}">
            <div class="img-title" aria-hidden="true">${d.title || ''}</div>
          </div>
        </div>
      `;
    };

    grid.innerHTML = [...listG, ...listV].map(cardHTML).join('');

    bindCardClicks();
    bindGifFallback();

    const empty = document.getElementById('emptyHint');
    if(empty) empty.style.display = (grid.querySelectorAll('.card[data-card]').length ? 'none' : 'block');
  }

  function bindCardClicks(){
    const grid = document.getElementById('vendorGrid');
    if(!grid) return;
    grid.querySelectorAll('.card[data-card]').forEach(el=>{
      const open = ()=> openCard(el.getAttribute('data-card'));
      el.onclick = open;
      el.onkeydown = (e)=>{
        if(e.key==='Enter' || e.key===' '){ e.preventDefault(); open(); }
      };
    });
  }

  function bindGifFallback(){
    const imgs = document.querySelectorAll('img.cardThumb');
    imgs.forEach(img=>{
      img.addEventListener('error', ()=>{
        const gif = img.dataset.gif;
        const gif2 = img.dataset.gif2;
        const webp = img.dataset.webp;
        const jpg = img.dataset.jpg;
        const cur = img.getAttribute('src') || '';
        if(cur === gif && gif2){ img.src = gif2; return; }
        if((cur === gif || cur === gif2) && webp){ img.src = webp; return; }
        if(cur === webp && jpg){ img.src = jpg; return; }
      }, {once:false});
    });
  }

  // ===== Popup =====
  let currentCode = '';
  let currentCardId = '';
  let lastFocusEl = null;

  function openCard(id){
    const d = CARD_DATA[id];
    if(!d) return;

    currentCardId = id;
    incCardClick(id);
    trackSafe('card_open', { card_id: id, title: d.title || '' });

    currentCode = (d.code || '');

    const setText = (sel, val)=>{ const el = document.getElementById(sel); if(el) el.innerText = val; };

    setText('pTitle', d.title || '');
    setText('pCode', d.code || '');

    const benefit = document.getElementById('pBenefit');
    const notice = document.getElementById('pNotice');

    if(benefit){
      const txt = d.benefit ? cleanBenefit(d.benefit) : '';
      benefit.style.display = txt ? 'block' : 'none';
      benefit.innerText = txt ? ('혜택 : ' + txt) : '';
    }
    if(notice){
      const txt = d.notice ? cleanBenefit(d.notice) : '';
      notice.style.display = txt ? 'block' : 'none';
      notice.innerText = txt ? ('주의 : ' + txt) : '';
    }

    const go = document.getElementById('pLink');
    if(go) go.href = d.link ? appendUtmSafe(d.link) : '#';

    const tg = document.getElementById('pTelegram');
    if(tg){
      tg.href = 'https://t.me/UZU59';
      tg.innerText = '문의 (텔레그램)';
    }

    // 최근/즐겨찾기
    try{
      if(window.__88stAddRecentVendor) window.__88stAddRecentVendor({ id, title: (d.title||id), href: '/cert/?v=' + encodeURIComponent(id) });
      if(window.__88stRefreshUserMenu) window.__88stRefreshUserMenu();
    }catch(e){}

    const favBtn = document.getElementById('favBtn');
    if(favBtn && window.__88stIsFavVendor){
      const on = window.__88stIsFavVendor(id);
      favBtn.textContent = on ? '★ 즐겨찾기' : '☆ 즐겨찾기';
      favBtn.classList.toggle('is-on', !!on);
    }

    lastFocusEl = document.activeElement;
    const popup = document.getElementById('cardPopup');
    if(popup){
      popup.classList.add('open');
      popup.setAttribute('aria-hidden','false');
    }

    const focusTarget = document.getElementById('closeBtn');
    if(focusTarget) focusTarget.focus();
  }

  function closeCard(){
    const popup = document.getElementById('cardPopup');
    if(popup){
      popup.classList.remove('open');
      popup.setAttribute('aria-hidden','true');
    }
    if(lastFocusEl && lastFocusEl.focus) lastFocusEl.focus();
  }

  function copyCode(){
    if(!currentCode) return;
    const ok = ()=>{
      trackSafe('copy_code', { card_id: currentCardId, code: currentCode });
      const t = document.getElementById('copyToast');
      if(t){ t.classList.add('on'); setTimeout(()=>t.classList.remove('on'), 900); }
      else alert('가입코드가 복사되었습니다');
    };

    navigator.clipboard.writeText(currentCode).then(ok).catch(()=>{
      try{
        const ta = document.createElement('textarea');
        ta.value = currentCode;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        ok();
      }catch(e){}
    });
  }

  (function bindPopupControls(){
    const popup = document.getElementById('cardPopup');
    const closeBtn = document.getElementById('closeBtn');
    const copyBtn = document.getElementById('copyBtn');
    const favBtn = document.getElementById('favBtn');
    const goBtn = document.getElementById('pLink');
    const tgBtn = document.getElementById('pTelegram');

    if(closeBtn) closeBtn.addEventListener('click', closeCard);
    if(copyBtn) copyBtn.addEventListener('click', copyCode);

    if(favBtn) favBtn.addEventListener('click', ()=>{
      try{
        const id = currentCardId;
        const title = (CARD_DATA[id]?.title)||id;
        const on = window.__88stToggleFavVendor ? window.__88stToggleFavVendor({id, title}) : false;
        favBtn.textContent = on ? '★ 즐겨찾기' : '☆ 즐겨찾기';
        favBtn.classList.toggle('is-on', !!on);
        if(window.__88stRefreshUserMenu) window.__88stRefreshUserMenu();
        trackSafe('fav_vendor_toggle', { card_id: id, state: on ? 'on' : 'off' });
      }catch(e){}
    });

    if(goBtn) goBtn.addEventListener('click', ()=> trackSafe('outbound_click', { type:'external', card_id: currentCardId, url: goBtn.href }));
    if(tgBtn) tgBtn.addEventListener('click', ()=> trackSafe('outbound_click', { type:'telegram', card_id: currentCardId, url: tgBtn.href }));

    if(popup) popup.addEventListener('click', (e)=>{ if(e.target === popup) closeCard(); });

    document.addEventListener('keydown', (e)=>{
      if(!popup || !popup.classList.contains('open')) return;
      if(e.key === 'Escape') closeCard();
    });
  })();

  function openFromUrl(){
    try{
      const u = new URL(window.location.href);
      const v = u.searchParams.get('v');
      if(v && CARD_DATA[v]) openCard(v);
    }catch(e){}
  }

  function bindControls(){
    const filterSel = document.getElementById('filterSelect');
    const sortSel = document.getElementById('sortSelect');
    const cleanTgl = document.getElementById('toggleClean');
    const input = document.getElementById('searchInput');

    if(filterSel) filterSel.addEventListener('change', ()=>{ currentFilter = filterSel.value; renderGrid(); });
    if(sortSel) sortSel.addEventListener('change', ()=>{ currentSort = sortSel.value; renderGrid(); });
    if(cleanTgl) cleanTgl.addEventListener('change', ()=>{ isCleanText = !!cleanTgl.checked; renderGrid(); });
    if(input) input.addEventListener('input', ()=> renderGrid());
  }

  // init
  function init(){
    try{ if(typeof window.saveUtmFromUrl === 'function') window.saveUtmFromUrl(); }catch(e){}
    bindControls();
    renderGrid();
    openFromUrl();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
