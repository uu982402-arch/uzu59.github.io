/* tool-virtual/index.html inline#1 (v40) */
(function(){
  "use strict";

  const $ = (id)=>document.getElementById(id);
  const on = (el, ev, fn)=> el && el.addEventListener(ev, fn, {passive:true});

  function num(v){
    const x = parseFloat(String(v ?? "").replace(/,/g,"").trim());
    return (Number.isFinite(x) ? x : NaN);
  }
  function okOdds(o){ return Number.isFinite(o) && o > 1.0000001; }
  function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }

  function fmtN(x, d=3){ return Number.isFinite(x) ? x.toFixed(d) : "-"; }
  function fmtPct(x, d=2){ return Number.isFinite(x) ? (x*100).toFixed(d)+"%" : "-"; }

  // --- Presets (coverage-first)
  // type:
  //  - fixed: outcomes[] + optional line
  //  - list: paste lines like "label odds"
  //  - pairLines: paste lines like "line oddsA oddsB" (e.g., O/U multi)
  const SPORTS = [
    {
      key:"soccer", name:"가상축구",
      markets:[
        {key:"1x2", name:"승/무/패 (1X2)", type:"fixed", outcomes:["승","무","패"]},
        {key:"ou",  name:"오버/언더 (총 득점)", type:"fixed", outcomes:["오버","언더"], line:{label:"기준(예: 2.5)", placeholder:"예: 2.5"} },
        {key:"ou_lines", name:"오버/언더 (라인 여러개)", type:"pairLines", pair:{a:"오버", b:"언더"}, hint:"2.5 1.90 1.95\n3.5 2.10 1.70\n4.5 2.75 1.45"},
        {key:"btts",name:"양팀득점(BTTS)", type:"fixed", outcomes:["예","아니오"]},
        {key:"hc",  name:"핸디캡/스프레드 (2-way)", type:"fixed", outcomes:["홈","원정"], line:{label:"핸디(예: -0.5)", placeholder:"예: -0.5"} },
        {key:"cs",  name:"정확한 스코어 (다중)", type:"list", hint:"0-0 8.0\n1-0 6.5\n2-1 9.0\n2-2 12.0"}
      ]
    },
    {
      key:"basket", name:"가상농구",
      markets:[
        {key:"ml",  name:"승/패 (2-way)", type:"fixed", outcomes:["홈","원정"]},
        {key:"ou",  name:"오버/언더 (총 득점)", type:"fixed", outcomes:["오버","언더"], line:{label:"기준(예: 165.5)", placeholder:"예: 165.5"} },
        {key:"ou_lines", name:"오버/언더 (라인 여러개)", type:"pairLines", pair:{a:"오버", b:"언더"}, hint:"165.5 1.90 1.95\n169.5 2.05 1.78"},
        {key:"spread", name:"핸디캡/스프레드", type:"fixed", outcomes:["홈","원정"], line:{label:"핸디(예: -3.5)", placeholder:"예: -3.5"} }
      ]
    },
    {
      key:"tennis", name:"가상테니스",
      markets:[
        {key:"ml", name:"승/패 (2-way)", type:"fixed", outcomes:["선수A","선수B"]},
        {key:"ou", name:"오버/언더 (총 게임)", type:"fixed", outcomes:["오버","언더"], line:{label:"기준(예: 21.5)", placeholder:"예: 21.5"} },
        {key:"ou_lines", name:"오버/언더 (라인 여러개)", type:"pairLines", pair:{a:"오버", b:"언더"}, hint:"21.5 1.95 1.85\n22.5 2.10 1.72"},
        {key:"set", name:"세트 핸디(2-way)", type:"fixed", outcomes:["선수A","선수B"], line:{label:"핸디(예: -1.5)", placeholder:"예: -1.5"} }
      ]
    },
    {
      key:"hockey", name:"가상아이스하키",
      markets:[
        {key:"1x2", name:"승/무/패 (정규)", type:"fixed", outcomes:["승","무","패"]},
        {key:"ml",  name:"승/패 (OT 포함)", type:"fixed", outcomes:["홈","원정"]},
        {key:"ou",  name:"오버/언더 (총 득점)", type:"fixed", outcomes:["오버","언더"], line:{label:"기준(예: 5.5)", placeholder:"예: 5.5"} },
        {key:"ou_lines", name:"오버/언더 (라인 여러개)", type:"pairLines", pair:{a:"오버", b:"언더"}, hint:"5.5 1.90 1.95\n6.5 2.15 1.68"},
        {key:"hc",  name:"핸디캡/스프레드", type:"fixed", outcomes:["홈","원정"], line:{label:"핸디(예: -1.5)", placeholder:"예: -1.5"} }
      ]
    },
    {
      key:"baseball", name:"가상야구",
      markets:[
        {key:"ml",  name:"승/패 (2-way)", type:"fixed", outcomes:["홈","원정"]},
        {key:"ou",  name:"오버/언더 (총 득점)", type:"fixed", outcomes:["오버","언더"], line:{label:"기준(예: 8.5)", placeholder:"예: 8.5"} },
        {key:"ou_lines", name:"오버/언더 (라인 여러개)", type:"pairLines", pair:{a:"오버", b:"언더"}, hint:"8.5 1.90 1.95\n9.5 2.10 1.72"},
        {key:"runline", name:"런라인/핸디캡", type:"fixed", outcomes:["홈","원정"], line:{label:"핸디(예: -1.5)", placeholder:"예: -1.5"} }
      ]
    },
    {
      key:"amfootball", name:"가상미식축구",
      markets:[
        {key:"ml",  name:"승/패 (2-way)", type:"fixed", outcomes:["홈","원정"]},
        {key:"ou",  name:"오버/언더 (총 점수)", type:"fixed", outcomes:["오버","언더"], line:{label:"기준(예: 44.5)", placeholder:"예: 44.5"} },
        {key:"ou_lines", name:"오버/언더 (라인 여러개)", type:"pairLines", pair:{a:"오버", b:"언더"}, hint:"44.5 1.90 1.95\n47.5 2.05 1.78"},
        {key:"spread", name:"스프레드", type:"fixed", outcomes:["홈","원정"], line:{label:"핸디(예: -6.5)", placeholder:"예: -6.5"} }
      ]
    },
    {
      key:"cricket", name:"가상크리켓",
      markets:[
        {key:"ml", name:"승/패 (2-way)", type:"fixed", outcomes:["팀A","팀B"]},
        {key:"ou", name:"오버/언더 (총 득점)", type:"fixed", outcomes:["오버","언더"], line:{label:"기준(예: 312.5)", placeholder:"예: 312.5"} },
        {key:"ou_lines", name:"오버/언더 (라인 여러개)", type:"pairLines", pair:{a:"오버", b:"언더"}, hint:"312.5 1.92 1.92\n320.5 2.10 1.75"}
      ]
    },
    {
      key:"racing", name:"가상경마/레이싱",
      markets:[
        {key:"win", name:"우승자(다중)", type:"list", hint:"1번말 6.5\n2번말 4.2\n3번말 9.0\n4번말 12.0"},
        {key:"place", name:"입상/플레이스(다중)", type:"list", hint:"1번말 2.10\n2번말 1.85\n3번말 2.60"}
      ]
    },
    {
      key:"greyhound", name:"가상그레이하운드",
      markets:[
        {key:"win", name:"우승자(다중)", type:"list", hint:"1번 5.5\n2번 3.9\n3번 8.0\n4번 12.0"}
      ]
    },
    {
      key:"motors", name:"가상모터/카 레이싱",
      markets:[
        {key:"winner", name:"우승자(다중)", type:"list", hint:"1번차 7.0\n2번차 4.5\n3번차 10.0"},
        {key:"h2h", name:"매치업(2-way)", type:"fixed", outcomes:["A","B"]}
      ]
    },
    {
      key:"speedway", name:"가상스피드웨이",
      markets:[
        {key:"winner", name:"우승자(다중)", type:"list", hint:"라이더1 6.0\n라이더2 4.0\n라이더3 9.5"},
        {key:"h2h", name:"매치업(2-way)", type:"fixed", outcomes:["A","B"]}
      ]
    },
    {
      key:"cycle", name:"가상사이클",
      markets:[
        {key:"winner", name:"우승자(다중)", type:"list", hint:"선수1 7.0\n선수2 4.5\n선수3 10.0"},
        {key:"h2h", name:"매치업(2-way)", type:"fixed", outcomes:["A","B"]}
      ]
    },
    {
      key:"other", name:"기타(커스텀)",
      markets:[
        {key:"2way", name:"2-way (승/패 등)", type:"fixed", outcomes:["선택A","선택B"]},
        {key:"3way", name:"3-way (승/무/패 등)", type:"fixed", outcomes:["선택A","무","선택B"]},
        {key:"ou_lines", name:"오버/언더 (라인 여러개)", type:"pairLines", pair:{a:"오버", b:"언더"}, hint:"2.5 1.90 1.95\n3.5 2.10 1.70"},
        {key:"multi", name:"다중 선택/우승자", type:"list", hint:"선택1 6.5\n선택2 4.2\n선택3 9.0"}
      ]
    }
  ];

  // --- DOM
  const sportSelect = $("sportSelect");
  const marketSelect = $("marketSelect");
  const lineWrap = $("lineWrap");
  const lineLabel = $("lineLabel");
  const lineValue = $("lineValue");

  const pasteWrap = $("pasteWrap");
  const pasteDesc = $("pasteDesc");
  const pasteHint = $("pasteHint");
  const pasteInput = $("pasteInput");
  const pasteStatus = $("pasteStatus");

  const quickPasteWrap = $("quickPasteWrap");
  const quickPasteInput = $("quickPasteInput");
  const quickPasteStatus = $("quickPasteStatus");
  const scanTopWrap = $("scanTopWrap");
  const scanTopList = $("scanTopList");

  const standardTableWrap = $("standardTableWrap");
  const pairTableWrap = $("pairTableWrap");

  const rowsBody = $("rowsBody");
  const pairBody = $("pairBody");
  const pairAName = $("pairAName");
  const pairBName = $("pairBName");
  const pairAFair = $("pairAFair");
  const pairBFair = $("pairBFair");
  const pairAAdv = $("pairAAdv");
  const pairBAdv = $("pairBAdv");

  const overroundEl = $("overround");
  const marginEl = $("margin");
  const marketLineEl = $("marketLine");
  const bestPickEl = $("bestPick");
  const explainEl = $("explain");
  const healthChip = $("healthChip");

  // AI Briefing (score / warnings / recommendations)
  const aiScoreEl = $("aiScore");
  const aiScoreLabelEl = $("aiScoreLabel");
  const aiWarnListEl = $("aiWarnList");
  const aiRecoListEl = $("aiRecoList");
  const aiTagsEl = $("aiTags");

  // Multi View compare board
  const cmpWrap = $("cmpWrap");
  const cmpSaveA = $("cmpSaveA");
  const cmpSaveB = $("cmpSaveB");
  const cmpSwap  = $("cmpSwap");
  const cmpClear = $("cmpClear");
  const cmpAEl   = $("cmpA");
  const cmpBEl   = $("cmpB");
  const cmpDelta = $("cmpDelta");

  // state bridge (for global share/save/history + permalink restore)
  const vStateEl = $("vState");
  const dockCenter = $("dockCenter");
  const dockRight = $("dockRight");

  const calcBtn = $("calcBtn");
  const resetBtn = $("resetBtn");

  // --- State
  let state = {
    sportKey: "soccer",
    marketKey: "1x2",
    rows: [],      // standard rows: {label, odds}
    pairs: [],     // pairLines: {line, a, b}
    qp: ""        // quickPaste raw (fixed markets)
  };

  // vState sync
  let _syncingFromExternal = false;

  function encodeState(){
    const market = getMarket(state.sportKey, state.marketKey);
    const st = { s: state.sportKey, m: state.marketKey };
    const lv = lineValue ? String(lineValue.value||"").trim() : "";
    if(lv) st.l = lv;

    // quick paste text (for fast restore)
    const qp = quickPasteInput ? String(quickPasteInput.value||"").trim() : "";
    if(qp) st.qp = qp;

    if(market.type === "fixed"){
      readStandardRowInputs();
      st.o = (state.rows||[]).map(r=>{
        const o = r && r.odds;
        return okOdds(o) ? String(o) : "";
      });
    }else{
      // list / pairLines
      const p = pasteInput ? String(pasteInput.value||"").trim() : "";
      if(p) st.p = p;
    }
    return JSON.stringify(st);
  }

  function setVState(){
    if(!vStateEl || _syncingFromExternal) return;
    try{ vStateEl.value = encodeState(); }catch(e){}
  }

  function tryParseState(raw){
    const s = String(raw||"").trim();
    if(!s) return null;
    // 1) JSON
    try{ if(s[0] === "{") return JSON.parse(s); }catch(e){}
    // 2) base64(json)
    try{
      const b64 = s.replace(/-/g,"+").replace(/_/g,"/");
      const json = decodeURIComponent(escape(atob(b64)));
      return JSON.parse(json);
    }catch(e){}
    return null;
  }

  function applyStateObj(obj){
    if(!obj || typeof obj !== "object") return;
    _syncingFromExternal = true;
    try{
      if(obj.s && typeof obj.s === "string") state.sportKey = obj.s;
      if(sportSelect) sportSelect.value = state.sportKey;
      fillMarketOptions();

      if(obj.m && typeof obj.m === "string") state.marketKey = obj.m;
      if(marketSelect) marketSelect.value = state.marketKey;

      if(lineValue) lineValue.value = (obj.l==null?"":String(obj.l));
      if(pasteInput) pasteInput.value = (obj.p==null?"":String(obj.p));
      if(quickPasteInput) quickPasteInput.value = (obj.qp==null?"":String(obj.qp));

      render();

      // Apply odds array for fixed markets after rows exist
      const market = getMarket(state.sportKey, state.marketKey);
      if(market.type === "fixed" && Array.isArray(obj.o)){
        const inputs = rowsBody ? rowsBody.querySelectorAll("input[data-field='odds']") : [];
        inputs.forEach((inp, idx)=>{
          const v = obj.o[idx];
          if(v!=null && String(v).trim()!=="") inp.value = String(v);
        });
      }

      recalc();
      setChip("good","복원됨");
    }catch(e){
      setChip("bad","복원 실패");
    }finally{
      _syncingFromExternal = false;
      setVState();
    }
  }

  function bindVState(){
    if(!vStateEl) return;
    const handler = ()=>{
      if(_syncingFromExternal) return;
      const obj = tryParseState(vStateEl.value);
      if(obj) applyStateObj(obj);
    };
    vStateEl.addEventListener("input", handler);
    vStateEl.addEventListener("change", handler);
  }

  function relocateGlobalBar(){
    // Global tool bar injected by /assets/js/j.d2cf652ff950.js
    const shareBtn = document.getElementById("_88stShareBtn");
    const saveBtn  = document.getElementById("_88stSaveBtn");
    const histBtn  = document.getElementById("_88stHistBtn");
    const exRow    = document.getElementById("_88stExampleRow");
    const bar      = document.querySelector(".stx-bar");

    if(dockCenter && shareBtn && !dockCenter.contains(shareBtn)) dockCenter.appendChild(shareBtn);
    if(dockCenter && saveBtn  && !dockCenter.contains(saveBtn))  dockCenter.appendChild(saveBtn);
    if(dockCenter && histBtn  && !dockCenter.contains(histBtn))  dockCenter.appendChild(histBtn);
    if(dockRight  && exRow    && !dockRight.contains(exRow))     dockRight.appendChild(exRow);

    // remove empty injected bar
    if(bar && bar.parentNode){
      try{ bar.remove(); }catch(e){ bar.parentNode.removeChild(bar); }
    }
  }

  function watchGlobalBar(){
    const ok = ()=>{
      const shareBtn = document.getElementById("_88stShareBtn");
      const exRow = document.getElementById("_88stExampleRow");
      if(shareBtn && exRow){
        relocateGlobalBar();
        return true;
      }
      return false;
    };
    if(ok()) return;
    const mo = new MutationObserver(()=>{ if(ok()) mo.disconnect(); });
    mo.observe(document.body, {childList:true, subtree:true});
  }

  function getSport(key){ return SPORTS.find(s=>s.key===key) || SPORTS[0]; }
  function getMarket(sportKey, marketKey){
    const s = getSport(sportKey);
    return s.markets.find(m=>m.key===marketKey) || s.markets[0];
  }

  function setChip(kind, text){
    if(!healthChip) return;
    healthChip.className = `chip ${kind}`;
    healthChip.textContent = text;
  }

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

  function updateMarketLineLabel(){
    const sport = getSport(state.sportKey);
    const market = getMarket(state.sportKey, state.marketKey);
    const line = (market.line && lineValue && String(lineValue.value||"").trim()) ? ` / ${lineValue.value.trim()}` : "";
    if(marketLineEl) marketLineEl.textContent = `${sport.name} · ${market.name}${line}`;
  }

  function makeInput(placeholder, value){
    const inp = document.createElement("input");
    inp.className = "in mono";
    inp.inputMode = "decimal";
    inp.placeholder = placeholder || "";
    inp.value = value ?? "";
    return inp;
  }

  function clearStandardRows(){
    state.rows = [];
    if(rowsBody) rowsBody.innerHTML = "";
  }

  function buildFixedRows(outcomes){
    clearStandardRows();
    outcomes.forEach((label, idx)=>{
      state.rows.push({label, odds: NaN});
      const tr = document.createElement("tr");
      tr.dataset.idx = String(idx);

      const tdLabel = document.createElement("td");
      tdLabel.textContent = label;

      const tdOdds = document.createElement("td");
      const inpOdds = makeInput("예: 1.95", "");
      inpOdds.dataset.field = "odds";
      inpOdds.dataset.idx = String(idx);
      tdOdds.appendChild(inpOdds);

      const tdImp = document.createElement("td"); tdImp.className="mono"; tdImp.id = `imp_${idx}`; tdImp.textContent="-";
      const tdFairP = document.createElement("td"); tdFairP.className="mono"; tdFairP.id = `fairp_${idx}`; tdFairP.textContent="-";
      const tdFairO = document.createElement("td"); tdFairO.className="mono"; tdFairO.id = `fairo_${idx}`; tdFairO.textContent="-";
      const tdAdv = document.createElement("td"); tdAdv.className="mono"; tdAdv.id = `adv_${idx}`; tdAdv.textContent="-";

      tr.append(tdLabel, tdOdds, tdImp, tdFairP, tdFairO, tdAdv);
      rowsBody && rowsBody.appendChild(tr);
    });
  }

  function parseListLines(text){
    const lines = String(text||"").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const items = [];
    for(const line of lines){
      const parts = line.split(/[\t,]+/).map(s=>s.trim()).filter(Boolean);
      let label = "", oddsStr = "";

      if(parts.length >= 2){
        const a = num(parts[0]);
        const b = num(parts[parts.length-1]);
        if(okOdds(a) && !okOdds(b)){
          oddsStr = parts[0];
          label = parts.slice(1).join(" ");
        }else if(okOdds(b)){
          oddsStr = parts[parts.length-1];
          label = parts.slice(0,-1).join(" ");
        }
      }

      if(!oddsStr){
        const ws = line.split(/\s+/);
        if(ws.length>=2 && okOdds(num(ws[ws.length-1]))){
          oddsStr = ws[ws.length-1];
          label = ws.slice(0,-1).join(" ");
        }
      }

      const odds = num(oddsStr);
      if(!okOdds(odds)) continue;
      items.push({label: label || `선택 ${items.length+1}`, odds});
    }
    return items;
  }

  function buildListRows(items){
    clearStandardRows();
    items.forEach((it, idx)=>{
      state.rows.push({label: it.label, odds: it.odds});

      const tr = document.createElement("tr");
      tr.dataset.idx = String(idx);

      const tdLabel = document.createElement("td");
      tdLabel.textContent = it.label;

      const tdOdds = document.createElement("td");
      const inpOdds = makeInput("예: 6.50", String(it.odds));
      inpOdds.dataset.field = "odds";
      inpOdds.dataset.idx = String(idx);
      tdOdds.appendChild(inpOdds);

      const tdImp = document.createElement("td"); tdImp.className="mono"; tdImp.id = `imp_${idx}`; tdImp.textContent="-";
      const tdFairP = document.createElement("td"); tdFairP.className="mono"; tdFairP.id = `fairp_${idx}`; tdFairP.textContent="-";
      const tdFairO = document.createElement("td"); tdFairO.className="mono"; tdFairO.id = `fairo_${idx}`; tdFairO.textContent="-";
      const tdAdv = document.createElement("td"); tdAdv.className="mono"; tdAdv.id = `adv_${idx}`; tdAdv.textContent="-";

      tr.append(tdLabel, tdOdds, tdImp, tdFairP, tdFairO, tdAdv);
      rowsBody && rowsBody.appendChild(tr);
    });
  }

  function clearPairRows(){
    state.pairs = [];
    if(pairBody) pairBody.innerHTML = "";
  }

  function parsePairLines(text){
    const lines = String(text||"").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const items = [];

    for(const line of lines){
      // Extract numbers. Supports: "2.5 1.90 1.95", "2.5/1.90/1.95", "Over 2.5 1.90 Under 2.5 1.95".
      const nums = (line.match(/-?\d+(?:\.\d+)?/g) || []).map(s=>num(s)).filter(Number.isFinite);
      if(nums.length < 3) continue;

      // Heuristic: line = first number, oddsA = first valid odds after line, oddsB = last valid odds.
      const lineVal = nums[0];
      const oddsCandidates = nums.slice(1).filter(okOdds);
      if(oddsCandidates.length < 2) continue;

      const a = oddsCandidates[0];
      const b = oddsCandidates[oddsCandidates.length-1];
      if(!okOdds(a) || !okOdds(b)) continue;

      items.push({line: lineVal, a, b});
    }

    return items;
  }



// --- Quick paste: parse 1X2 / 2-way / O/U from any single-line text (vhub/커뮤니티/메모 등)
function _extractNums(line){
  return (String(line||"").match(/-?\d+(?:\.\d+)?/g) || []).map(s=>num(s)).filter(Number.isFinite);
}
function _oddsCandidates(nums){
  // odds typically >1; filter out absurdly large numbers to reduce false positives
  return nums.filter(x=> okOdds(x) && x <= 200);
}
function parseQuickLine(line){
  const raw = String(line||"").trim();
  if(!raw) return null;
  const nums = _extractNums(raw);
  if(!nums.length) return null;

  const odds = _oddsCandidates(nums);
  if(odds.length >= 3){
    return { kind:"1x2", odds: odds.slice(0,3), raw };
  }
  if(odds.length === 2){
    // Detect likely O/U format: a non-odds "line" exists and appears before odds in text
    const lineNums = nums.filter(x=> !okOdds(x) && Math.abs(x) <= 50);
    const lineVal = lineNums.length ? lineNums[0] : NaN;
    // If user text includes typical O/U tokens, prefer O/U
    const hasOUToken = /\b(o\/u|over|under)\b|오버|언더/i.test(raw);
    if(hasOUToken || Number.isFinite(lineVal)){
      return { kind:"ou", odds, line: (Number.isFinite(lineVal)? lineVal : NaN), raw };
    }
    return { kind:"2way", odds, raw };
  }
  return null;
}

function calcEntry(entry){
  const odds = entry.odds || [];
  const implied = odds.map(o=> okOdds(o) ? 1/o : NaN);
  const sumImp = implied.reduce((a,x)=>a+(Number.isFinite(x)?x:0),0);
  const valid = implied.filter(Number.isFinite).length;
  if(valid < 2 || sumImp <= 0) return null;

  const advs = odds.map((o,i)=>{
    const imp = implied[i];
    const fairP = (Number.isFinite(imp) ? imp/sumImp : NaN);
    return (okOdds(o) && Number.isFinite(fairP)) ? (fairP*o - 1) : NaN;
  });

  let bestIdx = -1, bestAdv = -Infinity;
  advs.forEach((a,i)=>{ if(Number.isFinite(a) && a > bestAdv){ bestAdv=a; bestIdx=i; } });

  return {
    sumImp,
    margin: sumImp - 1,
    bestIdx,
    bestAdv
  };
}

function mkLabel(entry){
  if(entry.kind === "1x2") return "1X2";
  if(entry.kind === "2way") return "2-WAY";
  if(entry.kind === "ou"){
    const lv = Number.isFinite(entry.line) ? String(entry.line) : "-";
    return `O/U @${lv}`;
  }
  return "MARKET";
}

function bestLabel(entry, bestIdx){
  if(bestIdx < 0) return "-";
  if(entry.kind === "1x2") return ["승","무","패"][bestIdx] || `#${bestIdx+1}`;
  if(entry.kind === "ou") return ["오버","언더"][bestIdx] || `#${bestIdx+1}`;
  return ["A","B"][bestIdx] || `#${bestIdx+1}`;
}

function renderScanTop(entries){
  if(!scanTopWrap || !scanTopList) return;
  scanTopList.innerHTML = "";
  const list = (entries||[]).slice()
    .filter(e=> e && Number.isFinite(e.margin))
    .sort((a,b)=> a.margin - b.margin)
    .slice(0,3);

  if(!list.length){
    scanTopWrap.style.display = "none";
    return;
  }
  scanTopWrap.style.display = "";

  list.forEach((e, idx)=>{
    const div = document.createElement("div");
    div.className = "scanCard";
    div.tabIndex = 0;
    const mPct = fmtPct(e.margin, 2);
    const mk = mkLabel(e);
    const best = `${bestLabel(e, e.bestIdx)} (${fmtPct(e.bestAdv, 2)})`;
    const oddsTxt = e.kind==="1x2"
      ? `${fmtN(e.odds[0],3)} · ${fmtN(e.odds[1],3)} · ${fmtN(e.odds[2],3)}`
      : `${fmtN(e.odds[0],3)} · ${fmtN(e.odds[1],3)}`;
    div.innerHTML = `
      <div class="top">
        <span class="rank">TOP ${idx+1}</span>
        <span class="m mono">마진 ${mPct}</span>
      </div>
      <div class="mid">
        <span class="mk">${mk}</span>
        <span class="best">베스트: ${best}</span>
      </div>
      <div class="od mono">${oddsTxt}</div>
    `;
    div.addEventListener("click", ()=>applyQuickEntry(e), {passive:true});
    div.addEventListener("keydown", (ev)=>{
      if(ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); applyQuickEntry(e); }
    });
    scanTopList.appendChild(div);
  });
}

function applyQuickEntry(entry){
  if(!entry || !Array.isArray(entry.odds)) return;

  // Choose best matching market in current sport; fallback to soccer.
  function pickMarketFor(kind){
    const sport = getSport(state.sportKey);
    const keys = sport.markets.map(m=>m.key);
    if(kind === "1x2"){
      if(keys.includes("1x2")) return {s: sport.key, m:"1x2"};
      // fallback: hockey 1x2 exists too, but soccer is most common
      return {s:"soccer", m:"1x2"};
    }
    if(kind === "ou"){
      if(keys.includes("ou")) return {s: sport.key, m:"ou"};
      return {s:"soccer", m:"ou"};
    }
    // 2way
    const pref = ["ml","h2h","2way"];
    for(const k of pref) if(keys.includes(k)) return {s: sport.key, m:k};
    return {s:"soccer", m:"ml"};
  }

  const pick = pickMarketFor(entry.kind);
  state.sportKey = pick.s;
  state.marketKey = pick.m;

  if(sportSelect) sportSelect.value = state.sportKey;
  fillMarketOptions();
  if(marketSelect) marketSelect.value = state.marketKey;

  render();

  // Apply line if needed
  if(entry.kind === "ou" && lineValue){
    if(Number.isFinite(entry.line)) lineValue.value = String(entry.line);
  }

  // Fill odds into the inputs (in order)
  const inputs = rowsBody ? rowsBody.querySelectorAll("input[data-field='odds']") : [];
  inputs.forEach((inp, idx)=>{
    const v = entry.odds[idx];
    if(v!=null && okOdds(v)) inp.value = String(v);
  });

  recalc();
  if(quickPasteStatus){
    quickPasteStatus.textContent = `적용됨: ${mkLabel(entry)} / 마진 ${fmtPct(entry.margin,2)}`;
  }
  setChip("good","적용됨");
  setVState();
}

function handleQuickPasteText(text){
  const raw = String(text||"");
  const lines = raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const entries = [];
  for(const line of lines){
    const e = parseQuickLine(line);
    if(!e) continue;
    const calc = calcEntry(e);
    if(!calc) continue;
    entries.push(Object.assign(e, calc));
  }

  // 1 line -> auto apply (fast)
  if(lines.length === 1 && entries.length === 1){
    renderScanTop([]);
    applyQuickEntry(entries[0]);
    return;
  }

  // multi lines -> show scan TOP3
  renderScanTop(entries);
  if(quickPasteStatus){
    quickPasteStatus.textContent = entries.length
      ? `스캔됨: ${entries.length}개 라인 (TOP3 표시)`
      : "배당이 포함된 줄을 붙여넣어주세요. (예: 2.35 3.40 2.90)";
  }
}

  function buildPairRows(items, market){
    clearPairRows();

    const aName = (market && market.pair && market.pair.a) ? market.pair.a : "A";
    const bName = (market && market.pair && market.pair.b) ? market.pair.b : "B";
    if(pairAName) pairAName.textContent = `${aName} 배당`;
    if(pairBName) pairBName.textContent = `${bName} 배당`;
    if(pairAFair) pairAFair.textContent = `${aName} 공정배당`;
    if(pairBFair) pairBFair.textContent = `${bName} 공정배당`;
    if(pairAAdv) pairAAdv.textContent = `${aName} 공정대비`;
    if(pairBAdv) pairBAdv.textContent = `${bName} 공정대비`;

    items.forEach((it, idx)=>{
      state.pairs.push({line: it.line, a: it.a, b: it.b});

      const tr = document.createElement("tr");
      tr.dataset.idx = String(idx);

      const tdLine = document.createElement("td");
      const inpLine = makeInput("예: 2.5", String(it.line));
      inpLine.dataset.field = "line";
      inpLine.dataset.idx = String(idx);
      tdLine.appendChild(inpLine);

      const tdA = document.createElement("td");
      const inpA = makeInput("예: 1.90", String(it.a));
      inpA.dataset.field = "a";
      inpA.dataset.idx = String(idx);
      tdA.appendChild(inpA);

      const tdB = document.createElement("td");
      const inpB = makeInput("예: 1.95", String(it.b));
      inpB.dataset.field = "b";
      inpB.dataset.idx = String(idx);
      tdB.appendChild(inpB);

      const tdM = document.createElement("td"); tdM.className="mono"; tdM.id = `pm_${idx}`; tdM.textContent="-";
      const tdAF = document.createElement("td"); tdAF.className="mono"; tdAF.id = `paf_${idx}`; tdAF.textContent="-";
      const tdBF = document.createElement("td"); tdBF.className="mono"; tdBF.id = `pbf_${idx}`; tdBF.textContent="-";
      const tdAA = document.createElement("td"); tdAA.className="mono"; tdAA.id = `paa_${idx}`; tdAA.textContent="-";
      const tdBA = document.createElement("td"); tdBA.className="mono"; tdBA.id = `pba_${idx}`; tdBA.textContent="-";
      const tdBest = document.createElement("td"); tdBest.className="mono"; tdBest.id = `pbest_${idx}`; tdBest.textContent="-";

      tr.append(tdLine, tdA, tdB, tdM, tdAF, tdBF, tdAA, tdBA, tdBest);
      pairBody && pairBody.appendChild(tr);
    });
  }

  // --- Calculation (RAF)
  let rafPending = false;
  function scheduleRecalc(){
    if(rafPending) return;
    rafPending = true;
    requestAnimationFrame(()=>{
      rafPending = false;
      recalc();
    });
  }

  function readStandardRowInputs(){
    const inputs = rowsBody ? rowsBody.querySelectorAll("input[data-field]") : [];
    inputs.forEach(inp=>{
      const idx = parseInt(inp.dataset.idx || "0", 10);
      const field = inp.dataset.field;
      if(!state.rows[idx]) return;
      if(field === "odds") state.rows[idx].odds = num(inp.value);
    });
  }

  function readPairInputs(){
    const inputs = pairBody ? pairBody.querySelectorAll("input[data-field]") : [];
    inputs.forEach(inp=>{
      const idx = parseInt(inp.dataset.idx || "0", 10);
      const field = inp.dataset.field;
      if(!state.pairs[idx]) return;
      const v = num(inp.value);
      if(field === "line") state.pairs[idx].line = v;
      else if(field === "a") state.pairs[idx].a = v;
      else if(field === "b") state.pairs[idx].b = v;
    });
  }

  function setText(id, txt){
    const el = $(id);
    if(el) el.textContent = txt;
  }

  function healthFromMargin(m){
    if(!Number.isFinite(m)) return {k:"bad", t:"입력값 점검 필요"};
    if(m < 0) return {k:"neu", t:"마진 음수(이상치) — 배당 확인"};
    const pct = m*100;
    if(pct >= 8) return {k:"bad", t:`마진 높음 ${pct.toFixed(1)}%`};
    if(pct >= 4) return {k:"neu", t:`마진 보통 ${pct.toFixed(1)}%`};
    return {k:"good", t:`마진 낮음 ${pct.toFixed(1)}%`};
  }  function escHtml(x){
    return String(x ?? "").replace(/[&<>"']/g, (ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  }

  function setAiList(el, items){
    if(!el) return;
    const arr = (items && items.length) ? items : ["—"]; 
    el.innerHTML = arr.map(t=>`<li>${escHtml(t)}</li>`).join("");
  }

  function renderAiBrief(payload){
    if(!aiScoreEl || !aiScoreLabelEl || !aiWarnListEl || !aiRecoListEl) return;
    if(!payload){
      aiScoreEl.textContent = "-";
      aiScoreLabelEl.textContent = "대기";
      setAiList(aiWarnListEl, ["배당을 2개 이상 입력하면 자동 분석됩니다."]);
      setAiList(aiRecoListEl, ["마진이 낮은 마켓/라인을 우선하세요.", "여러 케이스는 A/B 비교로 저장해 마진을 비교하세요."]);
      if(aiTagsEl) aiTagsEl.innerHTML = "";
      return;
    }

    const scoreTxt = (payload.score==null) ? "-" : String(payload.score);
    aiScoreEl.textContent = scoreTxt;
    aiScoreLabelEl.textContent = payload.level || "대기";

    setAiList(aiWarnListEl, payload.warns);
    setAiList(aiRecoListEl, payload.recos);

    if(aiTagsEl){
      const tags = payload.tags || [];
      aiTagsEl.innerHTML = tags.map(t=>`<span class="aiTag ${escHtml(t.cls||"")}">${escHtml(t.t||"")}</span>`).join("");
    }
  }

  function buildAiBrief(args){
    const margin = args && Number.isFinite(args.margin) ? args.margin : NaN;
    const bestAdv = args && Number.isFinite(args.bestAdv) ? args.bestAdv : NaN;
    const spread = args && Number.isFinite(args.spread) ? args.spread : NaN;
    const bestText = args && args.bestText ? String(args.bestText) : "";
    const type = args && args.type ? String(args.type) : "";

    if(!Number.isFinite(margin)) return null;

    const mPct = margin * 100;
    let score;
    if(margin < 0){
      score = 40;
    }else{
      score = 95 - (mPct * 4.5);
    }

    if(Number.isFinite(bestAdv)){
      const bad = Math.abs(bestAdv*100);
      if(bad >= 4) score -= 8;
      else if(bad >= 2) score -= 4;
    }

    if(Number.isFinite(spread)){
      const sp = spread*100;
      if(sp >= 5) score -= 10;
      else if(sp >= 3) score -= 6;
    }

    score = Math.round(clamp(score, 10, 95));
    const level = score >= 80 ? "양호" : score >= 65 ? "보통" : score >= 50 ? "주의" : "위험";

    const warns = [];
    const recos = [];
    const tags = [];

    if(margin < 0){
      tags.push({t:"입력 이상치", cls:"bad"});
      warns.push("마진이 음수로 계산됩니다. 배당 입력을 다시 확인하세요.");
    }else if(mPct >= 8){
      tags.push({t:`마진 높음 ${mPct.toFixed(1)}%`, cls:"bad"});
      warns.push(`마진이 높습니다(${mPct.toFixed(1)}%). 기대값이 급격히 불리해집니다.`);
    }else if(mPct >= 4){
      tags.push({t:`마진 보통 ${mPct.toFixed(1)}%`, cls:"warn"});
      warns.push(`마진이 보통 이상입니다(${mPct.toFixed(1)}%). 라인/마켓 비교를 권장합니다.`);
    }else{
      tags.push({t:`마진 낮음 ${mPct.toFixed(1)}%`, cls:"good"});
    }

    if(Number.isFinite(bestAdv)){
      const ba = bestAdv*100; // negative or 0
      if(ba <= -4){
        tags.push({t:`불리폭 큼 ${ba.toFixed(1)}%`, cls:"warn"});
        warns.push(`베스트 선택도 공정 대비 불리폭이 큽니다(${ba.toFixed(1)}%).`);
      }
    }

    if(Number.isFinite(spread) && spread > 0.03){
      tags.push({t:`라인 편차 ${(spread*100).toFixed(1)}%`, cls:"warn"});
      warns.push("라인별 마진 편차가 큽니다. 최저 마진 라인을 우선 적용하세요.");
    }

    if(bestText){
      recos.push(`현재 베스트: ${bestText}`);
    }
    if(type === "pairLines"){
      recos.push("여러 라인 중 '최저 마진' 라인을 먼저 고르세요.");
    }
    recos.push("경고 태그가 많으면 PASS(관망) 비중을 올리세요.");

    if(!warns.length){
      warns.push("특이 경고 없음. 그래도 과열 구간에서는 과몰입을 피하세요.");
    }

    return {
      score,
      level: `점수 ${score} · ${level}`,
      warns,
      recos,
      tags
    };
  }


  function recalcStandard(){
    readStandardRowInputs();

    const rows = state.rows || [];
    const implied = rows.map(r=> okOdds(r.odds) ? 1/r.odds : NaN);
    const sumImp = implied.reduce((a,x)=> a + (Number.isFinite(x) ? x : 0), 0);

    const validCount = implied.filter(Number.isFinite).length;

    if(validCount < 2){
      if(overroundEl) overroundEl.textContent = "-";
      if(marginEl) marginEl.textContent = "-";
      if(bestPickEl) bestPickEl.textContent = "-";
      setChip("neu","입력 부족");
      renderAiBrief(null);
      rows.forEach((_, idx)=>{
        ["imp_","fairp_","fairo_","adv_"].forEach(p=>setText(p+idx, "-"));
        const tr = rowsBody && rowsBody.querySelector(`tr[data-idx=\"${idx}\"]`);
        if(tr) tr.classList.remove("row-good","row-bad");
      });
      return;
    }


    if(!rows.length || sumImp <= 0){
      if(overroundEl) overroundEl.textContent = "-";
      if(marginEl) marginEl.textContent = "-";
      if(bestPickEl) bestPickEl.textContent = "-";
      setChip("neu","입력 대기");
      renderAiBrief(null);
      rows.forEach((_, idx)=>{
        ["imp_","fairp_","fairo_","adv_"].forEach(p=>setText(p+idx, "-"));
        const tr = rowsBody && rowsBody.querySelector(`tr[data-idx=\"${idx}\"]`);
        if(tr) tr.classList.remove("row-good","row-bad");
      });
      return;
    }

    if(overroundEl) overroundEl.textContent = fmtN(sumImp, 4);
    if(marginEl) marginEl.textContent = fmtPct(sumImp-1, 2);

    let best = {idx:-1, adv:-Infinity};
    let worst = {idx:-1, adv:+Infinity};

    for(let i=0;i<rows.length;i++){
      const o = rows[i].odds;
      const imp = okOdds(o) ? 1/o : NaN;
      const fairP = (Number.isFinite(imp) && sumImp>0) ? imp/sumImp : NaN;
      const fairO = (Number.isFinite(fairP) && fairP>0) ? 1/fairP : NaN;
      const adv = (okOdds(o) && Number.isFinite(fairP)) ? (fairP*o - 1) : NaN; // always <=0 if sumImp>1

      setText(`imp_${i}`, Number.isFinite(imp) ? fmtPct(imp, 2) : "-");
      setText(`fairp_${i}`, Number.isFinite(fairP) ? fmtPct(fairP, 2) : "-");
      setText(`fairo_${i}`, Number.isFinite(fairO) ? fmtN(fairO, 3) : "-");
      setText(`adv_${i}`, Number.isFinite(adv) ? fmtPct(adv, 2) : "-");

      if(Number.isFinite(adv)){
        if(adv > best.adv) best = {idx:i, adv};
        if(adv < worst.adv) worst = {idx:i, adv};
      }
    }

    // row highlight
    for(let i=0;i<rows.length;i++){
      const tr = rowsBody && rowsBody.querySelector(`tr[data-idx=\"${i}\"]`);
      if(!tr) continue;
      tr.classList.remove("row-good","row-bad");
      if(i === best.idx) tr.classList.add("row-good");
      if(i === worst.idx) tr.classList.add("row-bad");
    }

    if(bestPickEl){
      if(best.idx >= 0){
        const r = rows[best.idx];
        bestPickEl.textContent = `${r.label} (${fmtPct(best.adv, 2)})`;
      }else{
        bestPickEl.textContent = "-";
      }
    }

    const m = sumImp - 1;
    const h = healthFromMargin(m);
    setChip(h.k, h.t);

    renderAiBrief(buildAiBrief({
      margin: m,
      bestAdv: best.adv,
      spread: NaN,
      type: "standard",
      bestText: (best.idx>=0 && rows[best.idx]) ? `${rows[best.idx].label} (${fmtPct(best.adv, 2)})` : ""
    }));

    if(explainEl){
      explainEl.innerHTML = "공정확률/공정배당은 암시확률(1/배당)을 정규화해 계산합니다. “공정대비”는 공정배당 대비 상대적으로 덜 불리한지(정규화 기준)입니다.";
    }
  }

  function recalcPairLines(){
    readPairInputs();

    const market = getMarket(state.sportKey, state.marketKey);
    const aName = (market && market.pair && market.pair.a) ? market.pair.a : "A";
    const bName = (market && market.pair && market.pair.b) ? market.pair.b : "B";

    const items = state.pairs || [];
    const margins = [];

    let bestGlobal = {idx:-1, side:"", adv:-Infinity, line: NaN};
    let bestMinMargin = {idx:-1, line: NaN, m: +Infinity};

    for(let i=0;i<items.length;i++){
      const it = items[i];
      const a = it.a;
      const b = it.b;
      const impA = okOdds(a) ? 1/a : NaN;
      const impB = okOdds(b) ? 1/b : NaN;

      if(!Number.isFinite(impA) || !Number.isFinite(impB)){
        setText(`pm_${i}`, "-");
        ["paf_","pbf_","paa_","pba_","pbest_"].forEach(p=>setText(p+i, "-"));
        const tr = pairBody && pairBody.querySelector(`tr[data-idx=\"${i}\"]`);
        if(tr) tr.classList.remove("row-good","row-bad");
        continue;
      }

      const sumImp = impA + impB;
      const m = sumImp - 1;
      margins.push(m);

      const fairPA = impA / sumImp;
      const fairPB = impB / sumImp;
      const fairOA = 1/fairPA;
      const fairOB = 1/fairPB;

      const advA = fairPA*a - 1;
      const advB = fairPB*b - 1;

      setText(`pm_${i}`, fmtPct(m, 2));
      setText(`paf_${i}`, fmtN(fairOA, 3));
      setText(`pbf_${i}`, fmtN(fairOB, 3));
      setText(`paa_${i}`, fmtPct(advA, 2));
      setText(`pba_${i}`, fmtPct(advB, 2));

      let bestSide = aName;
      let bestAdv = advA;
      if(advB > advA){ bestSide = bName; bestAdv = advB; }
      setText(`pbest_${i}`, `${bestSide} (${fmtPct(bestAdv, 2)})`);

      // best global
      if(bestAdv > bestGlobal.adv){
        bestGlobal = {idx:i, side:bestSide, adv:bestAdv, line: it.line};
      }
      // lowest margin line
      if(m < bestMinMargin.m){
        bestMinMargin = {idx:i, line: it.line, m};
      }

      // row highlight: best side row green, worst margin row red will be handled later
      const tr = pairBody && pairBody.querySelector(`tr[data-idx=\"${i}\"]`);
      if(tr) tr.classList.remove("row-good","row-bad");
    }

    // Summaries
    if(!margins.length){
      if(overroundEl) overroundEl.textContent = "-";
      if(marginEl) marginEl.textContent = "-";
      if(bestPickEl) bestPickEl.textContent = "-";
      setChip("neu","입력 대기");
      renderAiBrief(null);
      return;
    }

    const minM = Math.min(...margins);
    const maxM = Math.max(...margins);
    const avgM = margins.reduce((a,x)=>a+x,0) / margins.length;

    const minOR = minM + 1;
    const maxOR = maxM + 1;
    const avgOR = avgM + 1;

    if(overroundEl) overroundEl.textContent = `${fmtN(minOR, 4)} / ${fmtN(avgOR, 4)} / ${fmtN(maxOR, 4)}`;
    if(marginEl) marginEl.textContent = `${fmtPct(minM, 2)} / ${fmtPct(avgM, 2)} / ${fmtPct(maxM, 2)}`;

    if(bestPickEl){
      const lineTxt = Number.isFinite(bestGlobal.line) ? String(bestGlobal.line) : "-";
      bestPickEl.textContent = `${bestGlobal.side} @${lineTxt} (${fmtPct(bestGlobal.adv, 2)})`;
    }

    // Highlight lowest margin line as green, highest margin as red
    let worstIdx = -1;
    let worstM = -Infinity;
    for(let i=0;i<items.length;i++){
      const mTextEl = $(`pm_${i}`);
      // recompute quickly
      const it = items[i];
      const a = it.a, b = it.b;
      if(!okOdds(a) || !okOdds(b)) continue;
      const m = (1/a + 1/b) - 1;
      if(m > worstM){ worstM = m; worstIdx = i; }
    }

    if(bestMinMargin.idx >= 0){
      const tr = pairBody && pairBody.querySelector(`tr[data-idx=\"${bestMinMargin.idx}\"]`);
      if(tr) tr.classList.add("row-good");
    }
    if(worstIdx >= 0){
      const tr = pairBody && pairBody.querySelector(`tr[data-idx=\"${worstIdx}\"]`);
      if(tr) tr.classList.add("row-bad");
    }

    const h = healthFromMargin(avgM);
    setChip(h.k, `${h.t} (평균)`);

    if(explainEl){
      const mm = Number.isFinite(bestMinMargin.m) ? fmtPct(bestMinMargin.m, 2) : "-";
      const ml = Number.isFinite(bestMinMargin.line) ? String(bestMinMargin.line) : "-";
      explainEl.innerHTML = `라인별 마진/공정배당/공정대비를 계산합니다. <b>최저 마진</b> 라인: <b>${ml}</b> (${mm}).`;
    }
  }

  function recalc(){
    updateMarketLineLabel();
    const market = getMarket(state.sportKey, state.marketKey);
    if(market.type === "pairLines") recalcPairLines();
    else recalcStandard();
    setVState();
  }


// --- Multi View: A/B compare board
let _cmp = {a:null, b:null};

function esc(s){
  return String(s||"").replace(/[&<>"']/g, (m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

function snapshotCurrent(){
  const market = getMarket(state.sportKey, state.marketKey);

  if(market.type === "pairLines"){
    readPairInputs();
    const items = state.pairs || [];
    const margins = [];
    for(const it of items){
      if(!it) continue;
      const a = it.a, b = it.b;
      if(!okOdds(a) || !okOdds(b)) continue;
      margins.push((1/a + 1/b) - 1);
    }
    const avgM = margins.length ? (margins.reduce((x,y)=>x+y,0)/margins.length) : NaN;
    return {
      marketLine: marketLineEl ? marketLineEl.textContent : "",
      margin: avgM,
      best: bestPickEl ? bestPickEl.textContent : "-",
      oddsTxt: margins.length ? `${margins.length}개 라인` : "라인 없음",
      type: "pairLines"
    };
  }

  // fixed/list
  readStandardRowInputs();
  const odds = (state.rows||[]).map(r=>r && r.odds).filter(okOdds);
  const sumImp = odds.reduce((a,o)=>a + (okOdds(o)?(1/o):0), 0);
  const m = (odds.length>=2 && sumImp>0) ? (sumImp - 1) : NaN;

  const oddsTxt = odds.length >= 3
    ? `${fmtN(odds[0],3)} · ${fmtN(odds[1],3)} · ${fmtN(odds[2],3)}`
    : (odds.length === 2 ? `${fmtN(odds[0],3)} · ${fmtN(odds[1],3)}` : "배당 없음");

  return {
    marketLine: marketLineEl ? marketLineEl.textContent : "",
    margin: m,
    best: bestPickEl ? bestPickEl.textContent : "-",
    oddsTxt,
    type: market.type
  };
}

function renderCmpSlot(el, snap, tag){
  if(!el) return;
  if(!snap){
    el.innerHTML = `
      <div class="cmpEmpty">
        <div class="t">
          <span class="tag">${tag}</span>
          <span class="mv mono">비어있음</span>
        </div>
        <div class="ml">현재 결과에서 “${tag} 저장”을 누르세요.</div>
      </div>
    `;
    return;
  }
  const mTxt = Number.isFinite(snap.margin) ? fmtPct(snap.margin,2) : "-";
  el.innerHTML = `
    <div class="t">
      <span class="tag">${tag}</span>
      <span class="mv mono">마진 ${mTxt}</span>
    </div>
    <div class="ml mono">${esc(snap.marketLine)}</div>
    <div class="od mono">${esc(snap.oddsTxt)}</div>
    <div class="ml">베스트: <b>${esc(snap.best)}</b></div>
  `;
}

function renderCompare(){
  if(!cmpWrap) return;
  renderCmpSlot(cmpAEl, _cmp.a, "A");
  renderCmpSlot(cmpBEl, _cmp.b, "B");

  if(cmpDelta){
    if(_cmp.a && _cmp.b && Number.isFinite(_cmp.a.margin) && Number.isFinite(_cmp.b.margin)){
      const d = _cmp.b.margin - _cmp.a.margin; // + means A lower
      const abs = Math.abs(d);
      const winner = d > 0 ? "A" : (d < 0 ? "B" : "동일");
      const msg = (winner === "동일")
        ? `A/B 마진이 동일합니다. (${fmtPct(abs,2)})`
        : `${winner} 쪽이 마진이 더 낮습니다. (차이 ${fmtPct(abs,2)})`;
      cmpDelta.textContent = msg;
    }else{
      cmpDelta.textContent = "A/B 저장을 눌러 두 케이스를 비교하세요.";
    }
  }
}

  // --- Render
  function render(){
    fillSportOptions();
    fillMarketOptions();

    const market = getMarket(state.sportKey, state.marketKey);
    setLineUI(market);


// UI toggle
const isPaste = (market.type === "list" || market.type === "pairLines");
if(pasteWrap) pasteWrap.style.display = isPaste ? "" : "none";

// Quick paste (fixed markets): fast 1-line apply + multi-line margin scan
const showQP = (market.type === "fixed");
if(quickPasteWrap) quickPasteWrap.style.display = showQP ? "" : "none";
if(!showQP){
  if(quickPasteInput) quickPasteInput.value = "";
  if(quickPasteStatus) quickPasteStatus.textContent = "";
  if(scanTopWrap) scanTopWrap.style.display = "none";
  if(scanTopList) scanTopList.innerHTML = "";
}
    if(standardTableWrap) standardTableWrap.style.display = (market.type === "pairLines") ? "none" : "";
    if(pairTableWrap) pairTableWrap.style.display = (market.type === "pairLines") ? "" : "none";

    if(market.type === "fixed"){
      if(pasteInput) pasteInput.value = "";
      if(pasteStatus) pasteStatus.textContent = "";
      buildFixedRows(market.outcomes || ["선택A","선택B"]);
    }

    if(market.type === "list"){
      if(pasteDesc) pasteDesc.textContent = "다중 우승자/다중 선택은 줄 단위로 붙여넣으면 자동 파싱됩니다.";
      if(pasteHint) pasteHint.textContent = market.hint || "예: 선택1 6.5";
      if(pasteInput && !pasteInput.value.trim()) pasteInput.value = market.hint || "";
      const items = parseListLines(pasteInput ? pasteInput.value : "");
      buildListRows(items);
      if(pasteStatus){
        pasteStatus.textContent = items.length ? `파싱됨: ${items.length}개 선택` : "배당을 붙여넣으면 선택 목록이 생성됩니다.";
      }
    }

    if(market.type === "pairLines"){
      if(pasteDesc) pasteDesc.textContent = "오버/언더 라인을 여러 개 붙여넣으면 라인별로 자동 계산합니다. (라인 배당 배당)";
      if(pasteHint) pasteHint.textContent = market.hint || "2.5 1.90 1.95";
      if(pasteInput && !pasteInput.value.trim()) pasteInput.value = market.hint || "";
      const items = parsePairLines(pasteInput ? pasteInput.value : "");
      buildPairRows(items, market);
      if(pasteStatus){
        pasteStatus.textContent = items.length ? `파싱됨: ${items.length}개 라인` : "라인과 배당을 줄 단위로 붙여넣어주세요.";
      }
    }

    updateMarketLineLabel();
    recalc();
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
      on(pairBody, ev, (e)=>{
        const t = e && e.target;
        if(t && t.matches && t.matches("input[data-field]")) scheduleRecalc();
      });
      on(lineValue, ev, scheduleRecalc);
      on(pasteInput, ev, ()=>{
        const market = getMarket(state.sportKey, state.marketKey);
        if(market.type === "list"){
          const items = parseListLines(pasteInput ? pasteInput.value : "");
          buildListRows(items);
          if(pasteStatus){
            pasteStatus.textContent = items.length ? `파싱됨: ${items.length}개 선택` : "배당을 붙여넣으면 선택 목록이 생성됩니다.";
          }
          scheduleRecalc();
        }
        if(market.type === "pairLines"){
          const items = parsePairLines(pasteInput ? pasteInput.value : "");
          buildPairRows(items, market);
          if(pasteStatus){
            pasteStatus.textContent = items.length ? `파싱됨: ${items.length}개 라인` : "라인과 배당을 줄 단위로 붙여넣어주세요.";
          }
          scheduleRecalc();
        }
      });

on(quickPasteInput, ev, ()=>{
  if(!quickPasteInput) return;
  // run quick parse/scan without interfering with manual inputs
  handleQuickPasteText(quickPasteInput.value);
});
    });


// paste event: parse after value is inserted
if(quickPasteInput){
  quickPasteInput.addEventListener("paste", ()=>{
    requestAnimationFrame(()=>{ handleQuickPasteText(quickPasteInput.value); });
  }, {passive:true});
}


// Multi View actions
on(cmpSaveA, "click", ()=>{
  _cmp.a = snapshotCurrent();
  renderCompare();
  setChip("good","A 저장됨");
});
on(cmpSaveB, "click", ()=>{
  _cmp.b = snapshotCurrent();
  renderCompare();
  setChip("good","B 저장됨");
});
on(cmpSwap, "click", ()=>{
  const t = _cmp.a; _cmp.a = _cmp.b; _cmp.b = t;
  renderCompare();
  setChip("neu","A/B 교체됨");
});
on(cmpClear, "click", ()=>{
  _cmp.a = null; _cmp.b = null;
  renderCompare();
  setChip("neu","비교 초기화");
});

    on(calcBtn, "click", ()=>recalc());
    on(resetBtn, "click", ()=>{
      state.sportKey = "soccer";
      state.marketKey = "1x2";
      if(sportSelect) sportSelect.value = state.sportKey;
      fillMarketOptions();
      if(marketSelect) marketSelect.value = state.marketKey;
      if(lineValue) lineValue.value = "";
      if(pasteInput) pasteInput.value = "";
      if(quickPasteInput) quickPasteInput.value = "";
      if(quickPasteStatus) quickPasteStatus.textContent = "";
      if(scanTopWrap) scanTopWrap.style.display = "none";
      if(scanTopList) scanTopList.innerHTML = "";
      _cmp.a = null; _cmp.b = null;
      renderCompare();
      render();
      setChip("neu","초기화됨");
      setVState();
    });
  }

  // init
  try{
    fillSportOptions();
    fillMarketOptions();
    bindVState();
    bind();
    render();
    watchGlobalBar();
  }catch(e){
    console && console.error && console.error("[tool-virtual] init error", e);
  }
})();
