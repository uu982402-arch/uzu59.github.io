
(()=>{
  const textMap = [
    [/회원가입\s*\(?이동\)?\s*→?/g, '바로 이동'],
    [/목록으로/g, '목록 보기'],
    [/분석기\s*열기\s*→?/g, '바로 분석'],
    [/전략\s*분석기\s*열기\s*→?/g, '바로 분석'],
    [/계산기\s*열기\s*→?/g, '바로 열기'],
    [/도구\s*열기/g, '도구 보기'],
    [/지금\s*분석/g, '바로 분석'],
    [/비교\s*시작/g, '바로 비교'],
    [/열기\s*→?/g, '바로 보기'],
    [/시작하기/g, '바로 시작'],
  ];

  const byHrefText = (el) => {
    const href = (el.getAttribute('href') || '').toLowerCase();
    if (!href || href === '#') return null;
    if (href.includes('/analysis/')) return '바로 분석';
    if (href.includes('/cert/')) return el.classList.contains('ghost') ? '목록 보기' : '바로 비교';
    if (href.includes('/tool-') || href.includes('/tool/')) return '바로 열기';
    if (href.includes('/guide/')) return '가이드 보기';
    if (href.includes('t.me')) return '텔레그램 열기';
    return null;
  };

  const cleanText = (t) => {
    let out = (t || '').replace(/\s+/g, ' ').trim();
    textMap.forEach(([re, rep]) => { out = out.replace(re, rep); });
    return out;
  };

  const normalizeEl = (el) => {
    const textNodes = [...el.childNodes].filter(n => n.nodeType === 3);
    let text = el.textContent || '';
    let cleaned = cleanText(text);
    const hrefBased = byHrefText(el);
    if (hrefBased) cleaned = hrefBased;
    if (!cleaned) return;
    // preserve small/badge nodes by replacing only full simple labels
    if (textNodes.length && textNodes.map(n=>n.textContent).join(' ').trim().length >= 0) {
      // remove arrow-only spans
      el.querySelectorAll('span[aria-hidden="true"], .arrow').forEach(s => { if ((s.textContent||'').includes('→')) s.remove(); });
      // if there are nested tags but not form elements, reset text when short CTA-like content
      const isCta = el.matches('a,button,.go,.hub-go,.insight-btn,.lnd-btn,.st-land-btn,.btn,.cta');
      if (isCta || (text.length <= 24 && /열기|이동|시작|보기|가입/.test(text))) {
        el.textContent = cleaned;
      }
    }
    el.classList.add('v21-cta');
  };

  const compressCopy = () => {
    document.querySelectorAll('.tool-card .d, .hub-card .d, .promo-code, .why-lead, .why-sub, .qs-sub, .dash-sub, .heroSub').forEach(el => {
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!t) return;
      let out = t
        .replace('핵심 분석·비교·계산만 빠르게 이동하세요.', '핵심 기능만 빠르게 이동하세요.')
        .replace('분석·비교·계산 핵심만 남겼습니다. 필요한 화면으로 바로 이동하세요.', '핵심 기능만 남겼습니다. 바로 이동하세요.')
        .replace('핵심 혜택만 짧게 확인하고 바로 이동하세요.', '핵심 혜택만 보고 바로 이동하세요.')
        .replace('오버라운드와 공정확률, 공정배당을 빠르게 계산합니다.', '마진·공정확률·공정배당 계산')
        .replace('배당과 확률을 빠르게 변환하고 비교합니다.', '배당↔확률 빠른 변환')
        .replace('EV와 손익분기 확률을 빠르게 계산합니다.', 'EV·손익분기 빠른 확인')
        .replace('Kelly 기준 비중을 빠르게 계산합니다.', 'Kelly 비중 빠른 계산');
      if (out !== t) el.textContent = out;
    });
  };

  const normalizeButtons = () => {
    document.querySelectorAll('a,button,.go,.hub-go,.insight-btn,.lnd-btn,.st-land-btn,.btn,.cta').forEach(normalizeEl);
    document.querySelectorAll('.hub-go,.go').forEach(el=>el.classList.add('v21-cta-chip'));
  };

  const normalizeHeaderText = () => {
    document.querySelectorAll('.hdrMenu a, .hdrMobileMenu a').forEach(a => {
      const txt = (a.textContent || '').trim();
      if (txt === '분석기 홈') a.textContent = '스포츠 분석기';
      if (txt === '가이드 홈') a.textContent = '가이드';
    });
  };

  const cleanDeadLabels = () => {
    document.querySelectorAll('*').forEach(el => {
      if ((el.textContent || '').trim() === '원클릭 액션') el.textContent = '빠른 액션';
    });
  };

  const init = () => {
    normalizeButtons();
    normalizeHeaderText();
    compressCopy();
    cleanDeadLabels();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
