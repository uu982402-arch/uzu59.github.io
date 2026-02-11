/* 88ST Casino Strategies Tool — v1
   - Ultra-fast WIN/LOSE control
   - Supports: Martingale, Paroli, d'Alembert, Oscar's Grind, Fibonacci, Labouchere
   - Session tracker + recent 5 sessions (localStorage)
*/
(function(){
  "use strict";

  const KEY_SETTINGS = "88st_casino_calc_settings_v1";
  const KEY_SESSIONS = "88st_casino_sessions_v1";

  const STRATEGIES = ["martingale","paroli","dalembert","oscar","fibonacci","labouchere"];

  const $ = (id)=> document.getElementById(id);

  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

  function safeJsonParse(s, fallback){
    try{ return JSON.parse(s); }catch(e){ return fallback; }
  }

  function lsRead(key, fallback){
    try{
      const v = localStorage.getItem(key);
      if(!v) return fallback;
      return safeJsonParse(v, fallback);
    }catch(e){ return fallback; }
  }

  function lsWrite(key, val){
    try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
  }

  function numFromInput(el){
    const raw = String(el.value||"").replace(/[ ,]/g, "").trim();
    if(!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  function fmtMoney(n){
    const sign = n < 0 ? "-" : "";
    const v = Math.abs(Math.round(n));
    return sign + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function roundUp(n, inc){
    const i = Math.max(1, Math.floor(inc||1));
    return Math.ceil(n / i) * i;
  }

  function getOdds(settings){
    const o = Number(settings.odds);
    return (Number.isFinite(o) && o > 1) ? o : 2.0;
  }

  function fib(i){
    // 0:1, 1:1, 2:2 ...
    i = Math.max(0, Math.floor(i||0));
    if(i <= 1) return 1;
    let a=1, b=1;
    for(let k=2;k<=i;k++){
      const c = a + b;
      a=b; b=c;
      if(b > 1e9) break;
    }
    return b;
  }

  function parseSeq(str){
    const arr = String(str||"")
      .split(/[ ,]+/)
      .map(x=> Number(String(x).trim()))
      .filter(n=> Number.isFinite(n) && n > 0)
      .map(n=> Math.floor(n));
    return arr.length ? arr : [1,2,3,4];
  }

  function now(){ return Date.now(); }

  function defaultSettings(){
    return {
      preset: "PLAYER",
      odds: 2.0,
      baseBet: 10000,
      bankroll: 0,
      increment: 1000,
      targetMode: "auto",
      targetProfit: 0,
      strategy: "martingale",
      paroliMult: 2,
      paroliCap: 3,
      fibOddsAdjust: false,
      labOddsAdjust: true,
      labSeq: "1,2,3,4",
    };
  }

  function loadSettings(){
    const s = Object.assign(defaultSettings(), lsRead(KEY_SETTINGS, {}));
    if(!STRATEGIES.includes(s.strategy)) s.strategy = "martingale";
    // odds sanity
    s.odds = getOdds(s);
    s.baseBet = Math.max(1, Math.floor(s.baseBet||10000));
    s.increment = Math.max(1, Math.floor(s.increment||1000));
    s.paroliMult = clamp(Number(s.paroliMult||2), 1.1, 10);
    s.paroliCap = clamp(Math.floor(s.paroliCap||3), 0, 12);
    return s;
  }

  function saveSettings(settings){
    lsWrite(KEY_SETTINGS, settings);
  }

  function initSession(settings){
    return {
      id: "s_"+Math.random().toString(36).slice(2,10)+"_"+Date.now(),
      tsStart: now(),
      settings: Object.assign({}, settings),
      actions: []
    };
  }

  function profitFor(bet, odds, outcome){
    if(outcome === "W") return bet * (odds - 1);
    return -bet;
  }

  function computeTargetProfit(settings){
    const odds = getOdds(settings);
    if(settings.targetMode === "manual"){
      return Math.max(0, Number(settings.targetProfit||0));
    }
    return Math.max(0, settings.baseBet * (odds - 1));
  }

  function replay(session){
    const s = session.settings;
    const odds = getOdds(s);
    const inc = Math.max(1, s.increment||1);
    const base = Math.max(1, s.baseBet||1);
    const targetProfit = computeTargetProfit(s);

    const tracker = {
      odds,
      inc,
      base,
      targetProfit,
      step: 0,
      bet: base,
      pl: 0,
      peakPL: 0,
      mdd: 0,
      maxBet: base,
      // strategy internals
      mart_cumLoss: 0,
      par_streak: 0,
      dal_bet: base,
      osc_cyclePL: 0,
      fib_i: 0,
      lab_seq: parseSeq(s.labSeq),
      lab_init: parseSeq(s.labSeq),
    };

    function setBet(next){
      tracker.bet = Math.max(base, roundUp(next, inc));
      tracker.maxBet = Math.max(tracker.maxBet, tracker.bet);
    }

    function recalcLabBet(){
      const seq = tracker.lab_seq;
      const unit = base;
      const units = seq.length <= 1 ? (seq[0]||1) : (seq[0] + seq[seq.length-1]);
      if(s.labOddsAdjust){
        const need = (units * unit) / Math.max(0.0001, (odds - 1));
        setBet(need);
      }else{
        setBet(units * unit);
      }
      tracker.lab_units = units;
    }

    function recalcFibBet(){
      const unit = base;
      const units = fib(tracker.fib_i);
      if(s.fibOddsAdjust){
        const need = (units * unit) / Math.max(0.0001, (odds - 1));
        setBet(need);
      }else{
        setBet(units * unit);
      }
      tracker.fib_units = units;
    }

    // init bet per strategy
    switch(s.strategy){
      case "martingale":
        setBet(base);
        break;
      case "paroli":
        setBet(base);
        break;
      case "dalembert":
        tracker.dal_bet = base;
        setBet(base);
        break;
      case "oscar":
        tracker.osc_cyclePL = 0;
        setBet(base);
        break;
      case "fibonacci":
        tracker.fib_i = 0;
        recalcFibBet();
        break;
      case "labouchere":
        recalcLabBet();
        break;
    }

    for(const act of session.actions){
      tracker.step += 1;

      const betPlaced = tracker.bet;
      const pr = profitFor(betPlaced, odds, act.outcome);
      tracker.pl += pr;
      tracker.peakPL = Math.max(tracker.peakPL, tracker.pl);
      tracker.mdd = Math.max(tracker.mdd, tracker.peakPL - tracker.pl);
      tracker.maxBet = Math.max(tracker.maxBet, betPlaced);

      // update strategy
      switch(s.strategy){
        case "martingale": {
          if(act.outcome === "L"){
            tracker.mart_cumLoss += betPlaced;
            const need = (tracker.mart_cumLoss + targetProfit) / Math.max(0.0001, (odds - 1));
            setBet(need);
          }else{
            tracker.mart_cumLoss = 0;
            setBet(base);
          }
          break;
        }
        case "paroli": {
          if(act.outcome === "W"){
            tracker.par_streak += 1;
            const cap = Math.floor(s.paroliCap||0);
            if(cap > 0 && tracker.par_streak >= cap){
              tracker.par_streak = 0;
              setBet(base);
            }else{
              const mult = clamp(Number(s.paroliMult||2), 1.1, 10);
              setBet(betPlaced * mult);
            }
          }else{
            tracker.par_streak = 0;
            setBet(base);
          }
          break;
        }
        case "dalembert": {
          if(act.outcome === "L"){
            tracker.dal_bet = betPlaced + base;
          }else{
            tracker.dal_bet = Math.max(base, betPlaced - base);
          }
          setBet(tracker.dal_bet);
          break;
        }
        case "oscar": {
          if(act.outcome === "L"){
            // keep bet, cyclePL already updated by pr
            tracker.osc_cyclePL += pr;
            setBet(betPlaced);
          }else{
            tracker.osc_cyclePL += pr;
            // Target: one base-bet win profit at current odds
            const cycleTarget = base * (odds - 1);
            if(tracker.osc_cyclePL >= cycleTarget - 1e-9){
              tracker.osc_cyclePL = 0;
              setBet(base);
            }else{
              setBet(betPlaced + base);
            }
          }
          break;
        }
        case "fibonacci": {
          if(act.outcome === "L") tracker.fib_i += 1;
          else tracker.fib_i = Math.max(0, tracker.fib_i - 2);
          tracker.fib_i = clamp(tracker.fib_i, 0, 30);
          recalcFibBet();
          break;
        }
        case "labouchere": {
          // apply outcome to sequence
          const seq = tracker.lab_seq;
          const units = seq.length <= 1 ? (seq[0]||1) : (seq[0] + seq[seq.length-1]);
          if(act.outcome === "W"){
            if(seq.length === 1){ seq.pop(); }
            else{ seq.shift(); seq.pop(); }
            if(seq.length === 0){
              tracker.lab_seq = tracker.lab_init.slice();
            }
          }else{
            seq.push(units);
          }
          recalcLabBet();
          break;
        }
      }
    }

    // Recover bet: show most meaningful measure
    let recoverBet = null;
    if(s.strategy === "martingale"){
      recoverBet = tracker.bet;
    }else if(s.strategy === "labouchere" && s.labOddsAdjust){
      recoverBet = tracker.bet;
    }

    // bankroll remaining
    let bankrollLeft = null;
    if(Number(s.bankroll) > 0){
      bankrollLeft = Number(s.bankroll) + tracker.pl;
    }

    return {
      tracker,
      recoverBet,
      bankrollLeft,
      targetProfit
    };
  }

  function buildStrategyOptions(settings){
    const box = $("csStrategyOptions");
    if(!box) return;

    const odds = getOdds(settings);
    const tProfit = computeTargetProfit(settings);

    function chip(id, label, checked){
      return `<button class="cs-chip ${checked?"on":""}" type="button" id="${id}">${label}</button>`;
    }

    let html = "";
    if(settings.strategy === "paroli"){
      html = `
        <div class="cs-row">
          <div class="cs-field" style="min-width:180px;">
            <label>배수 (WIN 시)</label>
            <input id="csParoliMult" inputmode="decimal" value="${settings.paroliMult}"/>
          </div>
          <div class="cs-field" style="min-width:180px;">
            <label>연승 캡 (0=없음)</label>
            <input id="csParoliCap" inputmode="numeric" value="${settings.paroliCap}"/>
          </div>
        </div>
        <div class="small" style="margin-top:8px;">WIN이면 배수로 올리고, LOSE면 기본 베팅으로 리셋합니다.</div>
      `;
    }else if(settings.strategy === "fibonacci"){
      html = `
        <div class="cs-row" style="align-items:center;">
          <div class="cs-field" style="min-width:220px;">
            <label>배당 보정</label>
            <div class="cs-preset">
              ${chip("csFibAdj", settings.fibOddsAdjust ? "ON" : "OFF", settings.fibOddsAdjust)}
              <span class="small">ON이면 수열 유닛 이익을 (배당-1)로 보정합니다.</span>
            </div>
          </div>
        </div>
      `;
    }else if(settings.strategy === "labouchere"){
      html = `
        <div class="cs-row">
          <div class="cs-field" style="min-width:220px; flex:1.2;">
            <label>리스트(유닛)</label>
            <input id="csLabSeq" inputmode="text" value="${String(settings.labSeq||'1,2,3,4').replace(/"/g,'&quot;')}"/>
          </div>
        </div>
        <div class="cs-row" style="align-items:center; margin-top:10px;">
          <div class="cs-field" style="min-width:220px;">
            <label>배당 보정</label>
            <div class="cs-preset">
              ${chip("csLabAdj", settings.labOddsAdjust ? "ON" : "OFF", settings.labOddsAdjust)}
              <span class="small">ON이면 리스트 목표 유닛 이익을 (배당-1)로 보정합니다.</span>
            </div>
          </div>
        </div>
      `;
    }else if(settings.strategy === "martingale"){
      html = `
        <div class="small">마틴게일은 누적손실 + 목표이익을 1승으로 회복하도록 다음 베팅을 계산합니다. (배당 반영)</div>
        <div class="small" style="margin-top:6px;">현재 배당 <b>${odds.toFixed(2)}</b>, 목표이익 <b>${fmtMoney(tProfit)}</b></div>
      `;
    }else if(settings.strategy === "oscar"){
      html = `
        <div class="small">오스카 그라인드는 “1유닛 목표”를 달성할 때까지 WIN이면 +1유닛, LOSE면 유지(기본형)합니다.</div>
        <div class="small" style="margin-top:6px;">현재 목표(기본 1승 수익) <b>${fmtMoney(tProfit)}</b></div>
      `;
    }else if(settings.strategy === "dalembert"){
      html = `
        <div class="small">달랑베르는 LOSE면 +1유닛, WIN이면 -1유닛(기본 이하로는 내려가지 않음)으로 완만하게 조정합니다.</div>
      `;
    }

    box.innerHTML = html;

    // Wire option controls
    if($("csParoliMult")){
      $("csParoliMult").addEventListener("input", ()=>{
        settings.paroliMult = clamp(Number(numFromInput($("csParoliMult"))||2), 1.1, 10);
        saveSettings(settings);
        render();
      });
    }
    if($("csParoliCap")){
      $("csParoliCap").addEventListener("input", ()=>{
        settings.paroliCap = clamp(Math.floor(numFromInput($("csParoliCap"))||0), 0, 12);
        saveSettings(settings);
        render();
      });
    }
    if($("csFibAdj")){
      $("csFibAdj").addEventListener("click", ()=>{
        settings.fibOddsAdjust = !settings.fibOddsAdjust;
        saveSettings(settings);
        buildStrategyOptions(settings);
        render();
      });
    }
    if($("csLabAdj")){
      $("csLabAdj").addEventListener("click", ()=>{
        settings.labOddsAdjust = !settings.labOddsAdjust;
        saveSettings(settings);
        buildStrategyOptions(settings);
        render();
      });
    }
    if($("csLabSeq")){
      $("csLabSeq").addEventListener("input", ()=>{
        settings.labSeq = $("csLabSeq").value;
        saveSettings(settings);
        render();
      });
    }
  }

  let settings = null;
  let session = null;

  function syncInputs(){
    $("csOdds").value = Number(getOdds(settings)).toFixed(2);
    $("csBaseBet").value = String(settings.baseBet);
    $("csBankroll").value = settings.bankroll ? String(settings.bankroll) : "";
    $("csIncrement").value = String(settings.increment);
    $("csTargetMode").value = settings.targetMode;
    $("csTargetProfit").disabled = (settings.targetMode !== "manual");
    $("csTargetProfit").value = settings.targetMode === "manual" ? String(settings.targetProfit||0) : "";

    // preset chips
    const isPlayer = settings.preset === "PLAYER";
    $("csPresetPlayer").classList.toggle("on", isPlayer);
    $("csPresetBanker").classList.toggle("on", !isPlayer);

    // tabs
    const tabs = Array.from($("csTabs").querySelectorAll("button[data-strategy]"));
    for(const b of tabs){
      b.classList.toggle("on", b.getAttribute("data-strategy") === settings.strategy);
    }
  }

  function updateSettingsFromCommonInputs(){
    settings.odds = clamp(Number(numFromInput($("csOdds"))||settings.odds), 1.01, 20);
    settings.baseBet = Math.max(1, Math.floor(numFromInput($("csBaseBet"))||settings.baseBet));
    settings.bankroll = Math.max(0, Math.floor(numFromInput($("csBankroll"))||0));
    settings.increment = Math.max(1, Math.floor(numFromInput($("csIncrement"))||settings.increment));
    settings.targetMode = $("csTargetMode").value === "manual" ? "manual" : "auto";
    settings.targetProfit = Math.max(0, Math.floor(numFromInput($("csTargetProfit"))||0));
    saveSettings(settings);
  }

  function render(){
    if(!settings || !session) return;

    // Keep session settings in sync for replay
    session.settings = Object.assign({}, settings);

    const r = replay(session);
    const t = r.tracker;

    $("csNextBet").textContent = fmtMoney(t.bet);
    $("csStep").textContent = String(t.step);
    $("csPL").textContent = fmtMoney(t.pl);
    $("csMDD").textContent = fmtMoney(t.mdd);
    $("csRecoverBet").textContent = r.recoverBet ? fmtMoney(r.recoverBet) : "—";

    // recent log
    const body = $("csLogBody");
    const acts = session.actions;
    if(!acts.length){
      body.innerHTML = `<tr><td colspan="4" style="color:var(--muted, rgba(255,255,255,.62)); font-weight:900;">아직 기록이 없습니다. WIN/LOSE로 시작하세요.</td></tr>`;
    }else{
      const tail = acts.slice(-8);
      body.innerHTML = tail.map((a, idx)=>{
        const no = acts.length - tail.length + idx + 1;
        const bet = a.bet;
        const pl = a.profit;
        const res = a.outcome === "W" ? "WIN" : "LOSE";
        return `<tr>
          <td>${no}</td>
          <td>${res}</td>
          <td>${fmtMoney(bet)}</td>
          <td>${fmtMoney(pl)}</td>
        </tr>`;
      }).join("");
    }

    renderRecentSessions();
  }

  function applyOutcome(outcome){
    updateSettingsFromCommonInputs();
    const r = replay(session);
    const t = r.tracker;
    const bet = t.bet;
    const odds = t.odds;
    const pr = profitFor(bet, odds, outcome);
    session.actions.push({ ts: now(), outcome, bet, profit: pr });
    // autosave lightweight
    lsWrite(KEY_SETTINGS, settings);
    render();
  }

  function undo(){
    if(session.actions.length){
      session.actions.pop();
      render();
    }
  }

  function resetSession(saveAlso){
    if(saveAlso){ saveSession(); }
    session = initSession(settings);
    render();
  }

  function loadSessions(){
    const list = lsRead(KEY_SESSIONS, []);
    return Array.isArray(list) ? list : [];
  }

  function saveSessions(list){
    lsWrite(KEY_SESSIONS, list.slice(0,5));
  }

  function summarizeSession(ses){
    const r = replay(ses);
    const t = r.tracker;
    return {
      id: ses.id,
      tsStart: ses.tsStart,
      tsEnd: now(),
      strategy: ses.settings.strategy,
      preset: ses.settings.preset,
      odds: getOdds(ses.settings),
      baseBet: ses.settings.baseBet,
      rounds: ses.actions.length,
      pl: Math.round(t.pl),
      mdd: Math.round(t.mdd),
      maxBet: Math.round(t.maxBet),
      settings: ses.settings,
      actions: ses.actions
    };
  }

  function saveSession(){
    if(!session.actions.length) return;
    const list = loadSessions();
    const sum = summarizeSession(session);
    const filtered = list.filter(x=> x && x.id !== sum.id);
    filtered.unshift(sum);
    saveSessions(filtered);
  }

  function renderRecentSessions(){
    const holder = $("csRecentList");
    if(!holder) return;
    const list = loadSessions();
    if(!list.length){
      holder.innerHTML = `<div class="item"><div class="t">저장된 세션이 없습니다.</div><div class="m" style="margin-top:6px;">WIN/LOSE로 진행 후 “세션 저장”을 눌러주세요.</div></div>`;
      return;
    }
    holder.innerHTML = list.slice(0,5).map((s)=>{
      const titleMap = {
        martingale:"마틴게일", paroli:"파롤리", dalembert:"달랑베르", oscar:"오스카", fibonacci:"피보나치", labouchere:"라부셰르"
      };
      const t = titleMap[s.strategy] || s.strategy;
      const meta = `${s.preset} ${Number(s.odds).toFixed(2)} · 기본 ${fmtMoney(s.baseBet)} · ${s.rounds}R`;
      return `<div class="item">
        <div class="top">
          <div>
            <div class="t">${t}</div>
            <div class="m">${meta}</div>
          </div>
          <div class="m" style="text-align:right;">P/L <b style="color:var(--text, #f4f6ff);">${fmtMoney(s.pl)}</b><br/>MDD ${fmtMoney(s.mdd)}</div>
        </div>
        <div class="btns">
          <button class="cs-chip cs-mini-btn" type="button" data-load="${s.id}">불러오기</button>
          <button class="cs-chip cs-mini-btn" type="button" data-del="${s.id}">삭제</button>
        </div>
      </div>`;
    }).join("");

    // bind actions
    holder.querySelectorAll("button[data-load]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-load");
        const list2 = loadSessions();
        const found = list2.find(x=> x && x.id === id);
        if(!found) return;
        settings = Object.assign(defaultSettings(), found.settings || {});
        // ensure odds
        settings.odds = getOdds(settings);
        session = initSession(settings);
        session.actions = Array.isArray(found.actions) ? found.actions.map(a=>({ts:a.ts,outcome:a.outcome,bet:a.bet,profit:a.profit})) : [];
        syncInputs();
        buildStrategyOptions(settings);
        render();
      });
    });
    holder.querySelectorAll("button[data-del]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-del");
        const list2 = loadSessions().filter(x=> x && x.id !== id);
        saveSessions(list2);
        renderRecentSessions();
      });
    });
  }

  function setPreset(preset){
    settings.preset = preset;
    if(preset === "PLAYER") settings.odds = 2.0;
    if(preset === "BANKER") settings.odds = 1.97;
    saveSettings(settings);
    syncInputs();
    buildStrategyOptions(settings);
    render();
  }

  function setStrategy(strategy){
    if(!STRATEGIES.includes(strategy)) return;
    settings.strategy = strategy;
    saveSettings(settings);
    // Reset session on strategy change (keeps settings)
    session = initSession(settings);
    syncInputs();
    buildStrategyOptions(settings);
    render();
  }

  function boot(){
    settings = loadSettings();
    session = initSession(settings);

    // hash routing
    const hash = (location.hash||"").replace(/^#/,"").trim();
    if(hash && STRATEGIES.includes(hash)) settings.strategy = hash;

    // bind
    $("csPresetPlayer").addEventListener("click", ()=> setPreset("PLAYER"));
    $("csPresetBanker").addEventListener("click", ()=> setPreset("BANKER"));

    $("csOdds").addEventListener("input", ()=>{ updateSettingsFromCommonInputs(); buildStrategyOptions(settings); render(); });
    $("csBaseBet").addEventListener("input", ()=>{ updateSettingsFromCommonInputs(); buildStrategyOptions(settings); render(); });
    $("csBankroll").addEventListener("input", ()=>{ updateSettingsFromCommonInputs(); render(); });
    $("csIncrement").addEventListener("input", ()=>{ updateSettingsFromCommonInputs(); buildStrategyOptions(settings); render(); });

    $("csTargetMode").addEventListener("change", ()=>{
      settings.targetMode = $("csTargetMode").value === "manual" ? "manual" : "auto";
      $("csTargetProfit").disabled = (settings.targetMode !== "manual");
      if(settings.targetMode !== "manual") settings.targetProfit = 0;
      saveSettings(settings);
      buildStrategyOptions(settings);
      render();
    });
    $("csTargetProfit").addEventListener("input", ()=>{ updateSettingsFromCommonInputs(); buildStrategyOptions(settings); render(); });

    $("csTabs").addEventListener("click", (e)=>{
      const btn = e.target && e.target.closest("button[data-strategy]");
      if(!btn) return;
      const st = btn.getAttribute("data-strategy");
      history.replaceState(null, "", "#"+st);
      setStrategy(st);
    });

    $("csWin").addEventListener("click", ()=> applyOutcome("W"));
    $("csLose").addEventListener("click", ()=> applyOutcome("L"));
    $("csUndo").addEventListener("click", ()=> undo());
    $("csReset").addEventListener("click", ()=> resetSession(true));
    $("csSaveSession").addEventListener("click", ()=>{ saveSession(); renderRecentSessions(); });

    // Ctrl+K search is handled by shell

    // initial render
    syncInputs();
    buildStrategyOptions(settings);
    render();

    // keep hash changes
    window.addEventListener("hashchange", ()=>{
      const h = (location.hash||"").replace(/^#/,"").trim();
      if(STRATEGIES.includes(h)) setStrategy(h);
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
