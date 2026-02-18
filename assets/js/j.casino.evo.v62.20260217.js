/* Casino tool v57 — top tab switch + Evolution live insights calculators */
(function(){
  'use strict';

  // v72: manage shoe AI brief here (avoid duplicate listeners)
  try{ window.__CASINO_SHOE_BRIEF_MANAGED = true; }catch(e){}
  const escapeHtml = (s)=> String(s==null?'':s).replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const countPBT = (seq)=>{
    let p=0,b=0,t=0;
    (seq||[]).forEach(x=>{ if(x==='P')p++; else if(x==='B')b++; else if(x==='T')t++; });
    return {p,b,t};
  };

  function shoeStats(provider){
    const seq = loadShoe(provider) || [];
    if(!seq.length) return null;
    const c = countPBT(seq);
    return { seq, n: seq.length, p: c.p, b: c.b, t: c.t };
  }

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
    // current streak + max streak by symbol
    if(!seq.length) return {sym:'—', len:0, maxBy:{P:0,B:0,T:0}};
    const maxBy={P:0,B:0,T:0};
    let curSym=seq[0], curLen=1;
    for(let i=1;i<seq.length;i++){
      const s=seq[i];
      if(s===curSym) curLen++;
      else{ if(maxBy[curSym]!=null) maxBy[curSym]=Math.max(maxBy[curSym], curLen); curSym=s; curLen=1; }
    }
    if(maxBy[curSym]!=null) maxBy[curSym]=Math.max(maxBy[curSym], curLen);
    const last=seq[seq.length-1];
    let k=1;
    for(let i=seq.length-2;i>=0;i--){ if(seq[i]===last) k++; else break; }
    return {sym:last, len:k, maxBy};
  }

  function renderShoe(provider){
    const out = $('evoShoeOut');
    if(!out) return;

    const brief = $('shoeBrief');
    const setBrief = (score, level, tags, warns, recos)=>{
      if(!brief) return;
      const q = (sel)=> brief.querySelector(sel);
      const scoreEl = q('[data-role="score"]');
      const labelEl = q('[data-role="label"]');
      const tagsEl  = q('[data-role="tags"]');
      const warnEl  = q('[data-role="warn"]');
      const recoEl  = q('[data-role="reco"]');
      if(scoreEl) scoreEl.textContent = (score==null ? '—' : String(score));
      if(labelEl) labelEl.textContent = level || '대기';
      if(tagsEl)  tagsEl.innerHTML = (tags||[]).map(t=>`<span class="vvip-tag ${escapeHtml(t.cls||'')}">${escapeHtml(t.t||'')}<\/span>`).join('');
      if(warnEl)  warnEl.innerHTML = (warns||[]).map(w=>`<li>${escapeHtml(w)}<\/li>`).join('');
      if(recoEl)  recoEl.innerHTML = (recos||[]).map(r=>`<li>${escapeHtml(r)}<\/li>`).join('');
    };

    const call = shoeStats(provider);
    if(!call){
      out.innerHTML = `<div class="cs-empty">최근 결과를 <b>PLAYER / BANKER / TIE</b>로 입력하면 분석이 표시됩니다.</div>`;
      try{ setBrief(null,'대기',[{cls:'warn',t:'입력 대기'}],["최근 결과를 입력하면 연속/편차/타이 급증 경고를 자동 태깅합니다."],["초기에는 소액·짧게 테스트 후, 표본(20+)을 모아 확인하세요."]) }catch(e){}
      return;
    }

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
    const tags = [];
    const warns = [];
    const recos = [];
    let score = 90;

    // 표본 부족
    if(N20 < 12){
      tags.push({cls:"warn", t:`표본 부족 ${N20}/20`});
      warns.push("최근20 표본이 적어 신호가 불안정합니다.");
      score -= 10;
    }

    // 연속(플/뱅)
    if((st.sym === "P" || st.sym === "B") && st.len >= 5){
      const sev = st.len >= 10 ? 2 : st.len >= 8 ? 1 : 0;
      const sLbl = st.sym === "P" ? "플" : "뱅";
      const cls = sev >= 1 ? "bad" : "warn";
      tags.push({cls, t:`연속 ${sLbl} ${st.len}`});
      warns.push(sev >= 1
        ? `연속 ${sLbl} ${st.len} — 과열 구간(추격/물타기 금지, 쉬어가기 권장)`
        : `연속 ${sLbl} ${st.len} — 과열 진입 가능성(전환/편차 확인 권장)`);
      score -= (sev >= 1 ? 14 : 7) + Math.max(0, st.len - 6) * 3;
      badges.push({k:"hot", t: sev >= 2 ? "연속 과열(매우)" : "연속 과열"});
    }

    // 타이 연속
    if(st.sym === "T" && st.len >= 2){
      const sev = st.len >= 3 ? 2 : 1;
      tags.push({cls: sev===2?"bad":"warn", t:`타이 연속 ${st.len}`});
      warns.push(`타이 연속 ${st.len} — 변동성 급증 구간(타이 추격 금지)`);
      score -= (sev===2?16:10) + Math.max(0, st.len-2) * 4;
      badges.push({k:"tie", t: sev===2?"타이 연속(강)":"타이 연속"});
    }

    // 타이 급증(최근20)
    if(c20.t >= 4){
      const sev = c20.t >= 6 ? 2 : 1;
      tags.push({cls: sev===2?"bad":"warn", t:`타이 ${c20.t}/20`});
      warns.push(`최근20 타이가 ${c20.t}회로 높습니다. 변동성↑, 타이 추격 금지.`);
      score -= sev===2 ? 18 : 10;
      badges.push({k:"tie", t: sev===2?"타이 급증(강)":"타이 급증"});
    }

    // 편차(카이제곱)
    if(chi2 >= 9.2){
      tags.push({cls:"bad", t:`편차 강함 χ²=${chi2.toFixed(1)}`});
      warns.push("최근20 분포가 이론 대비 크게 치우쳤습니다(편차 강함). 평균회귀 기대만으로 진입 금지.");
      score -= 16;
      badges.push({k:"dev", t:"편차 강함"});
    }else if(chi2 >= 6.0){
      tags.push({cls:"warn", t:`편차 감지 χ²=${chi2.toFixed(1)}`});
      warns.push("최근20 분포에 편차가 감지됩니다. 단타/스테이크 다운 권장.");
      score -= 8;
      badges.push({k:"dev", t:"편차 감지"});
    }

    // P/B 쏠림(이론 대비)
    if(N20){
      const pObs = c20.p / N20, bObs = c20.b / N20;
      const pbDelta = Math.max(Math.abs(pObs - BAC_P.player), Math.abs(bObs - BAC_P.banker));
      if(pbDelta >= 0.12){
        tags.push({cls:"bad", t:`P/B 쏠림 ${(pbDelta*100).toFixed(1)}%p`});
        score -= 10;
      }else if(pbDelta >= 0.08){
        tags.push({cls:"warn", t:`P/B 쏠림 ${(pbDelta*100).toFixed(1)}%p`});
        score -= 6;
      }
    }

    score = Math.round(clamp(score, 10, 95));
    const level = score >= 80 ? "양호" : score >= 65 ? "보통" : score >= 50 ? "주의" : "위험";
    try{ setBrief(score, level, tags, warns, recos); }catch(e){};

    if(!warns.length) warns.push("특이 경고 없음. 그래도 과열/추격은 피하세요.");

    if(score < 55){
      recos.push("PASS(관망) 비중을 올리고 2~3핸드 쉬어가세요.");
    }else if(score < 70){
      recos.push("스테이크 다운 + 짧게 접근(손절 엄격). 연속/타이/편차 경고 해제 후 재진입 권장.");
    }else{
      recos.push("정석 운영(스테이크 고정) + 과몰입 방지. 그래도 ‘추격’은 금지.");
    }
    recos.push("슈는 독립 시행입니다. ‘예측’이 아니라 리스크 관리용 신호로만 사용하세요.");

    let analysis = score < 55 ? "위험(피해야 할 구간)" : score < 70 ? "주의(리스크↑)" : "보통(관리 가능)";

    if(!badges.length) badges.push({k:"ok", t:"정상"});

    const badgeHtml = badges.map(b=>`<span class="shoe-badge ${b.k}">${b.t}</span>`).join('');

    const tagHtml = tags.map(x=>`<span class="cs-shoe-tag ${escapeHtml(x.cls)}">${escapeHtml(x.t)}</span>`).join('');
    const warnHtml = warns.map(x=>`<li>${escapeHtml(x)}</li>`).join('');
    const recoHtml = recos.map(x=>`<li>${escapeHtml(x)}</li>`).join('');
    const briefHtml = ``;

    const providerName = provider==='prag' ? 'Pragmatic' : 'Evolution';

    const obsPct = (c)=> N20 ? ((c/N20)*100).toFixed(2)+'%' : '—';

    // Bayesian-smoothed observational estimate (recent20) with theoretical prior
    const priorK = 10; // pseudo-count strength
    const obsBayesRaw = {
      p: N20 ? (c20.p + priorK*BAC_P.player) / (N20 + priorK) : null,
      b: N20 ? (c20.b + priorK*BAC_P.banker) / (N20 + priorK) : null,
      t: N20 ? (c20.t + priorK*BAC_P.tie) / (N20 + priorK) : null,
    };
    const obsBayes = {
      p: obsBayesRaw.p==null ? '—' : (obsBayesRaw.p*100).toFixed(2)+'%',
      b: obsBayesRaw.b==null ? '—' : (obsBayesRaw.b*100).toFixed(2)+'%',
      t: obsBayesRaw.t==null ? '—' : (obsBayesRaw.t*100).toFixed(2)+'%',
    };

    const bestObs = (obsBayesRaw.p==null) ? null : (function(){
      const arr = [
        {id:'B', p:obsBayesRaw.b},
        {id:'P', p:obsBayesRaw.p},
        {id:'T', p:obsBayesRaw.t},
      ].filter(x=>Number.isFinite(x.p));
      arr.sort((a,b)=>b.p-a.p);
      return arr[0] || null;
    })();
    const bestObsLabel = bestObs ? (bestObs.id==='B'?'BANKER':bestObs.id==='P'?'PLAYER':'TIE') : '—';


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
              <div class="cs-shoe-count">최대 P ${st.maxBy.P||0} · B ${st.maxBy.B||0}</div>
            </div>
          </div>

          <div class="cs-shoe-seqrow"><span class="label">최근10</span><span class="cs-shoe-seq">${seqToText(last10) || '—'}</span></div>
          <div class="cs-shoe-seqrow"><span class="label">최근20</span><span>P ${obsPct(c20.p)} · B ${obsPct(c20.b)} · T ${obsPct(c20.t)} <span style="color:rgba(255,255,255,.62)">(이론 대비)</span></span></div>
        </div>

        <div class="cs-shoe-analysis">
          <div class="cs-shoe-ana-head">
            <div>
              <div class="cs-shoe-ana-title">분석 결과(최근 ${N20})</div>
              <div class="cs-shoe-count" style="margin-top:4px">분석 요약 <b style="color:rgba(255,255,255,.94)">${analysis}</b></div>
            </div>
            <div class="cs-shoe-badges">${badgeHtml}</div>
          </div>

          <div class="cs-shoe-ana-prob big">
            <span class="k">다음 핸드 예상 확률(관측·보정)</span>
            <span class="v"><b>B ${obsBayes.b}</b> / <b>P ${obsBayes.p}</b> / <b>T ${obsBayes.t}</b> <span style="margin-left:10px;color:rgba(255,255,255,.78)">우세: <b style="color:rgba(255,255,255,.94)">${bestObsLabel}</b></span></span>
          </div>

          <div class="cs-shoe-ana-prob">
            <span class="k">이론 확률(8덱 기준)</span>
            <span class="v">B ${fmtPct(BAC_P.banker)} / P ${fmtPct(BAC_P.player)} / T ${fmtPct(BAC_P.tie)}</span>
          </div>

          <div class="cs-shoe-ana-grid">
            <div class="it"><span>최근 5</span><b>${seqToText(seq.slice(-5))||'—'}</b></div>
            <div class="it"><span>최근 10</span><b>${seqToText(seq.slice(-10))||'—'}</b></div>
            <div class="it"><span>최근20 분포</span><b>P ${obsPct(c20.p)} · B ${obsPct(c20.b)} · T ${obsPct(c20.t)}</b></div>
            <div class="it"><span>최대 연속</span><b>P ${st.maxBy.P||0} · B ${st.maxBy.B||0} · T ${st.maxBy.T||0}</b></div>
          </div>

          <div class="cs-shoe-ana-note">※ “예측”이 아니라 <b>관측 편차·연속·과몰입</b> 신호를 경고합니다. 바카라는 독립 시행이므로 다음 결과를 확정 예측할 수 없습니다.</div>
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
