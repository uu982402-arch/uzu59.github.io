/* Logbook Category Report (v1.20260226)
 * - Adds "성과 분해" report panes to /logbook
 * - No schema changes; classifies category via heuristic
 */
(function(){
  'use strict';

  var KEY = '88st_betlog_v1';

  function cfg(path, fallback){
    try{ return (typeof window.__88st_cfg === 'function') ? window.__88st_cfg(path, fallback) : fallback; }
    catch(e){ return fallback; }
  }

  function safeJSON(t){ try{ return JSON.parse(t); }catch(e){ return null; } }

  function read(){
    try{ var s = localStorage.getItem(KEY); var j = s ? safeJSON(s) : null; return Array.isArray(j) ? j : []; }
    catch(e){ return []; }
  }

  function profit(e){
    var st = +e.stake || 0;
    var od = +e.odds || 0;
    if(e.res==='W') return st*(od-1);
    if(e.res==='L') return -st;
    return 0;
  }

  function weekRange(){
    var d = new Date(); d.setHours(0,0,0,0);
    var day = d.getDay();
    var diff = (day===0? -6 : 1-day);
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

  function classify(e){
    try{
      var c0 = (e && e.cat) ? String(e.cat).toLowerCase() : '';
      if(c0==='sports'||c0==='casino'||c0==='slot'||c0==='minigame') return c0;
      var s = ((e.sport||'')+' '+(e.market||'')+' '+(e.tag||'')+' '+(e.note||'')).toLowerCase();
      // Casino
      if(/바카라|baccarat|룰렛|roulette|블랙잭|blackjack|카지노|casino/.test(s)) return 'casino';
      // Slot
      if(/슬롯|slot|rtp|프라그마틱|pragmatic|스핀|bonus hunt|보너스/.test(s)) return 'slot';
      // Minigame
      if(/미니|minigame|하이로우|hilo|주사위|dice|크래시|crash|코인|coin|플립|flip/.test(s)) return 'minigame';
      return 'sports';
    }catch(e2){ return 'sports'; }
  }

  function mddOf(items){
    var sorted = items.slice().sort(function(a,b){ return (+a.ts||0) - (+b.ts||0); });
    var cum=0, peak=0, mdd=0;
    for(var i=0;i<sorted.length;i++){
      cum += profit(sorted[i]);
      if(cum>peak) peak=cum;
      var dd = peak - cum;
      if(dd>mdd) mdd=dd;
    }
    return mdd;
  }

  function agg(items){
    var st=0, pnl=0, w=0, l=0, v=0;
    for(var i=0;i<items.length;i++){
      var e = items[i];
      st += (+e.stake||0);
      pnl += profit(e);
      if(e.res==='W') w++;
      else if(e.res==='L') l++;
      else v++;
    }
    var roi = st>0 ? (pnl/st) : 0;
    var wr = (w+l)>0 ? (w/(w+l)) : 0;
    var mdd = mddOf(items);
    return {cnt: items.length, st: st, pnl: pnl, roi: roi, wr: wr, mdd:mdd};
  }

  function pct(x){ return isFinite(x) ? (x*100).toFixed(1)+'%' : '—'; }
  function won(x){ if(!isFinite(x)) return '—'; var s=Math.round(Math.abs(x)).toLocaleString(); return (x<0?'−':'')+s; }

  function pickMode(container){
    // We follow the existing buttons: [data-act="week"|"month"|"all"]
    // We store the last clicked mode locally.
    var key = '__88st_logbook_mode_v1';
    try{
      var m = localStorage.getItem(key);
      if(m==='week'||m==='month'||m==='all') return m;
    }catch(e){}
    return 'week';
  }

  function setMode(m){
    try{ localStorage.setItem('__88st_logbook_mode_v1', m); }catch(e){}
  }

  function rangeFor(mode){
    if(mode==='month') return monthRange();
    if(mode==='all') return null;
    return weekRange();
  }

  function filterRange(items, range){
    if(!range) return items;
    return items.filter(function(e){
      var ts = +e.ts || 0;
      return ts>=range[0] && ts<range[1];
    });
  }

  function ensureUI(container){
    if(container.querySelector('.psLogTabs')) return;

    // feature gate
    if(cfg('features.logbookReport', true) === false) return;

    // Locate report accordion body
    var accs = container.querySelectorAll('.ps-acc');
    var reportAcc = null;
    for(var i=0;i<accs.length;i++){
      var sum = accs[i].querySelector('summary');
      var t = sum ? (sum.textContent||'') : '';
      if(t.indexOf('리포트')>=0){ reportAcc = accs[i]; break; }
    }
    if(!reportAcc) return;
    var body = reportAcc.querySelector('.ps-acc-body');
    if(!body) return;

    var tabs = document.createElement('div');
    tabs.className = 'psLogTabs';
    tabs.innerHTML = [
      '<button type="button" class="psLogTab active" data-tab="sum">요약</button>',
      '<button type="button" class="psLogTab" data-tab="cat">카테고리</button>',
      '<button type="button" class="psLogTab" data-tab="hint">인사이트</button>'
    ].join('');

    var paneCat = document.createElement('div');
    paneCat.className = 'psLogPane';
    paneCat.setAttribute('data-pane','cat');

    var paneHint = document.createElement('div');
    paneHint.className = 'psLogPane';
    paneHint.setAttribute('data-pane','hint');

    // Insert tabs after the first KPI row
    try{
      var firstRow = body.querySelector('.ps-row');
      if(firstRow && firstRow.nextSibling){
        body.insertBefore(tabs, firstRow.nextSibling);
      }else{
        body.insertBefore(tabs, body.firstChild);
      }
    }catch(e){ body.insertBefore(tabs, body.firstChild); }

    body.appendChild(paneCat);
    body.appendChild(paneHint);

    function setTab(id){
      tabs.querySelectorAll('.psLogTab').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-tab')===id); });
      // 요약은 기존 KPI/버튼 영역 그대로 보여주고, cat/hint는 pane만 보여줌.
      // We simply toggle panes; summary is always the default view.
      paneCat.classList.toggle('active', id==='cat');
      paneHint.classList.toggle('active', id==='hint');

      // Hide default KPI blocks when in cat/hint for clarity
      body.querySelectorAll('.ps-row, .ps-actions').forEach(function(el){
        if(!el) return;
        if(el===tabs || el===paneCat || el===paneHint) return;
        var isPane = (el.classList && (el.classList.contains('psLogPane') || el.classList.contains('psLogTabs')));
        if(isPane) return;

        // Keep period buttons visible in all tabs
        var keep = false;
        try{
          if(el.classList && el.classList.contains('ps-actions')){
            if(el.querySelector('[data-act="week"]') && el.querySelector('[data-act="month"]')) keep = true;
          }
        }catch(e){}

        if(id==='sum') el.style.display='';
        else el.style.display = keep ? '' : 'none';
      });

      // Keep tabs visible
      tabs.style.display='flex';
      // Ensure panes visible
      paneCat.style.display = (id==='cat') ? 'block' : 'none';
      paneHint.style.display = (id==='hint') ? 'block' : 'none';

      // Render when opening non-summary
      if(id!=='sum') render();
    }

    tabs.querySelectorAll('.psLogTab').forEach(function(btn){
      btn.addEventListener('click', function(){
        setTab(btn.getAttribute('data-tab'));
      });
    });

    // Bind period buttons to refresh
    ['week','month','all'].forEach(function(m){
      var b = container.querySelector('[data-act="'+m+'"]');
      if(b){
        b.addEventListener('click', function(){ setMode(m); setTab('sum'); });
      }
    });

    // Bind add/save to refresh the panes
    ['add','quickW','quickL','import','clear'].forEach(function(a){
      var b2 = container.querySelector('[data-act="'+a+'"]');
      if(b2){
        b2.addEventListener('click', function(){ setTimeout(render, 120); });
      }
    });

    function render(){
      try{
        var mode = pickMode(container);
        var range = rangeFor(mode);
        var all = read();
        var items = filterRange(all, range);

        var buckets = { sports:[], casino:[], slot:[], minigame:[] };
        for(var i=0;i<items.length;i++){
          var c = classify(items[i]);
          (buckets[c] || buckets.sports).push(items[i]);
        }

        var labels = {
          sports: '스포츠',
          casino: '카지노',
          slot: '슬롯',
          minigame: '미니게임'
        };

        function cardHTML(id){
          var a = agg(buckets[id]||[]);
          var pnlCls = a.pnl>0 ? 'pos' : (a.pnl<0 ? 'neg' : '');
          var ddCls = a.mdd>0 ? 'neg' : '';
          var note = a.cnt ? (mode==='all'?'전체':'기간')+' '+a.cnt+'건' : '데이터 부족';
          return [
            '<div class="psCatCard">',
            ' <div class="t"><span>'+labels[id]+'</span><span class="b">'+note+'</span></div>',
            ' <div class="kpis">',
            '   <div class="kpi"><div class="k">ROI</div><div class="v '+(a.roi>0?'pos':(a.roi<0?'neg':''))+'">'+pct(a.roi)+'</div></div>',
            '   <div class="kpi"><div class="k">순손익</div><div class="v '+pnlCls+'">'+won(a.pnl)+'</div></div>',
            '   <div class="kpi"><div class="k">MDD</div><div class="v '+ddCls+'">'+won(-a.mdd)+'</div></div>',
            ' </div>',
            ' <div class="psCatHint">적중률 '+pct(a.wr)+' · 총투입 '+won(a.st)+'원</div>',
            '</div>'
          ].join('');
        }

        paneCat.innerHTML = [
          '<div class="ps-note">카테고리는 기본 자동 분류되며, 저장 시 <b>카테고리 값</b>이 함께 기록됩니다. (필요할 때 상단 “카테고리 칩”을 한 번만 눌러 고정하면 정확도가 100%에 가까워집니다.)</div>',
          '<div class="psCatGrid" style="margin-top:10px">',
          cardHTML('sports'),
          cardHTML('casino'),
          cardHTML('slot'),
          cardHTML('minigame'),
          '</div>'
        ].join('');

        // Insights: best + riskiest
        var list = ['sports','casino','slot','minigame'].map(function(id){
          var a = agg(buckets[id]||[]);
          a.id = id;
          return a;
        });
        var best = list.slice().sort(function(a,b){ return (b.roi||0)-(a.roi||0); })[0];
        var risk = list.slice().sort(function(a,b){ return (b.mdd||0)-(a.mdd||0); })[0];
        var msg = [];
        if(best && best.cnt){
          msg.push('✅ <b>최고 성과</b>: '+labels[best.id]+' · ROI '+pct(best.roi)+' ('+best.cnt+'건)');
        }else{
          msg.push('✅ <b>최고 성과</b>: 데이터가 아직 부족합니다.');
        }
        if(risk && risk.cnt){
          msg.push('⚠️ <b>리스크 구간</b>: '+labels[risk.id]+' · 최대낙폭 '+won(-risk.mdd)+' (기간 기준)');
        }else{
          msg.push('⚠️ <b>리스크 구간</b>: 데이터가 아직 부족합니다.');
        }

        // Add gentle guidance based on preset
        var preset = (typeof window.__88st_preset_get==='function') ? window.__88st_preset_get() : 'balanced';
        var presetLab = (preset==='safe')?'안전':(preset==='aggressive'?'공격':'밸런스');
        var tip = (preset==='safe')
          ? '안전 모드에서는 <b>세션 손절</b>을 더 빠르게 잡고, 한 번에 투입을 줄이는 게 좋습니다.'
          : (preset==='aggressive')
            ? '공격 모드는 변동성이 커집니다. <b>쿨다운</b>을 꼭 지켜서 과몰입을 막아주세요.'
            : '밸런스(추천)는 "기록→리포트→루틴" 흐름에 최적화되어 있습니다.';

        paneHint.innerHTML = [
          '<div class="ps-row cols2">',
          '  <div class="ps-kpi"><div class="k">이번 모드</div><div class="v">'+(mode==='all'?'전체':(mode==='month'?'이번달':'이번주'))+'</div><div class="s">카테고리 기준 성과 분해</div></div>',
          '  <div class="ps-kpi"><div class="k">추천 설정</div><div class="v">'+presetLab+'</div><div class="s">선택 부담 최소화</div></div>',
          '</div>',
          '<div class="ps-note" style="margin-top:10px">'+msg.join('<br/>')+'</div>',
          '<div class="ps-note" style="margin-top:10px"><b>TIP</b> · '+tip+'</div>'
        ].join('');

      }catch(e){
        paneCat.innerHTML = '<div class="ps-note">리포트 계산 중 오류가 발생했습니다.</div>';
        paneHint.innerHTML = '<div class="ps-note">리포트 계산 중 오류가 발생했습니다.</div>';
      }
    }

    // initial state: summary
    setTab('sum');
  }

  function boot(){
    try{
      var p = (location && location.pathname) ? (location.pathname+'') : '/';
      if(p.indexOf('/logbook')!==0) return;

      // feature gate
      if(cfg('features.logbookReport', true) === false) return;

      var host = document.querySelector('.ps-logbook');
      if(!host) {
        // rendered after pro-suite; retry a few times
        var n=0;
        var t = setInterval(function(){
          n++;
          var h = document.querySelector('.ps-logbook');
          if(h){ clearInterval(t); ensureUI(h); }
          if(n>30) clearInterval(t);
        }, 120);
        return;
      }
      ensureUI(host);
    }catch(e){}
  }

  if(typeof window.__88st_ready==='function'){
    window.__88st_ready(function(){ boot(); });
  }else{
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})();
