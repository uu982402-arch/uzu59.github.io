/* v71 VVIP Beginner Summary Briefing (slot / casino shoe / sports odds)
   - Safe no-op on pages without target nodes
*/
(function(){
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
  function num(x){
    if(x==null) return NaN;
    var s = String(x).replace(/[^0-9.+-]/g,'');
    var v = parseFloat(s);
    return isFinite(v) ? v : NaN;
  }
  function intNum(x){
    if(x==null) return NaN;
    var s = String(x).replace(/[^0-9-]/g,'');
    var v = parseInt(s,10);
    return isFinite(v) ? v : NaN;
  }
  function fmt(n){
    try{ return Number(n).toLocaleString('ko-KR'); }catch(e){ return String(n); }
  }
  function scoreLabel(s){
    if(!isFinite(s)) return '대기';
    if(s>=85) return '양호';
    if(s>=70) return '보통';
    if(s>=55) return '주의';
    return '위험';
  }

  function setBrief(root, s, warns, recos, tags){
    if(!root) return;
    var nEl = root.querySelector('[data-role="score"]');
    var lEl = root.querySelector('[data-role="label"]');
    if(nEl) nEl.textContent = isFinite(s) ? String(Math.round(s)) : '-';
    if(lEl) lEl.textContent = scoreLabel(s);

    var wEl = root.querySelector('[data-role="warn"]');
    var rEl = root.querySelector('[data-role="reco"]');
    if(wEl){
      wEl.innerHTML = '';
      (warns && warns.length ? warns : ['입력 후 자동 분석됩니다.']).slice(0,6).forEach(function(t){
        var li = document.createElement('li'); li.textContent = t; wEl.appendChild(li);
      });
    }
    if(rEl){
      rEl.innerHTML = '';
      (recos && recos.length ? recos : ['마진/리스크가 낮은 구간을 우선하세요.']).slice(0,6).forEach(function(t){
        var li = document.createElement('li'); li.textContent = t; rEl.appendChild(li);
      });
    }
    var tWrap = root.querySelector('[data-role="tags"]');
    if(tWrap){
      tWrap.innerHTML = '';
      (tags||[]).slice(0,8).forEach(function(t){
        var span = document.createElement('span');
        span.className = 'vvip-brief-tag';
        span.textContent = t;
        tWrap.appendChild(span);
      });
    }
  }

  /* --- SLOT --- */
  function initSlot(){
    var root = document.getElementById('slotBrief');
    if(!root) return;

    function compute(){
      var rtp = num(document.getElementById('rtp') && document.getElementById('rtp').value);
      var vol = (document.getElementById('vol') && document.getElementById('vol').value) || 'mid';
      var bet = num(document.getElementById('bet') && document.getElementById('bet').value);
      var spins = num(document.getElementById('spins') && document.getElementById('spins').value);

      if(!isFinite(rtp) || !isFinite(bet) || !isFinite(spins)){
        setBrief(root, NaN, ['값을 입력하면 자동 분석됩니다.'], ['RTP(%)·베팅·스핀 수를 입력하세요.'], []);
        return;
      }

      var houseEdge = clamp(100 - rtp, 0, 100);
      var totalBet = Math.max(0, bet) * Math.max(0, spins);
      var expLoss = totalBet * (houseEdge/100);
      var volIdx = (vol==='low'?0:(vol==='mid'?1:(vol==='high'?2:3)));

      var s = 92;
      s -= houseEdge * 1.5;
      s -= volIdx * 6;
      if(totalBet >= 1500000) s -= 8;
      else if(totalBet >= 800000) s -= 5;
      else if(totalBet >= 500000) s -= 3;
      if(spins >= 800) s -= 6;
      else if(spins >= 500) s -= 4;
      else if(spins >= 300) s -= 2;
      s = clamp(s, 30, 95);

      var warns = [];
      if(rtp < 95) warns.push('RTP가 낮은 편입니다. (버전/운영사 RTP 표기 확인 권장)');
      if(volIdx >= 2) warns.push('고변동 슬롯: 단기 출렁임이 큽니다. (뱅크롤 크게)');
      if(expLoss >= 100000) warns.push('기대 손실(이론) 금액이 큽니다. (세션 비용 관리 필요)');
      if(spins >= 500) warns.push('스핀 수가 많아 단기 변동성 누적이 큽니다.');

      var recos = [];
      recos.push('게임 내 정보(i)/페이테이블로 RTP 버전을 확인하세요.');
      recos.push('베팅 단위를 10~30% 낮추고 스핀 수로 세션 길이를 조절하세요.');
      recos.push('권장 뱅크롤/손절선을 “숫자”로 고정해 과몰입을 줄이세요.');

      var tags = [];
      tags.push('RTP ' + rtp.toFixed(2).replace(/\.00$/,'') + '%');
      tags.push('HE ' + houseEdge.toFixed(2).replace(/\.00$/,'') + '%');
      tags.push((volIdx===0?'저변동':volIdx===1?'중변동':volIdx===2?'고변동':'초고변동'));
      tags.push('세션 ' + fmt(Math.round(totalBet)) + '원');
      tags.push('이론손실 ' + fmt(Math.round(expLoss)) + '원');

      setBrief(root, s, warns, recos, tags);
    }

    var calcBtn = document.getElementById('calcBtn');
    if(calcBtn) calcBtn.addEventListener('click', function(){ setTimeout(compute, 0); });
    ['rtp','vol','bet','spins','slotName'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.addEventListener('input', function(){ setTimeout(compute, 0); });
      if(el) el.addEventListener('change', function(){ setTimeout(compute, 0); });
    });
    compute();
  }

  /* --- CASINO SHOE --- */
   function initShoe(){
    try{ if(window.__CASINO_SHOE_BRIEF_MANAGED) return; }catch(e){}
    var root = document.getElementById('shoeBrief');
    if(!root) return;

    var provider = 'evo';
    function key(p){ return 'vvip_shoe_hist:' + p; }
    function load(p){
      try{
        var v = localStorage.getItem(key(p));
        if(!v) return [];
        var arr = JSON.parse(v);
        return Array.isArray(arr) ? arr.filter(function(x){return x==='P'||x==='B'||x==='T';}) : [];
      }catch(e){ return []; }
    }
    function save(p, arr){
      try{ localStorage.setItem(key(p), JSON.stringify(arr.slice(-200))); }catch(e){}
    }

    var hist = load(provider);

    function chiSquare(obs, exp){
      var chi = 0;
      for(var k in exp){
        if(!exp[k]) continue;
        var o = obs[k] || 0;
        var e = exp[k];
        chi += ((o-e)*(o-e))/e;
      }
      return chi;
    }

    function compute(){
      var last = hist.slice(-20);
      var n = last.length;
      if(n === 0){
        setBrief(root, NaN, ['최근 결과를 입력하면 자동 태깅됩니다.'], ['연속/편차/타이를 보고 “추격 금지 구간”을 피하세요.'], ['최근20 입력 권장']);
        return;
      }

      var c = {P:0,B:0,T:0};
      last.forEach(function(x){ if(c[x]!=null) c[x]++; });

      var cur = last[last.length-1];
      var streak = 1;
      for(var i=last.length-2;i>=0;i--){ if(last[i]===cur) streak++; else break; }

      var exp = {B:0.4586*n, P:0.4462*n, T:0.0952*n};
      var chi = chiSquare(c, exp);

      var s = 90;
      if(n < 10) s -= 8;
      if(cur !== 'T' && streak >= 5) s -= (streak-4) * 6;
      if(cur === 'T' && streak >= 2) s -= (streak-1) * 6;
      if(c.T >= 4) s -= (c.T-3) * 5;
      if(chi >= 6) s -= Math.min(20, (chi-6) * 3);
      s = clamp(s, 35, 95);

      var warns = [];
      if(n < 10) warns.push('표본 부족: 최근 10~20을 먼저 채우세요.');
      if(cur !== 'T' && streak >= 5) warns.push('연속 과열: ' + (cur==='B'?'BANKER':'PLAYER') + ' ' + streak + '연속');
      if(cur === 'T' && streak >= 2) warns.push('타이 연속: ' + streak + '연속');
      if(c.T >= 4) warns.push('타이 급증: 최근20 ' + c.T + '회');
      if(chi >= 9.2) warns.push('편차 강함(분포 이탈): χ² ' + chi.toFixed(1));
      else if(chi >= 6) warns.push('편차 감지(분포 이탈): χ² ' + chi.toFixed(1));

      var recos = [];
      if(s < 55) recos.push('PASS/관망 권장: 2~3핸드 쉬고 재평가');
      else recos.push('단위는 보수적으로: 강한 확신 구간만 진입');
      recos.push('세션 손절(MDD)을 “숫자”로 고정하세요.');
      recos.push('연속 구간 추격 금지(단기 분산이 큼).');

      var tags = [];
      tags.push('N ' + n);
      tags.push('P/B/T ' + c.P + '/' + c.B + '/' + c.T);
      tags.push('최근 ' + (cur==='B'?'B':'P') + '×' + streak + ' 연속');
      tags.push('χ² ' + chi.toFixed(1));

      setBrief(root, s, warns, recos, tags);
    }

    function setProvider(p){
      provider = p;
      hist = load(provider);
      compute();
    }

    // Provider pills
    var pills = document.querySelectorAll('.cs-shoe-pill');
    if(pills && pills.length){
      pills.forEach(function(b){
        b.addEventListener('click', function(){
          var p = b.getAttribute('data-provider');
          if(p) setProvider(p);
        });
      });
    }

    // Buttons: add/undo/clear
    document.addEventListener('click', function(e){
      var t = e.target;
      if(!t) return;
      var add = t.getAttribute('data-add');
      var act = t.getAttribute('data-act');
      if(add && (add==='P'||add==='B'||add==='T')){
        hist.push(add);
        save(provider, hist);
        compute();
      }
      if(act === 'undo'){
        hist.pop();
        save(provider, hist);
        compute();
      }
      if(act === 'clear'){
        hist = [];
        save(provider, hist);
        compute();
      }
    }, true);

    compute();
  }

  /* --- SPORTS ODDS (analysis) --- */
  function initSports(){
    var root = document.getElementById('sprtBrief');
    if(!root) return;

    function getOdds(){
      function vis(id){
        var el = document.getElementById(id);
        if(!el) return false;
        var p = el;
        while(p && p !== document.body){
          var s = window.getComputedStyle(p);
          if(s && (s.display==='none' || s.visibility==='hidden')) return false;
          p = p.parentElement;
        }
        return true;
      }
      var odds = [];
      if(vis('inputs1x2')) odds = [num(document.getElementById('od1').value), num(document.getElementById('odx').value), num(document.getElementById('od2').value)];
      else if(vis('inputs2way')) odds = [num(document.getElementById('odA').value), num(document.getElementById('odB').value)];
      else if(vis('inputsOU')) odds = [num(document.getElementById('odO').value), num(document.getElementById('odU').value)];
      else if(vis('inputsHcap')) odds = [num(document.getElementById('odH1').value), num(document.getElementById('odH2').value)];
      return odds.filter(function(v){ return isFinite(v); });
    }
    function marketName(){
      if(document.getElementById('inputs1x2') && document.getElementById('inputs1x2').style.display !== 'none') return '1X2';
      if(document.getElementById('inputs2way') && document.getElementById('inputs2way').style.display !== 'none') return '2-way';
      if(document.getElementById('inputsOU') && document.getElementById('inputsOU').style.display !== 'none') return 'O/U';
      if(document.getElementById('inputsHcap') && document.getElementById('inputsHcap').style.display !== 'none') return 'Hcap';
      return 'AUTO';
    }

    function compute(){
      var odds = getOdds();
      if(!odds || odds.length < 2){
        setBrief(root, NaN, ['배당을 입력하면 자동 분석됩니다.'], ['마진이 낮은 라인/북부터 선택하세요.'], []);
        return;
      }
      var sum = 0;
      for(var i=0;i<odds.length;i++){
        if(!(odds[i] > 1.0001)){
          setBrief(root, NaN, ['배당 값이 유효하지 않습니다. (1.01 이상 권장)'], ['배당을 다시 확인하세요.'], []);
          return;
        }
        sum += 1/odds[i];
      }
      var margin = sum - 1;
      var s = 95 - (margin*100*4.5);
      if(margin < 0) s = 90;
      s = clamp(s, 35, 95);

      var warns = [];
      if(margin >= 0.12) warns.push('마진 매우 높음: ' + (margin*100).toFixed(1) + '% (조건 불리)');
      else if(margin >= 0.08) warns.push('마진 높음: ' + (margin*100).toFixed(1) + '% (북/라인 비교 권장)');
      else if(margin >= 0.05) warns.push('마진 보통: ' + (margin*100).toFixed(1) + '%');
      else warns.push('마진 낮음: ' + (margin*100).toFixed(1) + '% (상대적으로 유리)');

      var recos = [];
      recos.push('마진이 낮은 북/라인을 우선 선택하세요.');
      recos.push('오즈 무브/시장 평균 비교(PRO)로 “시장 합의”를 확인하세요.');
      recos.push('정배/역배 모두 단기 변동이 크니, 단위·손절을 숫자로 고정하세요.');

      var tags = [];
      tags.push('마켓 ' + marketName());
      tags.push('오버라운드 ' + (sum*100).toFixed(1) + '%');
      tags.push('마진 ' + (margin*100).toFixed(1) + '%');
      setBrief(root, s, warns, recos, tags);
    }

    // Observe input changes
    var ids = ['od1','odx','od2','odA','odB','odO','odU','odH1','odH2','marketSel'];
    ids.forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;
      el.addEventListener('input', function(){ setTimeout(compute, 0); });
      el.addEventListener('change', function(){ setTimeout(compute, 0); });
    });

    // Also refresh when input groups switch
    try{
      var ms = document.getElementById('marketSel');
      if(ms){
        ms.addEventListener('change', function(){ setTimeout(compute, 0); });
      }
    }catch(e){}

    compute();
  }

  function init(){
    initSlot();
    initShoe();
    initSports();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
