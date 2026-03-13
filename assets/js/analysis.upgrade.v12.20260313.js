(function(){
  'use strict';
  if(!/\/analysis\/?$/.test(location.pathname)) return;

  var MOUNT_ID = 'analysisEngineMount';
  function $(id){ return document.getElementById(id); }
  function fmt(n,d){ return Number.isFinite(n) ? Number(n).toFixed(d==null?2:d) : '—'; }
  function pct(n,d){ return Number.isFinite(n) ? (n*100).toFixed(d==null?2:d)+'%' : '—'; }
  function safeNum(v){ var n = Number(String(v==null?'':v).replace(/,/g,'').trim()); return Number.isFinite(n)?n:NaN; }
  function mean(arr){ var xs = arr.filter(Number.isFinite); return xs.length ? xs.reduce(function(a,b){return a+b;},0)/xs.length : NaN; }
  function sum(arr){ return arr.filter(Number.isFinite).reduce(function(a,b){ return a+b; },0); }
  function sd(arr){ var xs = arr.filter(Number.isFinite); if(!xs.length) return NaN; var m = mean(xs); return Math.sqrt(xs.reduce(function(a,b){ return a + Math.pow(b-m,2); },0)/xs.length); }
  function htmlEscape(s){ return String(s||'').replace(/[&<>"']/g,function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]); }); }
  function parseNums(text){ var m = String(text||'').match(/[+-]?\d+(?:\.\d+)?/g); return (m||[]).map(Number).filter(Number.isFinite); }
  function clamp01(v){ return Math.max(1e-9, Math.min(1-1e-9, v)); }
  function normalizeProb(arr){ var xs = (arr||[]).map(function(v){ return Number.isFinite(v) && v > 0 ? v : 1e-9; }); var s = sum(xs); return s>0 ? xs.map(function(v){ return v/s; }) : xs; }
  function rankDesc(arr){ return arr.map(function(v,i){ return [i,v]; }).sort(function(a,b){ return b[1]-a[1]; }).map(function(pair){ return pair[0]; }); }
  function sigmoid(x){ return 1/(1+Math.exp(-x)); }

  var PHASEE_KEY = '88st.analysis.phasee.v1';
  var BOOK_MEMORY_KEY = '88st.analysis.bookmemory.v1';
  var MARKET_MEMORY_KEY = '88st.analysis.marketmemory.v1';
  var METHOD_MEMORY_KEY = '88st.analysis.methodmemory.v1';
  function loadPhaseEPrefs(){
    try {
      var raw = localStorage.getItem(PHASEE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch(_) { return {}; }
  }
  function savePhaseEPrefs(obj){
    try { localStorage.setItem(PHASEE_KEY, JSON.stringify(obj||{})); } catch(_){}
  }

  function loadJsonStore(key, fallback){
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch(_) { return fallback; }
  }
  function saveJsonStore(key, obj){
    try { localStorage.setItem(key, JSON.stringify(obj||{})); } catch(_){}
  }
  function normalizeBookKey(name){
    return String(name||'').trim().toLowerCase().replace(/\s+/g,' ');
  }
  function loadBookMemory(){
    var box = loadJsonStore(BOOK_MEMORY_KEY, {books:{}});
    if(!box || typeof box !== 'object') box = {books:{}};
    if(!box.books || typeof box.books !== 'object') box.books = {};
    return box;
  }
  function saveBookMemory(box){ saveJsonStore(BOOK_MEMORY_KEY, box || {books:{}}); }
  function getBookMemory(name){
    var key = normalizeBookKey(name);
    var mem = loadBookMemory().books[key];
    return mem && typeof mem === 'object' ? mem : {score:50,count:0,lastWeight:1,lastSeen:0};
  }
  function bookMemoryFactor(name){
    var score = getBookMemory(name).score;
    return Math.max(0.86, Math.min(1.16, 0.86 + (score/100)*0.30));
  }
  function marketBucket(cur, margin){
    var m = Number.isFinite(margin) ? (margin<=0.035?'tight':(margin<=0.075?'mid':'wide')) : 'unknown';
    return [cur && cur.sport || 'soccer', cur && cur.market || '2way', m].join('|');
  }
  function loadMarketMemory(){
    var box = loadJsonStore(MARKET_MEMORY_KEY, {buckets:{}});
    if(!box || typeof box !== 'object') box = {buckets:{}};
    if(!box.buckets || typeof box.buckets !== 'object') box.buckets = {};
    return box;
  }
  function saveMarketMemory(box){ saveJsonStore(MARKET_MEMORY_KEY, box || {buckets:{}}); }
  function loadMethodMemory(){
    var box = loadJsonStore(METHOD_MEMORY_KEY, {buckets:{}});
    if(!box || typeof box !== 'object') box = {buckets:{}};
    if(!box.buckets || typeof box.buckets !== 'object') box.buckets = {};
    return box;
  }
  function saveMethodMemory(box){ saveJsonStore(METHOD_MEMORY_KEY, box || {buckets:{}}); }
  function getMethodMemory(cur, margin){
    var key = marketBucket(cur, margin);
    var box = loadMethodMemory();
    var base = {methods:{norm:{score:50,count:0},power:{score:50,count:0},add:{score:50,count:0},udog:{score:50,count:0},shin:{score:50,count:0},oddsRatio:{score:50,count:0},logit:{score:50,count:0}},count:0,lastUpdated:0};
    var row = box.buckets[key];
    if(!row || typeof row !== 'object') return base;
    if(!row.methods || typeof row.methods !== 'object') row.methods = base.methods;
    Object.keys(base.methods).forEach(function(k){ if(!row.methods[k]) row.methods[k] = {score:50,count:0}; });
    return row;
  }
  function methodMemoryFactors(cur, margin){
    var mem = getMethodMemory(cur, margin);
    var factors = {};
    Object.keys(mem.methods || {}).forEach(function(k){
      var score = Number(mem.methods[k] && mem.methods[k].score);
      if(!Number.isFinite(score)) score = 50;
      factors[k] = Math.max(0.88, Math.min(1.14, 0.88 + (score/100)*0.26));
    });
    mem.factors = factors;
    mem.avgScore = mean(Object.keys(mem.methods||{}).map(function(k){ return Number(mem.methods[k] && mem.methods[k].score) || 50; }));
    return mem;
  }
  function updateMethodMemory(cur, fairSet, consensus, move, uncertainty, coherence, phaseEModel){
    if(!cur || !fairSet || !fairSet.methods) return methodMemoryFactors(cur, fairSet && fairSet.margin);
    var key = marketBucket(cur, fairSet.margin);
    var store = loadMethodMemory();
    var prev = getMethodMemory(cur, fairSet.margin);
    var target = (phaseEModel && phaseEModel.finalProb && phaseEModel.finalProb.length === fairSet.ensemble.length) ? phaseEModel.finalProb.slice() : fairSet.ensemble.slice();
    if(consensus && consensus.weightedProb && consensus.weightedProb.length === target.length){
      target = normalizeProb(target.map(function(v, idx){ return v*0.72 + consensus.weightedProb[idx]*0.28; }));
    }
    var next = {methods:{}, count:(prev.count||0)+1, lastUpdated:Date.now()};
    var methodKeys = Object.keys(fairSet.methods);
    var margin = Number.isFinite(fairSet.margin) ? fairSet.margin : 0.05;
    methodKeys.forEach(function(k){
      var run = fairSet.methods[k];
      if(!run || !run.p) return;
      var old = prev.methods && prev.methods[k] ? prev.methods[k] : {score:50,count:0};
      var divergence = mean(run.p.map(function(v, idx){ return Math.abs(v - target[idx]); }));
      var raw = 90 - divergence*2200 - margin*120 - ((move && move.volatilityScore)||50)*0.05 + ((uncertainty && uncertainty.confidence)||55)*0.08 + ((coherence && coherence.score)||62)*0.04;
      if(k==='shin' || k==='oddsRatio') raw += margin <= 0.05 ? 3 : -1;
      if(k==='power' || k==='add') raw += margin >= 0.06 ? 3 : 0;
      raw = Math.max(12, Math.min(96, raw));
      next.methods[k] = {score:(old.score||50)*0.86 + raw*0.14, count:(old.count||0)+1};
    });
    store.buckets[key] = next;
    saveMethodMemory(store);
    return methodMemoryFactors(cur, fairSet.margin);
  }
  function getMarketMemory(cur, margin){
    var key = marketBucket(cur, margin);
    var box = loadMarketMemory();
    return box.buckets[key] && typeof box.buckets[key] === 'object' ? box.buckets[key] : {coherenceScore:62,count:0};
  }
  function syncPhaseEControlsSport(sport){
    var box = $('aePhaseEBox'); if(!box) return;
    Array.prototype.forEach.call(box.querySelectorAll('[data-phasee-sport]'), function(el){
      var list = String(el.getAttribute('data-phasee-sport')||'').split(',');
      el.style.display = (list.indexOf(sport) >= 0 || list.indexOf('all') >= 0) ? '' : 'none';
    });
  }
  function ensurePhaseEControls(){
    var host = document.querySelector('#proOptions .pro-opts-body') || $('proInput');
    if(!host || $('aePhaseEBox')) return;
    var prefs = loadPhaseEPrefs();
    var box = document.createElement('div');
    box.id = 'aePhaseEBox';
    box.className = 'ae-phasee-shell';
    box.innerHTML = [
      '<div class="ae-phasee-card">',
      '  <div class="ae-phasee-head">',
      '    <div>',
      '      <div class="ae-kicker">Phase E Controls</div>',
      '      <div class="ae-phasee-title">고급 모델 입력 · 종목별 미세 보정</div>',
      '      <p class="ae-phasee-sub">외부 팀·선수 데이터가 없어도 현재 시장 구조에 직접 반영할 수 있는 입력입니다. 값은 브라우저에 저장됩니다.</p>',
      '    </div>',
      '  </div>',
      '  <div class="ae-phasee-grid">',
      '    <label class="ae-phasee-field"><span>Phase E 가중치</span><input data-ae-phasee="phaseETrust" type="range" min="0" max="20" step="1" value="8"><b data-range-out="phaseETrust"></b></label>',
      '    <label class="ae-phasee-field"><span>시장합의 추가 신뢰</span><input data-ae-phasee="consensusLean" type="range" min="-10" max="10" step="1" value="0"><b data-range-out="consensusLean"></b></label>',
      '    <label class="ae-phasee-field"><span>분포모델 추가 신뢰</span><input data-ae-phasee="distLean" type="range" min="-10" max="10" step="1" value="0"><b data-range-out="distLean"></b></label>',
      '  </div>',
      '  <div class="ae-phasee-grid" data-phasee-sport="soccer">',
      '    <label class="ae-phasee-field"><span>축구 Dixon-Coles ρ</span><input data-ae-phasee="soccerRho" type="range" min="-0.20" max="0.20" step="0.01" value="-0.08"><b data-range-out="soccerRho"></b></label>',
      '    <label class="ae-phasee-field"><span>축구 템포 보정</span><input data-ae-phasee="soccerTempo" type="range" min="-0.25" max="0.25" step="0.01" value="0.00"><b data-range-out="soccerTempo"></b></label>',
      '  </div>',
      '  <div class="ae-phasee-grid" data-phasee-sport="basketball">',
      '    <label class="ae-phasee-field"><span>농구 Pace 보정</span><input data-ae-phasee="basketballPace" type="range" min="-12" max="12" step="0.5" value="0"><b data-range-out="basketballPace"></b></label>',
      '    <label class="ae-phasee-field"><span>농구 Margin 보정</span><input data-ae-phasee="basketballMargin" type="range" min="-8" max="8" step="0.5" value="0"><b data-range-out="basketballMargin"></b></label>',
      '  </div>',
      '  <div class="ae-phasee-grid" data-phasee-sport="baseball">',
      '    <label class="ae-phasee-field"><span>야구 선발 차이</span><input data-ae-phasee="baseballStarter" type="range" min="-1.5" max="1.5" step="0.05" value="0"><b data-range-out="baseballStarter"></b></label>',
      '    <label class="ae-phasee-field"><span>야구 불펜 차이</span><input data-ae-phasee="baseballBullpen" type="range" min="-1.0" max="1.0" step="0.05" value="0"><b data-range-out="baseballBullpen"></b></label>',
      '    <label class="ae-phasee-field"><span>구장 팩터</span><input data-ae-phasee="baseballPark" type="range" min="0.80" max="1.20" step="0.01" value="1.00"><b data-range-out="baseballPark"></b></label>',
      '  </div>',
      '  <div class="ae-phasee-grid" data-phasee-sport="tennis,esports">',
      '    <label class="ae-phasee-field"><span>표면/맵 바이어스</span><input data-ae-phasee="tennisSurface" type="range" min="-0.12" max="0.12" step="0.01" value="0"><b data-range-out="tennisSurface"></b></label>',
      '    <label class="ae-phasee-field"><span>홀드/맵 엣지</span><input data-ae-phasee="tennisHold" type="range" min="-0.08" max="0.08" step="0.01" value="0"><b data-range-out="tennisHold"></b></label>',
      '  </div>',
      '</div>'
    ].join('');
    host.appendChild(box);
    Array.prototype.forEach.call(box.querySelectorAll('[data-ae-phasee]'), function(el){
      var key = el.getAttribute('data-ae-phasee');
      if(prefs[key] != null) el.value = prefs[key];
      var out = box.querySelector('[data-range-out="'+key+'"]');
      function update(){
        if(out) out.textContent = el.value;
        var cur = loadPhaseEPrefs(); cur[key] = el.value; savePhaseEPrefs(cur);
      }
      if(!el.__aeBound){ el.__aeBound = 1; el.addEventListener('input', function(){ update(); render(); }); el.addEventListener('change', function(){ update(); render(); }); }
      update();
    });
  }
  function collectPhaseESettings(){
    var box = $('aePhaseEBox');
    var prefs = loadPhaseEPrefs();
    function get(key, fallback){
      var el = box ? box.querySelector('[data-ae-phasee="'+key+'"]') : null;
      var val = el ? el.value : (prefs[key] != null ? prefs[key] : fallback);
      var n = Number(val);
      return Number.isFinite(n) ? n : fallback;
    }
    return {
      phaseETrust: get('phaseETrust', 8),
      consensusLean: get('consensusLean', 0),
      distLean: get('distLean', 0),
      soccerRho: get('soccerRho', -0.08),
      soccerTempo: get('soccerTempo', 0),
      basketballPace: get('basketballPace', 0),
      basketballMargin: get('basketballMargin', 0),
      baseballStarter: get('baseballStarter', 0),
      baseballBullpen: get('baseballBullpen', 0),
      baseballPark: get('baseballPark', 1),
      tennisSurface: get('tennisSurface', 0),
      tennisHold: get('tennisHold', 0)
    };
  }


  function erf(x){
    var sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
    var t = 1/(1+p*x);
    var y = 1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
    return sign*y;
  }
  function normCdf(x){ return 0.5*(1+erf(x/Math.SQRT2)); }
  function normInv(p){
    p = clamp01(p);
    var a=[-39.6968302866538,220.946098424521,-275.928510446969,138.357751867269,-30.6647980661472,2.50662827745924];
    var b=[-54.4760987982241,161.585836858041,-155.698979859887,66.8013118877197,-13.2806815528857];
    var c=[-0.00778489400243029,-0.322396458041136,-2.40075827716184,-2.54973253934373,4.37466414146497,2.93816398269878];
    var d=[0.00778469570904146,0.32246712907004,2.445134137143,3.75440866190742];
    var pl=0.02425, ph=1-pl, q,r;
    if(p<pl){ q=Math.sqrt(-2*Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    if(p>ph){ q=Math.sqrt(-2*Math.log(1-p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    q=p-0.5; r=q*q; return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  function poissonPmf(k, lambda){
    if(!Number.isFinite(lambda) || lambda<=0 || k<0) return 0;
    var v=Math.exp(-lambda), i;
    for(i=1;i<=k;i++) v*=lambda/i;
    return v;
  }
  function solveSetProbFromMatchBo3(matchProb){
    var target=clamp01(matchProb), lo=1e-4, hi=1-1e-4;
    for(var i=0;i<60;i++){
      var mid=(lo+hi)/2;
      var f=mid*mid*(3-2*mid);
      if(f<target) lo=mid; else hi=mid;
    }
    return (lo+hi)/2;
  }

  function labelsForMarket(market){
    if(market==='1x2') return ['홈','무','원정'];
    if(market==='2way') return ['선택 A','선택 B'];
    if(market==='ou') return ['오버','언더'];
    return ['핸디 A','핸디 B'];
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
    var sport = ($('sportSel') && $('sportSel').value) || 'soccer';
    return {sport:sport, market:market, odds:odds, line:line};
  }


  function readSupplementaryMarkets(){
    var defs = [
      {market:'1x2', ids:['od1','odx','od2'], lineId:null},
      {market:'2way', ids:['odA','odB'], lineId:null},
      {market:'ou', ids:['odO','odU'], lineId:'lineOU'},
      {market:'handicap', ids:['odH1','odH2'], lineId:'lineH'}
    ];
    return defs.map(function(def){
      var odds = def.ids.map(function(id){ return safeNum($(id) && $(id).value); });
      var valid = odds.filter(Number.isFinite);
      if((def.market==='1x2' && valid.length!==3) || (def.market!=='1x2' && valid.length!==2)) return null;
      var fair = fairShin(valid) || fairNorm(valid);
      if(!fair) return null;
      return {market:def.market, odds:valid, line:def.lineId ? safeNum($(def.lineId) && $(def.lineId).value) : NaN, prob:fair.p, margin:fair.margin};
    }).filter(Boolean);
  }

  function expectedSoccerDrawFromTotal(line){
    if(!Number.isFinite(line)) return 0.26;
    if(line <= 2.0) return 0.31;
    if(line <= 2.25) return 0.29;
    if(line <= 2.5) return 0.27;
    if(line <= 2.75) return 0.25;
    if(line <= 3.0) return 0.23;
    return 0.21;
  }

  function computeCrossMarketCoherence(cur){
    var markets = readSupplementaryMarkets();
    var by = {};
    markets.forEach(function(m){ by[m.market] = m; });
    var score = 68;
    var issues = [];
    var notes = [];
    var checks = 0;
    function applyPenalty(points, issue, note){
      score -= points; if(issue) issues.push(issue); if(note) notes.push(note); checks++;
    }
    function applyReward(points, note){
      score += points; if(note) notes.push(note); checks++;
    }
    if(by['1x2'] && (by['handicap'] || by['2way'])){
      var side = by['handicap'] || by['2way'];
      var fav1 = by['1x2'].prob[0] >= by['1x2'].prob[2] ? 0 : 1;
      var fav2 = side.prob[0] >= side.prob[1] ? 0 : 1;
      var gap1 = Math.abs((by['1x2'].prob[0]||0) - (by['1x2'].prob[2]||0));
      var gap2 = Math.abs((side.prob[0]||0) - (side.prob[1]||0));
      if(fav1 !== fav2 && gap1 >= 0.05 && gap2 >= 0.05) applyPenalty(18, '사이드 시장 불일치', '1X2와 핸디/2way의 강세 방향이 서로 다릅니다.');
      else applyReward(8, '사이드 시장 정렬 양호');
    }
    if(cur.sport === 'soccer' && by['1x2'] && by['ou'] && Number.isFinite(by['ou'].line)){
      var drawProb = by['1x2'].prob[1] || 0.26;
      var underProb = by['ou'].prob[1] || 0.50;
      var expectedDraw = expectedSoccerDrawFromTotal(by['ou'].line) + Math.max(0, underProb - 0.5) * 0.12;
      var gap = Math.abs(drawProb - expectedDraw);
      if(gap > 0.085) applyPenalty(Math.min(18, gap*150), '축구 득점-무승부 정합성 낮음', '무승부 확률과 총점 시장의 저득점 신호가 잘 맞지 않습니다.');
      else applyReward(7, '축구 총점·무승부 정합성 양호');
    }
    if(by['ou'] && Number.isFinite(by['ou'].line)){
      var overProb = by['ou'].prob[0] || 0.5;
      if(by['ou'].line <= 2.25 && overProb >= 0.62) applyPenalty(10, '낮은 기준점 대비 오버 과열', '낮은 기준점인데 오버 확률이 과도하게 높습니다.');
      else if(by['ou'].line >= 3.25 && overProb <= 0.42) applyPenalty(8, '높은 기준점 대비 언더 과열', '높은 기준점인데 언더 신호가 과도합니다.');
      else applyReward(4, '총점 시장 구조 안정');
    }
    if(by['1x2'] && by['1x2'].prob.length===3){
      var sumSide = (by['1x2'].prob[0]||0) + (by['1x2'].prob[2]||0);
      if(sumSide < 0.68) applyPenalty(8, '무승부 비중 과대', '1X2에서 무승부 비중이 높아 방향성 시장 해석이 까다롭습니다.');
    }
    score = Math.max(22, Math.min(96, score));
    var label = score >= 78 ? '정합 우수' : (score >= 62 ? '대체로 양호' : (score >= 48 ? '주의 필요' : '불일치 큼'));
    if(markets.length < 2){
      return {score:62,label:'비교 시장 부족',issues:['추가 시장 입력 없음'],notes:['1X2 / 핸디 / O/U를 함께 입력하면 정합성 점수가 더 정교해집니다.'],availableCount:markets.length,checks:0,markets:markets};
    }
    return {score:score,label:label,issues:issues,notes:notes,availableCount:markets.length,checks:checks,markets:markets};
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

  function fairEnsembleSet(odds){
    var base = fairNorm(odds); if(!base) return null;
    var methods = {
      norm: base,
      power: fairPower(odds) || base,
      add: fairAdd(odds) || base,
      udog: fairUdog(odds) || base,
      shin: fairShin(odds) || base,
      oddsRatio: fairOddsRatio(odds) || base,
      logit: fairLogit(odds) || base
    };
    var len = base.p.length;
    function blend(weights){
      var p = new Array(len).fill(0);
      Object.keys(weights).forEach(function(key){
        var run = methods[key];
        if(!run || !run.p) return;
        for(var i=0;i<len;i++) p[i] += run.p[i] * weights[key];
      });
      return normalizeProb(p);
    }
    var margin = base.margin;
    var marketClass = len===2 ? '2way' : '3way';
    var profile;
    if(margin <= 0.035 && marketClass==='2way'){
      profile = { name:'lowMargin2way', conservative:{shin:.34,oddsRatio:.24,power:.18,norm:.14,logit:.10}, neutral:{shin:.30,oddsRatio:.25,power:.20,norm:.15,logit:.10}, aggressive:{shin:.20,oddsRatio:.18,power:.24,norm:.20,add:.10,udog:.08} };
    } else if(margin <= 0.08) {
      profile = { name:'mediumMargin', conservative:{oddsRatio:.28,power:.22,shin:.20,norm:.15,add:.10,logit:.05}, neutral:{oddsRatio:.25,power:.25,shin:.20,norm:.15,add:.10,logit:.05}, aggressive:{power:.28,oddsRatio:.20,udog:.18,norm:.14,add:.12,shin:.08} };
    } else {
      profile = { name:'highMargin', conservative:{power:.28,add:.18,norm:.18,shin:.14,oddsRatio:.12,logit:.10}, neutral:{power:.25,add:.20,norm:.20,shin:.15,oddsRatio:.10,logit:.10}, aggressive:{udog:.20,power:.24,add:.18,norm:.14,shin:.12,oddsRatio:.06,logit:.06} };
    }
    var conservative = blend(profile.conservative);
    var neutral = blend(profile.neutral);
    var aggressive = blend(profile.aggressive);
    return {
      profile: profile.name,
      methods: methods,
      conservative: conservative,
      neutral: neutral,
      aggressive: aggressive,
      ensemble: neutral,
      overround: base.overround,
      margin: base.margin,
      odds: base.odds,
      fairOdds: neutral.map(function(v){ return 1/v; }),
      profileWeights: {conservative:profile.conservative, neutral:profile.neutral, aggressive:profile.aggressive}
    };
  }

  function refineEnsembleByContext(cur, fairSet, consensus, move, uncertainty, coherence, methodMemory){
    if(!fairSet || !fairSet.methods || !fairSet.profileWeights) return fairSet;
    var weights = Object.assign({}, fairSet.profileWeights.neutral || {});
    var disagreement = consensus && Number.isFinite(consensus.sdMean) ? consensus.sdMean : 0.018;
    var vol = move && Number.isFinite(move.volatilityScore) ? move.volatilityScore : 50;
    var conf = uncertainty && Number.isFinite(uncertainty.confidence) ? uncertainty.confidence : 58;
    var coh = coherence && Number.isFinite(coherence.score) ? coherence.score : 62;
    if(cur.market === '1x2') { weights.oddsRatio = (weights.oddsRatio||0)+0.02; weights.shin=(weights.shin||0)+0.01; }
    if(cur.market === '2way' || cur.market === 'handicap'){ weights.shin=(weights.shin||0)+0.03; weights.power=(weights.power||0)+0.01; }
    if(consensus && disagreement <= 0.012){ weights.shin=(weights.shin||0)+0.03; weights.oddsRatio=(weights.oddsRatio||0)+0.02; weights.add=Math.max(0,(weights.add||0)-0.02); }
    if(disagreement >= 0.022 || vol >= 66){ weights.power=(weights.power||0)+0.03; weights.add=(weights.add||0)+0.02; weights.shin=Math.max(0,(weights.shin||0)-0.03); }
    if(conf <= 54 || coh < 54){ weights.norm=(weights.norm||0)+0.03; weights.add=(weights.add||0)+0.02; weights.udog=(weights.udog||0)+0.01; }
    if(coh >= 78 && conf >= 66){ weights.oddsRatio=(weights.oddsRatio||0)+0.02; weights.shin=(weights.shin||0)+0.02; }
    if(methodMemory && methodMemory.factors){ Object.keys(methodMemory.factors).forEach(function(k){ if(weights[k]!=null) weights[k] *= methodMemory.factors[k]; }); }
    var total = sum(Object.keys(weights).map(function(k){ return Math.max(0, weights[k]||0); }));
    if(!(total>0)) return fairSet;
    Object.keys(weights).forEach(function(k){ weights[k] = Math.max(0, weights[k]||0)/total; });
    var len = fairSet.ensemble.length;
    var tuned = new Array(len).fill(0);
    Object.keys(weights).forEach(function(key){
      var run = fairSet.methods[key];
      if(!run || !run.p) return;
      for(var i=0;i<len;i++) tuned[i] += run.p[i] * weights[key];
    });
    tuned = normalizeProb(tuned);
    fairSet.dynamicWeights = weights;
    fairSet.ensemble = tuned;
    fairSet.fairOdds = tuned.map(function(v){ return 1/v; });
    fairSet.dynamicLabel = disagreement <= 0.012 ? '시장 정렬형' : (vol >= 66 ? '변동성 방어형' : (coh < 54 ? '정합성 방어형' : '균형형'));
    if(methodMemory && Number.isFinite(methodMemory.avgScore) && methodMemory.avgScore >= 60) fairSet.dynamicLabel += ' · 적응 메모리';
    return fairSet;
  }

  function parseBookName(line, idx){
    var m = String(line||'').match(/^\s*([^:|\-–—]+?)\s*[:|\-–—]/);
    if(m && m[1]) return m[1].trim();
    var token = String(line||'').trim().split(/\s+/)[0] || ('book'+(idx+1));
    if(/^[0-9.]+$/.test(token)) return 'book'+(idx+1);
    return token;
  }

  function classifyBook(name){
    var n = String(name||'').toLowerCase();
    var sharp = /(pinnacle|pinny|circa|cris|betfair|sbob|matchbook|sing|ibc|isn|orbit)/.test(n);
    var leader = /(pinnacle|bet365|sbob|circa|betfair)/.test(n);
    var soft = /(1xbet|melbet|unibet|william|ladbrokes|bwin|dafabet|betway)/.test(n);
    var stale = /(copy|manual|etc|other)/.test(n);
    return {
      sharpTier: sharp ? 'sharp' : (soft ? 'soft' : 'standard'),
      marketLeader: leader,
      staleFeedRisk: stale ? 'high' : 'low'
    };
  }

  function computeBookWeight(meta, margin, rowProb, consensusHint){
    var sharpWeight = meta.sharpTier==='sharp' ? 1.25 : (meta.sharpTier==='soft' ? 0.88 : 1.0);
    var leaderWeight = meta.marketLeader ? 1.10 : 1.0;
    var freshnessWeight = meta.staleFeedRisk==='high' ? 0.80 : (meta.staleFeedRisk==='medium' ? 0.92 : 1.0);
    var lowMarginWeight = Number.isFinite(margin) ? Math.max(0.78, Math.min(1.18, 1.05 - margin*2.2)) : 1.0;
    var integrityWeight = 1.0;
    if(consensusHint && rowProb && rowProb.length===consensusHint.length){
      var divergence = mean(rowProb.map(function(v,idx){ return Math.abs(v-consensusHint[idx]); }));
      if(Number.isFinite(divergence)) integrityWeight = Math.max(0.72, 1 - divergence*2.8);
    }
    return sharpWeight * leaderWeight * freshnessWeight * lowMarginWeight * integrityWeight;
  }

  function parseConsensus(){
    var raw = ($('consPaste') && $('consPaste').value) || '';
    var lines = String(raw).split(/\r?\n/).map(function(s){ return s.trim(); }).filter(Boolean);
    if(!lines.length) return null;
    var forced = ($('marketSel') && $('marketSel').value) || 'auto';
    var rows = [];
    lines.forEach(function(line, idx){
      var payload = detectMarketFromText(line, forced);
      if(!payload.odds || payload.odds.length < 2) return;
      if(rows.length && payload.market !== rows[0].market) return;
      if(rows.length && payload.odds.length !== rows[0].odds.length) return;
      if((payload.market === 'ou' || payload.market === 'handicap') && rows.length){
        var baseLine = rows[0].line;
        if(Number.isFinite(baseLine) && Number.isFinite(payload.line) && Math.abs(baseLine - payload.line) > 0.001) return;
      }
      payload.book = parseBookName(line, idx);
      payload.meta = classifyBook(payload.book);
      rows.push(payload);
    });
    if(rows.length < 2) return null;

    var normRows = rows.map(function(r){
      var fair = fairShin(r.odds) || fairNorm(r.odds);
      if(!fair) return null;
      return {
        book:r.book,
        market:r.market,
        line:r.line,
        odds:r.odds,
        meta:r.meta,
        fair:fair,
        prob:fair.p,
        margin:fair.margin,
        memoryScore:getBookMemory(r.book).score,
        memoryFactor:bookMemoryFactor(r.book)
      };
    }).filter(Boolean);
    if(!normRows.length) return null;

    var avgProb = normalizeProb(normRows[0].prob.map(function(_,idx){ return mean(normRows.map(function(r){ return r.prob[idx]; })); }));
    normRows.forEach(function(r){ r.weight = computeBookWeight(r.meta, r.margin, r.prob, avgProb) * (r.memoryFactor || 1); });

    var weightedProb = avgProb.map(function(_,idx){
      var numerator = sum(normRows.map(function(r){ return r.weight * r.prob[idx]; }));
      var denominator = sum(normRows.map(function(r){ return r.weight; }));
      return denominator>0 ? numerator/denominator : avgProb[idx];
    });
    weightedProb = normalizeProb(weightedProb);

    var bestOdds = normRows[0].odds.map(function(_,idx){ return Math.max.apply(null, normRows.map(function(r){ return r.odds[idx]; }).filter(Number.isFinite)); });
    var avgMargin = mean(normRows.map(function(r){ return r.margin; }));
    var disagreement = mean(weightedProb.map(function(_,idx){ return sd(normRows.map(function(r){ return r.prob[idx]; })); }));
    var weightedBooks = normRows.slice().sort(function(a,b){ return b.weight-a.weight; });

    return {
      market:normRows[0].market,
      line:normRows[0].line,
      rows:normRows,
      bestOdds:bestOdds,
      avgProb:avgProb,
      weightedProb:weightedProb,
      fairOdds:weightedProb.map(function(v){ return 1/v; }),
      avgMargin:avgMargin,
      sdMean:disagreement,
      marketDisagreementScore: Math.max(0, Math.min(100, (disagreement||0) * 1800)),
      topBooks: weightedBooks.slice(0,3),
      memoryAvgScore: mean(normRows.map(function(r){ return r.memoryScore || 50; })),
      memoryTopBooks: normRows.slice().sort(function(a,b){ return (b.memoryScore||50) - (a.memoryScore||50); }).slice(0,3)
    };
  }

  function updateBookMemory(consensus, targetProb){
    if(!consensus || !consensus.rows || !consensus.rows.length || !targetProb || !targetProb.length) return null;
    var store = loadBookMemory();
    consensus.rows.forEach(function(row){
      var key = normalizeBookKey(row.book);
      var prev = store.books[key] && typeof store.books[key] === 'object' ? store.books[key] : {score:50,count:0,lastWeight:1,lastSeen:0};
      var divergence = mean(row.prob.map(function(v,idx){ return Math.abs(v - targetProb[idx]); }));
      var rawScore = Math.max(8, Math.min(98, 92 - divergence*1800 - (row.margin||0)*180 + ((row.meta && row.meta.sharpTier==='sharp') ? 4 : 0)));
      var nextCount = (prev.count||0) + 1;
      var nextScore = (prev.score||50) * 0.82 + rawScore * 0.18;
      store.books[key] = {score:nextScore, count:nextCount, lastWeight:row.weight||1, lastSeen:Date.now()};
      row.memoryScore = nextScore;
      row.memoryFactor = Math.max(0.86, Math.min(1.16, 0.86 + (nextScore/100)*0.30));
    });
    saveBookMemory(store);
    return {
      avgScore: mean(consensus.rows.map(function(r){ return r.memoryScore || 50; })),
      topBooks: consensus.rows.slice().sort(function(a,b){ return (b.memoryScore||50) - (a.memoryScore||50); }).slice(0,3)
    };
  }

  function updateMarketMemory(cur, fairSet, coherence){
    if(!cur || !fairSet || !coherence) return;
    var key = marketBucket(cur, fairSet.margin);
    var store = loadMarketMemory();
    var prev = store.buckets[key] && typeof store.buckets[key] === 'object' ? store.buckets[key] : {coherenceScore:62,count:0};
    var next = {coherenceScore:(prev.coherenceScore||62)*0.84 + (coherence.score||62)*0.16, count:(prev.count||0)+1};
    store.buckets[key] = next;
    saveMarketMemory(store);
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


  function applyTemperature(probArr, temp){
    var t = Number.isFinite(temp) ? Math.max(0.82, Math.min(1.35, temp)) : 1;
    var xs = normalizeProb(probArr || []);
    var scaled = xs.map(function(p){ return Math.pow(clamp01(p), 1/t); });
    return normalizeProb(scaled);
  }

  function detectMarketRegime(cur, fairSet, consensus, move, uncertainty){
    var margin = fairSet && Number.isFinite(fairSet.margin) ? fairSet.margin : 0;
    var disagreement = consensus && Number.isFinite(consensus.sdMean) ? consensus.sdMean : 0.02;
    var vol = move && Number.isFinite(move.volatilityScore) ? move.volatilityScore : 50;
    var reverse = move && Number.isFinite(move.reverseScore) ? move.reverseScore : 40;
    var confidence = uncertainty && Number.isFinite(uncertainty.confidence) ? uncertainty.confidence : 55;
    var kind = 'balanced';
    if(consensus && margin <= 0.04 && disagreement <= 0.012 && vol <= 42 && confidence >= 72) kind = 'efficient';
    else if(margin >= 0.08 || disagreement >= 0.022) kind = 'soft';
    else if(vol >= 68 || reverse >= 60 || confidence <= 48) kind = 'volatile';
    var labelMap = {
      efficient:'효율 시장',
      balanced:'균형 시장',
      soft:'소프트·고마진 시장',
      volatile:'변동성 확대 시장'
    };
    var noteMap = {
      efficient:'샤프북 정렬과 저마진 특성이 강해 컨센서스 반영 비중을 높이는 구간입니다.',
      balanced:'모델과 시장을 함께 참고할 수 있는 중립 구간입니다.',
      soft:'북 편차와 마진이 높아 보수적 해석과 엣지 감산이 필요한 구간입니다.',
      volatile:'급격한 가격 변화 또는 역행 위험이 있어 스테이크를 더 줄여야 하는 구간입니다.'
    };
    return {
      kind: kind,
      label: labelMap[kind],
      note: noteMap[kind],
      efficiencyScore: Math.max(0, Math.min(100, 82 - margin*360 - disagreement*2100 - vol*0.32 + confidence*0.35)),
      cautionScore: Math.max(0, Math.min(100, reverse*0.45 + vol*0.40 + (100-confidence)*0.35 + margin*120))
    };
  }

  function calibrateProbabilities(cur, fairSet, consensus, move, uncertainty, regime){
    var base = fairSet.ensemble.slice();
    var blendWeight = consensus ? (0.12 + (uncertainty.confidence/260) + (regime.kind==='efficient' ? 0.12 : 0) - (regime.kind==='volatile' ? 0.04 : 0)) : 0;
    blendWeight = Math.max(0, Math.min(0.40, blendWeight));
    var temp = 1 + Math.max(0, (100 - uncertainty.confidence))/220 + (move.volatilityScore||0)/420 + (fairSet.margin||0)*1.4;
    if(regime.kind === 'efficient') temp -= 0.06;
    if(regime.kind === 'soft') temp += 0.03;
    if(regime.kind === 'volatile') temp += 0.08;
    var calibrated = applyTemperature(base, temp);
    if(consensus && consensus.weightedProb && consensus.weightedProb.length === calibrated.length){
      calibrated = normalizeProb(calibrated.map(function(p, idx){
        return p*(1-blendWeight) + consensus.weightedProb[idx]*blendWeight;
      }));
    }
    if(calibrated.length >= 2){
      var order = rankDesc(calibrated);
      var fav = order[0], dog = order[order.length-1];
      var tweak = Math.max(0, Math.min(0.015, (fairSet.margin||0)*0.08 + ((100-uncertainty.confidence)/1000)));
      if(tweak > 0){
        calibrated[fav] += tweak;
        calibrated[dog] = Math.max(1e-6, calibrated[dog] - tweak);
        calibrated = normalizeProb(calibrated);
      }
    }
    var calibrationShift = mean(calibrated.map(function(p, idx){ return Math.abs(p - base[idx]); }));
    var topIdx = rankDesc(calibrated)[0] || 0;
    return {
      baseProb: base,
      calibratedProb: calibrated,
      fairOdds: calibrated.map(function(v){ return 1/v; }),
      blendWeight: blendWeight,
      temp: Math.max(0.82, Math.min(1.35, temp)),
      calibrationShift: calibrationShift,
      topProb: calibrated[topIdx],
      topIdx: topIdx
    };
  }

  function computeMetaDecision(bestRow, uncertainty, move, consensus, regime, calibration, coherence, bookMemory, methodMemory, agreement, timingData, robustness, dominance){
    if(!bestRow){
      return {action:'pass', actionLabel:'PASS', tier:'D', summaryTag:'No pick', noBet:true, reasons:['분석 대상 부족']};
    }
    var score = bestRow.edgeScore;
    var confidence = uncertainty.confidence;
    var clv = Number.isFinite(bestRow.clvBp) ? bestRow.clvBp : 0;
    var reverse = move.reverseScore||0;
    var vol = move.volatilityScore||0;
    var reasons = [];
    if(bestRow.modelEdge > 0.03) reasons.push('모델 엣지 우세');
    if(bestRow.marketGap > 0.02) reasons.push('시장 갭 우세');
    if(clv >= 25) reasons.push('CLV 기대 양호');
    if(consensus && consensus.marketDisagreementScore <= 24) reasons.push('시장 합의 안정');
    if(regime.kind === 'efficient') reasons.push('효율 시장 정렬');
    if(regime.kind === 'volatile') reasons.push('변동성 구간');
    if(reverse >= 55) reasons.push('리버스 경계');
    if(vol >= 65) reasons.push('변동성 감산');
    if(coherence && coherence.availableCount >= 2){
      if(coherence.score >= 76) reasons.push('크로스마켓 정합 우수');
      else if(coherence.score < 54) reasons.push('크로스마켓 불일치');
    }
    if(bookMemory && Number.isFinite(bookMemory.avgScore)){
      if(bookMemory.avgScore >= 64) reasons.push('북 신뢰도 메모리 양호');
      else if(bookMemory.avgScore < 46) reasons.push('북 신뢰도 낮음');
    }
    if(methodMemory && Number.isFinite(methodMemory.avgScore)){
      if(methodMemory.avgScore >= 62) reasons.push('방법 메모리 양호');
      else if(methodMemory.avgScore < 46) reasons.push('방법 메모리 약함');
    }
    if(agreement && Number.isFinite(agreement.overallScore)){
      if(agreement.overallScore >= 72) reasons.push('모델 합의 우수');
      else if(agreement.overallScore < 56) reasons.push('모델 합의 낮음');
    }
    if(robustness && Number.isFinite(robustness.score)){
      if(robustness.score >= 74) reasons.push('내구도 우수');
      else if(robustness.score < 52) reasons.push('내구도 약함');
    }
    if(dominance && Number.isFinite(dominance.score)){
      if(dominance.score >= 70) reasons.push('탑픽 우위 명확');
      else if(dominance.score < 52) reasons.push('탑픽 경쟁 치열');
    }
    if(uncertainty.flags.length) reasons.push(uncertainty.flags[0]);
    var noBet = false;
    if(score < 50 || confidence < 44 || reverse >= 78 || vol >= 84) noBet = true;
    if(timingData && timingData.label === 'pass') noBet = true;
    if(robustness && robustness.score < 44) noBet = true;
    if(dominance && dominance.score < 42 && confidence < 64) noBet = true;
    if(coherence && coherence.availableCount >= 2 && coherence.score < 48) noBet = true;
    if(bookMemory && Number.isFinite(bookMemory.avgScore) && bookMemory.avgScore < 42 && confidence < 58) noBet = true;
    if(methodMemory && Number.isFinite(methodMemory.avgScore) && methodMemory.avgScore < 42 && confidence < 60) noBet = true;
    if(agreement && Number.isFinite(agreement.overallScore) && agreement.overallScore < 50 && confidence < 62) noBet = true;
    var action = 'lean';
    if(noBet) action = 'pass';
    else if(score >= 76 && confidence >= 60 && reverse < 58 && (!timingData || timingData.score >= 58) && (!robustness || robustness.score >= 58)) action = 'bet';
    var tier = 'C';
    if(action === 'pass') tier = score >= 45 ? 'C' : 'D';
    else if(score >= 82 && confidence >= 70 && clv >= 20) tier = 'A';
    else if(score >= 68 && confidence >= 58 && (!robustness || robustness.score >= 54)) tier = 'B';
    var labelMap = {bet:'BET', lean:'LEAN', pass:'PASS'};
    var tag = action === 'bet' ? 'Actionable edge' : (action === 'lean' ? 'Watch / selective entry' : 'No-bet filter');
    return {
      action: action,
      actionLabel: labelMap[action],
      tier: tier,
      summaryTag: tag,
      noBet: noBet,
      reasons: reasons.slice(0, 4),
      calibratedTopProb: calibration.topProb,
      regimeLabel: regime.label,
      timingLabel: timingData ? timingData.actionLabel : '—'
    };
  }


  function blendProbArrays(a, b, weight){
    var w = Number.isFinite(weight) ? Math.max(0, Math.min(0.45, weight)) : 0;
    if(!Array.isArray(a) || !a.length) return Array.isArray(b) ? normalizeProb(b) : [];
    if(!Array.isArray(b) || b.length !== a.length) return normalizeProb(a);
    return normalizeProb(a.map(function(v, idx){ return v*(1-w) + b[idx]*w; }));
  }

  function flattenProbabilities(arr, flattenWeight){
    var xs = normalizeProb(arr || []);
    var meanProb = xs.length ? 1/xs.length : 0;
    var w = Number.isFinite(flattenWeight) ? Math.max(0, Math.min(0.30, flattenWeight)) : 0;
    return normalizeProb(xs.map(function(v){ return v*(1-w) + meanProb*w; }));
  }

  function shiftBetweenSelections(base, fromIdx, toIdx, amount){
    var xs = normalizeProb(base || []);
    if(fromIdx < 0 || toIdx < 0 || fromIdx >= xs.length || toIdx >= xs.length || fromIdx === toIdx) return xs;
    var move = Math.max(0, Math.min(xs[fromIdx]-1e-6, amount || 0));
    xs[fromIdx] -= move;
    xs[toIdx] += move;
    return normalizeProb(xs);
  }

  function computeSoccerModel(cur, baseProb, consensus, move, uncertainty){
    var adjusted = baseProb.slice();
    var notes = [];
    var weight = cur.market === '1x2' ? 0.16 : 0.12;
    if(cur.market === '1x2' && adjusted.length === 3){
      var parity = 1 - Math.min(1, Math.abs(adjusted[0] - adjusted[2]) / 0.30);
      var drawBoost = Math.max(0, Math.min(0.028, 0.010 + parity * 0.020 - Math.max(0, adjusted[1] - 0.28) * 0.5));
      if(drawBoost > 0.001){
        adjusted = normalizeProb([Math.max(1e-6, adjusted[0] - drawBoost/2), adjusted[1] + drawBoost, Math.max(1e-6, adjusted[2] - drawBoost/2)]);
        notes.push('1X2 근접 구간에서 무승부 확률을 소폭 상향 조정했습니다.');
      }
    } else if(cur.market === 'ou' && adjusted.length === 2){
      if(Number.isFinite(cur.line) && cur.line <= 2.25){
        adjusted = shiftBetweenSelections(adjusted, 0, 1, 0.014);
        notes.push('낮은 기준점 O/U는 언더 쪽으로 약한 보정을 적용했습니다.');
      } else if(Number.isFinite(cur.line) && cur.line >= 3.25){
        adjusted = shiftBetweenSelections(adjusted, 1, 0, 0.012);
        notes.push('높은 기준점 O/U는 오버 회귀를 일부 반영했습니다.');
      }
    } else if(cur.market === 'handicap' && adjusted.length === 2 && Number.isFinite(cur.line)){
      var fav = rankDesc(adjusted)[0] || 0;
      var dog = fav === 0 ? 1 : 0;
      if(Math.abs(cur.line) >= 1.25){
        adjusted = shiftBetweenSelections(adjusted, fav, dog, 0.010);
        notes.push('큰 핸디캡 구간은 이변 확률을 위해 즐겨찾기 확률을 소폭 눌렀습니다.');
      }
    }
    var confidence = cur.market === '1x2' ? 78 : 68;
    return {
      modelName: 'Soccer Draw / Tempo Heuristic',
      shortLabel: 'Soccer Microstructure',
      adjustedProb: adjusted,
      confidence: confidence,
      blendWeight: weight,
      notes: notes,
      featureBadges: [cur.market === '1x2' ? 'Draw-aware' : 'Line-aware', 'Low-data safe'],
      caveat: '팀 xG·라인업 데이터 없이 시장 구조만 이용한 축구 전용 보정입니다.'
    };
  }

  function computeBasketballModel(cur, baseProb, consensus, move, uncertainty){
    var adjusted = baseProb.slice();
    var notes = [];
    var weight = 0.14;
    if((cur.market === '2way' || cur.market === 'handicap') && adjusted.length === 2){
      var fav = rankDesc(adjusted)[0] || 0;
      var dog = fav === 0 ? 1 : 0;
      var shift = (move && move.volatilityScore >= 55) ? 0.016 : 0.010;
      adjusted = shiftBetweenSelections(adjusted, fav, dog, shift);
      notes.push('농구는 경기 후반 변동성과 파울 게임 변수를 감안해 강한 즐겨찾기 쏠림을 다소 완화했습니다.');
    } else if(cur.market === 'ou' && adjusted.length === 2 && Number.isFinite(cur.line)){
      if(cur.line >= 224.5){
        adjusted = shiftBetweenSelections(adjusted, 0, 1, 0.014);
        notes.push('높은 기준점 총점은 언더 회귀를 소폭 반영했습니다.');
      } else if(cur.line <= 210.5){
        adjusted = shiftBetweenSelections(adjusted, 1, 0, 0.012);
        notes.push('낮은 기준점 총점은 오버 반등 여지를 일부 반영했습니다.');
      }
    }
    return {
      modelName: 'Basketball Spread / Total Heuristic',
      shortLabel: 'Basketball Pace Layer',
      adjustedProb: adjusted,
      confidence: 72,
      blendWeight: weight,
      notes: notes,
      featureBadges: ['Spread-aware', 'Volatility trim'],
      caveat: '팀 레이팅·페이스 데이터 없이 시장 라인과 변동성만 이용한 농구 전용 보정입니다.'
    };
  }

  function computeBaseballModel(cur, baseProb, consensus, move, uncertainty){
    var adjusted = baseProb.slice();
    var notes = [];
    var weight = 0.13;
    if((cur.market === '2way' || cur.market === 'handicap') && adjusted.length === 2){
      var fav = rankDesc(adjusted)[0] || 0;
      var dog = fav === 0 ? 1 : 0;
      adjusted = shiftBetweenSelections(adjusted, fav, dog, 0.012);
      notes.push('야구는 단일 경기 분산이 큰 편이라 머니라인 즐겨찾기 확률을 일부 눌렀습니다.');
    } else if(cur.market === 'ou' && adjusted.length === 2 && Number.isFinite(cur.line)){
      if(cur.line <= 7.5){
        adjusted = shiftBetweenSelections(adjusted, 0, 1, 0.010);
        notes.push('낮은 총점 구간은 언더 효율을 약하게 가중했습니다.');
      }
    }
    return {
      modelName: 'Baseball Variance Heuristic',
      shortLabel: 'Baseball Variance',
      adjustedProb: adjusted,
      confidence: 69,
      blendWeight: weight,
      notes: notes,
      featureBadges: ['Dog live', 'Run variance'],
      caveat: '선발·불펜·구장 데이터 없이 시장 미세구조만 반영한 야구 보정입니다.'
    };
  }

  function computeTennisModel(cur, baseProb, consensus, move, uncertainty){
    var adjusted = baseProb.slice();
    var notes = [];
    var weight = 0.15;
    if(adjusted.length === 2){
      var fav = rankDesc(adjusted)[0] || 0;
      var dog = fav === 0 ? 1 : 0;
      if(adjusted[fav] >= 0.60){
        adjusted = shiftBetweenSelections(adjusted, dog, fav, 0.010);
        notes.push('테니스는 강한 서브/표면 우위가 시장에 반영되는 경우가 많아 확률을 소폭 재강조했습니다.');
      } else {
        adjusted = flattenProbabilities(adjusted, 0.04);
        notes.push('테니스 근접 매치는 세트 변동성을 감안해 과도한 확신을 완화했습니다.');
      }
    }
    return {
      modelName: 'Tennis Surface / Hold Heuristic',
      shortLabel: 'Tennis Micro Edge',
      adjustedProb: adjusted,
      confidence: 74,
      blendWeight: weight,
      notes: notes,
      featureBadges: ['Favourite hold', 'Set variance'],
      caveat: '선수 Elo·서브홀드 데이터 없이 시장 구조 기반으로만 조정한 테니스 레이어입니다.'
    };
  }

  function computeEsportsModel(cur, baseProb, consensus, move, uncertainty){
    var adjusted = flattenProbabilities(baseProb, 0.10 + ((move && move.volatilityScore || 0) > 60 ? 0.05 : 0));
    return {
      modelName: 'Esports Volatility Compression',
      shortLabel: 'Esports Variance',
      adjustedProb: adjusted,
      confidence: 62,
      blendWeight: 0.11,
      notes: ['e스포츠는 맵/패치/라인업 민감도가 높아 확률 분포를 보수적으로 압축했습니다.'],
      featureBadges: ['Variance high', 'Confidence trim'],
      caveat: '패치/라인업 데이터가 없을 때 과도한 확신을 줄이기 위한 방어 레이어입니다.'
    };
  }


  function estimateSoccerTotals(cur, prob){
    var line = Number.isFinite(cur.line) ? cur.line : NaN;
    if(Number.isFinite(line) && cur.market==='ou') return Math.max(1.6, Math.min(4.4, line + 0.18));
    var draw = prob.length===3 ? prob[1] : 0.26;
    var fav = Math.max.apply(null, prob);
    return Math.max(1.8, Math.min(4.2, 3.05 - (draw-0.25)*4.2 + (fav-0.50)*0.9));
  }

  function computeSoccerParametricModel(cur, prob){
    var p = normalizeProb(prob||[]);
    var total = estimateSoccerTotals(cur, p);
    var home = p[0] || 0.5, draw = p.length===3 ? p[1] : 0.24, away = p.length===3 ? p[2] : (1-home);
    var diff = Math.max(-1.6, Math.min(1.6, (home-away)*2.15));
    var lambdaHome = Math.max(0.25, (total+diff)/2);
    var lambdaAway = Math.max(0.20, (total-diff)/2);
    var maxGoals = 7, m=[], probs=[0,0,0], btts=0, overProb=NaN, scoreRows=[];
    for(var h=0; h<=maxGoals; h++){
      for(var a=0; a<=maxGoals; a++){
        var ph=poissonPmf(h, lambdaHome), pa=poissonPmf(a, lambdaAway), cell=ph*pa;
        if(h>a) probs[0]+=cell; else if(h===a) probs[1]+=cell; else probs[2]+=cell;
        if(h>0 && a>0) btts+=cell;
        scoreRows.push({score:h+'-'+a, prob:cell});
      }
    }
    probs=normalizeProb(probs);
    var likely = scoreRows.sort(function(x,y){ return y.prob-x.prob; }).slice(0,4);
    if(Number.isFinite(cur.line)){
      overProb = 0;
      for(var hh=0; hh<=maxGoals; hh++) for(var aa=0; aa<=maxGoals; aa++) if((hh+aa) > cur.line) overProb += poissonPmf(hh, lambdaHome)*poissonPmf(aa, lambdaAway);
    }
    return {
      modelName:'Soccer Parametric Scoreline',
      shortLabel:'Poisson Scoreline',
      adjustedProb: probs,
      blendWeight: 0.12,
      confidence: 76,
      metrics:[
        ['Home λ', fmt(lambdaHome,2)],
        ['Away λ', fmt(lambdaAway,2)],
        ['BTTS', pct(btts,1)],
        ['Most likely', likely.map(function(r){ return r.score+' '+pct(r.prob,1); }).join(' · ')]
      ],
      caveat:'팀 xG·라인업이 없는 상태에서 시장 확률과 라인을 역산한 포아송 점수 분포 레이어입니다.',
      notes:['1X2 또는 O/U 구조를 이용해 기대 득점을 역산하고 점수분포를 생성했습니다.'],
      likelyScores: likely,
      btts:btts,
      overProb: overProb,
      lambdaHome:lambdaHome,
      lambdaAway:lambdaAway
    };
  }

  function computeBasketballDistributionModel(cur, prob){
    var p = normalizeProb(prob||[]), fav = rankDesc(p)[0]||0, dog=fav===0?1:0;
    var sigmaSpread = 11.5, sigmaTotal = 18.5;
    var line = Number.isFinite(cur.line) ? cur.line : 0;
    var expectedMargin = NaN, expectedTotal = NaN, adjusted = p.slice(), notes=[];
    if((cur.market==='handicap' || cur.market==='2way') && p.length===2){
      var favProb = p[fav];
      expectedMargin = line + sigmaSpread*normInv(favProb);
      var coverProbAtLine = normCdf((expectedMargin - line)/sigmaSpread);
      adjusted = fav===0 ? [coverProbAtLine, 1-coverProbAtLine] : [1-coverProbAtLine, coverProbAtLine];
      notes.push('정규분포 스프레드 모델로 예상 마진을 역산했습니다.');
    }
    if(cur.market==='ou' && p.length===2 && Number.isFinite(cur.line)){
      expectedTotal = line + sigmaTotal*normInv(p[0]);
      adjusted = [normCdf((expectedTotal-line)/sigmaTotal), 1-normCdf((expectedTotal-line)/sigmaTotal)];
      notes.push('총점 기준선과 오버 확률로 예상 총점을 역산했습니다.');
    }
    adjusted = normalizeProb(adjusted);
    return {
      modelName:'Basketball Distribution Layer', shortLabel:'Spread/Total Dist.', adjustedProb:adjusted, blendWeight:0.11, confidence:74,
      metrics:[['Exp Margin', Number.isFinite(expectedMargin)?fmt(expectedMargin,1):'—'],['Exp Total', Number.isFinite(expectedTotal)?fmt(expectedTotal,1):'—'],['σ Spread', fmt(sigmaSpread,1)],['σ Total', fmt(sigmaTotal,1)]],
      caveat:'팀 레이팅 없이 시장선과 확률만으로 분포를 복원한 농구 정규분포 레이어입니다.', notes:notes
    };
  }

  function computeBaseballRunModel(cur, prob){
    var p = normalizeProb(prob||[]), fav = rankDesc(p)[0]||0, dog=fav===0?1:0;
    var total = Number.isFinite(cur.line) && cur.market==='ou' ? Math.max(6.5, Math.min(11.5, cur.line+0.12)) : 8.4;
    var edge = Math.max(-0.45, Math.min(0.45, (p[fav]-p[dog])*0.95));
    var favRuns = Math.max(2.2, total/2 + edge);
    var dogRuns = Math.max(1.8, total - favRuns);
    var maxRuns=14, favWin=0, likely=[];
    var rows=[];
    for(var f=0; f<=maxRuns; f++) for(var d=0; d<=maxRuns; d++){
      var cell=poissonPmf(f,favRuns)*poissonPmf(d,dogRuns);
      if(f>d) favWin+=cell;
      rows.push({score:f+'-'+d, prob:cell});
    }
    rows.sort(function(a,b){ return b.prob-a.prob; });
    likely = rows.slice(0,4);
    var adjusted = fav===0 ? [favWin, 1-favWin] : [1-favWin, favWin];
    adjusted = normalizeProb(adjusted);
    return {
      modelName:'Baseball Run Environment', shortLabel:'Run Env / Poisson', adjustedProb:adjusted, blendWeight:0.10, confidence:71,
      metrics:[['Fav Runs', fmt(favRuns,2)],['Dog Runs', fmt(dogRuns,2)],['Total μ', fmt(total,2)],['Likely', likely.map(function(r){return r.score+' '+pct(r.prob,1);}).join(' · ')]],
      caveat:'선발·불펜 없이 머니라인/총점 구조를 런 기대값으로 환산한 야구 분포 레이어입니다.', notes:['시장 확률을 기대 득점으로 분해해 머니라인을 재계산했습니다.']
    };
  }

  function computeTennisSetModel(cur, prob){
    var p = normalizeProb(prob||[]), matchP = p[0] || 0.5;
    var setP = solveSetProbFromMatchBo3(matchP);
    var straight = setP*setP;
    var three = 2*setP*setP*(1-setP);
    var adjusted = normalizeProb([straight+three, 1-(straight+three)]);
    return {
      modelName:'Tennis Set Conversion', shortLabel:'BO3 Set Layer', adjustedProb:adjusted, blendWeight:0.09, confidence:73,
      metrics:[['Set Win p', pct(setP,1)],['2-0', pct(straight,1)],['2-1', pct(three,1)],['Decider risk', pct(1-straight-(1-setP)*(1-setP),1)]],
      caveat:'매치 승률을 세트 승률로 역산한 보수적 테니스 레이어입니다.', notes:['BO3 기준 세트 전환 공식을 사용했습니다.']
    };
  }

  function computeEsportsMapModel(cur, prob){
    var p = normalizeProb(prob||[]), matchP=p[0]||0.5;
    var mapP = solveSetProbFromMatchBo3(matchP);
    var sweep = mapP*mapP;
    var decider = 2*mapP*(1-mapP);
    var adjusted = flattenProbabilities(p, 0.06 + (decider*0.08));
    return {
      modelName:'Esports Map Conversion', shortLabel:'BO3 Map Layer', adjustedProb:adjusted, blendWeight:0.08, confidence:66,
      metrics:[['Map Win p', pct(mapP,1)],['2-0 Sweep', pct(sweep,1)],['Map 3 chance', pct(decider,1)],['Variance', decider>=0.45?'High':'Medium']],
      caveat:'맵 정보 없이 BO3 전환만 적용한 방어적 e스포츠 레이어입니다.', notes:['맵3 진입 확률이 높을수록 확률 분포를 평탄화합니다.']
    };
  }

  function computeAdvancedSportModel(cur, sportModel, calibration, consensus, move, uncertainty){
    var base = sportModel && sportModel.finalProb ? sportModel.finalProb.slice() : (calibration && calibration.calibratedProb ? calibration.calibratedProb.slice() : []);
    if(!base.length) return null;
    var sport = cur && cur.sport ? cur.sport : 'soccer';
    var raw = null;
    if(sport==='soccer') raw = computeSoccerParametricModel(cur, base);
    else if(sport==='basketball') raw = computeBasketballDistributionModel(cur, base);
    else if(sport==='baseball') raw = computeBaseballRunModel(cur, base);
    else if(sport==='tennis') raw = computeTennisSetModel(cur, base);
    else if(sport==='esports') raw = computeEsportsMapModel(cur, base);
    if(!raw) return null;
    var w = raw.blendWeight || 0.08;
    if(uncertainty && uncertainty.confidence < 55) w = Math.max(0.05, w - 0.02);
    if(move && move.volatilityScore >= 70) w = Math.max(0.05, w - 0.02);
    var finalProb = blendProbArrays(base, raw.adjustedProb, w);
    var delta = mean(finalProb.map(function(v,i){ return Math.abs(v-base[i]); }));
    return {
      sport: sport,
      modelName: raw.modelName,
      shortLabel: raw.shortLabel,
      baseProb: base,
      advancedProb: normalizeProb(raw.adjustedProb),
      finalProb: finalProb,
      fairOdds: finalProb.map(function(v){ return 1/v; }),
      blendWeight: w,
      confidence: raw.confidence,
      delta: delta,
      metrics: raw.metrics || [],
      caveat: raw.caveat || '',
      notes: raw.notes || []
    };
  }

  function computeDefaultSportModel(cur, baseProb, consensus, move, uncertainty){
    return {
      modelName: 'Generic Market Stability Layer',
      shortLabel: 'Generic Layer',
      adjustedProb: flattenProbabilities(baseProb, 0.05),
      confidence: 58,
      blendWeight: 0.08,
      notes: ['종목 특화 데이터가 부족해 일반적인 시장 안정화 보정만 적용했습니다.'],
      featureBadges: ['Generic safe'],
      caveat: '팀/선수 데이터가 연결되면 더 강한 종목 모델로 대체할 수 있습니다.'
    };
  }

  function computeSportSpecificModel(cur, fairSet, consensus, move, uncertainty, calibration, regime){
    var baseProb = calibration && calibration.calibratedProb ? calibration.calibratedProb.slice() : fairSet.ensemble.slice();
    var sport = cur && cur.sport ? cur.sport : 'soccer';
    var raw;
    if(sport === 'soccer') raw = computeSoccerModel(cur, baseProb, consensus, move, uncertainty);
    else if(sport === 'basketball') raw = computeBasketballModel(cur, baseProb, consensus, move, uncertainty);
    else if(sport === 'baseball') raw = computeBaseballModel(cur, baseProb, consensus, move, uncertainty);
    else if(sport === 'tennis') raw = computeTennisModel(cur, baseProb, consensus, move, uncertainty);
    else if(sport === 'esports') raw = computeEsportsModel(cur, baseProb, consensus, move, uncertainty);
    else raw = computeDefaultSportModel(cur, baseProb, consensus, move, uncertainty);

    var weight = raw.blendWeight || 0.08;
    if(regime && regime.kind === 'efficient') weight += 0.02;
    if(regime && regime.kind === 'volatile') weight = Math.max(0.06, weight - 0.03);
    if(uncertainty && uncertainty.confidence < 55) weight = Math.max(0.05, weight - 0.03);
    weight = Math.max(0.05, Math.min(0.22, weight));
    var finalProb = blendProbArrays(baseProb, raw.adjustedProb, weight);
    var delta = mean(finalProb.map(function(p, idx){ return Math.abs(p - baseProb[idx]); }));
    var topIdx = rankDesc(finalProb)[0] || 0;
    var fit = cur.market === '1x2' && sport === 'soccer' ? 'High' : ((sport === 'basketball' || sport === 'tennis' || sport === 'baseball') ? 'Medium' : 'Baseline');
    return {
      sport: sport,
      modelName: raw.modelName,
      shortLabel: raw.shortLabel,
      baseProb: baseProb,
      sportProb: normalizeProb(raw.adjustedProb),
      finalProb: finalProb,
      fairOdds: finalProb.map(function(v){ return 1/v; }),
      blendWeight: weight,
      confidence: raw.confidence,
      delta: delta,
      topIdx: topIdx,
      topProb: finalProb[topIdx],
      notes: raw.notes || [],
      caveat: raw.caveat,
      featureBadges: raw.featureBadges || [],
      fitLabel: fit
    };
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

  function computeMoveMetrics(currentOdds, ensembleProb, openData, consensus){
    var nowFair = fairNorm(currentOdds);
    var openFair = openData && openData.odds && openData.odds.length===currentOdds.length ? (fairNorm(openData.odds) || null) : null;
    var baseProb = consensus && consensus.weightedProb && consensus.weightedProb.length===currentOdds.length ? consensus.weightedProb : ensembleProb;
    var trendProb = openFair ? ensembleProb.map(function(p,idx){ return p - openFair.p[idx]; }) : ensembleProb.map(function(p,idx){ return p - baseProb[idx]; });
    var moveMagnitude = mean(trendProb.map(function(v){ return Math.abs(v); }));
    var strongestIdx = rankDesc(trendProb.map(function(v){ return Math.abs(v); }))[0] || 0;
    var directionSign = trendProb[strongestIdx] >= 0 ? 1 : -1;
    var consensusGap = consensus ? ensembleProb.map(function(p,idx){ return p - consensus.weightedProb[idx]; }) : new Array(ensembleProb.length).fill(0);
    var aligned = mean(consensusGap.map(function(v,idx){ return Math.sign(v||0) === Math.sign(trendProb[idx]||0) ? 1 : 0; }));
    var steamScore = Math.max(0, Math.min(100,
      (moveMagnitude||0)*2400 +
      (consensus ? (1 - Math.min(0.12, consensus.sdMean||0))/0.12 * 18 : 8) +
      (consensus && consensus.topBooks && consensus.topBooks[0] && consensus.topBooks[0].meta.sharpTier==='sharp' ? 10 : 4) +
      aligned*18
    ));
    var reverseScore = Math.max(0, Math.min(100,
      mean(consensusGap.map(function(v,idx){ return Math.sign(v||0) !== Math.sign(trendProb[idx]||0) ? Math.abs(v-trendProb[idx]) : 0; })) * 2600 +
      (consensus ? consensus.marketDisagreementScore*0.35 : 12)
    ));
    var volatilityScore = Math.max(0, Math.min(100, (moveMagnitude||0)*3000 + (consensus ? consensus.marketDisagreementScore*0.5 : 10)));
    var trapRiskScore = Math.max(0, Math.min(100, reverseScore*0.55 + volatilityScore*0.35 + (consensus ? consensus.marketDisagreementScore*0.25 : 8)));

    var expectedClosingProb = ensembleProb.map(function(p,idx){
      var cons = consensus ? consensus.weightedProb[idx] : p;
      var trend = trendProb[idx] || 0;
      var blend = cons + trend*0.55 + (p-cons)*0.18;
      return clamp01(blend);
    });
    expectedClosingProb = normalizeProb(expectedClosingProb);
    var expectedClosingOdds = expectedClosingProb.map(function(v){ return 1/v; });
    var clvPotentialBp = currentOdds.map(function(o,idx){
      var closeO = expectedClosingOdds[idx];
      return Number.isFinite(o) && Number.isFinite(closeO) && closeO>0 ? ((o/closeO)-1)*10000 : NaN;
    });
    return {
      openFair: openFair,
      nowFair: nowFair,
      trendProb: trendProb,
      strongestIdx: strongestIdx,
      moveMagnitude: moveMagnitude,
      steamScore: steamScore,
      reverseScore: reverseScore,
      volatilityScore: volatilityScore,
      trapRiskScore: trapRiskScore,
      expectedClosingProb: expectedClosingProb,
      expectedClosingOdds: expectedClosingOdds,
      clvPotentialBp: clvPotentialBp,
      timingLabelByIdx: clvPotentialBp.map(function(bp){ return !Number.isFinite(bp) ? 'neutral' : (bp >= 35 ? 'take_now' : (bp <= -20 ? 'wait' : 'neutral')); })
    };
  }

  function dcTau(x, y, lambdaHome, lambdaAway, rho){
    if(x===0 && y===0) return Math.max(0.6, 1 - rho*lambdaHome*lambdaAway);
    if(x===0 && y===1) return Math.max(0.6, 1 + rho*lambdaHome);
    if(x===1 && y===0) return Math.max(0.6, 1 + rho*lambdaAway);
    if(x===1 && y===1) return Math.max(0.6, 1 - rho);
    return 1;
  }
  function buildScoreMatrix(lambdaHome, lambdaAway, rho, maxGoals){
    var rows = [];
    for(var h=0; h<=maxGoals; h++) for(var a=0; a<=maxGoals; a++){
      var base = poissonPmf(h, lambdaHome) * poissonPmf(a, lambdaAway);
      rows.push({h:h, a:a, prob: base * dcTau(h, a, lambdaHome, lambdaAway, rho)});
    }
    var total = sum(rows.map(function(r){ return r.prob; })) || 1;
    rows.forEach(function(r){ r.prob /= total; });
    return rows;
  }
  function scoreMatrixToMarketProb(matrix, market, line){
    if(!matrix || !matrix.length) return [];
    if(market === '1x2'){
      var home=0, draw=0, away=0;
      matrix.forEach(function(r){ if(r.h>r.a) home += r.prob; else if(r.h===r.a) draw += r.prob; else away += r.prob; });
      return normalizeProb([home, draw, away]);
    }
    if(market === 'ou'){
      var over=0; matrix.forEach(function(r){ if((r.h+r.a) > line) over += r.prob; });
      return normalizeProb([over, 1-over]);
    }
    if(market === 'handicap'){
      var pa=0, pb=0; matrix.forEach(function(r){ if((r.h + line) > r.a) pa += r.prob; else pb += r.prob; });
      return normalizeProb([pa, pb]);
    }
    var sideA=0; matrix.forEach(function(r){ if(r.h>r.a) sideA += r.prob; });
    return normalizeProb([sideA, 1-sideA]);
  }
  function buildSimpleTable(headers, rows){
    if(!rows || !rows.length) return '';
    var head = '<thead><tr>' + headers.map(function(h){ return '<th>'+htmlEscape(h)+'</th>'; }).join('') + '</tr></thead>';
    var body = '<tbody>' + rows.map(function(row){ return '<tr>'+row.map(function(cell){ return '<td>'+htmlEscape(cell)+'</td>'; }).join('')+'</tr>'; }).join('') + '</tbody>';
    return '<table class="ae-table ae-tight ae-mini-table">'+head+body+'</table>';
  }
  function computePhaseEModel(cur, calibration, sportModel, advancedModel, consensus, move, uncertainty, settings){
    var base = advancedModel && advancedModel.finalProb && advancedModel.finalProb.length ? advancedModel.finalProb.slice() : (sportModel && sportModel.finalProb ? sportModel.finalProb.slice() : (calibration && calibration.calibratedProb ? calibration.calibratedProb.slice() : []));
    if(!base.length) return null;
    var sport = cur && cur.sport ? cur.sport : 'soccer';
    var raw = null;
    if(sport === 'soccer'){
      var lambdaHome = advancedModel && Number.isFinite(advancedModel.lambdaHome) ? advancedModel.lambdaHome : 1.35;
      var lambdaAway = advancedModel && Number.isFinite(advancedModel.lambdaAway) ? advancedModel.lambdaAway : 1.15;
      var tempo = 1 + Math.max(-0.20, Math.min(0.20, settings.soccerTempo || 0));
      lambdaHome = Math.max(0.15, lambdaHome * tempo);
      lambdaAway = Math.max(0.15, lambdaAway * tempo);
      var rho = Math.max(-0.20, Math.min(0.20, settings.soccerRho || -0.08));
      var matrix = buildScoreMatrix(lambdaHome, lambdaAway, rho, 7);
      var prob = scoreMatrixToMarketProb(matrix, cur.market, Number.isFinite(cur.line) ? cur.line : 0);
      var likely = matrix.slice().sort(function(a,b){ return b.prob-a.prob; }).slice(0,4).map(function(r){ return [r.h+'-'+r.a, pct(r.prob,1)]; });
      raw = {
        modelName:'Phase E · Dixon-Coles Score Model', shortLabel:'DC Score', adjustedProb:prob, confidence:81, blendWeight:0.12,
        metrics:[['ρ', fmt(rho,2)], ['Home λ', fmt(lambdaHome,2)], ['Away λ', fmt(lambdaAway,2)], ['Tempo', fmt(tempo,2)]],
        notes:['저득점 상관을 반영하는 Dixon-Coles 스타일 보정을 적용했습니다.'],
        caveat:'팀 xG 없이 시장 기반 λ를 역산한 모델입니다.',
        extrasHtml: buildSimpleTable(['Likely Score','Prob'], likely),
        lambdaHome:lambdaHome, lambdaAway:lambdaAway
      };
    } else if(sport === 'basketball'){
      var p = normalizeProb(base);
      var fav = rankDesc(p)[0]||0;
      var favProb = p[fav] || 0.5;
      var sigmaSpread = 11.5, sigmaTotal = 18.5;
      var expectedMargin = ((Number.isFinite(cur.line) ? cur.line : 0) + sigmaSpread*normInv(clamp01(favProb))) + (settings.basketballMargin||0);
      var expectedTotal = Number.isFinite(cur.line) && cur.market==='ou' ? (cur.line + sigmaTotal*normInv(clamp01(p[0]||0.5)) + (settings.basketballPace||0)) : (218 + (settings.basketballPace||0));
      var prob = base.slice();
      if((cur.market==='handicap' || cur.market==='2way') && prob.length===2){
        var cover = normCdf((expectedMargin - (Number.isFinite(cur.line)?cur.line:0))/sigmaSpread);
        prob = fav===0 ? [cover, 1-cover] : [1-cover, cover];
      } else if(cur.market==='ou' && prob.length===2 && Number.isFinite(cur.line)) {
        var over = normCdf((expectedTotal-cur.line)/sigmaTotal);
        prob = [over, 1-over];
      }
      var rows=[];
      if(cur.market==='ou' && Number.isFinite(cur.line)){
        [-6,-3,0,3,6].forEach(function(delta){ var alt=cur.line+delta; var overAlt=normCdf((expectedTotal-alt)/sigmaTotal); rows.push([fmt(alt,1), pct(overAlt,1), pct(1-overAlt,1)]); });
      } else {
        [-6,-3,0,3,6].forEach(function(delta){ var alt=(Number.isFinite(cur.line)?cur.line:0)+delta; var coverAlt=normCdf((expectedMargin-alt)/sigmaSpread); rows.push([fmt(alt,1), pct(coverAlt,1), pct(1-coverAlt,1)]); });
      }
      raw = { modelName:'Phase E · Basketball Alt-Line Engine', shortLabel:'Alt Line Grid', adjustedProb:normalizeProb(prob), confidence:78, blendWeight:0.10, metrics:[['Exp Margin', fmt(expectedMargin,1)], ['Exp Total', fmt(expectedTotal,1)], ['Pace Adj', fmt(settings.basketballPace||0,1)], ['Margin Adj', fmt(settings.basketballMargin||0,1)]], notes:['예상 마진·총점을 기반으로 alt line / alt total 확률표를 생성했습니다.'], caveat:'팀 레이팅 대신 현재 가격과 분포만 사용하는 정규 근사입니다.', extrasHtml: buildSimpleTable([cur.market==='ou'?'Alt Total':'Alt Line','Fav/Over','Dog/Under'], rows) };
    } else if(sport === 'baseball'){
      var p2 = normalizeProb(base), fav2 = rankDesc(p2)[0]||0, dog2=fav2===0?1:0;
      var totalBase = Number.isFinite(cur.line) && cur.market==='ou' ? cur.line : 8.4;
      totalBase = totalBase * Math.max(0.8, Math.min(1.2, settings.baseballPark||1));
      var edge = ((p2[fav2]-p2[dog2])*0.95) + (settings.baseballStarter||0)*0.42 + (settings.baseballBullpen||0)*0.24;
      edge = Math.max(-1.5, Math.min(1.5, edge));
      var favRuns = Math.max(2.0, totalBase/2 + edge/2);
      var dogRuns = Math.max(1.6, totalBase - favRuns);
      var matrix2 = [];
      for(var f=0; f<=12; f++) for(var d=0; d<=12; d++) matrix2.push({f:f,d:d,prob:poissonPmf(f,favRuns)*poissonPmf(d,dogRuns)});
      var tt = sum(matrix2.map(function(r){ return r.prob; }))||1; matrix2.forEach(function(r){ r.prob/=tt; });
      var favWin=0; matrix2.forEach(function(r){ if(r.f>r.d) favWin += r.prob; });
      var prob2 = fav2===0 ? [favWin,1-favWin] : [1-favWin,favWin];
      var likely2 = matrix2.slice().sort(function(a,b){ return b.prob-a.prob; }).slice(0,4).map(function(r){ return [r.f+'-'+r.d, pct(r.prob,1)]; });
      raw = { modelName:'Phase E · Baseball Pitching / Park Layer', shortLabel:'Starter·Bullpen', adjustedProb:normalizeProb(prob2), confidence:77, blendWeight:0.11, metrics:[['Fav Runs', fmt(favRuns,2)], ['Dog Runs', fmt(dogRuns,2)], ['Park', fmt(settings.baseballPark||1,2)], ['Starter/BP', fmt(settings.baseballStarter||0,2)+' / '+fmt(settings.baseballBullpen||0,2)]], notes:['선발·불펜·구장 팩터 입력을 런 기대값에 직접 반영했습니다.'], caveat:'실제 선수 데이터가 연결되면 훨씬 정밀해질 수 있습니다.', extrasHtml: buildSimpleTable(['Likely Score','Prob'], likely2) };
    } else if(sport === 'tennis' || sport === 'esports'){
      var baseMatch = clamp01(base[0] || 0.5);
      var setP = solveSetProbFromMatchBo3(baseMatch);
      var surface = settings.tennisSurface || 0;
      var hold = settings.tennisHold || 0;
      var adjSet = clamp01(setP + surface*0.35 + hold*0.55);
      var matchAdj = clamp01(adjSet*adjSet*(3-2*adjSet));
      var prob3 = normalizeProb([matchAdj, 1-matchAdj]);
      var straight = adjSet*adjSet;
      var decider = 2*adjSet*(1-adjSet);
      raw = { modelName:'Phase E · '+(sport==='tennis'?'Surface / Hold':'Map / Tempo')+' Layer', shortLabel:(sport==='tennis'?'Surface·Hold':'Map Edge'), adjustedProb:prob3, confidence:sport==='tennis'?79:70, blendWeight:sport==='tennis'?0.11:0.09, metrics:[['Set/Map p', pct(adjSet,1)], ['Straight', pct(straight,1)], ['Decider', pct(decider,1)], ['Bias', fmt(surface,2)+' / '+fmt(hold,2)]], notes:[(sport==='tennis'?'표면/홀드':'맵/템포')+' 입력을 세트/맵 전환 확률에 반영했습니다.'], caveat:'실제 선수·맵 데이터 없이 사용자가 입력한 편향값으로만 조정합니다.', extrasHtml: buildSimpleTable(['Scenario','Prob'], [['Straight', pct(straight,1)], ['Decider', pct(decider,1)], ['2-1/Map3', pct(adjSet*adjSet*(1-adjSet)*2,1)]]) };
    } else {
      var flat = flattenProbabilities(base, 0.04 + Math.max(0, -(settings.distLean||0))/200);
      raw = { modelName:'Phase E · Generic Risk Layer', shortLabel:'Generic Phase E', adjustedProb:flat, confidence:63, blendWeight:0.07, metrics:[['Flatten', pct(mean(flat.map(function(v, i){ return Math.abs(v-base[i]); })),2)], ['Trust', fmt(settings.phaseETrust||8,0)], ['Consensus Lean', fmt(settings.consensusLean||0,0)], ['Dist Lean', fmt(settings.distLean||0,0)]], notes:['종목별 입력이 부족해 보수적 평탄화 레이어만 적용했습니다.'], caveat:'기타 종목은 외부 데이터가 연결되면 전용 모델로 교체 가능합니다.', extrasHtml:'' };
    }
    if(!raw) return null;
    var baseWeight = raw.blendWeight || 0.08;
    baseWeight += (settings.phaseETrust||8)/200;
    baseWeight += (settings.distLean||0)/300;
    if(move && move.volatilityScore >= 72) baseWeight -= 0.02;
    if(uncertainty && uncertainty.confidence < 52) baseWeight -= 0.02;
    var w = Math.max(0.05, Math.min(0.22, baseWeight));
    var finalProb = blendProbArrays(base, raw.adjustedProb, w);
    var delta = mean(finalProb.map(function(v,i){ return Math.abs(v-base[i]); }));
    return { sport:sport, modelName:raw.modelName, shortLabel:raw.shortLabel, baseProb:base, phaseEProb:normalizeProb(raw.adjustedProb), finalProb:finalProb, fairOdds:finalProb.map(function(v){ return 1/v; }), blendWeight:w, confidence:raw.confidence, delta:delta, metrics:raw.metrics||[], caveat:raw.caveat||'', notes:raw.notes||[], extrasHtml:raw.extrasHtml||'', lambdaHome:raw.lambdaHome, lambdaAway:raw.lambdaAway };
  }

  function computeUncertainty(consensus, methods, openData, currentOdds){
    var methodNames = Object.keys(methods || {});
    var methodDisagreement = 0;
    if(methodNames.length){
      var len = methods[methodNames[0]].p.length;
      methodDisagreement = mean(new Array(len).fill(0).map(function(_, idx){
        return sd(methodNames.map(function(name){ return methods[name].p[idx]; }));
      }));
    }
    var sparsePenalty = !consensus ? 12 : Math.max(0, 12 - Math.min(12, (consensus.rows.length||0)*2.5));
    var disagreementPenalty = consensus ? Math.min(18, (consensus.sdMean||0)*900) : 10;
    var highMarginPenalty = fairNorm(currentOdds) ? Math.max(0, Math.min(16, fairNorm(currentOdds).margin * 120)) : 8;
    var methodPenalty = Math.min(16, methodDisagreement * 1300);
    var openPenalty = openData ? 0 : 6;
    var penalty = sparsePenalty + disagreementPenalty + highMarginPenalty + methodPenalty + openPenalty;
    var confidence = Math.max(0, Math.min(100, 100 - penalty*1.35));
    var flags = [];
    if(!consensus) flags.push('컨센서스 데이터 부족');
    if(consensus && (consensus.sdMean||0) > 0.018) flags.push('북메이커 편차 큼');
    var nowMargin = fairNorm(currentOdds) ? fairNorm(currentOdds).margin : 0;
    if(nowMargin > 0.07) flags.push('시장 마진 높음');
    if(methodDisagreement > 0.012) flags.push('모델 간 불일치 존재');
    if(!openData) flags.push('오픈 배당 없음');
    return {
      penalty: penalty,
      confidence: confidence,
      flags: flags,
      methodDisagreement: methodDisagreement
    };
  }

  function computeMethodAgreement(methods){
    var names = Object.keys(methods || {}).filter(function(k){ return methods[k] && methods[k].p; });
    if(!names.length) return {overallScore:60, bySelection:[], topMethod:null, notes:['방법 데이터 부족']};
    var len = methods[names[0]].p.length;
    var bySelection = [];
    for(var i=0;i<len;i++){
      var values = names.map(function(name){ return methods[name].p[i]; }).filter(Number.isFinite);
      var spread = sd(values);
      bySelection.push(Math.max(24, Math.min(96, 96 - spread*4200)));
    }
    var ranked = names.map(function(name){
      var arr = methods[name].p;
      var avgGap = mean(arr.map(function(v, idx){ return Math.abs(v - mean(names.map(function(other){ return methods[other].p[idx]; }))); }));
      return {name:name, score:Math.max(20, Math.min(96, 92 - avgGap*3200))};
    }).sort(function(a,b){ return b.score-a.score; });
    return {
      overallScore: mean(bySelection),
      bySelection: bySelection,
      ranking: ranked,
      topMethod: ranked[0] ? ranked[0].name : null,
      notes:[mean(bySelection)>=74 ? '방법 간 합의가 높습니다.' : (mean(bySelection)>=58 ? '방법 간 차이가 존재합니다.' : '방법 간 불일치가 큽니다.')]
    };
  }


  function computeRowRobustness(row, rowCount, move, uncertainty, consensus, coherence, agreement){
    var uniform = rowCount > 0 ? 1/rowCount : 0.5;
    var reverse = (move && Number.isFinite(move.reverseScore)) ? move.reverseScore : 50;
    var vol = (move && Number.isFinite(move.volatilityScore)) ? move.volatilityScore : 50;
    var conf = (uncertainty && Number.isFinite(uncertainty.confidence)) ? uncertainty.confidence : 56;
    var coh = (coherence && Number.isFinite(coherence.score)) ? coherence.score : 62;
    var agreeSel = Number.isFinite(row.selectionAgreement) ? row.selectionAgreement : ((agreement && Number.isFinite(agreement.overallScore)) ? agreement.overallScore : 60);
    var cautiousProb = clamp01(row.finalProb * (1 - Math.max(0.03, Math.min(0.16, ((100-conf)*0.0012) + (vol*0.00045) + (reverse*0.00035)) )) + uniform * Math.max(0.03, Math.min(0.16, ((100-conf)*0.0012) + (vol*0.00045) + (reverse*0.00035)) ));
    var consensusProb = (consensus && consensus.weightedProb && Number.isFinite(consensus.weightedProb[row.idx])) ? consensus.weightedProb[row.idx] : row.finalProb;
    var adverseProb = row.finalProb * (1 - Math.max(0.01, Math.min(0.06, reverse*0.00035 + vol*0.00020 + Math.max(0, 60-coh)*0.00040)));
    adverseProb = clamp01(adverseProb);
    var scenarioEdges = [
      row.modelEdge,
      Number.isFinite(row.conservativeEdge) ? row.conservativeEdge : row.modelEdge,
      Number.isFinite(row.marketGap) ? row.marketGap : row.modelEdge,
      row.offer * cautiousProb - 1,
      row.offer * adverseProb - 1,
      row.offer * consensusProb - 1
    ];
    var positiveRate = scenarioEdges.filter(function(v){ return Number.isFinite(v) && v > 0; }).length / scenarioEdges.length;
    var worstEdge = Math.min.apply(null, scenarioEdges.filter(Number.isFinite));
    var avgEdge = mean(scenarioEdges);
    var spread = sd(scenarioEdges);
    var score = 42 + positiveRate*30 + Math.max(0, avgEdge)*180 + Math.max(0, worstEdge)*140 + (agreeSel-60)*0.12 + (coh-62)*0.10 - Math.max(0, -worstEdge)*260 - spread*180;
    score = Math.max(0, Math.min(100, score));
    var stakeFactor = score >= 78 ? 1.00 : (score >= 66 ? 0.84 : (score >= 54 ? 0.62 : (score >= 44 ? 0.38 : 0.12)));
    if(worstEdge < -0.01) stakeFactor = Math.min(stakeFactor, 0.42);
    if(positiveRate < 0.50) stakeFactor = Math.min(stakeFactor, 0.24);
    var label = score >= 76 ? '견조' : (score >= 60 ? '보통' : (score >= 46 ? '취약' : '불안정'));
    var pressure = Math.max(0, (consensusProb - row.finalProb)*100 + Math.max(0,-worstEdge)*120 + spread*100);
    return {
      score: score,
      label: label,
      positiveRate: positiveRate,
      worstEdge: worstEdge,
      avgEdge: avgEdge,
      spread: spread,
      pressure: Math.max(0, Math.min(100, pressure)),
      stakeFactor: stakeFactor,
      scenarioEdges: scenarioEdges,
      cautiousProb: cautiousProb,
      adverseProb: adverseProb,
      consensusProb: consensusProb
    };
  }

  function applyRobustnessToRows(rows, move, uncertainty, consensus, coherence, agreement){
    return (rows || []).map(function(row){
      var robust = computeRowRobustness(row, rows.length || 2, move, uncertainty, consensus, coherence, agreement);
      row.robustness = robust;
      row.edgeScore = Math.max(0, Math.min(100, row.edgeScore*0.78 + robust.score*0.22));
      row.grade = row.edgeScore >= 80 ? 'Strong Value' : row.edgeScore >= 65 ? 'Playable' : row.edgeScore >= 50 ? 'Thin Edge' : 'Pass';
      row.recommendedStakePct = row.recommendedStakePct * robust.stakeFactor;
      row.stakeFactor = row.stakeFactor * robust.stakeFactor;
      if(row.grade === 'Pass' || robust.score < 40) row.recommendedStakePct = 0;
      return row;
    });
  }

  function computeDominanceProfile(bestRow, edgeRows){
    if(!bestRow || !edgeRows || edgeRows.length < 2){
      return {score:58,label:'단독',edgeGap:NaN,probGap:NaN,robustGap:NaN,notes:['비교 선택 부족']};
    }
    var ranked = edgeRows.slice().sort(function(a,b){ return b.edgeScore - a.edgeScore; });
    var top = ranked[0], second = ranked[1];
    var edgeGap = (top.edgeScore||0) - (second.edgeScore||0);
    var probGap = (top.finalProb||0) - (second.finalProb||0);
    var robustGap = ((top.robustness && top.robustness.score)||0) - ((second.robustness && second.robustness.score)||0);
    var score = 50 + edgeGap*0.95 + probGap*240 + robustGap*0.30;
    score = Math.max(0, Math.min(100, score));
    var label = score >= 74 ? '우위 명확' : (score >= 58 ? '우위 존재' : (score >= 44 ? '경합' : '혼전'));
    var notes = [];
    if(edgeGap >= 12) notes.push('2위 대비 점수 우세');
    else if(edgeGap < 5) notes.push('상위 선택 간 점수 차이 작음');
    if(robustGap >= 10) notes.push('스트레스 내구도 우위');
    else if(robustGap < 4) notes.push('내구도 차이 제한적');
    return {score:score,label:label,edgeGap:edgeGap,probGap:probGap,robustGap:robustGap,notes:notes.slice(0,3),runnerUp:second ? second.label : '—'};
  }

  function computeEntryTiming(bestRow, move, uncertainty, consensus, regime, coherence, bookMemory, methodMemory, agreement, robustness, dominance){
    if(!bestRow) return {score:34,label:'pass',actionLabel:'PASS',notes:['유효 선택 없음'],bias:'보수'};
    var score = 52;
    score += Number.isFinite(bestRow.clvBp) ? Math.max(-12, Math.min(18, bestRow.clvBp/6)) : 0;
    score += bestRow.priceTimingLabel==='take_now' ? 10 : (bestRow.priceTimingLabel==='wait' ? -10 : 0);
    score += ((consensus && consensus.marketDisagreementScore != null) ? Math.max(-8, 10 - consensus.marketDisagreementScore*0.16) : 0);
    score += ((coherence && coherence.availableCount >= 2) ? (coherence.score - 62)*0.18 : 0);
    score += ((bookMemory && Number.isFinite(bookMemory.avgScore)) ? (bookMemory.avgScore - 52)*0.10 : 0);
    score += ((methodMemory && Number.isFinite(methodMemory.avgScore)) ? (methodMemory.avgScore - 52)*0.12 : 0);
    score += ((agreement && Number.isFinite(agreement.overallScore)) ? (agreement.overallScore - 60)*0.14 : 0);
    score += ((robustness && Number.isFinite(robustness.score)) ? (robustness.score - 58)*0.18 : 0);
    score += ((dominance && Number.isFinite(dominance.score)) ? (dominance.score - 55)*0.14 : 0);
    score -= ((move && Number.isFinite(move.reverseScore)) ? move.reverseScore*0.10 : 0);
    score -= ((move && Number.isFinite(move.volatilityScore)) ? move.volatilityScore*0.08 : 0);
    score -= ((uncertainty && Number.isFinite(uncertainty.penalty)) ? uncertainty.penalty*0.25 : 0);
    if(regime && regime.kind==='efficient') score += 4;
    if(regime && regime.kind==='volatile') score -= 6;
    score = Math.max(0, Math.min(100, score));
    var label = score >= 74 ? 'take_now' : (score >= 58 ? 'scale_in' : (score >= 44 ? 'wait' : 'pass'));
    var actionLabel = label==='take_now' ? '지금 진입' : (label==='scale_in' ? '분할 진입' : (label==='wait' ? '대기' : '패스'));
    var notes = [];
    if(bestRow.clvBp >= 20) notes.push('CLV 선점 우세');
    if(move && move.reverseScore >= 60) notes.push('리버스 리스크 높음');
    if(agreement && agreement.overallScore >= 74) notes.push('모델 합의 우수');
    if(agreement && agreement.overallScore < 56) notes.push('모델 합의 낮음');
    if(robustness && robustness.score >= 74) notes.push('스트레스 테스트 견조');
    if(robustness && robustness.score < 52) notes.push('스트레스 내구도 낮음');
    if(dominance && dominance.score >= 70) notes.push('탑픽 우위 명확');
    if(dominance && dominance.score < 52) notes.push('탑픽 경쟁 치열');
    if(bookMemory && bookMemory.avgScore >= 62) notes.push('북 신뢰도 양호');
    if(uncertainty && uncertainty.confidence < 54) notes.push('데이터 신뢰도 낮음');
    return {score:score,label:label,actionLabel:actionLabel,notes:notes.slice(0,4),bias:label==='take_now'?'공격':(label==='scale_in'?'점진':'보수')};
  }

  function computeEdgeRows(labels, currentOdds, bestOdds, ensembleProb, conservativeProb, aggressiveProb, consensus, move, uncertainty, calibration, regime, sportModel, advancedModel, phaseEModel, coherence, bookMemory, methodMemory, agreement){
    var calibratedProb = calibration && calibration.calibratedProb ? calibration.calibratedProb : ensembleProb;
    var finalProb = phaseEModel && phaseEModel.finalProb && phaseEModel.finalProb.length === calibratedProb.length ? phaseEModel.finalProb : (advancedModel && advancedModel.finalProb && advancedModel.finalProb.length === calibratedProb.length ? advancedModel.finalProb : (sportModel && sportModel.finalProb && sportModel.finalProb.length === calibratedProb.length ? sportModel.finalProb : calibratedProb));
    return labels.map(function(label, idx){
      var offer = Number.isFinite(bestOdds[idx]) ? bestOdds[idx] : currentOdds[idx];
      var fair = 1/finalProb[idx];
      var modelEdge = Number.isFinite(offer) ? (offer*finalProb[idx] - 1) : NaN;
      var marketGap = consensus ? (offer*consensus.weightedProb[idx] - 1) : modelEdge;
      var conservativeEdge = Number.isFinite(offer) ? (offer*conservativeProb[idx] - 1) : NaN;
      var aggressiveEdge = Number.isFinite(offer) ? (offer*aggressiveProb[idx] - 1) : NaN;
      var clvBp = move.clvPotentialBp[idx];
      var timing = move.timingLabelByIdx[idx];
      var regimeAdj = regime.kind === 'efficient' ? 4 : (regime.kind === 'volatile' ? -7 : (regime.kind === 'soft' ? -4 : 0));
      var calibrationAdj = calibration ? Math.max(-4, 6 - calibration.calibrationShift*900) : 0;
      var phaseEAdj = phaseEModel ? Math.max(-3, 5 - (phaseEModel.delta||0)*900) : 0;
      var coherenceAdj = coherence && coherence.availableCount >= 2 ? ((coherence.score - 62) * 0.22) : 0;
      var bookAdj = bookMemory && Number.isFinite(bookMemory.avgScore) ? ((bookMemory.avgScore - 52) * 0.10) : 0;
      var methodAdj = methodMemory && Number.isFinite(methodMemory.avgScore) ? ((methodMemory.avgScore - 52) * 0.12) : 0;
      var agreeAdj = agreement && Number.isFinite(agreement.overallScore) ? ((agreement.overallScore - 60) * 0.12) : 0;
      var selectAgreeAdj = agreement && agreement.bySelection && Number.isFinite(agreement.bySelection[idx]) ? ((agreement.bySelection[idx] - 60) * 0.10) : 0;
      var edgeScoreRaw = (modelEdge*100*1.28) + (marketGap*100*0.84) + ((Number.isFinite(clvBp)?clvBp:0)/18) + ((timing==='take_now')?8:(timing==='wait'?-5:0)) + regimeAdj + calibrationAdj + phaseEAdj + coherenceAdj + bookAdj + methodAdj + agreeAdj + selectAgreeAdj - (move.volatilityScore*0.12) - (uncertainty.penalty*0.55);
      var edgeScore = Math.max(0, Math.min(100, 50 + edgeScoreRaw));
      var grade = edgeScore >= 80 ? 'Strong Value' : edgeScore >= 65 ? 'Playable' : edgeScore >= 50 ? 'Thin Edge' : 'Pass';
      var full = kelly(finalProb[idx], offer);
      var autoFactor = grade === 'Strong Value' && uncertainty.confidence >= 72 ? 0.50 : grade === 'Playable' ? 0.25 : grade === 'Thin Edge' ? 0.10 : 0;
      if(move.volatilityScore >= 65 || uncertainty.confidence < 55 || regime.kind === 'volatile') autoFactor = Math.min(autoFactor, 0.10);
      if(coherence && coherence.availableCount >= 2 && coherence.score < 54) autoFactor = Math.min(autoFactor, 0.10);
      if(bookMemory && Number.isFinite(bookMemory.avgScore) && bookMemory.avgScore < 46) autoFactor = Math.min(autoFactor, 0.10);
      if(methodMemory && Number.isFinite(methodMemory.avgScore) && methodMemory.avgScore < 46) autoFactor = Math.min(autoFactor, 0.10);
      if(agreement && ((agreement.overallScore||0) < 56 || (agreement.bySelection && agreement.bySelection[idx] < 54))) autoFactor = Math.min(autoFactor, 0.08);
      if(grade === 'Pass') autoFactor = 0;
      return {
        idx: idx,
        label: label,
        offer: offer,
        fair: fair,
        modelEdge: modelEdge,
        marketGap: marketGap,
        conservativeEdge: conservativeEdge,
        aggressiveEdge: aggressiveEdge,
        clvBp: clvBp,
        timing: timing,
        edgeScore: edgeScore,
        grade: grade,
        kellyFull: full,
        kellyHalf: full/2,
        kellyQuarter: full/4,
        recommendedStakePct: full*autoFactor,
        stakeFactor: autoFactor,
        priceTimingLabel: timing,
        calibratedProb: calibratedProb[idx],
        finalProb: finalProb[idx],
        sportProb: sportModel && sportModel.sportProb ? sportModel.sportProb[idx] : calibratedProb[idx],
        phaseEProb: phaseEModel && phaseEModel.phaseEProb ? phaseEModel.phaseEProb[idx] : finalProb[idx],
        selectionAgreement: agreement && agreement.bySelection ? agreement.bySelection[idx] : NaN
      };
    });
  }


  function softmaxTemp(prob, temp){
    var t = Math.max(0.72, Math.min(1.38, Number(temp)||1));
    var logs = (prob||[]).map(function(v){ return Math.log(clamp01(v))/t; });
    var mx = Math.max.apply(null, logs);
    var ex = logs.map(function(v){ return Math.exp(v-mx); });
    return normalizeProb(ex);
  }

  function computeBucketCalibrationV22(cur, fairSet, move, uncertainty, coherence, consensus, regime, phaseEModel){
    var margin = Number.isFinite(fairSet && fairSet.margin) ? fairSet.margin : 0.05;
    var fav = fairSet && fairSet.ensemble && fairSet.ensemble.length ? Math.max.apply(null, fairSet.ensemble) : 0.5;
    var temp = 1.00;
    var tags = [];
    tags.push((cur && cur.market)==='1x2' ? '3way' : '2way');
    if(margin <= 0.035){ temp -= 0.04; tags.push('low-margin'); }
    else if(margin >= 0.075){ temp += 0.10; tags.push('high-margin'); }
    else tags.push('mid-margin');
    if(move && move.volatilityScore >= 66){ temp += 0.12; tags.push('volatile'); }
    else if(move && move.volatilityScore <= 36){ temp -= 0.03; tags.push('stable'); }
    if(coherence && coherence.availableCount >= 2 && coherence.score < 56){ temp += 0.08; tags.push('incoherent'); }
    if(coherence && coherence.availableCount >= 2 && coherence.score >= 72){ temp -= 0.03; tags.push('coherent'); }
    if(fav >= 0.64){ temp += 0.05; tags.push('strong-favorite'); }
    if(regime && regime.kind==='soft'){ temp += 0.05; tags.push('soft-books'); }
    if(regime && regime.kind==='efficient'){ temp -= 0.03; tags.push('efficient'); }
    temp = Math.max(0.78, Math.min(1.28, temp));
    var source = phaseEModel && phaseEModel.finalProb && phaseEModel.finalProb.length === fairSet.ensemble.length ? phaseEModel.finalProb : fairSet.ensemble;
    var calibrated = softmaxTemp(source, temp);
    var delta = mean(calibrated.map(function(v, idx){ return Math.abs(v - source[idx]); }));
    var label = temp > 1.08 ? '확률 평탄화' : (temp < 0.94 ? '확률 샤프닝' : '중립 보정');
    return {
      bucketId: tags.join(' · '),
      bucketTemp: temp,
      label: label,
      calibratedProb: calibrated,
      fairOdds: calibrated.map(function(v){ return 1/v; }),
      calibrationPenalty: Math.max(0, (temp-1)*44 + Math.max(0, 62 - ((coherence && coherence.score) || 62))*0.14),
      delta: delta
    };
  }

  function computeJointMarketLayerV22(cur, fairSet, consensus, coherence, sportModel, advancedModel, phaseEModel, bucketCal){
    var base = bucketCal && bucketCal.calibratedProb ? bucketCal.calibratedProb.slice() : fairSet.ensemble.slice();
    var sport = phaseEModel && phaseEModel.finalProb ? phaseEModel.finalProb : (advancedModel && advancedModel.finalProb ? advancedModel.finalProb : (sportModel && sportModel.finalProb ? sportModel.finalProb : base));
    var cons = consensus && consensus.weightedProb && consensus.weightedProb.length === base.length ? consensus.weightedProb.slice() : base.slice();
    var coh = coherence && Number.isFinite(coherence.score) ? coherence.score : 62;
    var wSport = 0.52 + Math.max(0, coh-60)*0.003;
    var wCons = 0.26 + (consensus ? 0.06 : 0);
    var wBase = Math.max(0.12, 1 - wSport - wCons);
    if((cur && cur.market)==='1x2') wCons += 0.03;
    var combined = normalizeProb(base.map(function(v, idx){ return v*wBase + sport[idx]*wSport + cons[idx]*wCons; }));
    var fit = 52 + coh*0.30 + ((consensus && consensus.topBooks && consensus.topBooks.length) ? 7 : 0) - ((bucketCal && bucketCal.calibrationPenalty) || 0)*0.28;
    fit = Math.max(35, Math.min(96, fit));
    var conflict = [];
    if(coherence && coherence.issues && coherence.issues.length) conflict = conflict.concat(coherence.issues.slice(0,2));
    if(consensus && consensus.disagreementScore >= 16) conflict.push('북 간 편차 큼');
    if(bucketCal && bucketCal.bucketTemp > 1.12) conflict.push('시장 상태상 확률 평탄화 필요');
    return {
      jointProb: combined,
      jointFairOdds: combined.map(function(v){ return 1/v; }),
      jointFitScore: fit,
      marketConsistencyScore: coh,
      conflictFlags: conflict.slice(0,3),
      summary: fit >= 78 ? '공동시장 정합 우수' : (fit >= 62 ? '공동시장 정합 보통' : '공동시장 충돌 주의')
    };
  }

  function computeStateSpaceSignalV22(move, consensus, coherence, timingData, bestRow){
    var trend = 50 + Math.max(-22, Math.min(22, ((bestRow && Number.isFinite(bestRow.clvBp) ? bestRow.clvBp : 0) / 2.2))) + (((timingData && timingData.score) || 55)-55)*0.32;
    var shock = Math.max(0, Math.min(100, ((move && move.volatilityScore) || 50)*0.72 + ((move && move.reverseScore) || 40)*0.35));
    var reversion = Math.max(0, Math.min(100, shock*0.58 + Math.max(0, 60-((coherence && coherence.score)||62))*0.45));
    var timing = reversion >= 64 ? 'likely_reversion' : (trend >= 70 ? 'early_value' : (trend >= 58 ? 'confirming_move' : (shock >= 62 ? 'late_entry_risk' : 'neutral')));
    var labelMap = {early_value:'선점 가치',confirming_move:'확인 진입',late_entry_risk:'늦은 진입 위험',likely_reversion:'되돌림 가능성',neutral:'중립'};
    return { trendStrength: Math.max(0, Math.min(100, trend)), shockScore: shock, reversionRisk: reversion, entryWindowLabel: labelMap[timing]||'중립', stateKey: timing };
  }

  function computeRobustStakeV22(bestRow, fairSet, bucketCal, uncertainty, timingData, dominance, jointLayer){
    if(!bestRow) return {finalStakePct:0,label:'보류',reason:'입력 대기',worstCaseEdge:NaN,safetyScore:0};
    var opt = Math.max(0, bestRow.aggressiveEdge || 0);
    var mid = Math.max(0, bestRow.modelEdge || 0);
    var worst = Math.min(bestRow.conservativeEdge || 0, bestRow.robustness && Number.isFinite(bestRow.robustness.worstEdge) ? bestRow.robustness.worstEdge : bestRow.conservativeEdge || 0);
    var baseKelly = Math.max(0, bestRow.kellyFull || 0);
    var safety = 52 + ((bestRow.robustness && bestRow.robustness.score) || 54)*0.26 + (((dominance && dominance.score) || 54)-55)*0.18 - (((uncertainty && uncertainty.penalty) || 0)*0.34) - (((bucketCal && bucketCal.calibrationPenalty) || 0)*0.22);
    safety = Math.max(0, Math.min(100, safety));
    var mult = worst > 0 ? 0.28 : (mid > 0 ? 0.12 : 0);
    if((timingData && timingData.score) >= 74) mult += 0.08;
    if((jointLayer && jointLayer.jointFitScore) >= 78) mult += 0.06;
    if((dominance && dominance.score) < 55) mult = Math.min(mult, 0.12);
    if((uncertainty && uncertainty.confidence) < 58) mult = Math.min(mult, 0.10);
    if((bestRow.robustness && bestRow.robustness.score) < 55) mult = Math.min(mult, 0.08);
    var finalStakePct = baseKelly * Math.max(0, Math.min(0.5, mult));
    if(worst <= 0) finalStakePct = 0;
    var label = finalStakePct <= 0 ? 'PASS' : (finalStakePct < 0.0075 ? 'Quarter 이하' : (finalStakePct < 0.018 ? 'Quarter' : (finalStakePct < 0.035 ? 'Half' : 'Half+')));
    var reason = finalStakePct <= 0 ? '최악 시나리오 엣지가 음수라 비중 0% 권장' : ('최악 시나리오 엣지 '+pct(worst,2)+' · 강건 점수 '+fmt(safety,0));
    return {finalStakePct:finalStakePct,label:label,reason:reason,worstCaseEdge:worst,safetyScore:safety,optimisticEdge:opt,neutralEdge:mid};
  }

  function computeAbstainEngineV22(bestRow, meta, uncertainty, move, coherence, agreement, timingData, dominance, jointLayer, robustStake, stateFlow){
    if(!bestRow) return {action:'PASS',actionLabel:'패스',tier:'D',summaryTag:'입력 대기',reasons:['입력 필요'],score:100};
    var score = 0;
    score += ((uncertainty && uncertainty.penalty) || 0) * 0.90;
    score += Math.max(0, 62-((coherence && coherence.score) || 62))*0.70;
    score += ((move && move.reverseScore) || 0)*0.28;
    score += ((move && move.trapRiskScore) || 0)*0.24;
    score += Math.max(0, 62-((agreement && agreement.overallScore) || 62))*0.55;
    score += Math.max(0, 58-((dominance && dominance.score) || 58))*0.40;
    score += (((stateFlow && stateFlow.reversionRisk) || 0)*0.20);
    if(robustStake && robustStake.finalStakePct<=0) score += 18;
    if(jointLayer && jointLayer.jointFitScore < 62) score += 12;
    score = Math.max(0, Math.min(100, score));
    var action = score >= 68 ? 'PASS' : (score >= 46 ? 'LEAN' : 'BET');
    var label = action==='BET' ? '바로 분석 가능' : (action==='LEAN' ? '선별 진입' : '패스 권장');
    var tier = action==='BET' ? (score < 28 ? 'A' : 'B') : (action==='LEAN' ? 'C' : 'D');
    var reasons = [];
    if(robustStake && robustStake.finalStakePct<=0) reasons.push('worst-case stake 0%');
    if(coherence && coherence.score < 58) reasons.push('시장 정합성 약함');
    if(move && move.reverseScore >= 60) reasons.push('리버스 리스크 높음');
    if(stateFlow && stateFlow.reversionRisk >= 60) reasons.push('되돌림 위험 높음');
    if(agreement && agreement.overallScore < 58) reasons.push('모델 합의 낮음');
    if(uncertainty && uncertainty.confidence < 58) reasons.push('신뢰도 낮음');
    return {action:action, actionLabel:label, tier:tier, summaryTag:(action==='BET'?'다층 엔진 통과':action==='LEAN'?'추가 확인 필요':'보류 권장'), reasons:reasons.slice(0,4), score:score};
  }

  function compactSummaryLinesV22(bestRow, meta, jointLayer, bucketCal, robustStake, abstain, stateFlow){
    var out = [];
    if(bestRow) out.push(bestRow.label + ' 기준 최종 공정확률 ' + pct(bestRow.finalProb,1) + ' · 공정배당 ' + fmt(bestRow.fair,2));
    if(jointLayer) out.push('공동시장 적합도 ' + fmt(jointLayer.jointFitScore,0) + '점 · ' + jointLayer.summary);
    if(bucketCal) out.push('상태별 보정 ' + bucketCal.label + ' · temp ' + fmt(bucketCal.bucketTemp,2));
    if(robustStake) out.push('강건 비중 ' + pct(robustStake.finalStakePct,2) + ' · ' + robustStake.reason);
    if(abstain) out.push('최종 행동 ' + abstain.actionLabel + ' · Tier ' + abstain.tier);
    if(stateFlow) out.push('무브 해석 ' + stateFlow.entryWindowLabel + ' · 추세 ' + fmt(stateFlow.trendStrength,0));
    return out.slice(0,5);
  }

  function summaryLines(bestRow, uncertainty, move, labels, ensembleProb, consensus, calibration, regime, meta, sportModel, advancedModel, phaseEModel, coherence, bookMemory, fairSet, methodMemory, agreement, timingData, dominance){
    var lines = [];
    if(bestRow){
      lines.push(bestRow.label + '은(는) Phase E까지 반영된 최종 공정확률 ' + pct(bestRow.finalProb,1) + ' 기준으로 가장 높은 가치 점수를 기록했습니다.');
      if(Number.isFinite(bestRow.offer)) lines.push('현재 기준 배당 ' + fmt(bestRow.offer,2) + '와 공정배당 ' + fmt(bestRow.fair,2) + ' 차이를 반영한 Edge Score는 ' + fmt(bestRow.edgeScore,0) + '점이며 등급은 ' + bestRow.grade + ' 입니다.');
      if(Number.isFinite(bestRow.clvBp)) lines.push('예상 마감 대비 CLV 잠재력은 ' + fmt(bestRow.clvBp,0) + 'bp로, 현재 판단은 ' + (bestRow.priceTimingLabel==='take_now' ? '선점 우세' : bestRow.priceTimingLabel==='wait' ? '대기 우세' : '중립') + ' 입니다.');
    }
    if(consensus) lines.push('가중 컨센서스는 상위 북 ' + consensus.topBooks.map(function(r){ return r.book; }).slice(0,3).join(', ') + ' 의 비중을 높여 계산했습니다.');
    if(calibration) lines.push('캘리브레이션은 temperature ' + fmt(calibration.temp,2) + ' · consensus blend ' + pct(calibration.blendWeight,1) + ' 기준으로 과도한 확신을 조정했습니다.');
    if(methodMemory && Number.isFinite(methodMemory.avgScore)) lines.push('방법 메모리 평균은 ' + fmt(methodMemory.avgScore,0) + '점이며, 최근 시장 구조에 더 잘 맞는 비그 제거 방식의 비중을 자동으로 높였습니다.');
    if(agreement && Number.isFinite(agreement.overallScore)) lines.push('모델 간 합의 점수는 ' + fmt(agreement.overallScore,0) + '점으로, 선택지별 확률 일치도를 추가로 반영했습니다.');
    if(timingData) lines.push('진입 타이밍 점수는 ' + fmt(timingData.score,0) + '점으로 현재 권장 액션은 ' + timingData.actionLabel + ' 입니다.');
    if(bestRow && bestRow.robustness) lines.push('스트레스 테스트 내구도는 ' + fmt(bestRow.robustness.score,0) + '점이며, 시나리오 생존율은 ' + pct(bestRow.robustness.positiveRate,0) + ' 입니다.');
    if(dominance) lines.push('탑픽 우위 점수는 ' + fmt(dominance.score,0) + '점 (' + dominance.label + ')으로, 차순위 선택은 ' + dominance.runnerUp + ' 입니다.');
    if(meta) lines.push('메타 판단은 ' + meta.actionLabel + ' / Tier ' + meta.tier + ' 이며, 시장 상태는 ' + regime.label + ' 로 해석됩니다.');
    if(coherence && coherence.availableCount >= 2) lines.push('크로스마켓 정합성 점수는 ' + fmt(coherence.score,0) + '점 (' + coherence.label + ')이며, 추가 시장 ' + coherence.availableCount + '개를 함께 비교했습니다.');
    if(bookMemory && Number.isFinite(bookMemory.avgScore)) lines.push('북메이커 신뢰도 메모리 평균은 ' + fmt(bookMemory.avgScore,0) + '점으로, 장기적으로 시장 합의와 잘 맞는 북의 비중을 점진적으로 높입니다.');
    if(sportModel) lines.push('종목 레이어는 ' + sportModel.modelName + ' 기준으로 ' + pct(sportModel.blendWeight,1) + ' 비중을 반영했고, 적합도는 ' + sportModel.fitLabel + ' 입니다.');
    if(advancedModel) lines.push('추가 분포 모델은 ' + advancedModel.modelName + ' 기준으로 ' + pct(advancedModel.blendWeight,1) + ' 비중을 더해 최종 확률을 미세 조정했습니다.');
    if(phaseEModel) lines.push('Phase E 고급 입력 레이어는 ' + phaseEModel.modelName + ' 기준으로 ' + pct(phaseEModel.blendWeight,1) + ' 비중을 적용했습니다.');
    if(fairSet && fairSet.dynamicLabel) lines.push('동적 앙상블은 ' + fairSet.dynamicLabel + ' 프로파일로 Shin·Odds Ratio·Power 비중을 자동 조정했습니다.');
    if(move.reverseScore >= 55) lines.push('오즈 무브는 역행 가능성이 있어 과한 비중 확대는 피하는 편이 좋습니다.');
    else if(move.steamScore >= 60) lines.push('최근 가격 흐름은 비교적 깨끗한 방향성을 보이며 추세 추종에 우호적입니다.');
    if(uncertainty.flags.length) lines.push('불확실성 요인은 ' + uncertainty.flags.join(' · ') + ' 입니다.');
    return lines.slice(0,4);
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
    ensurePhaseEControls();
    var cur = readCurrent();
    syncPhaseEControlsSport(cur.sport);
    if(!cur.odds || cur.odds.length < 2){ mount.innerHTML = ''; return; }
    var labels = labelsForMarket(cur.market);
    var fairSet = fairEnsembleSet(cur.odds);
    if(!fairSet){ mount.innerHTML = ''; return; }
    var methods = fairSet.methods;
    var consensus = parseConsensus();
    var openData = parseOpen();
    var coherence = computeCrossMarketCoherence(cur);
    var preMove = computeMoveMetrics(cur.odds, fairSet.ensemble, openData, consensus);
    var preUncertainty = computeUncertainty(consensus, methods, openData, cur.odds);
    var methodMemory = methodMemoryFactors(cur, fairSet.margin);
    fairSet = refineEnsembleByContext(cur, fairSet, consensus, preMove, preUncertainty, coherence, methodMemory);
    var bestOdds = consensus && consensus.bestOdds && consensus.bestOdds.length === cur.odds.length ? consensus.bestOdds : cur.odds.slice();
    var move = computeMoveMetrics(cur.odds, fairSet.ensemble, openData, consensus);
    var uncertainty = computeUncertainty(consensus, methods, openData, cur.odds);
    var regime = detectMarketRegime(cur, fairSet, consensus, move, uncertainty);
    var settings = collectPhaseESettings();
    var calibration = calibrateProbabilities(cur, fairSet, consensus, move, uncertainty, regime);
    if(consensus && consensus.weightedProb && consensus.weightedProb.length === calibration.calibratedProb.length && settings.consensusLean){
      var extraBlend = Math.max(-0.08, Math.min(0.08, settings.consensusLean/120));
      if(extraBlend > 0){
        calibration.calibratedProb = normalizeProb(calibration.calibratedProb.map(function(p, idx){ return p*(1-extraBlend) + consensus.weightedProb[idx]*extraBlend; }));
      } else if(extraBlend < 0){
        calibration.calibratedProb = flattenProbabilities(calibration.calibratedProb, Math.abs(extraBlend));
      }
      calibration.fairOdds = calibration.calibratedProb.map(function(v){ return 1/v; });
    }
    var sportModel = computeSportSpecificModel(cur, fairSet, consensus, move, uncertainty, calibration, regime);
    var advancedModel = computeAdvancedSportModel(cur, sportModel, calibration, consensus, move, uncertainty);
    var phaseEModel = computePhaseEModel(cur, calibration, sportModel, advancedModel, consensus, move, uncertainty, settings);
    methodMemory = updateMethodMemory(cur, fairSet, consensus, move, uncertainty, coherence, phaseEModel) || methodMemory;
    var agreement = computeMethodAgreement(methods);
    var bookMemory = consensus ? {avgScore: consensus.memoryAvgScore || 50, topBooks: consensus.memoryTopBooks || []} : null;
    var edgeRows = computeEdgeRows(labels, cur.odds, bestOdds, fairSet.ensemble, fairSet.conservative, fairSet.aggressive, consensus, move, uncertainty, calibration, regime, sportModel, advancedModel, phaseEModel, coherence, bookMemory, methodMemory, agreement);
    edgeRows = applyRobustnessToRows(edgeRows, move, uncertainty, consensus, coherence, agreement);
    var bestRow = edgeRows.slice().sort(function(a,b){ return b.edgeScore - a.edgeScore; })[0] || null;
    var dominance = computeDominanceProfile(bestRow, edgeRows);
    var finalTargetProb = bestRow ? edgeRows.map(function(r){ return r.finalProb; }) : null;
    if(consensus && finalTargetProb) bookMemory = updateBookMemory(consensus, finalTargetProb) || bookMemory;
    updateMarketMemory(cur, fairSet, coherence);
    var timingData = computeEntryTiming(bestRow, move, uncertainty, consensus, regime, coherence, bookMemory, methodMemory, agreement, bestRow && bestRow.robustness, dominance);
    var meta = computeMetaDecision(bestRow, uncertainty, move, consensus, regime, calibration, coherence, bookMemory, methodMemory, agreement, timingData, bestRow && bestRow.robustness, dominance);
    var bucketCal = computeBucketCalibrationV22(cur, fairSet, move, uncertainty, coherence, consensus, regime, phaseEModel);
    var jointLayer = computeJointMarketLayerV22(cur, fairSet, consensus, coherence, sportModel, advancedModel, phaseEModel, bucketCal);
    var stateFlow = computeStateSpaceSignalV22(move, consensus, coherence, timingData, bestRow);
    var robustStake = computeRobustStakeV22(bestRow, fairSet, bucketCal, uncertainty, timingData, dominance, jointLayer);
    if(bestRow && robustStake){ bestRow.recommendedStakePct = robustStake.finalStakePct; bestRow.stakeReason = robustStake.reason; }
    var abstain = computeAbstainEngineV22(bestRow, meta, uncertainty, move, coherence, agreement, timingData, dominance, jointLayer, robustStake, stateFlow);
    if(meta && abstain){
      meta.actionLabel = abstain.actionLabel;
      meta.tier = abstain.tier;
      meta.summaryTag = abstain.summaryTag;
      meta.noBet = abstain.action === 'PASS';
      meta.reasons = abstain.reasons;
      meta.timingLabel = stateFlow.entryWindowLabel;
    }
    var lines = summaryLines(bestRow, uncertainty, move, labels, fairSet.ensemble, consensus, calibration, regime, meta, sportModel, advancedModel, phaseEModel, coherence, bookMemory, fairSet, methodMemory, agreement, timingData, dominance);
    var compactLinesV22 = compactSummaryLinesV22(bestRow, meta, jointLayer, bucketCal, robustStake, abstain, stateFlow);

    var methodLabelMap = {norm:'정규화',power:'파워',add:'가산',udog:'언더독 보정',shin:'Shin',oddsRatio:'Odds Ratio',logit:'Logit'};
    var methodRows = ['norm','power','add','udog','shin','oddsRatio','logit'].map(function(key){
      var res = methods[key]; var mem = methodMemory && methodMemory.methods ? methodMemory.methods[key] : null; var factor = methodMemory && methodMemory.factors ? methodMemory.factors[key] : null;
      return '<tr><td>'+htmlEscape(methodLabelMap[key]||key)+'</td><td>'+res.fairOdds.map(function(v){ return fmt(v,2); }).join(' / ')+'</td><td>'+res.p.map(function(v){ return pct(v,2); }).join(' / ')+'</td><td>'+fmt(mem && mem.score,0)+'</td><td>'+fmt(factor,2)+'</td></tr>';
    }).join('');

    var edgeTable = edgeRows.map(function(r){
      var tone = r.grade==='Strong Value' ? 'ae-good' : (r.grade==='Playable' ? 'ae-mid' : (r.grade==='Thin Edge' ? 'ae-warn' : 'ae-bad'));
      return '<tr'+(bestRow && r.idx===bestRow.idx?' class="ae-best"':'')+'>'+
        '<td>'+htmlEscape(r.label)+'</td>'+
        '<td>'+fmt(r.offer,2)+'</td>'+
        '<td>'+fmt(r.fair,2)+'</td>'+
        '<td class="'+tone+'">'+pct(r.modelEdge,2)+'</td>'+
        '<td>'+fmt(r.edgeScore,0)+'</td>'+
        '<td>'+fmt(r.selectionAgreement,0)+'</td>'+
        '<td>'+htmlEscape(r.grade)+'</td>'+
        '<td>'+pct(r.recommendedStakePct,2)+'</td>'+
        '</tr>';
    }).join('');

    var consensusTable = consensus ? consensus.rows.map(function(r){
      return '<tr>'+
        '<td>'+htmlEscape(r.book)+'</td>'+
        '<td>'+htmlEscape(r.meta.sharpTier)+'</td>'+
        '<td>'+fmt(r.weight,2)+'</td>'+
        '<td>'+pct(r.margin,2)+'</td>'+
        '<td>'+fmt(r.memoryScore||50,0)+'</td>'+
        '<td>'+r.prob.map(function(v){ return pct(v,2); }).join(' / ')+'</td>'+
        '</tr>';
    }).join('') : '<tr><td colspan="6">여러 북 배당을 붙여넣으면 가중 컨센서스가 계산됩니다.</td></tr>';

    var fairBands = labels.map(function(label, idx){
      return '<tr'+(bestRow && idx===bestRow.idx?' class=\"ae-best\"':'')+'><td>'+htmlEscape(label)+'</td><td>'+pct(fairSet.conservative[idx],2)+'</td><td>'+pct(fairSet.ensemble[idx],2)+'</td><td>'+pct(fairSet.aggressive[idx],2)+'</td><td>'+fmt(calibration.fairOdds[idx],2)+'</td></tr>';
    }).join('');

    var moveRows = labels.map(function(label, idx){
      var openFair = move.openFair && move.openFair.p[idx];
      return '<tr'+(bestRow && idx===bestRow.idx?' class="ae-best"':'')+'>'+
        '<td>'+htmlEscape(label)+'</td>'+
        '<td>'+(Number.isFinite(openFair) ? pct(openFair,2) : '—')+'</td>'+
        '<td>'+pct(fairSet.ensemble[idx],2)+'</td>'+
        '<td>'+(Number.isFinite(move.trendProb[idx]) ? (move.trendProb[idx] >= 0 ? '+' : '') + pct(move.trendProb[idx],2) : '—')+'</td>'+
        '<td>'+fmt(move.expectedClosingOdds[idx],2)+'</td>'+
        '<td>'+(Number.isFinite(move.clvPotentialBp[idx]) ? fmt(move.clvPotentialBp[idx],0)+'bp' : '—')+'</td>'+
        '</tr>';
    }).join('');

    var calibrationRows = labels.map(function(label, idx){
      return '<tr'+(bestRow && idx===bestRow.idx?' class=\"ae-best\"':'')+'><td>'+htmlEscape(label)+'</td><td>'+pct(fairSet.ensemble[idx],2)+'</td><td>'+pct(calibration.calibratedProb[idx],2)+'</td><td>'+pct(sportModel.finalProb[idx],2)+'</td><td>'+(consensus ? pct(consensus.weightedProb[idx],2) : '—')+'</td><td>'+fmt(sportModel.fairOdds[idx],2)+'</td></tr>';
    }).join('');

    var sportRows = labels.map(function(label, idx){
      return '<tr'+(bestRow && idx===bestRow.idx?' class="ae-best"':'')+'><td>'+htmlEscape(label)+'</td><td>'+pct(calibration.calibratedProb[idx],2)+'</td><td>'+pct(sportModel.sportProb[idx],2)+'</td><td>'+pct(sportModel.finalProb[idx],2)+'</td><td>'+fmt(sportModel.fairOdds[idx],2)+'</td></tr>';
    }).join('');

    var advancedRows = advancedModel ? labels.map(function(label, idx){
      return '<tr'+(bestRow && idx===bestRow.idx?' class="ae-best"':'')+'><td>'+htmlEscape(label)+'</td><td>'+pct(sportModel.finalProb[idx],2)+'</td><td>'+pct(advancedModel.advancedProb[idx],2)+'</td><td>'+pct(advancedModel.finalProb[idx],2)+'</td><td>'+fmt(advancedModel.fairOdds[idx],2)+'</td></tr>';
    }).join('') : '';
    var advancedMetrics = advancedModel && advancedModel.metrics && advancedModel.metrics.length ? advancedModel.metrics.map(function(pair){ return '<div class="ae-box"><div class="k">'+htmlEscape(pair[0])+'</div><div class="v">'+htmlEscape(pair[1])+'</div><div class="s">분포 모델 출력</div></div>'; }).join('') : '';
    var phaseERows = phaseEModel ? labels.map(function(label, idx){
      return '<tr'+(bestRow && idx===bestRow.idx?' class="ae-best"':'')+'><td>'+htmlEscape(label)+'</td><td>'+pct((advancedModel && advancedModel.finalProb ? advancedModel.finalProb[idx] : sportModel.finalProb[idx]),2)+'</td><td>'+pct(phaseEModel.phaseEProb[idx],2)+'</td><td>'+pct(phaseEModel.finalProb[idx],2)+'</td><td>'+fmt(phaseEModel.fairOdds[idx],2)+'</td></tr>';
    }).join('') : '';
    var phaseEMetrics = phaseEModel && phaseEModel.metrics && phaseEModel.metrics.length ? phaseEModel.metrics.map(function(pair){ return '<div class="ae-box"><div class="k">'+htmlEscape(pair[0])+'</div><div class="v">'+htmlEscape(pair[1])+'</div><div class="s">Phase E 출력</div></div>'; }).join('') : '';
    var robustnessRows = edgeRows.map(function(r){
      return '<tr'+(bestRow && r.idx===bestRow.idx?' class="ae-best"':'')+'><td>'+htmlEscape(r.label)+'</td><td>'+fmt(r.robustness && r.robustness.score,0)+'</td><td>'+pct(r.robustness && r.robustness.positiveRate,0)+'</td><td>'+pct(r.robustness && r.robustness.worstEdge,2)+'</td><td>'+htmlEscape(r.robustness && r.robustness.label || '—')+'</td><td>'+fmt(r.robustness && r.robustness.pressure,0)+'</td></tr>';
    }).join('');
    var riskFlags = uncertainty.flags.length ? uncertainty.flags.map(function(flag){ return '<span class="ae-flag">'+htmlEscape(flag)+'</span>'; }).join('') : '<span class="ae-flag">리스크 플래그 없음</span>';
    var marketLine = (cur.market === 'ou' || cur.market === 'handicap') && Number.isFinite(cur.line) ? ' · 라인 ' + fmt(cur.line,2) : '';
    var bestEdgeName = bestRow ? bestRow.label : '—';

    mount.innerHTML = [
      '<section class="ae-sheet ae-card">',
      '  <div class="ae-sheet-grid">',
      '    <div class="ae-sheet-main">',
      '      <div class="ae-kicker">88ST · ONE PAGE REPORT</div>',
      '      <h2 class="ae-title ae-sheet-title">한 장 요약 배당 분석 리포트</h2>',
      '      <p class="ae-sub ae-sheet-sub">여러 카드로 흩어진 결과를 한 장의 보고서처럼 압축했습니다. 핵심 판단, 공동시장 적합, 상태별 보정, 강건 비중, 무브 해석을 먼저 보고 상세 로직은 아래에서 펼칠 수 있습니다.</p>',
      '      <div class="ae-sheet-action">',
      '        <div class="ae-sheet-actionbox"><span class="k">최종 행동</span><strong>'+htmlEscape(meta.actionLabel)+'</strong><em>'+htmlEscape(meta.tier+' · '+((abstain && abstain.summaryTag) || meta.summaryTag))+'</em></div>',
      '        <div class="ae-sheet-actionbox"><span class="k">탑픽</span><strong>'+htmlEscape(bestEdgeName)+'</strong><em>'+(bestRow ? htmlEscape(bestRow.grade)+' · '+pct(bestRow.finalProb,1) : '—')+'</em></div>',
      '        <div class="ae-sheet-actionbox"><span class="k">권장 비중</span><strong>'+(robustStake ? pct(robustStake.finalStakePct,2) : (bestRow ? pct(bestRow.recommendedStakePct,2) : '—'))+'</strong><em>'+htmlEscape((robustStake && robustStake.label) || '자동 감산')+'</em></div>',
      '      </div>',
      '      <div class="ae-sheet-lines">'+compactLinesV22.map(function(line){ return '<div class="ae-item"><p>'+htmlEscape(line)+'</p></div>'; }).join('')+'</div>',
      '    </div>',
      '    <div class="ae-sheet-side">',
      '      <div class="ae-kv cols4 ae-sheet-kpis">',
      '        <div class="ae-box"><div class="k">Joint Fit</div><div class="v">'+fmt(jointLayer.jointFitScore,0)+'</div><div class="s">'+htmlEscape(jointLayer.summary)+'</div></div>',
      '        <div class="ae-box"><div class="k">Bucket</div><div class="v">'+htmlEscape(bucketCal.label)+'</div><div class="s">'+htmlEscape(bucketCal.bucketId)+'</div></div>',
      '        <div class="ae-box"><div class="k">State Flow</div><div class="v">'+htmlEscape(stateFlow.entryWindowLabel)+'</div><div class="s">추세 '+fmt(stateFlow.trendStrength,0)+' · 회귀 '+fmt(stateFlow.reversionRisk,0)+'</div></div>',
      '        <div class="ae-box"><div class="k">Abstain</div><div class="v">'+fmt(abstain.score,0)+'</div><div class="s">'+htmlEscape(abstain.action==='BET'?'진입 가능':abstain.action==='LEAN'?'선별 진입':'보류 우세')+'</div></div>',
      '      </div>',
      '      <div class="ae-flags">'+((jointLayer.conflictFlags && jointLayer.conflictFlags.length)?jointLayer.conflictFlags.map(function(v){ return '<span class="ae-flag">'+htmlEscape(v)+'</span>'; }).join(''):'<span class="ae-flag">공동시장 충돌 신호 없음</span>')+'</div>',
      '    </div>',
      '  </div>',
      '  <div class="ae-sheet-table-wrap">',
      '    <table class="ae-table ae-tight ae-sheet-table"><thead><tr><th>선택</th><th>기준배당</th><th>최종확률</th><th>Joint Prob</th><th>Edge</th><th>강건비중</th><th>판단</th></tr></thead><tbody>'+edgeRows.map(function(r){ return '<tr'+(bestRow && r.idx===bestRow.idx?' class="ae-best"':'')+'><td>'+htmlEscape(r.label)+'</td><td>'+fmt(r.offer,2)+'</td><td>'+pct(r.finalProb,2)+'</td><td>'+pct((jointLayer.jointProb&&jointLayer.jointProb[r.idx])||r.finalProb,2)+'</td><td>'+fmt(r.edgeScore,0)+'</td><td>'+(bestRow && r.idx===bestRow.idx && robustStake ? pct(robustStake.finalStakePct,2) : pct(r.recommendedStakePct,2))+'</td><td>'+htmlEscape((bestRow && r.idx===bestRow.idx && abstain ? abstain.action : r.grade))+'</td></tr>'; }).join('')+'</tbody></table>',
      '  </div>',
      '  <div class="ae-callout ae-sheet-note">'+htmlEscape((robustStake && robustStake.reason) || '강건 비중 엔진은 보수·중립·역풍 시나리오를 동시에 반영합니다.')+'</div>',
      '</section>',
      '<details class="ae-deep" id="aeDeepDive">',
      '  <summary><span>세부 모델 · 수식 근거 · 비교표 펼치기</span><span class="ae-deep-hint">필요할 때만 보기</span></summary>',
      '<section class="ae-card">',
      '  <div class="ae-head">',
      '    <div>',
      '      <div class="ae-kicker">88ST · Quant Edge Engine</div>',
      '      <h2 class="ae-title">수학 · 시장 · AI 해석 엔진</h2>',
      '      <p class="ae-sub">기존 공정확률 계산 위에 가중 컨센서스, 캘리브레이션, 클로징 예측, 메타 판단, 자동 Fractional Kelly, 종목별 분포 모델, Phase E 고급 입력, 적응형 방법 메모리, 진입 타이밍 엔진과 스트레스 테스트·우위도 레이어까지 추가했습니다.</p>',
      '    </div>',
      '    <div class="ae-pills">',
      '      <span class="ae-pill">'+htmlEscape(cur.market.toUpperCase())+marketLine+'</span>',
      '      <span class="ae-pill">프로필 '+htmlEscape(fairSet.profile)+'</span>',
      '      <span class="ae-pill">Top Pick '+htmlEscape(bestEdgeName)+'</span>',
      '      <span class="ae-pill">Sport Layer '+htmlEscape(sportModel.shortLabel)+'</span>',
      '      <span class="ae-pill">Phase E '+htmlEscape(phaseEModel ? phaseEModel.shortLabel : 'Ready')+'</span>',
      '      <span class="ae-pill">Timing '+htmlEscape(timingData.actionLabel)+'</span>',
      '      <span class="ae-pill">Method Memory '+fmt(methodMemory && methodMemory.avgScore,0)+'</span>',
      '    </div>',
      '  </div>',
      '  <div class="ae-kv cols6">',
      '    <div class="ae-box"><div class="k">Margin</div><div class="v">'+pct(fairSet.margin,2)+'</div><div class="s">현재 시장 마진</div></div>',
      '    <div class="ae-box"><div class="k">Regime</div><div class="v">'+htmlEscape(regime.label)+'</div><div class="s">'+htmlEscape(regime.note)+'</div></div>',
      '    <div class="ae-box"><div class="k">Edge Score</div><div class="v">'+(bestRow ? fmt(bestRow.edgeScore,0) : '—')+'</div><div class="s">최상단 선택 기준</div></div>',
      '    <div class="ae-box"><div class="k">Action / Tier</div><div class="v">'+htmlEscape(meta.actionLabel+' · '+meta.tier)+'</div><div class="s">'+htmlEscape(meta.summaryTag)+'</div></div>',
      '    <div class="ae-box"><div class="k">Confidence</div><div class="v">'+fmt(uncertainty.confidence,0)+'</div><div class="s">불확실성 감산 반영</div></div>',
      '    <div class="ae-box"><div class="k">Recommended Stake</div><div class="v">'+(bestRow ? pct(bestRow.recommendedStakePct,2) : '—')+'</div><div class="s">자동 감산 Kelly</div></div>',
      '  </div>',
      '</section>',
      '<section class="ae-grid cols2">',
      '  <div class="ae-card">',
      '    <div class="ae-head"><div><div class="ae-kicker">Fair Probability Bands</div><h3 class="ae-title ae-title-sm">보수·중립·공격 공정확률</h3></div></div>',
      '    <table class="ae-table"><thead><tr><th>선택</th><th>보수적</th><th>중립</th><th>공격적</th><th>중립 공정배당</th></tr></thead><tbody>'+fairBands+'</tbody></table>',
      '    <div class="ae-callout">시장 마진과 선택지 수에 따라 가중치를 다르게 주는 앙상블을 적용했습니다. 고마진 시장에서는 과도한 확신을 자동으로 눌러줍니다.</div>',
      '  </div>',
      '  <div class="ae-card">',
      '    <div class="ae-head"><div><div class="ae-kicker">AI Summary</div><h3 class="ae-title ae-title-sm">3줄 핵심 요약</h3></div></div>',
      '    <div class="ae-list">'+lines.map(function(line){ return '<div class="ae-item"><p>'+htmlEscape(line)+'</p></div>'; }).join('')+'</div>',
      '    <div class="ae-flags">'+riskFlags+'</div>',
      '  </div>',
      '</section>',
      '<section class="ae-grid cols2">',
      '  <div class="ae-card">',
      '    <div class="ae-head"><div><div class="ae-kicker">Calibration Layer</div><h3 class="ae-title ae-title-sm">앙상블 → 캘리브레이션 보정</h3><p class="ae-sub">temperature scaling과 consensus blend로 과도한 확신을 눌러 실제 적중 빈도에 더 가까운 확률로 정리합니다.</p></div></div>',
      '    <div class="ae-kv cols4">',
      '      <div class="ae-box"><div class="k">Temperature</div><div class="v">'+fmt(calibration.temp,2)+'</div><div class="s">1보다 크면 확률 분포를 평탄화</div></div>',
      '      <div class="ae-box"><div class="k">Consensus Blend</div><div class="v">'+pct(calibration.blendWeight,1)+'</div><div class="s">시장 합의 반영 비율</div></div>',
      '      <div class="ae-box"><div class="k">Calibration Shift</div><div class="v">'+pct(calibration.calibrationShift,2)+'</div><div class="s">앙상블 대비 이동량</div></div>',
      '      <div class="ae-box"><div class="k">Top Calibrated Prob</div><div class="v">'+pct(calibration.topProb,1)+'</div><div class="s">최상단 선택 보정 확률</div></div>',
      '    </div>',
      '    <table class="ae-table ae-tight"><thead><tr><th>선택</th><th>Ensemble</th><th>Calibrated</th><th>Sport Final</th><th>Consensus</th><th>공정배당</th></tr></thead><tbody>'+calibrationRows+'</tbody></table>',
      '  </div>',
      '  <div class="ae-card">',
      '    <div class="ae-head"><div><div class="ae-kicker">Meta Decision</div><h3 class="ae-title ae-title-sm">행동 필터 · No-Bet 게이트</h3><p class="ae-sub">Edge Score, CLV, volatility, uncertainty를 합쳐 BET / LEAN / PASS를 결정합니다.</p></div></div>',
      '    <div class="ae-kv cols4">',
      '      <div class="ae-box"><div class="k">Action</div><div class="v">'+htmlEscape(meta.actionLabel)+'</div><div class="s">최종 행동 제안</div></div>',
      '      <div class="ae-box"><div class="k">Tier</div><div class="v">'+htmlEscape(meta.tier)+'</div><div class="s">신뢰 등급</div></div>',
      '      <div class="ae-box"><div class="k">Efficiency</div><div class="v">'+fmt(regime.efficiencyScore,0)+'</div><div class="s">시장 효율도</div></div>',
      '      <div class="ae-box"><div class="k">Caution</div><div class="v">'+fmt(regime.cautionScore,0)+'</div><div class="s">주의도</div></div>',
      '    </div>',
      '    <div class="ae-flags">'+meta.reasons.map(function(reason){ return '<span class="ae-flag">'+htmlEscape(reason)+'</span>'; }).join('')+'</div>',
      '    <div class="ae-callout">'+htmlEscape(regime.note)+' '+htmlEscape(meta.noBet ? '현재 상태에서는 No-Bet 필터가 우선됩니다.' : '현재 상태에서는 선택적 진입이 가능한 구간으로 해석됩니다.')+'</div>',
      '  </div>',
      '</section>',
      '<section class="ae-card">',
      '  <div class="ae-head"><div><div class="ae-kicker">Sport-Specific Layer</div><h3 class="ae-title ae-title-sm">종목 특화 휴리스틱 보정</h3><p class="ae-sub">팀/선수 외부 데이터 없이도 종목별 시장 미세구조 차이를 약하게 반영해 최종 공정확률을 보수적으로 보정합니다.</p></div></div>',
      '  <div class="ae-kv cols4">',
      '    <div class="ae-box"><div class="k">Model</div><div class="v">'+htmlEscape(sportModel.shortLabel)+'</div><div class="s">'+htmlEscape(sportModel.modelName)+'</div></div>',
      '    <div class="ae-box"><div class="k">Blend Weight</div><div class="v">'+pct(sportModel.blendWeight,1)+'</div><div class="s">캘리브레이션 위 추가 비중</div></div>',
      '    <div class="ae-box"><div class="k">Sport Confidence</div><div class="v">'+fmt(sportModel.confidence,0)+'</div><div class="s">외부 데이터 없는 상태 기준</div></div>',
      '    <div class="ae-box"><div class="k">Fit</div><div class="v">'+htmlEscape(sportModel.fitLabel)+'</div><div class="s">현재 마켓 적합도</div></div>',
      '  </div>',
      '  <div class="ae-flags">'+sportModel.featureBadges.map(function(b){ return '<span class="ae-flag">'+htmlEscape(b)+'</span>'; }).join('')+'</div>',
      '  <table class="ae-table ae-tight"><thead><tr><th>선택</th><th>Calibrated</th><th>Sport Prob</th><th>Final Prob</th><th>Final Fair Odds</th></tr></thead><tbody>'+sportRows+'</tbody></table>',
      '  <div class="ae-callout">'+htmlEscape((sportModel.notes[0] || '종목별 보정 설명 없음') + ' ' + sportModel.caveat)+'</div>',
      '</section>',
      (advancedModel ? '<section class="ae-card">'+
      '  <div class="ae-head"><div><div class="ae-kicker">Phase D Distribution Layer</div><h3 class="ae-title ae-title-sm">종목별 분포 모델 · 추가 파라메트릭 보정</h3><p class="ae-sub">시장 확률을 득점/마진/세트 분포로 역산해 마지막 미세 보정을 수행합니다. 외부 팀·선수 데이터 없이도 현재 라인 구조를 더 깊게 해석하기 위한 레이어입니다.</p></div></div>'+
      '  <div class="ae-kv cols4">'+advancedMetrics+'</div>'+
      '  <table class="ae-table ae-tight"><thead><tr><th>선택</th><th>Sport Final</th><th>Distribution Prob</th><th>Phase D Final</th><th>Phase D Fair Odds</th></tr></thead><tbody>'+advancedRows+'</tbody></table>'+
      '  <div class="ae-callout">'+htmlEscape((advancedModel.notes[0] || '분포 모델 설명 없음') + ' ' + advancedModel.caveat)+'</div>'+
      '</section>' : ''),
      (phaseEModel ? '<section class="ae-card">'+
      '  <div class="ae-head"><div><div class="ae-kicker">Phase E Advanced Layer</div><h3 class="ae-title ae-title-sm">고급 입력 · 종목별 심화 모델</h3><p class="ae-sub">축구 Dixon-Coles, 농구 alt line/total, 야구 선발·불펜·구장, 테니스 surface/hold 입력을 반영한 심화 레이어입니다.</p></div></div>'+
      '  <div class="ae-kv cols4">'+phaseEMetrics+'</div>'+
      '  <table class="ae-table ae-tight"><thead><tr><th>선택</th><th>Phase D Final</th><th>Phase E Model</th><th>Phase E Final</th><th>Phase E Fair Odds</th></tr></thead><tbody>'+phaseERows+'</tbody></table>'+
      (phaseEModel.extrasHtml || '') +
      '  <div class="ae-callout">'+htmlEscape((phaseEModel.notes[0] || 'Phase E 설명 없음') + ' ' + phaseEModel.caveat)+'</div>'+
      '</section>' : ''),
      '<section class="ae-grid cols2">',
      '  <div class="ae-card">',
      '    <div class="ae-head"><div><div class="ae-kicker">Efficiency Layer</div><h3 class="ae-title ae-title-sm">동적 앙상블 · 크로스마켓 정합성</h3><p class="ae-sub">외부 데이터 없이도 현재 시장 구조만으로 방식 가중치와 시장 간 정합성을 자동 점검합니다.</p></div></div>',
      '    <div class="ae-kv cols4">',
      '      <div class="ae-box"><div class="k">Dynamic Profile</div><div class="v">'+htmlEscape(fairSet.dynamicLabel || '균형형')+'</div><div class="s">마진·변동성·정합성 기준 자동 선택</div></div>',
      '      <div class="ae-box"><div class="k">Coherence Score</div><div class="v">'+fmt(coherence.score,0)+'</div><div class="s">'+htmlEscape(coherence.label)+'</div></div>',
      '      <div class="ae-box"><div class="k">Markets Compared</div><div class="v">'+fmt(coherence.availableCount||1,0)+'</div><div class="s">함께 입력된 시장 수</div></div>',
      '      <div class="ae-box"><div class="k">Market Memory</div><div class="v">'+(bookMemory ? fmt(bookMemory.avgScore,0) : '—')+'</div><div class="s">북 신뢰도 메모리 평균</div></div>',
      '    </div>',
      '    <div class="ae-callout">'+htmlEscape((coherence.notes && coherence.notes[0]) || '동일 경기의 1X2 / 핸디 / O/U를 함께 입력하면 정합성 검사가 더 정확해집니다.')+'</div>',
      '    <table class="ae-table ae-tight"><thead><tr><th>Method</th><th>Weight</th><th>역할</th></tr></thead><tbody>'+
      Object.keys(fairSet.dynamicWeights || fairSet.profileWeights.neutral || {}).map(function(key){ var role = key==='shin'||key==='oddsRatio'?'저마진·샤프 구조':'power'===key||'add'===key?'고마진 방어':'기본 안정화'; return '<tr><td>'+htmlEscape(key)+'</td><td>'+pct((fairSet.dynamicWeights||fairSet.profileWeights.neutral||{})[key]||0,1)+'</td><td>'+htmlEscape(role)+'</td></tr>'; }).join('')+
      '</tbody></table>',
      '    <div class="ae-flags">'+(coherence.issues && coherence.issues.length ? coherence.issues.map(function(v){ return '<span class="ae-flag">'+htmlEscape(v)+'</span>'; }).join('') : '<span class="ae-flag">정합성 리스크 없음</span>')+'</div>',
      '  </div>',
      '  <div class="ae-card">',
      '    <div class="ae-head"><div><div class="ae-kicker">Memory / No-Bet Filter</div><h3 class="ae-title ae-title-sm">북메이커 메모리 · 강화된 패스 필터</h3><p class="ae-sub">장기적으로 시장 합의와 잘 맞는 북의 비중을 서서히 높이고, 정합성/신뢰도 부족 구간은 패스를 더 강하게 권장합니다.</p></div></div>',
      '    <div class="ae-kv cols4">',
      '      <div class="ae-box"><div class="k">Action</div><div class="v">'+htmlEscape(meta.actionLabel)+'</div><div class="s">강화된 No-Bet 게이트 반영</div></div>',
      '      <div class="ae-box"><div class="k">Tier</div><div class="v">'+htmlEscape(meta.tier)+'</div><div class="s">최종 행동 등급</div></div>',
      '      <div class="ae-box"><div class="k">Book Trust</div><div class="v">'+(bookMemory ? fmt(bookMemory.avgScore,0) : '—')+'</div><div class="s">메모리 기반 신뢰도</div></div>',
      '      <div class="ae-box"><div class="k">No-Bet Bias</div><div class="v">'+(meta.noBet ? 'High' : 'Adaptive')+'</div><div class="s">리스크 구간 패스 강화</div></div>',
      '    </div>',
      '    <table class="ae-table ae-tight"><thead><tr><th>Book</th><th>Memory</th><th>Weight</th><th>Tier</th></tr></thead><tbody>'+
      ((bookMemory && bookMemory.topBooks && bookMemory.topBooks.length) ? bookMemory.topBooks.map(function(r){ return '<tr><td>'+htmlEscape(r.book)+'</td><td>'+fmt(r.memoryScore||50,0)+'</td><td>'+fmt(r.weight||1,2)+'</td><td>'+htmlEscape((r.meta&&r.meta.sharpTier)||'standard')+'</td></tr>'; }).join('') : '<tr><td colspan="4">북메이커 배당을 붙여넣으면 메모리가 누적됩니다.</td></tr>')+
      '</tbody></table>',
      '    <div class="ae-flags">'+meta.reasons.map(function(reason){ return '<span class="ae-flag">'+htmlEscape(reason)+'</span>'; }).join('')+'</div>',
      '  </div>',
      '</section>',
      '<section class="ae-grid cols2">',
      '  <div class="ae-card">',
      '    <div class="ae-head"><div><div class="ae-kicker">Adaptive Method Memory</div><h3 class="ae-title ae-title-sm">방법 메모리 · 자체 적응 가중치</h3><p class="ae-sub">외부 데이터 없이도 최근 시장 구조와 더 잘 맞는 비그 제거 방식의 비중을 서서히 상향합니다.</p></div></div>',
      '    <div class="ae-kv cols4">',
      '      <div class="ae-box"><div class="k">Method Avg</div><div class="v">'+fmt(methodMemory && methodMemory.avgScore,0)+'</div><div class="s">현재 버킷 평균 점수</div></div>',
      '      <div class="ae-box"><div class="k">Top Method</div><div class="v">'+htmlEscape((agreement && agreement.topMethod) || '—')+'</div><div class="s">현재 합의 중심 방식</div></div>',
      '      <div class="ae-box"><div class="k">Agreement</div><div class="v">'+fmt(agreement && agreement.overallScore,0)+'</div><div class="s">방법 간 일치도</div></div>',
      '      <div class="ae-box"><div class="k">Bucket</div><div class="v">'+htmlEscape(marketBucket(cur, fairSet.margin).replace(/\|/g,' · '))+'</div><div class="s">동일 시장 메모리</div></div>',
      '    </div>',
      '    <div class="ae-callout">'+htmlEscape((agreement && agreement.notes && agreement.notes[0]) || '방법 간 합의 데이터를 기반으로 동적 가중치를 조정합니다.')+'</div>',
      '    <table class="ae-table ae-tight"><thead><tr><th>방식</th><th>공정배당</th><th>공정확률</th><th>Memory</th><th>Factor</th></tr></thead><tbody>'+methodRows+'</tbody></table>',
      '  </div>',
      '  <div class="ae-card">',
      '    <div class="ae-head"><div><div class="ae-kicker">Timing Engine</div><h3 class="ae-title ae-title-sm">진입 타이밍 · 분할 진입 판단</h3><p class="ae-sub">CLV, 변동성, 정합성, 메모리, 모델 합의를 한 번 더 묶어서 현재 진입 시점을 더 보수적으로 결정합니다.</p></div></div>',
      '    <div class="ae-kv cols4">',
      '      <div class="ae-box"><div class="k">Timing Score</div><div class="v">'+fmt(timingData && timingData.score,0)+'</div><div class="s">지금/분할/대기/패스</div></div>',
      '      <div class="ae-box"><div class="k">Action</div><div class="v">'+htmlEscape(timingData && timingData.actionLabel)+'</div><div class="s">권장 진입 방식</div></div>',
      '      <div class="ae-box"><div class="k">Bias</div><div class="v">'+htmlEscape(timingData && timingData.bias)+'</div><div class="s">진입 성향</div></div>',
      '      <div class="ae-box"><div class="k">Meta</div><div class="v">'+htmlEscape(meta.timingLabel || '—')+'</div><div class="s">최종 액션 반영</div></div>',
      '    </div>',
      '    <div class="ae-flags">'+((timingData && timingData.notes && timingData.notes.length) ? timingData.notes.map(function(v){ return '<span class="ae-flag">'+htmlEscape(v)+'</span>'; }).join('') : '<span class="ae-flag">타이밍 추가 노트 없음</span>')+'</div>',
      '    <div class="ae-callout">'+htmlEscape('최고 선택은 '+(bestRow?bestRow.label:'—')+' 기준으로 '+(timingData?timingData.actionLabel:'대기')+'가 권장됩니다. 타이밍 점수는 리버스·변동성·모델 합의·메모리 점수를 모두 반영합니다.')+'</div>',
      '  </div>',
      '</section>',
      '<section class="ae-grid cols2">',
      '  <div class="ae-card">',
      '    <div class="ae-head"><div><div class="ae-kicker">Robustness Layer</div><h3 class="ae-title ae-title-sm">스트레스 테스트 · 선택 내구도</h3><p class="ae-sub">현재 가격이 보수적/합의/역풍 시나리오에서도 살아남는지 점검해 과신을 더 강하게 제어합니다.</p></div></div>',
      '    <div class="ae-kv cols4">',
      '      <div class="ae-box"><div class="k">Top Robustness</div><div class="v">'+(bestRow && bestRow.robustness ? fmt(bestRow.robustness.score,0) : '—')+'</div><div class="s">탑픽 스트레스 내구도</div></div>',
      '      <div class="ae-box"><div class="k">Survival Rate</div><div class="v">'+(bestRow && bestRow.robustness ? pct(bestRow.robustness.positiveRate,0) : '—')+'</div><div class="s">양수 엣지 유지 비율</div></div>',
      '      <div class="ae-box"><div class="k">Worst Edge</div><div class="v">'+(bestRow && bestRow.robustness ? pct(bestRow.robustness.worstEdge,2) : '—')+'</div><div class="s">보수 시나리오 최저 엣지</div></div>',
      '      <div class="ae-box"><div class="k">Dominance</div><div class="v">'+(dominance ? fmt(dominance.score,0) : '—')+'</div><div class="s">탑픽 우위도 · '+htmlEscape(dominance ? dominance.label : '—')+'</div></div>',
      '    </div>',
      '    <table class="ae-table ae-tight"><thead><tr><th>선택</th><th>Robust</th><th>생존율</th><th>Worst Edge</th><th>내구도</th><th>Pressure</th></tr></thead><tbody>'+robustnessRows+'</tbody></table>',
      '    <div class="ae-flags">'+((dominance && dominance.notes && dominance.notes.length) ? dominance.notes.map(function(v){ return '<span class="ae-flag">'+htmlEscape(v)+'</span>'; }).join('') : '<span class="ae-flag">우위도 추가 노트 없음</span>')+'</div>',
      '  </div>',
      '  <div class="ae-card">',
      '    <div class="ae-head"><div><div class="ae-kicker">Weighted Consensus</div><h3 class="ae-title ae-title-sm">북메이커 가중 시장 합의</h3><p class="ae-sub">샤프북/마진/리더십/정합성 기준으로 북 가중치를 다르게 줍니다.</p></div></div>',
      '    <table class="ae-table"><thead><tr><th>북</th><th>Tier</th><th>Weight</th><th>Margin</th><th>Memory</th><th>No-vig Prob</th></tr></thead><tbody>'+consensusTable+'</tbody></table>',
      '  </div>',
      '  <div class="ae-card">',
      '    <div class="ae-head"><div><div class="ae-kicker">Move Signals</div><h3 class="ae-title ae-title-sm">클로징 예측 · 스팀/리버스 감지</h3></div></div>',
      '    <div class="ae-kv cols4">',
      '      <div class="ae-box"><div class="k">Steam</div><div class="v">'+fmt(move.steamScore,0)+'</div><div class="s">동방향·정렬도 점수</div></div>',
      '      <div class="ae-box"><div class="k">Reverse</div><div class="v">'+fmt(move.reverseScore,0)+'</div><div class="s">역행 가능성</div></div>',
      '      <div class="ae-box"><div class="k">Volatility</div><div class="v">'+fmt(move.volatilityScore,0)+'</div><div class="s">변동성 패널티</div></div>',
      '      <div class="ae-box"><div class="k">Trap Risk</div><div class="v">'+fmt(move.trapRiskScore,0)+'</div><div class="s">함정 위험도</div></div>',
      '    </div>',
      '    <table class="ae-table ae-tight"><thead><tr><th>선택</th><th>오픈 Prob</th><th>현재 Prob</th><th>변화</th><th>예상 마감배당</th><th>CLV</th></tr></thead><tbody>'+moveRows+'</tbody></table>',
      '  </div>',
      '</section>',
      '<section class="ae-card">',
      '  <div class="ae-head"><div><div class="ae-kicker">Decision Layer</div><h3 class="ae-title ae-title-sm">행동 점수 · 자동 스테이크</h3><p class="ae-sub">모델 엣지 + 시장 갭 + CLV 신호에서 변동성과 불확실성을 감산합니다.</p></div></div>',
      '  <table class="ae-table"><thead><tr><th>선택</th><th>기준 배당</th><th>공정배당</th><th>Model Edge</th><th>Edge Score</th><th>합의도</th><th>등급</th><th>권장 비중</th></tr></thead><tbody>'+edgeTable+'</tbody></table>',
      '  <div class="ae-footnote">Kelly는 Phase E까지 반영된 최종 공정확률을 기준으로 계산하며, Edge Score · 변동성 · 데이터 신뢰도를 반영해 Quarter/Half 중심으로 자동 감산합니다.</div>',
      '</section>',
      '<section class="ae-card">',
      '  <div class="ae-head"><div><div class="ae-kicker">Method Matrix</div><h3 class="ae-title ae-title-sm">기존 비그 제거 방식 비교</h3><p class="ae-sub">기존 정규화/파워/가산/언더독 보정 위에 Shin·Odds Ratio·Logit을 함께 비교합니다.</p></div></div>',
      '  <table class="ae-table"><thead><tr><th>방식</th><th>공정배당</th><th>공정확률</th><th>Memory</th><th>Factor</th></tr></thead><tbody>'+methodRows+'</tbody></table>',
      '</section>',
      '</details>'
    ].join('');
  }

  function boot(){
    ensurePhaseEControls();
    var ids = ['sportSel','marketSel','methodSel','od1','odx','od2','odA','odB','lineOU','odO','odU','lineH','odH1','odH2','openPaste','consPaste'];
    ids.forEach(function(id){ var el = $(id); if(!el || el.__aeBound) return; el.__aeBound = 1; el.addEventListener('input', render); el.addEventListener('change', render); });
    render();
    setTimeout(render, 140);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
