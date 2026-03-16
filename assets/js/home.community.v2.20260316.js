(() => {
  const grid = document.getElementById('newsGrid');
  const updatedAt = document.getElementById('newsUpdatedAt');
  const refreshBtn = document.getElementById('newsRefreshBtn');
  const chips = Array.from(document.querySelectorAll('.filter-chip'));
  const modal = document.getElementById('promoSiteModal');
  const modalTitle = document.getElementById('promoModalTitle');
  const modalDesc = document.getElementById('promoModalDesc');
  const modalCode = document.getElementById('promoModalCode');
  const modalBenefit = document.getElementById('promoModalBenefit');
  const modalNotice = document.getElementById('promoModalNotice');
  const modalMoveBtn = document.getElementById('promoMoveSiteBtn');
  const modalCopyBtn = document.getElementById('promoCopyCodeBtn');
  const promoCards = Array.from(document.querySelectorAll('.promo-site'));
  if (!grid || !updatedAt) return;

  let items = [];
  let activeFilter = 'all';
  let activePromo = null;

  function trimHeadline(value, limit = 58) {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    return clean.length > limit ? `${clean.slice(0, limit - 1).trim()}…` : clean;
  }

  function trimSummary(value, limit = 110) {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    return clean.length > limit ? `${clean.slice(0, limit - 1).trim()}…` : clean;
  }

  function updateFocusCards(list) {
    const focusList = document.querySelector('.focus-list');
    if (!focusList) return;
    const picks = (Array.isArray(list) ? list : []).slice(0, 3);
    if (!picks.length) return;
    focusList.innerHTML = picks.map((item) => {
      const cat = escapeHtml(item.category || '일반');
      const title = escapeHtml(trimHeadline(item.title || '주요 스포츠 브리핑 업데이트', 46));
      const summary = escapeHtml(trimSummary(item.summary || '원문에서 상세 내용을 확인할 수 있습니다.', 88));
      return `
        <li>
          <b>${cat} · ${title}</b>
          <span>${summary}</span>
        </li>
      `;
    }).join('');

    const tags = document.querySelector('.focus-tags');
    if (tags) {
      const uniqueCats = Array.from(new Set(picks.map((item) => item.category || '일반'))).slice(0, 4);
      if (uniqueCats.length) {
        tags.innerHTML = uniqueCats.map((cat) => `<span>${escapeHtml(cat)}</span>`).join('');
      }
    }
  }

  const fmt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function toast(message) {
    if (!message) return;
    let host = document.getElementById('promoToastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'promoToastHost';
      host.style.position = 'fixed';
      host.style.left = '50%';
      host.style.bottom = '22px';
      host.style.transform = 'translateX(-50%)';
      host.style.zIndex = '180';
      document.body.appendChild(host);
    }
    const item = document.createElement('div');
    item.textContent = message;
    item.style.cssText = 'padding:12px 14px;border-radius:14px;background:rgba(7,17,31,.92);color:#fff;box-shadow:0 18px 42px rgba(0,0,0,.32);margin-top:8px;border:1px solid rgba(255,255,255,.08)';
    host.appendChild(item);
    setTimeout(() => item.remove(), 1800);
  }

  async function copyText(value) {
    if (!value) return false;
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (_) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        textarea.remove();
        return ok;
      } catch (_) {
        return false;
      }
    }
  }

  function openPromoModal(data) {
    if (!modal || !data) return;
    activePromo = data;
    modalTitle.textContent = `${data.title} 파트너 안내`;
    modalDesc.textContent = '이동 전 아래 안내코드와 기본 이용 안내를 먼저 확인해 주세요.';
    modalCode.textContent = data.code || '-';
    modalBenefit.textContent = data.benefit || '세부 안내 문구가 준비 중입니다.';
    modalNotice.textContent = data.notice || `가입 진행 전 코드 : ${data.code || '-'} 를 먼저 확인해 주세요.`;
    modalMoveBtn.href = data.link || '#';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closePromoModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }



  function updateCarouselButtons(track) {
    if (!track || !track.id) return;
    const prev = document.querySelector(`[data-carousel-prev="${track.id}"]`);
    const next = document.querySelector(`[data-carousel-next="${track.id}"]`);
    if (!prev || !next) return;
    const max = Math.max(0, track.scrollWidth - track.clientWidth - 2);
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft >= max;
  }

  function bindGuideCarousels() {
    const tracks = Array.from(document.querySelectorAll('[data-carousel-track]'));
    if (!tracks.length) return;
    tracks.forEach((track) => {
      const step = () => Math.max(260, Math.round(track.clientWidth * 0.72));
      const prev = document.querySelector(`[data-carousel-prev="${track.id}"]`);
      const next = document.querySelector(`[data-carousel-next="${track.id}"]`);
      prev?.addEventListener('click', () => {
        track.scrollBy({ left: -step(), behavior: 'smooth' });
      });
      next?.addEventListener('click', () => {
        track.scrollBy({ left: step(), behavior: 'smooth' });
      });
      track.addEventListener('scroll', () => updateCarouselButtons(track), { passive: true });
      window.addEventListener('resize', () => updateCarouselButtons(track));
      updateCarouselButtons(track);
    });
  }

  function bindPromoCards() {
    promoCards.forEach((card) => {
      const data = {
        title: card.dataset.adTitle || '사이트',
        code: card.dataset.adCode || '',
        link: card.dataset.adLink || '#',
        benefit: card.dataset.adBenefit || '',
        notice: card.dataset.adNotice || ''
      };
      const open = () => openPromoModal(data);
      card.addEventListener('click', (event) => {
        if (event.target.closest('a')) return;
        event.preventDefault();
        open();
      });
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      });
      const btn = card.querySelector('.promo-open-btn');
      btn?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        open();
      });
    });

    modal?.addEventListener('click', (event) => {
      if (event.target.closest('[data-close="1"]')) closePromoModal();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal?.classList.contains('is-open')) closePromoModal();
    });

    modalCopyBtn?.addEventListener('click', async () => {
      if (!activePromo?.code) return;
      const ok = await copyText(activePromo.code);
      toast(ok ? `안내코드 ${activePromo.code} 복사 완료` : '안내코드 복사 실패');
    });

    modalMoveBtn?.addEventListener('click', async () => {
      if (activePromo?.code) {
        await copyText(activePromo.code);
      }
      closePromoModal();
    });
  }

  function render(list) {
    if (!list.length) {
      grid.innerHTML = '<div class="empty-state">노출 가능한 브리핑이 없습니다. 카테고리를 바꾸거나 잠시 후 다시 불러와 주세요.</div>';
      return;
    }

    grid.innerHTML = list.map((item) => {
      const source = item.source || 'ESPN';
      const category = item.category || '일반';
      const title = trimHeadline(item.title || '주요 스포츠 브리핑', 58);
      const summary = trimSummary(item.summary || '원문에서 자세한 내용을 확인할 수 있습니다.', 110);
      const published = item.publishedAt ? fmt.format(new Date(item.publishedAt)) : '방금 업데이트';
      return `
        <article class="news-card" data-category="${escapeHtml(category)}">
          <div class="news-meta">
            <span class="news-badge">${escapeHtml(category)}</span>
            <span>${escapeHtml(source)}</span>
          </div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(summary)}</p>
          <div class="news-meta">
            <span>${escapeHtml(published)} 기준</span>
            <a class="text-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">기사 보기</a>
          </div>
        </article>
      `;
    }).join('');
  }

  function applyFilter(filter) {
    activeFilter = filter;
    chips.forEach((chip) => chip.classList.toggle('is-active', chip.dataset.filter === filter));
    const list = filter === 'all' ? items : items.filter((item) => (item.category || '일반') === filter);
    render(list);
  }

  async function load(force = false) {
    refreshBtn?.setAttribute('disabled', 'disabled');
    updatedAt.textContent = '브리핑 불러오는 중…';
    try {
      const res = await fetch(`/api/news?limit=8${force ? '&refresh=1' : ''}`, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      items = Array.isArray(data.items) ? data.items : [];
      updateFocusCards(items);
      applyFilter(activeFilter);
      const stamp = data.generatedAt ? fmt.format(new Date(data.generatedAt)) : fmt.format(new Date());
      const sourceLine = Array.isArray(data.sources) && data.sources.length ? ` · ${data.sources.join(' + ')}` : '';
      updatedAt.textContent = `최신 브리핑 ${stamp}${sourceLine}`;
    } catch (err) {
      items = [
        { category: '축구', source: '88ST Briefing', title: '축구 핵심 변수 우선 점검', summary: '라인업 변화, 부상·결장, 원정 일정 간격을 먼저 정리하면 실시간 브리핑이 지연돼도 기본 흐름을 읽을 수 있습니다.', link: '/analysis/' },
        { category: '농구', source: '88ST Briefing', title: '농구 일정 밀도와 출전 변수 확인', summary: '백투백 일정, 핵심 자원 출전 여부, 최근 페이스를 함께 보면 경기 전 구조를 훨씬 선명하게 잡을 수 있습니다.', link: '/analysis/' },
        { category: '야구', source: '88ST Briefing', title: '선발·불펜 흐름 체크', summary: '야구는 선발 매치업과 불펜 소모, 타선 흐름을 같이 확인해야 당일 리듬을 안정적으로 볼 수 있습니다.', link: '/analysis/' },
        { category: '일반', source: '88ST Briefing', title: '스포츠 브리핑 재연결 진행 중', summary: '외부 피드 재연결 중에도 메인 허브에서는 스포츠 중심 카드와 핵심 연결 동선을 유지합니다.', link: '/odds/' }
      ];
      updateFocusCards(items);
      applyFilter(activeFilter);
      updatedAt.textContent = '외부 브리핑 지연으로 예비 스포츠 카드 표시 중';
    } finally {
      refreshBtn?.removeAttribute('disabled');
    }
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => applyFilter(chip.dataset.filter || 'all'));
  });

  refreshBtn?.addEventListener('click', () => load(true));
  bindPromoCards();
  bindGuideCarousels();
  load(false);
})();
