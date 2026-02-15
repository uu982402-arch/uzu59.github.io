/* tool-virtual/index.html inline#1 (v30) */
(function(){
  "use strict";

  const $ = (id)=>document.getElementById(id);
  const on = (el, ev, fn)=> el && el.addEventListener(ev, fn, {passive:true});

  function num(v){
    const x = parseFloat(String(v ?? "").replace(/,/g,"").trim());
    return (Number.isFinite(x) ? x : NaN);
  }
  function okOdds(o){ return Number.isFinite(o) && o > 1.0000001; }
  function okPct(p){ return Number.isFinite(p) && p >= 0 && p <= 100; }
  function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }

  function fmtN(x, d=3){ return Number.isFinite(x) ? x.toFixed(d) : "-"; }
  function fmtPct(x, d=2){ return Number.isFinite(x) ? (x*100).toFixed(d)+"%" : "-"; }
  function fmtPct100(x, d=2){ return Number.isFinite(x) ? x.toFixed(d)+"%" : "-"; }
  function fmtMoney(x){
    if(!Number.isFinite(x)) return "-";
    const s = Math.round(x).toString();
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // --- Presets (coverage-first, generic enough to match bet365 virtuals)
  const SPORTS = [
    {
      key:"soccer", name:"가상축구",
      markets:[
        {key:"1x2", name:"승/무/패 (1X2)", type:"fixed", outcomes:["승","무","패"]},
        {key:"ou",  name:"오버/언더 (총 득점)", type:"fixed", outcomes:["오버","언더"], line:{label:"기준(예: 2.5)", placeholder:"예: 2.5"} },
        {key:"btts",name:"양팀득점(BTTS)", type:"fixed", outcomes:["예","아니오"]},
        {key:"hc",  name:"핸디캡/스프레드 (2-way)", type:"fixed", outcomes:["홈","원정"], line:{label:"핸디(예: -0.5)", placeholder:"예: -0.5"} },
        {key:"cs",  name:"정확한 스코어 (다중)", type:"list", hint:"예: 0-0 8.0\n예: 1-0 6.5\n예: 2-1 9.0"}
      ]
    },
    {
      key:"basket", name:"가상농구",
      markets:[
        {key:"ml",  name:"승/패 (2-way)", type:"fixed", outcomes:["홈","원정"]},
        {key:"ou",  name:"오버/언더 (총 득점)", type:"fixed", outcomes:["오버","언더"], line:{label:"기준(예: 165.5)", placeholder:"예: 165.5"} },
        {key:"spread", name:"핸디캡/스프레드", type:"fixed", outcomes:["홈","원정"], line:{label:"핸디(예: -3.5)", placeholder:"예: -3.5"} }
      ]
    },
    {
      key:"tennis", name:"가상테니스",
      markets:[
        {key:"ml", name:"승/패 (2-way)", type:"fixed", outcomes:["선수A","선수B"]},
        {key:"ou", name:"오버/언더 (총 게임)", type:"fixed", outcomes:["오버","언더"], line:{label:"기준(예: 21.5)", placeholder:"예: 21.5"} },
        {key:"set", name:"세트 핸디(2-way)", type:"fixed", outcomes:["선수A","선수B"], line:{label:"핸디(예: -1.5)", placeholder:"예: -1.5"} }
      ]
    },
    {
      key:"hockey", name:"가상아이스하키",
      markets:[
        {key:"1x2", name:"승/무/패 (정규)", type:"fixed", outcomes:["승","무","패"]},
        {key:"ml",  name:"승/패 (OT 포함)", type:"fixed", outcomes:["홈","원정"]},
        {key:"ou",  name:"오버/언더 (총 득점)", type:"fixed", outcomes:["오버","언더"], line:{label:"기준(예: 5.5)", placeholder:"예: 5.5"} },
        {key:"hc",  name:"핸디캡/스프레드", type:"fixed", outcomes:["홈","원정"], line:{label:"핸디(예: -1.5)", placeholder:"예: -1.5"} }
      ]
    },
    {
      key:"baseball", name:"가상야구",
      markets:[
        {key:"ml",  name:"승/패 (2-way)", type:"fixed", outcomes:["홈","원정"]},
        {key:"ou",  name:"오버/언더 (총 득점)", type:"fixed", outcomes:["오버","언더"], line:{label:"기준(예: 8.5)", placeholder:"예: 8.5"} },
        {key:"runline", name:"런라인/핸디캡", type:"fixed", outcomes:["홈","원정"], line:{label:"핸디(예: -1.5)", placeholder:"예: -1.5"} }
      ]
    },
    {
      key:"amfootball", name:"가상미식축구",
      markets:[
        {key:"ml",  name:"승/패 (2-way)", type:"fixed", outcomes:["홈","원정"]},
        {key:"ou",  name:"오버/언더 (총 점수)", type:"fixed", outcomes:["오버","언더"], line:{label:"기준(예: 44.5)", placeholder:"예: 44.5"} },
        {key:"spread", name:"스프레드", type:"fixed", outcomes:["홈","원정"], line:{label:"핸디(예: -6.5)", placeholder:"예: -6.5"} }
      ]
    },
    {
      key:"cricket", name:"가상크리켓",
      markets:[
        {key:"ml", name:"승/패 (2-way)", type:"fixed", outcomes:["팀A","팀B"]},
        {key:"ou", name:"오버/언더 (총 득점)", type:"fixed", outcomes:["오버","언더"], line:{label:"기준(예: 312.5)", placeholder:"예: 312.5"} }
      ]
    },
    {
      key:"racing", name:"가상경마/레이싱",
      markets:[
        {key:"win", name:"우승자(다중)", type:"list", hint:"예: 1번말 6.5\n예: 2번말 4.2\n예: 3번말 9.0"},
        {key:"place", name:"입상/플레이스(다중)", type:"list", hint:"예: 1번말 2.10\n예: 2번말 1.85\n예: 3번말 2.60"}
      ]
    },
    {
      key:"greyhound", name:"가상그레이하운드",
      markets:[
        {key:"win", name:"우승자(다중)", type:"list", hint:"예: 1번 5.5\n예: 2번 3.9\n예: 3번 8.0"}
      ]
    },
    {
      key:"motors", name:"가상모터/카 레이싱",
      markets:[
        {key:"winner", name:"우승자(다중)", type:"list", hint:"예: 1번차 7.0\n예: 2번차 4.5\n예: 3번차 10.0"},
        {key:"h2h", name:"매치업(2-way)", type:"fixed", outcomes:["선수/차량A","선수/차량B"]}
      ]
    },
    {
      key:"speedway", name:"가상스피드웨이",
      markets:[
        {key:"winner", name:"우승자(다중)", type:"list", hint:"예: 라이더1 6.0\n예: 라이더2 4.0\n예: 라이더3 9.5"},
        {key:"h2h", name:"매치업(2-way)", type:"fixed", outcomes:["A","B"]}
      ]
    },
    {
      key:"cycle", name:"가상사이클",
      markets:[
        {key:"winner", name:"우승자(다중)", type:"list", hint:"예: 선수1 7.0\n예: 선수2 4.5\n예: 선수3 10.0"},
        {key:"h2h", name:"매치업(2-way)", type:"fixed", outcomes:["A","B"]}
      ]
    },
    {
      key:"other", name:"기타(커스텀)",
      markets:[
        {key:"2way", name:"2-way (승/패, 오버/언더 등)", type:"fixed", outcomes:["선택A","선택B"]},
        {key:"3way", name:"3-way (승/무/패 등)", type:"fixed", outcomes:["선택A","무","선택B"]},
        {key:"multi", name:"다중 선택/우승자", type:"list", hint:"예: 선택1 6.5\n예: 선택2 4.2\n예: 선택3 9.0"}
      ]
    }
  ];

  // --- DOM
  const sportSelect = $("sportSelect");
  const marketSelect = $("marketSelect");
  const lineWrap = $("lineWrap");
  const lineLabel = $("lineLabel");
  const lineValue = $("lineValue");

  const stakeBase = $("stakeBase");
  const bankroll = $("bankroll");
  const kellyFrac = $("kellyFrac");
  const kellyFracVal = $("kellyFracVal");
  const maxStakePct = $("maxStakePct");
  const maxStakePctVal = $("maxStakePctVal");

  const fixedWrap = $("fixedWrap");
  const listWrap = $("listWrap");
  const listInput = $("listInput");
  const listHint = $("listHint");
  const listStatus = $("listStatus");

  const rowsBody = $("rowsBody");

  const overroundEl = $("overround");
  const marginEl = $("margin");
  const marketLineEl = $("marketLine");
  const bestPickEl = $("bestPick");
  const explainEl = $("explain");
  const healthChip = $("healthChip");

  const calcBtn = $("calcBtn");
  const resetBtn = $("resetBtn");

  // --- State
  let state = {
    sportKey: "soccer",
    marketKey: "1x2",
    rows: [] // {label, odds, p}
  };

  function getSport(key){ return SPORTS.find(s=>s.key===key) || SPORTS[0]; }
  function getMarket(sportKey, marketKey){
    const s = getSport(sportKey);
    return s.markets.find(m=>m.key===marketKey) || s.markets[0];
  }

  // --- UI builders
  function fillSportOptions(){
    if(!sportSelect) return;
    sportSelect.innerHTML = "";
    SPORTS.forEach(s=>{
      const opt = document.createElement("option");
      opt.value = s.key;
      opt.textContent = s.name;
      sportSelect.appendChild(opt);
    });
    sportSelect.value = state.sportKey;
  }

  function fillMarketOptions(){
    if(!marketSelect) return;
    const s = getSport(state.sportKey);
    marketSelect.innerHTML = "";
    s.markets.forEach(m=>{
      const opt = document.createElement("option");
      opt.value = m.key;
      opt.textContent = m.name;
      marketSelect.appendChild(opt);
    });
    const exists = s.markets.some(m=>m.key===state.marketKey);
    state.marketKey = exists ? state.marketKey : s.markets[0].key;
    marketSelect.value = state.marketKey;
  }

  function makeInput(cls, placeholder, value){
    const inp = document.createElement("input");
    inp.className = "in mono";
    if(cls) inp.classList.add(cls);
    inp.inputMode = "decimal";
    inp.placeholder = placeholder || "";
    inp.value = value ?? "";
    return inp;
  }

  function clearRows(){
    state.rows = [];
    if(rowsBody) rowsBody.innerHTML = "";
  }

  function buildFixedRows(outcomes){
    clearRows();
    outcomes.forEach((label, idx)=>{
      state.rows.push({label, odds: NaN, p: NaN});
      const tr = document.createElement("tr");
      tr.dataset.idx = String(idx);

      const tdLabel = document.createElement("td");
      tdLabel.textContent = label;

      const tdOdds = document.createElement("td");
      const inpOdds = makeInput("", "예: 1.95", "");
      inpOdds.dataset.field = "odds";
      inpOdds.dataset.idx = String(idx);
      tdOdds.appendChild(inpOdds);

      const tdP = document.createElement("td");
      const inpP = makeInput("", "선택", "");
      inpP.dataset.field = "p";
      inpP.dataset.idx = String(idx);
      tdP.appendChild(inpP);

      const tdImp = document.createElement("td"); tdImp.className="mono"; tdImp.id = `imp_${idx}`; tdImp.textContent="-";
      const tdFairP = document.createElement("td"); tdFairP.className="mono"; tdFairP.id = `fairp_${idx}`; tdFairP.textContent="-";
      const tdFairO = document.createElement("td"); tdFairO.className="mono"; tdFairO.id = `fairo_${idx}`; tdFairO.textContent="-";
      const tdEV = document.createElement("td"); tdEV.className="mono"; tdEV.id = `ev_${idx}`; tdEV.textContent="-";
      const tdK = document.createElement("td"); tdK.className="mono"; tdK.id = `k_${idx}`; tdK.textContent="-";
      const tdRec = document.createElement("td"); tdRec.className="mono"; tdRec.id = `rec_${idx}`; tdRec.textContent="-";
      const tdAmt = document.createElement("td"); tdAmt.className="mono"; tdAmt.id = `amt_${idx}`; tdAmt.textContent="-";
      const tdEVAmt = document.createElement("td"); tdEVAmt.className="mono"; tdEVAmt.id = `evamt_${idx}`; tdEVAmt.textContent="-";

      tr.append(tdLabel, tdOdds, tdP, tdImp, tdFairP, tdFairO, tdEV, tdK, tdRec, tdAmt, tdEVAmt);
      rowsBody && rowsBody.appendChild(tr);
    });
  }

  function parseListLines(text){
    const lines = String(text||"").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const items = [];
    for(const line of lines){
      // allow: "label odds" or "label,odds" or "odds label"
      const parts = line.split(/[\t,]+/).map(s=>s.trim()).filter(Boolean);
      let label = "", oddsStr = "";
      if(parts.length >= 2){
        // if first is number => odds then label is rest
        const a = num(parts[0]);
        const b = num(parts[parts.length-1]);
        if(okOdds(a) && !okOdds(b)){
          oddsStr = parts[0];
          label = parts.slice(1).join(" ");
        }else if(okOdds(b)){
          oddsStr = parts[parts.length-1];
          label = parts.slice(0,-1).join(" ");
        }else{
          // fallback: split by whitespace and take last token as odds if possible
          const ws = line.split(/\s+/);
          const last = num(ws[ws.length-1]);
          if(okOdds(last)){
            oddsStr = ws[ws.length-1];
            label = ws.slice(0,-1).join(" ");
          }else{
            continue;
          }
        }
      }else{
        const ws = line.split(/\s+/);
        if(ws.length>=2 && okOdds(num(ws[ws.length-1]))){
          oddsStr = ws[ws.length-1];
          label = ws.slice(0,-1).join(" ");
        }else{
          continue;
        }
      }
      const odds = num(oddsStr);
      if(!okOdds(odds)) continue;
      items.push({label: label || `선택 ${items.length+1}`, odds});
    }
    return items;
  }

  function buildListRows(items){
    clearRows();
    items.forEach((it, idx)=>{
      state.rows.push({label: it.label, odds: it.odds, p: NaN});
      const tr = document.createElement("tr");
      tr.dataset.idx = String(idx);

      const tdLabel = document.createElement("td");
      tdLabel.textContent = it.label;

      const tdOdds = document.createElement("td");
      const inpOdds = makeInput("", "예: 6.50", String(it.odds));
      inpOdds.dataset.field = "odds";
      inpOdds.dataset.idx = String(idx);
      tdOdds.appendChild(inpOdds);

      const tdP = document.createElement("td");
      const inpP = makeInput("", "선택", "");
      inpP.dataset.field = "p";
      inpP.dataset.idx = String(idx);
      tdP.appendChild(inpP);

      const tdImp = document.createElement("td"); tdImp.className="mono"; tdImp.id = `imp_${idx}`; tdImp.textContent="-";
      const tdFairP = document.createElement("td"); tdFairP.className="mono"; tdFairP.id = `fairp_${idx}`; tdFairP.textContent="-";
      const tdFairO = document.createElement("td"); tdFairO.className="mono"; tdFairO.id = `fairo_${idx}`; tdFairO.textContent="-";
      const tdEV = document.createElement("td"); tdEV.className="mono"; tdEV.id = `ev_${idx}`; tdEV.textContent="-";
      const tdK = document.createElement("td"); tdK.className="mono"; tdK.id = `k_${idx}`; tdK.textContent="-";
      const tdRec = document.createElement("td"); tdRec.className="mono"; tdRec.id = `rec_${idx}`; tdRec.textContent="-";
      const tdAmt = document.createElement("td"); tdAmt.className="mono"; tdAmt.id = `amt_${idx}`; tdAmt.textContent="-";
      const tdEVAmt = document.createElement("td"); tdEVAmt.className="mono"; tdEVAmt.id = `evamt_${idx}`; tdEVAmt.textContent="-";

      tr.append(tdLabel, tdOdds, tdP, tdImp, tdFairP, tdFairO, tdEV, tdK, tdRec, tdAmt, tdEVAmt);
      rowsBody && rowsBody.appendChild(tr);
    });
  }

  function setLineUI(market){
    if(!lineWrap || !lineLabel || !lineValue) return;
    if(market.line){
      lineWrap.style.display = "";
      lineLabel.textContent = market.line.label || "기준";
      lineValue.placeholder = market.line.placeholder || "";
    }else{
      lineWrap.style.display = "none";
      lineValue.value = "";
    }
  }

  function render(){
    fillSportOptions();
    fillMarketOptions();

    const sport = getSport(state.sportKey);
    const market = getMarket(state.sportKey, state.marketKey);

    setLineUI(market);

    // toggle list/fixed
    const isList = market.type === "list";
    if(fixedWrap) fixedWrap.style.display = isList ? "none" : "";
    if(listWrap) listWrap.style.display = isList ? "" : "none";

    if(isList){
      if(listHint) listHint.textContent = market.hint || "예: 선택1 6.5";
      if(listInput && !listInput.value.trim()){
        listInput.value = market.hint ? market.hint : "";
      }
      const items = parseListLines(listInput ? listInput.value : "");
      buildListRows(items);
      if(listStatus){
        listStatus.textContent = items.length ? `파싱됨: ${items.length}개 선택` : "배당을 붙여넣으면 자동으로 선택 목록이 생성됩니다.";
      }
    }else{
      buildFixedRows(market.outcomes || ["선택A","선택B"]);
    }

    updateMarketLineLabel();
    recalc();
  }

  function updateMarketLineLabel(){
    const sport = getSport(state.sportKey);
    const market = getMarket(state.sportKey, state.marketKey);
    const line = (market.line && lineValue && String(lineValue.value||"").trim()) ? ` / ${lineValue.value.trim()}` : "";
    if(marketLineEl) marketLineEl.textContent = `${sport.name} · ${market.name}${line}`;
  }

  // --- Calculation
  let rafPending = false;
  function scheduleRecalc(){
    if(rafPending) return;
    rafPending = true;
    requestAnimationFrame(()=>{
      rafPending = false;
      recalc();
    });
  }

  function readRowInputs(){
    const inputs = rowsBody ? rowsBody.querySelectorAll("input[data-field]") : [];
    inputs.forEach(inp=>{
      const idx = parseInt(inp.dataset.idx || "0", 10);
      const field = inp.dataset.field;
      if(!state.rows[idx]) return;
      const v = num(inp.value);
      if(field === "odds"){
        state.rows[idx].odds = v;
      }else if(field === "p"){
        state.rows[idx].p = v;
      }
    });
  }

  function setChip(kind, text){
    if(!healthChip) return;
    healthChip.className = `chip ${kind}`;
    healthChip.textContent = text;
  }

  function recalc(){
    readRowInputs();
    updateMarketLineLabel();

    const rows = state.rows || [];
    const oddsArr = rows.map(r=> r.odds).filter(okOdds);

    if(!oddsArr.length){
      if(overroundEl) overroundEl.textContent = "-";
      if(marginEl) marginEl.textContent = "-";
      if(bestPickEl) bestPickEl.textContent = "-";
      setChip("neu","입력 대기");
      // clear per-row
      rows.forEach((r, idx)=>{
        const ids = ["imp_","fairp_","fairo_","ev_","k_","rec_","amt_","evamt_"];
        ids.forEach(prefix=>{
          const el = $(prefix+idx);
          if(el) el.textContent = "-";
        });
        const tr = rowsBody && rowsBody.querySelector(`tr[data-idx="${idx}"]`);
        if(tr){ tr.classList.remove("row-good","row-bad"); }
      });
      return;
    }

    // sum implied probs
    const implied = rows.map(r=> okOdds(r.odds) ? 1/r.odds : NaN);
    const sumImp = implied.reduce((a,x)=> a + (Number.isFinite(x) ? x : 0), 0);

    if(overroundEl) overroundEl.textContent = fmtN(sumImp, 4);
    if(marginEl) marginEl.textContent = Number.isFinite(sumImp) ? fmtPct(sumImp-1, 2) : "-";

    const stake = num(stakeBase ? stakeBase.value : "");
    const stakeOk = Number.isFinite(stake) && stake >= 0;
    const br = num(bankroll ? bankroll.value : "");
    const brOk = Number.isFinite(br) && br > 0;

    const kf = clamp(num(kellyFrac ? kellyFrac.value : 0.25), 0, 1);
    const capPct = clamp(num(maxStakePct ? maxStakePct.value : 5), 0, 100);
    if(kellyFracVal) kellyFracVal.textContent = kf.toFixed(2);
    if(maxStakePctVal) maxStakePctVal.textContent = String(Math.round(capPct));

    // Per row
    let best = {idx:-1, ev:-Infinity};
    let anyProb = false;
    for(let i=0;i<rows.length;i++){
      const r = rows[i];
      const o = r.odds;
      const imp = okOdds(o) ? 1/o : NaN;
      const fairP = (Number.isFinite(imp) && sumImp>0) ? imp/sumImp : NaN;
      const fairO = Number.isFinite(fairP) && fairP>0 ? 1/fairP : NaN;

      const pPct = r.p;
      const p = okPct(pPct) ? pPct/100 : NaN;

      const ev = (Number.isFinite(p) && okOdds(o)) ? (p*o - 1) : NaN;
      const kellyRaw = (Number.isFinite(ev) && (o-1)>0) ? (ev/(o-1)) : NaN;
      const kellyClamped = Number.isFinite(kellyRaw) ? clamp(kellyRaw, 0, 1) : NaN;
      const kellyCons = Number.isFinite(kellyClamped) ? kellyClamped * kf : NaN;
      const recFrac = Number.isFinite(kellyCons) ? Math.min(kellyCons, capPct/100) : NaN;

      const recAmt = (brOk && Number.isFinite(recFrac)) ? br*recFrac : NaN;
      const evAmt = (stakeOk && Number.isFinite(ev)) ? stake*ev : NaN;

      if(Number.isFinite(ev)){
        anyProb = true;
        if(ev > best.ev){
          best = {idx:i, ev};
        }
      }

      const setText = (id, txt)=>{ const el=$(id); if(el) el.textContent = txt; };

      setText(`imp_${i}`, fmtPct(imp, 2));
      setText(`fairp_${i}`, fmtPct(fairP, 2));
      setText(`fairo_${i}`, fmtN(fairO, 3));
      setText(`ev_${i}`, Number.isFinite(ev) ? fmtPct(ev, 2) : "-");
      setText(`k_${i}`, Number.isFinite(kellyClamped) ? fmtPct(kellyClamped, 2) : "-");
      setText(`rec_${i}`, Number.isFinite(recFrac) ? fmtPct(recFrac, 2) : "-");
      setText(`amt_${i}`, Number.isFinite(recAmt) ? fmtMoney(recAmt) : "-");
      setText(`evamt_${i}`, Number.isFinite(evAmt) ? fmtMoney(evAmt) : "-");

      const tr = rowsBody && rowsBody.querySelector(`tr[data-idx="${i}"]`);
      if(tr){
        tr.classList.remove("row-good","row-bad");
        if(Number.isFinite(ev)){
          if(ev > 0) tr.classList.add("row-good");
          else if(ev < 0) tr.classList.add("row-bad");
        }
      }
    }

    if(bestPickEl){
      if(best.idx>=0){
        const r = rows[best.idx];
        const tag = (best.ev>0) ? " +EV" : " -EV";
        bestPickEl.textContent = `${r.label}${tag} (${fmtPct(best.ev, 2)})`;
      }else{
        bestPickEl.textContent = "내 확률 입력 시 자동 추천";
      }
    }

    // Health chip
    if(!Number.isFinite(sumImp) || sumImp<=0){
      setChip("bad","입력값 점검 필요");
    }else if(sumImp < 1){
      setChip("neu","마진 음수(이상치) — 배당 확인");
    }else{
      const m = (sumImp-1)*100;
      if(m >= 8) setChip("bad", `마진 높음 ${m.toFixed(1)}%`);
      else if(m >= 4) setChip("neu", `마진 보통 ${m.toFixed(1)}%`);
      else setChip("good", `마진 낮음 ${m.toFixed(1)}%`);
    }

    // Explain
    if(explainEl){
      if(anyProb){
        explainEl.innerHTML = "EV/켈리 계산은 <b>내 확률</b> 입력 항목만 반영됩니다. 공정확률/공정배당은 모든 배당 입력값으로 계산됩니다.";
      }else{
        explainEl.innerHTML = "EV/켈리까지 보려면 각 선택의 <b>내 확률(%)</b>을 입력하세요. (예: 55)";
      }
    }
  }

  // --- Events
  function bind(){
    on(sportSelect, "change", ()=>{
      state.sportKey = sportSelect.value;
      state.marketKey = getSport(state.sportKey).markets[0].key;
      render();
    });

    on(marketSelect, "change", ()=>{
      state.marketKey = marketSelect.value;
      render();
    });

    // Quick presets
    document.querySelectorAll("[data-preset]").forEach(el=>{
      el.addEventListener("click", ()=>{
        const v = el.getAttribute("data-preset") || "";
        const [s,m] = v.split(":");
        if(!s || !m) return;
        state.sportKey = s;
        state.marketKey = m;
        if(sportSelect) sportSelect.value = s;
        fillMarketOptions();
        if(marketSelect) marketSelect.value = m;
        render();
      }, {passive:true});
    });

    // Recalc triggers
    ["input","change"].forEach(ev=>{
      on(rowsBody, ev, (e)=>{
        const t = e && e.target;
        if(t && t.matches && t.matches("input[data-field]")) scheduleRecalc();
      });
      on(lineValue, ev, scheduleRecalc);
      on(stakeBase, ev, scheduleRecalc);
      on(bankroll, ev, scheduleRecalc);
      on(kellyFrac, ev, scheduleRecalc);
      on(maxStakePct, ev, scheduleRecalc);
      on(listInput, ev, ()=>{
        // rebuild list rows for list markets
        const market = getMarket(state.sportKey, state.marketKey);
        if(market.type === "list"){
          const items = parseListLines(listInput ? listInput.value : "");
          buildListRows(items);
          if(listStatus){
            listStatus.textContent = items.length ? `파싱됨: ${items.length}개 선택` : "배당을 붙여넣으면 자동으로 선택 목록이 생성됩니다.";
          }
          scheduleRecalc();
        }
      });
    });

    on(calcBtn, "click", ()=>recalc());
    on(resetBtn, "click", ()=>{
      state.sportKey = "soccer";
      state.marketKey = "1x2";
      if(sportSelect) sportSelect.value = state.sportKey;
      fillMarketOptions();
      if(marketSelect) marketSelect.value = state.marketKey;
      if(lineValue) lineValue.value = "";
      if(stakeBase) stakeBase.value = "10000";
      if(bankroll) bankroll.value = "200000";
      if(kellyFrac) kellyFrac.value = "0.25";
      if(maxStakePct) maxStakePct.value = "5";
      if(listInput) listInput.value = "";
      render();
      setChip("neu","초기화됨");
    });
  }

  // init
  try{
    fillSportOptions();
    fillMarketOptions();
    bind();
    render();
  }catch(e){
    // never break page
    console && console.error && console.error("[tool-virtual] init error", e);
  }
})();