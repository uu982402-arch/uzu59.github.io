/* 88ST /cert/ v56 patch (2026-02-17)
 * - Remove: 추천/신규 tag-based filters (and dropdown options)
 * - Remove: card badges (TOP/추천/신규)
 * - Keep: tiny screens 2-column layout (CSS)
 * - Keep: popup raw/clean toggle + share link copy
 */
(() => {
  'use strict';

  const CARDS = {
    card1: { title: 'VEGAS', code: '6789', link: 'https://las403.com', telegram: 'UZU59',
      benefit: '스포츠·고액전용 입플 최대 30% 페이백 / 카지노 입플',
      notice: '가입코드 미입력 시 혜택 적용 불가' },
card3: { title: '777 Bet', code: '6767', link: 'https://82clf.com/?code=6767', telegram: 'UZU59',
      benefit: '가입코드 6767 전용 혜택 / 스포츠·카지노 이용 가능',
      notice: '가입코드 미입력 시 혜택 적용 불가' },
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

  const cardSourcesById = (id) => {
    const n = String(id).replace('card', '');
    const gifMap = {};
    const arr = gifMap[id];
    const specialMap = {
      card3: { webp: '/img/img2.webp', jpg: '/img/img2.webp' },
    };
    if (specialMap[id]) {
      return { gif: Array.isArray(arr) ? (arr[0] || '') : (arr || ''), gif2: Array.isArray(arr) ? (arr[1] || '') : '', webp: specialMap[id].webp, jpg: specialMap[id].jpg };
    }
    return {
      gif: Array.isArray(arr) ? (arr[0] || '') : (arr || ''),
      gif2: Array.isArray(arr) ? (arr[1] || '') : '',
      webp: `/img/img${n}.webp`,
      jpg: `/img/img${n}.jpg`,
    };
  };

  const appendUtmSafe = (url) => {
    try { if (typeof window.appendUtm === 'function') return window.appendUtm(url); } catch { /* ignore */ }
    return url;
  };

  const shareLinkFor = (id) => {
    try {
      const u = new URL(window.location.href);
      u.pathname = '/cert/';
      u.search = `?v=${encodeURIComponent(id)}`;
      return u.toString();
    } catch {
      return `/cert/?v=${encodeURIComponent(id)}`;
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
    grid.querySelectorAll('.card[data-card]').forEach((el) => {
      const open = () => openCard(el.getAttribute('data-card'));
      el.onclick = open;
      el.onkeydown = (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          open();
        }
      };
    });
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

    const linkEl = $('pLink');
    if (linkEl) linkEl.href = c.link ? appendUtmSafe(c.link) : '#';

    const tgEl = $('pTelegram');
    if (tgEl) {
      tgEl.href = 'https://t.me/UZU59';
      tgEl.innerText = '문의 (텔레그램)';
    }

    // Recent + fav
    try {
      if (window.__88stAddRecentVendor) window.__88stAddRecentVendor({ id, title: c.title || id, href: `/cert/?v=${encodeURIComponent(id)}` });
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
      popup.style.display = 'flex';
      popup.style.position = 'fixed';
      popup.style.inset = '0';
      popup.style.zIndex = '99999';
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
  };

  const closeCard = () => {
    const popup = $('cardPopup');
    if (popup) {
      popup.classList.remove('open');
      popup.setAttribute('aria-hidden', 'true');
      try { popup.style.display = ''; } catch { /* ignore */ }
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

  const init = () => {
    try { if (typeof window.saveUtmFromUrl === 'function') window.saveUtmFromUrl(); } catch { /* ignore */ }

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
