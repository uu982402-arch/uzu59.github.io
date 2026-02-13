/* 88ST MiniGame Analyzer — VIP3
   - User inputs odds
   - Optional: user probability (%) per outcome
   - Optional: paste recent results to infer frequency
   - Outputs: implied prob, overround, fair odds, EV
*/
(function(){
  'use strict';

  const BUILD = 'VIP4_20260213_09_mg3_proplus';
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


  function clamp(x, a, b){
    const n = Number(x);
    if(!Number.isFinite(n)) return a;
    return Math.max(a, Math.min(b, n));
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
    const btnReset = $('mgReset');
    if(btnReset) btnReset.onclick = ()=>{
      state = defaultState();
      saveState(state);
      renderAll();
    };

    const btnSave = $('mgSave');
    if(btnSave) btnSave.onclick = ()=>{
      saveState(state);
      toast('저장 완료');
    };

    const btnAnalyze = $('mgAnalyze');
    if(btnAnalyze) btnAnalyze.onclick = ()=>{
      const game = getGame(state.game);
      const market = getMarket(game, state.market);
      let r = null;
      if(state.historyText && String(state.historyText).trim()){
        r = computeFreqRecent(state.historyText, market, state.recentN);
        if(r && r.total){
          // Apply recent frequency to probs (readonly inputs)
          market.outcomes.forEach(o=>{
            const p = r.probs[o.id];
            if(Number.isFinite(p)) state.probs[o.id] = String((p*100).toFixed(2));
          });
          saveState(state);
          renderOutcomes();
        }
      }
      calcAndRender();
      const host = $('mgProInsights');
      if(r && r.total){
        renderProInsights(market, r);
      }else if(host){
        host.innerHTML = '<div class="mg-note">최근 결과를 붙여넣으면 Pro+ 인사이트가 활성화됩니다.</div>';
      }
      document.querySelector('[aria-label="결과"]')?.scrollIntoView({behavior:'smooth', block:'start'});
    };

    const btnFill = $('mgFillFair');
    if(btnFill) btnFill.onclick = ()=>{ toast('이 버전은 공정확률 자동 채우기를 사용하지 않습니다. 히스토리 기반 확률을 사용하세요.'); };
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


  function escapeHtml(s){
    return String(s ?? '').replace(/[&<>"']/g, (ch)=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }

  function mapTokenToOutcome(token, market){
    const t = normalizeToken(token);
    if(!t) return null;
    const outs = (market && market.outcomes) ? market.outcomes : [];
    for(const o of outs){
      if(normalizeToken(o.label) === t) return o.id;
      const syn = Array.isArray(o.synonyms) ? o.synonyms : [];
      for(const s of syn){
        if(normalizeToken(s) === t) return o.id;
      }
    }
    return null;
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
    const toks = raw.split(/[\s,|]+/).map(s=>s.trim()).filter(Boolean);
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
    return { total: slice.length, counts, probs, seq: slice };
  }



  
  function labelOf(id, market){
    const o = market.outcomes.find(x=> x.id===id);
    return o ? o.label : String(id||'');
  }

  
  function renderProInsights(market, freqResult){
    const host = $('mgProInsights');
    if(!host) return;

    const seq = (freqResult && Array.isArray(freqResult.seq)) ? freqResult.seq : [];
    const nAll = seq.length;

    const n3  = Math.min(3,  nAll);
    const n10 = Math.min(10, nAll);
    const nN  = Math.min(state.recentN||6, nAll);

    const win = (n)=> (n? seq.slice(-n) : []);

    const w3  = win(n3);
    const w10 = win(n10);
    const wN  = win(nN);

    function pct(x){ return (x*100).toFixed(1)+'%'; }

    function entropy(probs){
      let h=0; let k=0;
      for(const p of probs){ if(p>0){ h += -p*Math.log(p); k++; } }
      const max = k>1 ? Math.log(k) : 1;
      return max ? (h/max) : 0;
    }

    function countsOf(arr){
      const c = {};
      market.outcomes.forEach(o=>{ c[o.id]=0; });
      for(const x of arr){ if(c[x]!=null) c[x]++; }
      return c;
    }

    function probsFromCounts(c, n){
      return market.outcomes.map(o=> (n? (c[o.id]/n) : 0));
    }

    const cAll = countsOf(seq);
    const c3   = countsOf(w3);
    const c10  = countsOf(w10);
    const cN   = countsOf(wN);

    const pAll = probsFromCounts(cAll, nAll);
    const p3   = probsFromCounts(c3,  n3);
    const p10  = probsFromCounts(c10, n10);
    const pN   = probsFromCounts(cN,  nN);

    // streak & switch rate (overall)
    let streakSide = null, streakLen = 0, switches = 0;
    if(nAll>=2){
      for(let i=1;i<nAll;i++){ if(seq[i]!==seq[i-1]) switches++; }
    }
    if(nAll>=1){
      streakSide = seq[nAll-1];
      streakLen = 1;
      for(let i=nAll-2;i>=0;i--){ if(seq[i]===streakSide) streakLen++; else break; }
    }
    const switchRate = (nAll>=2) ? (switches/(nAll-1)) : 0;

    // deviation helpers
    function maxDelta(pA, pB){
      let m=0;
      for(let i=0;i<market.outcomes.length;i++){
        m = Math.max(m, Math.abs(pA[i]-pB[i]));
      }
      return m;
    }

    const deltaN  = maxDelta(pN,  pAll);
    const delta3  = maxDelta(p3,  pAll);
    const delta10 = maxDelta(p10, pAll);

    // Dynamic bias score (two-proportion z approx vs overall baseline)
    function maxZ(pRecent, nRecent){
      if(!nAll || !nRecent) return 0;
      let mz = 0;
      for(let i=0;i<market.outcomes.length;i++){
        const p0 = pAll[i];
        const p1 = pRecent[i];
        if(p0<=0 || p0>=1) continue;
        const se = Math.sqrt((p0*(1-p0))/Math.max(nRecent,1));
        if(se<=0) continue;
        const z = Math.abs((p1 - p0)/se);
        if(z>mz) mz=z;
      }
      return mz;
    }

    const z3  = maxZ(p3,  n3);
    const z10 = maxZ(p10, n10);
    const zN  = maxZ(pN,  nN);
    const zMax = Math.max(z3, z10, zN);

    // Bias level: thresholds auto-adjust with sample size
    function biasLevel(n){
      // stricter when sample is small
      const zStrong = (n>=10) ? 2.0 : (n>=6 ? 2.2 : 2.6);
      const zMid    = (n>=10) ? 1.5 : (n>=6 ? 1.7 : 2.0);
      return { zStrong, zMid };
    }
    const th = biasLevel(Math.max(n10, nN));
    const strong = (Math.max(delta10, deltaN) >= 0.25 && zMax >= th.zStrong && nAll>=10);
    const mid    = (!strong && Math.max(delta10, deltaN) >= 0.15 && zMax >= th.zMid && nAll>=6);

    const biasBadge = strong ? '강한 편향' : (mid ? '편향' : '보통');

    const volScore = market.outcomes.length===2
      ? Math.round(switchRate*100)
      : Math.round(entropy(pN.length? pN : pAll)*100);

    const volLabel = volScore>=70 ? '변동 큼' : (volScore>=40 ? '보통' : '안정');

    // top outcome in recent-N
    let topIdx = 0;
    for(let i=1;i<pN.length;i++){ if(pN[i]>pN[topIdx]) topIdx=i; }
    const topOutcome = market.outcomes[topIdx];
    const topVal = pN[topIdx];

    // Mean reversion caution (NOT prediction)
    const meanRevertWarn = (strong && nAll>=10 && (
      // stronger evidence when sample is small
      (streakLen>=3 && zMax>=Math.max(th.zStrong,2.2)) ||
      (Math.max(delta10,deltaN)>= (nAll>=20 ? 0.28 : 0.33) && zMax>=th.zStrong)
    ));

    // Render cards + compare table + warning
    host.innerHTML = '';
    const cards = [
      {
        k: `최근 ${nN||0}회 최다`,
        v: (topOutcome ? `${topOutcome.label} · ${pct(topVal)}` : '데이터 없음'),
        s: (nAll? `최근 ${n3||0}/${n10||0}/${nAll} 비교 가능` : '최근 결과를 붙여넣어주세요'),
        badge: biasBadge
      },
      {
        k: '연속(스트릭)',
        v: (streakSide ? `${labelOf(streakSide, market)} ${streakLen}연속` : '데이터 없음'),
        s: (nAll>=2 ? `전환율 ${Math.round(switchRate*100)}% (전환↑ = 패턴 난이도↑)` : '표본이 부족합니다'),
        badge: volLabel
      },
      {
        k: '편향 점수',
        v: (nAll ? `Δ ${pct(Math.max(delta10,deltaN))} · z ${zMax.toFixed(2)}` : '데이터 없음'),
        s: '최근 구간이 전체 평균과 얼마나 다른지(표본수에 따라 자동 보정)',
        badge: biasBadge
      },
      {
        k: '변동성 점수',
        v: `${volScore}/100`,
        s: (market.outcomes.length===2 ? '전환율 기반' : '엔트로피 기반'),
        badge: volLabel
      }
    ];

    const grid = document.createElement('div');
    grid.className = 'mg-pro-grid';
    cards.forEach(c=>{
      const div = document.createElement('div');
      div.className = 'mg-pro-card';
      div.innerHTML = `
        <div class="mg-pro-k">${escapeHtml(c.k)}</div>
        <div class="mg-pro-v">${escapeHtml(c.v)}</div>
        <div class="mg-pro-s"><span class="mg-pro-badge">${escapeHtml(c.badge)}</span> ${escapeHtml(c.s)}</div>
      `;
      grid.appendChild(div);
    });
    host.appendChild(grid);

    // comparison table (recent3 vs recent10 vs overall)
    const wrap = document.createElement('div');
    wrap.className = 'mg-pro-compare';
    const rows = market.outcomes.map((o, i)=>{
      const d3  = (n3 ? (p3[i]-pAll[i]) : 0);
      const d10 = (n10? (p10[i]-pAll[i]) : 0);
      return `
        <tr>
          <td class="mg-pro-td-out">${escapeHtml(o.label)}</td>
          <td>${n3? pct(p3[i]) : '-'}</td>
          <td>${n10? pct(p10[i]) : '-'}</td>
          <td>${nAll? pct(pAll[i]) : '-'}</td>
          <td class="${d3>=0?'mg-pro-pos':'mg-pro-neg'}">${n3? ((d3>=0?'+':'')+pct(Math.abs(d3))) : '-'}</td>
          <td class="${d10>=0?'mg-pro-pos':'mg-pro-neg'}">${n10? ((d10>=0?'+':'')+pct(Math.abs(d10))) : '-'}</td>
        </tr>
      `;
    }).join('');

    wrap.innerHTML = `
      <div class="mg-pro-compare-head">
        <div class="mg-pro-compare-title">최근 3 vs 최근 10 vs 전체 비교</div>
        <div class="mg-pro-compare-sub">표본: 최근3(${n3}) · 최근10(${n10}) · 전체(${nAll})</div>
      </div>
      <div class="mg-pro-table-wrap">
        <table class="mg-pro-table">
          <thead>
            <tr>
              <th>결과</th>
              <th>최근3</th>
              <th>최근10</th>
              <th>전체</th>
              <th>Δ3-전체</th>
              <th>Δ10-전체</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="6" style="text-align:center;opacity:.7;">최근 결과를 붙여넣어 주세요</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="mg-pro-foot">Δ는 “최근 구간 − 전체 평균”의 차이입니다. (의미 해석은 표본수에 크게 좌우됨)</div>
    `;
    
    host.appendChild(wrap);

    // trend chips (arrow) — quick visual
    const trend = document.createElement('div');
    trend.className = 'mg-pro-trend';
    const chips = market.outcomes.map((o,i)=>{
      const d3  = n3  ? (p3[i]-pAll[i])  : 0;
      const d10 = n10 ? (p10[i]-pAll[i]) : 0;
      const sign3  = d3===0 ? 0 : (d3>0?1:-1);
      const sign10 = d10===0? 0 : (d10>0?1:-1);
      let arrow = '→';
      if(sign3===1 && sign10===1) arrow='↑';
      else if(sign3===-1 && sign10===-1) arrow='↓';
      else if(sign3===0 && sign10!==0) arrow = sign10>0?'↑':'↓';
      else if(sign10===0 && sign3!==0) arrow = sign3>0?'↑':'↓';
      else if(sign3!==0 && sign10!==0 && sign3!==sign10) arrow='↕';
      const mag = Math.max(Math.abs(d3), Math.abs(d10));
      const cls = (arrow==='↑') ? 'mg-pro-chip-up' : (arrow==='↓' ? 'mg-pro-chip-down' : 'mg-pro-chip-flat');
      const sub = (nAll? `Δmax ${pct(mag)}` : '');
      return `<div class="mg-pro-chip ${cls}"><span class="mg-pro-chip-a">${arrow}</span><span class="mg-pro-chip-l">${escapeHtml(o.label)}</span><span class="mg-pro-chip-s">${escapeHtml(sub)}</span></div>`;
    }).join('');
    trend.innerHTML = `
      <div class="mg-pro-sec-head">
        <div class="mg-pro-sec-title">추세 한눈에</div>
        <div class="mg-pro-sec-sub">최근3/최근10이 전체 대비 같은 방향이면 ↑/↓, 엇갈리면 ↕</div>
      </div>
      <div class="mg-pro-chip-row">${chips || ''}</div>
    `;
    host.appendChild(trend);

    // transition table (streak -> next) — what usually follows?
    const trans = document.createElement('div');
    trans.className = 'mg-pro-trans';
    const maxK = 4;
    function buildTrans(windowArr){
      const n = windowArr.length;
      const rows = [];
      if(n < 3) return rows;
      // for each position i as "next", measure streak length ending at i-1
      for(let i=1;i<n;i++){
        const prev = windowArr[i-1];
        // streak length back from i-1
        let k=1;
        for(let j=i-2;j>=0 && windowArr[j]===prev && k<maxK;j--) k++;
        const next = windowArr[i];
        rows.push({k, prev, next});
      }
      // aggregate
      const agg = {};
      for(const r of rows){
        const key = `${r.k}|${r.prev}`;
        agg[key] = agg[key] || {k:r.k, prev:r.prev, total:0, nextCounts:{}};
        agg[key].total++;
        agg[key].nextCounts[r.next] = (agg[key].nextCounts[r.next]||0)+1;
      }
      return Object.values(agg).sort((a,b)=> (a.k-b.k));
    }
    function renderTransBlock(title, arr){
      const list = buildTrans(arr);
      if(!list.length) return `<div class="mg-pro-trans-empty">표본이 부족합니다</div>`;
      const isBinary = market.outcomes.length===2;
      const rowsHtml = list.map(item=>{
        const prevLabel = labelOf(item.prev, market);
        const kLabel = `${prevLabel} ${item.k}연속 후`;
        if(isBinary){
          const same = item.nextCounts[item.prev]||0;
          const sw = item.total - same;
          const pSame = same/item.total;
          const pSw = sw/item.total;
          return `
            <tr>
              <td>${escapeHtml(kLabel)}</td>
              <td>${pct(pSame)}</td>
              <td>${pct(pSw)}</td>
              <td class="mg-pro-td-n">${item.total}</td>
            </tr>
          `;
        }else{
          // show top-next 2
          const entries = Object.entries(item.nextCounts).sort((a,b)=>b[1]-a[1]);
          const top = entries.slice(0,2).map(([id,c])=>`${labelOf(id,market)} ${pct(c/item.total)}`).join(' · ');
          return `
            <tr>
              <td>${escapeHtml(kLabel)}</td>
              <td colspan="2">${escapeHtml(top||'-')}</td>
              <td class="mg-pro-td-n">${item.total}</td>
            </tr>
          `;
        }
      }).join('');
      const headCols = (market.outcomes.length===2)
        ? `<tr><th>조건</th><th>다음이 동일</th><th>다음이 전환</th><th>표본</th></tr>`
        : `<tr><th>조건</th><th colspan="2">다음 결과 상위</th><th>표본</th></tr>`;
      return `
        <div class="mg-pro-trans-block">
          <div class="mg-pro-trans-title">${escapeHtml(title)}</div>
          <div class="mg-pro-table-wrap">
            <table class="mg-pro-table mg-pro-table-sm">
              <thead>${headCols}</thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>
      `;
    }
    trans.innerHTML = `
      <div class="mg-pro-sec-head">
        <div class="mg-pro-sec-title">연속 후 전환율</div>
        <div class="mg-pro-sec-sub">베픽에서 많이 보는 “몇 연속 뒤 바뀜/유지 비율” (예측 아님)</div>
      </div>
      <div class="mg-pro-trans-grid">
        ${renderTransBlock('최근10 기준', w10)}
        ${renderTransBlock('전체 기준', seq)}
      </div>
    `;
    host.appendChild(trans);

    // confidence meter — how reliable is the pasted sample?
    const conf = document.createElement('div');
    conf.className = 'mg-pro-confidence';
    const oc = Math.max(2, market.outcomes.length);
    const effN = nAll / (oc/2); // more outcomes -> need more samples
    let score = Math.round(clamp((effN/30)*100, 0, 100));
    if(nAll < 6) score = Math.min(score, 25);
    else if(nAll < 10) score = Math.min(score, 40);
    const cLabel = score>=75 ? '높음' : (score>=45 ? '보통' : '낮음');
    conf.innerHTML = `
      <div class="mg-pro-sec-head">
        <div class="mg-pro-sec-title">표본 신뢰도</div>
        <div class="mg-pro-sec-sub">붙여넣은 결과(표본수)에 따른 해석 신뢰도(0~100)</div>
      </div>
      <div class="mg-pro-conf-row">
        <div class="mg-pro-conf-bar" aria-label="confidence">
          <div class="mg-pro-conf-fill" style="width:${score}%;"></div>
        </div>
        <div class="mg-pro-conf-meta">
          <div class="mg-pro-conf-score">${score}/100</div>
          <div class="mg-pro-conf-label"><span class="mg-pro-badge">${escapeHtml(cLabel)}</span> 전체 ${nAll}개 · 결과 ${oc}개</div>
        </div>
      </div>
    `;
    host.appendChild(conf);

    // refined mean reversion warning (NOT prediction)

    // mean reversion warning (caution)
    const warn = document.createElement('div');
    warn.className = 'mg-pro-warn';
    warn.setAttribute('role','note');
    warn.innerHTML = meanRevertWarn
      ? `<b>평균회귀 주의</b> 최근 구간 편향이 강합니다(Δ/ z 기준). 이런 구간에서는 ‘평균에 가까워지는 움직임’이 자주 관찰되지만, <b>예측/보장은 아닙니다.</b> 표본을 늘려 확인하세요.`
      : `<b>해석 팁</b> Δ가 크더라도 표본이 적으면 우연일 수 있습니다. 최근10/전체를 함께 보고 “지속되는 편향인지” 먼저 확인하세요.`;
    host.appendChild(warn);
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
      renderProInsights(market, r);
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
    window.__MG_INIT_DONE = true;
  }

  document.addEventListener('DOMContentLoaded', renderAll);
})();
