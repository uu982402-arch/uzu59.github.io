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
  }

  document.addEventListener('DOMContentLoaded', wire);

})();
