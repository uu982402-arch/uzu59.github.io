/* Casino tool v57 — top tab switch + Evolution live insights calculators */
(function(){
  'use strict';

  const VIEW_KEY = '88st_casino_top_view_v1';
  const $ = (id)=>document.getElementById(id);

  function safeJsonParse(s, fallback){
    try{ return JSON.parse(s); }catch(_){ return fallback; }
  }
  function lsRead(key, fallback){
    try{ const v = localStorage.getItem(key); return v ? safeJsonParse(v, fallback) : fallback; }catch(_){ return fallback; }
  }
  function lsWrite(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(_){ /* ignore */ }
  }

  function num(v){
    const s = String(v ?? '').replace(/,/g,'').replace(/원/g,'').replace(/%/g,'').trim();
    if(!s) return NaN;
    const x = Number(s);
    return Number.isFinite(x) ? x : NaN;
  }

  function fmtMoney(x){
    if(!Number.isFinite(x)) return '—';
    const sign = x<0 ? '-' : '';
    return sign + Math.abs(Math.round(x)).toLocaleString('ko-KR') + '원';
  }

  function fmtPct(x){
    if(!Number.isFinite(x)) return '—';
    return (x*100).toFixed(2) + '%';
  }

  function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }

  function setView(view){
    const tabs = Array.from(document.querySelectorAll('#csTopTabs .cs-top-tab'));
    tabs.forEach(btn=>{
      const on = btn.getAttribute('data-view') === view;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    const views = Array.from(document.querySelectorAll('.cs-view'));
    views.forEach(v=>{
      v.classList.toggle('on', v.getAttribute('data-panel') === view);
    });

    lsWrite(VIEW_KEY, view);
  }

  // ---- Baccarat EV ----
  // Representative 8-deck probabilities (tie treated as push for banker/player)
  const BAC_P = {
    banker: 0.4586,
    player: 0.4462,
    tie: 0.0952,
  };

  function renderBaccarat(){
    const out = $('evoBacOut');
    if(!out) return;

    const bet = Math.max(0, Math.floor(num($('evoBacBet') && $('evoBacBet').value) || 0));
    const hands = Math.max(0, Math.floor(num($('evoBacHands') && $('evoBacHands').value) || 0));
    const type = ($('evoBacType') && $('evoBacType').value) || 'banker';
    const comm = clamp((num($('evoBacCommission') && $('evoBacCommission').value) || 5) / 100, 0, 0.2);
    const tiePay = clamp(num($('evoBacTiePay') && $('evoBacTiePay').value) || 8, 1, 30);

    let evPer1 = 0; // EV per 1 unit bet
    let edge = 0;

    if(type === 'banker'){
      // profit = + (1-comm), loss = -1, tie = 0
      evPer1 = BAC_P.banker * (1-comm) - BAC_P.player * 1;
    }else if(type === 'player'){
      evPer1 = BAC_P.player * 1 - BAC_P.banker * 1;
    }else{
      // tie bet: win pays tiePay:1, else lose 1
      evPer1 = BAC_P.tie * tiePay - (1 - BAC_P.tie) * 1;
    }

    edge = -evPer1; // house edge as positive fraction

    const evMoney = bet * evPer1;
    const expLoss = -evMoney * hands;

    const rows = [];
    rows.push({k:'하우스엣지(이론)', v: fmtPct(edge)});
    rows.push({k:'1핸드 기대 손익', v: fmtMoney(evMoney), neg: evMoney<0});
    rows.push({k:`${hands.toLocaleString('ko-KR')}핸드 기대 손실`, v: fmtMoney(expLoss), neg: expLoss>0});

    if(type==='tie'){
      rows.push({k:'참고', v: `TIE 배당 ${tiePay}:1`});
    }else if(type==='banker'){
      rows.push({k:'참고', v: `BANKER 커미션 ${(comm*100).toFixed(1)}%`});
    }

    out.innerHTML = rows.map((r,i)=>{
      const cls = r.neg ? 'v neg' : 'v';
      return `<div class="row"><div class="k">${r.k}</div><div class="${cls}">${r.v}</div></div>`;
    }).join('');
  }

  // ---- Roulette EV ----
  function renderRoulette(){
    const out = $('evoRouOut');
    if(!out) return;

    const wheel = ($('evoRouWheel') && $('evoRouWheel').value) || 'eu';
    const bet = Math.max(0, Math.floor(num($('evoRouBet') && $('evoRouBet').value) || 0));
    const spins = Math.max(0, Math.floor(num($('evoRouSpins') && $('evoRouSpins').value) || 0));

    const edge = wheel==='us' ? (2/38) : (1/37);
    const expLoss = bet * spins * edge;

    out.innerHTML = [
      {k:'하우스엣지(이론)', v: fmtPct(edge)},
      {k:`${spins.toLocaleString('ko-KR')}스핀 기대 손실`, v: fmtMoney(expLoss), neg: expLoss>0},
    ].map(r=>`<div class="row"><div class="k">${r.k}</div><div class="v${r.neg?' neg':''}">${r.v}</div></div>`).join('');
  }

  // ---- Risk (gambler's ruin) ----
  function probHitTargetBeforeStop(p, targetU, stopU){
    p = clamp(p, 0, 1);
    const q = 1 - p;
    targetU = Math.max(1, Math.floor(targetU||1));
    stopU = Math.max(1, Math.floor(stopU||1));

    const i = stopU;
    const N = stopU + targetU;

    if(Math.abs(p - 0.5) < 1e-12){
      return i / N;
    }

    // (1 - (q/p)^i) / (1 - (q/p)^N)
    const r = q / Math.max(1e-12, p);
    const nume = 1 - Math.pow(r, i);
    const deno = 1 - Math.pow(r, N);
    if(Math.abs(deno) < 1e-12) return 0;
    return clamp(nume / deno, 0, 1);
  }

  function renderRisk(){
    const out = $('evoRiskOut');
    if(!out) return;

    const unit = Math.max(0, Math.floor(num($('evoUnit') && $('evoUnit').value) || 0));
    const p = clamp(num($('evoPwin') && $('evoPwin').value) || 0.5, 0, 1);
    const targetU = Math.max(1, Math.floor(num($('evoTargetU') && $('evoTargetU').value) || 5));
    const stopU = Math.max(1, Math.floor(num($('evoStopU') && $('evoStopU').value) || 5));

    const pt = probHitTargetBeforeStop(p, targetU, stopU);
    const ps = 1 - pt;

    const targetMoney = unit * targetU;
    const stopMoney = unit * stopU;

    // Expected drift per step for even-money random walk
    const drift = (2*p - 1);

    out.innerHTML = [
      {k:'목표 도달 확률', v: (pt*100).toFixed(2)+'%'},
      {k:'손절 도달 확률', v: (ps*100).toFixed(2)+'%'},
      {k:'목표(원)', v: fmtMoney(targetMoney)},
      {k:'손절(원)', v: fmtMoney(stopMoney)},
      {k:'1유닛 기대 드리프트', v: (drift>=0?'+':'') + drift.toFixed(4)},
    ].map(r=>`<div class="row"><div class="k">${r.k}</div><div class="v">${r.v}</div></div>`).join('');
  }


  // ---- Shoe tracker (record -> stats) ----
  const SHOE = {
    providerKey: '88st_bac_shoe_provider_v1',
    keys: { evo: '88st_bac_shoe_evo_v1', prag: '88st_bac_shoe_prag_v1' },
    maxLen: 60
  };

  function loadShoe(provider){
    const key = (SHOE.keys[provider] || SHOE.keys.evo);
    const arr = lsRead(key, []);
    if(!Array.isArray(arr)) return [];
    return arr.filter(x=>x==='P'||x==='B'||x==='T').slice(-SHOE.maxLen);
  }
  function saveShoe(provider, arr){
    const key = (SHOE.keys[provider] || SHOE.keys.evo);
    lsWrite(key, arr.slice(-SHOE.maxLen));
  }

  function seqToText(seq){
    return seq.map(x=>x==='P'?'P':(x==='B'?'B':'T')).join(' ');
  }

  function countOf(seq){
    let p=0,b=0,t=0;
    for(const x of seq){
      if(x==='P') p++;
      else if(x==='B') b++;
      else if(x==='T') t++;
    }
    return {p,b,t,n:seq.length};
  }

  function streak(seq){
    if(!seq.length) return {sym:'—', len:0};
    const last = seq[seq.length-1];
    let k=1;
    for(let i=seq.length-2;i>=0;i--){
      if(seq[i]===last) k++; else break;
    }
    return {sym:last, len:k};
  }

  function renderShoe(provider){
    const out = $('evoShoeOut');
    const call = shoeStats(provider);
    if(!out) return;
    if(!call){ out.innerHTML = ''; return; }

    const seq = (call.seq || '');
    const last10 = seq.slice(-10);
    const last20 = seq.slice(-20);

    const c10 = countPBT(last10);
    const c20 = countPBT(last20);
    const N20 = last20.length || 0;

    const st = streak(seq);
    const stSym = st.sym==='P' ? 'PLAYER' : st.sym==='B' ? 'BANKER' : st.sym==='T' ? 'TIE' : '—';

    // deviation score (chi-square-like) but we do NOT show raw numeric score
    const exp = {
      p: N20 * BAC_P.player,
      b: N20 * BAC_P.banker,
      t: N20 * BAC_P.tie,
    };
    const chi2 = (exp.p>0?((c20.p-exp.p)*(c20.p-exp.p)/exp.p):0)
              + (exp.b>0?((c20.b-exp.b)*(c20.b-exp.b)/exp.b):0)
              + (exp.t>0?((c20.t-exp.t)*(c20.t-exp.t)/exp.t):0);

    const badges = [];
    if(st.len >= 6 && (st.sym==='P' || st.sym==='B')) badges.push({k:'hot', t:'연속 과열'});
    if(c20.t >= 4) badges.push({k:'tie', t:'타이 급증'});
    if(chi2 >= 7.8) badges.push({k:'dev', t:'최근20 편차↑'});

    let analysis = '보통(노이즈)';
    if(badges.some(b=>b.k==='hot')) analysis = '주의(연속 과열)';
    else if(badges.some(b=>b.k==='dev')) analysis = '주의(편차↑)';
    else if(badges.some(b=>b.k==='tie')) analysis = '주의(타이↑)';

    const badgeHtml = badges.length
      ? badges.map(b=>`<span class="shoe-badge ${b.k}">${b.t}</span>`).join('')
      : '<span class="shoe-badge ok">정상</span>';

    const providerName = provider==='prag' ? 'Pragmatic' : 'Evolution';

    const obsPct = (c)=> N20 ? ((c/N20)*100).toFixed(2)+'%' : '—';
    const devPp = (c, theo)=>{
      if(!N20) return '—';
      const d = (c/N20*100) - (theo*100);
      const s = (d>=0?'+':'') + d.toFixed(2) + '%p';
      return s;
    };

    out.innerHTML = `
      <div class="cs-shoe-grid">
        <div class="cs-shoe-box">
          <div class="cs-shoe-meta">
            <div>
              <div class="cs-shoe-provider">${providerName}</div>
              <div class="cs-shoe-count">저장 N ${call.n} · P ${call.p} · B ${call.b} · T ${call.t}</div>
            </div>
            <div style="text-align:right">
              <div class="cs-shoe-count">현재 연속</div>
              <div style="font-weight:1100">${stSym} ${st.len||0}</div>
              <div class="cs-shoe-count">최대 ${st.max||0}</div>
            </div>
          </div>

          <div class="cs-shoe-seqrow"><span class="label">최근10</span><span class="cs-shoe-seq">${seqToText(last10) || '—'}</span></div>
          <div class="cs-shoe-seqrow"><span class="label">최근20</span><span>P ${obsPct(c20.p)} · B ${obsPct(c20.b)} · T ${obsPct(c20.t)} <span style="color:rgba(255,255,255,.62)">(이론 대비)</span></span></div>
          <div class="cs-shoe-seqrow"><span class="label">최근20</span><span>편차: P ${devPp(c20.p,BAC_P.player)} · B ${devPp(c20.b,BAC_P.banker)} · T ${devPp(c20.t,BAC_P.tie)}</span></div>
        </div>

        <div class="cs-shoe-analysis">
          <div class="cs-shoe-ana-head">
            <div>
              <div class="cs-shoe-ana-title">분석 결과</div>
              <div class="cs-shoe-count" style="margin-top:4px">리듬/분산 체크 <b style="color:rgba(255,255,255,.94)">${analysis}</b></div>
            </div>
            <div class="cs-shoe-badges">${badgeHtml}</div>
          </div>

          <div class="cs-shoe-ana-prob">
            <span class="k">다음 핸드 이론 확률</span><br/>
            <span>B ${fmtPct(BAC_P.banker)}</span> / <span>P ${fmtPct(BAC_P.player)}</span> / <span>T ${fmtPct(BAC_P.tie)}</span>
          </div>

          <div class="cs-shoe-ana-note">※ “예측”이 아니라 관측 편차·연속·과몰입 신호만 점검합니다. 다음 결과를 맞추는 도구가 아닙니다.</div>
        </div>
      </div>
    `;
  }
function wireShoe(){
    const out = $('evoShoeOut');
    if(!out) return;

    let provider = lsRead(SHOE.providerKey, 'evo');
    provider = (provider==='prag') ? 'prag' : 'evo';

    const host = out.closest('section');
    if(!host) return;

    const providerBtns = Array.from(host.querySelectorAll('button[data-provider]'));
    function setProvider(p){
      provider = (p==='prag') ? 'prag' : 'evo';
      lsWrite(SHOE.providerKey, provider);
      providerBtns.forEach(b=>b.classList.toggle('on', b.getAttribute('data-provider')===provider));
      renderShoe(provider);
    }
    providerBtns.forEach(b=>{
      b.addEventListener('click', ()=>setProvider(b.getAttribute('data-provider')));
    });

    const actions = host.querySelector('.cs-shoe-actions');
    if(actions){
      actions.addEventListener('click', (e)=>{
        const addBtn = e.target && e.target.closest('button[data-add]');
        const actBtn = e.target && e.target.closest('button[data-act]');
        if(!addBtn && !actBtn) return;

        const seq = loadShoe(provider);
        if(addBtn){
          const sym = addBtn.getAttribute('data-add');
          if(sym==='P'||sym==='B'||sym==='T') seq.push(sym);
          saveShoe(provider, seq);
          renderShoe(provider);
          return;
        }
        if(actBtn){
          const act = actBtn.getAttribute('data-act');
          if(act==='undo'){ seq.pop(); saveShoe(provider, seq); renderShoe(provider); return; }
          if(act==='clear'){ saveShoe(provider, []); renderShoe(provider); return; }
        }
      });
    }

    setProvider(provider);
  }


  function wire(){
    const top = $('csTopTabs');
    if(top){
      top.addEventListener('click', (e)=>{
        const btn = e.target && e.target.closest('button[data-view]');
        if(!btn) return;
        setView(btn.getAttribute('data-view'));
      });

      const saved = lsRead(VIEW_KEY, 'baccarat');
      setView(saved==='evo' ? 'evo' : 'baccarat');
    }

    // EVO calculators: horizontal fold tabs
    (function(){
      const acc = $('evoCalcAcc');
      if(!acc) return;
      const tabs = acc.querySelectorAll('.cs-evo-tab');
      const panels = acc.querySelectorAll('.cs-evo-panel');
      const setOn = (key)=>{
        tabs.forEach(btn=>{
          const on = btn.dataset.panel===key;
          btn.classList.toggle('on', on);
          btn.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        panels.forEach(p=> p.classList.toggle('on', p.dataset.panel===key));
      };
      acc.addEventListener('click', (e)=>{
        const btn = e.target && e.target.closest('.cs-evo-tab');
        if(!btn) return;
        e.preventDefault();
        setOn(btn.dataset.panel);
      });
    })();

    // calculators
    const ids = [
      'evoBacBet','evoBacHands','evoBacType','evoBacCommission','evoBacTiePay',
      'evoRouWheel','evoRouBet','evoRouSpins',
      'evoUnit','evoPwin','evoTargetU','evoStopU'
    ];

    ids.forEach(id=>{
      const el = $(id);
      if(!el) return;
      el.addEventListener('input', ()=>{ renderBaccarat(); renderRoulette(); renderRisk(); });
      el.addEventListener('change', ()=>{ renderBaccarat(); renderRoulette(); renderRisk(); });
    });

    renderBaccarat();
    renderRoulette();
    renderRisk();
    wireShoe();
  }

  document.addEventListener('DOMContentLoaded', wire);

})();
