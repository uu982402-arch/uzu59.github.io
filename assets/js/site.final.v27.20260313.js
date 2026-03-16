
(function(){
  function text(el){ return (el.textContent||'').replace(/\s+/g,' ').trim(); }
  function setText(el, map){
    const t=text(el);
    for (const [from,to] of map){ if(t===from){ el.textContent = to; return true; } }
    return false;
  }
  function hideByText(selectors, patterns){
    document.querySelectorAll(selectors).forEach(el=>{
      const t=text(el);
      if(!t) return;
      if(patterns.some(p=>p.test(t))){
        const wrap = el.closest('li,details,.item,.menu-item,.nav-item,.chip,.card,.section') || el;
        wrap.style.display='none';
      }
    });
  }
  function removeSectionByTitle(titlePatterns){
    const nodes=[...document.querySelectorAll('section,div')];
    nodes.forEach(node=>{
      const titleEl=node.querySelector('.title,.h,h1,h2,h3,strong,b');
      if(!titleEl) return;
      const t=text(titleEl);
      if(titlePatterns.some(p=>p.test(t))){
        if(node.id==='homeQuickStart' || node.id==='homeDash') return;
        if(t.includes('핵심 진입')||t.includes('핵심 계산기')) return;
        node.remove();
      }
    });
  }
  function relabel(){
    const pairs=[
      ['분석기 홈','스포츠 분석기'],
      ['가이드 홈','가이드'],
      ['계산기 홈','핵심 계산기'],
      ['분석기 열기','바로 분석'],
      ['계산기 열기','바로 열기'],
      ['비교 시작','바로 비교'],
      ['회원가입(이동)','바로 이동'],
      ['회원가입','바로 이동'],
      ['열기 →','바로 보기'],
      ['열기','바로 보기'],
      ['도구 열기','도구 보기'],
      ['지금 분석','바로 분석']
    ];
    document.querySelectorAll('a,button,summary,.btn,.button,[role="button"]').forEach(el=>setText(el,pairs));
  }
  function cleanupMenus(){
    hideByText('a,button,summary,span,li', [
      /슬롯\s*RTP\s*분석기/,
      /미니게임\s*분석기/,
      /바카라\s*전략\s*계산기/,
      /베팅\s*로그북/,
      /오늘의\s*루틴/,
      /주의\s*패턴/
    ]);
  }
  function compactHome(){
    if(location.pathname !== '/' && !/index\.html$/.test(location.pathname)) return;
    document.body.classList.add('v27-home');
    removeSectionByTitle([/PROMO/i,/WHY/i,/오늘의\s*루틴/,/주의\s*패턴/,/로그북/]);
    const heroDesc = document.querySelector('.hero p, .masthead p, .hero-card p');
    if(heroDesc && text(heroDesc).length>90){ heroDesc.textContent = text(heroDesc).slice(0,90)+'…'; }
  }
  function markAnalysis(){
    if(/\/analysis\/?$/.test(location.pathname)) document.body.classList.add('v27-analysis');
  }
  document.addEventListener('DOMContentLoaded', function(){
    relabel();
    cleanupMenus();
    compactHome();
    markAnalysis();
  });
})();
