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

  function pbOnly(seq){
    return seq.filter(x=>x==='P'||x==='B');
  }

  function longestStreak(seq){
    let best={sym:'—',len:0};
    if(!seq.length) return best;
    let curSym=seq[0], curLen=1;
    for(let i=1;i<seq.length;i++){
      const s=seq[i];
      if(s===curSym){ curLen++; }
      else{ if(curLen>best.len) best={sym:curSym,len:curLen}; curSym=s; curLen=1; }
    }
    if(curLen>best.len) best={sym:curSym,len:curLen};
    return best;
  }

  function runsCountPB(pb){
    if(!pb.length) return 0;
    let r=1;
    for(let i=1;i<pb.length;i++) if(pb[i]!==pb[i-1]) r++;
    return r;
  }

  function runsTest(pb){
    const n = pb.length;
    if(n<2) return {n, n1:0, n2:0, runs:0, z:0, mu:0, sigma:0};
    let n1=0,n2=0;
    for(const x of pb){ if(x==='P') n1++; else if(x==='B') n2++; }
    const runs = runsCountPB(pb);
    if(n1===0 || n2===0) return {n, n1, n2, runs, z:0, mu:0, sigma:0};
    const mu = 1 + (2*n1*n2)/(n1+n2);
    const num = 2*n1*n2*(2*n1*n2 - n1 - n2);
    const den = ((n1+n2)**2) * (n1+n2-1);
    const sigma = Math.sqrt(num/den);
    const z = sigma>0 ? (runs - mu)/sigma : 0;
    return {n, n1, n2, runs, z, mu, sigma};
  }

  function chi2For(seq, theo){
    const n = seq.length;
    if(n<=0) return {n, chi2:0};
    const c = countOf(seq);
    const expP = n*theo.player;
    const expB = n*theo.banker;
    const expT = n*theo.tie;
    const chi2 = (c.p-expP)**2/expP + (c.b-expB)**2/expB + (c.t-expT)**2/expT;
    return {n, chi2};
  }

  function classifyChi2(chi2){
    // df=2: 95% 5.99, 99% 9.21
    if(chi2 < 5.99) return {label:'정상 범위', tone:'ok'};
    if(chi2 < 9.21) return {label:'편차 ↑(주의)', tone:'warn'};
    return {label:'편차 큼(고주의)', tone:'risk'};
  }

  function deviationSummary(seq, theo){
    const n=seq.length;
    const c=countOf(seq);
    if(n<=0) return {n, dp:0, db:0, dt:0};
    const dp = (c.p/n - theo.player)*100;
    const db = (c.b/n - theo.banker)*100;
    const dt = (c.t/n - theo.tie)*100;
    return {n, dp, db, dt};
  }

  function parsePaste(str){
    if(!str) return [];
    const raw = (str+'').trim();
    if(!raw) return [];
    const upper = raw.toUpperCase();

    // If it's a compact PBT string like "PBBT..."
    if(/^[PBT]+$/.test(upper) && upper.length>1){
      return upper.split('').filter(x=>x==='P'||x==='B'||x==='T');
    }

    const tokens = upper
      .replace(/[\r\n,;|]+/g,' ')
      .replace(/\s+/g,' ')
      .split(' ')
      .filter(Boolean);

    const out=[];
    for(const t of tokens){
      if(t==='P'||t==='PLAYER'||t==='PL') out.push('P');
      else if(t==='B'||t==='BANKER'||t==='BK') out.push('B');
      else if(t==='T'||t==='TIE') out.push('T');
      else if(t.includes('플')) out.push('P');
      else if(t.includes('뱅')||t.includes('뱅커')) out.push('B');
      else if(t.includes('타')) out.push('T');
      else{
        // scan characters as fallback
        for(const ch of t){
          if(ch==='P'||ch==='B'||ch==='T') out.push(ch);
        }
      }
      if(out.length>=200) break;
    }
    return out;
  }

    function renderShoeBadges(provider, info){
    const box = $('evoShoeBadges');
    if(!box) return;

    const badges = [];

    // 1) 연속 과열
    if(info.stAll && (info.stAll.sym==='P' || info.stAll.sym==='B') && info.stAll.len >= 5){
      const tone = info.stAll.len >= 7 ? 'risk' : 'warn';
      badges.push({text:'연속 과열', tone, tip:`현재 연속 ${info.stAll.sym} ${info.stAll.len}`});
    }

    // 2) 타이 급증 (최근20)
    if(info.c20 && info.last20N >= 12){
      const exp = info.last20N * info.theo.tie;
      const t = info.c20.t;
      if(t >= Math.ceil(exp + 2)){
        const tone = t >= Math.ceil(exp + 3) ? 'risk' : 'warn';
        badges.push({text:'타이 급증', tone, tip:`최근${info.last20N} 타이 ${t} (기대 ${exp.toFixed(1)})`});
      }
    }

    // 3) 최근20 편차↑ (χ² 기준)
    if(info.chi20c && (info.chi20c.tone==='warn' || info.chi20c.tone==='risk')){
      badges.push({text:'최근20 편차↑', tone:info.chi20c.tone, tip:`χ² ${info.chi20.toFixed(2)} · ${info.chi20c.label}`});
    }

    if(!badges.length){
      box.innerHTML = '<div class="cs-warn-empty">패턴 알림: 현재 경고 없음</div>';
      return;
    }

    box.innerHTML = badges.map(b=>(
      `<span class="cs-warn-badge" data-tone="${b.tone}" title="${escAttr(b.tip)}">${b.text}</span>`
    )).join('');
  }

  function escAttr(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

function renderShoe(provider){
    const out = $('evoShoeOut');
    if(!out) return;
    const seq = loadShoe(provider);

    const theo = { banker: BAC_P.banker, player: BAC_P.player, tie: BAC_P.tie };

    const last10 = seq.slice(-10);
    const last20 = seq.slice(-20);
    const c10 = countOf(last10);
    const c20 = countOf(last20);
    const call = countOf(seq);

    const stAll = streak(seq);
    const stBest = longestStreak(seq);
    const pb = pbOnly(seq);
    const stPbBest = longestStreak(pb);

    const chi20 = chi2For(last20, theo);
    const chi20c = classifyChi2(chi20.chi2);

    const dev20 = deviationSummary(last20, theo);

    const rt = runsTest(pb.slice(-60));
    let rhythm = '—';
    if(rt.n>=12 && rt.n1>0 && rt.n2>0 && rt.sigma>0){
      if(rt.z <= -1.96) rhythm = '연속형(스트릭↑)';
      else if(rt.z >= 1.96) rhythm = '교차형(스위칭↑)';
      else rhythm = '보통(노이즈)';
    }

    const seqText = seqToText(last10) || '—';
    const providerName = provider==='prag' ? 'Pragmatic' : 'Evolution';
    renderShoeBadges(provider, { stAll, c20, last20N:last20.length, theo, chi20c, chi20:chi20.chi2 });

    out.innerHTML = `
      <div class="cs-shoe-kpis">
        <div class="cs-shoe-kpi"><div class="k">운영사</div><div class="v">${providerName}</div><div class="s">저장 N ${call.n}</div></div>
        <div class="cs-shoe-kpi"><div class="k">현재 연속</div><div class="v">${stAll.sym==='P'?'PLAYER':(stAll.sym==='B'?'BANKER':(stAll.sym==='T'?'TIE':'—'))} ${stAll.len}</div><div class="s">최대 ${stBest.sym==='P'?'P':(stBest.sym==='B'?'B':(stBest.sym==='T'?'T':'—'))} ${stBest.len}</div></div>
        <div class="cs-shoe-kpi"><div class="k">편차 지수(최근 20)</div><div class="v">χ² ${chi20.chi2.toFixed(2)}</div><div class="s">${chi20c.label} · 표본 ${chi20.n}</div></div>
      </div>

      <div class="cs-shoe-split">
        <div class="cs-shoe-kpi" style="padding:12px;">
          <div class="k">최근 10 시퀀스</div>
          <div class="v cs-shoe-mono" style="font-size:13px; margin-top:8px;"><span class="cs-shoe-seq">${seqText}</span></div>
          <div class="s" style="margin-top:10px;">최근10: P ${c10.p} · B ${c10.b} · T ${c10.t} / 최근20: P ${c20.p} · B ${c20.b} · T ${c20.t}</div>
          <div class="s" style="margin-top:6px;">최근20 편차: P ${dev20.dp.toFixed(1)}%p · B ${dev20.db.toFixed(1)}%p · T ${dev20.dt.toFixed(1)}%p (이론 대비)</div>
        </div>

        <div class="cs-shoe-kpi" style="padding:12px;">
          <div class="k">리듬/분산 체크</div>
          <div class="v" style="margin-top:8px; font-size:14px;">${rhythm}</div>
          <div class="s" style="margin-top:8px;">PB 시퀀스(최근60) 런: ${rt.runs||0} / 기대 ${rt.mu?rt.mu.toFixed(1):'—'} (z=${rt.sigma?rt.z.toFixed(2):'—'})</div>
          <div class="s" style="margin-top:6px;">PB 최대 연속: ${stPbBest.sym==='P'?'P':(stPbBest.sym==='B'?'B':'—')} ${stPbBest.len} (Tie 제외)</div>
          <div class="s" style="margin-top:10px;">다음 핸드 이론 확률(참고): B ${(theo.banker*100).toFixed(2)}% / P ${(theo.player*100).toFixed(2)}% / T ${(theo.tie*100).toFixed(2)}%</div>
          <div class="s" style="margin-top:8px;">※ “예측”이 아니라, <b>관측 편차·연속·과몰입 신호</b>만 점검합니다.</div>
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



    const paste = $('evoShoePaste');
    const applyBtn = $('evoShoeApplyPaste');
    const copyBtn = $('evoShoeCopySeq');

    if(applyBtn){
      applyBtn.addEventListener('click', ()=>{
        const parsed = parsePaste(paste ? paste.value : '');
        if(!parsed.length) return;
        saveShoe(provider, parsed);
        renderShoe(provider);
      });
    }

    if(copyBtn){
      copyBtn.addEventListener('click', async ()=>{
        const seq = loadShoe(provider);
        const s = seq.join(' ');
        try{ await navigator.clipboard.writeText(s); }catch(_){ /* noop */ }
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
