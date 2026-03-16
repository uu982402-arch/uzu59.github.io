(function(){
  'use strict';
  if(!/\/analysis\/?$/.test(location.pathname)) return;

  var MOUNT_ID = 'analysisEngineMount';
  function $(id){ return document.getElementById(id); }
  function fmt(n,d){ return Number.isFinite(n) ? Number(n).toFixed(d==null?2:d) : '—'; }
  function pct(n,d){ return Number.isFinite(n) ? (n*100).toFixed(d==null?2:d)+'%' : '—'; }
  function safeNum(v){ var n = Number(String(v==null?'':v).replace(/,/g,'').trim()); return Number.isFinite(n)?n:NaN; }
  function mean(arr){ var xs = arr.filter(Number.isFinite); return xs.length ? xs.reduce(function(a,b){return a+b;},0)/xs.length : NaN; }
  function sd(arr){ var xs = arr.filter(Number.isFinite); if(!xs.length) return NaN; var m = mean(xs); return Math.sqrt(xs.reduce(function(a,b){ return a + Math.pow(b-m,2); },0)/xs.length); }
  function htmlEscape(s){ return String(s||'').replace(/[&<>"']/g,function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]); }); }
  function parseNums(text){ var m = String(text||'').match(/[+-]?\d+(?:\.\d+)?/g); return (m||[]).map(Number).filter(Number.isFinite); }
  function clamp01(v){ return Math.max(1e-9, Math.min(1-1e-9, v)); }

  function labelsForMarket(market){
    if(market==='1x2') return ['홈','무','원정'];
    if(market==='2way') return ['선택 A','선택 B'];
    if(market==='ou') return ['오버','언더'];
    return ['선택 A','반대'];
  }

  function readCurrent(){
    var market = ($('marketSel') && $('marketSel').value) || 'auto';
    var odds = [], line = NaN;
    var idsByMarket = {
      '1x2':['od1','odx','od2'],
      '2way':['odA','odB'],
      'ou':['odO','odU'],
      'handicap':['odH1','odH2']
    };
    function vals(ids){ return ids.map(function(id){ return safeNum($(id) && $(id).value); }).filter(Number.isFinite); }
    if(market==='auto'){
      var c1 = vals(idsByMarket['1x2']);
      var c2 = vals(idsByMarket['2way']);
      var co = vals(idsByMarket['ou']);
      var ch = vals(idsByMarket['handicap']);
      if(c1.length===3) market='1x2', odds=c1;
      else if(co.length===2) market='ou', odds=co, line=safeNum($('lineOU') && $('lineOU').value);
      else if(ch.length===2) market='handicap', odds=ch, line=safeNum($('lineH') && $('lineH').value);
      else market='2way', odds=c2;
    } else {
      odds = vals(idsByMarket[market] || []);
      if(market==='ou') line = safeNum($('lineOU') && $('lineOU').value);
      if(market==='handicap') line = safeNum($('lineH') && $('lineH').value);
    }
    return {market:market, odds:odds, line:line};
  }

  function detectMarketFromText(text, forced){
    var nums = parseNums(text);
    var odds = nums.filter(function(n){ return n > 1.0001; });
    var hasOU = /(\bO\b|\bU\b|오버|언더|over|under)/i.test(text||'');
    var hasHandi = /[+-]\s*\d/.test(text||'') || /핸디|handicap|spread/i.test(text||'');
    var line = NaN;
    var signed = (String(text||'').match(/[+-]\s*\d+(?:\.\d+)?/g) || [])[0];
    if(signed){ line = safeNum(signed.replace(/\s+/g,'')); }
    else if(nums.length >= 3 && nums[0] > 0 && nums[0] <= 10){ line = nums[0]; }
    var market = forced && forced!=='auto' ? forced : 'auto';
    if(market === 'auto'){
      if(hasOU && odds.length >= 2) market = 'ou';
      else if(hasHandi && odds.length >= 2) market = 'handicap';
      else if(odds.length >= 3) market = '1x2';
      else market = '2way';
    }
    if(market === '1x2') return {market:market, odds:odds.slice(0,3), line:NaN};
    if(market === 'ou' || market === 'handicap') return {market:market, odds:odds.slice(0,2), line:line};
    return {market:market, odds:odds.slice(0,2), line:NaN};
  }

  function fairNorm(odds){
    var clean = (odds||[]).map(safeNum).filter(function(n){ return Number.isFinite(n) && n > 1.0001; });
    if(clean.length < 2) return null;
    var q = clean.map(function(o){ return 1/o; });
    var over = q.reduce(function(a,b){ return a+b; },0);
    if(!(over > 0)) return null;
    var p = q.map(function(v){ return v/over; });
    return {odds:clean, q:q, p:p, overround:over, margin:over-1, fairOdds:p.map(function(v){ return 1/v; })};
  }

  function fairPower(odds){
    var base = fairNorm(odds); if(!base) return null;
    var q = base.q.slice();
    var lo = 1.0, hi = 8.0;
    function f(k){ return q.reduce(function(a,qi){ return a + Math.pow(qi,k); }, 0); }
    var target = 1;
    var fHi = f(hi), guard = 0;
    while(fHi > target && guard < 30){ hi *= 1.35; fHi = f(hi); guard++; }
    if(fHi > target) return base;
    for(var i=0;i<60;i++){
      var mid = (lo+hi)/2;
      var fm = f(mid);
      if(Math.abs(fm-target) < 1e-11){ lo = hi = mid; break; }
      if(fm > target) lo = mid; else hi = mid;
    }
    var k = (lo+hi)/2;
    var p = q.map(function(qi){ return Math.pow(qi,k); });
    var s = p.reduce(function(a,b){ return a+b; },0);
    p = p.map(function(v){ return v/s; });
    return {odds:base.odds, q:q, p:p, overround:base.overround, margin:base.margin, fairOdds:p.map(function(v){ return 1/v; })};
  }

  function fairAdd(odds){
    var base = fairNorm(odds); if(!base) return null;
    var q = base.q.slice(), sub = base.margin / q.length;
    var p = q.map(function(v){ return v - sub; });
    if(p.some(function(v){ return v <= 0 || !Number.isFinite(v); })) return base;
    var s = p.reduce(function(a,b){ return a+b; },0);
    p = p.map(function(v){ return v/s; });
    return {odds:base.odds, q:q, p:p, overround:base.overround, margin:base.margin, fairOdds:p.map(function(v){ return 1/v; })};
  }

  function fairUdog(odds){
    var base = fairNorm(odds); if(!base) return null;
    var q = base.q.slice();
    var gamma = 1.5;
    var w = q.map(function(v){ return Math.pow(v, gamma); });
    var W = w.reduce(function(a,b){ return a+b; },0) || 1;
    var p = q.map(function(v,i){ return v - base.margin * (w[i]/W); });
    if(p.some(function(v){ return v <= 0 || !Number.isFinite(v); })) return base;
    var s = p.reduce(function(a,b){ return a+b; },0);
    p = p.map(function(v){ return v/s; });
    return {odds:base.odds, q:q, p:p, overround:base.overround, margin:base.margin, fairOdds:p.map(function(v){ return 1/v; })};
  }

  function fairShin(odds){
    var base = fairNorm(odds); if(!base) return null;
    var q = base.q.slice();
    var sumq = q.reduce(function(a,b){ return a+b; },0);
    function probs(z){
      return q.map(function(qi){
        var x = (qi*qi) / sumq;
        var p = (Math.sqrt(z*z + 4*(1-z)*x) - z) / (2*(1-z));
        return p;
      });
    }
    var lo = 0, hi = 0.4;
    function g(z){ return probs(z).reduce(function(a,b){ return a+b; },0) - 1; }
    var glo = g(lo), ghi = g(hi), guard = 0;
    while(ghi > 0 && guard < 40){ hi = Math.min(.999999, hi * 1.4 + .02); ghi = g(hi); guard++; }
    if(!(glo >= 0) || !(ghi <= 0)) return base;
    for(var i=0;i<70;i++){
      var mid = (lo+hi)/2;
      var gm = g(mid);
      if(Math.abs(gm) < 1e-12){ lo = hi = mid; break; }
      if(gm > 0) lo = mid; else hi = mid;
    }
    var z = (lo+hi)/2;
    var p = probs(z);
    var s = p.reduce(function(a,b){ return a+b; },0);
    p = p.map(function(v){ return v/s; });
    return {odds:base.odds, q:q, p:p, overround:base.overround, margin:base.margin, fairOdds:p.map(function(v){ return 1/v; }), z:z};
  }

  function fairOddsRatio(odds){
    var base = fairNorm(odds); if(!base) return null;
    var q = base.q.slice();
    function probs(c){
      return q.map(function(qi){ return qi / (c + qi - c*qi); });
    }
    var lo = 1e-6, hi = 10;
    function g(c){ return probs(c).reduce(function(a,b){ return a+b; },0) - 1; }
    var glo = g(lo), ghi = g(hi), guard = 0;
    while(ghi > 0 && guard < 50){ hi *= 1.5; ghi = g(hi); guard++; }
    if(!(glo >= 0) || !(ghi <= 0)) return base;
    for(var i=0;i<70;i++){
      var mid = (lo+hi)/2;
      var gm = g(mid);
      if(Math.abs(gm) < 1e-12){ lo = hi = mid; break; }
      if(gm > 0) lo = mid; else hi = mid;
    }
    var c = (lo+hi)/2;
    var p = probs(c);
    var s = p.reduce(function(a,b){ return a+b; },0);
    p = p.map(function(v){ return v/s; });
    return {odds:base.odds, q:q, p:p, overround:base.overround, margin:base.margin, fairOdds:p.map(function(v){ return 1/v; }), c:c};
  }

  function fairLogit(odds){
    var base = fairNorm(odds); if(!base) return null;
    var q = base.q.slice().map(clamp01);
    function probs(c){
      return q.map(function(qi){
        var logit = Math.log(qi/(1-qi));
        var z = 1/(1 + Math.exp(-(logit - c)));
        return z;
      });
    }
    var lo = -10, hi = 10;
    function g(c){ return probs(c).reduce(function(a,b){ return a+b; },0) - 1; }
    var glo = g(lo), ghi = g(hi);
    if(!(glo >= 0) || !(ghi <= 0)) return base;
    for(var i=0;i<70;i++){
      var mid = (lo+hi)/2;
      var gm = g(mid);
      if(Math.abs(gm) < 1e-12){ lo = hi = mid; break; }
      if(gm > 0) lo = mid; else hi = mid;
    }
    var c = (lo+hi)/2;
    var p = probs(c);
    var s = p.reduce(function(a,b){ return a+b; },0);
    p = p.map(function(v){ return v/s; });
    return {odds:base.odds, q:q, p:p, overround:base.overround, margin:base.margin, fairOdds:p.map(function(v){ return 1/v; }), c:c};
  }

  function fairEnsemble(odds){
    var runs = [fairNorm(odds), fairPower(odds), fairAdd(odds), fairUdog(odds), fairShin(odds), fairOddsRatio(odds), fairLogit(odds)].filter(Boolean);
    if(!runs.length) return null;
    var len = runs[0].p.length;
    var p = [];
    for(var i=0;i<len;i++){
      p[i] = mean(runs.map(function(r){ return r.p[i]; }));
    }
    var s = p.reduce(function(a,b){ return a+b; },0);
    p = p.map(function(v){ return v/s; });
    var base = runs[0];
    return {odds:base.odds, q:base.q, p:p, overround:base.overround, margin:base.margin, fairOdds:p.map(function(v){ return 1/v; }), methods:runs.length};
  }

  function parseConsensus(){
    var raw = ($('consPaste') && $('consPaste').value) || '';
    var lines = String(raw).split(/\r?\n/).map(function(s){ return s.trim(); }).filter(Boolean);
    if(!lines.length) return null;
    var forced = ($('marketSel') && $('marketSel').value) || 'auto';
    var rows = [];
    lines.forEach(function(line){
      var payload = detectMarketFromText(line, forced);
      if(!payload.odds || payload.odds.length < 2) return;
      if(rows.length && payload.market !== rows[0].market) return;
      if(rows.length && payload.odds.length !== rows[0].odds.length) return;
      if((payload.market === 'ou' || payload.market === 'handicap') && rows.length){
        var baseLine = rows[0].line;
        if(Number.isFinite(baseLine) && Number.isFinite(payload.line) && Math.abs(baseLine - payload.line) > 0.001) return;
      }
      rows.push(payload);
    });
    if(rows.length < 2) return null;
    var bestOdds = rows[0].odds.map(function(_,idx){ return Math.max.apply(null, rows.map(function(r){ return r.odds[idx]; }).filter(Number.isFinite)); });
    var normRows = rows.map(function(r){ return fairNorm(r.odds); }).filter(Boolean);
    if(!normRows.length) return null;
    var avgProb = normRows[0].p.map(function(_,idx){ return mean(normRows.map(function(r){ return r.p[idx]; })); });
    var s = avgProb.reduce(function(a,b){ return a+b; },0);
    avgProb = avgProb.map(function(v){ return v/s; });
    var fairOdds = avgProb.map(function(v){ return 1/v; });
    var sdMean = mean(avgProb.map(function(_,idx){ return sd(normRows.map(function(r){ return r.p[idx]; })); }));
    return {market:rows[0].market, line:rows[0].line, rows:rows, bestOdds:bestOdds, avgProb:avgProb, fairOdds:fairOdds, sdMean:sdMean};
  }

  function parseOpen(){
    var raw = ($('openPaste') && $('openPaste').value) || '';
    if(!raw.trim()) return null;
    return detectMarketFromText(raw, ($('marketSel') && $('marketSel').value) || 'auto');
  }

  function kelly(prob, odds){
    if(!Number.isFinite(prob) || !Number.isFinite(odds) || odds <= 1) return 0;
    var b = odds - 1;
    var q = 1 - prob;
    var f = ((b * prob) - q) / b;
    return Math.max(0, f);
  }

  function pickBestEdge(probArr, oddsArr){
    var best = {idx:-1, edge:-Infinity};
    probArr.forEach(function(p,idx){
      var o = oddsArr[idx];
      var edge = Number.isFinite(o) ? (o * p - 1) : -Infinity;
      if(edge > best.edge) best = {idx:idx, edge:edge};
    });
    return best;
  }

  function ensureMount(){
    var mount = $(MOUNT_ID);
    if(mount) return mount;
    var result = $('proResult');
    if(!result || !result.parentNode) return null;
    mount = document.createElement('div');
    mount.id = MOUNT_ID;
    result.parentNode.insertBefore(mount, result.nextSibling);
    return mount;
  }

  function render(){
    var mount = ensureMount();
    if(!mount) return;
    var cur = readCurrent();
    if(!cur.odds || cur.odds.length < 2){
      mount.innerHTML = '';
      return;
    }
    var labels = labelsForMarket(cur.market);
    var methods = [
      ['정규화', fairNorm(cur.odds)],
      ['파워', fairPower(cur.odds)],
      ['가산', fairAdd(cur.odds)],
      ['언더독 보정', fairUdog(cur.odds)],
      ['Shin', fairShin(cur.odds)],
      ['Odds Ratio', fairOddsRatio(cur.odds)],
      ['Logit', fairLogit(cur.odds)],
      ['앙상블', fairEnsemble(cur.odds)]
    ].filter(function(row){ return !!row[1]; });
    var ensemble = methods[methods.length-1][1] || fairEnsemble(cur.odds) || fairPower(cur.odds) || fairNorm(cur.odds);
    if(!ensemble){ mount.innerHTML = ''; return; }
    var consensus = parseConsensus();
    var open = parseOpen();
    var bestOdds = consensus && consensus.bestOdds && consensus.bestOdds.length === cur.odds.length ? consensus.bestOdds : cur.odds.slice();
    var best = pickBestEdge(ensemble.p, bestOdds);
    var aiLines = [];
    var favIdx = ensemble.p.reduce(function(bi,p,i,a){ return p > a[bi] ? i : bi; }, 0);
    var favShort = cur.odds[favIdx];
    aiLines.push('가장 높은 공정확률은 ' + labels[favIdx] + ' ' + pct(ensemble.p[favIdx],1) + ' 입니다.');
    if(Number.isFinite(favShort)) aiLines.push('현재 ' + labels[favIdx] + ' 배당은 ' + fmt(favShort,2) + '로, 시장이 가장 강하게 본 선택입니다.');
    if(consensus){
      aiLines.push('북메이커 합의도는 ' + (Number.isFinite(consensus.sdMean) ? pct(consensus.sdMean,2) : '—') + ' 수준입니다.');
      if(best.idx >= 0 && best.edge > 0.005){
        aiLines.push('최고배당 기준 기대값은 ' + labels[best.idx] + ' 쪽이 가장 좋고, 추정 엣지는 ' + pct(best.edge,2) + ' 입니다.');
      } else {
        aiLines.push('최고배당 기준으로도 뚜렷한 플러스 엣지는 약합니다. 무리한 진입보다 관망이 유리합니다.');
      }
    }
    var moveSummary = '오픈 데이터 없음';
    var moveDetail = '오픈 배당을 입력하면 가격 이동과 확률 변화를 함께 읽어줍니다.';
    if(open && open.odds && open.odds.length === cur.odds.length){
      var deltas = cur.odds.map(function(o,idx){ return Number.isFinite(o) && Number.isFinite(open.odds[idx]) ? o - open.odds[idx] : NaN; });
      var probNow = fairNorm(cur.odds);
      var probOpen = fairNorm(open.odds);
      var pd = probNow && probOpen ? probNow.p.map(function(p,idx){ return p - probOpen.p[idx]; }) : [];
      var strongest = pd.length ? pd.reduce(function(bi,p,i,a){ return Math.abs(p) > Math.abs(a[bi]) ? i : bi; }, 0) : -1;
      var dir = strongest >= 0 && Number.isFinite(pd[strongest]) ? (pd[strongest] > 0 ? '강화' : '약화') : '혼합';
      moveSummary = labels[Math.max(strongest,0)] + ' 확률 ' + dir;
      moveDetail = deltas.map(function(v,idx){
        return labels[idx] + ' ' + (Number.isFinite(v) ? (v>0?'+':'') + fmt(v,2) : '—') + ' / 확률 ' + (pd[idx] ? (pd[idx]>0?'+':'') + pct(pd[idx],2) : '—');
      }).join(' · ');
      if(consensus && best.idx >= 0){
        var edgeNow = bestOdds[best.idx] * ensemble.p[best.idx] - 1;
        if(pd[best.idx] > 0 && edgeNow <= 0) aiLines.push('가격은 좋아 보이지만 확률 강화 폭보다 배당 메리트가 약해 역행 진입 주의가 필요합니다.');
      }
    }

    var edgeRows = labels.map(function(label, idx){
      var bestPrice = bestOdds[idx];
      var fair = ensemble.fairOdds[idx];
      var edge = Number.isFinite(bestPrice) ? (bestPrice * ensemble.p[idx] - 1) : NaN;
      var k = kelly(ensemble.p[idx], bestPrice);
      return {
        label:label,
        fair:fair,
        best:bestPrice,
        edge:edge,
        kFull:k,
        kHalf:k/2,
        kQuarter:k/4,
        isBest: idx === best.idx
      };
    });

    var methodRows = methods.map(function(row){
      var name = row[0], res = row[1];
      var bestFair = Math.min.apply(null, res.fairOdds.filter(Number.isFinite));
      return '<tr'+(name==='앙상블'?' class="ae-best"':'')+'><td>'+htmlEscape(name)+'</td><td>'+res.fairOdds.map(function(v){ return fmt(v,2); }).join(' / ')+'</td><td>'+res.p.map(function(v){ return pct(v,2); }).join(' / ')+'</td><td>'+fmt(bestFair,2)+'</td></tr>';
    }).join('');

    var edgeTable = edgeRows.map(function(r){
      var tone = !Number.isFinite(r.edge) ? '' : (r.edge > 0.01 ? 'ae-good' : (r.edge >= -0.005 ? 'ae-warn' : 'ae-bad'));
      return '<tr'+(r.isBest?' class="ae-best"':'')+'><td>'+htmlEscape(r.label)+'</td><td>'+fmt(r.best,2)+'</td><td>'+fmt(r.fair,2)+'</td><td class="'+tone+'">'+pct(r.edge,2)+'</td><td>'+pct(r.kQuarter,2)+' / '+pct(r.kHalf,2)+' / '+pct(r.kFull,2)+'</td></tr>';
    }).join('');

    var consensusBadge = consensus ? '<span class="ae-pill">합의도 '+pct(consensus.sdMean,2)+'</span>' : '<span class="ae-pill">컨센서스 없음</span>';
    var marketLine = (cur.market === 'ou' || cur.market === 'handicap') && Number.isFinite(cur.line) ? ' · 라인 ' + fmt(cur.line,2) : '';

    mount.innerHTML = [
      '<section class="ae-card">',
      '  <div class="ae-head">',
      '    <div>',
      '      <div class="ae-kicker">88ST · Quant Edge Engine</div>',
      '      <h2 class="ae-title">추가 수학 엔진 · 시장 해석</h2>',
      '      <p class="ae-sub">기존 공정확률 계산을 유지한 채, 다중 비그 제거 방식 · 시장 합의 · 오즈 무브 · 스테이킹 제안까지 한 번에 요약합니다.</p>',
      '    </div>',
      '    <div class="ae-pills">',
      '      <span class="ae-pill">'+htmlEscape(cur.market.toUpperCase())+marketLine+'</span>',
             consensusBadge,
      '      <span class="ae-pill">베스트 엣지 '+(best.idx >= 0 ? htmlEscape(labels[best.idx]) : '—')+'</span>',
      '    </div>',
      '  </div>',
      '  <div class="ae-grid cols2">',
      '    <div class="ae-card" style="padding:14px">',
      '      <div class="ae-head"><div><div class="ae-kicker">Fair Odds Matrix</div><h3 class="ae-title" style="font-size:18px">방식별 공정배당 비교</h3></div></div>',
      '      <table class="ae-table"><thead><tr><th>방식</th><th>공정배당</th><th>공정확률</th><th>최저 공정배당</th></tr></thead><tbody>'+methodRows+'</tbody></table>',
      '    </div>',
      '    <div class="ae-card" style="padding:14px">',
      '      <div class="ae-head"><div><div class="ae-kicker">AI Brief</div><h3 class="ae-title" style="font-size:18px">해석 요약</h3></div></div>',
      '      <div class="ae-list">',
      aiLines.map(function(line){ return '<div class="ae-item"><p>'+htmlEscape(line)+'</p></div>'; }).join(''),
      '      </div>',
      '      <div class="ae-kv cols3" style="margin-top:12px">',
      '        <div class="ae-box"><div class="k">오버라운드</div><div class="v">'+fmt(ensemble.overround,4)+'</div><div class="s">시장 수수료 포함 합계</div></div>',
      '        <div class="ae-box"><div class="k">마진</div><div class="v">'+pct(ensemble.margin,2)+'</div><div class="s">마진이 낮을수록 가격 품질이 좋습니다.</div></div>',
      '        <div class="ae-box"><div class="k">가장 유리한 선택</div><div class="v">'+(best.idx >= 0 ? htmlEscape(labels[best.idx]) : '—')+'</div><div class="s">최고배당 기준 추정 엣지 '+pct(best.edge,2)+'</div></div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</section>',
      '<section class="ae-grid cols2">',
      '  <div class="ae-card">',
      '    <div class="ae-head"><div><div class="ae-kicker">Market Pricing</div><h3 class="ae-title" style="font-size:18px">시장 가격·스테이크 제안</h3><p class="ae-sub">컨센서스가 있으면 최고배당 기준, 없으면 현재 입력값 기준으로 계산합니다.</p></div></div>',
      '    <table class="ae-table"><thead><tr><th>선택</th><th>기준 배당</th><th>앙상블 공정배당</th><th>추정 엣지</th><th>Kelly 1/4·1/2·Full</th></tr></thead><tbody>'+edgeTable+'</tbody></table>',
      '  </div>',
      '  <div class="ae-card">',
      '    <div class="ae-head"><div><div class="ae-kicker">Odds Move</div><h3 class="ae-title" style="font-size:18px">오즈 무브 해석</h3><p class="ae-sub">오픈 배당을 넣으면 가격 변화와 암시확률 변화가 같이 표시됩니다.</p></div></div>',
      '    <div class="ae-stack">',
      '      <div class="ae-box"><div class="k">핵심 변화</div><div class="v" style="font-size:18px">'+htmlEscape(moveSummary)+'</div><div class="s">'+htmlEscape(moveDetail)+'</div></div>',
      '      <div class="ae-item"><h4>읽는 법</h4><p>배당이 내려가면 해당 선택의 시장 평가가 강해진 것이고, 배당이 올라가면 시장 확신이 약해진 쪽으로 해석합니다. 라인 유지 + 가격만 이동하면 가격 재조정 성격이 강합니다.</p></div>',
      '      <div class="ae-item"><h4>실전 체크</h4><p>합의도 낮음 + 엣지 미약이면 섣부른 진입보다 보류가 낫습니다. 반대로 합의도 높음 + 플러스 엣지이면 스테이크를 보수적으로 분할하는 편이 안정적입니다.</p></div>',
      '    </div>',
      '  </div>',
      '</section>'
    ].join('');
  }

  function boot(){
    var ids = ['sportSel','marketSel','methodSel','od1','odx','od2','odA','odB','lineOU','odO','odU','lineH','odH1','odH2','openPaste','consPaste'];
    ids.forEach(function(id){ var el = $(id); if(!el || el.__aeBound) return; el.__aeBound = 1; el.addEventListener('input', render); el.addEventListener('change', render); });
    render();
    setTimeout(render, 120);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
