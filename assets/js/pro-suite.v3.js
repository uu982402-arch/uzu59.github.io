/* 88ST PRO SUITE (v3)
 * - Sports: Risk briefing, line-move interpreter, CLV tracker, bet sizing, parlay risk check
 * - Casino/Minigame: Ruin simulator, streak illusion (run probability)
 * - Cert: Bonus terms interpreter + popup sticky action (copy+go)
 * Safe global loader: does nothing unless target containers exist.
 */
(function(){
  'use strict';

  function qs(root, sel){ return (root||document).querySelector(sel); }
  function qsa(root, sel){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function fmt(n, digits){
    if(!isFinite(n)) return '—';
    var d = (digits==null)? 2 : digits;
    return Number(n).toLocaleString(undefined, {maximumFractionDigits:d});
  }

  function parseNums(text){
    if(!text) return [];
    var m = (text+'').match(/-?\d+(?:\.\d+)?/g);
    return (m||[]).map(function(x){ return parseFloat(x); }).filter(function(x){ return isFinite(x) && x>0; });
  }

  function impliedProb(od){ return 1/od; }
  function overround(ods){
    var s=0;
    for(var i=0;i<ods.length;i++) s+= impliedProb(ods[i]);
    return s;
  }
  function marginPct(ods){ return (overround(ods)-1)*100; }

  function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }

  function scoreToLabel(s){
    if(s>=80) return '매우 높음';
    if(s>=60) return '높음';
    if(s>=40) return '보통';
    return '낮음';
  }

  function makeTags(root, tags){
    var wrap = qs(root,'.ps-tags');
    if(!wrap) return;
    wrap.innerHTML='';
    tags.forEach(function(t){
      var sp = document.createElement('span');
      sp.className = 'ps-tag' + (t.level?(' '+t.level):'');
      sp.textContent = t.text;
      wrap.appendChild(sp);
    });
  }

  // --- Tool 7: probability of at least one run of length k in n trials ---
  function probAtLeastOneRun(n, p, k){
    n = Math.max(0, Math.floor(n||0));
    k = Math.max(1, Math.floor(k||1));
    p = clamp(+p || 0, 0, 1);
    var q = 1 - p;

    // dp[j] = prob of no-run-yet after current i with current run length j (0..k-1)
    var dp = new Array(k).fill(0);
    dp[0] = 1;
    for(var i=0;i<n;i++){
      var ndp = new Array(k).fill(0);
      for(var j=0;j<k;j++){
        var v = dp[j];
        if(!v) continue;
        // fail -> run resets
        ndp[0] += v*q;
        // success -> run increases; if hits k, it's excluded from no-run states
        if(j+1 < k) ndp[j+1] += v*p;
      }
      dp = ndp;
    }
    var noRun = dp.reduce(function(a,b){return a+b;},0);
    return 1 - noRun;
  }

  // --- Tool 6: Monte Carlo ruin simulator (simple win/lose model) ---
  function ruinSim(params){
    var bankroll = Math.max(0, +params.bankroll || 0);
    var bet = Math.max(0, +params.bet || 0);
    var n = Math.max(1, Math.floor(+params.n || 200));
    var sims = Math.max(300, Math.min(6000, Math.floor(+params.sims || 2000)));

    // even-money by default
    var payout = Math.max(0.5, +params.payout || 1); // win profit = bet*payout
    var houseEdge = clamp((+params.houseEdge || 1.2)/100, 0, 0.2);

    // for even-money: EV per bet = p*payout - (1-p)*1
    // choose p so that EV = -houseEdge
    // => p = (1 - houseEdge) / (payout + 1)
    var p = clamp((1 - houseEdge) / (payout + 1), 0.001, 0.999);

    var ruin=0;
    var finals=[];
    var mdds=[];

    for(var s=0;s<sims;s++){
      var b = bankroll;
      var peak = b;
      var mdd = 0;
      for(var i=0;i<n;i++){
        if(b <= 0){ break; }
        var stake = Math.min(b, bet);
        var r = Math.random();
        if(r < p){
          b += stake * payout;
        }else{
          b -= stake;
        }
        if(b > peak) peak = b;
        var dd = peak - b;
        if(dd > mdd) mdd = dd;
      }
      if(b <= 0) ruin++;
      finals.push(b);
      mdds.push(mdd);
    }

    function pct(arr, q){
      var a = arr.slice().sort(function(x,y){return x-y;});
      var idx = Math.floor((a.length-1)*q);
      return a[idx];
    }

    return {
      pWin: p,
      ruinProb: ruin/sims,
      finalP50: pct(finals, 0.5),
      finalP05: pct(finals, 0.05),
      finalP95: pct(finals, 0.95),
      mddP50: pct(mdds, 0.5),
      mddP95: pct(mdds, 0.95)
    };
  }
  // --- Sports suite rendering ---
  function renderSports(container){
    container.classList.add('ps-stack');
    container.innerHTML = [
      '<details class="ps-acc" open>',
      '  <summary><span>🧾 오늘의 경기 리스크 브리핑</span><span class="ps-badge">점수·주의·추천</span></summary>',
      '  <div class="ps-acc-body">',
      '    <div class="ps-note">배당(오픈/현재)과 마켓 특성만으로 <b>리스크(변동성/정보/마진)</b>를 점수화합니다. (예측 도구 아님)</div>',
      '    <div class="ps-row cols3" style="margin-top:10px;">',
      '      <div class="ps-field"><label>종목/리그(선택)</label><input data-k="league" placeholder="예: EPL / KBO / e스포츠"/></div>',
      '      <div class="ps-field"><label>마켓</label><select data-k="market"><option value="1x2">승/무/패(1X2)</option><option value="2way">2-way</option><option value="ou">오버/언더</option><option value="handicap">핸디캡</option></select></div>',
      '      <div class="ps-field"><label>유동성(체감)</label><select data-k="liq"><option value="major">메이저(라인 안정)</option><option value="mid">중간</option><option value="minor">마이너(무브 잦음)</option></select></div>',
      '    </div>',
      '    <div class="ps-row cols2" style="margin-top:10px;">',
      '      <div class="ps-field"><label>오픈 배당(붙여넣기)</label><textarea data-k="open" placeholder="예: 1.80 3.70 4.40\n예: 2.5 1.91 1.91"></textarea></div>',
      '      <div class="ps-field"><label>현재 배당(붙여넣기)</label><textarea data-k="cur" placeholder="예: 1.72 3.90 4.80\n예: 2.5 1.88 1.96"></textarea></div>',
      '    </div>',
      '    <div class="ps-actions">',
      '      <button class="ps-btn primary" data-act="run">브리핑 생성</button>',
      '      <button class="ps-btn ghost" data-act="fill">현재→오픈 복사</button>',
      '      <button class="ps-btn secondary" data-act="reset">초기화</button>',
      '    </div>',
      '    <div class="ps-kpis cols3">',
      '      <div class="ps-kpi"><div class="k">리스크 점수</div><div class="v" data-out="score">—</div><div class="s" data-out="label">—</div></div>',
      '      <div class="ps-kpi"><div class="k">마진(현재)</div><div class="v" data-out="margin">—</div><div class="s">오버라운드−1</div></div>',
      '      <div class="ps-kpi"><div class="k">무브 강도</div><div class="v" data-out="move">—</div><div class="s">Δ암시확률 최대</div></div>',
      '    </div>',
      '    <div class="ps-tags"></div>',
      '    <div class="ps-out" data-out="box" style="display:none;"></div>',
      '  </div>',
      '</details>',

      '<details class="ps-acc">',
      '  <summary><span>📉 라인 무브 해석기</span><span class="ps-badge">문장 템플릿</span></summary>',
      '  <div class="ps-acc-body">',
      '    <div class="ps-note">오픈 대비 현재 배당 변화로 시장 심리를 <b>짧은 문장</b>으로 해석합니다. (뉴스/부상/라인업은 별도 확인)</div>',
      '    <div class="ps-row cols3" style="margin-top:10px;">',
      '      <div class="ps-field"><label>마켓</label><select data-k="lmMarket"><option value="1x2">1X2</option><option value="2way">2-way</option><option value="ou">O/U</option><option value="handicap">핸디</option></select></div>',
      '      <div class="ps-field"><label>오픈 배당</label><input data-k="lmOpen" placeholder="예: 1.80 3.70 4.40"/></div>',
      '      <div class="ps-field"><label>현재 배당</label><input data-k="lmCur" placeholder="예: 1.72 3.90 4.80"/></div>',
      '    </div>',
      '    <div class="ps-actions">',
      '      <button class="ps-btn primary" data-act="lmRun">해석 생성</button>',
      '      <button class="ps-btn secondary" data-act="lmReset">초기화</button>',
      '    </div>',
      '    <div class="ps-out" data-out="lmOut" style="display:none;"></div>',
      '  </div>',
      '</details>',

      '<details class="ps-acc">',
      '  <summary><span>📌 CLV 트래커</span><span class="ps-badge">베팅 가격 평가</span></summary>',
      '  <div class="ps-acc-body">',
      '    <div class="ps-note">베팅 당시 배당 vs 마감(클로징) 배당으로 <b>가격(라인) 유리함</b>을 평가합니다. (수익 보장 아님)</div>',
      '    <div class="ps-row cols3" style="margin-top:10px;">',
      '      <div class="ps-field"><label>베팅 당시 배당</label><input data-k="clvBet" inputmode="decimal" placeholder="예: 2.05"/></div>',
      '      <div class="ps-field"><label>마감 배당</label><input data-k="clvClose" inputmode="decimal" placeholder="예: 1.92"/></div>',
      '      <div class="ps-field"><label>마켓(선택)</label><select data-k="clvMkt"><option value="general">일반</option><option value="ou">O/U</option><option value="handicap">핸디</option></select></div>',
      '    </div>',
      '    <div class="ps-actions">',
      '      <button class="ps-btn primary" data-act="clvRun">CLV 계산</button>',
      '      <button class="ps-btn secondary" data-act="clvReset">초기화</button>',
      '    </div>',
      '    <div class="ps-kpis cols3">',
      '      <div class="ps-kpi"><div class="k">CLV(배당)</div><div class="v" data-out="clvOdds">—</div><div class="s">(Close−Bet)/Close</div></div>',
      '      <div class="ps-kpi"><div class="k">CLV(확률)</div><div class="v" data-out="clvProb">—</div><div class="s">pClose−pBet</div></div>',
      '      <div class="ps-kpi"><div class="k">판정</div><div class="v" data-out="clvLabel" style="font-size:16px;">—</div><div class="s">가격 기준</div></div>',
      '    </div>',
      '    <div class="ps-tags"></div>',
      '  </div>',
      '</details>',

      '<details class="ps-acc">',
      '  <summary><span>💸 베팅 금액 추천기</span><span class="ps-badge">리스크 제한형</span></summary>',
      '  <div class="ps-acc-body">',
      '    <div class="ps-note">켈리 기반이지만 <b>분수 켈리 + 최대 손실 제한 + 연패 보호</b>로 현실적으로 추천합니다. (참고용)</div>',
      '    <div class="ps-row cols3" style="margin-top:10px;">',
      '      <div class="ps-field"><label>자금(원)</label><input data-k="bk" inputmode="numeric" placeholder="예: 500000"/></div>',
      '      <div class="ps-field"><label>배당</label><input data-k="od" inputmode="decimal" placeholder="예: 1.95"/></div>',
      '      <div class="ps-field"><label>승률 추정(%)</label><input data-k="p" inputmode="decimal" placeholder="예: 54"/></div>',
      '    </div>',
      '    <div class="ps-row cols3" style="margin-top:10px;">',
      '      <div class="ps-field"><label>방식</label><select data-k="frac"><option value="0.25">켈리 1/4(권장)</option><option value="0.125">켈리 1/8(보수)</option><option value="0.5">켈리 1/2(공격)</option></select></div>',
      '      <div class="ps-field"><label>최대 손실(자금%)</label><input data-k="cap" inputmode="decimal" value="2"/></div>',
      '      <div class="ps-field"><label>최근 연패(회)</label><input data-k="loss" inputmode="numeric" value="0"/></div>',
      '    </div>',
      '    <div class="ps-actions">',
      '      <button class="ps-btn primary" data-act="sizeRun">추천 계산</button>',
      '      <button class="ps-btn secondary" data-act="sizeReset">초기화</button>',
      '    </div>',
      '    <div class="ps-kpis cols3">',
      '      <div class="ps-kpi"><div class="k">추천 베팅</div><div class="v" data-out="stake">—</div><div class="s">원</div></div>',
      '      <div class="ps-kpi"><div class="k">켈리 기준</div><div class="v" data-out="kel">—</div><div class="s">f*</div></div>',
      '      <div class="ps-kpi"><div class="k">캡 적용</div><div class="v" data-out="capv">—</div><div class="s">최대손실 제한</div></div>',
      '    </div>',
      '    <div class="ps-out" data-out="sizeOut" style="display:none;"></div>',
      '  </div>',
      '</details>',

      '<details class="ps-acc">',
      '  <summary><span>🧩 파롤리 위험도 체크</span><span class="ps-badge">상관/중복 경고</span></summary>',
      '  <div class="ps-acc-body">',
      '    <div class="ps-note">다리(legs)를 줄마다 붙여넣으면 <b>같은 경기/같은 팀/같은 방향</b> 중복을 감지해 리스크를 표시합니다.</div>',
      '    <div class="ps-row cols2" style="margin-top:10px;">',
      '      <div class="ps-field"><label>파롤리 다리 목록</label><textarea data-k="legs" placeholder="예: 맨시티 승\n예: 맨시티 -1.0\n예: 맨시티 오버 2.5"></textarea></div>',
      '      <div class="ps-field"><label>옵션</label>',
      '        <div class="ps-note" style="margin-bottom:8px;">추천: 같은 경기 다리 2개↑면 상관 리스크가 급상승합니다.</div>',
      '        <div class="ps-row"><div class="ps-field"><label>허용 중복(경기/팀)</label><select data-k="dup"><option value="1">1개까지</option><option value="2">2개까지</option><option value="3">3개까지</option></select></div></div>',
      '      </div>',
      '    </div>',
      '    <div class="ps-actions">',
      '      <button class="ps-btn primary" data-act="parRun">체크</button>',
      '      <button class="ps-btn secondary" data-act="parReset">초기화</button>',
      '    </div>',
      '    <div class="ps-tags"></div>',
      '    <div class="ps-out" data-out="parOut" style="display:none;"></div>',
      '  </div>',
      '</details>'
    ].join('');

    // --- risk briefing ---
    var els = {
      league: qs(container,'[data-k="league"]'),
      market: qs(container,'[data-k="market"]'),
      liq: qs(container,'[data-k="liq"]'),
      open: qs(container,'[data-k="open"]'),
      cur: qs(container,'[data-k="cur"]'),
      score: qs(container,'[data-out="score"]'),
      label: qs(container,'[data-out="label"]'),
      margin: qs(container,'[data-out="margin"]'),
      move: qs(container,'[data-out="move"]'),
      box: qs(container,'[data-out="box"]')
    };

    function runBrief(){
      var openNums = parseNums(els.open.value);
      var curNums = parseNums(els.cur.value);
      // allow line+odds: if 3 nums and first looks like a line (<=15), take last two
      function normalize(nums){
        if(nums.length===3 && Math.abs(nums[0])<=15 && nums[1]>1 && nums[2]>1) return [nums[1],nums[2]];
        if(nums.length>=3 && els.market.value==='1x2') return nums.slice(0,3);
        if(nums.length>=2 && (els.market.value==='2way' || els.market.value==='ou' || els.market.value==='handicap')) return nums.slice(-2);
        if(nums.length>=2) return nums.slice(0,2);
        return nums;
      }
      var o = normalize(openNums);
      var c = normalize(curNums);

      var tags=[];
      var warns=[];
      var recos=[];

      var mPct = (c.length>=2) ? marginPct(c) : NaN;
      var moveMax = NaN;
      if(o.length===c.length && c.length>=2){
        moveMax = 0;
        for(var i=0;i<c.length;i++){
          var dp = Math.abs(impliedProb(c[i]) - impliedProb(o[i]))*100;
          if(dp>moveMax) moveMax=dp;
        }
      }

      // base score from margin + move + liquidity
      var s = 10;
      if(isFinite(mPct)){
        s += clamp(mPct*6, 0, 45); // 0~45
        if(mPct>=6) warns.push('마진이 높습니다(수수료/왜곡 가능).');
        if(mPct<=3) tags.push({text:'마진 낮음', level:'good'});
      }else{
        warns.push('현재 배당(숫자) 입력이 부족합니다.');
      }

      if(isFinite(moveMax)){
        s += clamp(moveMax*8, 0, 35); // 0~35
        if(moveMax>=2.0) warns.push('무브 강도가 큽니다(정보/자금 유입 가능).');
        if(moveMax>=3.5) tags.push({text:'큰 무브', level:'warn'});
      }else{
        tags.push({text:'무브 미측정(오픈 입력 없음)', level:'good'});
      }

      var liq = els.liq.value;
      if(liq==='minor'){ s+=18; warns.push('마이너 리그는 라인 변동/스파이크가 잦습니다.'); tags.push({text:'저유동성', level:'warn'}); }
      else if(liq==='mid'){ s+=10; }
      else { s+=4; tags.push({text:'유동성 양호', level:'good'}); }

      // market nuance
      var mk = els.market.value;
      if(mk==='ou' || mk==='handicap'){
        recos.push('라인(O/U·핸디)은 뉴스/라인업에 민감합니다. 변동 구간에서는 <b>라이브 대기</b>가 유리할 수 있습니다.');
      }else{
        recos.push('승/패형 마켓은 큰 무브가 나오면 <b>원인(부상/라인업/정보)</b> 확인이 우선입니다.');
      }

      // recommendation based on score
      s = clamp(Math.round(s), 0, 100);
      var lab = scoreToLabel(s);
      if(s>=80){ recos.unshift('이번 라인은 <b>패스/관망</b> 또는 <b>소액 테스트</b> 권장.'); }
      else if(s>=60){ recos.unshift('무리 금지. <b>분할</b> 또는 <b>라인 확정 후</b> 접근 권장.'); }
      else if(s>=40){ recos.unshift('중간 리스크. 마진 낮은 북/라인 선택 + 손실캡 설정 권장.'); }
      else { recos.unshift('리스크 낮음. 그래도 <b>손실 캡</b>은 항상 유지하세요.'); }

      if(els.league.value.trim()){ tags.push({text: els.league.value.trim(), level:'good'}); }

      els.score.textContent = String(s);
      els.label.textContent = lab;
      els.margin.textContent = isFinite(mPct) ? (fmt(mPct,2) + '%') : '—';
      els.move.textContent = isFinite(moveMax) ? (fmt(moveMax,2) + 'p') : '—';

      makeTags(container, tags);

      // output box
      els.box.style.display = 'block';
      els.box.innerHTML = [
        '<h4>주의</h4>',
        '<ul>' + (warns.length? warns.map(function(x){return '<li>'+x+'</li>';}).join('') : '<li>특별한 경고 없음(입력 기준).</li>') + '</ul>',
        '<div class="ps-divider"></div>',
        '<h4>추천 접근</h4>',
        '<ul>' + recos.map(function(x){return '<li>'+x+'</li>';}).join('') + '</ul>',
        '<div class="ps-note" style="margin-top:10px;">※ 이 브리핑은 “결과 예측”이 아니라, <b>마진/변동성/정보 리스크</b>로 판단을 보조합니다.</div>'
      ].join('');
    }

    qs(container,'[data-act="run"]').addEventListener('click', runBrief);
    qs(container,'[data-act="fill"]').addEventListener('click', function(){ els.open.value = els.cur.value; });
    qs(container,'[data-act="reset"]').addEventListener('click', function(){
      els.league.value=''; els.open.value=''; els.cur.value='';
      els.score.textContent='—'; els.label.textContent='—'; els.margin.textContent='—'; els.move.textContent='—';
      var box = els.box; box.style.display='none'; box.innerHTML='';
      makeTags(container, []);
    });

    // --- line move interpreter ---
    var lmOut = qs(container,'[data-out="lmOut"]');
    qs(container,'[data-act="lmRun"]').addEventListener('click', function(){
      var mk2 = qs(container,'[data-k="lmMarket"]').value;
      var o = parseNums(qs(container,'[data-k="lmOpen"]').value);
      var c = parseNums(qs(container,'[data-k="lmCur"]').value);
      // normalize
      function norm(nums){
        if(nums.length===3 && Math.abs(nums[0])<=15 && nums[1]>1 && nums[2]>1) return [nums[1],nums[2]];
        if(nums.length>=3 && mk2==='1x2') return nums.slice(0,3);
        if(nums.length>=2) return nums.slice(0,2);
        return nums;
      }
      o = norm(o); c = norm(c);
      if(!(o.length>=2 && c.length>=2 && o.length===c.length)){
        lmOut.style.display='block';
        lmOut.innerHTML = '<h4>입력 오류</h4><div class="ps-note">오픈/현재 배당을 같은 개수로 입력하세요. (1X2=3개, 2-way=2개)</div>';
        return;
      }
      var msgs=[];
      var tags=[];
      var maxDp=0;
      for(var i=0;i<c.length;i++) maxDp=Math.max(maxDp, Math.abs(impliedProb(c[i])-impliedProb(o[i]))*100);

      // direction summary
      function dir(i){
        var d = c[i]-o[i];
        if(Math.abs(d)<0.01) return '유지';
        return d<0 ? '하락(강세)' : '상승(약세)';
      }
      if(mk2==='1x2'){
        msgs.push('홈: '+dir(0)+', 무: '+dir(1)+', 원정: '+dir(2)+' 입니다.');
        // interpret: if one side drops, market leans
        var minIdx=0; var minOd=c[0];
        for(i=1;i<3;i++){ if(c[i]<minOd){ minOd=c[i]; minIdx=i; } }
        var side = (minIdx===0?'홈':(minIdx===1?'무':'원정'));
        msgs.push('현재 기준 최저 배당은 <b>'+side+'</b> 쪽입니다. (시장 선호 가능)');
      } else {
        msgs.push('오픈→현재 변화가 반영되었습니다. (우세 방향: 배당 하락)');
      }

      if(maxDp>=3.5){ tags.push({text:'큰 무브(정보성)', level:'bad'}); msgs.push('Δ암시확률 변화가 큽니다. 라인업/부상/공지 확인 후 접근하세요.'); }
      else if(maxDp>=2.0){ tags.push({text:'무브 큼', level:'warn'}); msgs.push('변동 구간입니다. 분할/라이브 대기 전략이 유리할 수 있습니다.'); }
      else { tags.push({text:'무브 작음', level:'good'}); msgs.push('변동이 크지 않습니다. 마진 낮은 북 기준으로 비교하면 효율적입니다.'); }

      lmOut.style.display='block';
      lmOut.innerHTML = '<h4>해석</h4><ul>' + msgs.map(function(x){return '<li>'+x+'</li>';}).join('') + '</ul>';

      // put tags under the same tool block (use nearest ps-tags under this details)
      var det = lmOut.closest('details');
      var tmpRoot = det || container;
      makeTags(tmpRoot, tags);
    });
    qs(container,'[data-act="lmReset"]').addEventListener('click', function(){
      qs(container,'[data-k="lmOpen"]').value='';
      qs(container,'[data-k="lmCur"]').value='';
      lmOut.style.display='none'; lmOut.innerHTML='';
      var det = lmOut.closest('details');
      if(det) makeTags(det, []);
    });

    // --- CLV ---
    qs(container,'[data-act="clvRun"]').addEventListener('click', function(){
      var bet = parseFloat(qs(container,'[data-k="clvBet"]').value);
      var close = parseFloat(qs(container,'[data-k="clvClose"]').value);
      var det = qs(container,'[data-k="clvBet"]').closest('details') || container;
      var tags=[];
      if(!(isFinite(bet)&&bet>1 && isFinite(close)&&close>1)){
        qs(container,'[data-out="clvOdds"]').textContent='—';
        qs(container,'[data-out="clvProb"]').textContent='—';
        qs(container,'[data-out="clvLabel"]').textContent='입력 필요';
        makeTags(det, [{text:'배당 입력 필요', level:'warn'}]);
        return;
      }
      var clvO = ((close - bet)/close)*100;
      var pBet = 1/bet, pClose = 1/close;
      var clvP = (pClose - pBet)*100;
      qs(container,'[data-out="clvOdds"]').textContent = (fmt(clvO,2) + '%');
      qs(container,'[data-out="clvProb"]').textContent = (fmt(clvP,2) + 'p');
      var label;
      if(clvP > 0.6){ label='좋음(양의 CLV)'; tags.push({text:'양의 CLV', level:'good'}); }
      else if(clvP > 0.0){ label='약간 유리'; tags.push({text:'미세 양의 CLV', level:'good'}); }
      else if(clvP > -0.6){ label='중립/미세 불리'; tags.push({text:'중립', level:'warn'}); }
      else { label='불리(음의 CLV)'; tags.push({text:'음의 CLV', level:'bad'}); }
      qs(container,'[data-out="clvLabel"]').textContent = label;
      makeTags(det, tags);
    });
    qs(container,'[data-act="clvReset"]').addEventListener('click', function(){
      qs(container,'[data-k="clvBet"]').value='';
      qs(container,'[data-k="clvClose"]').value='';
      qs(container,'[data-out="clvOdds"]').textContent='—';
      qs(container,'[data-out="clvProb"]').textContent='—';
      qs(container,'[data-out="clvLabel"]').textContent='—';
      var det = qs(container,'[data-k="clvBet"]').closest('details') || container;
      makeTags(det, []);
    });

    // --- bet sizing ---
    var sizeOut = qs(container,'[data-out="sizeOut"]');
    qs(container,'[data-act="sizeRun"]').addEventListener('click', function(){
      var bk = parseFloat(qs(container,'[data-k="bk"]').value);
      var od = parseFloat(qs(container,'[data-k="od"]').value);
      var p = parseFloat(qs(container,'[data-k="p"]').value)/100;
      var frac = parseFloat(qs(container,'[data-k="frac"]').value);
      var cap = parseFloat(qs(container,'[data-k="cap"]').value)/100;
      var loss = Math.max(0, parseInt(qs(container,'[data-k="loss"]').value||'0',10));

      var stakeEl = qs(container,'[data-out="stake"]');
      var kelEl = qs(container,'[data-out="kel"]');
      var capEl = qs(container,'[data-out="capv"]');

      if(!(isFinite(bk)&&bk>0 && isFinite(od)&&od>1 && isFinite(p)&&p>0&&p<1)){
        stakeEl.textContent='—'; kelEl.textContent='—'; capEl.textContent='—';
        sizeOut.style.display='block';
        sizeOut.innerHTML='<h4>입력 필요</h4><div class="ps-note">자금/배당/승률(%)을 입력하세요.</div>';
        return;
      }
      var b = od - 1;
      var q = 1 - p;
      var f = (b*p - q)/b; // kelly
      f = clamp(f, 0, 0.25); // hard guard
      var fAdj = f * frac;
      // losing streak guard
      if(loss>=2) fAdj *= 0.6;
      if(loss>=4) fAdj *= 0.4;

      var stake = bk * fAdj;
      var capAmt = bk * cap;
      var finalStake = Math.min(stake, capAmt);

      stakeEl.textContent = fmt(Math.round(finalStake),0);
      kelEl.textContent = fmt(f,3);
      capEl.textContent = fmt(Math.round(capAmt),0);

      sizeOut.style.display='block';
      var lines=[];
      if(f<=0){ lines.push('입력 승률 기준으로는 <b>엣지(우위)</b>가 부족합니다. 소액 테스트/패스 권장.'); }
      else lines.push('분수 켈리('+fmt(frac,3)+') 기준 추천입니다. (연패 '+loss+'회 보호 적용)');
      lines.push('무조건 금액을 늘리기보다, <b>최대 손실 캡</b>을 지키는 것이 장기 생존에 중요합니다.');
      sizeOut.innerHTML = '<h4>설명</h4><ul>' + lines.map(function(x){return '<li>'+x+'</li>';}).join('') + '</ul>';
    });
    qs(container,'[data-act="sizeReset"]').addEventListener('click', function(){
      ['bk','od','p'].forEach(function(k){ qs(container,'[data-k="'+k+'\"]').value=''; });
      qs(container,'[data-k="loss"]').value='0';
      qs(container,'[data-k="cap"]').value='2';
      qs(container,'[data-out="stake"]').textContent='—';
      qs(container,'[data-out="kel"]').textContent='—';
      qs(container,'[data-out="capv"]').textContent='—';
      sizeOut.style.display='none'; sizeOut.innerHTML='';
    });

    // --- parlay risk ---
    var parOut = qs(container,'[data-out="parOut"]');
    qs(container,'[data-act="parRun"]').addEventListener('click', function(){
      var txt = (qs(container,'[data-k="legs"]').value||'').trim();
      var dupLimit = parseInt(qs(container,'[data-k="dup"]').value||'1',10);
      var det = qs(container,'[data-k="legs"]').closest('details') || container;
      if(!txt){
        makeTags(det, [{text:'다리 목록 입력', level:'warn'}]);
        parOut.style.display='block';
        parOut.innerHTML='<h4>입력 필요</h4><div class="ps-note">줄마다 다리를 입력하세요. (같은 경기/팀 감지)</div>';
        return;
      }
      var lines = txt.split(/\n+/).map(function(s){return s.trim();}).filter(Boolean);
      var norm = function(s){ return s.toLowerCase().replace(/[^a-z0-9가-힣\s]/g,' ').replace(/\s+/g,' ').trim(); };

      // crude entity extraction: first 2 tokens treated as "team/match key"
      var keys = lines.map(function(s){
        var n = norm(s);
        var toks = n.split(' ').filter(Boolean);
        return toks.slice(0,2).join(' ');
      });

      var count = {};
      keys.forEach(function(k){ if(!k) return; count[k] = (count[k]||0)+1; });

      var overlaps = Object.keys(count).filter(function(k){return count[k] > 1;}).map(function(k){return {k:k, n:count[k]};});

      var tags=[];
      var msgs=[];

      if(overlaps.length){
        overlaps.sort(function(a,b){return b.n-a.n;});
        msgs.push('중복 감지: ' + overlaps.map(function(o){return '<b>'+o.k+'</b> ×'+o.n;}).join(', '));
        var maxN = overlaps[0].n;
        if(maxN > dupLimit){ tags.push({text:'상관 리스크 높음', level:'bad'}); msgs.push('허용 중복('+dupLimit+')을 초과했습니다. 같은 경기 다리를 줄이세요.'); }
        else { tags.push({text:'중복 있음', level:'warn'}); msgs.push('중복이 있습니다. 시장이 같은 방향으로 움직이면 손실도 같이 커질 수 있습니다.'); }
      } else {
        tags.push({text:'중복 낮음', level:'good'});
        msgs.push('큰 중복은 감지되지 않았습니다. (텍스트 기반 감지이므로 완전하지 않음)');
      }

      // keyword correlation heuristics
      var kwSame = 0;
      var kwSet = ['승','패','무','오버','언더','핸디','-','+'];
      lines.forEach(function(s){
        var n = norm(s);
        for(var i=0;i<kwSet.length;i++) if(n.indexOf(kwSet[i])>=0) { kwSame++; break; }
      });
      if(lines.length>=4) msgs.push('다리 수가 많을수록 실현 확률이 급격히 낮아집니다. 2~3다리로 테스트 권장.');

      makeTags(det, tags);
      parOut.style.display='block';
      parOut.innerHTML = '<h4>체크 결과</h4><ul>' + msgs.map(function(x){return '<li>'+x+'</li>';}).join('') + '</ul>' +
        '<div class="ps-note" style="margin-top:10px;">TIP) 같은 경기(팀) 다리는 <b>상관</b> 때문에 기대값이 나빠질 수 있습니다.</div>';
    });
    qs(container,'[data-act="parReset"]').addEventListener('click', function(){
      qs(container,'[data-k="legs"]').value='';
      parOut.style.display='none'; parOut.innerHTML='';
      var det = qs(container,'[data-k="legs"]').closest('details') || container;
      makeTags(det, []);
    });
  }

  // --- Casino suite rendering ---
  function renderCasino(container){
    container.classList.add('ps-stack');
    container.innerHTML = [
      '<details class="ps-acc">',
      '  <summary><span>🧨 변동성/파산 확률 시뮬레이터</span><span class="ps-badge">예산 생존</span></summary>',
      '  <div class="ps-acc-body">',
      '    <div class="ps-note">하우스엣지/베팅단위/횟수로 <b>파산 확률</b>과 <b>최대 낙폭</b>을 추정합니다. (단순 모델)</div>',
      '    <div class="ps-row cols3" style="margin-top:10px;">',
      '      <div class="ps-field"><label>자금(원)</label><input data-k="rb" inputmode="numeric" placeholder="예: 500000"/></div>',
      '      <div class="ps-field"><label>1회 베팅(원)</label><input data-k="bet" inputmode="numeric" placeholder="예: 10000"/></div>',
      '      <div class="ps-field"><label>횟수(N)</label><input data-k="n" inputmode="numeric" value="200"/></div>',
      '    </div>',
      '    <div class="ps-row cols3" style="margin-top:10px;">',
      '      <div class="ps-field"><label>하우스엣지(%)</label><input data-k="he" inputmode="decimal" value="1.2"/></div>',
      '      <div class="ps-field"><label>승리 수익배수(+) </label><input data-k="pay" inputmode="decimal" value="1"/></div>',
      '      <div class="ps-field"><label>시뮬 횟수</label><select data-k="sims"><option value="1200">1,200</option><option value="2000" selected>2,000</option><option value="4000">4,000</option></select></div>',
      '    </div>',
      '    <div class="ps-actions">',
      '      <button class="ps-btn primary" data-act="sim">시뮬레이션</button>',
      '      <button class="ps-btn secondary" data-act="simReset">초기화</button>',
      '    </div>',
      '    <div class="ps-kpis cols3">',
      '      <div class="ps-kpi"><div class="k">파산 확률</div><div class="v" data-out="ruin">—</div><div class="s">bankroll ≤ 0</div></div>',
      '      <div class="ps-kpi"><div class="k">최종자금(P50)</div><div class="v" data-out="final">—</div><div class="s">중앙값</div></div>',
      '      <div class="ps-kpi"><div class="k">MDD(P95)</div><div class="v" data-out="mdd">—</div><div class="s">최악권 낙폭</div></div>',
      '    </div>',
      '    <div class="ps-out" data-out="simOut" style="display:none;"></div>',
      '  </div>',
      '</details>',

      '<details class="ps-acc">',
      '  <summary><span>🧠 스트릭(연속) 착각 방지</span><span class="ps-badge">연속은 흔함</span></summary>',
      '  <div class="ps-acc-body">',
      '    <div class="ps-note">N회 중 <b>연속 K번</b>이 최소 1번 이상 나올 확률을 계산합니다. “조작” 판단 전에 체크.</div>',
      '    <div class="ps-row cols3" style="margin-top:10px;">',
      '      <div class="ps-field"><label>시도 횟수(N)</label><input data-k="sn" inputmode="numeric" value="200"/></div>',
      '      <div class="ps-field"><label>성공 확률(p)</label><input data-k="sp" inputmode="decimal" value="0.5"/></div>',
      '      <div class="ps-field"><label>연속 길이(K)</label><input data-k="sk" inputmode="numeric" value="8"/></div>',
      '    </div>',
      '    <div class="ps-actions">',
      '      <button class="ps-btn primary" data-act="streak">계산</button>',
      '      <button class="ps-btn secondary" data-act="stReset">초기화</button>',
      '    </div>',
      '    <div class="ps-kpis cols3">',
      '      <div class="ps-kpi"><div class="k">발생 확률</div><div class="v" data-out="sp1">—</div><div class="s">≥ 1회</div></div>',
      '      <div class="ps-kpi"><div class="k">판정</div><div class="v" data-out="spLab" style="font-size:16px;">—</div><div class="s">체감 vs 현실</div></div>',
      '      <div class="ps-kpi"><div class="k">참고</div><div class="v" data-out="spHint" style="font-size:16px;">—</div><div class="s">리스크</div></div>',
      '    </div>',
      '    <div class="ps-out" data-out="stOut" style="display:none;"></div>',
      '  </div>',
      '</details>'
    ].join('');

    // ruin sim handlers
    var outBox = qs(container,'[data-out="simOut"]');
    qs(container,'[data-act="sim"]').addEventListener('click', function(){
      var rb = parseFloat(qs(container,'[data-k="rb"]').value);
      var bet = parseFloat(qs(container,'[data-k="bet"]').value);
      var n = parseInt(qs(container,'[data-k="n"]').value||'200',10);
      var he = parseFloat(qs(container,'[data-k="he"]').value);
      var pay = parseFloat(qs(container,'[data-k="pay"]').value);
      var sims = parseInt(qs(container,'[data-k="sims"]').value||'2000',10);

      if(!(isFinite(rb)&&rb>0 && isFinite(bet)&&bet>0)){
        outBox.style.display='block';
        outBox.innerHTML='<h4>입력 필요</h4><div class="ps-note">자금/1회 베팅을 입력하세요.</div>';
        return;
      }

      var r = ruinSim({bankroll:rb, bet:bet, n:n, houseEdge:he, payout:pay, sims:sims});
      qs(container,'[data-out="ruin"]').textContent = fmt(r.ruinProb*100,1)+'%';
      qs(container,'[data-out="final"]').textContent = fmt(Math.round(r.finalP50),0);
      qs(container,'[data-out="mdd"]').textContent = fmt(Math.round(r.mddP95),0);

      var msg=[];
      msg.push('승률(p) 추정값: <b>'+fmt(r.pWin,3)+'</b> (하우스엣지 '+fmt(he,2)+'% 가정)');
      msg.push('최종자금 분포: P05 <b>'+fmt(Math.round(r.finalP05),0)+'</b> / P50 <b>'+fmt(Math.round(r.finalP50),0)+'</b> / P95 <b>'+fmt(Math.round(r.finalP95),0)+'</b>');
      msg.push('MDD(낙폭): P50 <b>'+fmt(Math.round(r.mddP50),0)+'</b> / P95 <b>'+fmt(Math.round(r.mddP95),0)+'</b>');
      if(r.ruinProb>0.25) msg.push('<b>파산 확률이 큽니다.</b> 베팅 단위를 낮추거나, 횟수를 줄이고 손절 기준을 설정하세요.');
      else msg.push('파산 확률이 낮아도, 장기적으로는 하우스엣지 때문에 기대값이 불리할 수 있습니다.');

      outBox.style.display='block';
      outBox.innerHTML='<h4>요약</h4><ul>'+msg.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul>';
    });
    qs(container,'[data-act="simReset"]').addEventListener('click', function(){
      qs(container,'[data-k="rb"]').value='';
      qs(container,'[data-k="bet"]').value='';
      qs(container,'[data-k="n"]').value='200';
      qs(container,'[data-k="he"]').value='1.2';
      qs(container,'[data-k="pay"]').value='1';
      qs(container,'[data-out="ruin"]').textContent='—';
      qs(container,'[data-out="final"]').textContent='—';
      qs(container,'[data-out="mdd"]').textContent='—';
      outBox.style.display='none'; outBox.innerHTML='';
    });

    // streak handlers
    var stBox = qs(container,'[data-out="stOut"]');
    qs(container,'[data-act="streak"]').addEventListener('click', function(){
      var n = parseInt(qs(container,'[data-k="sn"]').value||'200',10);
      var p = parseFloat(qs(container,'[data-k="sp"]').value);
      var k = parseInt(qs(container,'[data-k="sk"]').value||'8',10);
      if(!(isFinite(n)&&n>0 && isFinite(p)&&p>=0&&p<=1 && isFinite(k)&&k>0)){
        stBox.style.display='block';
        stBox.innerHTML='<h4>입력 필요</h4><div class="ps-note">N, p(0~1), K를 입력하세요.</div>';
        return;
      }
      var pr = probAtLeastOneRun(n, p, k);
      qs(container,'[data-out="sp1"]').textContent = fmt(pr*100,1)+'%';
      var lab = pr>0.7 ? '흔함' : (pr>0.3 ? '가능' : '드묾');
      qs(container,'[data-out="spLab"]').textContent = lab;
      qs(container,'[data-out="spHint"]').textContent = (k+'연속');

      var msg=[];
      msg.push('N='+n+', p='+fmt(p,3)+'에서 <b>'+k+'연속</b>이 1번 이상 나올 확률은 <b>'+fmt(pr*100,1)+'%</b> 입니다.');
      msg.push('즉, 연속이 나왔다고 해서 “조작”이라고 단정하기 어렵습니다. 표본이 커질수록 긴 연속도 자연스럽게 등장합니다.');
      msg.push('대응: 연속 구간에서는 <b>베팅 단위 축소</b>·<b>쿨다운</b>·<b>손절 캡</b>을 우선 적용하세요.');

      stBox.style.display='block';
      stBox.innerHTML='<h4>해석</h4><ul>'+msg.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul>';
    });
    qs(container,'[data-act="stReset"]').addEventListener('click', function(){
      qs(container,'[data-k="sn"]').value='200';
      qs(container,'[data-k="sp"]').value='0.5';
      qs(container,'[data-k="sk"]').value='8';
      qs(container,'[data-out="sp1"]').textContent='—';
      qs(container,'[data-out="spLab"]').textContent='—';
      qs(container,'[data-out="spHint"]').textContent='—';
      stBox.style.display='none'; stBox.innerHTML='';
    });
  }

  // --- Minigame suite (streak tool only) ---
  function renderMinigame(container){
    container.classList.add('ps-stack');
    container.innerHTML = [
      '<details class="ps-acc">',
      '  <summary><span>🧠 스트릭(연속) 확률 체크</span><span class="ps-badge">오해 방지</span></summary>',
      '  <div class="ps-acc-body">',
      '    <div class="ps-note">최근 N회에서 <b>K연속</b>은 생각보다 자주 나옵니다. 과몰입을 막기 위한 체크 도구입니다.</div>',
      '    <div class="ps-row cols3" style="margin-top:10px;">',
      '      <div class="ps-field"><label>시도 횟수(N)</label><input data-k="n" inputmode="numeric" value="120"/></div>',
      '      <div class="ps-field"><label>성공 확률(p)</label><input data-k="p" inputmode="decimal" value="0.5"/></div>',
      '      <div class="ps-field"><label>연속 길이(K)</label><input data-k="k" inputmode="numeric" value="7"/></div>',
      '    </div>',
      '    <div class="ps-actions">',
      '      <button class="ps-btn primary" data-act="run">계산</button>',
      '      <button class="ps-btn secondary" data-act="reset">초기화</button>',
      '    </div>',
      '    <div class="ps-kpis cols3">',
      '      <div class="ps-kpi"><div class="k">발생 확률</div><div class="v" data-out="p1">—</div><div class="s">≥1회</div></div>',
      '      <div class="ps-kpi"><div class="k">판정</div><div class="v" data-out="lab" style="font-size:16px;">—</div><div class="s">체감</div></div>',
      '      <div class="ps-kpi"><div class="k">권장</div><div class="v" data-out="rec" style="font-size:16px;">—</div><div class="s">세션</div></div>',
      '    </div>',
      '    <div class="ps-out" data-out="out" style="display:none;"></div>',
      '  </div>',
      '</details>'
    ].join('');

    var out = qs(container,'[data-out="out"]');
    qs(container,'[data-act="run"]').addEventListener('click', function(){
      var n = parseInt(qs(container,'[data-k="n"]').value||'120',10);
      var p = parseFloat(qs(container,'[data-k="p"]').value);
      var k = parseInt(qs(container,'[data-k="k"]').value||'7',10);
      var pr = probAtLeastOneRun(n,p,k);
      qs(container,'[data-out="p1"]').textContent = fmt(pr*100,1)+'%';
      var lab = pr>0.7 ? '흔함' : (pr>0.3 ? '가능' : '드묾');
      qs(container,'[data-out="lab"]').textContent = lab;
      qs(container,'[data-out="rec"]').textContent = pr>0.5 ? '단위↓/쿨다운' : '중립';
      out.style.display='block';
      out.innerHTML = '<h4>해석</h4><ul>'+
        '<li>N='+n+', p='+fmt(p,3)+'에서 <b>'+k+'연속</b>이 1번 이상 나올 확률: <b>'+fmt(pr*100,1)+'%</b></li>'+
        '<li>연속이 나온다고 확률이 “보정”되지는 않습니다. 다음 결과는 여전히 p에 가깝습니다.</li>'+
        '<li>대응: 연속 구간에는 베팅 단위를 줄이고, 손절/시간 제한을 우선 적용하세요.</li>'+
      '</ul>';
    });
    qs(container,'[data-act="reset"]').addEventListener('click', function(){
      qs(container,'[data-k="n"]').value='120';
      qs(container,'[data-k="p"]').value='0.5';
      qs(container,'[data-k="k"]').value='7';
      qs(container,'[data-out="p1"]').textContent='—';
      qs(container,'[data-out="lab"]').textContent='—';
      qs(container,'[data-out="rec"]').textContent='—';
      out.style.display='none'; out.innerHTML='';
    });
  }

  function ensureCertPopupSticky(){
    var popup = qs(document,'#cardPopup');
    var box = popup ? qs(popup,'.popup-box') : null;
    if(!popup || !box) return;
    if(qs(box,'.ps-sticky')) return; // already

    var sticky = document.createElement('div');
    sticky.className = 'ps-sticky';
    sticky.innerHTML = [
      '<div class="row">',
      '  <button class="ps-btn primary" type="button" data-act="copygo">원클릭 복사+이동</button>',
      '  <button class="ps-btn ghost" type="button" data-act="copy">코드 복사</button>',
      '  <button class="ps-btn ghost" type="button" data-act="share">링크 복사</button>',
      '</div>',
      '<div class="ps-note" style="margin-top:8px;">* 상단 고정(모바일) · 하단 중복 버튼은 자동 숨김</div>'
    ].join('');

    // insert after close button so it stays at top
    var closeBtn = qs(box,'#closeBtn');
    if(closeBtn && closeBtn.nextSibling) box.insertBefore(sticky, closeBtn.nextSibling);
    else box.insertBefore(sticky, box.firstChild);

    try{ popup.classList.add('ps-popup-unified'); }catch(e){}


    function copySync(text){
      try{
        var ta = document.createElement('textarea');
        ta.value = text || '';
        ta.setAttribute('readonly','');
        ta.style.position='fixed';
        ta.style.left='-9999px';
        ta.style.top='-9999px';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        var ok = document.execCommand && document.execCommand('copy');
        document.body.removeChild(ta);
        return !!ok;
      }catch(e){ return false; }
    }

    function toast(msg){
      var t = qs(document,'#copyToast');
      if(!t) return;
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(function(){ t.classList.remove('show'); }, 1600);
    }

    function getCode(){
      var el = qs(box,'#pCode');
      return el ? (el.textContent||'').trim() : '';
    }
    function getLink(){
      var a = qs(box,'#pLink');
      return a ? (a.getAttribute('href')||'').trim() : '';
    }

    qs(sticky,'[data-act="copy"]').addEventListener('click', function(){
      var btn = qs(box,'#copyBtn');
      if(btn){ try{ btn.click(); return; }catch(e){} }
      var code = getCode();
      if(!code){ toast('복사할 코드가 없습니다'); return; }
      if(copySync(code)) toast('가입코드가 복사되었습니다');
      else toast('복사 실패(브라우저 설정 확인)');
    });

    qs(sticky,'[data-act="share"]').addEventListener('click', function(){
      var btn = qs(box,'#shareBtn');
      if(btn){ try{ btn.click(); return; }catch(e){} }
      var url = window.location.href;
      if(copySync(url)) toast('링크가 복사되었습니다');
      else toast('복사 실패(브라우저 설정 확인)');
    });

    qs(sticky,'[data-act="copygo"]').addEventListener('click', function(){
      var code = getCode();
      var link = getLink();
      if(!link || link==='#'){ toast('이동 링크가 없습니다'); return; }
      // Do sync copy first (keeps user gesture on mobile)
      if(code) copySync(code);
      try{ window.open(link, '_blank', 'noopener'); } catch(e){ location.href = link; }
      toast('코드 복사 후 이동');
    });
  }


  // --- Shared: Learn pack (1분요약/예시/실수/추천세팅) ---
  var LEARN_PACKS = {
    "/analysis/": {
      title: "스포츠 배당 분석기",
      oneMin: [
        "배당을 붙여넣으면 <b>마진(오버라운드)</b>·<b>공정확률</b>·<b>공정배당</b>을 즉시 정리합니다.",
        "이 도구는 ‘예측’이 아니라 <b>수학 기반 판단 보조</b>입니다."
      ],
      examples: [
        "예시(1X2): 1.80 / 3.70 / 4.40 → 마진·공정확률 확인 → ‘덜 불리한 라인’ 체크",
        "예시(O/U): 2.5 1.91 1.91 → 라인별 마진 비교 → 값이 큰 쪽은 보수적으로",
        "예시(라인무브): 오픈 대비 현재 배당 변화 → 리스크 태그 확인(마이너/급무브)"
      ],
      mistakes: [
        "서로 다른 북/시장 라인을 섞어 넣기(같은 마켓 기준으로 비교)",
        "마진이 높은 시장을 ‘확률’로 착각하기(수수료 포함)",
        "오즈무브를 ‘확정 정보’로 과해석하기(뉴스/부상은 별도 확인)",
        "소수점 자리/공백/구분자 혼용(붙여넣기 전 한번 정리)",
        "연패 구간에서 단위 올리기(기록/세션 제한 우선)"
      ],
      presets: [
        "보수: 켈리 1/8 + 최대 손실 1% + 마이너리그는 패스",
        "중립: 켈리 1/4 + 최대 손실 2% + 급무브는 라이브 대기",
        "공격: 켈리 1/2 + 최대 손실 3% (단, 세션 손실 한도 점검 필수)"
      ]
    },
    "/tool-margin/": {
      title: "마진 계산기",
      oneMin: ["여러 결과 배당을 넣으면 <b>오버라운드(합계−1)</b>로 마진을 계산합니다."],
      examples: ["1X2: 1.90/3.60/4.20 → 합(1/odds)−1 = 마진", "2-way: 1.91/1.91 → 마진 확인 후 ‘덜 불리한 시장’ 선택"],
      mistakes: ["승/무/패가 아닌 라인을 섞어서 넣기", "오즈를 확률로 착각(마진 포함)", "비교 대상이 다른 리그/북이면 의미 약함"],
      presets: ["마진 3% 이하: 상대적으로 양호", "마진 5% 이상: 보수적으로(참고용)"]
    },
    "/tool-ev/": {
      title: "EV 계산기",
      oneMin: ["확률(또는 공정확률)과 배당으로 <b>기대값(EV)</b>을 계산합니다."],
      examples: ["p=55%, odds=1.95 → EV 확인", "손익분기점(p=1/odds) 대비 내 추정 p가 큰지 체크"],
      mistakes: ["p를 ‘희망’으로 입력", "표본/근거 없이 p를 과대평가", "연패 때 p를 올려 자기합리화"],
      presets: ["초보: p는 공정확률 주변에서만 소폭 조정", "기록: 분석 결과와 실제 결과를 비교해 내 p를 보정"]
    },
    "/tool-odds/": {
      title: "배당↔확률 변환",
      oneMin: ["배당을 암시확률로, 확률을 공정배당으로 변환합니다."],
      examples: ["2.00 → 50%", "60% → 1.67(공정배당)"],
      mistakes: ["여러 결과(1X2)에서 단일 변환만으로 판단", "미국식/홍콩식 표기 혼동"],
      presets: ["표기 혼동 방지: Odds+ 포맷 변환(접기) 사용"]
    },
    "/tool/fair-odds/": {
      title: "공정배당(무비그)",
      oneMin: ["여러 결과 배당의 마진을 제거해 <b>공정확률/공정배당</b>을 계산합니다."],
      examples: ["1X2 배당 3개 입력 → 무비그 확률/공정배당 확인", "O/U 두 결과 입력 → 공정 배당으로 비교"],
      mistakes: ["단일 배당만 넣고 무비그라고 착각", "서로 다른 마켓 배당 혼합"],
      presets: ["마진 낮은 시장을 우선 선택하고, 공정확률을 기준으로 EV를 재확인"]
    },
"/tool/kelly/": {
      title: "Kelly 비중",
      oneMin: ["내 확률(p)과 배당(odds)로 <b>추천 비중</b>을 계산합니다(참고용)."],
      examples: ["p=54%, odds=1.95 → 켈리/분수 켈리 비교"],
      mistakes: ["p 과신(켈리는 p에 매우 민감)", "올인/과도한 비중", "연패 구간에 비중 상승"],
      presets: ["권장: 켈리 1/4 또는 1/8 + 최대손실 캡"]
    },
    "/tool-casino/": {
      title: "카지노 전략 분석기",
      oneMin: ["전략별 다음 베팅을 자동 계산하고 <b>세션 리스크</b>(MDD 등)를 보여줍니다."],
      examples: ["단위/올림 설정 → WIN/LOSE로 다음 스텝 확인", "세션 목표·손절선을 먼저 고정"],
      mistakes: ["연패 시 단위 급상승", "손절/시간 제한 없이 계속 플레이", "전략을 ‘필승’으로 오해"],
      presets: ["보수: 단위 고정 + 손절선/시간 제한", "중립: 분할 목표 + MDD 확인"]
    },
    "/tool-minigame/": {
      title: "미니게임 분석기",
      oneMin: ["최근 결과를 <b>보기 좋게 정리</b>해 편향/연속을 점검합니다."],
      examples: ["최근 20 입력 → 빈도/연속 확인 → 과몰입 방지 태그"],
      mistakes: ["연속=다음 반대 확정(도박사의 오류)", "표본이 너무 짧은데 확신"],
      presets: ["연속 구간에는 단위↓/휴식↑"]
    },
    "/tool-slot/": {
      title: "슬롯 RTP 분석기",
      oneMin: ["RTP/변동성 기반으로 <b>기대손실(세션 비용)</b>을 투명하게 보여줍니다."],
      examples: ["총베팅/예상손실 계산 → 손절선/세션 길이 결정"],
      mistakes: ["RTP를 ‘수익 보장’으로 오해", "변동성 무시(맥스윈만 보고 과몰입)"],
      presets: ["세션 비용을 먼저 정하고, 그 안에서만 플레이"]
    },
    "/tool-virtual/": {
      title: "BET365 가상게임 분석기",
      oneMin: ["전 종목/마켓 배당을 입력하면 <b>마진·공정확률·공정배당</b>을 자동 정리합니다."],
      examples: ["라인 다중 붙여넣기 → 라인별 마진 비교 → 덜 불리한 선택 표시"],
      mistakes: ["마진이 큰 라인을 무시", "라인 무브를 과해석"],
      presets: ["마진 낮은 라인 우선 + 급무브는 대기"]
    },
    "/cert/": {
      title: "인증사이트",
      oneMin: ["카드 클릭 → 코드/혜택/주의 확인 → <b>체크리스트</b> 완료 후 이동을 권장합니다."],
      examples: ["즐겨찾기/최근 기록으로 재방문 속도↑"],
      mistakes: ["조건 확인 없이 바로 이동", "링크 공유 시 코드 누락"],
      presets: ["팝업 상단 ‘원클릭 복사+이동’ 사용"]
    },
    "/analysis/": {
      title: "기록 분석",
      oneMin: ["분석 결과와 실제 결과를 비교해 내 판단 기준을 정리합니다."],
      examples: ["최소 입력(배당/금액/결과)으로 흐름과 손익을 빠르게 점검"],
      mistakes: ["결과 검증 없이 감으로만 운영", "연패 구간에 스테이킹을 올림"],
      presets: ["세션 리스크를 먼저 확인한 뒤 단위 조정"]
    }
  };

  function injectLearnPack(){
    var path = (location.pathname||"/");
    var key = Object.keys(LEARN_PACKS).find(function(k){ return path.indexOf(k)===0; });
    if(!key) return;

    // avoid duplicates
    if(document.querySelector('.ps-learnpack')) return;

    var data = LEARN_PACKS[key];
    // choose mount
    var mount = document.querySelector('main') || document.querySelector('.wrap') || document.querySelector('.hub') || document.body;
    if(!mount) return;

    var box = document.createElement('details');
    box.className = 'ps-acc ps-learnpack';
    box.open = false;
    box.innerHTML = [
      '<summary><span>📚 빠른 가이드</span><span class="ps-badge">1분요약 · 예시 · 실수 · 추천</span></summary>',
      '<div class="ps-acc-body">',
      '  <div class="ps-note"><b>'+escapeHtml(data.title)+'</b> 기준으로 정리했습니다. (접어서 두고 필요할 때만 열기)</div>',
      '  <div class="ps-learn-grid">',
      '    <div class="ps-mini"><div class="h">1분 요약</div><ul>'+ (data.oneMin||[]).map(li).join('') +'</ul></div>',
      '    <div class="ps-mini"><div class="h">예시 3개</div><ul>'+ (data.examples||[]).map(li).join('') +'</ul></div>',
      '    <div class="ps-mini"><div class="h">자주 하는 실수</div><ul>'+ (data.mistakes||[]).map(li).join('') +'</ul></div>',
      '    <div class="ps-mini"><div class="h">추천 세팅</div><ul>'+ (data.presets||[]).map(li).join('') +'</ul></div>',
      '  </div>',
      '</div>'
    ].join('');

    // insert near end but before footer if exists
    var footer = mount.querySelector('footer');
    if(footer && footer.parentNode) footer.parentNode.insertBefore(box, footer);
    else mount.appendChild(box);

    function li(t){ return '<li>'+t+'</li>'; }
  }

  function escapeHtml(s){
    return (s||'').replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]);
    });
  }

  // --- Odds+ (format converter + probability table) ---
  function enhanceOddsPage(){
    var path = (location.pathname||"/");
    if(path.indexOf('/tool-odds/')!==0) return;
    var wrap = document.querySelector('.wrap') || document.body;
    if(!wrap || wrap.querySelector('.ps-oddsplus')) return;

    var host = document.createElement('div');
    host.className = 'ps-oddsplus';
    host.innerHTML = [
      '<details class="ps-acc">',
      '<summary><span>🔁 Odds+ 포맷 변환</span><span class="ps-badge">Decimal · US · Fraction · HK · Indo</span></summary>',
      '<div class="ps-acc-body">',
      ' <div class="ps-note">어떤 칸에 입력해도 나머지 포맷을 자동 변환합니다. (단일 결과 기준)</div>',
      ' <div class="ps-row cols3" style="margin-top:10px;">',
      '   <div class="ps-field"><label>Decimal</label><input data-k="dec" inputmode="decimal" placeholder="예: 1.95"></div>',
      '   <div class="ps-field"><label>American(US)</label><input data-k="us" inputmode="decimal" placeholder="예: -105 / +120"></div>',
      '   <div class="ps-field"><label>Fraction</label><input data-k="frac" placeholder="예: 3/2"></div>',
      ' </div>',
      ' <div class="ps-row cols3" style="margin-top:10px;">',
      '   <div class="ps-field"><label>Hong Kong</label><input data-k="hk" inputmode="decimal" placeholder="예: 0.95"></div>',
      '   <div class="ps-field"><label>Indonesian</label><input data-k="indo" inputmode="decimal" placeholder="예: -1.05 / +1.20"></div>',
      '   <div class="ps-field"><label>Implied Prob</label><input data-k="p" inputmode="decimal" placeholder="예: 51.28%" disabled></div>',
      ' </div>',
      ' <div class="ps-actions">',
      '   <button class="ps-btn secondary" type="button" data-act="reset">초기화</button>',
      '   <button class="ps-btn ghost" type="button" data-act="copy">현재 값 복사</button>',
      ' </div>',
      '</div>',
      '</details>',

      '<details class="ps-acc">',
      '<summary><span>📋 확률표</span><span class="ps-badge">손익분기점</span></summary>',
      '<div class="ps-acc-body">',
      ' <div class="ps-row cols3" style="margin-top:6px;">',
      '   <div class="ps-field"><label>최소(%)</label><input data-k="pmin" inputmode="decimal" value="5"></div>',
      '   <div class="ps-field"><label>최대(%)</label><input data-k="pmax" inputmode="decimal" value="95"></div>',
      '   <div class="ps-field"><label>간격(%)</label><select data-k="step"><option value="5">5</option><option value="2">2</option><option value="1">1</option><option value="10">10</option></select></div>',
      ' </div>',
      ' <div class="ps-actions"><button class="ps-btn primary" type="button" data-act="tbl">표 생성</button></div>',
      ' <div class="ps-odds-table" data-out="tbl" style="display:none;"></div>',
      '</div>',
      '</details>'
    ].join('');

    // place near end (before footer if exists)
    var footer = wrap.querySelector('footer');
    if(footer && footer.parentNode) footer.parentNode.insertBefore(host, footer);
    else wrap.appendChild(host);

    var box = host;
    var dec = box.querySelector('[data-k="dec"]');
    var us = box.querySelector('[data-k="us"]');
    var frac = box.querySelector('[data-k="frac"]');
    var hk = box.querySelector('[data-k="hk"]');
    var indo = box.querySelector('[data-k="indo"]');
    var p = box.querySelector('[data-k="p"]');

    function toDecFromAny(){
      var v;
      if(dec.value && isFinite(+dec.value)) return clamp(+dec.value, 1.0001, 1000);
      if(hk.value && isFinite(+hk.value)) return clamp(1 + (+hk.value), 1.0001, 1000);
      if(us.value && isFinite(+us.value)) return usToDec(+us.value);
      if(indo.value && isFinite(+indo.value)) return indoToDec(+indo.value);
      if(frac.value) {
        v = fracToDec(frac.value);
        if(isFinite(v)) return clamp(v, 1.0001, 1000);
      }
      return null;
    }

    function setAll(d){
      if(!d || !isFinite(d)) return;
      dec.value = round(d, 4);
      hk.value = round(d-1, 4);
      us.value = round(decToUs(d), 0);
      indo.value = round(decToIndo(d), 3);
      frac.value = decToFrac(d);
      p.value = round((1/d)*100, 2) + '%';
    }

    function round(x, n){
      if(!isFinite(x)) return '';
      var m = Math.pow(10, n||0);
      return (Math.round(x*m)/m).toString();
    }

    function usToDec(a){
      if(!isFinite(a) || a===0) return null;
      if(a>0) return 1 + a/100;
      return 1 + 100/Math.abs(a);
    }
    function decToUs(d){
      if(d>=2) return (d-1)*100;
      return -100/(d-1);
    }
    function indoToDec(i){
      if(!isFinite(i) || i===0) return null;
      if(i>0) return 1 + i;
      return 1 + 1/Math.abs(i);
    }
    function decToIndo(d){
      if(d>=2) return d-1;
      return -1/(d-1);
    }
    function fracToDec(s){
      s = (s||'').trim();
      if(!s) return null;
      if(/^\d+(\.\d+)?$/.test(s)) return 1 + parseFloat(s); // treat as profit part
      var m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
      if(!m) return null;
      var a = parseInt(m[1],10), b = parseInt(m[2],10);
      if(!a || !b) return null;
      return 1 + (a/b);
    }
    function decToFrac(d){
      var x = d-1;
      if(!isFinite(x) || x<=0) return '';
      // approximate to rational with limited denominator
      var bestA=1, bestB=1, bestErr=1e9;
      var maxB=100;
      for(var b=1;b<=maxB;b++){
        var a = Math.round(x*b);
        var err = Math.abs(x - a/b);
        if(err < bestErr){ bestErr=err; bestA=a; bestB=b; }
        if(bestErr < 1e-6) break;
      }
      // simplify
      var g = gcd(bestA, bestB);
      bestA/=g; bestB/=g;
      return bestA + '/' + bestB;
    }
    function gcd(a,b){ while(b){ var t=a%b; a=b; b=t; } return a||1; }

    function onChange(){
      var d = toDecFromAny();
      if(!d) return;
      setAll(d);
    }
    [dec,us,frac,hk,indo].forEach(function(inp){
      if(!inp) return;
      inp.addEventListener('input', function(){ onChange(); });
      inp.addEventListener('blur', function(){ onChange(); });
    });

    box.querySelector('[data-act="reset"]').addEventListener('click', function(){
      [dec,us,frac,hk,indo].forEach(function(i){ if(i) i.value=''; });
      if(p) p.value='';
      var out = box.querySelector('[data-out="tbl"]');
      if(out){ out.style.display='none'; out.innerHTML=''; }
    });

    box.querySelector('[data-act="copy"]').addEventListener('click', function(){
      var d = toDecFromAny();
      if(!d){ return; }
      var payload = [
        'Decimal: '+round(d,4),
        'US: '+round(decToUs(d),0),
        'Fraction: '+decToFrac(d),
        'HK: '+round(d-1,4),
        'Indo: '+round(decToIndo(d),3),
        'Prob: '+round((1/d)*100,2)+'%'
      ].join('\n');
      try{
        navigator.clipboard.writeText(payload);
      }catch(e){}
      try{
        var t = document.querySelector('#copyToast');
        if(t){ t.textContent='값이 복사되었습니다'; t.classList.add('show'); setTimeout(function(){t.classList.remove('show');}, 1400); }
      }catch(e){}
    });

    host.querySelector('[data-act="tbl"]').addEventListener('click', function(){
      var pmin = clamp(parseFloat(host.querySelector('[data-k="pmin"]').value||'5'), 1, 99);
      var pmax = clamp(parseFloat(host.querySelector('[data-k="pmax"]').value||'95'), 1, 99);
      var step = clamp(parseFloat(host.querySelector('[data-k="step"]').value||'5'), 1, 20);
      if(pmin>pmax){ var t=pmin; pmin=pmax; pmax=t; }
      var rows = [];
      for(var pp=pmin; pp<=pmax+1e-9; pp+=step){
        var d = 100/pp;
        rows.push({p:pp, d:d});
      }
      var out = host.querySelector('[data-out="tbl"]');
      if(!out) return;
      out.style.display='block';
      out.innerHTML = '<table><thead><tr><th>확률(%)</th><th>공정 배당(Decimal)</th><th>HK</th><th>US</th></tr></thead><tbody>'+
        rows.map(function(r){
          var d = r.d;
          return '<tr><td>'+round(r.p,1)+'</td><td><b>'+round(d,3)+'</b></td><td>'+round(d-1,3)+'</td><td>'+round(decToUs(d),0)+'</td></tr>';
        }).join('') +
      '</tbody></table>';
    });

    // initialize with existing odds if present
    try{
      var seed = document.querySelector('#odds');
      if(seed && seed.value) { dec.value = seed.value; onChange(); }
    }catch(e){}
  }

  // --- Logbook (local) ---
  function renderLogbook(container){
    container.classList.add('ps-logbook');
    container.innerHTML = [
      '<div class="ps-log-top">',
      '  <div class="ps-kpis cols3">',
      '    <div class="ps-kpi"><div class="k">주간 ROI</div><div class="v" data-kpi="w_roi">—</div><div class="s" data-kpi="w_note">—</div></div>',
      '    <div class="ps-kpi"><div class="k">월간 ROI</div><div class="v" data-kpi="m_roi">—</div><div class="s" data-kpi="m_note">—</div></div>',
      '    <div class="ps-kpi"><div class="k">최대낙폭(MDD)</div><div class="v" data-kpi="mdd">—</div><div class="s">누적손익 기준</div></div>',
      '  </div>',
      '</div>',

      '<details class="ps-acc" open>',
      '  <summary><span>➕ 빠른 기록</span><span class="ps-badge">로컬 저장</span></summary>',
      '  <div class="ps-acc-body">',
      '    <div class="ps-row cols3">',
      '      <div class="ps-field"><label>날짜</label><input data-k="date" type="date"/></div>',
      '      <div class="ps-field"><label>종목</label><input data-k="sport" placeholder="예: 축구 / 농구"/></div>',
      '      <div class="ps-field"><label>마켓</label><input data-k="market" placeholder="예: 1X2 / O/U"/></div>',
      '    </div>',
      '    <div class="ps-row cols3" style="margin-top:10px;">',
      '      <div class="ps-field"><label>배당(Decimal)</label><input data-k="odds" inputmode="decimal" placeholder="예: 1.95"/></div>',
      '      <div class="ps-field"><label>금액(원)</label><input data-k="stake" inputmode="numeric" placeholder="예: 50000"/></div>',
      '      <div class="ps-field"><label>결과</label><select data-k="res"><option value="W">WIN</option><option value="L">LOSE</option><option value="V">VOID</option></select></div>',
      '    </div>',
      '    <div class="ps-row cols2" style="margin-top:10px;">',
      '      <div class="ps-field"><label>메모(선택)</label><input data-k="note" placeholder="예: 라인 무브 확인"/></div>',
      '      <div class="ps-field"><label>태그(선택)</label><input data-k="tag" placeholder="예: 보수/중립/공격"/></div>',
      '    </div>',
      '    <div class="ps-row" style="margin-top:10px; grid-template-columns:1fr;">',
      '      <div class="ps-field">',
      '        <label>카테고리</label>',
      '        <div class="psCatPick" data-k="catPick">',
      '          <button class="psChip" type="button" data-cat="sports">스포츠</button>',
      '          <button class="psChip" type="button" data-cat="casino">카지노</button>',
      '          <button class="psChip" type="button" data-cat="slot">슬롯</button>',
      '          <button class="psChip" type="button" data-cat="minigame">미니게임</button>',
      '        </div>',
      '        <div class="psChipHint"><span class="psAutoBadge">AUTO</span><span data-out="catAutoLabel">—</span><span class="psChipHint2">· 필요할 때 한 번만 눌러 고정</span></div>',
      '      </div>',
      '    </div>',
      '    <div class="ps-actions">',
      '      <button class="ps-btn primary" type="button" data-act="add">저장</button>',
      '      <button class="ps-btn ghost" type="button" data-act="quickW">WIN</button>',
      '      <button class="ps-btn ghost" type="button" data-act="quickL">LOSE</button>',
      '      <button class="ps-btn secondary" type="button" data-act="reset">초기화</button>',
      '    </div>',
      '  </div>',
      '</details>',

      '<details class="ps-acc" open>',
      '  <summary><span>📊 리포트</span><span class="ps-badge">ROI · 적중률 · 평균배당</span></summary>',
      '  <div class="ps-acc-body">',
      '    <div class="ps-row cols3">',
      '      <div class="ps-kpi"><div class="k">총 베팅</div><div class="v" data-kpi="cnt">—</div><div class="s" data-kpi="span">—</div></div>',
      '      <div class="ps-kpi"><div class="k">적중률</div><div class="v" data-kpi="wr">—</div><div class="s">WIN/(WIN+LOSE)</div></div>',
      '      <div class="ps-kpi"><div class="k">순손익</div><div class="v" data-kpi="pnl">—</div><div class="s" data-kpi="roi">—</div></div>',
      '    </div>',
      '    <div class="ps-row cols3" style="margin-top:10px;">',
      '      <div class="ps-kpi"><div class="k">총 투입</div><div class="v" data-kpi="st">—</div><div class="s">원</div></div>',
      '      <div class="ps-kpi"><div class="k">평균 배당</div><div class="v" data-kpi="avgod">—</div><div class="s">Decimal</div></div>',
      '      <div class="ps-kpi"><div class="k">연속(최대)</div><div class="v" data-kpi="streak">—</div><div class="s">WIN/Lose</div></div>',
      '    </div>',
      '    <div class="ps-actions" style="margin-top:10px;">',
      '      <button class="ps-btn secondary" type="button" data-act="week">이번주</button>',
      '      <button class="ps-btn secondary" type="button" data-act="month">이번달</button>',
      '      <button class="ps-btn ghost" type="button" data-act="all">전체</button>',
      '    </div>',
      '  </div>',
      '</details>',

      '<details class="ps-acc">',
      '  <summary><span>🗂️ 기록 목록</span><span class="ps-badge">최근 50</span></summary>',
      '  <div class="ps-acc-body">',
      '    <div class="ps-log-table" data-out="table"></div>',
      '  </div>',
      '</details>',

      '<details class="ps-acc">',
      '  <summary><span>⬇️ 백업/복원</span><span class="ps-badge">JSON</span></summary>',
      '  <div class="ps-acc-body">',
      '    <div class="ps-note">기록은 브라우저에 저장됩니다. 기기 변경/초기화 전에 백업하세요.</div>',
      '    <div class="ps-actions" style="margin-top:10px;">',
      '      <button class="ps-btn primary" type="button" data-act="export">내보내기(복사)</button>',
      '      <button class="ps-btn ghost" type="button" data-act="download">파일로 저장</button>',
      '      <button class="ps-btn secondary" type="button" data-act="clear">전체 삭제</button>',
      '    </div>',
      '    <div class="ps-field" style="margin-top:10px;"><label>가져오기(JSON 붙여넣기)</label><textarea data-k="import" placeholder="여기에 붙여넣고 ‘가져오기’"></textarea></div>',
      '    <div class="ps-actions"><button class="ps-btn ghost" type="button" data-act="import">가져오기</button></div>',
      '  </div>',
      '</details>'
    ].join('');

    var KEY = '88st_betlog_v1';
    function read(){
      try{ var s = localStorage.getItem(KEY); return s? JSON.parse(s): []; }catch(e){ return []; }
    }
    function write(arr){
      try{ localStorage.setItem(KEY, JSON.stringify(arr||[])); }catch(e){}
    }
    function today(){
      var d = new Date();
      var y=d.getFullYear(), m=('0'+(d.getMonth()+1)).slice(-2), dd=('0'+d.getDate()).slice(-2);
      return y+'-'+m+'-'+dd;
    }
    function parseDate(s){
      var t = Date.parse(s+'T00:00:00');
      return isFinite(t) ? t : Date.now();
    }
    function profit(e){
      var st = +e.stake||0;
      var od = +e.odds||0;
      if(e.res==='W') return st*(od-1);
      if(e.res==='L') return -st;
      return 0;
    }
    function weekRange(){
      var d = new Date(); d.setHours(0,0,0,0);
      var day = d.getDay(); // 0 Sun
      var diff = (day===0? -6 : 1-day); // Monday start
      var start = new Date(d); start.setDate(d.getDate()+diff);
      var end = new Date(start); end.setDate(start.getDate()+7);
      return [start.getTime(), end.getTime()];
    }
    function monthRange(){
      var d = new Date(); d.setHours(0,0,0,0);
      var start = new Date(d.getFullYear(), d.getMonth(), 1);
      var end = new Date(d.getFullYear(), d.getMonth()+1, 1);
      return [start.getTime(), end.getTime()];
    }

    var inputs = {
      date: container.querySelector('[data-k="date"]'),
      sport: container.querySelector('[data-k="sport"]'),
      market: container.querySelector('[data-k="market"]'),
      odds: container.querySelector('[data-k="odds"]'),
      stake: container.querySelector('[data-k="stake"]'),
      res: container.querySelector('[data-k="res"]'),
      note: container.querySelector('[data-k="note"]'),
      tag: container.querySelector('[data-k="tag"]'),
      catPick: container.querySelector('[data-k="catPick"]'),
      catAutoLabel: container.querySelector('[data-out="catAutoLabel"]'),
      imp: container.querySelector('[data-k="import"]')
    };
    if(inputs.date) inputs.date.value = today();

    // --- Category chips (Sports/Casino/Slot/Minigame) ---
    var CAT_KEY_LAST = '__88st_logbook_lastcat_v1';
    var catState = { selected: null, auto: 'sports' };
    function isCat(c){ return c==='sports'||c==='casino'||c==='slot'||c==='minigame'; }
    function catLabel(c){
      if(c==='casino') return '카지노';
      if(c==='slot') return '슬롯';
      if(c==='minigame') return '미니게임';
      return '스포츠';
    }
    function classifyText(s){
      s = (s||'').toLowerCase();
      try{
        if(/바카라|baccarat|룰렛|roulette|블랙잭|blackjack|카지노|casino/.test(s)) return 'casino';
        if(/슬롯|slot|rtp|프라그마틱|pragmatic|스핀|bonus hunt|보너스/.test(s)) return 'slot';
        if(/미니|minigame|하이로우|hilo|주사위|dice|크래시|crash|코인|coin|플립|flip/.test(s)) return 'minigame';
      }catch(e){}
      return 'sports';
    }
    function queryCat(){
      try{
        var sp = new URLSearchParams(location.search||'');
        var c = (sp.get('cat')||'').toLowerCase();
        return isCat(c) ? c : null;
      }catch(e){ return null; }
    }
    function lastCat(){
      try{
        var c = (localStorage.getItem(CAT_KEY_LAST)||'').toLowerCase();
        return isCat(c) ? c : null;
      }catch(e){ return null; }
    }
    function computeAutoCat(){
      var qc = queryCat();
      if(qc) return qc;
      var txt = '';
      txt += ' ' + ((inputs.sport && inputs.sport.value) || '');
      txt += ' ' + ((inputs.market && inputs.market.value) || '');
      txt += ' ' + ((inputs.note && inputs.note.value) || '');
      txt += ' ' + ((inputs.tag && inputs.tag.value) || '');
      txt = (txt||'').trim();
      if(txt) return classifyText(txt);
      var lc = lastCat();
      return lc || 'sports';
    }
    function syncCatUI(){
      if(!inputs.catPick) return;
      // feature gate
      try{ if(window.__88st_cfg && window.__88st_cfg('features.logbookCategoryChips', true) === false) { inputs.catPick.parentNode.style.display='none'; return; } }catch(e){}
      catState.auto = computeAutoCat();
      if(inputs.catAutoLabel) inputs.catAutoLabel.textContent = catLabel(catState.auto);

      var btns = inputs.catPick.querySelectorAll('button[data-cat]');
      for(var bi=0; bi<btns.length; bi++){
        var b = btns[bi];
        var c = (b.getAttribute('data-cat')||'').toLowerCase();
        var sel = catState.selected && c===catState.selected;
        var aut = (!catState.selected) && c===catState.auto;
        b.classList.toggle('active', !!sel);
        b.classList.toggle('auto', !!aut);
        b.setAttribute('aria-pressed', sel ? 'true' : 'false');
      }
    }

    // bind chip clicks
    try{
      if(inputs.catPick){
        var __btns = inputs.catPick.querySelectorAll('button[data-cat]');
        for(var ci=0; ci<__btns.length; ci++){
          var b = __btns[ci];
          b.addEventListener('click', function(){
            var c = (b.getAttribute('data-cat')||'').toLowerCase();
            if(!isCat(c)) return;
            // click again -> back to AUTO
            if(catState.selected===c) catState.selected = null;
            else catState.selected = c;
            try{ localStorage.setItem(CAT_KEY_LAST, (catState.selected||catState.auto||'sports')); }catch(e){}
            syncCatUI();
          });
        }
      }
      ['sport','market','note','tag'].forEach(function(k){
        var el = inputs[k];
        if(el) el.addEventListener('input', function(){ if(!catState.selected) syncCatUI(); });
      });
    }catch(e){}
    syncCatUI();

    var mode = 'week';

    function compute(arr, range){
      var items = arr.slice().sort(function(a,b){ return (a.ts||0)-(b.ts||0); });
      if(range){
        items = items.filter(function(e){ return e.ts>=range[0] && e.ts<range[1]; });
      }
      var cnt = items.length;
      var w=0,l=0,v=0;
      var st=0;
      var pnl=0;
      var sumOdds=0, oddsN=0;
      var cum=0, peak=0, mdd=0;

      var curW=0, curL=0, maxW=0, maxL=0;
      for(var i=0;i<items.length;i++){
        var e = items[i];
        st += (+e.stake||0);
        pnl += profit(e);
        if(isFinite(+e.odds) && +e.odds>1){ sumOdds += (+e.odds); oddsN++; }
        cum += profit(e);
        if(cum>peak) peak=cum;
        var dd = peak - cum;
        if(dd>mdd) mdd=dd;
        if(e.res==='W'){ w++; curW++; curL=0; if(curW>maxW) maxW=curW; }
        else if(e.res==='L'){ l++; curL++; curW=0; if(curL>maxL) maxL=curL; }
        else { v++; }
      }
      var wr = (w+l)>0 ? (w/(w+l)) : 0;
      var roi = st>0 ? (pnl/st) : 0;
      var avgod = oddsN? (sumOdds/oddsN) : 0;
      return {cnt:cnt,w:w,l:l,v:v,wr:wr,st:st,pnl:pnl,roi:roi,avgod:avgod,mdd:mdd,maxW:maxW,maxL:maxL,items:items};
    }

    function fmtWon(x){
      if(!isFinite(x)) return '—';
      var s = Math.round(x).toLocaleString();
      return (x<0? '−' : '') + s.replace('-', '');
    }
    function fmtPct(x){
      if(!isFinite(x)) return '—';
      return (x*100).toFixed(1)+'%';
    }

    function setK(id, v){ var el = container.querySelector('[data-kpi="'+id+'"]'); if(el) el.textContent = v; }

    function catOfEntry(e){
      try{
        var c = (e && e.cat) ? String(e.cat).toLowerCase() : '';
        if(isCat(c)) return c;
        var txt = ((e.sport||'')+' '+(e.market||'')+' '+(e.tag||'')+' '+(e.note||''));
        return classifyText(txt);
      }catch(ex){ return 'sports'; }
    }

    function renderTable(items){

      var box = container.querySelector('[data-out="table"]');
      if(!box) return;
      var rows = items.slice().sort(function(a,b){ return (b.ts||0)-(a.ts||0); }).slice(0,50);
      if(!rows.length){ box.innerHTML = '<div class="ps-note">기록이 없습니다.</div>'; return; }
      box.innerHTML = '<table><thead><tr><th>날짜</th><th>종목</th><th>마켓</th><th>배당</th><th>금액</th><th>결과</th><th>P/L</th><th></th></tr></thead><tbody>'+
        rows.map(function(e){
          var pl = profit(e);
          var res = e.res==='W'?'WIN':(e.res==='L'?'LOSE':'VOID');
          var cls = pl>0?'pos':(pl<0?'neg':'neu');
          return '<tr>'+
            '<td>'+escapeHtml(e.date||'')+'</td>'+
            '<td><span class="pill cat '+catOfEntry(e)+'">'+escapeHtml(catLabel(catOfEntry(e)))+'</span> '+escapeHtml(e.sport||'')+'</td>'+'</td>'+
            '<td>'+escapeHtml(e.market||'')+'</td>'+
            '<td>'+escapeHtml(String(e.odds||''))+'</td>'+
            '<td>'+fmtWon(+e.stake||0)+'</td>'+
            '<td><span class="pill '+(e.res||'').toLowerCase()+'">'+res+'</span></td>'+
            '<td class="'+cls+'">'+fmtWon(pl)+'</td>'+
            '<td><button class="mini-del" data-del="'+e.id+'">삭제</button></td>'+
          '</tr>';
        }).join('') +
      '</tbody></table>';

      box.querySelectorAll('button[data-del]').forEach(function(btn){
        btn.addEventListener('click', function(){
          var id = btn.getAttribute('data-del');
          var arr = read().filter(function(x){ return x.id!==id; });
          write(arr);
          refresh();
        });
      });
    }

    function setMode(m){
      mode = m;
      refresh();
    }

    function refresh(){
      var arr = read();
      // Backfill missing category for old entries (one-time migration)
      try{
        var changed = false;
        for(var i=0;i<arr.length;i++){
          var c = arr[i] && arr[i].cat ? String(arr[i].cat).toLowerCase() : '';
          if(!isCat(c)){
            arr[i].cat = classifyText(((arr[i].sport||'')+' '+(arr[i].market||'')+' '+(arr[i].tag||'')+' '+(arr[i].note||'')));
            changed = true;
          }
        }
        if(changed) write(arr);
      }catch(e){}

      var range = null;
      if(mode==='week') range = weekRange();
      if(mode==='month') range = monthRange();
      var r = compute(arr, range);
      setK('cnt', String(r.cnt));
      setK('wr', fmtPct(r.wr));
      setK('st', fmtWon(r.st));
      setK('pnl', fmtWon(r.pnl));
      setK('roi', 'ROI '+fmtPct(r.roi));
      setK('avgod', r.avgod? r.avgod.toFixed(2) : '—');
      setK('streak', 'W'+r.maxW+' / L'+r.maxL);
      setK('span', mode==='all'?'전체':'기간');
      // top KPIs
      var w = compute(arr, weekRange());
      var mo = compute(arr, monthRange());
      setK('w_roi', fmtPct(w.roi)); setK('w_note', w.cnt? (w.cnt+'건 · '+fmtWon(w.pnl)+'원'):'—');
      setK('m_roi', fmtPct(mo.roi)); setK('m_note', mo.cnt? (mo.cnt+'건 · '+fmtWon(mo.pnl)+'원'):'—');
      setK('mdd', fmtWon((mode==='all'? compute(arr,null).mdd : r.mdd)));
      renderTable(arr);
    }

    function addEntry(resOverride){
      var date = (inputs.date && inputs.date.value) ? inputs.date.value : today();
      var odds = parseFloat((inputs.odds && inputs.odds.value)||'');
      var stake = parseFloat((inputs.stake && inputs.stake.value)||'');
      if(!isFinite(stake) || stake<=0){ toast('금액을 입력하세요'); return; }
      if(!isFinite(odds) || odds<=1){ toast('배당(Decimal)을 입력하세요'); return; }
      var e = {
        id: String(Date.now()) + Math.random().toString(16).slice(2),
        ts: parseDate(date),
        date: date,
        sport: (inputs.sport && inputs.sport.value||'').trim(),
        market: (inputs.market && inputs.market.value||'').trim(),
        odds: odds,
        stake: stake,
        res: resOverride || (inputs.res && inputs.res.value) || 'W',
        note: (inputs.note && inputs.note.value||'').trim(),
        tag: (inputs.tag && inputs.tag.value||'').trim(),
        cat: (catState && catState.selected) ? catState.selected : computeAutoCat()
      };
      try{ localStorage.setItem(CAT_KEY_LAST, (e.cat||'sports')); }catch(e2){}
      var arr = read();
      arr.push(e);
      write(arr);
      toast('저장됨');
      refresh();
    }

    function toast(msg){
      try{
        var t = document.querySelector('#copyToast');
        if(t){ t.textContent=msg; t.classList.add('show'); setTimeout(function(){t.classList.remove('show');}, 1500); }
      }catch(e){}
    }

    container.querySelector('[data-act="add"]').addEventListener('click', function(){ addEntry(); });
    container.querySelector('[data-act="quickW"]').addEventListener('click', function(){ addEntry('W'); });
    container.querySelector('[data-act="quickL"]').addEventListener('click', function(){ addEntry('L'); });
    container.querySelector('[data-act="reset"]').addEventListener('click', function(){
      if(inputs.odds) inputs.odds.value='';
      if(inputs.stake) inputs.stake.value='';
      if(inputs.note) inputs.note.value='';
      if(inputs.tag) inputs.tag.value='';
    });

    container.querySelector('[data-act="week"]').addEventListener('click', function(){ setMode('week'); });
    container.querySelector('[data-act="month"]').addEventListener('click', function(){ setMode('month'); });
    container.querySelector('[data-act="all"]').addEventListener('click', function(){ setMode('all'); });

    container.querySelector('[data-act="export"]').addEventListener('click', function(){
      var payload = JSON.stringify(read());
      try{ navigator.clipboard.writeText(payload); toast('백업 JSON이 복사되었습니다'); }catch(e){ toast('복사 실패'); }
    });

    container.querySelector('[data-act="download"]').addEventListener('click', function(){
      var payload = JSON.stringify(read(), null, 2);
      try{
        var blob = new Blob([payload], {type:'application/json'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = '88st_logbook_backup.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
        toast('파일 저장');
      }catch(e){ toast('저장 실패'); }
    });

    container.querySelector('[data-act="import"]').addEventListener('click', function(){
      var raw = (inputs.imp && inputs.imp.value || '').trim();
      if(!raw){ toast('JSON을 붙여넣으세요'); return; }
      try{
        var arr = JSON.parse(raw);
        if(!Array.isArray(arr)) throw new Error('not array');
        // normalize
        arr = arr.map(function(e){
          return {
            id: e.id || (String(Date.now())+Math.random().toString(16).slice(2)),
            ts: isFinite(+e.ts)? +e.ts : parseDate(e.date||today()),
            date: e.date || today(),
            sport: (e.sport||''),
            market: (e.market||''),
            odds: +e.odds || 0,
            stake: +e.stake || 0,
            res: (e.res||'W'),
            note: (e.note||''),
            tag: (e.tag||''),
            cat: (function(){ try{ var c=(e.cat||'').toLowerCase(); return isCat(c)?c: classifyText(((e.sport||'')+' '+(e.market||'')+' '+(e.tag||'')+' '+(e.note||''))); }catch(ex){ return 'sports'; } })()
          };
        }).filter(function(e){ return e.stake>0 && e.odds>1; });
        write(arr);
        toast('가져오기 완료');
        if(inputs.imp) inputs.imp.value='';
        refresh();
      }catch(e){
        toast('가져오기 실패(JSON 확인)');
      }
    });

    container.querySelector('[data-act="clear"]').addEventListener('click', function(){
      if(!confirm('기록을 모두 삭제할까요? (되돌릴 수 없음)')) return;
      write([]);
      toast('삭제됨');
      refresh();
    });

    refresh();
  }

  // --- Cert popup: 3-line summary (always visible, compact) ---
  function ensureCertSummary3(){
    var popup = qs(document,'#cardPopup');
    var box = popup ? qs(popup,'.popup-box') : null;
    if(!popup || !box) return;
    if(qs(box,'.ps-summary3')) return;

    var meta = qs(box,'.popup-sub');
    if(!meta) return;

    var sum = document.createElement('div');
    sum.className = 'ps-summary3';
    sum.innerHTML = [
      '<div class="row"><span class="k">코드</span><span class="v" data-sum="code">—</span></div>',
      '<div class="row"><span class="k">혜택</span><span class="v" data-sum="benefit">—</span></div>',
      '<div class="row"><span class="k">주의</span><span class="v" data-sum="notice">—</span></div>'
    ].join('');
    meta.parentNode.insertBefore(sum, meta.nextSibling);

    function pickText(id){
      var el = qs(box, id);
      var t = el ? (el.textContent||'').trim() : '';
      // remove prefix like '혜택 :' '주의 :'
      t = t.replace(/^혜택\s*:\s*/,'').replace(/^주의\s*:\s*/,'');
      t = t.replace(/\s+/g,' ').trim();
      if(t.length>64) t = t.slice(0,64)+'…';
      return t || '—';
    }

    function update(){
      var code = pickText('#pCode');
      var ben = pickText('#pBenefit');
      var no = pickText('#pNotice');
      var c = qs(sum,'[data-sum="code"]'); if(c) c.textContent = code;
      var b = qs(sum,'[data-sum="benefit"]'); if(b) b.textContent = ben;
      var n = qs(sum,'[data-sum="notice"]'); if(n) n.textContent = no;
    }

    update();
    try{
      if(window.MutationObserver){
        var mo = new MutationObserver(function(){ update(); });
        mo.observe(box, {subtree:true, childList:true, characterData:true});
      }
    }catch(e){}
  }

  
  // --- v3 additions: Hedge/Cashout, Casino Lab, Minigame curves, Slot suite, Cert cross-promo ---
  function pct(x){ return isFinite(x) ? (x*100).toFixed(1)+'%' : '—'; }
  function won(x){ if(!isFinite(x)) return '—'; var s=Math.round(Math.abs(x)).toLocaleString(); return (x<0?'−':'')+s; }

  function enhanceSportsPlus(container){
    try{
      if(qs(container,'.ps-acc[data-plus="hedge"]')) return;
      var wrap = document.createElement('div');
      wrap.innerHTML = [
        '<details class="ps-acc" data-plus="hedge">',
        '  <summary><span>🧩 Hedge / Cashout 가치 비교</span><span class="ps-badge">정리 vs 유지</span></summary>',
        '  <div class="ps-acc-body">',
        '    <div class="ps-note">“추천/예측”이 아니라, <b>정리(캐시아웃)</b> 또는 <b>헤지</b> 선택을 수학적으로 비교합니다.</div>',
        '    <div class="ps-row cols3" style="margin-top:10px;">',
        '      <div class="ps-field"><label>초기 배팅 금액</label><input data-k="hs" inputmode="numeric" placeholder="예: 50000"></div>',
        '      <div class="ps-field"><label>초기 배당(Decimal)</label><input data-k="ho" inputmode="decimal" placeholder="예: 2.05"></div>',
        '      <div class="ps-field"><label>추정 승률(%)</label><input data-k="hp" inputmode="decimal" placeholder="예: 54"></div>',
        '    </div>',
        '    <div class="ps-row cols3" style="margin-top:10px;">',
        '      <div class="ps-field"><label>캐시아웃 금액(받는 금액)</label><input data-k="cash" inputmode="numeric" placeholder="예: 78000"></div>',
        '      <div class="ps-field"><label>반대편 배당(헤지)</label><input data-k="hedgeO" inputmode="decimal" placeholder="예: 1.85"></div>',
        '      <div class="ps-field"><label>헤지 방식</label><select data-k="mode"><option value="equal">양쪽 수익 동일</option><option value="minloss">손실 최소</option></select></div>',
        '    </div>',
        '    <div class="ps-actions">',
        '      <button class="ps-btn primary" type="button" data-act="hRun">비교 계산</button>',
        '      <button class="ps-btn secondary" type="button" data-act="hReset">초기화</button>',
        '    </div>',
        '    <div class="ps-kpis cols3">',
        '      <div class="ps-kpi"><div class="k">유지 EV</div><div class="v" data-out="hold">—</div><div class="s">추정승률 기준</div></div>',
        '      <div class="ps-kpi"><div class="k">캐시아웃</div><div class="v" data-out="cash">—</div><div class="s">확정</div></div>',
        '      <div class="ps-kpi"><div class="k">헤지 추천금액</div><div class="v" data-out="hedge">—</div><div class="s">반대배당 기준</div></div>',
        '    </div>',
        '    <div class="ps-out" data-out="hBox" style="display:none;"></div>',
        '  </div>',
        '</details>',

        '<details class="ps-acc" data-plus="bankroll">',
        '  <summary><span>🧷 Bankroll 플래너</span><span class="ps-badge">일/주/월 운영</span></summary>',
        '  <div class="ps-acc-body">',
        '    <div class="ps-note">목표/허용낙폭/횟수로 <b>1회 상한</b>과 <b>권장 범위</b>를 제안합니다. (리스크 관리용)</div>',
        '    <div class="ps-row cols3" style="margin-top:10px;">',
        '      <div class="ps-field"><label>총 자금(원)</label><input data-k="bk" inputmode="numeric" placeholder="예: 1000000"></div>',
        '      <div class="ps-field"><label>허용 최대낙폭(%)</label><input data-k="dd" inputmode="decimal" value="12"></div>',
        '      <div class="ps-field"><label>베팅 횟수(월)</label><input data-k="n" inputmode="numeric" value="60"></div>',
        '    </div>',
        '    <div class="ps-row cols3" style="margin-top:10px;">',
        '      <div class="ps-field"><label>보수 계수</label><select data-k="k"><option value="0.6">보수(0.6)</option><option value="0.8" selected>중립(0.8)</option><option value="1.0">공격(1.0)</option></select></div>',
        '      <div class="ps-field"><label>1회 최대 캡(%)</label><input data-k="cap" inputmode="decimal" value="2"></div>',
        '      <div class="ps-field"><label>메모</label><input data-k="memo" placeholder="예: 급무브는 패스"></div>',
        '    </div>',
        '    <div class="ps-actions">',
        '      <button class="ps-btn primary" type="button" data-act="bRun">계산</button>',
        '      <button class="ps-btn secondary" type="button" data-act="bReset">초기화</button>',
        '    </div>',
        '    <div class="ps-kpis cols3">',
        '      <div class="ps-kpi"><div class="k">권장 1회</div><div class="v" data-out="bRec">—</div><div class="s">낙폭 기반</div></div>',
        '      <div class="ps-kpi"><div class="k">1회 상한</div><div class="v" data-out="bCap">—</div><div class="s">캡 적용</div></div>',
        '      <div class="ps-kpi"><div class="k">월 손실 한도</div><div class="v" data-out="bDD">—</div><div class="s">허용 MDD</div></div>',
        '    </div>',
        '    <div class="ps-out" data-out="bBox" style="display:none;"></div>',
        '  </div>',
        '</details>'
      ].join('');
      container.appendChild(wrap);

      // bind hedge/cashout
      var hBox = qs(container,'[data-out="hBox"]');
      qs(container,'[data-act="hRun"]').addEventListener('click', function(){
        var S = parseFloat(qs(container,'[data-k="hs"]').value||'0');
        var O = parseFloat(qs(container,'[data-k="ho"]').value||'0');
        var P = parseFloat(qs(container,'[data-k="hp"]').value||'0')/100;
        var C = parseFloat(qs(container,'[data-k="cash"]').value||'0');
        var HO = parseFloat(qs(container,'[data-k="hedgeO"]').value||'0');
        var mode = qs(container,'[data-k="mode"]').value||'equal';

        if(!(S>0 && O>1)){
          hBox.style.display='block';
          hBox.innerHTML='<h4>입력 필요</h4><div class="ps-note">초기 금액과 배당을 입력하세요.</div>';
          return;
        }
        P = clamp(P||0, 0, 1);
        var holdEV = P*(S*O) + (1-P)*0; // expected return (includes stake)
        var cashV = C>0 ? C : NaN;

        // hedge: lock equal profit if hedge odds provided
        var hedgeStake = NaN, lockProfit = NaN;
        if(HO>1){
          hedgeStake = (S*O)/HO; // equalize return
          var profitWin = S*(O-1) - hedgeStake;
          var profitLose = hedgeStake*(HO-1) - S;
          lockProfit = (mode==='minloss') ? Math.max(Math.min(profitWin, profitLose), -S) : Math.min(profitWin, profitLose);
        }

        qs(container,'[data-out="hold"]').textContent = won(holdEV - S) + ' (EV)';
        qs(container,'[data-out="cash"]').textContent = isFinite(cashV) ? (won(cashV - S) + ' (확정)') : '—';
        qs(container,'[data-out="hedge"]').textContent = isFinite(hedgeStake) ? won(hedgeStake) : '—';

        var rec = [];
        if(isFinite(cashV)){
          if(cashV >= holdEV) rec.push('캐시아웃 금액이 추정 EV(유지)보다 큽니다 → <b>정리 쪽이 유리</b>합니다.');
          else rec.push('캐시아웃 금액이 추정 EV(유지)보다 작습니다 → <b>유지 쪽이 유리</b>합니다.');
        }else{
          rec.push('캐시아웃 금액이 없으면, “유지 EV”만 참고하세요.');
        }
        if(isFinite(hedgeStake)){
          rec.push('헤지(양쪽 동일) 금액: <b>'+won(hedgeStake)+'</b> (반대배당 '+fmt(HO,2)+')');
          rec.push('락인 손익(대략): <b>'+won(lockProfit)+'</b> (시장/수수료/슬리피지 제외)');
        }else{
          rec.push('반대편 배당을 입력하면 <b>헤지 금액</b>을 계산합니다.');
        }
        rec.push('주의) 추정 승률(p)은 “희망”이 아니라 근거가 있어야 의미가 있습니다.');

        hBox.style.display='block';
        hBox.innerHTML = '<h4>결론</h4><ul>'+rec.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul>';
      });
      qs(container,'[data-act="hReset"]').addEventListener('click', function(){
        ['hs','ho','hp','cash','hedgeO'].forEach(function(k){ qs(container,'[data-k="'+k+'"]').value=''; });
        qs(container,'[data-k="mode"]').value='equal';
        ['hold','cash','hedge'].forEach(function(id){ qs(container,'[data-out="'+id+'"]').textContent='—'; });
        hBox.style.display='none'; hBox.innerHTML='';
      });

      // bind bankroll planner
      var bBox = qs(container,'[data-out="bBox"]');
      qs(container,'[data-act="bRun"]').addEventListener('click', function(){
        var bk = Math.max(0, parseFloat(qs(container,'[data-k="bk"]').value||'0'));
        var dd = clamp(parseFloat(qs(container,'[data-k="dd"]').value||'12')/100, 0.01, 0.8);
        var n = Math.max(1, parseInt(qs(container,'[data-k="n"]').value||'60',10));
        var k = clamp(parseFloat(qs(container,'[data-k="k"]').value||'0.8'), 0.3, 1.2);
        var capPct = clamp(parseFloat(qs(container,'[data-k="cap"]').value||'2')/100, 0.002, 0.2);

        if(!(bk>0)){
          bBox.style.display='block';
          bBox.innerHTML='<h4>입력 필요</h4><div class="ps-note">총 자금을 입력하세요.</div>';
          return;
        }

        var ddAmt = bk*dd;
        // simple risk budget per bet: distribute dd budget across sqrt(n) (stability-first)
        var rec = (ddAmt/Math.sqrt(n)) * k;
        var capAmt = bk*capPct;
        var finalRec = Math.min(rec, capAmt);

        qs(container,'[data-out="bRec"]').textContent = won(finalRec);
        qs(container,'[data-out="bCap"]').textContent = won(capAmt);
        qs(container,'[data-out="bDD"]').textContent = won(ddAmt);

        var note = [];
        note.push('허용 낙폭 예산: <b>'+won(ddAmt)+'</b> (총자금×'+fmt(dd*100,1)+'%)');
        note.push('월 '+n+'회 기준 권장 1회: <b>'+won(finalRec)+'</b> (보수계수 '+fmt(k,2)+', √N 분배)');
        note.push('TIP) 연패/급무브/마이너리그 구간은 <b>권장보다 더 줄이기</b>가 장기적으로 유리합니다.');
        bBox.style.display='block';
        bBox.innerHTML = '<h4>설명</h4><ul>'+note.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul>';
      });
      qs(container,'[data-act="bReset"]').addEventListener('click', function(){
        ['bk','memo'].forEach(function(k){ qs(container,'[data-k="'+k+'"]').value=''; });
        qs(container,'[data-k="dd"]').value='12';
        qs(container,'[data-k="n"]').value='60';
        qs(container,'[data-k="k"]').value='0.8';
        qs(container,'[data-k="cap"]').value='2';
        ['bRec','bCap','bDD'].forEach(function(id){ qs(container,'[data-out="'+id+'"]').textContent='—'; });
        bBox.style.display='none'; bBox.innerHTML='';
      });
    }catch(e){}
  }

  function enhanceCasinoPlus(container){
    try{
      if(qs(container,'.ps-acc[data-plus="casinoLab"]')) return;
      var wrap = document.createElement('div');
      wrap.innerHTML = [
        '<details class="ps-acc" data-plus="casinoLab">',
        '  <summary><span>🎛️ 하우스엣지/RTP 라이브러리</span><span class="ps-badge">세션 기대손실</span></summary>',
        '  <div class="ps-acc-body">',
        '    <div class="ps-note">게임별 평균 하우스엣지(이론값)를 기준으로 <b>기대 손실</b>을 계산합니다. (실제는 변동성 큼)</div>',
        '    <div class="ps-row cols3" style="margin-top:10px;">',
        '      <div class="ps-field"><label>게임</label><select data-k="g"><option value="bac_b">바카라(뱅커 5%수수료)</option><option value="bac_p">바카라(플레이어)</option><option value="rou_eu">룰렛(유럽)</option><option value="bj_basic">블랙잭(기본전략)</option></select></div>',
        '      <div class="ps-field"><label>1회 베팅(원)</label><input data-k="stake" inputmode="numeric" placeholder="예: 10000"></div>',
        '      <div class="ps-field"><label>횟수(N)</label><input data-k="n" inputmode="numeric" value="200"></div>',
        '    </div>',
        '    <div class="ps-actions">',
        '      <button class="ps-btn primary" type="button" data-act="rtpRun">계산</button>',
        '      <button class="ps-btn secondary" type="button" data-act="rtpReset">초기화</button>',
        '    </div>',
        '    <div class="ps-kpis cols3">',
        '      <div class="ps-kpi"><div class="k">하우스엣지</div><div class="v" data-out="he">—</div><div class="s">이론값</div></div>',
        '      <div class="ps-kpi"><div class="k">기대 손실</div><div class="v" data-out="el">—</div><div class="s">stake×N×edge</div></div>',
        '      <div class="ps-kpi"><div class="k">총 베팅</div><div class="v" data-out="tb">—</div><div class="s">원</div></div>',
        '    </div>',
        '    <div class="ps-out" data-out="rtpBox" style="display:none;"></div>',
        '  </div>',
        '</details>',

        '<details class="ps-acc" data-plus="bj">',
        '  <summary><span>🃏 블랙잭 기본전략(간이)</span><span class="ps-badge">Hit/Stand/Double/Split</span></summary>',
        '  <div class="ps-acc-body">',
        '    <div class="ps-note">표준 기본전략(다덱·S17 가정) 기반 <b>간이</b> 추천입니다. (실제 룰/덱에 따라 달라짐)</div>',
        '    <div class="ps-row cols3" style="margin-top:10px;">',
        '      <div class="ps-field"><label>내 핸드</label><select data-k="pt"><option value="H">Hard</option><option value="S">Soft(A 포함)</option><option value="P">Pair(페어)</option></select></div>',
        '      <div class="ps-field"><label>내 합/페어</label><input data-k="pv" inputmode="numeric" placeholder="Hard: 16 / Soft: 18 / Pair: 8"></div>',
        '      <div class="ps-field"><label>딜러 업카드</label><input data-k="dv" inputmode="numeric" placeholder="2~11(A=11)"></div>',
        '    </div>',
        '    <div class="ps-actions">',
        '      <button class="ps-btn primary" type="button" data-act="bjRun">추천</button>',
        '      <button class="ps-btn secondary" type="button" data-act="bjReset">초기화</button>',
        '    </div>',
        '    <div class="ps-kpis cols3">',
        '      <div class="ps-kpi"><div class="k">추천 액션</div><div class="v" data-out="bjAct">—</div><div class="s">기본전략</div></div>',
        '      <div class="ps-kpi"><div class="k">해석</div><div class="v" data-out="bjWhy" style="font-size:14px;">—</div><div class="s">요약</div></div>',
        '      <div class="ps-kpi"><div class="k">주의</div><div class="v" style="font-size:14px;">룰 확인</div><div class="s">S17/덱/더블</div></div>',
        '    </div>',
        '  </div>',
        '</details>',

        '<details class="ps-acc" data-plus="rou">',
        '  <summary><span>🎡 룰렛 시스템 비교(시뮬)</span><span class="ps-badge">파산확률</span></summary>',
        '  <div class="ps-acc-body">',
        '    <div class="ps-note">마틴/달랑베르/피보/플랫을 <b>유럽룰렛(2.7% HE)</b> 가정으로 시뮬합니다. “수익 보장”이 아니라 <b>리스크 체감</b> 용도입니다.</div>',
        '    <div class="ps-row cols3" style="margin-top:10px;">',
        '      <div class="ps-field"><label>전략</label><select data-k="sys"><option value="flat">플랫</option><option value="mart">마틴게일</option><option value="dal">달랑베르</option><option value="fib">피보나치</option></select></div>',
        '      <div class="ps-field"><label>자금(원)</label><input data-k="rb" inputmode="numeric" placeholder="예: 500000"></div>',
        '      <div class="ps-field"><label>기본 베팅(원)</label><input data-k="bb" inputmode="numeric" placeholder="예: 5000"></div>',
        '    </div>',
        '    <div class="ps-row cols3" style="margin-top:10px;">',
        '      <div class="ps-field"><label>스핀 수(N)</label><input data-k="n" inputmode="numeric" value="200"></div>',
        '      <div class="ps-field"><label>시뮬 횟수</label><select data-k="sims"><option value="1200">1,200</option><option value="2000" selected>2,000</option><option value="4000">4,000</option></select></div>',
        '      <div class="ps-field"><label>목표 수익(원)</label><input data-k="tp" inputmode="numeric" placeholder="예: 100000"></div>',
        '    </div>',
        '    <div class="ps-actions">',
        '      <button class="ps-btn primary" type="button" data-act="rouRun">시뮬</button>',
        '      <button class="ps-btn secondary" type="button" data-act="rouReset">초기화</button>',
        '    </div>',
        '    <div class="ps-kpis cols3">',
        '      <div class="ps-kpi"><div class="k">파산 확률</div><div class="v" data-out="rouRuin">—</div><div class="s">bank≤0</div></div>',
        '      <div class="ps-kpi"><div class="k">목표 도달</div><div class="v" data-out="rouHit">—</div><div class="s">≥TP</div></div>',
        '      <div class="ps-kpi"><div class="k">최종(P50)</div><div class="v" data-out="rouFinal">—</div><div class="s">중앙값</div></div>',
        '    </div>',
        '    <div class="ps-out" data-out="rouBox" style="display:none;"></div>',
        '  </div>',
        '</details>'
      ].join('');
      container.appendChild(wrap);

      // house edge presets
      function heFor(game){
        // approximate typical house edge
        if(game==='bac_b') return 0.0106; // 1.06%
        if(game==='bac_p') return 0.0124; // 1.24%
        if(game==='rou_eu') return 0.0270; // 2.7%
        if(game==='bj_basic') return 0.0050; // 0.5% (rough)
        return 0.02;
      }

      // RTP calc
      var rtpBox = qs(container,'[data-out=\"rtpBox\"]');
      qs(container,'[data-act=\"rtpRun\"]').addEventListener('click', function(){
        var g = qs(container,'[data-k=\"g\"]').value;
        var stake = Math.max(0, parseFloat(qs(container,'[data-k=\"stake\"]').value||'0'));
        var n = Math.max(1, parseInt(qs(container,'[data-k=\"n\"]').value||'200',10));
        if(!(stake>0)){
          rtpBox.style.display='block';
          rtpBox.innerHTML='<h4>입력 필요</h4><div class=\"ps-note\">1회 베팅 금액을 입력하세요.</div>';
          return;
        }
        var he = heFor(g);
        var total = stake*n;
        var expLoss = total*he;
        qs(container,'[data-out=\"he\"]').textContent = (he*100).toFixed(2)+'%';
        qs(container,'[data-out=\"tb\"]').textContent = won(total);
        qs(container,'[data-out=\"el\"]').textContent = won(-expLoss);
        rtpBox.style.display='block';
        rtpBox.innerHTML = '<h4>해석</h4><ul>'+
          '<li>이론 기대손실(장기 평균): <b>'+won(-expLoss)+'</b></li>'+
          '<li>단기 결과는 분산이 매우 큽니다. 손절/시간 제한을 같이 쓰세요.</li>'+
          '</ul>';
      });
      qs(container,'[data-act=\"rtpReset\"]').addEventListener('click', function(){
        qs(container,'[data-k=\"stake\"]').value='';
        qs(container,'[data-k=\"n\"]').value='200';
        qs(container,'[data-k=\"g\"]').value='bac_b';
        ['he','el','tb'].forEach(function(id){ qs(container,'[data-out=\"'+id+'\"]').textContent='—'; });
        rtpBox.style.display='none'; rtpBox.innerHTML='';
      });

      // Blackjack basic strategy (simplified, multi-deck S17)
      function bjAction(pt, pv, dv){
        pv = Math.floor(pv||0);
        dv = Math.floor(dv||0);
        if(dv===1) dv=11;
        if(dv<2 || dv>11) return {a:'—', why:'업카드 2~11(A)'};

        // Pair strategy (very simplified)
        if(pt==='P'){
          var pair = pv;
          if(pair===11) return {a:'SPLIT', why:'A,A는 항상 분리'};
          if(pair===8) return {a:'SPLIT', why:'8,8은 기본적으로 분리'};
          if(pair===10) return {a:'STAND', why:'10,10은 보통 유지'};
          if(pair===9) return {a:(dv>=2 && dv<=6 || dv==8||dv==9)?'SPLIT':'STAND', why:'9,9은 2-6/8/9 분리'};
          if(pair===7) return {a:(dv<=7)?'SPLIT':'HIT', why:'7,7은 2-7 분리'};
          if(pair===6) return {a:(dv>=2 && dv<=6)?'SPLIT':'HIT', why:'6,6은 2-6 분리'};
          if(pair===5) return {a:(dv>=2 && dv<=9)?'DOUBLE':'HIT', why:'5,5는 더블(2-9)'};
          if(pair===4) return {a:(dv==5||dv==6)?'SPLIT':'HIT', why:'4,4는 5-6 분리'};
          if(pair===3||pair===2) return {a:(dv>=2 && dv<=7)?'SPLIT':'HIT', why:'2,2/3,3는 2-7 분리'};
          return {a:'HIT', why:'기본 HIT'};
        }

        // Soft totals
        if(pt==='S'){
          var s = pv;
          if(s>=20) return {a:'STAND', why:'A,9(20)+는 스탠드'};
          if(s===19) return {a:(dv==6)?'DOUBLE':'STAND', why:'A,8은 6에서 더블(선택)'};
          if(s===18){
            if(dv>=3 && dv<=6) return {a:'DOUBLE', why:'A,7은 3-6 더블'};
            if(dv==2||dv==7||dv==8) return {a:'STAND', why:'A,7은 2/7/8 스탠드'};
            return {a:'HIT', why:'A,7은 9-A 히트'};
          }
          if(s===17) return {a:(dv>=3 && dv<=6)?'DOUBLE':'HIT', why:'A,6은 3-6 더블'};
          if(s===16||s===15) return {a:(dv>=4 && dv<=6)?'DOUBLE':'HIT', why:'A,4/5는 4-6 더블'};
          if(s===14||s===13) return {a:(dv==5||dv==6)?'DOUBLE':'HIT', why:'A,2/3는 5-6 더블'};
          return {a:'HIT', why:'Soft는 기본 히트'};
        }

        // Hard totals
        var h = pv;
        if(h>=17) return {a:'STAND', why:'17+ 스탠드'};
        if(h>=13 && h<=16) return {a:(dv>=2 && dv<=6)?'STAND':'HIT', why:'13-16은 2-6 스탠드'};
        if(h===12) return {a:(dv>=4 && dv<=6)?'STAND':'HIT', why:'12는 4-6 스탠드'};
        if(h===11) return {a:'DOUBLE', why:'11은 더블'};
        if(h===10) return {a:(dv>=2 && dv<=9)?'DOUBLE':'HIT', why:'10은 2-9 더블'};
        if(h===9) return {a:(dv>=3 && dv<=6)?'DOUBLE':'HIT', why:'9는 3-6 더블'};
        return {a:'HIT', why:'8 이하는 히트'};
      }

      qs(container,'[data-act=\"bjRun\"]').addEventListener('click', function(){
        var pt = qs(container,'[data-k=\"pt\"]').value||'H';
        var pv = parseInt(qs(container,'[data-k=\"pv\"]').value||'0',10);
        var dv = parseInt(qs(container,'[data-k=\"dv\"]').value||'0',10);
        var r = bjAction(pt,pv,dv);
        qs(container,'[data-out=\"bjAct\"]').textContent = r.a;
        qs(container,'[data-out=\"bjWhy\"]').textContent = r.why;
      });
      qs(container,'[data-act=\"bjReset\"]').addEventListener('click', function(){
        qs(container,'[data-k=\"pt\"]').value='H';
        qs(container,'[data-k=\"pv\"]').value='';
        qs(container,'[data-k=\"dv\"]').value='';
        qs(container,'[data-out=\"bjAct\"]').textContent='—';
        qs(container,'[data-out=\"bjWhy\"]').textContent='—';
      });

      // Roulette systems simulation
      var rouBox = qs(container,'[data-out=\"rouBox\"]');
      function sysNext(sys, step){
        if(sys==='flat') return 1;
        if(sys==='mart') return Math.pow(2, step);
        if(sys==='dal') return 1 + step;
        if(sys==='fib'){
          // fib sequence (1,1,2,3,5,8...)
          var a=1,b=1;
          for(var i=2;i<=step;i++){ var c=a+b; a=b; b=c; }
          return step<=1?1:b;
        }
        return 1;
      }

      qs(container,'[data-act=\"rouRun\"]').addEventListener('click', function(){
        var sys = qs(container,'[data-k=\"sys\"]').value||'flat';
        var rb = Math.max(0, parseFloat(qs(container,'[data-k=\"rb\"]').value||'0'));
        var bb = Math.max(0, parseFloat(qs(container,'[data-k=\"bb\"]').value||'0'));
        var n = Math.max(1, parseInt(qs(container,'[data-k=\"n\"]').value||'200',10));
        var sims = Math.max(300, Math.min(6000, parseInt(qs(container,'[data-k=\"sims\"]').value||'2000',10)));
        var tp = Math.max(0, parseFloat(qs(container,'[data-k=\"tp\"]').value||'0'));
        if(!(rb>0 && bb>0)){
          rouBox.style.display='block';
          rouBox.innerHTML='<h4>입력 필요</h4><div class=\"ps-note\">자금과 기본 베팅을 입력하세요.</div>';
          return;
        }
        // European roulette even-money win prob ~ 18/37
        var p = 18/37;
        var ruin=0, hit=0;
        var finals=[];
        for(var s=0;s<sims;s++){
          var b=rb;
          var step=0;
          var peak=rb;
          var reached=false;
          for(var i=0;i<n;i++){
            if(b<=0) break;
            var unit = sysNext(sys, step);
            var stake = Math.min(b, bb*unit);
            var r = Math.random();
            if(r < p){
              b += stake; // even money profit
              step = Math.max(0, step-1);
            }else{
              b -= stake;
              step = step+1;
            }
            if(tp>0 && (b-rb)>=tp){ reached=true; break; }
            if(b>peak) peak=b;
          }
          if(b<=0) ruin++;
          if(reached) hit++;
          finals.push(b);
        }
        finals.sort(function(a,b){return a-b;});
        var p50 = finals[Math.floor(finals.length*0.5)];
        qs(container,'[data-out=\"rouRuin\"]').textContent = (ruin/sims*100).toFixed(1)+'%';
        qs(container,'[data-out=\"rouHit\"]').textContent = tp>0 ? (hit/sims*100).toFixed(1)+'%' : '—';
        qs(container,'[data-out=\"rouFinal\"]').textContent = won(p50);

        rouBox.style.display='block';
        rouBox.innerHTML = '<h4>요약</h4><ul>'+
          '<li>전략: <b>'+sys+'</b> · N='+n+' · sims='+sims+'</li>'+
          '<li>파산확률: <b>'+((ruin/sims)*100).toFixed(1)+'%</b></li>'+
          (tp>0?('<li>목표('+won(tp)+') 도달: <b>'+((hit/sims)*100).toFixed(1)+'%</b></li>'):'')+
          '<li>결론: 시스템은 EV를 바꾸지 못하고, <b>분산/파산 리스크만 바꿉니다</b>.</li>'+
        '</ul>';
      });

      qs(container,'[data-act=\"rouReset\"]').addEventListener('click', function(){
        ['rb','bb','tp'].forEach(function(k){ qs(container,'[data-k=\"'+k+'\"]').value=''; });
        qs(container,'[data-k=\"n\"]').value='200';
        qs(container,'[data-k=\"sims\"]').value='2000';
        qs(container,'[data-k=\"sys\"]').value='flat';
        ['rouRuin','rouHit','rouFinal'].forEach(function(id){ qs(container,'[data-out=\"'+id+'\"]').textContent='—'; });
        rouBox.style.display='none'; rouBox.innerHTML='';
      });

    }catch(e){}
  }

  function enhanceMinigamePlus(container){
    try{
      if(qs(container,'.ps-acc[data-plus=\"curve\"]')) return;
      var wrap = document.createElement('div');
      wrap.innerHTML = [
        '<details class=\"ps-acc\" data-plus=\"curve\">',
        '  <summary><span>📈 목표 배당↔확률(곡선)</span><span class=\"ps-badge\">Crash/Dice</span></summary>',
        '  <div class=\"ps-acc-body\">',
        '    <div class=\"ps-note\">목표 배당(x)과 성공확률은 역비례합니다. 하우스엣지를 반영해 <b>체감 리스크</b>를 확인하세요.</div>',
        '    <div class=\"ps-row cols3\" style=\"margin-top:10px;\">',
        '      <div class=\"ps-field\"><label>모드</label><select data-k=\"m\"><option value=\"crash\">Crash (x)</option><option value=\"dice\">Dice (승률%)</option></select></div>',
        '      <div class=\"ps-field\"><label>목표</label><input data-k=\"x\" inputmode=\"decimal\" placeholder=\"Crash: 2.00 / Dice: 55\"></div>',
        '      <div class=\"ps-field\"><label>하우스엣지(%)</label><input data-k=\"he\" inputmode=\"decimal\" value=\"1\"></div>',
        '    </div>',
        '    <div class=\"ps-actions\">',
        '      <button class=\"ps-btn primary\" type=\"button\" data-act=\"cRun\">계산</button>',
        '      <button class=\"ps-btn secondary\" type=\"button\" data-act=\"cReset\">초기화</button>',
        '    </div>',
        '    <div class=\"ps-kpis cols3\">',
        '      <div class=\"ps-kpi\"><div class=\"k\">성공 확률</div><div class=\"v\" data-out=\"p\">—</div><div class=\"s\">이론</div></div>',
        '      <div class=\"ps-kpi\"><div class=\"k\">공정 배당</div><div class=\"v\" data-out=\"fo\">—</div><div class=\"s\">edge 제거</div></div>',
        '      <div class=\"ps-kpi\"><div class=\"k\">판정</div><div class=\"v\" data-out=\"lab\" style=\"font-size:16px;\">—</div><div class=\"s\">체감</div></div>',
        '    </div>',
        '    <div class=\"ps-out\" data-out=\"cBox\" style=\"display:none;\"></div>',
        '  </div>',
        '</details>',

        '<details class=\"ps-acc\" data-plus=\"pf\">',
        '  <summary><span>🔍 Provably‑Fair(공정성) 검증</span><span class=\"ps-badge\">SHA‑256</span></summary>',
        '  <div class=\"ps-acc-body\">',
        '    <div class=\"ps-note\">서버 시드(server seed)가 공개된 후, 제공된 해시와 일치하는지 검증합니다. (형식은 운영사마다 다를 수 있음)</div>',
        '    <div class=\"ps-row cols2\" style=\"margin-top:10px;\">',
        '      <div class=\"ps-field\"><label>server seed (공개값)</label><input data-k=\"seed\" placeholder=\"예: abc123...\"></div>',
        '      <div class=\"ps-field\"><label>server hash (사전 제공)</label><input data-k=\"hash\" placeholder=\"예: 9f2e... (SHA-256)\"></div>',
        '    </div>',
        '    <div class=\"ps-row cols3\" style=\"margin-top:10px;\">',
        '      <div class=\"ps-field\"><label>client seed (옵션)</label><input data-k=\"cseed\" placeholder=\"예: user123\"></div>',
        '      <div class=\"ps-field\"><label>nonce (옵션)</label><input data-k=\"nonce\" inputmode=\"numeric\" placeholder=\"예: 0\"></div>',
        '      <div class=\"ps-field\"><label>모드</label><select data-k=\"pm\"><option value=\"sha\">SHA-256(seed) 비교</option><option value=\"hmac\">HMAC-SHA256(seed, client:nonce)</option></select></div>',
        '    </div>',
        '    <div class=\"ps-actions\">',
        '      <button class=\"ps-btn primary\" type=\"button\" data-act=\"pfRun\">검증</button>',
        '      <button class=\"ps-btn secondary\" type=\"button\" data-act=\"pfReset\">초기화</button>',
        '    </div>',
        '    <div class=\"ps-kpis cols3\">',
        '      <div class=\"ps-kpi\"><div class=\"k\">결과</div><div class=\"v\" data-out=\"pfOk\">—</div><div class=\"s\">일치 여부</div></div>',
        '      <div class=\"ps-kpi\"><div class=\"k\">계산 해시</div><div class=\"v\" data-out=\"pfCalc\" style=\"font-size:14px;\">—</div><div class=\"s\">앞 10자</div></div>',
        '      <div class=\"ps-kpi\"><div class=\"k\">해석</div><div class=\"v\" data-out=\"pfWhy\" style=\"font-size:14px;\">—</div><div class=\"s\">주의</div></div>',
        '    </div>',
        '    <div class=\"ps-out\" data-out=\"pfBox\" style=\"display:none;\"></div>',
        '  </div>',
        '</details>'
      ].join('');
      container.appendChild(wrap);

      var cBox = qs(container,'[data-out=\"cBox\"]');
      qs(container,'[data-act=\"cRun\"]').addEventListener('click', function(){
        var m = qs(container,'[data-k=\"m\"]').value||'crash';
        var x = parseFloat(qs(container,'[data-k=\"x\"]').value||'0');
        var he = clamp(parseFloat(qs(container,'[data-k=\"he\"]').value||'1')/100, 0, 0.2);
        var p = NaN, fo = NaN;
        if(m==='crash'){
          if(!(x>1)) { cBox.style.display='block'; cBox.innerHTML='<h4>입력 필요</h4><div class=\"ps-note\">Crash 목표는 1.01 이상</div>'; return; }
          p = (1-he)/x;
          fo = 1/p;
        }else{
          if(!(x>0 && x<100)) { cBox.style.display='block'; cBox.innerHTML='<h4>입력 필요</h4><div class=\"ps-note\">Dice 승률(%) 1~99</div>'; return; }
          p = (x/100) * (1-he);
          fo = 1/p;
        }
        qs(container,'[data-out=\"p\"]').textContent = pct(p);
        qs(container,'[data-out=\"fo\"]').textContent = fmt(fo,3)+'x';
        qs(container,'[data-out=\"lab\"]').textContent = p>=0.6?'쉬움':(p>=0.3?'중간':'어려움');
        cBox.style.display='block';
        cBox.innerHTML = '<h4>요약</h4><ul>'+
          '<li>성공확률: <b>'+pct(p)+'</b> (하우스엣지 '+fmt(he*100,1)+'% 반영)</li>'+
          '<li>공정배당(이론): <b>'+fmt(fo,3)+'x</b></li>'+
          '<li>TIP) 목표 배당이 커질수록 “연속 미적중”이 매우 흔해집니다. 세션 제한을 같이 설정하세요.</li>'+
        '</ul>';
      });
      qs(container,'[data-act=\"cReset\"]').addEventListener('click', function(){
        qs(container,'[data-k=\"m\"]').value='crash';
        qs(container,'[data-k=\"x\"]').value='';
        qs(container,'[data-k=\"he\"]').value='1';
        ['p','fo','lab'].forEach(function(id){ qs(container,'[data-out=\"'+id+'\"]').textContent='—'; });
        cBox.style.display='none'; cBox.innerHTML='';
      });

      // Provably fair verifier using SubtleCrypto
      var pfBox = qs(container,'[data-out=\"pfBox\"]');
      function hex(buf){
        var u = new Uint8Array(buf);
        var s='';
        for(var i=0;i<u.length;i++){ s += ('0'+u[i].toString(16)).slice(-2); }
        return s;
      }
      async function sha256(str){
        var enc = new TextEncoder();
        var buf = enc.encode(str);
        var dig = await crypto.subtle.digest('SHA-256', buf);
        return hex(dig);
      }
      async function hmac256(keyStr, msg){
        var enc = new TextEncoder();
        var key = await crypto.subtle.importKey('raw', enc.encode(keyStr), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
        var sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
        return hex(sig);
      }

      qs(container,'[data-act=\"pfRun\"]').addEventListener('click', async function(){
        var seed = (qs(container,'[data-k=\"seed\"]').value||'').trim();
        var hash = (qs(container,'[data-k=\"hash\"]').value||'').trim().toLowerCase();
        var cseed = (qs(container,'[data-k=\"cseed\"]').value||'').trim();
        var nonce = (qs(container,'[data-k=\"nonce\"]').value||'0').trim();
        var pm = qs(container,'[data-k=\"pm\"]').value||'sha';

        if(!seed || !hash){
          pfBox.style.display='block';
          pfBox.innerHTML='<h4>입력 필요</h4><div class=\"ps-note\">seed와 hash를 입력하세요.</div>';
          return;
        }
        if(!(window.crypto && crypto.subtle)){
          pfBox.style.display='block';
          pfBox.innerHTML='<h4>지원 불가</h4><div class=\"ps-note\">이 브라우저는 SubtleCrypto를 지원하지 않습니다.</div>';
          return;
        }

        var calc='';
        try{
          if(pm==='hmac'){
            var msg = (cseed||'') + ':' + String(nonce||'0');
            calc = await hmac256(seed, msg);
          }else{
            calc = await sha256(seed);
          }
        }catch(e){
          pfBox.style.display='block';
          pfBox.innerHTML='<h4>오류</h4><div class=\"ps-note\">해시 계산 실패</div>';
          return;
        }

        var ok = (calc === hash);
        qs(container,'[data-out=\"pfOk\"]').textContent = ok ? 'OK' : 'FAIL';
        qs(container,'[data-out=\"pfCalc\"]').textContent = calc.slice(0,10)+'…';
        qs(container,'[data-out=\"pfWhy\"]').textContent = ok ? '해시 일치' : '해시 불일치';

        pfBox.style.display='block';
        pfBox.innerHTML = '<h4>해석</h4><ul>'+
          '<li>모드: <b>'+ (pm==='hmac'?'HMAC-SHA256':'SHA-256') +'</b></li>'+
          '<li>결과: <b>'+(ok?'일치(공개된 seed가 사전 해시와 동일)':'불일치(값/형식 확인 필요)')+'</b></li>'+
          '<li>주의) 운영사마다 “메시지 포맷(client seed/nonce)”가 다릅니다. 불일치는 곧바로 조작을 의미하지 않을 수 있습니다.</li>'+
        '</ul>';
      });

      qs(container,'[data-act=\"pfReset\"]').addEventListener('click', function(){
        ['seed','hash','cseed','nonce'].forEach(function(k){ qs(container,'[data-k=\"'+k+'\"]').value=''; });
        qs(container,'[data-k=\"pm\"]').value='sha';
        ['pfOk','pfCalc','pfWhy'].forEach(function(id){ qs(container,'[data-out=\"'+id+'\"]').textContent='—'; });
        pfBox.style.display='none'; pfBox.innerHTML='';
      });

    }catch(e){}
  }

  function renderSlotSuite(container){
    try{
      container.classList.add('ps-stack');
      container.innerHTML = [
        '<details class=\"ps-acc\" open data-plus=\"slotRec\">',
        '  <summary><span>🎯 변동성 기반 권장 뱅크롤</span><span class=\"ps-badge\">RTP · Volatility</span></summary>',
        '  <div class=\"ps-acc-body\">',
        '    <div class=\"ps-note\">RTP와 변동성은 “수익”이 아니라 <b>출렁임(분산)</b>을 설명합니다. 고변동일수록 권장 뱅크롤이 커집니다.</div>',
        '    <div class=\"ps-row cols3\" style=\"margin-top:10px;\">',
        '      <div class=\"ps-field\"><label>RTP(%)</label><input data-k=\"rtp\" inputmode=\"decimal\" placeholder=\"예: 96\"></div>',
        '      <div class=\"ps-field\"><label>변동성</label><select data-k=\"vol\"><option value=\"low\">저</option><option value=\"mid\" selected>중</option><option value=\"high\">고</option><option value=\"vhigh\">초고</option></select></div>',
        '      <div class=\"ps-field\"><label>스핀당 베팅(원)</label><input data-k=\"bet\" inputmode=\"numeric\" placeholder=\"예: 1000\"></div>',
        '    </div>',
        '    <div class=\"ps-row cols3\" style=\"margin-top:10px;\">',
        '      <div class=\"ps-field\"><label>스핀 수</label><input data-k=\"spins\" inputmode=\"numeric\" value=\"300\"></div>',
        '      <div class=\"ps-field\"><label>권장 배수</label><select data-k=\"mul\"><option value=\"auto\" selected>자동</option><option value=\"80\">80x</option><option value=\"150\">150x</option><option value=\"250\">250x</option><option value=\"400\">400x</option></select></div>',
        '      <div class=\"ps-field\"><label>메모</label><input data-k=\"memo\" placeholder=\"예: 고변동은 손절 우선\"></div>',
        '    </div>',
        '    <div class=\"ps-actions\">',
        '      <button class=\"ps-btn primary\" type=\"button\" data-act=\"sRun\">계산</button>',
        '      <button class=\"ps-btn secondary\" type=\"button\" data-act=\"sReset\">초기화</button>',
        '    </div>',
        '    <div class=\"ps-kpis cols3\">',
        '      <div class=\"ps-kpi\"><div class=\"k\">총 베팅</div><div class=\"v\" data-out=\"tb\">—</div><div class=\"s\">bet×spins</div></div>',
        '      <div class=\"ps-kpi\"><div class=\"k\">기대 손실</div><div class=\"v\" data-out=\"el\">—</div><div class=\"s\">HE 기반</div></div>',
        '      <div class=\"ps-kpi\"><div class=\"k\">권장 뱅크롤</div><div class=\"v\" data-out=\"br\">—</div><div class=\"s\">bet×배수</div></div>',
        '    </div>',
        '    <div class=\"ps-out\" data-out=\"sBox\" style=\"display:none;\"></div>',
        '  </div>',
        '</details>',

        '<details class=\"ps-acc\" data-plus=\"hunt\">',
        '  <summary><span>🧨 보너스 헌트 플래너</span><span class=\"ps-badge\">목표 보너스</span></summary>',
        '  <div class=\"ps-acc-body\">',
        '    <div class=\"ps-note\">보너스 진입이 평균 N스핀마다 1회라고 가정할 때, 목표 보너스 횟수를 달성하기 위한 <b>예상 총 스핀/총 베팅</b>을 계산합니다.</div>',
        '    <div class=\"ps-row cols3\" style=\"margin-top:10px;\">',
        '      <div class=\"ps-field\"><label>평균 보너스 간격(스핀)</label><input data-k=\"gap\" inputmode=\"numeric\" value=\"180\"></div>',
        '      <div class=\"ps-field\"><label>목표 보너스 횟수</label><input data-k=\"bn\" inputmode=\"numeric\" value=\"5\"></div>',
        '      <div class=\"ps-field\"><label>스핀당 베팅(원)</label><input data-k=\"bb\" inputmode=\"numeric\" placeholder=\"예: 1000\"></div>',
        '    </div>',
        '    <div class=\"ps-actions\">',
        '      <button class=\"ps-btn primary\" type=\"button\" data-act=\"hRun\">계산</button>',
        '      <button class=\"ps-btn secondary\" type=\"button\" data-act=\"hReset\">초기화</button>',
        '    </div>',
        '    <div class=\"ps-kpis cols3\">',
        '      <div class=\"ps-kpi\"><div class=\"k\">예상 스핀</div><div class=\"v\" data-out=\"sp\">—</div><div class=\"s\">gap×bn</div></div>',
        '      <div class=\"ps-kpi\"><div class=\"k\">총 베팅</div><div class=\"v\" data-out=\"tb\">—</div><div class=\"s\">원</div></div>',
        '      <div class=\"ps-kpi\"><div class=\"k\">권장 뱅크롤</div><div class=\"v\" data-out=\"br\">—</div><div class=\"s\">중변동 150x</div></div>',
        '    </div>',
        '    <div class=\"ps-out\" data-out=\"hBox\" style=\"display:none;\"></div>',
        '  </div>',
        '</details>'
      ].join('');

      var sBox = qs(container,'[data-out=\"sBox\"]');
      qs(container,'[data-act=\"sRun\"]').addEventListener('click', function(){
        var rtp = clamp(parseFloat(qs(container,'[data-k=\"rtp\"]').value||'0')/100, 0.7, 1);
        var vol = qs(container,'[data-k=\"vol\"]').value||'mid';
        var bet = Math.max(0, parseFloat(qs(container,'[data-k=\"bet\"]').value||'0'));
        var spins = Math.max(1, parseInt(qs(container,'[data-k=\"spins\"]').value||'300',10));
        var mulSel = qs(container,'[data-k=\"mul\"]').value||'auto';
        if(!(bet>0)){
          sBox.style.display='block';
          sBox.innerHTML='<h4>입력 필요</h4><div class=\"ps-note\">베팅 금액을 입력하세요.</div>';
          return;
        }
        var totalBet = bet*spins;
        var he = 1-rtp;
        var expLoss = totalBet*he;
        var mulAuto = {low:80, mid:150, high:250, vhigh:400}[vol]||150;
        var mul = (mulSel==='auto') ? mulAuto : Math.max(20, parseInt(mulSel,10));
        var br = bet*mul;
        qs(container,'[data-out=\"tb\"]').textContent = won(totalBet);
        qs(container,'[data-out=\"el\"]').textContent = won(-expLoss);
        qs(container,'[data-out=\"br\"]').textContent = won(br);
        sBox.style.display='block';
        sBox.innerHTML = '<h4>설명</h4><ul>'+
          '<li>하우스엣지(100-RTP): <b>'+fmt(he*100,2)+'%</b></li>'+
          '<li>기대손실(이론): <b>'+won(-expLoss)+'</b> (단기 변동 매우 큼)</li>'+
          '<li>권장 뱅크롤(체감): <b>'+mul+'×</b> (변동성 '+vol+')</li>'+
        '</ul>';
      });
      qs(container,'[data-act=\"sReset\"]').addEventListener('click', function(){
        ['rtp','bet','memo'].forEach(function(k){ qs(container,'[data-k=\"'+k+'\"]').value=''; });
        qs(container,'[data-k=\"vol\"]').value='mid';
        qs(container,'[data-k=\"spins\"]').value='300';
        qs(container,'[data-k=\"mul\"]').value='auto';
        ['tb','el','br'].forEach(function(id){ qs(container,'[data-out=\"'+id+'\"]').textContent='—'; });
        sBox.style.display='none'; sBox.innerHTML='';
      });

      var hBox = qs(container,'[data-out=\"hBox\"]');
      qs(container,'[data-plus=\"hunt\"] [data-act=\"hRun\"]').addEventListener('click', function(){
        var gap = Math.max(1, parseInt(qs(container,'[data-k=\"gap\"]').value||'180',10));
        var bn = Math.max(1, parseInt(qs(container,'[data-k=\"bn\"]').value||'5',10));
        var bb = Math.max(0, parseFloat(qs(container,'[data-k=\"bb\"]').value||'0'));
        if(!(bb>0)){
          hBox.style.display='block';
          hBox.innerHTML='<h4>입력 필요</h4><div class=\"ps-note\">스핀당 베팅을 입력하세요.</div>';
          return;
        }
        var spins = gap*bn;
        var totalBet = spins*bb;
        var br = bb*150;
        qs(container,'[data-plus=\"hunt\"] [data-out=\"sp\"]').textContent = fmt(spins,0);
        qs(container,'[data-plus=\"hunt\"] [data-out=\"tb\"]').textContent = won(totalBet);
        qs(container,'[data-plus=\"hunt\"] [data-out=\"br\"]').textContent = won(br);
        hBox.style.display='block';
        hBox.innerHTML = '<h4>요약</h4><ul>'+
          '<li>목표 보너스 '+bn+'회, 평균 '+gap+'스핀 간격 → 예상 '+fmt(spins,0)+'스핀</li>'+
          '<li>총 베팅: <b>'+won(totalBet)+'</b></li>'+
          '<li>TIP) 보너스 변동이 큰 슬롯은 목표를 낮추고 세션을 쪼개세요.</li>'+
        '</ul>';
      });
      qs(container,'[data-plus=\"hunt\"] [data-act=\"hReset\"]').addEventListener('click', function(){
        qs(container,'[data-k=\"gap\"]').value='180';
        qs(container,'[data-k=\"bn\"]').value='5';
        qs(container,'[data-k=\"bb\"]').value='';
        ['sp','tb','br'].forEach(function(id){ qs(container,'[data-plus=\"hunt\"] [data-out=\"'+id+'\"]').textContent='—'; });
        hBox.style.display='none'; hBox.innerHTML='';
      });

    }catch(e){}
  }

  function injectCertPromo(){
    try{
      if(window.__88st_cfg && window.__88st_cfg('promo.cert.enabled', true) === false) return;
      if(qs(document,'#_88stCertPromo')) return;
      var path = (location.pathname||'');
      if(path.indexOf('/cert')===0 || path.indexOf('/ops')===0) return;

      var host = document.createElement('div');
      host.id = '_88stCertPromo';
      host.style.marginTop = '14px';

      // try attach near bottom of main
      var mount = qs(document,'main') || qs(document,'.wrap') || qs(document,'.st-app') || document.body;
      try{ mount.appendChild(host); }catch(e){ document.body.appendChild(host); }

      // load cert config
      fetch('/assets/config/cert.landing.json?v=' + encodeURIComponent(window.__BUILD_VER||'0'), {cache:'no-store'})
        .then(function(r){ return r.ok ? r.json(): null; })
        .then(function(cfg){
          if(!cfg) return;
          var list = [];
          try{ if(cfg && cfg.vendors) list = cfg.vendors; }catch(e){}
          if(!list || !list.length) return;
          var v = list[0];
          // pick first enabled
          for(var i=0;i<list.length;i++){ if(list[i] && list[i].enabled!==false){ v=list[i]; break; } }
          var code = (v.code||'').trim();
          var url = (v.join_url||'').trim();
          var name = (v.vendor||'CERT').trim();
          var tg = (cfg.telegram||'').trim();

          host.innerHTML = [
            '<details class=\"ps-acc\" open>',
            '  <summary><span>✅ 인증사이트 추천</span><span class=\"ps-badge\">SAFE</span></summary>',
            '  <div class=\"ps-acc-body\">',
            '  <div class=\"ps-note\" style=\"margin-bottom:10px;\"><b>인증사이트 추천</b> · 사칭주의/피싱 방지 가이드를 확인하고 이용하세요.</div>',
            '  <div class=\"ps-row cols3\">',
            '    <div class=\"ps-kpi\"><div class=\"k\">업체</div><div class=\"v\" style=\"font-size:16px;\">'+name+'</div><div class=\"s\">추천</div></div>',
            '    <div class=\"ps-kpi\"><div class=\"k\">가입코드</div><div class=\"v\" id=\"_88stPromoCode\" style=\"font-size:16px;\">'+(code||'—')+'</div><div class=\"s\">원클릭 복사</div></div>',
            '    <div class=\"ps-kpi\"><div class=\"k\">문의</div><div class=\"v\" style=\"font-size:16px;\">텔레그램</div><div class=\"s\">안전 확인</div></div>',
            '  </div>',
            '  <div class=\"ps-actions\" style=\"margin-top:10px;\">',
            '    <button class=\"ps-btn primary\" type=\"button\" id=\"_88stPromoGo\">원클릭 복사+이동</button>',
            '    <button class=\"ps-btn ghost\" type=\"button\" id=\"_88stPromoCopy\">코드 복사</button>',
            '    <a class=\"ps-btn ghost\" href=\"'+(tg||'#')+'\" target=\"_blank\" rel=\"noopener\">텔레그램 문의</a>',
            '  </div>',
            ' </div>',
            '</div></details>'
          ].join('');

          function copySync(text){
            try{
              var ta=document.createElement('textarea');
              ta.value=text||'';
              ta.setAttribute('readonly','');
              ta.style.position='fixed';
              ta.style.left='-9999px';
              ta.style.top='-9999px';
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              ta.remove();
              return true;
            }catch(e){ return false; }
          }

          var copyBtn = qs(host,'#_88stPromoCopy');
          var goBtn = qs(host,'#_88stPromoGo');
          if(copyBtn) copyBtn.addEventListener('click', function(){
            if(code && copySync(code)){
              try{ if(window.track) window.track('cert_promo_copy', {vendor:name}); }catch(e){}
            }
          });
          if(goBtn) goBtn.addEventListener('click', function(){
            if(code) copySync(code);
            try{ if(window.track) window.track('cert_promo_go', {vendor:name}); }catch(e){}
            if(url){ try{ window.open(url,'_blank','noopener'); }catch(e){ location.href=url; } }
          });
        })
        .catch(function(){});

    }catch(e){}
  }


// --- Boot ---
  function boot(){
    // sports
    qsa(document,'[data-prosuite="sports"]').forEach(function(el){ renderSports(el); enhanceSportsPlus(el); });

    // casino
    qsa(document,'[data-prosuite="casino"]').forEach(function(el){ renderCasino(el); enhanceCasinoPlus(el); });

    // minigame
    qsa(document,'[data-prosuite="minigame"]').forEach(function(el){ renderMinigame(el); enhanceMinigamePlus(el); });

    // logbook

    // slot
    qsa(document,'[data-prosuite="slot"]').forEach(function(el){ renderSlotSuite(el); });

    // logbook
    qsa(document,'[data-prosuite="logbook"]').forEach(function(el){ renderLogbook(el); });

    // cert popup enhancement (even if no cert container)
    ensureCertPopupSticky();
    ensureCertSummary3();
    enhanceOddsPage();
    injectLearnPack();
    injectCertPromo();

    // In case popup is injected later
    try{
      var popup = qs(document,'#cardPopup');
      if(popup && window.MutationObserver){
        var mo = new MutationObserver(function(){ ensureCertPopupSticky(); });
        mo.observe(popup, {subtree:true, childList:true});
      }
    }catch(e){}
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
