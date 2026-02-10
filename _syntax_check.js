


  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', 'G-KWT87FBY6S', { anonymize_ip: true });



/* === SAFE LOADER FAILSAFE (파서/런타임 에러 대비) === */
(function(){
  function hide(){
    var l=document.getElementById("loader");
    if(!l) return;
    l.classList.add("hide");
    setTimeout(function(){ try{ l.remove(); }catch(e){} }, 500);
  }
  // DOM만 준비돼도 닫기
  document.addEventListener("DOMContentLoaded", function(){ setTimeout(hide, 350); });
  // 네트워크가 막혀도 닫기
  setTimeout(hide, 2800);
  // 최종: load
  window.addEventListener("load", hide);
  // 스크립트 에러로 멈추는 케이스 대비
  window.addEventListener("error", function(){ setTimeout(hide, 0); });
})();



/* ===== 카드 데이터 (card9 추가) ===== */
const CARD_DATA = {
  card1:{ title:"어느날", code:"ST95", link:"http://oday-147.com", telegram:"UZU59",
    benefit:"고액전용 전용 무제제 삼치기OK / 입금플러스5+2 10+3 20+4 외 첫충 10%",
    notice:"가입코드 미입력 시 혜택 적용 불가" },
  card2:{ title:"OK Bet", code:"88ST", link:"/ok/", telegram:"UZU59",
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

/* ===== 인사이트 (종목별) ===== */
const INSIGHTS_BY_SPORT = {
  "축구":[
    "배당이 1~2시간 내 급변하면 라인 조정 구간일 수 있습니다.",
    "무승부 배당이 갑자기 내려가면 시장은 '언더/조심'을 보는 경우가 많습니다.",
    "양팀 득점(BTTS) 라인이 흔들리면 선발/부상 뉴스 반영 가능성이 큽니다.",
    "전반 라인이 움직이면 초반 템포(압박/로테이션)를 체크하세요."
  ],
  "농구":[
    "핸디(스프레드)가 크게 움직이면 핵심 선수 결장/로테 반영일 수 있습니다.",
    "OU(언더오버) 하락은 페이스 다운/수비 지표 반영 가능성이 큽니다.",
    "백투백 일정은 4Q 클러치에서 체력 영향이 큽니다.",
    "홈코트 이점이 큰 팀은 초반 라인이 유리하게 잡히는 경우가 많습니다."
  ],
  "야구":[
    "선발 변경은 배당 구조가 통째로 바뀌니 최신 라인을 우선 확인하세요.",
    "불펜 소모가 큰 팀은 후반 이닝 변동성이 큽니다.",
    "바람/구장 특성은 OU에 크게 영향을 줍니다.",
    "승패보다 5이닝(1st5) 라인이 더 깔끔할 때가 있습니다."
  ],
  "배구":[
    "세트 핸디가 흔들리면 주전 로테/컨디션 이슈 가능성이 있습니다.",
    "서브/리시브 지표 차이가 크면 언더독도 세트를 가져갈 수 있습니다.",
    "원정 장거리 이동은 집중력 이슈로 초반 세트에 영향을 줄 수 있습니다.",
    "전력 차가 크면 OU보다 -1.5 세트가 더 안정적일 때가 있습니다."
  ],
  "e스포츠":[
    "맵 풀/밴픽 상성이 라인보다 중요할 때가 많습니다.",
    "로스터 교체 직후는 변동성이 커서 보수적으로 접근하세요.",
    "언더독이 특정 맵에서 강하면 세트/맵 핸디를 확인하세요.",
    "최근 5경기보다 상대전적/메타 적응력을 같이 보세요."
  ],
  "하키":[
    "골리(선발 골텐더) 변경은 승/OU에 큰 영향이 있습니다.",
    "백투백 원정은 수비 붕괴로 고득점 게임이 나올 수 있습니다.",
    "파워플레이 효율 차이는 언더독 변수로 작용합니다.",
    "초반 10분 라인이 흔들리면 경기 템포 이슈 가능성이 큽니다."
  ]
};

/* ===== 유틸: GA 이벤트/UTM 저장/UTM 붙이기 ===== */
const UTM_KEYS = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"];
function track(evt, params) {
  // GA4 event helper
  try {
    if (typeof window.gtag !== "function") return;

    const p = Object.assign({}, (params || {}));

    // DebugView toggle: add ?debug=1 or set localStorage "ga_debug" = "1"
    const sp = new URLSearchParams(location.search);
    const dbg = (sp.get("debug") === "1") || (localStorage.getItem("ga_debug") === "1");
    if (dbg && p.debug_mode === undefined) p.debug_mode = true;

    // Helpful common context (lightweight)
    if (p.page_path === undefined) p.page_path = location.pathname;
    if (p.page_title === undefined && document && document.title) p.page_title = document.title.slice(0, 80);

    // Backward/forward compatible parameter normalization (keep original keys too)
    if (evt === "cta_click") {
      if (p.cta && p.cta_id === undefined) p.cta_id = p.cta;
    }
    if (evt === "outbound_click") {
      if (p.type && p.outbound_type === undefined) p.outbound_type = p.type;
      if (p.destination_domain === undefined && typeof p.url === "string") {
        try { p.destination_domain = (new URL(p.url, location.href)).hostname; } catch(e) {}
      }
    }
    if (evt === "card_open") {
      if (p.title && p.card_title === undefined) p.card_title = p.title;
      if (p.tag && p.card_tag === undefined) p.card_tag = p.tag;
    }
    if (evt === "search") {
      if (p.search_term && p.query === undefined) p.query = p.search_term;
    }

    window.gtag("event", evt, p);
  } catch (e) {}
}
function saveUtmFromUrl() {
  const sp = new URLSearchParams(location.search);
  let has=false;
  const obj={};
  UTM_KEYS.forEach(k=>{
    const v = sp.get(k);
    if(v){ obj[k]=v; has=true; }
  });
  if(has){
    obj.__ts = Date.now();
    localStorage.setItem("88_utm", JSON.stringify(obj));
  }
}
function getUtmQuery() {
  try {
    const raw = localStorage.getItem("88_utm");
    if(!raw) return "";
    const obj = JSON.parse(raw);
    if(!obj || !obj.__ts) return "";
    // 14일 유지
    const TTL = 14*24*60*60*1000;
    if(Date.now() - obj.__ts > TTL) return "";
    const sp = new URLSearchParams();
    UTM_KEYS.forEach(k=>{ if(obj[k]) sp.set(k, obj[k]); });
    const qs = sp.toString();
    return qs ? ("?"+qs) : "";
  } catch(e) { return ""; }
}
function appendUtm(urlStr) {
  try {
    const u = new URL(urlStr, location.href);
    const existing = new URLSearchParams(u.search);
    const stored = new URLSearchParams(getUtmQuery().replace(/^\?/,""));
    UTM_KEYS.forEach(k=>{
      if(!existing.get(k) && stored.get(k)) existing.set(k, stored.get(k));
    });
    u.search = existing.toString();
    return u.toString();
  } catch(e) {
    return urlStr;
  }
}



  // ===== Site Config (EDIT THESE) =====
  // GA4_ID: GA4 Measurement ID (예: G-XXXXXXXXXX)
  // POPULAR_API: 전체 사용자 인기 데이터를 반환하는 API 엔드포인트(예: /api/popular)
  //   - 연동 전에는 비워두면(또는 "disabled") 로컬 집계(내 브라우저 기준)로만 표시됩니다.
  window.SITE_CONFIG = window.SITE_CONFIG || {
    GA4_ID: "G-KWT87FBY6S",
    POPULAR_API: "disabled"
  };

  // ===== GA4 bootstrap (dynamic inject) =====
  (function initGA4(){
    try{
      const id = (window.SITE_CONFIG && window.SITE_CONFIG.GA4_ID) || "";
      if(!id || id === "disabled" || /^G-XXXX/i.test(id) || id === "G-XXXXXXXXXX") return;

      // 이미 gtag 로드되어 있으면 중복 로드 방지
      if(document.querySelector('script[src*="gtag/js?id=' + encodeURIComponent(id) + '"]')) return;
      

      const s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
      document.head.appendChild(s);

      window.dataLayer = window.dataLayer || [];
      function gtag(){ dataLayer.push(arguments); }
      window.gtag = window.gtag || gtag;
      gtag("js", new Date());
      gtag("config", id, { send_page_view: true });
    }catch(e){}
  })();



/* ===== 로딩 화면 닫기(안전장치 포함) ===== */
function hideLoader() {
  const l = document.getElementById("loader");
  if(!l) return;
  l.classList.add("hide");
  setTimeout(()=>{ if(l && l.remove) l.remove(); }, 450);
}
window.addEventListener("load", hideLoader);
setTimeout(hideLoader, 2500);
// DOM 파싱만 완료되어도 바로 닫기(네트워크 지연/차단 대비)
document.addEventListener("DOMContentLoaded", ()=> setTimeout(hideLoader, 250));

/* ===== 날짜 키(로컬) ===== */
function dateKeyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

/* ===== 사칭주의 팝업 (1일 1회) ===== */
(function() {
  const key="scam_popup_date";
  const today=dateKeyLocal();
  const el = document.getElementById("scamPopup");
  if(!el) return;
  if(localStorage.getItem(key)!==today) {
    el.style.display="flex";
  }
})();
function closeScam() {
  const today=dateKeyLocal();
  localStorage.setItem("scam_popup_date", today);
  const el = document.getElementById("scamPopup");
  if(el) el.style.display="none";
  track("scam_popup_close", {"page":"index"});
}

/* ===== 상단 공지 배너 자동 순환 ===== */
const NOTICE_LIST = [
  "🔔 88ST.Cl0ud 공식 안내 · 관리자 사칭 주의 (@UZU59)",
  "📊 스포츠 배당 분석기 툴 무료 제공 중",
  "🧮 배당 마진 계산기로 수수료 체크",
  "⭐ 인증 정보는 아래 카드에서 확인",
  "⚠️ 가입코드 미입력 시 혜택 적용 불가"
];
let noticeIndex = 0;
const noticeTextEl = document.getElementById("noticeText");
function rotateNotice() {
  if(noticeTextEl) noticeTextEl.innerText = NOTICE_LIST[noticeIndex];
  noticeIndex = (noticeIndex + 1) % NOTICE_LIST.length;
}
rotateNotice();
setInterval(rotateNotice, 4000);

/* (UI) 스크롤 시 공지 배너를 더 투명/슬림하게 */
(function noticeFadeOnScroll(){
  const bar = document.querySelector(".notice-bar");
  if(!bar) return;
  let last = null;
  const onScroll = ()=>{
    const sc = window.scrollY > 60;
    if(sc === last) return;
    bar.classList.toggle("is-scrolled", sc);
    last = sc;
  };
  onScroll();
  window.addEventListener("scroll", onScroll, {passive:true});
})();


/* ===== 인사이트 ===== */
function pickInsight(sport) {
  const arr = INSIGHTS_BY_SPORT[sport] || [];
  if(!arr.length) return "배당 흐름을 체크하고 라인 변화를 확인하세요.";
  return arr[Math.floor(Math.random()*arr.length)];
}
function refreshInsight() {
  const sEl = document.getElementById("insightSport");
  const sport = sEl ? sEl.value : "축구";
  const out = document.getElementById("insight");
  if(out) out.innerText = pickInsight(sport);
  localStorage.setItem("insightSport", sport);
}
(function initInsight() {
  const saved = localStorage.getItem("insightSport");
  const sel = document.getElementById("insightSport");
  if(saved && sel) sel.value = saved;
  refreshInsight();
})();


/* ===== (THEME) 로고 기반 자동 포인트 컬러 =====
   - img/logo.png 를 샘플링해 accent를 자동 세팅합니다.
   - 로고만 바꿔도 버튼/배지/그림자 색이 자연스럽게 따라갑니다.
*/
(function autoThemeFromLogo(){
  const img = document.querySelector(".logoImg");
  if(!img) return;

  const clamp = (v,min,max)=> Math.max(min, Math.min(max, v));
  const lighten = (v, ratio)=> Math.round(v + (255 - v) * ratio);

  const apply = ()=>{
    try{
      const w = 64, h = 64;
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently:true });
      if(!ctx) return;

      ctx.clearRect(0,0,w,h);
      // cover 느낌으로 꽉 채움
      const iw = img.naturalWidth || w;
      const ih = img.naturalHeight || h;
      const scale = Math.max(w/iw, h/ih);
      const dw = iw*scale, dh = ih*scale;
      const dx = (w - dw)/2, dy = (h - dh)/2;
      ctx.drawImage(img, dx, dy, dw, dh);

      const data = ctx.getImageData(0,0,w,h).data;
      let r=0,g=0,b=0,n=0;

      for(let i=0;i<data.length;i+=4){
        const a = data[i+3];
        if(a < 40) continue;
        const rr = data[i], gg = data[i+1], bb = data[i+2];

        // (노이즈 제거) 거의 흰색/검정색은 제외(텍스트/배경 영향 축소)
        const maxv = Math.max(rr,gg,bb);
        const minv = Math.min(rr,gg,bb);
        if(maxv < 15) continue;
        if(minv > 245) continue;

        const wgt = a/255;
        r += rr * wgt;
        g += gg * wgt;
        b += bb * wgt;
        n += wgt;
      }
      if(n < 5) return;

      r = Math.round(r/n);
      g = Math.round(g/n);
      b = Math.round(b/n);

      // 너무 탁하면 살짝 보정
      r = clamp(r, 40, 230);
      g = clamp(g, 40, 230);
      b = clamp(b, 60, 245);

      const r2 = lighten(r, 0.35);
      const g2 = lighten(g, 0.35);
      const b2 = lighten(b, 0.35);

      const root = document.documentElement.style;
      root.setProperty("--accentRGB", `${r} ${g} ${b}`);
      root.setProperty("--accent", `rgb(${r} ${g} ${b})`);
      root.setProperty("--accent2", `rgb(${r2} ${g2} ${b2})`);

      // 기존 컬러 변수도 함께 갱신(기능 유지)
      root.setProperty("--gold", `rgb(${r} ${g} ${b})`);
      root.setProperty("--gold2", `rgb(${r2} ${g2} ${b2})`);
    }catch(e){}
  };

  if(img.complete && img.naturalWidth) apply();
  else img.addEventListener("load", apply, { once:true });
})();
/* ===== 업데이트 로그 ===== */
const UPDATE_LOG = [
  { date:"02/06", text:"메인 UI/UX/CTA 버튼색상) 변경" },
  { date:"02/06", text:"SPEED/OK Bet 보증 업체 추가 되었습니다." },
  { date:"02/06", text:"메인 로고 변경 되었습니다." }
];
(function renderLog() {
  const box = document.getElementById("updateLog");
  if(!box) return;
  box.innerHTML = UPDATE_LOG.map(x=>`
    <div class="log-item">
      <div class="log-date">${x.date}</div>
      <div class="log-text">${x.text}</div>
    </div>
  `).join("");
})();


/* ===== 체크리스트 ===== */
const CHECKLIST_POOL = [
  "라인 급변 경기(갑자기 내려간 배당)는 이유부터 확인하기",
  "마진(수수료) 높은 경기면 한 단계 보수적으로 접근하기",
  "1회 배팅금은 자본의 1~3% 범위로 제한하기",
  "선발/결장/로테 뉴스 체크 후 배당 변동 재확인하기",
  "연패/연승 팀은 ‘시장 과열’ 구간인지 먼저 보기",
  "변동성 큰 리그는 단폴/소액으로 테스트하기",
  "무리한 마틴/추격 배팅은 금지(손실 제한선 미리 설정)"
];
function refreshChecklist() {
  const pool = [...CHECKLIST_POOL].sort(()=>Math.random()-0.5);
  const pick = pool.slice(0,3);
  const el = document.getElementById("checklistText");
  if(el) el.innerHTML = "• " + pick.join("<br>• ");
}

/* ===== 세션 플랜(과몰입 방지) ===== */
(function(){
  const KEY = "88_session_plan_v1";
  const bank = document.getElementById("spBank");
  const lossPct = document.getElementById("spLossPct");
  const stakePct = document.getElementById("spStakePct");
  const maxBets = document.getElementById("spMaxBets");
  const out = document.getElementById("spSummary");
  const btnSave = document.getElementById("spSaveBtn");
  const btnClear = document.getElementById("spClearBtn");

  if(!bank || !lossPct || !stakePct || !maxBets || !out || !btnSave || !btnClear) return;

  function fmtWon(n){
    try{ return Math.round(n).toLocaleString("ko-KR"); }
    catch(e){ return String(Math.round(n)); }
  }

  function toast(msg){
    let el = document.getElementById("miniToast88");
    if(!el){
      el = document.createElement("div");
      el.id = "miniToast88";
      el.style.position="fixed";
      el.style.left="50%";
      el.style.bottom="24px";
      el.style.transform="translateX(-50%)";
      el.style.padding="10px 12px";
      el.style.borderRadius="12px";
      el.style.background="rgba(18,18,18,.92)";
      el.style.border="1px solid rgba(255,255,255,.14)";
      el.style.color="#fff";
      el.style.fontWeight="900";
      el.style.fontSize="13px";
      el.style.zIndex="9999";
      el.style.opacity="0";
      el.style.transition="opacity .18s ease, transform .18s ease";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity="1";
    el.style.transform="translateX(-50%) translateY(-2px)";
    clearTimeout(el.__t);
    el.__t = setTimeout(()=>{
      el.style.opacity="0";
      el.style.transform="translateX(-50%) translateY(0px)";
    }, 1200);
  }

  function render(){
    const b = toNum(bank.value);
    const lp = toNum(lossPct.value);
    const sp = toNum(stakePct.value);
    const mb = toNum(maxBets.value);

    if(!Number.isFinite(b) || b<=0){
      out.textContent = "총 자본을 입력하면 자동으로 요약이 표시됩니다.";
      return;
    }
    const _lp = (Number.isFinite(lp) && lp>0) ? lp : 5;
    const _sp = (Number.isFinite(sp) && sp>0) ? sp : 2;
    const _mb = (Number.isFinite(mb) && mb>0) ? mb : 3;

    const lossWon = b * (_lp/100);
    const stakeWon = b * (_sp/100);
    const dayCap = stakeWon * _mb;
    const stopLine = lossWon * 0.8;

    out.innerHTML =
      `손실 한도: <b>${fmtWon(lossWon)}</b>원 (${_lp}%) · ` +
      `중단 트리거(80%): <b>${fmtWon(stopLine)}</b>원<br>` +
      `1회 상한: <b>${fmtWon(stakeWon)}</b>원 (${_sp}%) · ` +
      `최대 경기 수: <b>${_mb}</b> (일일 노출 상한 ≈ ${fmtWon(dayCap)}원)`;
  }

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return;
      const v = JSON.parse(raw);
      if(v && typeof v === "object"){
        if(v.bank!=null) bank.value = v.bank;
        if(v.lossPct!=null) lossPct.value = v.lossPct;
        if(v.stakePct!=null) stakePct.value = v.stakePct;
        if(v.maxBets!=null) maxBets.value = v.maxBets;
      }
    }catch(e){}
    render();
  }

  function save(){
    const v = {
      bank: String(bank.value||"").trim(),
      lossPct: String(lossPct.value||"").trim(),
      stakePct: String(stakePct.value||"").trim(),
      maxBets: String(maxBets.value||"").trim(),
      ts: Date.now()
    };
    try{ localStorage.setItem(KEY, JSON.stringify(v)); }catch(e){}
  }

  function clearAll(){
    bank.value = "";
    lossPct.value = "5";
    stakePct.value = "2";
    maxBets.value = "3";
    try{ localStorage.removeItem(KEY); }catch(e){}
    render();
  }

  [bank, lossPct, stakePct, maxBets].forEach(el => el.addEventListener("input", render));
  btnSave.addEventListener("click", ()=>{ save(); toast("세션 플랜 저장됨"); });
  btnClear.addEventListener("click", ()=>{ clearAll(); toast("초기화 완료"); });

  // defaults
  if(!lossPct.value) lossPct.value = "5";
  if(!stakePct.value) stakePct.value = "2";
  if(!maxBets.value) maxBets.value = "3";

  load();
  render();
})();
/* ===== 마진 계산기 ===== */
let marginMode = "2";
function setMarginMode(mode) {
  marginMode = mode;
  const b2=document.getElementById("mMode2");
  const b3=document.getElementById("mMode3");
  const w2=document.getElementById("margin2");
  const w3=document.getElementById("margin3");
  if(!b2||!b3||!w2||!w3) return;
  if(mode==="2") {
    b2.classList.add("active"); b3.classList.remove("active");
    w2.style.display="block"; w3.style.display="none";
  } else {
    b3.classList.add("active"); b2.classList.remove("active");
    w3.style.display="block"; w2.style.display="none";
  }
}
function toNum(v) {
  const n = Number(String(v).replace(/,/g,"").trim());
  return Number.isFinite(n) ? n : NaN;
}
function calcSimpleMargin() {
  const card = document.getElementById("oddsSummaryCard");
  const mVal = document.getElementById("oddsMarginValue");
  const mSub = document.getElementById("oddsOverroundSub");
  const fairPills = document.getElementById("oddsFairPills");
  const probPills = document.getElementById("oddsProbPills");
  const note = document.getElementById("oddsSummaryNote");

  // legacy (hidden) nodes - keep for backward compatibility
  const out = document.getElementById("simpleMarginResult");
  const hint = document.getElementById("simpleMarginHint");

  const sportEl = document.getElementById("oddsSport");
  const sport = sportEl ? String(sportEl.value || "").trim() : "";
  const modeLabel = (marginMode==="2") ? "2-way" : "3-way";

  const setErr = (msg)=>{
    if(card && mVal){
      mVal.textContent = msg;
      if(mSub) mSub.textContent = "";
      if(fairPills) fairPills.innerHTML = "";
      if(probPills) probPills.innerHTML = "";
      if(note) note.textContent = "";
    }
    if(out) out.textContent = msg;
    if(hint) hint.textContent = "";
  };

  const makePills = (container, items, fmt)=>{
    if(!container) return;
    container.innerHTML = "";
    items.forEach(it=>{
      const s = document.createElement("span");
      s.className = "odds-pill " + (it.cls || "");
      s.innerHTML = `<span class="k">${it.k}</span> <span class="v">${fmt(it.v)}</span>`;
      container.appendChild(s);
    });
  };

  const prefix = sport ? (sport + " · ") : "";

  if(marginMode==="2") {
    const a = toNum(document.getElementById("m2A").value);
    const b = toNum(document.getElementById("m2B").value);
    if([a,b].some(x=>!Number.isFinite(x)||x<=1)) return setErr("배당 2개를 정확히 입력해 주세요. (1.01 이상)");

    const imp = (1/a) + (1/b);
    const over = imp * 100;
    const margin = (imp - 1) * 100;

    const pA = ((1/a) / imp) * 100;
    const pB = ((1/b) / imp) * 100;
    const fairA = 100 / pA;
    const fairB = 100 / pB;

    if(mVal) mVal.textContent = `${margin>=0?"+":""}${margin.toFixed(2)}%`;
    if(mSub) mSub.textContent = `오버라운드 ${over.toFixed(2)}%`;

    makePills(fairPills, [
      {k:"홈", v: fairA, cls:"home"},
      {k:"원정", v: fairB, cls:"away"},
    ], (v)=>Number(v).toFixed(2));

    makePills(probPills, [
      {k:"홈", v: pA, cls:"home"},
      {k:"원정", v: pB, cls:"away"},
    ], (v)=>Number(v).toFixed(1) + "%");

    if(note) note.textContent = `${prefix}${modeLabel} 입력 배당에서 오버라운드를 제거해 공정 배당 · 정규화 확률을 계산합니다.`;

    if(out) out.textContent = `${prefix}마진 : ${margin.toFixed(2)}%`;
    if(hint) hint.innerHTML =
      `정규화 확률: 홈 ${pA.toFixed(1)}% / 원정 ${pB.toFixed(1)}%<br>` +
      `공정 배당(정규화): 홈 ${fairA.toFixed(2)} / 원정 ${fairB.toFixed(2)}<br>` +
      `오버라운드: ${over.toFixed(2)}% (100% 초과분 = 마진)`;

  } else {
    const h = toNum(document.getElementById("m3H").value);
    const d = toNum(document.getElementById("m3D").value);
    const a = toNum(document.getElementById("m3A").value);
    if([h,d,a].some(x=>!Number.isFinite(x)||x<=1)) return setErr("배당 3개를 정확히 입력해 주세요. (1.01 이상)");

    const imp = (1/h) + (1/d) + (1/a);
    const over = imp * 100;
    const margin = (imp - 1) * 100;

    const pH = ((1/h) / imp) * 100;
    const pD = ((1/d) / imp) * 100;
    const pA = ((1/a) / imp) * 100;
    const fairH = 100 / pH;
    const fairD = 100 / pD;
    const fairA = 100 / pA;

    if(mVal) mVal.textContent = `${margin>=0?"+":""}${margin.toFixed(2)}%`;
    if(mSub) mSub.textContent = `오버라운드 ${over.toFixed(2)}%`;

    makePills(fairPills, [
      {k:"홈", v: fairH, cls:"home"},
      {k:"무", v: fairD, cls:"draw"},
      {k:"원정", v: fairA, cls:"away"},
    ], (v)=>Number(v).toFixed(2));

    makePills(probPills, [
      {k:"홈", v: pH, cls:"home"},
      {k:"무", v: pD, cls:"draw"},
      {k:"원정", v: pA, cls:"away"},
    ], (v)=>Number(v).toFixed(1) + "%");

    if(note) note.textContent = `${prefix}${modeLabel} 입력 배당에서 오버라운드를 제거해 공정 배당 · 정규화 확률을 계산합니다.`;

    if(out) out.textContent = `${prefix}마진 : ${margin.toFixed(2)}%`;
    if(hint) hint.innerHTML =
      `정규화 확률: 홈 ${pH.toFixed(1)}% / 무 ${pD.toFixed(1)}% / 원정 ${pA.toFixed(1)}%<br>` +
      `공정 배당(정규화): 홈 ${fairH.toFixed(2)} / 무 ${fairD.toFixed(2)} / 원정 ${fairA.toFixed(2)}<br>` +
      `오버라운드: ${over.toFixed(2)}% (100% 초과분 = 마진)`;
  }
}

/* ===== 카드 메타(필터/정렬용) ===== */
(function enrichCards() {
  const set = (id, patch)=>{ CARD_DATA[id] = Object.assign({tag:"", priority:"normal", recruit:false, reasons:[]}, CARD_DATA[id], patch); };

  set("card1", {tag:"rec", priority:"high", reasons:["고액전용 전용 무제제 삼치기OK", "입금플러스 5+2 10+3 20+4", " 승인 문의 필수!!"]});
  set("card2", {tag:"rec", priority:"high", reasons:["1레벨 카지노 배팅한도:3000만원 ", "신규 가입 혜택", "테더 입.출금 가능"]});
  set("card3", {tag:"rec", priority:"high", reasons:["1레벨 카지노 배팅한도:3000만원", "신규 가입 혜택", "테더 입.출금 가능"]});
  set("card4", {tag:"rec", priority:"normal", reasons:["입플 폭이 넓어 선택지 다양", "혜택 분리 안내", "문의 채널 고정"]});
  set("card5", {tag:"new", priority:"normal", reasons:["원화/USDT 선택 가능", "페이백 비중 높은 편", "고액 유저 기준 확인"]});
  set("card6", {tag:"new", priority:"normal", reasons:["신규/매충/페이백 조합", "유지형 구성", "문의 라인이 명확"]});
  set("card7", {tag:"rec", priority:"normal", reasons:["미겜 혜택 요약", "첫충/페이백/출석 구성", "코드 입력 필수"]});
  set("card8", {tag:"rec", priority:"normal", reasons:["스포츠+미겜 혜택", "첫충/페이백/출석 구성", "코드 입력 필수"]});
  set("card9", {tag:"new", priority:"normal", reasons:["입플/페이백 중심 안내", "고액 유저 기준 혜택", "문의 채널 고정"]});
  set("card10", {tag:"new", priority:"normal", reasons:["입플/페이백 중심 안내", "고액 유저 기준 혜택", "문의 채널 고정"]});
  set("card11", {tag:"new", priority:"normal", reasons:["입플/페이백 중심 안내", "고액 유저 기준 혜택", "문의 채널 고정"]});
})();

/* ===== 카드 렌더/필터/인기순 ===== */

/* ===== 로컬 인사이트(가짜 방문자 대신) ===== */
const STATS_KEY = "88_local_stats_v1";
function dayKeyLocal(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function loadStats(){
  try{
    const raw = localStorage.getItem(STATS_KEY);
    const s = raw ? JSON.parse(raw) : {};
    return ensureToday(s);
  }catch(e){
    return ensureToday({});
  }
}
function saveStats(s){
  try{ localStorage.setItem(STATS_KEY, JSON.stringify(s)); }catch(e){}
}
function ensureToday(s){
  const today = dayKeyLocal();
  if(!s || typeof s !== "object") s = {};
  if(s.day !== today){
    s.day = today;
    s.today = { views:{}, searches:{} };
  }
  if(!s.today) s.today = { views:{}, searches:{} };
  if(!s.today.views) s.today.views = {};
  if(!s.today.searches) s.today.searches = {};
  if(!s.total) s.total = { views:{}, searches:{} };
  if(!s.total.views) s.total.views = {};
  if(!s.total.searches) s.total.searches = {};
  return s;
}
function bumpObjCount(obj, key, inc=1){
  if(!key) return;
  obj[key] = (obj[key]||0) + inc;
}
function normKw(s){
  return String(s||"")
    .replace(/[\u0000-\u001f]/g," ")
    .trim();
}
function tokenize(q){
  const t = normKw(q);
  if(!t) return [];
  // 공백/쉼표/슬래시 기준, 짧은 토큰 제거
  return t.split(/[\s,\/|]+/g)
    .map(x=>x.trim())
    .filter(x=>x.length>=2)
    .slice(0, 12);
}
function bumpView(cardId){
  const s = loadStats();
  bumpObjCount(s.today.views, cardId, 1);
  bumpObjCount(s.total.views, cardId, 1);
  saveStats(s);
  renderInsights();
}
function bumpSearch(rawQuery){
  const s = loadStats();
  // GA4: recommended event name "search" with parameter "search_term"
  track("search", {"search_term": String(rawQuery||"").trim().slice(0,80), "results_count": document.querySelectorAll(".card[data-card]").length, "q_len": String(rawQuery||"").trim().length});
  const tokens = tokenize(rawQuery);
  if(!tokens.length) return;
  tokens.forEach(tok=>{
    // 영문/숫자는 대문자 정규화
    const key = tok.replace(/[a-z0-9]/gi, (c)=> c.toUpperCase());
    bumpObjCount(s.today.searches, key, 1);
    bumpObjCount(s.total.searches, key, 1);
  });
  saveStats(s);
  renderInsights();
}
function topN(obj, n=5){
  return Object.entries(obj||{})
    .sort((a,b)=> (b[1]-a[1]) || a[0].localeCompare(b[0]))
    .slice(0,n);
}
function renderLocalInsights(){
  const kwBox = document.getElementById("insightKeywords");
  const cardBox = document.getElementById("insightCards");
  const resetBtn = document.getElementById("insightResetBtn");
  if(!kwBox && !cardBox) return;

  const s = loadStats();

  // Keywords
  if(kwBox){
    const list = topN(s.today.searches, 10);
    if(list.length){
      kwBox.innerHTML = list.map(([kw,c],i)=>`
        <div class="stat-item">
          <div class="stat-left">
            <div class="stat-rank">${i+1}</div>
            <button class="stat-link" type="button" data-kw="${kw.replace(/"/g,'&quot;')}">${kw}</button>
          </div>
          <div class="stat-count">${c}</div>
        </div>
      `).join("");
    } else {
      // fallback: 추천 키워드(가짜 인기 아님)
      const fallback = ["CAPS","VEGAS","페이백","USDT","파워볼","키노","슬롯","미니게임"];
      kwBox.innerHTML = fallback.map((kw,i)=>`
        <div class="stat-item">
          <div class="stat-left">
            <div class="stat-rank">${i+1}</div>
            <button class="stat-link" type="button" data-kw="${kw}">${kw}</button>
          </div>
          <div class="stat-count">추천</div>
        </div>
      `).join("");
    }
  }

  // Cards
  if(cardBox){
    const list = topN(s.today.views, 5);
    if(list.length){
      cardBox.innerHTML = list.map(([id,c],i)=>{
        const title = (CARD_DATA[id]?.title)||id;
        return `
          <div class="stat-item">
            <div class="stat-left">
              <div class="stat-rank">${i+1}</div>
              <button class="stat-link" type="button" data-card="${id}">${title}</button>
            </div>
            <div class="stat-count">${c}</div>
          </div>
        `;
      }).join("");
    } else {
      cardBox.innerHTML = `<div class="note-mini" style="padding:12px 14px 14px;">아직 오늘 열어본 카드가 없습니다. 카드 상세를 열면 TOP 리스트가 자동으로 채워집니다.</div>`;
    }
  }

  // bindings
  document.querySelectorAll("[data-kw]").forEach(btn=>{
    btn.onclick = ()=>{
      const kw = btn.getAttribute("data-kw") || "";
      const input = document.getElementById("searchInput");
      if(input){ input.value = kw; renderGrid(); input.focus(); }
      track("insight_kw_click", {"kw": kw});
    };
  });
  document.querySelectorAll("[data-card]").forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.getAttribute("data-card");
      if(id) openCard(id);
      track("insight_card_click", {"card_id": id});
    };
  });

  if(resetBtn){
    resetBtn.onclick = ()=>{
      try{ localStorage.removeItem(STATS_KEY); }catch(e){}
      renderInsights();
      track("insight_reset", {});
    };
  }
}


// ===== Global Insights (전체 사용자 인기: GA4 Data API 등) =====
let __INSIGHTS_MODE = "auto"; // "auto" | "global" | "local"
let __GLOBAL_INSIGHTS_CACHE = null;
let __GLOBAL_INSIGHTS_AT = 0;

function hasGlobalInsights() {
  const api = (window.SITE_CONFIG && window.SITE_CONFIG.POPULAR_API) || "";
  return api && api !== "disabled" && !/^\s*$/.test(api);
}

function bindInsightButtons() {
  document.querySelectorAll("[data-kw]").forEach(btn=>{
    btn.onclick = ()=>{
      const kw = btn.getAttribute("data-kw") || "";
      const input = document.getElementById("searchInput");
      if(input){ input.value = kw; renderGrid(); input.focus(); }
      track("insight_kw_click", {"kw": kw});
    };
  });
  document.querySelectorAll("[data-card]").forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.getAttribute("data-card");
      if(id) openCard(id);
      track("insight_card_click", {"card_id": id});
    };
  });
}

function renderGlobalInsights(data) {
  const kwBox = document.getElementById("insightKeywords");
  const cardBox = document.getElementById("insightCards");
  const resetBtn = document.getElementById("insightResetBtn");
  const kwMeta = document.getElementById("insightKwMeta");
  const cardMeta = document.getElementById("insightCardMeta");
  const headline = document.getElementById("insightHeadline");

  if(headline){
    const date = data && data.date ? String(data.date) : "";
    headline.innerHTML = `오늘의 인기 <span class="pill">전체 사용자 기준</span>` + (date ? `<span class="pill ghost">${date}</span>` : "");
  }
  if(resetBtn) resetBtn.style.display = "none";
  if(kwMeta) kwMeta.textContent = "GA4 이벤트(검색) 기준으로 집계됩니다.";
  if(cardMeta) cardMeta.textContent = "GA4 이벤트(카드 열람) 기준으로 집계됩니다.";

  if(kwBox){
    const list = (data && Array.isArray(data.keywords)) ? data.keywords : [];
    if(list.length){
      kwBox.innerHTML = list.slice(0,10).map((it,i)=>{
        const kw = (it.term || it.keyword || "").toString();
        const c = (it.count ?? it.value ?? "").toString();
        return `
          <div class="stat-item">
            <div class="stat-left">
              <div class="stat-rank">${i+1}</div>
              <button class="stat-link" type="button" data-kw="${kw.replace(/"/g,'&quot;')}">${kw}</button>
            </div>
            <div class="stat-count">${c}</div>
          </div>
        `;
      }).join("");
    } else {
      kwBox.innerHTML = `<div class="stat-empty">아직 데이터가 충분히 쌓이지 않았어요.</div>`;
    }
  }

  if(cardBox){
    const list = (data && Array.isArray(data.cards)) ? data.cards : [];
    if(list.length){
      cardBox.innerHTML = list.slice(0,5).map((it,i)=>{
        const id = (it.id || it.card_id || "").toString();
        const c = (it.count ?? it.value ?? "").toString();
        const title = (CARD_DATA[id]?.title) || id;
        return `
          <div class="stat-item">
            <div class="stat-left">
              <div class="stat-rank">${i+1}</div>
              <button class="stat-link" type="button" data-card="${id}">${title}</button>
            </div>
            <div class="stat-count">${c}</div>
          </div>
        `;
      }).join("");
    } else {
      cardBox.innerHTML = `<div class="stat-empty">아직 데이터가 충분히 쌓이지 않았어요.</div>`;
    }
  }

  bindInsightButtons();
}

async function tryLoadGlobalInsights(force=false) {
  if(!hasGlobalInsights()) return false;
  if(!force && __GLOBAL_INSIGHTS_CACHE && (Date.now()-__GLOBAL_INSIGHTS_AT) < 60_000) return true;

  const api = window.SITE_CONFIG.POPULAR_API;
  try{
    const url = api.includes("?") ? (api + "&range=today") : (api + "?range=today");
    const res = await fetch(url, { cache: "no-store" });
    if(!res.ok) throw new Error("bad status");
    const data = await res.json();
    __GLOBAL_INSIGHTS_CACHE = data;
    __GLOBAL_INSIGHTS_AT = Date.now();
    __INSIGHTS_MODE = "global";
    renderGlobalInsights(data);
    return true;
  }catch(e){
    return false;
  }
}

function renderInsights() {
  if(__INSIGHTS_MODE === "global") {
    if(__GLOBAL_INSIGHTS_CACHE) renderGlobalInsights(__GLOBAL_INSIGHTS_CACHE);
    return;
  }
  renderLocalInsights();
}

async function initInsights() {
  // url param: ?insights=local 로 강제
  try{
    const u = new URL(location.href);
    const force = (u.searchParams.get("insights")||"").toLowerCase();
    if(force === "local"){ __INSIGHTS_MODE = "local"; renderLocalInsights(); return; }
  }catch(e){}
  const ok = await tryLoadGlobalInsights(true);
  if(!ok){ __INSIGHTS_MODE = "local"; renderLocalInsights(); }
}




const CLICK_KEY_PREFIX = "88_card_click_";
let currentFilter = "all";
let currentSort = "default";
let isCleanText = false;

function cleanBenefit(s) {
  const t = String(s||"")
    .replace(/[•]/g,"·")
    .replace(/\s*\/\s*/g," / ")
    .replace(/\s+/g," ")
    .trim();

  const max = 56;
  return t.length > max ? (t.slice(0, max-1) + "…") : t;
}


function norm(s){ return String(s||"").toLowerCase().replace(/\s+/g,""); }
function getClickCount(id){ return Number(localStorage.getItem(CLICK_KEY_PREFIX + id) || 0); }
function incCardClick(id){ localStorage.setItem(CLICK_KEY_PREFIX + id, String(getClickCount(id) + 1)); }

// ===== Favorites / Recents (client-only, additive) =====
const FAV_KEY = "88_favs_v1";
const RECENT_KEY = "88_recent_cards_v1";

function _loadArr(key){
  try{
    const raw = localStorage.getItem(key);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  }catch(e){ return []; }
}
function _saveArr(key, arr){
  try{ localStorage.setItem(key, JSON.stringify(arr)); }catch(e){}
}
function getFavs(){ return _loadArr(FAV_KEY); }
function setFavs(arr){ _saveArr(FAV_KEY, (arr||[]).slice(0,50)); }
function isFav(id){ return getFavs().includes(id); }
function toggleFav(id){
  if(!id) return;
  const favs = getFavs();
  const i = favs.indexOf(id);
  if(i>=0) favs.splice(i,1);
  else favs.unshift(id);
  setFavs(favs);
}

function getRecents(){ return _loadArr(RECENT_KEY); }
function setRecents(arr){ _saveArr(RECENT_KEY, (arr||[]).slice(0,12)); }
function pushRecentCard(id){
  if(!id) return;
  const rec = getRecents().filter(x=>x!==id);
  rec.unshift(id);
  setRecents(rec);
}

function renderVendorHub(){
  const hub = document.getElementById('vendorHub');
  if(!hub) return;
  const favBox = document.getElementById('vhFavChips');
  const recBox = document.getElementById('vhRecentChips');
  if(!favBox || !recBox) return;

  const favs = getFavs().filter(id=>!!CARD_DATA[id]);
  const recs = getRecents().filter(id=>!!CARD_DATA[id]);

  hub.setAttribute('data-has-favs', favs.length ? '1' : '0');
  hub.setAttribute('data-has-recents', recs.length ? '1' : '0');

  const chip = (id)=>{
    const d = CARD_DATA[id] || {};
    const t = (d.title || id).toString();
    return `<button class="vh-chip" type="button" data-open="${id}"><span class="dot" aria-hidden="true"></span><span>${t.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span></button>`;
  };

  favBox.innerHTML = favs.slice(0,10).map(chip).join('');
  recBox.innerHTML = recs.slice(0,10).map(chip).join('');
}

function syncFavButtons(){
  const favs = new Set(getFavs());
  document.querySelectorAll('.fav-btn[data-fav]').forEach(btn=>{
    const id = btn.getAttribute('data-fav');
    btn.classList.toggle('active', favs.has(id));
    btn.setAttribute('aria-pressed', favs.has(id) ? 'true' : 'false');
  });
}

let __VENDOR_EXTRAS_INIT = false;
function initVendorExtras(){
  if(__VENDOR_EXTRAS_INIT) return;
  __VENDOR_EXTRAS_INIT = true;

  document.addEventListener('click', (e)=>{
    const favBtn = e.target.closest && e.target.closest('.fav-btn[data-fav]');
    if(favBtn){
      e.preventDefault();
      e.stopPropagation();
      const id = favBtn.getAttribute('data-fav');
      toggleFav(id);
      syncFavButtons();
      renderVendorHub();
      track('fav_toggle', { card_id: id, state: isFav(id) ? 'on' : 'off' });
      return;
    }

    const chip = e.target.closest && e.target.closest('.vh-chip[data-open]');
    if(chip){
      e.preventDefault();
      const id = chip.getAttribute('data-open');
      if(id && CARD_DATA[id]){
        openCard(id);
        track('hub_open_card', { card_id: id });
      }
      return;
    }
  }, { passive:false });

  const cFav = document.getElementById('vhClearFavs');
  const cRec = document.getElementById('vhClearRecents');
  if(cFav) cFav.addEventListener('click', ()=>{ setFavs([]); syncFavButtons(); renderVendorHub(); track('hub_clear_favs',{}); });
  if(cRec) cRec.addEventListener('click', ()=>{ setRecents([]); renderVendorHub(); track('hub_clear_recents',{}); });
}


function cardSourcesById(id) {
  const n = String(id).replace("card","");
  // GIF는 실제로 업로드된 카드만 지정하세요 (없는 경우 아예 요청하지 않음)
  // 예) card2: img/imj2.gif, card3: img/img3.gif
  const GIF_OVERRIDES = {
    // GIF가 있는 카드만 여기에 등록 (없으면 아예 요청하지 않음)
    // card2는 파일명이 img2.gif / imj2.gif 둘 중 하나일 수 있어 2단 폴백 지원
    card2: ["img/img2.gif", "img/imj2.gif"],
    card3: ["img/img3.gif"]
  };

  const g = GIF_OVERRIDES[id];
  const gif  = Array.isArray(g) ? (g[0] || "") : (g || "");
  const gif2 = Array.isArray(g) ? (g[1] || "") : "";

  return {
    gif,
    gif2,
    webp: `img/img${n}.webp`,
    jpg: `img/img${n}.jpg`
  };
}

// 호환: 카드 소스 헬퍼 (이름 차이로 인한 렌더 에러 방지)
const getCardSources = (id)=> cardSourcesById(id);

function renderGrid() {
  const gridG = document.getElementById("vendorGridGuarantee");
  const gridV = document.getElementById("vendorGridVerified");

  // (호환) 과거 버전에서 vendorGrid만 있던 경우도 안전 처리
  const legacy = document.getElementById("vendorGrid");
  if(!gridG && !gridV && !legacy) return;

  const q = norm(document.getElementById("searchInput")?.value || "");

  // (보증 놀이터) 이 배열에 카드 ID를 추가하면 보증 섹션으로 자동 분류됩니다.
  // 예) ["card1","card2","card3","card12"...]
  const GUARANTEE_ORDER = ["card1","card2","card3"];
  const GUARANTEE_SET = new Set(GUARANTEE_ORDER);

  const ids = Object.keys(CARD_DATA);

  // 기본값 보정(로딩/표시 오류 방지): priority 없으면 normal로 간주
  ids.forEach(id=>{
    const d = CARD_DATA[id] || {};
    if(!d.priority) d.priority = "normal";
    if(!d.tag) d.tag = "";
  });

  const isGuarantee = (id)=> GUARANTEE_SET.has(id);

  // 정렬: high 랜덤 -> normal 랜덤 -> 광고 마지막 (인기순은 별도)
  const shuffle = (arr)=> arr.slice().sort(()=>Math.random()-0.5);
  const orderByPriority = (arr)=>{
    const high = arr.filter(id=>CARD_DATA[id].priority==="high");
    const normal = arr.filter(id=>CARD_DATA[id].priority==="normal");
    const ad = arr.filter(id=>CARD_DATA[id].priority==="ad");
    return [...shuffle(high), ...shuffle(normal), ...ad];
  };

  // (보증) 지정 순서 유지 + 추가로 지정된 보증 카드가 있으면 뒤에 붙임
  const guaranteeAll = [
    ...GUARANTEE_ORDER.filter(id=>ids.includes(id)),
    ...ids.filter(id=>isGuarantee(id) && !GUARANTEE_ORDER.includes(id))
  ];

  const verifiedAll = ids.filter(id=>!isGuarantee(id));

  // 기본 순서(기본 정렬)
  let baseG = guaranteeAll;
  let baseV = orderByPriority(verifiedAll);

  // 필터/검색
  const match = (id)=>{
    const d = CARD_DATA[id];

    // 섹션 필터
    if(currentFilter==="guarantee" && !isGuarantee(id)) return false;
    if(currentFilter==="verified"  &&  isGuarantee(id)) return false;

    // 기존 태그 필터(호환)
    if(currentFilter==="rec" && d.tag!=="rec") return false;
    if(currentFilter==="new" && d.tag!=="new") return false;
    if(currentFilter==="ad"  && d.tag!=="ad") return false;

    if(q) {
      const hay = norm(`${d.title} ${d.code||""} ${d.benefit||""} ${d.notice||""} ${(d.recruitText||"")}`);
      if(!hay.includes(q)) return false;
    }
    return true;
  };

  let listG = baseG.filter(match);
  let listV = baseV.filter(match);

  if(currentSort==="pop") {
    listG.sort((a,b)=> getClickCount(b)-getClickCount(a));
    listV.sort((a,b)=> getClickCount(b)-getClickCount(a));
  }

  const cardHTML = (id)=>{
    const d = CARD_DATA[id] || {};
    const src = getCardSources(id);
    const firstSrc = src.gif || src.webp || src.jpg || "";
    return `
      <div class="card card--imageOnly" data-card="${id}" role="button" tabindex="0"
           aria-label="${(d.title||"카드").replace(/"/g,'&quot;')} 열기">
        <div class="img-box">
          <img class="cardThumb"
               src="${firstSrc}"
               data-gif="${src.gif}"
               data-gif2="${src.gif2||""}"
               data-webp="${src.webp}"
               data-jpg="${src.jpg}"
               loading="lazy" decoding="async"
               alt="${(d.title||"").replace(/"/g,'&quot;')}">
          <button class="fav-btn" type="button" data-fav="${id}" aria-label="즐겨찾기"></button>
          <div class="img-title" aria-hidden="true">${d.title || ""}</div>
        </div>
      </div>
    `;
  };

  const outG = listG.map(cardHTML).join("");
  const outV = listV.map(cardHTML).join("");

  if(gridG) gridG.innerHTML = outG;
  if(gridV) gridV.innerHTML = outV;

  // 레거시 grid 지원(혹시 old markup이면 한 번에 뿌림)
  if(legacy && !gridG && !gridV) legacy.innerHTML = [...listG, ...listV].map(cardHTML).join("");

  // 섹션 빈 상태면 숨김
  document.querySelectorAll(".vendor-section").forEach(sec=>{
    const s = sec.getAttribute("data-section");
    const grid = sec.querySelector(".vendor-grid");
    const has = !!grid && grid.querySelectorAll(".card[data-card]").length > 0;
    sec.style.display = has ? "block" : "none";
  });

  // blur bg 세팅 + 이미지 에러 대응
  document.querySelectorAll(".img-box").forEach(box=>{
    const img = box.querySelector("img");
    if(!img) return;

    // GIF 우선 → WEBP → JPG 순서로 자동 폴백
    const chain = [img.dataset.gif, img.dataset.gif2, img.dataset.webp, img.dataset.jpg].filter(Boolean);
    let step = 0;

    const applyBg = ()=>{
      let bg = img.currentSrc || img.src || "";
      if(bg.endsWith(".gif")) bg = img.dataset.webp || img.dataset.jpg || bg; // GIF는 블러 배경에 부하가 커서 정적 이미지 우선
      box.style.setProperty("--bgimg", bg ? `url('${bg}')` : "none");
    };

    img.addEventListener("load", applyBg, { once:false, passive:true });

    img.onerror = ()=>{
      step += 1;
      if(chain[step]) {
        img.src = chain[step];
        return;
      }
      img.style.display="none";
      box.style.minHeight="130px";
    };

    // 초기 src가 비어있으면 체인 첫 값으로 세팅
    if(!img.getAttribute("src") && chain[0]) img.src = chain[0];
    applyBg();
  });

  setChipActive();
  bindCardClicks();
  try{ syncFavButtons(); }catch(e){}
  try{ renderVendorHub(); }catch(e){}
}

function setChipActive() {
  // 기존 v-chip(배찌) UI 제거 → select / toggle 상태만 동기화
  const filterSel = document.getElementById("filterSelect");
  const sortSel   = document.getElementById("sortSelect");
  const cleanTgl  = document.getElementById("cleanToggle");
  if(filterSel) filterSel.value = currentFilter;
  if(sortSel)   sortSel.value   = currentSort;
  if(cleanTgl)  cleanTgl.checked = !!isCleanText;
}

function setFilter(key) {
  currentFilter = key || "all";
  setChipActive();
  renderGrid();
  initVendorExtras();
  if(currentFilter!=="all") {
    const top = document.getElementById("vendorTop");
    if(top) top.scrollIntoView({behavior:"smooth", block:"start"});
  }
  track("filter_change", {"filter": currentFilter, "results_count": document.querySelectorAll(".card[data-card]").length});
}

function setSort(key) {
  currentSort = key || "default";
  setChipActive();
  renderGrid();
  initVendorExtras();
  track("sort_change", {"sort": currentSort, "results_count": document.querySelectorAll(".card[data-card]").length});
}


function bindCardClicks() {
  document.querySelectorAll(".card[data-card]").forEach(el=>{
    el.onclick = ()=> openCard(el.dataset.card);
  });

  // 공유 버튼(카드 내부) 클릭은 팝업 오픈 대신 공유 팝업을 엽니다.
  document.querySelectorAll("[data-share]").forEach(btn=>{
    const open = (e)=>{
      e.preventDefault();
      e.stopPropagation();
      const id = btn.getAttribute("data-share");
      openShare(id);
    };
    btn.addEventListener("click", open);
    btn.addEventListener("keydown", (e)=>{
      if(e.key==="Enter" || e.key===" "){ open(e); }
    });
  });

}

(function bindControlsAndSearch() {
  const filterSel = document.getElementById("filterSelect");
  const sortSel   = document.getElementById("sortSelect");
  const cleanTgl  = document.getElementById("cleanToggle");
  const cleanHint = document.getElementById("cleanHint");

  // 상태 복원
  const savedFilter = sessionStorage.getItem("88_filter");
  const savedSort   = sessionStorage.getItem("88_sort");
  const savedClean  = sessionStorage.getItem("88_clean_text");

  if(savedFilter) currentFilter = savedFilter;
  if(savedFilter === "pop") { currentFilter = "all"; currentSort = "pop"; }
  if(savedSort)   currentSort   = savedSort;
  if(savedClean === "1") isCleanText = true;

  setChipActive();
  if(cleanHint) cleanHint.style.display = "block";

  if(filterSel) {
    filterSel.addEventListener("change", ()=>{
      sessionStorage.setItem("88_filter", filterSel.value);
      setFilter(filterSel.value);
    });
  }

  if(sortSel) {
    sortSel.addEventListener("change", ()=>{
      sessionStorage.setItem("88_sort", sortSel.value);
      setSort(sortSel.value);
    });
  }

  if(cleanTgl) {
    cleanTgl.addEventListener("change", ()=>{
      isCleanText = !!cleanTgl.checked;
      sessionStorage.setItem("88_clean_text", isCleanText ? "1" : "0");
      setChipActive();
      renderGrid();
  initVendorExtras();
      track("clean_text_toggle", {"state": isCleanText ? "on" : "off"});
    });
  }

  const input = document.getElementById("searchInput");
  if(input) {
    let kwTimer = null;
    input.addEventListener("input", ()=> {
      renderGrid();
  initVendorExtras();
      clearTimeout(kwTimer);
      const v = input.value;
      kwTimer = setTimeout(()=> bumpSearch(v), 900);
    });
    input.addEventListener("keydown", (e)=>{
      if(e.key === "Enter"){ bumpSearch(input.value); }
    });
  }

  // (UI) 모바일: 필터/정렬을 "한 줄 요약 + 드롭다운"으로 compact 처리
  (function setupCompactControls(){
    const tools = document.querySelector(".vendor-tools");
    const controls = tools ? tools.querySelector(".v-controls") : null;
    if(!tools || !controls) return;
    const mql = window.matchMedia("(max-width:560px)");
    let details = null;
    let summaryEl = null;

    function makeSummary(){
      const f = filterSel ? (filterSel.options[filterSel.selectedIndex]?.text || "") : "";
      const s = sortSel ? (sortSel.options[sortSel.selectedIndex]?.text || "") : "";
      const c = (cleanTgl && cleanTgl.checked) ? "정제 ON" : "정제 OFF";
      const q = (input && input.value) ? input.value.trim() : "";
      const qShort = q ? (q.length > 10 ? (q.slice(0,10) + "…") : q) : "";
      const qPart = qShort ? ` · "${qShort}"` : "";
      return `${f} · ${s} · ${c}${qPart}`;
    }

    function update(){
      if(summaryEl) summaryEl.textContent = makeSummary();
    }

    function apply(on){
      if(on){
        if(details) { update(); return; }
        details = document.createElement("details");
        details.className = "v-compact";
        const summary = document.createElement("summary");
        summary.innerHTML = `<span class="sum"></span><span class="caret" aria-hidden="true">▾</span>`;
        summaryEl = summary.querySelector(".sum");
        details.appendChild(summary);

        // searchInput 바로 아래에 삽입
        const search = tools.querySelector("#searchInput");
        if(search) search.insertAdjacentElement("afterend", details);
        else tools.insertBefore(details, tools.firstChild);

        // 기존 컨트롤 DOM 이동(아이디/이벤트 그대로 유지)
        details.appendChild(controls);
        update();
      } else {
        if(!details) return;
        const search = tools.querySelector("#searchInput");
        if(search) search.insertAdjacentElement("afterend", controls);
        else tools.insertBefore(controls, tools.firstChild);
        details.remove();
        details = null;
        summaryEl = null;
      }
    }

    if(filterSel) filterSel.addEventListener("change", update);
    if(sortSel) sortSel.addEventListener("change", update);
    if(cleanTgl) cleanTgl.addEventListener("change", update);
    if(input) input.addEventListener("input", update);

    if(mql.addEventListener) mql.addEventListener("change", (e)=> apply(e.matches));
    else mql.addListener((e)=> apply(e.matches));

    apply(mql.matches);
  })();

})();/* ===== 팝업 + 접근성 ===== */
let currentCode="";
let currentCardId="";
let lastFocusEl=null;

function openCard(id) {
  const d = CARD_DATA[id];
  if(!d) return;

  currentCardId = id;
  try{ pushRecentCard(id); }catch(e){}
  try{ renderVendorHub(); }catch(e){}
  bumpView(id);
  incCardClick(id);
  track("card_open", {"card_id": id, "title": d.title || "", "tag": d.tag || "", "code": (d.code||"").slice(0,16)});

  const isRecruit = !!d.recruit;

  currentCode = (isRecruit ? "" : (d.code || ""));
  document.getElementById("pTitle").innerText = d.title || "";
  document.getElementById("pCode").innerText  = (d.code || "");

  document.getElementById("codeRow").style.display = isRecruit ? "none" : "block";
  document.getElementById("copyBtn").style.display = isRecruit ? "none" : "block";
  document.getElementById("pLink").style.display = isRecruit ? "none" : "block";

  // 혜택/주의
  const pBenefit = document.getElementById("pBenefit");
  const pNotice  = document.getElementById("pNotice");
  pBenefit.style.display = (d.benefit && !isRecruit) ? "block" : "none";
  pBenefit.innerText = (d.benefit && !isRecruit) ? ("혜택 : " + d.benefit) : "";
  pNotice.style.display = d.notice ? "block" : "none";
  pNotice.innerText = d.notice ? ("주의 : " + d.notice) : "";

  // 링크/텔레그램 (+UTM)
  const btnGo = document.getElementById("pLink");
  if(btnGo) {
    btnGo.href = d.link ? appendUtm(d.link) : "#";
  }

  const tg = (d.telegram || "UZU59").replace("@","");
  const pTelegram = document.getElementById("pTelegram");
  pTelegram.href = appendUtm("https://t.me/" + tg);
  pTelegram.innerText = isRecruit ? ("광고 문의 @" + tg) : ("텔레그램 상담 @" + tg);

  // 안내 3줄
  const rBox = document.getElementById("reasonBox");
  const rTitle = document.getElementById("reasonTitle");
  const r1 = document.getElementById("reason1");
  const r2 = document.getElementById("reason2");
  const r3 = document.getElementById("reason3");

  rBox.style.display = "block";
  if(isRecruit) {
    rTitle.innerText = "광고 문의 안내";
    r1.innerText = "• 광고/제휴 문의는 텔레그램으로만 진행합니다.";
    r2.innerText = "• 배너/카드/문구 구성은 협의 후 반영합니다.";
    r3.innerText = "• 문의: @" + tg;
  } else {
    const reasons = (d.reasons && d.reasons.length) ? d.reasons : ["안정성/이력 중심", "조건/안내가 비교적 명확", "문의 채널 고정"];
    rTitle.innerText = "안내";
    r1.innerText = "• " + (reasons[0] || "");
    r2.innerText = "• " + (reasons[1] || "");
    r3.innerText = "• " + (reasons[2] || "");
  }

  lastFocusEl = document.activeElement;
  const popup = document.getElementById("cardPopup");
  popup.style.display="flex";

  // 포커스 이동
  const focusTarget = document.getElementById("closeBtn");
  if(focusTarget) focusTarget.focus();
}

function closeCard() {
  const popup = document.getElementById("cardPopup");
  popup.style.display="none";
  if(lastFocusEl && lastFocusEl.focus) lastFocusEl.focus();
}

function copyCode() {
  if(!currentCode) return;
  navigator.clipboard.writeText(currentCode).then(()=>{
    alert("가입코드가 복사되었습니다");
    track("copy_code", {"code": currentCode, "card_id": currentCardId, "title": (CARD_DATA[currentCardId]?.title)||"", "tag": (CARD_DATA[currentCardId]?.tag)||""});
  }).catch(()=>{
    // fallback
    try {
      const t=document.createElement("textarea");
      t.value=currentCode;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
      alert("가입코드가 복사되었습니다");
      track("copy_code", {"code": currentCode, "card_id": currentCardId, "title": (CARD_DATA[currentCardId]?.title)||"", "tag": (CARD_DATA[currentCardId]?.tag)||""});
    } catch(e) {}
  });
}

function copyToClipboard(text, okMsg) {
  if(!text) return;
  navigator.clipboard.writeText(text).then(()=>{
    if(okMsg) alert(okMsg);
  }).catch(()=>{
    // fallback
    try {
      const t=document.createElement("textarea");
      t.value=text;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
      if(okMsg) alert(okMsg);
    } catch(e) {}
  });
}

function buildDeepLink(id) {
  try {
    const u = new URL(window.location.href);
    u.searchParams.set("v", id);
    return u.toString();
  } catch(e) {
    return window.location.href;
  }
}

function shareTextFor(id) {
  const d = CARD_DATA[id];
  if(!d) return "";
  const title = d.title || "";
  const benefit = cleanBenefit(d.benefit || "").replace(/\s+/g," ").trim();
  const code = d.code ? `가입코드: ${d.code}` : "";
  const link = buildDeepLink(id);
  return [`88 인증 놀이터 - ${title}`, benefit, code, link].filter(Boolean).join("\n");
}

function openShare(id) {
  const d = CARD_DATA[id];
  if(!d) return;

  currentCardId = id;
  try{ pushRecentCard(id); }catch(e){}
  try{ renderVendorHub(); }catch(e){}

  const popup = document.getElementById("sharePopup");
  const link = buildDeepLink(id);
  const linkInput = document.getElementById("shareLink");
  if(linkInput) linkInput.value = link;

  drawShareCard(d, link);

  lastFocusEl = document.activeElement;
  if(popup) popup.style.display="flex";
  const focusTarget = document.getElementById("closeShareBtn");
  if(focusTarget) focusTarget.focus();

  track("share_open", {"card_id": id, "title": d.title || ""});
}

function closeShare() {
  const popup = document.getElementById("sharePopup");
  if(popup) popup.style.display="none";
  try { if(lastFocusEl) lastFocusEl.focus(); } catch(e) {}
}

function copyShareLink() {
  const link = document.getElementById("shareLink")?.value || "";
  copyToClipboard(link, "공유 링크가 복사되었습니다");
  track("share_copy_link", {"card_id": currentCardId});
}

function copyShareText() {
  const txt = shareTextFor(currentCardId);
  copyToClipboard(txt, "공유 문구가 복사되었습니다");
  track("share_copy_text", {"card_id": currentCardId});
}

function downloadShareImage() {
  const c = document.getElementById("shareCanvas");
  if(!c) return;
  const a = document.createElement("a");
  const safe = (CARD_DATA[currentCardId]?.title || "share").replace(/[^a-z0-9가-힣_-]+/gi, "_");
  a.download = `88_${safe}.png`;
  a.href = c.toDataURL("image/png");
  document.body.appendChild(a);
  a.click();
  a.remove();
  track("share_download_image", {"card_id": currentCardId});
}

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines){
  const words = (text||"").split(" ");
  let line = "";
  let lineCount = 0;
  for(let n=0; n<words.length; n++){
    const testLine = line + (line ? " " : "") + words[n];
    const metrics = ctx.measureText(testLine);
    if(metrics.width > maxWidth && line){
      ctx.fillText(line, x, y + lineCount*lineHeight);
      line = words[n];
      lineCount++;
      if(maxLines && lineCount >= maxLines) return;
    } else {
      line = testLine;
    }
  }
  if(line && (!maxLines || lineCount < maxLines)){
    ctx.fillText(line, x, y + lineCount*lineHeight);
  }
}

function drawShareCard(d, link) {
  const c = document.getElementById("shareCanvas");
  if(!c) return;
  const ctx = c.getContext("2d");
  const W = c.width, H = c.height;

  ctx.clearRect(0,0,W,H);

  // 배경
  const g = ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,"#0b0b0f");
  g.addColorStop(1,"#12121a");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // 글로우
  ctx.fillStyle = "rgb(var(--accentRGB) / 0.12)";
  ctx.beginPath();
  ctx.ellipse(W*0.58, H*0.14, W*0.55, H*0.22, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = "rgba(90,160,255,0.10)";
  ctx.beginPath();
  ctx.ellipse(W*0.32, H*0.22, W*0.46, H*0.18, 0, 0, Math.PI*2);
  ctx.fill();

  // 패널
  const pad = 72;
  const cardX = pad, cardY = pad, cardW = W - pad*2, cardH = H - pad*2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 42);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 헤더 pill
  const pillH = 64, pillW = 260;
  roundRect(ctx, cardX+44, cardY+44, pillW, pillH, 999);
  ctx.fillStyle = "rgb(var(--accentRGB) / 0.95)";
  ctx.fill();

  ctx.fillStyle = "#111";
  ctx.font = "900 34px system-ui, -apple-system, Segoe UI, Roboto, Apple SD Gothic Neo, Malgun Gothic, sans-serif";
  ctx.fillText("88 인증 놀이터", cardX+44+26, cardY+44+44);

  // 제목
  ctx.fillStyle = "#fff";
  ctx.font = "900 78px system-ui, -apple-system, Segoe UI, Roboto, Apple SD Gothic Neo, Malgun Gothic, sans-serif";
  wrapText(ctx, (d.title||""), cardX+44, cardY+160, cardW-88, 88, 2);

  // 혜택
  const benefit = cleanBenefit(d.benefit||"").replace(/\s+/g," ").trim();
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.font = "700 40px system-ui, -apple-system, Segoe UI, Roboto, Apple SD Gothic Neo, Malgun Gothic, sans-serif";
  wrapText(ctx, benefit || "혜택 안내", cardX+44, cardY+360, cardW-88, 58, 3);

  // 코드/링크
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "800 36px system-ui, -apple-system, Segoe UI, Roboto, Apple SD Gothic Neo, Malgun Gothic, sans-serif";
  const code = d.code ? `가입코드: ${d.code}` : "가입코드: (없음)";
  ctx.fillText(code, cardX+44, cardY+600);

  ctx.font = "700 28px system-ui, -apple-system, Segoe UI, Roboto, Apple SD Gothic Neo, Malgun Gothic, sans-serif";
  const linkShort = (link||"").replace(/^https?:\/\//,'');
  wrapText(ctx, linkShort, cardX+44, cardY+655, cardW-88, 42, 2);

  // 안내
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "700 24px system-ui, -apple-system, Segoe UI, Roboto, Apple SD Gothic Neo, Malgun Gothic, sans-serif";
  wrapText(ctx, "※ 정보 제공/참고용 · 과몰입 주의", cardX+44, cardY+cardH-88, cardW-88, 34, 2);
}


function jumpToRec() {
  closeCard();
  setFilter("rec");
  const top = document.getElementById("vendorTop");
  if(top) top.scrollIntoView({behavior:"smooth", block:"start"});
  track("popup_secondary_cta", {"action":"jump_to_rec"});
}

(function bindPopupControls() {
  const popup = document.getElementById("cardPopup");
  const box = popup?.querySelector(".popup-box");
  const closeBtn = document.getElementById("closeBtn");
  const copyBtn = document.getElementById("copyBtn");
  const shareBtn = document.getElementById("shareBtn");
  const moreBtn = document.getElementById("moreRecBtn");
  const goBtn = document.getElementById("pLink");
  const tgBtn = document.getElementById("pTelegram");

  const sharePopup = document.getElementById("sharePopup");
  const closeShareBtn = document.getElementById("closeShareBtn");
  const copyShareLinkBtn = document.getElementById("copyShareLinkBtn");
  const downloadShareImgBtn = document.getElementById("downloadShareImgBtn");
  const copyShareTextBtn = document.getElementById("copyShareTextBtn");

  if(closeBtn) closeBtn.addEventListener("click", closeCard);
  if(copyBtn) copyBtn.addEventListener("click", copyCode);
  if(shareBtn) shareBtn.addEventListener("click", ()=> openShare(currentCardId));
  if(moreBtn) moreBtn.addEventListener("click", jumpToRec);

  if(goBtn) goBtn.addEventListener("click", ()=> track("outbound_click", {"type":"site", "card_id": currentCardId, "title": (CARD_DATA[currentCardId]?.title)||"", "url": (document.getElementById("pLink")?.href)||"" }));
  if(tgBtn) tgBtn.addEventListener("click", ()=> track("outbound_click", {"type":"telegram", "card_id": currentCardId, "title": (CARD_DATA[currentCardId]?.title)||"", "url": (document.getElementById("pTelegram")?.href)||"" }));

  if(closeShareBtn) closeShareBtn.addEventListener("click", closeShare);
  if(copyShareLinkBtn) copyShareLinkBtn.addEventListener("click", copyShareLink);
  if(downloadShareImgBtn) downloadShareImgBtn.addEventListener("click", downloadShareImage);
  if(copyShareTextBtn) copyShareTextBtn.addEventListener("click", copyShareText);

  // (A11y) allow Enter/Space on div.btn role=button
  [closeBtn, copyBtn, shareBtn].forEach(el=>{
    if(!el) return;
    el.addEventListener("keydown", (e)=>{
      if(e.key==="Enter" || e.key===" "){ e.preventDefault(); el.click(); }
    });
  });


  // 바깥 클릭 닫기
  if(popup) popup.addEventListener("click", (e)=>{
    if(e.target === popup) closeCard();
  });
  if(sharePopup) sharePopup.addEventListener("click", (e)=>{
    if(e.target === sharePopup) closeShare();
  });

  // ESC 닫기 + 포커스 트랩(최소)
  document.addEventListener("keydown", (e)=>{
    if(popup && popup.style.display==="flex") {
      if(e.key==="Escape") closeCard();
      if(e.key==="Tab") {
        const focusables = popup.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])');
        const list = Array.from(focusables).filter(el=>!el.hasAttribute("disabled") && el.offsetParent !== null);
        if(!list.length) return;
        const first = list[0];
        const last = list[list.length-1];
        if(e.shiftKey && document.activeElement===first) { e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement===last) { e.preventDefault(); first.focus(); }
      }
    }
  });
})();

/* ===== +EV 감지 시 추천 필터 자동 ON (오늘만) ===== */
function maybeAutoRecFilter() {
  const ev = localStorage.getItem("88_ev_positive");
  const evDate = localStorage.getItem("88_ev_date");
  const today = dateKeyLocal();
  const hint = document.getElementById("evAutoHint");

  if(ev==="1" && evDate===today) {
    if(!sessionStorage.getItem("88_ev_autoon_done")) {
      sessionStorage.setItem("88_ev_autoon_done","1");
      currentFilter = "rec";
      if(hint) {
        hint.style.display="block";
        hint.innerText = "✅ 분석기에서 +EV가 감지되어 ‘추천’ 필터가 자동 활성화되었습니다. (오늘만)";
      }
      track("ev_autofilter", {"state":"on"});
    } else {
      if(hint) {
        hint.style.display="block";
        hint.innerText = "✅ 오늘 +EV 기록이 있어 ‘추천’ 필터를 빠르게 확인할 수 있습니다.";
      }
    }
  } else {
    if(hint) {
      hint.style.display="none";
      hint.innerText = "";
    }
  }
}

/* ===== CTA 트래킹 ===== */
(function bindCtas() {
  document.querySelectorAll("[data-cta]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const cta = el.getAttribute("data-cta") || "";
      const txt = (el.textContent || "").replace(/\s+/g," ").trim().slice(0,60);
      let loc = "unknown";
      if(el.closest(".fab")) loc = "fab";
      else if(el.closest("#analyzerSection")) loc = "hero";
      else if(el.closest(".vendor-header")) loc = "vendor_header";
      else if(el.closest(".vendor-tools")) loc = "vendor_tools";
      else if(el.closest(".landing-seo")) loc = "footer_links";
      track("cta_click", {"cta": cta, "cta_location": loc, "cta_text": txt});
    });
  });
})();


function openFromUrl() {
  try {
    const u = new URL(window.location.href);
    const v = u.searchParams.get("v");
    if(v && CARD_DATA[v]) {
      openCard(v);
    }
  } catch(e) {}
}

/* ===== 초기화 ===== */
(function init() {
  saveUtmFromUrl();
  refreshChecklist();
  setMarginMode("2");
  maybeAutoRecFilter();
  renderGrid();
  initVendorExtras();
  initInsights();
  openFromUrl();
})();



/* ===== logo shadow preset (2단계) + quick memo ===== */
(function(){
  function miniToast(msg){
    try{
      let el = document.getElementById("miniToast88");
      if(!el){
        el = document.createElement("div");
        el.id = "miniToast88";
        el.style.position = "fixed";
        el.style.left = "50%";
        el.style.bottom = "88px";
        el.style.transform = "translateX(-50%)";
        el.style.padding = "10px 12px";
        el.style.borderRadius = "999px";
        el.style.background = "rgba(0,0,0,.68)";
        el.style.border = "1px solid rgba(255,255,255,.14)";
        el.style.color = "#fff";
        el.style.fontSize = "13px";
        el.style.fontWeight = "800";
        el.style.zIndex = "99999";
        el.style.opacity = "0";
        el.style.transition = "opacity .18s ease, transform .18s ease";
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.style.opacity = "1";
      el.style.transform = "translateX(-50%) translateY(-4px)";
      clearTimeout(el.__t);
      el.__t = setTimeout(()=>{ el.style.opacity="0"; el.style.transform="translateX(-50%)"; }, 1400);
    }catch(e){}
  }

  try{
    // logo shadow: minimal(default) / presence
    const qs = new URLSearchParams(location.search);
    const fromQS = qs.get("logoShadow");
    const saved = localStorage.getItem("logoShadowPreset");
    const presetRaw = (fromQS || saved || "minimal").toLowerCase();
    const preset = (presetRaw === "presence" || presetRaw === "bold" || presetRaw === "strong") ? "presence" : "minimal";
    document.body.dataset.logoShadow = preset;
    if(fromQS) localStorage.setItem("logoShadowPreset", preset);

    // quick memo (local only)
    const key = "88st_quickMemo_v1";
    const keyHist = "88st_quickMemoHist_v1";
    const ta = document.getElementById("quickMemoText");
    const btnSave = document.getElementById("quickMemoSave");
    const btnClear = document.getElementById("quickMemoClear");

    const btnAppend = document.getElementById("memoAppendAnalysis");
    const btnCopy = document.getElementById("memoCopy");
    const histList = document.getElementById("memoHistoryList");
    const chips = document.querySelectorAll("[data-memo-insert]");

    function safeJsonParse(v, fallback){
      try{ return JSON.parse(v); }catch(e){ return fallback; }
    }
    function loadHist(){
      const raw = localStorage.getItem(keyHist);
      const arr = safeJsonParse(raw, []);
      return Array.isArray(arr) ? arr : [];
    }
    function saveHist(arr){
      try{ localStorage.setItem(keyHist, JSON.stringify(arr.slice(0,5))); }catch(e){}
    }
    function tsLabel(ms){
      try{
        const d = new Date(ms);
        const mm = String(d.getMonth()+1).padStart(2,"0");
        const dd = String(d.getDate()).padStart(2,"0");
        const hh = String(d.getHours()).padStart(2,"0");
        const mi = String(d.getMinutes()).padStart(2,"0");
        return `${mm}.${dd} ${hh}:${mi}`;
      }catch(e){ return ""; }
    }
    function renderHist(){
      if(!histList) return;
      const arr = loadHist();
      if(!arr.length){
        histList.innerHTML = '<div class="text" style="color:rgba(255,255,255,.55);font-size:12px;">저장된 메모가 없습니다.</div>';
        return;
      }
      histList.innerHTML = arr.map((it, idx)=>{
        const text = (it && it.text) ? String(it.text) : "";
        const t = (it && it.t) ? Number(it.t) : 0;
        return `
          <div class="memo-history-item" data-memo-idx="${idx}">
            <div class="memo-history-meta">
              <span>${tsLabel(t)}</span>
              <span style="color:rgba(245,226,122,.75);font-weight:900;">불러오기</span>
            </div>
            <div class="memo-history-text">${text.replace(/[<>&]/g, s => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[s]))}</div>
          </div>
        `;
      }).join("");
    }
    function addHist(text){
      const t = Date.now();
      const v = (text||"").trim();
      if(!v) return;
      const arr = loadHist();
      // 동일 메모 중복 방지
      if(arr.length && arr[0] && String(arr[0].text||"").trim() === v) return;
      arr.unshift({t, text: v});
      saveHist(arr);
    }

    function pillsText(id){
      const el = document.getElementById(id);
      if(!el) return [];
      const pills = Array.from(el.querySelectorAll(".odds-pill"));
      return pills.map(p => (p.textContent||"").trim()).filter(Boolean);
    }
    function buildAnalysisLine(){
      const margin = (document.getElementById("oddsMarginValue")?.textContent||"").trim();
      if(!margin || margin === "—") return "";
      const fair = pillsText("oddsFairPills");
      const prob = pillsText("oddsProbPills");
      const fairTxt = fair.length ? fair.join(" / ") : "—";
      const probTxt = prob.length ? prob.join(" / ") : "—";
      return `[배당 구조 분석] 마진 ${margin} | 공정배당 ${fairTxt} | 정규확률 ${probTxt}`;
    }

    if(ta){
      ta.value = localStorage.getItem(key) || "";
      renderHist();

      btnSave && btnSave.addEventListener("click", ()=>{
        const v = (ta.value||"").trim();
        localStorage.setItem(key, v);
        addHist(v);
        renderHist();
        miniToast("메모 저장 완료");
      });

      btnClear && btnClear.addEventListener("click", ()=>{
        ta.value = "";
        localStorage.removeItem(key);
        miniToast("메모 비움");
      });

      // history click to load
      histList && histList.addEventListener("click", (e)=>{
        const item = e.target.closest(".memo-history-item");
        if(!item) return;
        const idx = Number(item.getAttribute("data-memo-idx"));
        const arr = loadHist();
        const it = arr[idx];
        if(it && typeof it.text === "string"){
          ta.value = it.text;
          localStorage.setItem(key, it.text);
          miniToast("메모 불러옴");
        }
      });

      // template chips insert
      chips && chips.forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const ins = btn.getAttribute("data-memo-insert") || "";
          const start = ta.selectionStart ?? ta.value.length;
          const end = ta.selectionEnd ?? ta.value.length;
          const before = ta.value.slice(0, start);
          const after = ta.value.slice(end);
          const glue = (before && !before.endsWith("\n")) ? "\n" : "";
          ta.value = before + glue + ins + after;
          const pos = (before + glue + ins).length;
          ta.focus();
          ta.setSelectionRange(pos, pos);
        });
      });

      // append analysis summary
      btnAppend && btnAppend.addEventListener("click", ()=>{
        const line = buildAnalysisLine();
        if(!line){
          miniToast("먼저 '분석 실행'을 눌러주세요");
          return;
        }
        const cur = (ta.value||"").trim();
        ta.value = cur ? (cur + "\n" + line) : line;
        localStorage.setItem(key, ta.value.trim());
        addHist(ta.value.trim());
        renderHist();
        miniToast("분석 요약 추가");
      });

      // copy to clipboard
      btnCopy && btnCopy.addEventListener("click", async ()=>{
        const v = (ta.value||"").trim();
        if(!v){ miniToast("복사할 메모가 없습니다"); return; }
        try{
          await navigator.clipboard.writeText(v);
          miniToast("메모 복사됨");
        }catch(e){
          // fallback
          try{
            ta.focus();
            ta.select();
            document.execCommand("copy");
            miniToast("메모 복사됨");
          }catch(e2){
            miniToast("복사 실패");
          }finally{
            ta.setSelectionRange(ta.value.length, ta.value.length);
          }
        }
      });
    }

  }catch(e){}
})();



/* ===== Risk Management Calculator (v13.1) ===== */
function _num(v){
  if(v==null) return NaN;
  const s = String(v).replace(/[,\s]/g,'');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}
function _fmt(n){
  if(!Number.isFinite(n)) return "-";
  try { return Math.round(n).toLocaleString('ko-KR'); } catch(e){ return String(Math.round(n)); }
}
function setRiskMode(mode){
  const map = { stop: "riskStop", fixed: "riskFixed", kelly: "riskKelly" };
  const btns = { stop:"rModeStop", fixed:"rModeFixed", kelly:"rModeKelly" };
  Object.keys(map).forEach(k=>{
    const wrap = document.getElementById(map[k]);
    if(wrap) wrap.style.display = (k===mode) ? "block" : "none";
    const b = document.getElementById(btns[k]);
    if(b){
      if(k===mode) b.classList.add("active");
      else b.classList.remove("active");
    }
  });
}
function calcRiskStop(){
  const bankroll = _num(document.getElementById("rBankroll1")?.value);
  const lossPct = _num(document.getElementById("rLossPct")?.value);
  const stopPct = _num(document.getElementById("rStopPct")?.value);
  const out = document.getElementById("riskStopOut");
  const hint = document.getElementById("riskStopHint");
  if(!out||!hint) return;

  if(!Number.isFinite(bankroll) || bankroll<=0 || !Number.isFinite(lossPct) || lossPct<=0){
    out.textContent = "총 자본과 손실 한도 %를 입력해줘.";
    hint.textContent = "";
    return;
  }
  const lossLimit = bankroll * (lossPct/100);
  const triggerPct = (Number.isFinite(stopPct) && stopPct>0) ? stopPct : 80;
  const stopAt = lossLimit * (triggerPct/100);

  const suggest1 = bankroll * 0.01;
  const suggest2 = bankroll * 0.02;

  out.textContent = `손실 한도: ${_fmt(lossLimit)}원  ·  중단 기준: -${_fmt(stopAt)}원`;
  hint.textContent = `참고: 1% 비중=${_fmt(suggest1)}원 / 2% 비중=${_fmt(suggest2)}원 (상황에 따라 더 낮게 권장)`;
}
function presetStake(pct){
  const el = document.getElementById("rStakePct");
  if(el) el.value = String(pct);
  calcRiskFixed();
}
function calcRiskFixed(){
  const bankroll = _num(document.getElementById("rBankroll2")?.value);
  const stakePct = _num(document.getElementById("rStakePct")?.value);
  const out = document.getElementById("riskFixedOut");
  const hint = document.getElementById("riskFixedHint");
  if(!out||!hint) return;

  if(!Number.isFinite(bankroll) || bankroll<=0 || !Number.isFinite(stakePct) || stakePct<=0){
    out.textContent = "총 자본과 베팅 비중 %를 입력해줘.";
    hint.textContent = "";
    return;
  }
  const stake = bankroll * (stakePct/100);
  out.textContent = `추천 1회 베팅액(고정 ${stakePct}%): ${_fmt(stake)}원`;
  hint.textContent = `참고: 연패/변동 구간이면 비중을 절반으로 낮추는게 안전합니다.`;
}
function calcRiskKelly(){
  const bankroll = _num(document.getElementById("rBankroll3")?.value);
  const odds = _num(document.getElementById("rOdds")?.value);
  const winPct = _num(document.getElementById("rWinPct")?.value);
  const factorPct = _num(document.getElementById("rKellyFactor")?.value);
  const maxPct = _num(document.getElementById("rMaxPct")?.value);

  const out = document.getElementById("riskKellyOut");
  const hint = document.getElementById("riskKellyHint");
  if(!out||!hint) return;

  if(!Number.isFinite(bankroll) || bankroll<=0 || !Number.isFinite(odds) || odds<=1 || !Number.isFinite(winPct) || winPct<=0){
    out.textContent = "총 자본 / 배당(Decimal) / 승률% 를 입력해줘.";
    hint.textContent = "";
    return;
  }
  const p = Math.min(Math.max(winPct/100, 0.0001), 0.9999);
  const b = odds - 1;
  const breakeven = 1/odds;

  // full Kelly fraction
  let f = (b*p - (1-p)) / b; // = (odds*p - 1)/(odds-1)
  if(!Number.isFinite(f) || f < 0) f = 0;
  const kellyPct = f * 100;

  const factor = (Number.isFinite(factorPct) && factorPct>0) ? (factorPct/100) : 0.25;
  let conservative = f * factor;

  const cap = (Number.isFinite(maxPct) && maxPct>0) ? (maxPct/100) : 0.03;
  const finalFrac = Math.min(conservative, cap);

  const stake = bankroll * finalFrac;

  if(f<=0){
    out.textContent = `엣지 없음(손익분기 ${Math.round(breakeven*1000)/10}% 이상 필요) → 추천 0원`;
    hint.textContent = `승률 추정(${Math.round(p*1000)/10}%)이 손익분기보다 낮습니다. 과몰입 방지 차원에서 패스 권장.`;
    return;
  }

  out.textContent = `풀 켈리 ${Math.round(kellyPct*10)/10}% → 보수(${Math.round(factor*100)}%) 적용 ${Math.round(conservative*1000)/10}% (상한 ${Math.round(cap*1000)/10}%) · 추천 ${_fmt(stake)}원`;
  hint.textContent = `손익분기 승률: ${Math.round(breakeven*1000)/10}% · 승률 추정치가 불확실하면 보수 배수/상한을 더 낮춰주세요.`;
}

// defaults
document.addEventListener("DOMContentLoaded", ()=>{
  // sane defaults (빈칸이면 불필요한 자동 계산 방지)
  const rLossPct = document.getElementById("rLossPct"); if(rLossPct && !rLossPct.value) rLossPct.value = "5";
  const rStopPct = document.getElementById("rStopPct"); if(rStopPct && !rStopPct.value) rStopPct.value = "80";
  const rKellyFactor = document.getElementById("rKellyFactor"); if(rKellyFactor && !rKellyFactor.value) rKellyFactor.value = "25";
  const rMaxPct = document.getElementById("rMaxPct"); if(rMaxPct && !rMaxPct.value) rMaxPct.value = "3";
});


/* === Insight/Memo Tabs + Quick Memo persistence === */
(function initInsightMemoTabs(){
  const sec = document.getElementById("insightMemoSection");
  if(!sec) return;

  const tabs = Array.from(sec.querySelectorAll(".im-tab[data-imtab]"));
  const panels = Array.from(sec.querySelectorAll(".im-panel[data-impanel]"));
  if(!tabs.length || !panels.length) return;

  const KEY = "insightMemoTab";

  function setTab(name){
    tabs.forEach(btn=>{
      const active = btn.dataset.imtab === name;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.tabIndex = active ? 0 : -1;
    });
    panels.forEach(p=>{
      const active = p.dataset.impanel === name;
      p.classList.toggle("active", active);
      p.hidden = !active;
    });
    try{ localStorage.setItem(KEY, name); }catch(e){}
  }

  let saved = null;
  try{ saved = localStorage.getItem(KEY); }catch(e){}
  const valid = saved && panels.some(p=>p.dataset.impanel === saved);
  setTab(valid ? saved : "insight");

  tabs.forEach(btn=>{
    btn.addEventListener("click", ()=> setTab(btn.dataset.imtab));
    btn.addEventListener("keydown", (e)=>{
      if(e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const i = tabs.indexOf(document.activeElement);
      if(i < 0) return;
      const ni = (e.key === "ArrowRight") ? (i+1) % tabs.length : (i-1+tabs.length) % tabs.length;
      tabs[ni].focus();
    });
  });
})();

(function initQuickMemo(){
  const ta = document.getElementById("quickMemoText");
  const save = document.getElementById("quickMemoSave");
  const clear = document.getElementById("quickMemoClear");
  if(!ta || !save || !clear) return;

  const KEY = "quickMemoText";
  try{
    const v = localStorage.getItem(KEY);
    if(v != null) ta.value = v;
  }catch(e){}

  save.addEventListener("click", ()=>{
    try{ localStorage.setItem(KEY, ta.value || ""); }catch(e){}
    if(typeof toast === "function") toast("메모 저장됨");
  });

  clear.addEventListener("click", ()=>{
    ta.value = "";
    try{ localStorage.removeItem(KEY); }catch(e){}
    if(typeof toast === "function") toast("메모 비움");
  });
})();
