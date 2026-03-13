
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);

  const fmt = (n, d=2) => (Number.isFinite(n) ? n.toFixed(d) : '—');
  const pct = (n, d=2) => (Number.isFinite(n) ? (n*100).toFixed(d) + '%' : '—');

  
  const toast = (msg) => {
    try{
      let el = document.getElementById('proToast');
      if (!el){
        el = document.createElement('div');
        el.id='proToast';
        el.style.position='fixed';
        el.style.left='50%';
        el.style.bottom='18px';
        el.style.transform='translateX(-50%)';
        el.style.zIndex='9999';
        el.style.padding='10px 12px';
        el.style.borderRadius='999px';
        el.style.background='rgba(0,0,0,.78)';
        el.style.color='#fff';
        el.style.fontWeight='800';
        el.style.fontSize='13px';
        el.style.boxShadow='0 12px 30px rgba(0,0,0,.22)';
        el.style.opacity='0';
        el.style.transition='opacity .18s ease, transform .18s ease';
        el.style.pointerEvents='none';
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.style.opacity='1';
      el.style.transform='translateX(-50%) translateY(-4px)';
      clearTimeout(el._t);
      el._t = setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateX(-50%) translateY(0px)'; }, 1100);
    }catch(e){}
  };
const safeNum = (v) => {
    const n = Number(String(v).replace(/,/g,'').trim());
    return Number.isFinite(n) ? n : NaN;
  };

  const parseNums = (text) => {
    const m = String(text||'').match(/[+-]?\d+(?:\.\d+)?/g);
    return (m || []).map(Number).filter(Number.isFinite);
  };

  const splitLines = (text) => String(text||'').split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  // v48 state (PRO options)
  let openSnap = null; // {market, odds, line, sport, ts}
  let consLast = null; // {market, line, bestOdds, sport}

  const guessBySportDefault = (sport) => {
    // UX defaults per sport
    const s = String(sport||'').toLowerCase();
    if (s === 'soccer' || s === 'hockey' || s === 'handball' || s === 'futsal') return '1x2';
    // Most other sports are commonly presented as 2-way in main markets
    return '2way';
  };

  const detectMarket = (lineText, forcedMarket, sport) => {
    const text = String(lineText||'').trim();
    const nums = parseNums(text);
    // Odds candidates: strictly > 1.0001
    const odds = nums.filter(n => n > 1.0001);

    const hasOU = /(\bO\b|\bU\b|오버|언더|over|under)/i.test(text);
    const hasHandi = /[+-]\s*\d/.test(text) || /핸디|handicap|spread/i.test(text);

    // Helper: line candidate is a number that looks like a line: abs<=20, commonly <=10, can be negative
    const lineCand = (() => {
      // Prefer signed number for handicap
      const signed = (text.match(/[+-]\s*\d+(?:\.\d+)?/g) || [])[0];
      if (signed) {
        const v = safeNum(signed.replace(/\s+/g,''));
        if (Number.isFinite(v) && Math.abs(v) <= 20) return v;
      }
      // Otherwise, for OU: if at least 3 numeric tokens, often first is line (<=10) then 2 odds
      if (nums.length >= 3) {
        const v = nums[0];
        if (Number.isFinite(v) && v > 0 && v <= 10) return v;
      }
      return NaN;
    })();

    // Decide market
    let market = forcedMarket && forcedMarket !== 'auto' ? forcedMarket : 'auto';

    if (market === 'auto') {
      if (hasOU && odds.length >= 2) market = 'ou';
      else if (hasHandi && odds.length >= 2) market = 'handicap';
      else if (odds.length >= 3) market = '1x2';
      else if (odds.length === 2) market = guessBySportDefault(sport || 'soccer');
      else market = guessBySportDefault(sport || 'soccer');
    }

    // Extract payload by market
    if (market === '1x2') {
      if (odds.length >= 3) return { market, odds: odds.slice(0,3), line: NaN, raw:text };
      return { market, odds: [], line: NaN, raw:text };
    }
    if (market === '2way') {
      if (odds.length >= 2) return { market, odds: odds.slice(0,2), line: NaN, raw:text };
      return { market, odds: [], line: NaN, raw:text };
    }
    if (market === 'ou') {
      // need line + two odds; if odds count >=2 and have lineCand, map
      const o = odds.slice(0,2);
      return { market, odds: o.length===2?o:[], line: Number.isFinite(lineCand)?lineCand:NaN, raw:text };
    }
    if (market === 'handicap') {
      const o = odds.slice(0,2);
      return { market, odds: o.length===2?o:[], line: Number.isFinite(lineCand)?lineCand:NaN, raw:text };
    }
    return { market: guessBySportDefault(sport || 'soccer'), odds: [], line: NaN, raw:text };
  };

  const fairFromOdds = (odds, method) => {
    const clean = (odds||[]).map(safeNum).filter(n => Number.isFinite(n) && n > 1.0001);
    if (clean.length < 2) return null;

    const q = clean.map(o => 1/o); // implied (vig-included)
    const over = q.reduce((a,b)=>a+b,0);
    if (!Number.isFinite(over) || over <= 0) return null;

    const margin = over - 1;
    const n = q.length;

    // helpers
    const normalize = (arr) => {
      const s = arr.reduce((a,b)=>a+b,0);
      if (!Number.isFinite(s) || s <= 0) return null;
      return arr.map(v => v/s);
    };

    let p = null;

    if (method === 'power') {
      // Power method: find k>1 such that Σ(q_i^k)=1, then p_i=q_i^k
      // Robust bisection; fallback to norm if cannot converge.
      const target = 1;
      let lo = 1.0, hi = 8.0;
      const f = (k) => q.reduce((a,qi)=>a+Math.pow(qi,k),0);
      // Ensure hi makes f(hi) <= 1
      let f_lo = f(lo);
      let f_hi = f(hi);
      let guard = 0;
      while (f_hi > target && guard < 30) { hi *= 1.4; f_hi = f(hi); guard++; }
      if (f_lo <= target) {
        // already <=1 (near no-vig) -> k=1
        p = q.map(v => v/over);
      } else if (f_hi > target) {
        // cannot push down -> fallback
        p = q.map(v => v/over);
      } else {
        for (let i=0;i<60;i++){
          const mid = (lo+hi)/2;
          const fm = f(mid);
          if (!Number.isFinite(fm)) break;
          if (Math.abs(fm-target) < 1e-10) { lo=hi=mid; break; }
          if (fm > target) lo = mid; else hi = mid;
        }
        const k = (lo+hi)/2;
        p = q.map(qi => Math.pow(qi,k));
        // By construction sum ~ 1, but normalize just in case
        p = normalize(p) || q.map(v => v/over);
      }
    } else if (method === 'add') {
      // Additive: subtract margin evenly from implied probs
      const sub = margin / n;
      const tmp = q.map(qi => qi - sub);
      if (tmp.some(pi => !Number.isFinite(pi) || pi <= 0)) {
        p = q.map(qi => qi/over);
      } else {
        p = normalize(tmp) || q.map(qi => qi/over);
      }
    } else if (method === 'udog') {
      // Underdog-sensitive: remove more margin from favorites (higher q)
      const gamma = 1.5;
      const w = q.map(v => Math.pow(v, gamma));
      const W = w.reduce((a,b)=>a+b,0) || 1;
      const tmp = q.map((qi,i) => qi - margin*(w[i]/W));
      if (tmp.some(pi => !Number.isFinite(pi) || pi <= 0)) {
        p = q.map(qi => qi/over);
      } else {
        p = normalize(tmp) || q.map(qi => qi/over);
      }
    } else {
      // default normalization
      p = q.map(qi => qi/over);
    }

    const fairOdds = p.map(pi => pi>0 ? 1/pi : NaN);
    return { odds: clean, q, p, fairOdds, overround: over, margin, payout: 1/over };
  };

  // --- v48 helpers ---
  const pickLabel = (line, idx) => {
    const s = String(line||'').trim();
    if (!s) return { label: `소스${idx+1}`, text: '' };
    // Prefer "label: ..." convention
    const colon = s.indexOf(':');
    if (colon > 0 && colon < 18) {
      const l = s.slice(0, colon).trim();
      const rest = s.slice(colon+1).trim();
      if (l && rest) return { label: l, text: rest };
    }
    return { label: `소스${idx+1}`, text: s };
  };

  const nearEq = (a,b,eps=0.01) => (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b) <= eps);

  const htmlEscape = (s) => String(s||'').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const setBadge = (id, text, tone='', show=true) => {
    const el = typeof id === 'string' ? $(id) : id;
    if (!el) return;
    el.style.display = show ? '' : 'none';
    el.textContent = text;
    el.className = `pro-badge${tone ? ' ' + tone : ''}`;
  };

  const marginGrade = (m) => {
    if (!Number.isFinite(m)) return { label: '마진 등급 —', tone: '' };
    if (m <= 0.03) return { label: `마진 최상 ${pct(m,2)}`, tone: 'good' };
    if (m <= 0.05) return { label: `마진 좋음 ${pct(m,2)}`, tone: 'good' };
    if (m <= 0.08) return { label: `마진 보통 ${pct(m,2)}`, tone: 'warn' };
    return { label: `마진 높음 ${pct(m,2)}`, tone: 'bad' };
  };

  const agreementGrade = (sdMean) => {
    if (!Number.isFinite(sdMean)) return null;
    if (sdMean <= 0.010) return { label: `시장 합의도 높음`, tone: 'good' };
    if (sdMean <= 0.025) return { label: `시장 합의도 보통`, tone: 'warn' };
    return { label: `시장 합의도 낮음`, tone: 'bad' };
  };

  const copyText = async (text) => {
    const t = String(text||'').trim();
    if (!t) return false;
    try{
      if (navigator?.clipboard?.writeText) { await navigator.clipboard.writeText(t); return true; }
    }catch(_){ }
    try{
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.setAttribute('readonly','');
      ta.style.position='fixed'; ta.style.left='-9999px'; ta.style.top='-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return !!ok;
    }catch(_){ return false; }
  };

  const renderOpenMove = () => {
    const out = $('openOut');
    if (!out) return;
    if (!openSnap) { out.innerHTML = `<div class="pro-note">오픈 배당을 먼저 저장/붙여넣기 하세요.</div>`; return; }

    const method = $('methodSel')?.value || 'norm';
    const cur = readCurrent();
    if (!cur?.odds || cur.odds.length < 2) {
      out.innerHTML = `<div class="pro-note">현재 배당 입력 후 비교가 가능합니다.</div>`;
      return;
    }

    // Market compatibility
    if (openSnap.market !== cur.market) {
      out.innerHTML = `<div class="pro-note">오픈(${htmlEscape(openSnap.market)})과 현재(${htmlEscape(cur.market)}) 마켓이 달라 비교할 수 없습니다.</div>`;
      return;
    }
    if ((openSnap.market==='ou'||openSnap.market==='handicap') && Number.isFinite(openSnap.line) && Number.isFinite(cur.line) && !nearEq(openSnap.line, cur.line, 0.01)) {
      out.innerHTML = `<div class="pro-note">라인이 달라 비교가 어렵습니다. (오픈 ${fmt(openSnap.line,2)} vs 현재 ${fmt(cur.line,2)})</div>`;
      return;
    }

    const resO = fairFromOdds(openSnap.odds, method);
    const resC = fairFromOdds(cur.odds, method);
    if (!resO || !resC) {
      out.innerHTML = `<div class="pro-note">비교할 값이 부족합니다. (배당 2개 이상 필요)</div>`;
      return;
    }

    const labels = labelsForMarket(cur.market);
    const n = Math.min(labels.length, resO.p.length, resC.p.length);
    const favO = resO.p.reduce((bi,p,i)=> p>resO.p[bi]?i:bi, 0);
    const favC = resC.p.reduce((bi,p,i)=> p>resC.p[bi]?i:bi, 0);
    const favShift = (resC.p[favC] - resO.p[favO]);
    const favMsg = favShift > 0 ? `정배 강화 ${pct(favShift,2)}` : `정배 약화 ${pct(Math.abs(favShift),2)}`;

    let rows = '';
    for (let i=0;i<n;i++) {
      const o0 = openSnap.odds[i];
      const o1 = cur.odds[i];
      const dox = (Number.isFinite(o0)&&Number.isFinite(o1)) ? (o1 - o0) : NaN;
      const dp = (Number.isFinite(resO.p[i])&&Number.isFinite(resC.p[i])) ? (resC.p[i] - resO.p[i]) : NaN;
      rows += `<tr>
        <td style="padding-left:12px">${htmlEscape(labels[i])}</td>
        <td class="mono">${Number.isFinite(o0)?fmt(o0,2):'—'}</td>
        <td class="mono">${Number.isFinite(o1)?fmt(o1,2):'—'}</td>
        <td class="mono">${Number.isFinite(dox)?(dox>0?'+':'')+fmt(dox,2):'—'}</td>
        <td class="mono">${Number.isFinite(dp)?(dp>0?'+':'')+pct(dp,2):'—'}</td>
      </tr>`;
    }

    out.innerHTML = `
      <div class="pro-mini-kv">
        <div class="pro-mini-kvi"><div class="k">오픈 마진</div><div class="v">${pct(resO.margin,2)}</div><div class="s">오버 ${fmt(resO.overround,4)}</div></div>
        <div class="pro-mini-kvi"><div class="k">현재 마진</div><div class="v">${pct(resC.margin,2)}</div><div class="s">오버 ${fmt(resC.overround,4)}</div></div>
        <div class="pro-mini-kvi"><div class="k">요약</div><div class="v">${favMsg}</div><div class="s">오픈 ${favO===favC?'→':''} 현재 정배: ${htmlEscape(labels[favC]||'—')}</div></div>
      </div>
      <div style="margin-top:10px">
        <table class="pro-mini-table" aria-label="오즈 무브 비교">
          <thead><tr><th style="padding-left:12px">선택</th><th>오픈</th><th>현재</th><th>Δ배당</th><th>Δ확률</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="pro-note">※ Δ확률은 비그 제거 후 공정확률 기준(선택한 방식: ${htmlEscape(method)}). 단기 무브는 잡음일 수 있습니다.</div>
    `;
  };

  const setOpenFromCurrent = () => {
    const cur = readCurrent();
    if (!cur?.odds || cur.odds.length < 2) { toast('오픈 저장 실패: 현재 배당 입력'); return; }
    openSnap = { market: cur.market, odds: cur.odds.slice(), line: cur.line, sport: cur.sport, ts: Date.now() };
    toast('오픈 저장 완료');
    renderOpenMove();
  };

  const applyOpenPaste = () => {
    const sport = $('sportSel')?.value || 'soccer';
    const forced = $('marketSel')?.value || 'auto';
    const text = $('openPaste')?.value || '';
    const line = splitLines(text)[0] || text;
    const payload = detectMarket(line, forced, sport);
    if (!payload?.odds || payload.odds.length < 2) { toast('오픈 인식 실패'); return; }
    openSnap = { market: payload.market, odds: payload.odds.slice(), line: payload.line, sport, ts: Date.now() };
    toast('오픈 적용');
    renderOpenMove();
  };

  const clearOpen = () => {
    openSnap = null;
    const ta = $('openPaste'); if (ta) ta.value='';
    renderOpenMove();
    toast('오픈 초기화');
  };

  const runConsensus = () => {
    const sport = $('sportSel')?.value || 'soccer';
    const forced = $('marketSel')?.value || 'auto';
    const method = $('methodSel')?.value || 'norm';
    const text = $('consPaste')?.value || '';
    const lines = splitLines(text);
    const out = $('consOut');
    if (!out) return;
    if (!lines.length) { out.innerHTML = `<div class="pro-note">줄마다 배당을 붙여넣어 주세요. (예: bet365: 1.90 3.40 4.10)</div>`; return; }

    const parsed = [];
    lines.forEach((ln, idx) => {
      const {label, text:body} = pickLabel(ln, idx);
      const payload = detectMarket(body, forced, sport);
      if (!payload?.odds || payload.odds.length < 2) return;
      const res = fairFromOdds(payload.odds, method);
      if (!res) return;
      parsed.push({ label, payload, res });
    });

    if (parsed.length < 2) {
      out.innerHTML = `<div class="pro-note">비교 가능한 줄이 부족합니다. (최소 2줄)</div>`;
      return;
    }

    // Choose reference market: most frequent
    const freq = {};
    parsed.forEach(x => { freq[x.payload.market] = (freq[x.payload.market]||0) + 1; });
    const refMarket = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0][0];
    let refLine = NaN;
    if (refMarket==='ou'||refMarket==='handicap') {
      // pick first finite line
      for (const x of parsed) { if (x.payload.market===refMarket && Number.isFinite(x.payload.line)) { refLine = x.payload.line; break; } }
    }

    const filtered = parsed.filter(x => {
      if (x.payload.market !== refMarket) return false;
      if ((refMarket==='ou'||refMarket==='handicap') && Number.isFinite(refLine)) {
        return Number.isFinite(x.payload.line) && nearEq(x.payload.line, refLine, 0.01);
      }
      return true;
    });

    if (filtered.length < 2) {
      out.innerHTML = `<div class="pro-note">동일 마켓/라인으로 묶을 수 있는 줄이 부족합니다. (마켓/라인을 맞춰 붙여넣기)</div>`;
      return;
    }

    const labels = labelsForMarket(refMarket);
    const n = labels.length;

    // best odds per outcome
    const best = Array(n).fill(-Infinity);
    const bestBy = Array(n).fill('');
    filtered.forEach(x => {
      for (let i=0;i<n;i++) {
        const o = x.payload.odds[i];
        if (Number.isFinite(o) && o > best[i]) { best[i]=o; bestBy[i]=x.label; }
      }
    });

    // consensus fair probabilities (mean of de-vig p)
    const pSum = Array(n).fill(0);
    filtered.forEach(x => {
      for (let i=0;i<n;i++) pSum[i] += (x.res.p[i] || 0);
    });
    const pAvg = pSum.map(v => v / filtered.length);
    const pTot = pAvg.reduce((a,b)=>a+b,0) || 1;
    const pCons = pAvg.map(v => v / pTot);
    const fairCons = pCons.map(pi => pi>0 ? 1/pi : NaN);

    const avgMargin = filtered.reduce((a,x)=>a + x.res.margin, 0) / filtered.length;

    // raw odds average + agreement (stdev of de-vig probabilities)
    const avgOdds = Array(n).fill(0);
    const avgCnt = Array(n).fill(0);
    for (const x of filtered) {
      for (let i=0;i<n;i++) {
        const o = x.payload.odds[i];
        if (Number.isFinite(o)) { avgOdds[i] += o; avgCnt[i] += 1; }
      }
    }
    for (let i=0;i<n;i++) avgOdds[i] = avgCnt[i] ? (avgOdds[i]/avgCnt[i]) : NaN;

    const sd = Array(n).fill(NaN);
    for (let i=0;i<n;i++) {
      const vals = filtered.map(x => x.res.p?.[i]).filter(v => Number.isFinite(v));
      if (vals.length < 2) continue;
      const mean = vals.reduce((a,b)=>a+b,0) / vals.length;
      const varr = vals.reduce((a,v)=>a + Math.pow(v-mean,2),0) / (vals.length-1);
      sd[i] = Math.sqrt(varr);
    }
    const sdMean = sd.filter(v=>Number.isFinite(v)).reduce((a,b)=>a+b,0) / (sd.filter(v=>Number.isFinite(v)).length || 1);
    const agree = agreementGrade(sdMean);

    // render table
    let rows = '';
    filtered.forEach(x => {
      const m = x.res.margin;
      const od = x.payload.odds;
      const isBest = od.map((o,i)=> Number.isFinite(o) && o===best[i]);
      const cols = od.map((o,i)=> {
        const cls = isBest[i] ? 'best' : '';
        return `<td class="mono ${cls}">${Number.isFinite(o)?fmt(o,2):'—'}</td>`;
      }).join('');
      rows += `<tr>
        <td style="padding-left:12px"><b>${htmlEscape(x.label)}</b><div style="font-size:12px;opacity:.75;margin-top:2px">마진 ${pct(m,2)}</div></td>
        ${cols}
      </tr>`;
    });

    // header columns
    const ths = labels.map(l=>`<th>${htmlEscape(l)}</th>`).join('');

    out.innerHTML = `
      <div class="pro-mini-kv">
        <div class="pro-mini-kvi"><div class="k">사용 소스</div><div class="v">${filtered.length}개</div><div class="s">동일 마켓 기준</div></div>
        <div class="pro-mini-kvi"><div class="k">평균 마진</div><div class="v">${pct(avgMargin,2)}</div><div class="s">(방식: ${htmlEscape(method)})</div></div>
        <div class="pro-mini-kvi"><div class="k">시장 평균 공정배당</div><div class="v">${fairCons.map(o=>fmt(o,2)).join(' / ')}</div><div class="s">평균 공정확률</div></div>
      </div>
      <div style="margin-top:10px">
        <div class="pro-note"><b>최고배당</b>: ${best.map((o,i)=>`${htmlEscape(labels[i])} ${Number.isFinite(o)?fmt(o,2):'—'}(${htmlEscape(bestBy[i]||'')})`).join(' · ')}</div>
        <div class="pro-note"><b>시장 평균(배당)</b>: ${avgOdds.map((o,i)=>`${htmlEscape(labels[i])} ${Number.isFinite(o)?fmt(o,2):'—'}`).join(' · ')}${agree?` · <b>${htmlEscape(agree.label)}</b>`:''}</div>
        <table class="pro-mini-table" aria-label="북메이커 비교">
          <thead><tr><th style="padding-left:12px">소스</th>${ths}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="pro-note">※ 라인/마켓이 다른 줄은 자동 제외됩니다. (O/U·핸디는 라인까지 일치해야 비교)</div>
    `;

    consLast = {
      market: refMarket,
      line: refLine,
      sport,
      method,
      labels,
      bestOdds: best.map(v=>Number.isFinite(v)?v:NaN),
      bestBy: bestBy.slice(),
      avgOdds: avgOdds.slice(),
      avgMargin,
      sdMean
    };
  };

  const applyConsensusBest = () => {
    if (!consLast || !consLast.bestOdds) { toast('적용할 비교 결과 없음'); return; }
    fillForm({ market: consLast.market, odds: consLast.bestOdds, line: consLast.line });
    render();
    toast('최고배당 적용');
    document.getElementById('proResult')?.scrollIntoView({behavior:'smooth', block:'start'});
  };

  const clearConsensus = () => {
    consLast = null;
    const ta = $('consPaste'); if (ta) ta.value='';
    const out = $('consOut'); if (out) out.innerHTML = '';
    toast('평균 기준 초기화');
  };

  const labelsForMarket = (market) => {
    if (market === '1x2') return ['홈','무','원정'];
    if (market === 'ou') return ['오버','언더'];
    if (market === 'handicap') return ['A','B'];
    return ['A','B'];
  };

  const setInputsVisible = (market) => {
    const map = {
      '1x2': 'inputs1x2',
      '2way': 'inputs2way',
      'ou': 'inputsOU',
      'handicap': 'inputsHcap'
    };
    ['inputs1x2','inputs2way','inputsOU','inputsHcap'].forEach(id => {
      const el = $(id);
      if (el) el.style.display = (map[market] === id) ? '' : 'none';
    });
    $('kvMarket').textContent = market === '1x2' ? '1X2' : (market === '2way' ? '2-way' : (market === 'ou' ? 'O/U' : 'Handicap'));
  };

  const fillForm = (payload) => {
    const { market, odds, line } = payload;
    setInputsVisible(market);
    $('marketSel').value = market; // lock to detected for clarity
    if (market === '1x2') {
      $('od1').value = odds?.[0] ? String(odds[0]) : '';
      $('odx').value = odds?.[1] ? String(odds[1]) : '';
      $('od2').value = odds?.[2] ? String(odds[2]) : '';
    } else if (market === '2way') {
      $('odA').value = odds?.[0] ? String(odds[0]) : '';
      $('odB').value = odds?.[1] ? String(odds[1]) : '';
    } else if (market === 'ou') {
      $('lineOU').value = Number.isFinite(line) ? String(line) : ($('lineOU').value || '');
      $('odO').value = odds?.[0] ? String(odds[0]) : '';
      $('odU').value = odds?.[1] ? String(odds[1]) : '';
    } else if (market === 'handicap') {
      $('lineH').value = Number.isFinite(line) ? String(line) : ($('lineH').value || '');
      $('odH1').value = odds?.[0] ? String(odds[0]) : '';
      $('odH2').value = odds?.[1] ? String(odds[1]) : '';
    }
  };

  const readCurrent = () => {
    const sport = $('sportSel')?.value || 'soccer';
    const forced = $('marketSel')?.value || 'auto';
    let market = forced === 'auto' ? guessBySportDefault(sport) : forced;

    if (forced === 'auto') {
      // if user already filled a certain input group, infer
      const has1x2 = [safeNum($('od1')?.value), safeNum($('odx')?.value), safeNum($('od2')?.value)].filter(n=>n>1).length >= 2;
      const has2 = [safeNum($('odA')?.value), safeNum($('odB')?.value)].filter(n=>n>1).length >= 2;
      const hasOU = [safeNum($('odO')?.value), safeNum($('odU')?.value)].filter(n=>n>1).length >= 2 || Number.isFinite(safeNum($('lineOU')?.value));
      const hasH = [safeNum($('odH1')?.value), safeNum($('odH2')?.value)].filter(n=>n>1).length >= 2 || Number.isFinite(safeNum($('lineH')?.value));
      if (hasOU) market = 'ou';
      else if (hasH) market = 'handicap';
      else if (has1x2) market = '1x2';
      else if (has2) market = '2way';
    }

    let odds = [];
    let line = NaN;

    if (market === '1x2') odds = [safeNum($('od1')?.value), safeNum($('odx')?.value), safeNum($('od2')?.value)].filter(n=>n>1);
    else if (market === '2way') odds = [safeNum($('odA')?.value), safeNum($('odB')?.value)].filter(n=>n>1);
    else if (market === 'ou') {
      line = safeNum($('lineOU')?.value);
      odds = [safeNum($('odO')?.value), safeNum($('odU')?.value)].filter(n=>n>1);
    } else if (market === 'handicap') {
      line = safeNum($('lineH')?.value);
      odds = [safeNum($('odH1')?.value), safeNum($('odH2')?.value)].filter(n=>n>1);
    }

    return { sport, market, odds, line };
  };

  let lastSummaryText = '';

  const methodLabel = (m) => ({
    norm: '정규화',
    power: '파워(권장)',
    u: '가감',
    u2: '가감',
    udog: '언더독 민감 보정'
  }[m] || m);

  const marketLabel = (market, line) => {
    if (market === '1x2') return '승/무/패(1X2)';
    if (market === '2way') return '2-way';
    if (market === 'ou') return `오버/언더${Number.isFinite(line)?` ${fmt(line,2)}`:''}`;
    if (market === 'handicap') return `핸디${Number.isFinite(line)?` ${fmt(line,2)}`:''}`;
    return market;
  };

  const canMatchLine = (a, b) => {
    if (!Number.isFinite(a) && !Number.isFinite(b)) return true;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    return Math.abs(a-b) < 1e-6;
  };

  const renderReference = ({ sportLabel, market, line, method, res, labels, shownOdds, favIdx }) => {
    // badges
    const mg = marginGrade(res.margin);
    setBadge('sigMargin', mg.label, mg.tone);

    const hasCons = !!(consLast && consLast.market === market && canMatchLine(consLast.line, line) && Array.isArray(consLast.avgOdds));
    if (hasCons) {
      const ag = agreementGrade(consLast.sdMean);
      if (ag) setBadge('sigAgreement', ag.label, ag.tone, true);
      else setBadge('sigAgreement', '시장 합의도 —', '', false);
      setBadge('sigMarketAvg', '시장 평균 비교 ON', 'good', true);
    } else {
      setBadge('sigAgreement', '시장 합의도 —', '', false);
      setBadge('sigMarketAvg', '시장 평균 비교 —', '', false);
    }

    const hasOpen = !!(openSnap && openSnap.market === market && canMatchLine(openSnap.line, line) && Array.isArray(openSnap.odds) && openSnap.odds.length === shownOdds.length);
    setBadge('sigMove', hasOpen ? '오즈 무브 ON' : '오즈 무브 —', hasOpen ? 'good' : '', !!hasOpen);

    // summary card
    const so = $('summaryOut');
    if (!so) return;

    const p = res.p;
    const fairOdds = res.fairOdds;
    const nowOddsText = shownOdds.map(o => Number.isFinite(o)?fmt(o,2):'—').join(' / ');
    const fairText = fairOdds.map(o => fmt(o,2)).join(' / ');
    const pText = p.map(v => pct(v,2)).join(' / ');

    let extra = '';
    let extra2 = '';

    if (hasCons) {
      const avgOdds = consLast.avgOdds;
      const bestOdds = consLast.bestOdds || [];
      const avgText = avgOdds.map(o => Number.isFinite(o)?fmt(o,2):'—').join(' / ');
      const bestText = bestOdds.map(o => Number.isFinite(o)?fmt(o,2):'—').join(' / ');
      // relative vs avg
      const deltas = shownOdds.map((o,i)=> (Number.isFinite(o)&&Number.isFinite(avgOdds[i])) ? (o-avgOdds[i]) : NaN);
      const bestIdx = deltas.reduce((bi,v,i)=> (Number.isFinite(v) && (!Number.isFinite(deltas[bi]) || v>deltas[bi])) ? i : bi, 0);
      const d = deltas[bestIdx];
      extra = `시장 평균 배당: <span class="sum-mono">${avgText}</span> · 최고배당: <span class="sum-mono">${bestText}</span>`;
      if (Number.isFinite(d) && Math.abs(d) >= 0.01) {
        extra2 = `현재는 시장 평균 대비 <b>${htmlEscape(labels[bestIdx])}</b>가 ${d>0?`<b>+${fmt(d,2)}</b>`:`<b>${fmt(d,2)}</b>`} 만큼 유리/불리합니다.`;
      }
    }

    if (hasOpen) {
      const mv = shownOdds.map((o,i)=> (Number.isFinite(o)&&Number.isFinite(openSnap.odds[i])) ? (o-openSnap.odds[i]) : NaN);
      const mvText = mv.map(v => Number.isFinite(v) ? (v>=0?`+${fmt(v,2)}`:fmt(v,2)) : '—').join(' / ');
      extra2 += (extra2?'<br>':'') + `오픈→현재 변동: <span class="sum-mono">${mvText}</span>`;
    }

    // guidance (reference-first)
    let guide = '';
    if (res.margin > 0.08) guide = '마진이 높습니다. 멀티 스캔 TOP3 또는 다른 북/라인으로 비교해보세요.';
    else if (res.margin > 0.05) guide = '마진이 보통~높음 구간입니다. TOP3 스캔으로 더 낮은 마진을 먼저 찾는 게 효율적입니다.';
    else guide = '마진이 낮은 편입니다. 같은 마켓/라인에서 오즈 무브·시장 평균 비교로 “가격(배당)” 차이를 확인해보세요.';

    so.innerHTML = `
      <div class="sum-line">${htmlEscape(sportLabel)} · <b>${htmlEscape(marketLabel(market,line))}</b> · 현재 <span class="sum-mono">${htmlEscape(nowOddsText)}</span> · 공정확률 <span class="sum-mono">${htmlEscape(pText)}</span></div>
      <div class="sum-sub">공정배당 <span class="sum-mono">${htmlEscape(fairText)}</span> · 방식 <b>${htmlEscape(methodLabel(method))}</b> · ${htmlEscape(mg.label)}</div>
      ${extra?`<div class="sum-sub">${extra}</div>`:''}
      ${extra2?`<div class="sum-sub">${extra2}</div>`:''}
      <div class="sum-sub">TIP: ${htmlEscape(guide)}</div>
    `;

    // clipboard text
    const lines = [];
    lines.push(`[88ST SPORTS PRO] ${sportLabel} · ${marketLabel(market,line)}`);
    lines.push(`현재배당: ${nowOddsText}`);
    lines.push(`공정확률: ${pText} (방식: ${methodLabel(method)})`);
    lines.push(`공정배당: ${fairText} · ${mg.label}`);
    if (hasCons) {
      const avgText = consLast.avgOdds.map(o => Number.isFinite(o)?fmt(o,2):'—').join(' / ');
      const bestText = (consLast.bestOdds||[]).map(o => Number.isFinite(o)?fmt(o,2):'—').join(' / ');
      const ag = agreementGrade(consLast.sdMean);
      lines.push(`시장평균(배당): ${avgText} · 최고배당: ${bestText}${ag?` · ${ag.label}`:''}`);
    }
    if (hasOpen) {
      const mv = shownOdds.map((o,i)=> (Number.isFinite(o)&&Number.isFinite(openSnap.odds[i])) ? (o-openSnap.odds[i]) : NaN);
      const mvText = mv.map(v => Number.isFinite(v) ? (v>=0?`+${fmt(v,2)}`:fmt(v,2)) : '—').join(' / ');
      lines.push(`오픈→현재 변동: ${mvText}`);
    }
    lines.push(`TIP: ${guide}`);
    lastSummaryText = lines.join('\n');
  };

  const render = () => {
    const sport = $('sportSel')?.value || 'soccer';
    const method = $('methodSel')?.value || 'norm';
    const { market, odds, line } = readCurrent();

    // header kv sport
    const sportLabel = ({soccer:'축구',basketball:'농구',baseball:'야구',volleyball:'배구',tennis:'테니스',tabletennis:'탁구',badminton:'배드민턴',handball:'핸드볼',hockey:'하키',rugby:'럭비',americanfootball:'미식축구',cricket:'크리켓',futsal:'풋살',mma:'격투기(MMA)',boxing:'복싱',esports:'e스포츠',other:'기타'})[sport] || '기타';
    $('kvSport').textContent = sportLabel;

    setInputsVisible(market);

    const res = fairFromOdds(odds, method);
    const warnEl = $('kvWarn');
    const tbody = $('tblBody');

    if (!res) {
      $('kvOver').textContent = '—';
      $('kvMargin').textContent = '—';
      $('kvFair').textContent = '—';
      $('kvFairNote').textContent = '입력 대기';
      $('kvUpset').textContent = '—';
      $('kvUpsetNote').textContent = '—';
      if (warnEl) warnEl.textContent = '입력 대기';
      tbody.innerHTML = `<tr><td colspan="4" style="border-radius:14px;text-align:center;opacity:.7">입력 후 자동 계산됩니다.</td></tr>`;

      setBadge('sigMargin', '마진 등급 —');
      setBadge('sigAgreement', '시장 합의도 —', '', false);
      setBadge('sigMove', '오즈 무브 —', '', false);
      setBadge('sigMarketAvg', '시장 평균 비교 —', '', false);
      const so = $('summaryOut');
      if (so) so.innerHTML = `<div class="sum-sub">입력 후 결과 요약이 표시됩니다.</div>`;
      return;
    }

    const labels = labelsForMarket(market);
    const fairOdds = res.fairOdds;
    const probs = res.p;

    // Update KV
    $('kvOver').textContent = fmt(res.overround, 4);
    $('kvMargin').textContent = pct(res.margin, 2);

    let mkText = market === '1x2' ? '승/무/패(1X2)' : (market === '2way' ? '2-way' : (market === 'ou' ? `오버/언더 ${Number.isFinite(line)?line:''}` : `핸디 ${Number.isFinite(line)?line:''}`));
    $('kvMarket').textContent = mkText;

    $('kvFair').textContent = fairOdds.map(o => fmt(o,2)).join(' / ');
    $('kvFairNote').textContent = methodLabel(method);

    // Upset
    const favIdx = probs.reduce((bi,p,i)=> p>probs[bi]?i:bi, 0);
    const upset = 1 - probs[favIdx];
    $('kvUpset').textContent = pct(upset, 2);
    const freq = upset>0 ? Math.max(2, Math.round(1/upset)) : 0;
    $('kvUpsetNote').textContent = upset>0 ? `평균 ${freq}번 중 1번 정도` : '—';

    // Warn
    const issues = [];
    if (res.margin < 0) issues.push('마진 음수(입력 확인)');
    if (res.margin > 0.12) issues.push('마진 높음');
    if (market === 'ou' && !Number.isFinite(line)) issues.push('라인 없음');
    if (market === 'handicap' && !Number.isFinite(line)) issues.push('라인 없음');
    warnEl.textContent = issues.length ? issues[0] : '정상';

    // Volatility note
    const noteVol = $('noteVol');
    if (noteVol) {
      const pFav = probs[favIdx];
      // Probability of 3 consecutive upsets (not-fav)
      const pUps = 1-pFav;
      const p3 = Math.pow(pUps, 3);
      noteVol.innerHTML =
        `※ 정배가 높아도 역배는 충분히 나옵니다. 현재 정배 확률은 <b>${pct(pFav,1)}</b> / 역배·비정배 합은 <b>${pct(pUps,1)}</b>. ` +
        (Number.isFinite(p3) ? `역배가 3번 연속 나올 확률도 <b>${pct(p3,1)}</b> 입니다.` : '');
    }

    // Render table
    tbody.innerHTML = '';
    const shownOdds = (market === '1x2') ? [safeNum($('od1').value), safeNum($('odx').value), safeNum($('od2').value)] :
                      (market === '2way') ? [safeNum($('odA').value), safeNum($('odB').value)] :
                      (market === 'ou') ? [safeNum($('odO').value), safeNum($('odU').value)] :
                      [safeNum($('odH1').value), safeNum($('odH2').value)];

    for (let i=0;i<labels.length;i++) {
      const o = shownOdds[i];
      const p = probs[i];
      const fo = fairOdds[i];
      tbody.insertAdjacentHTML('beforeend',
        `<tr>
          <td style="padding-left:12px">${labels[i]}${i===favIdx?` <span class="pro-badge good" style="margin-left:6px">정배</span>`:''}</td>
          <td>${Number.isFinite(o)?fmt(o,2):'—'}</td>
          <td>${pct(p,2)}</td>
          <td>${fmt(fo,2)}</td>
        </tr>`
      );
    }

    // Reference summary + signals
    try{
      renderReference({ sportLabel, market, line, method, res, labels, shownOdds, favIdx });
    }catch(_){ }

    // v48: update odds-move panel (if enabled)
    try{ requestAnimationFrame(renderOpenMove); }catch(_){ }
  };

  const resetAll = () => {
    $('quickPaste').value = '';
    ['od1','odx','od2','odA','odB','lineOU','odO','odU','lineH','odH1','odH2'].forEach(id => { const el=$(id); if(el) el.value=''; });
    $('marketSel').value = 'auto';
    $('methodSel').value = 'power';
    $('proScan').style.display = 'none';

    // v48: reset PRO options
    openSnap = null;
    consLast = null;
    if ($('openPaste')) $('openPaste').value='';
    if ($('consPaste')) $('consPaste').value='';
    if ($('openOut')) $('openOut').innerHTML='';
    if ($('consOut')) $('consOut').innerHTML='';

    render();
  };

  const applyQuickPaste = () => {
    const sport = $('sportSel')?.value || 'soccer';
    const forced = $('marketSel')?.value || 'auto';
    const text = $('quickPaste')?.value || '';
    const lines = splitLines(text);
    const first = lines[0] || text;
    const payload = detectMarket(first, forced, sport);
    if (!payload.odds || payload.odds.length < 2) {
      $('kvWarn').textContent = '붙여넣기 인식 실패';
      toast('인식 실패: 배당 숫자 확인');
      return;
    }
    fillForm(payload);
    render();
  };

  const scanTop3 = () => {
    const sport = $('sportSel')?.value || 'soccer';
    const forced = $('marketSel')?.value || 'auto';
    const method = $('methodSel')?.value || 'norm';
    const text = $('quickPaste')?.value || '';
    const lines = splitLines(text);
    const items = [];

    lines.forEach((ln) => {
      const payload = detectMarket(ln, forced, sport);
      if (!payload.odds || payload.odds.length < 2) return;
      const res = fairFromOdds(payload.odds, method);
      if (!res) return;
      // prefer lower margin
      items.push({
        raw: payload.raw,
        market: payload.market,
        line: payload.line,
        odds: payload.odds,
        margin: res.margin,
        over: res.overround
      });
    });

    items.sort((a,b)=> (a.margin - b.margin));
    const top = items.slice(0,3);
    const box = $('proScan');
    const list = $('scanList');
    list.innerHTML = '';

    if (!top.length) {
      list.innerHTML = `<div class="pro-note">스캔 가능한 줄이 없습니다. (줄마다 배당 2개 또는 3개가 필요)</div>`;
    } else {
      top.forEach((it, idx) => {
        const label = it.market==='1x2'?'1X2':(it.market==='2way'?'2-way':(it.market==='ou'?'O/U':'Handicap'));
        const lineText = (it.market==='ou'||it.market==='handicap') && Number.isFinite(it.line) ? ` · ${it.line}` : '';
        const oddsText = it.odds.map(o=>fmt(o,2)).join(' / ');
        const rank = idx===0 ? 'TOP1' : (idx===1 ? 'TOP2' : 'TOP3');
        const el = document.createElement('div');
        el.className = 'pro-scanitem';
        el.innerHTML = `
          <div class="meta">
            <div class="t">${rank} · ${label}${lineText}</div>
            <div class="d">마진 ${pct(it.margin,2)} · 배당 ${oddsText}</div>
          </div>
          <div class="right">
            <span class="pro-badge">${pct(it.margin,2)}</span>
            <button class="pro-btn primary" type="button" style="padding:10px 12px">적용</button>
          </div>
        `;
        el.querySelector('button').addEventListener('click', () => {
          $('quickPaste').value = it.raw;
          fillForm({ market: it.market, odds: it.odds, line: it.line });
          $('proScan').style.display = 'none';
          render();
          // smooth scroll to result
          document.getElementById('proResult')?.scrollIntoView({behavior:'smooth', block:'start'});
        });
        list.appendChild(el);
      });
    }

    box.style.display = '';
    box.scrollIntoView({behavior:'smooth', block:'start'});
  };

  const hookLive = () => {
    // Live calc on input changes
    const ids = ['sportSel','marketSel','methodSel','od1','odx','od2','odA','odB','lineOU','odO','odU','lineH','odH1','odH2'];
    ids.forEach(id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('input', () => requestAnimationFrame(render));
      el.addEventListener('change', () => requestAnimationFrame(render));
    });

    // Robust tap binding (mobile Safari safe)
    const bindTap = (id, fn) => {
      const el = $(id);
      if (!el) return;
      let last = 0;
      const run = (e) => {
        const now = Date.now();
        if (now - last < 350) return;
        last = now;
        try{ e?.preventDefault?.(); }catch(_){}
        fn();
      };
      el.addEventListener('pointerup', run);
      el.addEventListener('click', run);
    };

    bindTap('btnApply', () => { applyQuickPaste(); toast('분석 적용'); document.getElementById('proResult')?.scrollIntoView({behavior:'smooth', block:'start'}); });
    bindTap('btnScan', () => { scanTop3(); toast('TOP3 스캔'); });
    bindTap('btnClear', () => { resetAll(); toast('초기화'); });
    bindTap('btnScanClose', () => { $('proScan').style.display='none'; toast('닫기'); });

    bindTap('btnFormula', () => {
      const p = $('formulaPanel');
      if (!p) return;
      const isHidden = p.hasAttribute('hidden');
      if (isHidden) p.removeAttribute('hidden'); else p.setAttribute('hidden','');
      if (!isHidden) return;
      // only scroll on open
      p.scrollIntoView({behavior:'smooth', block:'nearest'});
    });

    // v48 PRO options
    bindTap('btnOpenFromCurrent', () => { setOpenFromCurrent(); });
    bindTap('btnApplyOpen', () => { applyOpenPaste(); });
    bindTap('btnClearOpen', () => { clearOpen(); });

    bindTap('btnConsRun', () => { runConsensus(); toast('시장 평균 비교'); });
    bindTap('btnConsApplyBest', () => { applyConsensusBest(); });
    bindTap('btnConsClear', () => { clearConsensus(); });

    bindTap('btnCopySummary', async () => {
      const ok = await copyText(lastSummaryText || '');
      toast(ok ? '요약 복사됨' : '복사 실패');
    });

    // Ensure buttons clickable (z-index)
    const act = document.querySelector('.pro-actions');
    if (act) act.style.position='relative', act.style.zIndex='2';

    // Initial
    setInputsVisible(guessBySportDefault($('sportSel')?.value || 'soccer'));
    render();
    renderOpenMove();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hookLive);
  } else {
    hookLive();
  }
})();
