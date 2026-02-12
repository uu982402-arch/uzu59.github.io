/* 88ST MiniGame Analyzer — VIP3
   - User inputs odds
   - Optional: user probability (%) per outcome
   - Optional: paste recent results to infer frequency
   - Outputs: implied prob, overround, fair odds, EV
*/
(function(){
  'use strict';

  const BUILD = '20260212_VIP3_mg1';
  const KEY = '88st_minigame_state_v1';

  const GAMES = [
    {
      id: 'dong_pwb_plus',
      title: '동행 파워볼+',
      markets: [
        { id: 'pwb_oe2', title: '파워볼 홀/짝', outcomes: [
          {id:'odd', label:'홀', synonyms:['홀','odd','o']},
          {id:'even', label:'짝', synonyms:['짝','even','e']}
        ]},
        { id: 'pwb_ou2', title: '파워볼 언더/오버', outcomes: [
          {id:'under', label:'언더', synonyms:['언더','under','u']},
          {id:'over', label:'오버', synonyms:['오버','over','o']}
        ]},
        { id: 'sum_oe', title: '일반볼(합) 홀/짝', outcomes: [
          {id:'odd', label:'홀', synonyms:['홀','odd','o']},
          {id:'even', label:'짝', synonyms:['짝','even','e']}
        ]},
        { id: 'sum_ou', title: '일반볼(합) 언더/오버', outcomes: [
          {id:'under', label:'언더', synonyms:['언더','under','u']},
          {id:'over', label:'오버', synonyms:['오버','over','o']}
        ]},
        { id: 'sum_sml', title: '일반볼(합) 대/중/소', outcomes: [
          {id:'big', label:'대', synonyms:['대','big','b']},
          {id:'mid', label:'중', synonyms:['중','mid','m']},
          {id:'small', label:'소', synonyms:['소','small','s']},
        ]},
      ]
    },
    {
      id: 'dong_kino_ladder',
      title: '동행 키노사다리',
      markets: [
        { id: 'lr', title: '좌/우', outcomes: [
          {id:'left', label:'좌', synonyms:['좌','left','l']},
          {id:'right', label:'우', synonyms:['우','right','r']},
        ]},
        { id: 'lines', title: '3줄/4줄', outcomes: [
          {id:'line3', label:'3줄', synonyms:['3','3줄','3line','three']},
          {id:'line4', label:'4줄', synonyms:['4','4줄','4line','four']},
        ]},
        { id: 'start', title: '시작점 홀/짝', outcomes: [
          {id:'odd', label:'홀', synonyms:['홀','odd','o']},
          {id:'even', label:'짝', synonyms:['짝','even','e']},
        ]},
      ]
    },
    {
      id: 'dong_speed_kino_ladder',
      title: '동행 스피드키노사다리',
      markets: [
        { id: 'lr2', title: '좌/우', outcomes: [
          {id:'left', label:'좌', synonyms:['좌','left','l']},
          {id:'right', label:'우', synonyms:['우','right','r']},
        ]},
        { id: 'lines2', title: '3줄/4줄', outcomes: [
          {id:'line3', label:'3줄', synonyms:['3','3줄','3line','three']},
          {id:'line4', label:'4줄', synonyms:['4','4줄','4line','four']},
        ]},
        { id: 'start2', title: '시작점 홀/짝', outcomes: [
          {id:'odd', label:'홀', synonyms:['홀','odd','o']},
          {id:'even', label:'짝', synonyms:['짝','even','e']},
        ]},
      ]
    },
  ];

  const $ = (id)=> document.getElementById(id);

  function fmt(n, d=2){
    if(!Number.isFinite(n)) return '—';
    return n.toLocaleString(undefined, {maximumFractionDigits:d});
  }
  function pct(n, d=2){
    if(!Number.isFinite(n)) return '—';
    return (n*100).toLocaleString(undefined, {maximumFractionDigits:d}) + '%';
  }
  function clamp01(x){
    if(!Number.isFinite(x)) return NaN;
    return Math.max(0, Math.min(1, x));
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(e){ return null; }
  }
  function saveState(s){
    try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){}
  }

  function defaultState(){
    const g = GAMES[0];
    const m = g.markets[0];
    const odds = {};
    const probs = {};
    m.outcomes.forEach(o=>{ odds[o.id] = 1.95; probs[o.id] = ''; });
    return {
      game: g.id,
      market: m.id,
      stake: 10000,
      odds,
      probs,
      recentN: 6,
      historyText: ''
    };
  }

  let state = loadState() || defaultState();
  if(!state.recentN) state.recentN = 6;

  function getGame(id){ return GAMES.find(g=> g.id === id) || GAMES[0]; }
  function getMarket(game, marketId){ return game.markets.find(m=> m.id === marketId) || game.markets[0]; }

  function ensureMarketState(market){
    state.odds = state.odds || {};
    state.probs = state.probs || {};
    market.outcomes.forEach(o=>{
      if(state.odds[o.id] == null) state.odds[o.id] = 1.95;
      if(state.probs[o.id] == null) state.probs[o.id] = '';
    });
    // prune unrelated keys to keep state compact
    const keep = new Set(market.outcomes.map(o=> o.id));
    for(const k of Object.keys(state.odds)) if(!keep.has(k)) delete state.odds[k];
    for(const k of Object.keys(state.probs)) if(!keep.has(k)) delete state.probs[k];
  }

  function renderGameTabs(){
    const host = $('mgGameTabs');
    if(!host) return;
    host.innerHTML = GAMES.map(g=>
      `<button class="mg-chip ${g.id===state.game?'on':''}" type="button" data-game="${g.id}">${g.title}</button>`
    ).join('');
    host.querySelectorAll('button[data-game]').forEach(b=>{
      b.addEventListener('click', ()=>{
        state.game = b.getAttribute('data-game');
        const game = getGame(state.game);
        state.market = game.markets[0].id;
        ensureMarketState(game.markets[0]);
        saveState(state);
        renderAll();
      });
    });
  }

  function renderMarketSelect(){
    const game = getGame(state.game);
    const sel = $('mgMarket');
    if(!sel) return;
    sel.innerHTML = game.markets.map(m=>
      `<option value="${m.id}">${m.title}</option>`
    ).join('');
    sel.value = state.market;
    sel.onchange = ()=>{
      state.market = sel.value;
      const market = getMarket(game, state.market);
      ensureMarketState(market);
      saveState(state);
      renderOutcomes();
      calcAndRender();
    };
  }

  // Render input table (odds + user probability)
  function renderOutcomes(){
    const game = getGame(state.game);
    const market = getMarket(game, state.market);
    ensureMarketState(market);

    const tbody = $('mgInputBody');
    if(!tbody) return;

    tbody.innerHTML = market.outcomes.map(o=>{
      const ov = state.odds[o.id];
      const pv = state.probs[o.id];
      return `
        <tr data-out="${o.id}">
          <td><span class="mg-pill">${o.label}</span></td>
          <td><input class="mg-in" inputmode="decimal" data-k="odds" value="${ov ?? ''}"/></td>
          <td><input class="mg-in" inputmode="decimal" data-k="prob" placeholder="자동" value="${pv ?? ''}" readonly/></td>
          <td class="mg-note">—</td>
        </tr>
      `;
    }).join('');

    // bind inputs
    tbody.querySelectorAll('input.mg-in').forEach(inp=>{
      inp.addEventListener('input', debounce(()=>{
        const tr = inp.closest('tr');
        if(!tr) return;
        const id = tr.getAttribute('data-out');
        const k = inp.getAttribute('data-k');
        if(k === 'odds') state.odds[id] = toNum(inp.value);
        if(k === 'prob') state.probs[id] = inp.value;
        saveState(state);
        calcAndRender();
      }, 80));
    });
  }

  function toNum(v){
    const x = Number(String(v).replace(/,/g,'').trim());
    return Number.isFinite(x) ? x : NaN;
  }

  function parseProbPct(v){
    const x = toNum(v);
    if(!Number.isFinite(x)) return NaN;
    return clamp01(x/100);
  }

  function calc(){
    const game = getGame(state.game);
    const market = getMarket(game, state.market);

    // history sample count (best-effort)
    let historyN = 0;
    try{
      if(state.historyText){
        historyN = computeFreqFromHistory(state.historyText, market).total || 0;
      }
    }catch(e){ historyN = 0; }

    const outs = market.outcomes.map(o=>{
      const odds = toNum(state.odds[o.id]);
      const be = Number.isFinite(odds) && odds>0 ? 1/odds : NaN;
      const imp = be;
      const userP = parseProbPct(state.probs[o.id]);
      return { id:o.id, label:o.label, odds, be, imp, userP };
    });

    const sumImp = outs.reduce((a,x)=> a + (Number.isFinite(x.imp)?x.imp:0), 0);
    const margin = Number.isFinite(sumImp) ? (sumImp - 1) : NaN;

    // fair probs/odds
    outs.forEach(x=>{
      x.fairP = (Number.isFinite(x.imp) && sumImp>0) ? x.imp / sumImp : NaN;
      x.fairOdds = Number.isFinite(x.fairP) && x.fairP>0 ? 1/x.fairP : NaN;
      const p = x.userP;
      x.evPct = (Number.isFinite(p) && Number.isFinite(x.odds)) ? (p * x.odds - 1) : NaN;
      x.evMoney = Number.isFinite(x.evPct) ? (toNum(state.stake) * x.evPct) : NaN;
    });

    return { outs, sumImp, margin, historyN };
  }

  function verdict(evPct){
    if(!Number.isFinite(evPct)) return {t:'—', cls:'neutral'};
    if(evPct >= 0.02) return {t:'추천', cls:'good'};
    if(evPct > -0.02) return {t:'주의', cls:'warn'};
    return {t:'PASS', cls:'bad'};
  }

  function calcAndRender(){
    const res = calc();

    // KPI
    const sumImp = res.sumImp;
    const margin = res.margin;
    $('mgSumP') && ($('mgSumP').textContent = Number.isFinite(sumImp) ? fmt(sumImp, 4) : '—');
    $('mgMargin') && ($('mgMargin').textContent = Number.isFinite(margin) ? pct(margin, 2) : '—');
    $('mgN') && ($('mgN').textContent = state.historyText ? String(res.historyN||0) : '—');
    $('mgMode') && ($('mgMode').textContent = `최근 ${state.recentN||6}개`);

    // Output table
    const outBody = $('mgOutBody');
    if(outBody){
      outBody.innerHTML = res.outs.map(x=>{
        const v = verdict(x.evPct);
        const bePct = Number.isFinite(x.be) ? pct(x.be, 2) : '—';
        const fairP = Number.isFinite(x.fairP) ? pct(x.fairP, 2) : '—';
        const fairOdds = Number.isFinite(x.fairOdds) ? fmt(x.fairOdds, 3) : '—';
        const evPct = Number.isFinite(x.evPct) ? pct(x.evPct, 2) : '—';
        return `
          <tr>
            <td><span class="mg-pill">${x.label}</span></td>
            <td class="mg-right">${bePct}</td>
            <td class="mg-right">${fairP}</td>
            <td class="mg-right">${fairOdds}</td>
            <td class="mg-right">${evPct}</td>
            <td><span class="mg-tag ${v.cls}">${v.t}</span></td>
          </tr>
        `;
      }).join('');
    }
  }

  function bindActions(){
    $('mgReset')?.addEventListener('click', ()=>{
      state = defaultState();
      saveState(state);
      renderAll();
    });

    $('mgFillFair')?.addEventListener('click', ()=>{ toast('이 버전은 내 확률 입력을 사용하지 않습니다. 최근 결과 기반으로 계산하세요.'); });
      saveState(state);
      renderOutcomes();
      calcAndRender();
    });

    $('mgSave')?.addEventListener('click', ()=>{
      saveState(state);
    });

    $('mgAnalyze')?.addEventListener('click', ()=>{
      calcAndRender();
      // Smoothly bring results into view on mobile
      document.querySelector('[aria-label="결과"]')?.scrollIntoView({behavior:'smooth', block:'start'});
    });
  }

  function bestPick(outs){
    const list = outs.filter(x=> Number.isFinite(x.evPct)).sort((a,b)=> b.evPct - a.evPct);
    return list[0] || null;
  }

  function setText(tr, key, text){
    const el = tr.querySelector(`[data-k="${key}"]`);
    if(el) el.textContent = text;
  }

  function cssEscape(s){
    return String(s).replace(/"/g,'\\"');
  }

  function debounce(fn, wait){
    let t=null;
    return function(){
      clearTimeout(t);
      const args = arguments;
      t=setTimeout(()=> fn.apply(null,args), wait);
    };
  }

  function normalizeToken(t){
    return String(t||'').trim().toLowerCase();
  }

  function computeFreqFromHistory(text, market){
    const tokens = String(text||'')
      .replace(/[,|]+/g, ' ')
      .replace(/[\r\n\t]+/g, ' ')
      .split(' ')
      .map(normalizeToken)
      .filter(Boolean);

    const map = new Map();
    market.outcomes.forEach(o=>{
      o.synonyms.forEach(s=> map.set(normalizeToken(s), o.id));
      map.set(normalizeToken(o.label), o.id);
    });

    const counts = {};
    let total = 0;
    tokens.forEach(tok=>{
      const id = map.get(tok);
      if(!id) return;
      counts[id] = (counts[id]||0) + 1;
      total++;
    });

    const probs = {};
    market.outcomes.forEach(o=>{
      const c = counts[o.id]||0;
      probs[o.id] = total>0 ? (c/total) : NaN;
    });

    return { total, counts, probs };
  }


  function computeFreqRecent(text, market, recentN){
    const raw = String(text||"").trim();
    if(!raw) return { total:0, counts:{}, probs:{} };
    const toks = raw.split(/\s+|,|\|/).map(s=>s.trim()).filter(Boolean);
    const mapped = [];
    for(const t of toks){
      const id = mapTokenToOutcome(t, market);
      if(id) mapped.push(id);
    }
    if(!mapped.length) return { total:0, counts:{}, probs:{} };
    const n = clamp(parseInt(recentN||6,10)||6, 1, 20);
    const slice = mapped.slice(-n);
    const counts = {};
    slice.forEach(id=>{ counts[id] = (counts[id]||0)+1; });
    const probs = {};
    market.outcomes.forEach(o=>{
      probs[o.id] = (counts[o.id]||0) / slice.length;
    });
    return { total: slice.length, counts, probs };
  }



  function bindHistory(){
    const ta = $('mgHistory');
    const btn = $('mgApplyFreq');
    if(!ta || !btn) return;

    ta.value = state.historyText || '';

    const selN = $('mgRecentN');
    if(selN){
      selN.value = String(state.recentN||6);
      selN.addEventListener('change', ()=>{
        state.recentN = parseInt(selN.value,10)||6;
        saveState(state);
        // auto re-apply if history exists
        if(ta.value.trim()) btn.click();
      });
    }

    ta.addEventListener('input', debounce(()=>{
      state.historyText = ta.value;
      saveState(state);
    }, 150));

    btn.addEventListener('click', ()=>{
      const game = getGame(state.game);
      const market = getMarket(game, state.market);
      const r = computeFreqRecent(ta.value, market, state.recentN);
      if(!r.total){
        toast('매핑 가능한 결과가 없습니다. (예: 홀 짝 홀 / 좌 우 좌)');
        return;
      }
      market.outcomes.forEach(o=>{
        const p = r.probs[o.id];
        if(Number.isFinite(p)) state.probs[o.id] = String((p*100).toFixed(2));
      });
      saveState(state);
      renderOutcomes();
      calcAndRender();
      // keep for KPI
      state._lastHistoryN = r.total;
      toast(`최근 ${r.total}개 → 확률 반영 완료`);
    });

    $('mgClearHistory')?.addEventListener('click', ()=>{
      state.historyText = '';
      ta.value = '';
      saveState(state);
      toast('히스토리 초기화');
    });
  }

  function bindStake(){
    const inp = $('mgStake');
    if(!inp) return;
    inp.value = state.stake ?? 10000;
    inp.addEventListener('input', debounce(()=>{
      state.stake = toNum(inp.value);
      saveState(state);
      calcAndRender();
    }, 80));
  }

  function toast(msg){
    const el = $('mgToast');
    if(!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> el.classList.remove('on'), 1800);
  }

  function renderAll(){
    renderGameTabs();
    renderMarketSelect();
    renderOutcomes();
    bindStake();
    bindHistory();
    bindActions();
    calcAndRender();
  }

  document.addEventListener('DOMContentLoaded', renderAll);
})();
