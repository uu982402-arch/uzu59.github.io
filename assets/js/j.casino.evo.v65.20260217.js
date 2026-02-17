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

  function escHtml(s){
    return String(s||'').replace(/[&<>"']/g, (c)=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function chiSquare(obs, exp){
    // obs/exp: arrays same length
    let x2 = 0;
    for(let i=0;i<obs.length;i++){
      const e = exp[i];
      const o = obs[i];
      if(e > 0){
        const d = o - e;
        x2 += (d*d) / e;
      }
    }
    return x2;
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
    if(!out) return;
    const seq = loadShoe(provider);
    const last20 = seq.slice(-20);
    const last10 = seq.slice(-10);
    const last5 = seq.slice(-5);
    const c20 = countOf(last20);
    const c10 = countOf(last10);
    const c5 = countOf(last5);
    const call = countOf(seq);
    const st = streak(seq);

    const theo = { banker: BAC_P.banker, player: BAC_P.player, tie: BAC_P.tie };

    // --- alert badges
    const badges = [];
    const stName = st.sym==='P'?'PLAYER':(st.sym==='B'?'BANKER':(st.sym==='T'?'TIE':'—'));

    // 1) streak heat
    if((st.sym==='P' || st.sym==='B') && st.len >= 6){
      badges.push({
        label:'연속 과열',
        kind: st.len >= 8 ? 'danger' : 'warn',
        meta:`${stName} ${st.len}연속`,
        tip:`${stName}가 ${st.len}연속 발생했습니다. 독립 시행이므로 “예측”이 아니라 과몰입/추격 방지 경고로만 보세요.`
      });
    }

    // 2) tie surge (recent 20)
    if(c20.n >= 12){
      const tieShare = c20.t / Math.max(1, c20.n);
      const tieTheo = theo.tie;
      if(tieShare >= Math.max(0.17, tieTheo * 1.9) && c20.t >= 3){
        badges.push({
          label:'타이 급증',
          kind:'warn',
          meta:`최근20 T ${c20.t}/${c20.n}`,
          tip:`최근 ${c20.n}핸드에서 타이 비중이 높습니다(관측치 ${Math.round(tieShare*100)}%). “다음 타이” 예측이 아니라 리스크 경고입니다.`
        });
      }
    }

    // 3) deviation ↑ (chi-square vs theoretical on recent 20)
    let x2val = 0;
    if(c20.n === 20){
      const expB = c20.n * theo.banker;
      const expP = c20.n * theo.player;
      const expT = c20.n * theo.tie;
      x2val = chiSquare([c20.b, c20.p, c20.t], [expB, expP, expT]);
      if(x2val >= 9.21){
        badges.push({
          label:'최근20 편차↑',
          kind: x2val >= 13.8 ? 'danger' : 'warn',
          meta:'최근20',
          tip:`최근20 관측치가 이론 분포와 다소 다릅니다(편차↑). 단기 편차는 정상 범주일 수 있으며, “예측 신호”로 쓰지 마세요.`
        });
      }
    }

    const badgeLine = badges.length
      ? `<div class="cs-badges">${badges.map(b=>`<span class="cs-badge ${b.kind}" title="${escHtml(b.tip)}">${escHtml(b.label)}${b.meta?` <small class="meta">${escHtml(b.meta)}</small>`:''}</span>`).join('')}</div>`
      : `<div class="cs-badges"><span class="cs-badge neutral">패턴 경고 없음</span></div>`;

    // 최근20 최대 연속(내부 계산)
    const maxStreak20 = (()=>{
      if(!last20 || !last20.length) return 0;
      let m=1, cur=1;
      for(let i=1;i<last20.length;i++){
        if(last20[i]===last20[i-1]){ cur++; if(cur>m) m=cur; }
        else cur=1;
      }
      return m;
    })();

    let rhythm = '안정(평균권)';
    if(st.len >= 6 || tieShare >= 0.18 || x2val >= 13.8 || maxStreak20 >= 6) rhythm = '주의(변동↑)';
    else if(st.len >= 5 || tieShare >= 0.14 || x2val >= 9.21 || maxStreak20 >= 5) rhythm = '보통(노이즈)';

    const leftRows = [];
    leftRows.push({k:'운영사', v: provider==='prag' ? 'Pragmatic' : 'Evolution'});
    leftRows.push({k:'최근 10', v: `<span class="cs-shoe-seq cs-shoe-mono">${seqToText(last10) || '—'}</span>`});
    leftRows.push({k:'최근 10 카운트', v: `P ${c10.p} · B ${c10.b} · T ${c10.t}`});
    leftRows.push({k:'최근 5 카운트', v: `P ${c5.p} · B ${c5.b} · T ${c5.t}`});
    leftRows.push({k:'최근20 관측', v: `B ${pct(c20.b/Math.max(1,c20.n))} / P ${pct(c20.p/Math.max(1,c20.n))} / T ${pct(c20.t/Math.max(1,c20.n))}`});
    leftRows.push({k:'최대 연속(최근20)', v: `${maxStreak20 || 0}`});
    leftRows.push({k:'현재 연속', v: `${st.sym==='P'?'PLAYER':(st.sym==='B'?'BANKER':(st.sym==='T'?'TIE':'—'))} ${st.len}`});

    const leftHtml = `<div class="cs-evo-out">${leftRows.map(r=>`<div class="row"><div class="k">${r.k}</div><div class="v cs-shoe-mono">${r.v}</div></div>`).join('')}</div>`;

    out.innerHTML = `
      <div class="cs-shoe-wrap">
        <div>${leftHtml}</div>
        <div class="cs-shoe-ana">
          <h3>분석 결과</h3>
          ${badgeLine}
          <div class="cs-shoe-prob">
            <span class="k">다음 핸드 이론 확률:</span>
            <span class="v">B <b>${(theo.banker*100).toFixed(2)}%</b> / P <b>${(theo.player*100).toFixed(2)}%</b> / T <b>${(theo.tie*100).toFixed(2)}%</b></span>
          </div>
          <div class="cs-evo-out" style="padding:10px 12px;border-radius:14px;">
            <div class="row"><div class="k">최근20 관측</div><div class="v cs-shoe-mono">B ${pct(c20.b/Math.max(1,c20.n))} / P ${pct(c20.p/Math.max(1,c20.n))} / T ${pct(c20.t/Math.max(1,c20.n))}</div></div>
            <div class="row"><div class="k">리듬·분산</div><div class="v cs-shoe-mono">${escHtml(rhythm)}</div></div>
          </div>
          <div class="cs-shoe-note">※ “예측”이 아니라, 최근 관측(편차·연속·분산)을 신호로 점검합니다. 과몰입/추격 베팅은 피하세요.</div>
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


  

  function wireEvoSwitch(){
    const wrap = document.querySelector('.cs-evo-switch');
    if(!wrap) return;
    const tabs = Array.from(wrap.querySelectorAll('.cs-evo-tab'));
    const panels = Array.from(wrap.querySelectorAll('.cs-evo-panel'));
    const setOn = (pid)=>{
      tabs.forEach(t=>t.classList.toggle('on', (t.getAttribute('data-show')||'')===pid));
      panels.forEach(p=>p.classList.toggle('on', (p.getAttribute('data-panel')||'')===pid));
    };
    tabs.forEach(t=>t.addEventListener('click', ()=>setOn(t.getAttribute('data-show')||'bac')));
    const cur = wrap.querySelector('.cs-evo-tab.on') || tabs[0];
    if(cur) setOn(cur.getAttribute('data-show')||'bac');
  }
function wire(){
    wireEvoSwitch();
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
    wireShoe();
  }

  document.addEventListener('DOMContentLoaded', wire);

})();
