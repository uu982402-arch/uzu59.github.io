/* 88ST Global Shell — inject unified header/footer */
(function(){
  "use strict";

  const $$ = (sel, root=document)=> Array.from(root.querySelectorAll(sel));

  function inject(){
    if(document.getElementById("_88stShellHeader")) return;
    document.body.classList.add("st-shell-on");

    // Find insert point: after notice bar if present, else at top of body
    const notice = document.querySelector(".notice-bar");
    const insertAfter = notice || null;

    const header = document.createElement("header");
    header.className = "st-shell-header";
    header.id = "_88stShellHeader";

    const here = location.pathname || "/";
    const isActive = (p)=> (here === p || here.startsWith(p));

    header.innerHTML = `
      <div class="st-shell-inner">
        <a class="st-shell-brand" href="/" aria-label="88ST 홈">
          <div class="st-shell-logo" aria-hidden="true"><img src="/img/logo.png" alt=""/></div>
          <div>
            <div class="st-shell-title">88ST.CLOUD</div>
            <div class="st-shell-sub">분석기 · 계산기 · 가이드 (통합)</div>
          </div>
        </a>

        <nav class="st-shell-nav" aria-label="주요 메뉴">
          <a class="st-shell-link" href="/" data-act="nav" data-path="/"${isActive("/") ? "" : ""}>홈</a>
          <a class="st-shell-link" href="/analysis/" data-act="nav" data-path="/analysis/">분석기</a>
          <div class="st-shell-dd">
            <div class="st-shell-link" role="button" tabindex="0" aria-label="계산기 메뉴">계산기</div>
            <div class="st-shell-menu" role="menu" aria-label="계산기 목록">
              <a href="/tool-margin/" role="menuitem"><span>마진 계산기</span><span class="hint">오버라운드</span></a>
              <a href="/tool-ev/" role="menuitem"><span>EV 계산기</span><span class="hint">기대값</span></a>
              <a href="/tool-odds/" role="menuitem"><span>배당↔확률</span><span class="hint">변환</span></a>
              <a href="/tool/kelly/" role="menuitem"><span>Kelly 비중</span><span class="hint">리스크</span></a>
              <a href="/tool/overround/" role="menuitem"><span>마진(미러)</span><span class="hint">레거시</span></a>
            </div>
          </div>
          <div class="st-shell-dd">
            <div class="st-shell-link" role="button" tabindex="0" aria-label="가이드 메뉴">가이드</div>
            <div class="st-shell-menu" role="menu" aria-label="가이드 목록">
              <a href="/bonus-checklist/" role="menuitem"><span>입플 체크</span><span class="hint">필수</span></a>
              <a href="/casino/" role="menuitem"><span>카지노</span><span class="hint">기초</span></a>
              <a href="/slot/" role="menuitem"><span>슬롯</span><span class="hint">기초</span></a>
              <a href="/minigame/" role="menuitem"><span>미니게임</span><span class="hint">기초</span></a>
              <a href="/ipl/" role="menuitem"><span>IPL</span><span class="hint">기초</span></a>
            </div>
          </div>
        </nav>

        <div class="st-shell-actions">
          <button class="st-shell-btn ghost" type="button" id="_88stGlobalHistoryBtn">최근 저장</button>
          <a class="st-shell-btn" href="https://t.me/UZU59" target="_blank" rel="noopener">문의</a>
          <button class="st-shell-btn ghost" type="button" id="_88stShellBurger" aria-label="메뉴" aria-expanded="false">☰</button>
        </div>
      </div>
    `;

    // Insert header
    if(insertAfter && insertAfter.parentNode){
      insertAfter.parentNode.insertBefore(header, insertAfter.nextSibling);
    }else{
      document.body.insertBefore(header, document.body.firstChild);
    }

    // Mobile drawer
    const drawer = document.createElement("div");
    drawer.id = "_88stShellDrawer";
    drawer.innerHTML = `
      <div class="st-shell-drawer" aria-hidden="true">
        <div class="st-shell-drawer-backdrop" data-close="1"></div>
        <div class="st-shell-drawer-panel" role="dialog" aria-modal="true" aria-label="모바일 메뉴">
          <div class="st-shell-drawer-head">
            <div class="st-shell-title">메뉴</div>
            <button class="st-shell-btn ghost" type="button" data-close="1" aria-label="닫기">✕</button>
          </div>
          <div class="st-shell-drawer-body">
            <a class="st-shell-link" href="/analysis/">분석기</a>
            <div class="st-shell-divider"></div>
            <a class="st-shell-link" href="/tool-margin/">마진 계산기</a>
            <a class="st-shell-link" href="/tool-ev/">EV 계산기</a>
            <a class="st-shell-link" href="/tool-odds/">배당↔확률</a>
            <a class="st-shell-link" href="/tool/kelly/">Kelly 비중</a>
            <div class="st-shell-divider"></div>
            <a class="st-shell-link" href="/bonus-checklist/">입플 체크리스트</a>
            <a class="st-shell-link" href="/casino/">카지노</a>
            <a class="st-shell-link" href="/slot/">슬롯</a>
            <a class="st-shell-link" href="/minigame/">미니게임</a>
            <a class="st-shell-link" href="/ipl/">IPL</a>
          </div>
          <div class="st-shell-drawer-foot">
            <button class="st-shell-btn ghost" type="button" id="_88stGlobalHistoryBtn2">최근 저장</button>
            <a class="st-shell-btn" href="https://t.me/UZU59" target="_blank" rel="noopener">문의</a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(drawer);

    const burger = document.getElementById("_88stShellBurger");
    const wrap = drawer.querySelector(".st-shell-drawer");
    const openDrawer = ()=>{
      if(!wrap) return;
      wrap.classList.add("open");
      wrap.setAttribute("aria-hidden","false");
      burger && burger.setAttribute("aria-expanded","true");
    };
    const closeDrawer = ()=>{
      if(!wrap) return;
      wrap.classList.remove("open");
      wrap.setAttribute("aria-hidden","true");
      burger && burger.setAttribute("aria-expanded","false");
    };

    if(burger) burger.addEventListener("click", openDrawer);
    drawer.addEventListener("click", (e)=>{
      const t = e.target;
      if(!(t instanceof HTMLElement)) return;
      if(t.dataset.close === "1") closeDrawer();
    });
    document.addEventListener("keydown", (e)=>{
      if(e.key === "Escape") closeDrawer();
    });

    // Mirror history button
    const btn2 = document.getElementById("_88stGlobalHistoryBtn2");
    if(btn2){
      btn2.addEventListener("click", ()=>{
        closeDrawer();
        const btn = document.getElementById("_88stGlobalHistoryBtn");
        if(btn) btn.click();
      });
    }

    // Footer
    if(!document.getElementById("_88stShellFooter")){
      const foot = document.createElement("footer");
      foot.id = "_88stShellFooter";
      foot.className = "st-shell-footer";
      foot.innerHTML = `
        <div class="st-shell-footer-inner">
          <div>
            <h4>88ST.CLOUD</h4>
            <p>배당 분석/계산 도구는 <b>판단 보조용</b>입니다. 결과를 보장하지 않습니다.</p>
            <p style="margin-top:6px;">공식 문의: <b>@UZU59</b></p>
          </div>
          <div>
            <h4>빠른 링크</h4>
            <div class="st-shell-foot-links">
              <a href="/analysis/">분석기</a>
              <a href="/tool-margin/">마진</a>
              <a href="/tool-ev/">EV</a>
              <a href="/tool-odds/">배당↔확률</a>
              <a href="/bonus-checklist/">입플 체크</a>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(foot);
    }
  }

  function addDrawerStyles(){
    // Minimal drawer styles appended once (keep CSS file light)
    if(document.getElementById("_88stShellDrawerStyle")) return;
    const s = document.createElement("style");
    s.id = "_88stShellDrawerStyle";
    s.textContent = `
      .st-shell-btn#_88stShellBurger{ display:none; }
      @media (max-width: 860px){ .st-shell-btn#_88stShellBurger{ display:inline-flex; } }
      .st-shell-drawer{ position:fixed; inset:0; z-index:3500; display:none; }
      .st-shell-drawer.open{ display:block; }
      .st-shell-drawer-backdrop{ position:absolute; inset:0; background:rgba(0,0,0,.68); }
      .st-shell-drawer-panel{
        position:absolute; right:10px; top:10px;
        width:min(92vw, 360px);
        max-height:calc(100vh - 20px);
        overflow:auto;
        border-radius:22px;
        border:1px solid var(--panel-border-2);
        background:color-mix(in srgb, var(--panel) 92%, rgba(0,0,0,.18));
        backdrop-filter: blur(16px);
        box-shadow:var(--shadow-lg);
        padding:12px;
      }
      .st-shell-drawer-head{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; }
      .st-shell-drawer-body{ display:flex; flex-direction:column; gap:8px; }
      .st-shell-drawer-foot{ margin-top:12px; display:flex; gap:8px; }
      .st-shell-divider{ height:1px; background:var(--panel-border); margin:6px 0; }
    `;
    document.head.appendChild(s);
  }

  function boot(){
    addDrawerStyles();
    inject();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
