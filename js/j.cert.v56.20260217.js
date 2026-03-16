/* 88ST /cert/ v56 patch (2026-02-17)
 * - Remove: 추천/신규 tag-based filters (and dropdown options)
 * - Remove: card badges (TOP/추천/신규)
 * - Keep: tiny screens 2-column layout (CSS)
 * - Keep: popup raw/clean toggle + share link copy
 */
(() => {
  'use strict';

  let CARDS = {
        card1: { title: 'VEGAS', code: '6789', link: 'https://las403.com', telegram: 'UZU59', landing: '/cert/vegas/', hero: '/img/landing/vegas-landing.webp',
      benefit: '스포츠·고액전용 입플 최대 30% 페이백 / 카지노 입플',
      notice: '가입코드 미입력 시 혜택 적용 불가' },
    card3: { title: '777 Bet', code: '6767', link: 'https://82clf.com/?code=6767', telegram: 'UZU59', landing: '/cert/777/', hero: '/img/landing/777-landing.webp',
      benefit: '가입코드 6767 전용 혜택 / 스포츠·카지노 이용 가능',
      notice: '가입코드 미입력 시 혜택 적용 불가' },
  };

  const CERT_CFG_URL = '/assets/config/cert.landing.json';
  let __certCfg = null;
  let __certTelegram = 'https://t.me/UZU59';

  const applyCertCfg = (cfg) => {
    try {
      if (!cfg || cfg.enabled === false) return;
      if (cfg.telegram) __certTelegram = String(cfg.telegram);
      const vendors = cfg.vendors || {};
      Object.keys(vendors).forEach((k) => {
        const v = vendors[k] || {};
        const id = v.id;
        if (!id) return;
        if (!CARDS[id]) CARDS[id] = {};
        CARDS[id] = {
          ...CARDS[id],
          title: v.title ?? CARDS[id].title,
          code: (v.code ?? CARDS[id].code ?? '') + '',
          link: v.join_url ?? CARDS[id].link,
          landing: v.landing_path ?? CARDS[id].landing,
          hero: v.hero_image ?? CARDS[id].hero,
          thumb: v.thumb_image ?? CARDS[id].thumb,
          benefit: v.benefit ?? CARDS[id].benefit,
          notice: v.notice ?? CARDS[id].notice,
          telegram_url: v.telegram_url ?? __certTelegram,
        };
      });
      try { window.__CERT_TELEGRAM = __certTelegram; } catch {}
    } catch { /* ignore */ }
  };

  const loadCertCfg = async () => {
    try {
      const ac = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      const t = ac ? setTimeout(() => { try { ac.abort(); } catch {} }, 2200) : null;
      const res = await fetch(CERT_CFG_URL, { cache: 'no-store', signal: ac ? ac.signal : undefined });
      if (t) clearTimeout(t);
      if (!res || !res.ok) return;
      const cfg = await res.json();
      __certCfg = cfg;
      applyCertCfg(cfg);
    } catch { /* ignore */ }
  };

  const TOP_IDS = ['card1','card3'];
  const TOP_SET = new Set(TOP_IDS);

  const CLICK_PREFIX = '88_card_click_';

  let filter = 'all';
  let sort = 'default';
  let cleanToggle = false;
  let searchDebounce = null;

  let currentCardId = '';
  let currentCode = '';
  let lastActive = null;

  // Safety: prevent duplicate / re-entrant opens (Safari + slow devices)
  let opening = false;
  let lastOpenAt = 0;

  const $ = (id) => document.getElementById(id);

  const norm = (v) => String(v || '').toLowerCase().replace(/\s+/g, '');

  const getClickCount = (id) => {
    try { return Number(localStorage.getItem(CLICK_PREFIX + id) || 0); } catch { return 0; }
  };

  const incClickCount = (id) => {
    try { localStorage.setItem(CLICK_PREFIX + id, String(getClickCount(id) + 1)); } catch { /* ignore */ }
  };

  const cleanText = (v) => String(v || '')
    .replace(/[•]/g, '·')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim();

  const rawText = (v) => String(v || '').trim();

  const trackSafe = (event, params) => {
    try { if (typeof window.track === 'function') window.track(event, params || {}); } catch { /* ignore */ }
  };

  const showToast = (msg) => {
    const el = $('copyToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove('on'), 950);
  };

  

  // v88: checklist removed (direct outbound)
  const setLinkEnabled = (_on=true) => {
    const linkEl = $('pLink');
    if (!linkEl) return;
    const okEl = $('pCheckOk');
    linkEl.classList.remove('is-disabled');
    linkEl.setAttribute('aria-disabled', 'false');
    linkEl.removeAttribute('tabindex');
    if (okEl) okEl.style.display = 'none';
  };

  const resetChecklist = () => {
    // v88: checklist removed
    try { setLinkEnabled(true); } catch { /* ignore */ }
  };

  const syncChecklist = () => {
    // v88: checklist removed
    try { setLinkEnabled(true); } catch { /* ignore */ }
  };
const certThumbSvgDataUri = (rawId) => {
    const n = Number(String(rawId).replace('card', '')) || 0;
    const hue = (n * 37) % 360;
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 80% 45%)"/>
      <stop offset="1" stop-color="hsl(${(hue+40)%360} 80% 30%)"/>
    </linearGradient>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <g filter="url(#s)">
    <rect x="90" y="90" width="1020" height="450" rx="28" fill="rgba(0,0,0,0.28)"/>
    <text x="140" y="210" font-family="Pretendard, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="46" fill="#fff" opacity="0.95">88ST 인증사이트</text>
    <text x="140" y="278" font-family="Pretendard, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="28" fill="#fff" opacity="0.90">이미지 경로 오류 방지용 썸네일</text>
    <text x="140" y="430" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="34" fill="#fff" opacity="0.95">ID #${n}</text>
  </g>
</svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  };

const cardSourcesById = (id) => {
    // 인증업체 카드 썸네일 경로:
    // - config의 thumb_image가 있으면 그걸 우선 사용
    // - 없으면 card1/img1.webp, card3/img2.webp 기본값 사용
    const fallback = {
      card1: '/img/img1.jpg',
      card3: '/img/img2.jpg',
    };
    const c = (CARDS && CARDS[id]) ? CARDS[id] : {};
    const base = (c && c.thumb) ? String(c.thumb) : (fallback[id] || '/img/logo.png');
    const webp = base;
    // iOS/저사양 브라우저에서 webp 디코딩/로딩 문제가 있을 수 있어 jpg를 1차 대체로 제공
    const jpg = (String(base).endsWith('.webp')) ? String(base).replace(/\.webp$/i, '.jpg') : String(base);
    // 만약 jpg도 실패하면 최종적으로 SVG 썸네일(data URI)로 폴백
    return { gif: '', gif2: '', webp, jpg: jpg || certThumbSvgDataUri(id) };
  };

  const appendUtmSafe = (url) => {
    try { if (typeof window.appendUtm === 'function') return window.appendUtm(url); } catch { /* ignore */ }
    return url;
  };

  const shareLinkFor = (id) => {
    const c = CARDS[id] || {};
    const destPath = c.landing || '/cert/';
    try {
      const src = new URL(window.location.href);
      // Build a clean share url while preserving only utm/ref params (if present)
      const keep = new URLSearchParams();
      const sp = new URLSearchParams(src.search);
      for (const [k,v] of sp.entries()) {
        if (k.startsWith('utm_') || k === 'ref') keep.set(k, v);
      }
      src.pathname = destPath;
      src.search = keep.toString() ? `?${keep.toString()}` : '';
      src.hash = '';
      return src.toString();
    } catch {
      return destPath;
    }
  };

  const matchCard = (id, q) => {
    const c = CARDS[id] || {};

    if (filter === 'guarantee' && !TOP_SET.has(id)) return false;
    if (filter === 'verified' && TOP_SET.has(id)) return false;

    if (q) {
      const hay = norm((c.title || '') + (c.code || '') + (c.benefit || '') + (c.notice || ''));
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  const bindGifFallback = () => {
    document.querySelectorAll('img.cardThumb').forEach((img) => {
      img.addEventListener('error', () => {
        const gif = img.dataset.gif;
        const gif2 = img.dataset.gif2;
        const webp = img.dataset.webp;
        const jpg = img.dataset.jpg;
        const cur = img.getAttribute('src') || '';
        if (cur === gif && gif2) { img.src = gif2; return; }
        if ((cur === gif || cur === gif2) && webp) { img.src = webp; return; }
        if (cur === webp && jpg) { img.src = jpg; return; }
      }, { once: false });
    });
  };

  const bindCardClicks = () => {
    const grid = $('vendorGrid');
    if (!grid) return;

    // Delegated handler (more robust across re-renders + mobile Safari)
    if (!grid.__bound) {
      grid.__bound = true;

      const pick = (ev) => {
        const t = ev.target;
        const el = t && t.closest ? t.closest('.card[data-card]') : null;
        if (!el) return null;
        return el.getAttribute('data-card');
      };

      grid.addEventListener('click', (ev) => {
        const id = pick(ev);
        if (!id) return;
        ev.preventDefault();
        ev.stopPropagation();
        openCard(id);
      }, true);

      grid.addEventListener('pointerup', (ev) => {
        const id = pick(ev);
        if (!id) return;
        ev.preventDefault();
        ev.stopPropagation();
        openCard(id);
      }, true);

      grid.addEventListener('keydown', (ev) => {
        const t = ev.target;
        const el = t && t.closest ? t.closest('.card[data-card]') : null;
        if (!el) return;
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          openCard(el.getAttribute('data-card'));
        }
      });
    }
  };

  const renderGrid = () => {
    const grid = $('vendorGrid');
    if (!grid) return;

    const q = norm($('searchInput')?.value || '');
    const ids = Object.keys(CARDS);

    const topOrder = TOP_IDS.filter((id) => ids.includes(id));
    const rest = ids.filter((id) => !TOP_SET.has(id));

    // Stable-ish shuffle for variety (but keep TOP fixed)
    const shuffled = rest.slice().sort(() => Math.random() - 0.5);

    let list = [...topOrder, ...shuffled];
    list = list.filter((id) => matchCard(id, q));

    if (sort === 'pop') {
      list.sort((a, b) => getClickCount(b) - getClickCount(a));
      // Keep TOP still on top within same sort? (optional)
      const tops = list.filter((x) => TOP_SET.has(x));
      const others = list.filter((x) => !TOP_SET.has(x));
      list = [...tops, ...others];
    }

    grid.innerHTML = list.map((id) => {
      const c = CARDS[id] || {};
      const src = cardSourcesById(id);
      const firstSrc = src.gif || src.webp || src.jpg || '';
      return `
        <div class="card card--imageOnly ${TOP_SET.has(id) ? 'featured' : ''}" data-card="${id}" role="button" tabindex="0"
             aria-label="${String(c.title || '카드').replace(/"/g, '&quot;')} 열기">
          <div class="img-box">
                        <img class="cardThumb"
                 src="${firstSrc}"
                 data-gif="${src.gif || ''}"
                 data-gif2="${src.gif2 || ''}"
                 data-webp="${src.webp}"
                 data-jpg="${src.jpg}"
                 loading="lazy" decoding="async"
                 alt="${String(c.title || '').replace(/"/g, '&quot;')}">
            <div class="img-title" aria-hidden="true">${c.title || ''}</div>
          </div>
        </div>
      `;
    }).join('');

    bindCardClicks();
    bindGifFallback();

    const empty = $('emptyHint');
    if (empty) empty.style.display = list.length ? 'none' : 'block';
  };

  const setPopupText = () => {
    const c = CARDS[currentCardId] || {};
    const benefitEl = $('pBenefit');
    const noticeEl = $('pNotice');

    const benefit = cleanToggle ? cleanText(c.benefit) : rawText(c.benefit);
    const notice = cleanToggle ? cleanText(c.notice) : rawText(c.notice);

    if (benefitEl) {
      benefitEl.style.display = benefit ? 'block' : 'none';
      benefitEl.innerText = benefit ? `혜택 : ${benefit}` : '';
    }
    if (noticeEl) {
      noticeEl.style.display = notice ? 'block' : 'none';
      noticeEl.innerText = notice ? `주의 : ${notice}` : '';
    }
  };

  const openCard = (id) => {
    const c = CARDS[id];
    if (!c) return;

    const now = Date.now();
    if (opening) return;
    // Ignore rapid double-fire (some browsers dispatch multiple clicks)
    if (now - lastOpenAt < 450 && currentCardId === id) return;
    opening = true;
    lastOpenAt = now;

    // Defer heavy DOM work to next frame to avoid main-thread stalls
    requestAnimationFrame(() => {
      try {

    currentCardId = id;
    currentCode = c.code || '';

    incClickCount(id);

    const vendorGroup = TOP_SET.has(id) ? 'guarantee' : 'verified';

    let pos;
    try {
      pos = Array.from(document.querySelectorAll('#vendorGrid .card[data-card]'))
        .findIndex((el) => el.getAttribute('data-card') === id) + 1;
      if (pos <= 0) pos = undefined;
    } catch { /* ignore */ }

    trackSafe('card_open', {
      vendor_id: id,
      vendor_name: c.title || '',
      vendor_group: vendorGroup,
      vendor_pos: pos,
      filter,
      sort,
    });

    const setText = (eid, v) => { const el = $(eid); if (el) el.innerText = v; };
    setText('pTitle', c.title || '');
    setText('pCode', c.code || '');

    setPopupText();

    // 1-sec pre-landing (hero image + dedicated landing URL)
    const landingPath = c.landing || shareLinkFor(id);
    const landingUrl = (() => {
      try {
        const u = new URL(window.location.href);
        u.pathname = landingPath;
        // keep only utm/ref params
        const keep = new URLSearchParams();
        const sp = new URLSearchParams(u.search);
        for (const [k,v] of sp.entries()) { if (k.startsWith('utm_') || k === 'ref') keep.set(k, v); }
        u.search = keep.toString() ? `?${keep.toString()}` : '';
        u.hash = '';
        return u.toString();
      } catch { return landingPath; }
    })();

    const heroLink = $('pLandingHeroLink');
    const heroImg = $('pHero');
    const landingBtn = $('pLanding');

    if (heroLink) heroLink.href = landingUrl;
    if (landingBtn) landingBtn.href = landingUrl;

    if (heroImg && c.hero) {
      heroImg.src = c.hero;
      try { heroImg.style.display = 'block'; } catch { /* ignore */ }
      try { if (heroLink) heroLink.style.display = 'block'; } catch { /* ignore */ }
    } else {
      try { if (heroImg) heroImg.src = ''; } catch { /* ignore */ }
      try { if (heroLink) heroLink.style.display = 'none'; } catch { /* ignore */ }
    }

    const linkEl = $('pLink');
    if (linkEl) linkEl.href = c.link ? appendUtmSafe(c.link) : '#';

    // checklist is per-open (must confirm before outbound)
    try { resetChecklist(); } catch { /* ignore */ }

    const tgEl = $('pTelegram');
    if (tgEl) {
      const tg = (c.telegram_url || __certTelegram || window.__CERT_TELEGRAM || 'https://t.me/UZU59');
      tgEl.href = tg;
      tgEl.innerText = '문의 (텔레그램)';
    }

    // Recent + fav
    try {
      if (window.__88stAddRecentVendor) window.__88stAddRecentVendor({ id, title: c.title || id, href: (c.landing || `/cert/?v=${encodeURIComponent(id)}`) });
      if (window.__88stRefreshUserMenu) window.__88stRefreshUserMenu();
    } catch { /* ignore */ }

    const favBtn = $('favBtn');
    if (favBtn && window.__88stIsFavVendor) {
      const on = window.__88stIsFavVendor(id);
      favBtn.textContent = on ? '★ 즐겨찾기' : '☆ 즐겨찾기';
      favBtn.classList.toggle('is-on', !!on);
    }

    lastActive = document.activeElement;

    const popup = $('cardPopup');
    if (popup) {
      try {
      popup.style.setProperty('display','flex','important');
      popup.style.setProperty('position','fixed','important');
      popup.style.setProperty('inset','0','important');
      popup.style.setProperty('z-index','99999','important');
      popup.style.setProperty('pointer-events','auto','important');
    } catch (e) {
      popup.style.display = 'flex';
      popup.style.position = 'fixed';
      popup.style.inset = '0';
      popup.style.zIndex = '99999';
      popup.style.pointerEvents = 'auto';
    }
      popup.classList.add('open');
      popup.setAttribute('aria-hidden', 'false');
      try {
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
      } catch { /* ignore */ }
    }

    const closeBtn = $('closeBtn');
    if (closeBtn) {
      try { closeBtn.focus({ preventScroll: true }); } catch { try { closeBtn.focus(); } catch { /* ignore */ } }
    }
      } finally {
        opening = false;
      }
    });

  };

  const closeCard = () => {
    const popup = $('cardPopup');
    if (popup) {
      popup.classList.remove('open');
      popup.setAttribute('aria-hidden', 'true');
      try {
      popup.style.setProperty('display','none','important');
      popup.style.setProperty('pointer-events','none','important');
    } catch (e) {
      try { popup.style.display = 'none'; popup.style.pointerEvents = 'none'; } catch (e2) { /* ignore */ }
    }
    }

    try {
      document.documentElement.classList.remove('modal-open');
      document.body.classList.remove('modal-open');
    } catch { /* ignore */ }

    if (lastActive && typeof lastActive.focus === 'function') {
      try { lastActive.focus(); } catch { /* ignore */ }
    }
  };

  const copyText = async (text, toastMsg) => {
    if (!text) return;
    const ok = () => {
      showToast(toastMsg);
    };
    try {
      await navigator.clipboard.writeText(text);
      ok();
      return;
    } catch { /* fallback */ }

    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      ok();
    } catch { /* ignore */ }
  };

  const copyCode = async () => {
    if (!currentCode) return;
    try {
      trackSafe('copy_code', {
        vendor_id: currentCardId,
        vendor_name: (CARDS[currentCardId] || {}).title || '',
        code_present: !!currentCode,
      });
    } catch { /* ignore */ }

    await copyText(currentCode, '가입코드가 복사되었습니다');
  };

  const copyShareLink = async () => {
    const url = shareLinkFor(currentCardId);
    try {
      trackSafe('copy_vendor_link', {
        vendor_id: currentCardId,
        vendor_name: (CARDS[currentCardId] || {}).title || '',
      });
    } catch { /* ignore */ }

    await copyText(url, '링크가 복사되었습니다');
  };

  const init = async () => {
    try { if (typeof window.saveUtmFromUrl === 'function') window.saveUtmFromUrl(); } catch { /* ignore */ }
    await loadCertCfg();

    // Controls
    const filterSel = $('filterSelect');
    const sortSel = $('sortSelect');
    const toggle = $('toggleClean');
    const search = $('searchInput');

    if (filterSel) filterSel.addEventListener('change', () => { filter = filterSel.value; renderGrid(); });
    if (sortSel) sortSel.addEventListener('change', () => { sort = sortSel.value; renderGrid(); });

    if (toggle) {
      toggle.addEventListener('change', () => {
        cleanToggle = !!toggle.checked;
        renderGrid();
        const popup = $('cardPopup');
        if (popup && popup.classList.contains('open')) setPopupText();
      });
    }

    if (search) {
      search.addEventListener('input', () => {
        renderGrid();
        try {
          clearTimeout(searchDebounce);
          searchDebounce = setTimeout(() => {
            trackSafe('cert_search', {
              q_len: String(search.value || '').trim().length,
              filter,
              sort,
            });
          }, 450);
        } catch { /* ignore */ }
      });
    }

    // Popup controls
    const popup = $('cardPopup');
    const closeBtn = $('closeBtn');
    const copyBtn = $('copyBtn');
    const shareBtn = $('shareBtn');
    const favBtn = $('favBtn');
    const linkEl = $('pLink');
    const tgEl = $('pTelegram');

    const checkBox = $('pChecklist');
    const checkAllBtn = $('pCheckAll');

    if (closeBtn) closeBtn.addEventListener('click', closeCard);
    if (copyBtn) copyBtn.addEventListener('click', copyCode);
    if (shareBtn) shareBtn.addEventListener('click', copyShareLink);

    if (favBtn) {
      favBtn.addEventListener('click', () => {
        try {
          const id = currentCardId;
          const title = (CARDS[id] || {}).title || id;
          const on = !!(window.__88stToggleFavVendor && window.__88stToggleFavVendor({ id, title }));
          favBtn.textContent = on ? '★ 즐겨찾기' : '☆ 즐겨찾기';
          favBtn.classList.toggle('is-on', !!on);
          if (window.__88stRefreshUserMenu) window.__88stRefreshUserMenu();
          trackSafe('fav_vendor_toggle', { vendor_id: id, vendor_name: title, state: on ? 'on' : 'off' });
        } catch { /* ignore */ }
      });
    }

    if (linkEl) {
      try { linkEl.setAttribute('data-no-auto-outbound', '1'); linkEl.setAttribute('data-outbound-manual', '1'); } catch { /* ignore */ }
      linkEl.addEventListener('click', () => {
        try {
          trackSafe('outbound_click', {
            outbound_type: 'vendor_site',
            vendor_id: currentCardId,
            vendor_name: (CARDS[currentCardId] || {}).title || '',
            url: linkEl.href,
          });
        } catch { /* ignore */ }
      });
    }

    if (tgEl) {
      try { tgEl.setAttribute('data-no-auto-outbound', '1'); tgEl.setAttribute('data-outbound-manual', '1'); } catch { /* ignore */ }
      tgEl.addEventListener('click', () => {
        try {
          trackSafe('outbound_click', {
            outbound_type: 'telegram',
            vendor_id: currentCardId,
            vendor_name: (CARDS[currentCardId] || {}).title || '',
            url: tgEl.href,
          });
        } catch { /* ignore */ }
      });
    }



    // checklist events
    try {
      if (checkBox) {
        checkBox.addEventListener('change', (ev) => {
          const t = ev.target;
          if (t && t.classList && t.classList.contains('pChk')) syncChecklist();
        });
      }
      if (checkAllBtn && checkBox) {
        checkAllBtn.addEventListener('click', () => {
          checkBox.querySelectorAll('input.pChk[type="checkbox"]').forEach((c) => { c.checked = true; });
          syncChecklist();
        });
      }
    } catch { /* ignore */ }

    // Block outbound until checklist completed
    if (linkEl) {
      linkEl.addEventListener('click', (ev) => {
        if (linkEl.classList.contains('is-disabled') || linkEl.getAttribute('aria-disabled') === 'true') {
          ev.preventDefault();
          ev.stopPropagation();
          showToast('체크리스트를 완료해주세요');
          return false;
        }
      }, true);
    }

    if (popup) popup.addEventListener('click', (ev) => { if (ev.target === popup) closeCard(); });
    document.addEventListener('keydown', (ev) => {
      const p = $('cardPopup');
      if (p && p.classList.contains('open') && ev.key === 'Escape') closeCard();
    });

    renderGrid();

    // Open from URL (?v=cardX)
    try {
      const vid = new URL(window.location.href).searchParams.get('v');
      if (vid && CARDS[vid]) openCard(vid);
    } catch { /* ignore */ }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
