/* 88ST /analysis ↔ Logbook bridge (v2)
   - v1: Summary KPIs + recent entries
   - v2: Add "원클릭 저장" from /analysis current input → Logbook
     * 선택(홈/무/원정, 오버/언더, 핸디 A/B 등)을 칩으로 선택
     * 금액이 입력되어 있으면 칩 클릭으로 즉시 저장
     * 기록 마켓 문자열에 (1X2/OU/핸디) 및 라인/선택을 포함
*/
(function(){
  'use strict';

  var KEY = '88st_betlog_v1';
  var KEY_LAST_STAKE = '88st_betlog_last_stake_v1';

  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function safeRead(){
    try{
      var s = localStorage.getItem(KEY);
      if(!s) return [];
      var arr = JSON.parse(s);
      return Array.isArray(arr) ? arr : [];
    }catch(e){
      return [];
    }
  }

  function safeWrite(arr){
    try{ localStorage.setItem(KEY, JSON.stringify(arr||[])); }catch(e){}
  }

  function today(){
    try{
      var d = new Date();
      var y=d.getFullYear(), m=('0'+(d.getMonth()+1)).slice(-2), dd=('0'+d.getDate()).slice(-2);
      return y+'-'+m+'-'+dd;
    }catch(e){ return ''; }
  }

  function parseStake(v){
    var s = String(v||'').replace(/[^0-9.]/g,'');
    var n = parseFloat(s);
    return (isFinite(n) && n>0) ? n : NaN;
  }

  function parseOdd(v){
    var s = String(v||'').replace(/[^0-9.\-]/g,'');
    var n = parseFloat(s);
    return (isFinite(n) && n>1) ? n : NaN;
  }

  function profit(e){
    var st = +e.stake || 0;
    var od = +e.odds || 0;
    var r = (e.res||'').toUpperCase();
    if(r==='W') return st*(od-1);
    if(r==='L') return -st;
    return 0; // V/VOID
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

  function fmtWon(n){
    try{ return new Intl.NumberFormat('ko-KR').format(Math.round(n)); }catch(e){ return String(Math.round(n)); }
  }

  function fmtPct(x){
    if(!isFinite(x)) return '—';
    var v = x*100;
    var s = (Math.round(v*10)/10).toFixed(1);
    return (v>=0? '+' : '') + s + '%';
  }

  function compute(arr, range){
    var items = arr.slice().sort(function(a,b){ return (+a.ts||0) - (+b.ts||0); });
    if(range){
      items = items.filter(function(e){
        var t = +e.ts || Date.parse((e.date||'')+'T00:00:00') || 0;
        return t>=range[0] && t<range[1];
      });
    }
    var cnt = items.length;
    var st=0, pnl=0, w=0, l=0, v=0, sumOdds=0, oddsN=0;
    for(var i=0;i<items.length;i++){
      var e = items[i];
      var stake = +e.stake||0;
      var od = +e.odds||0;
      var r = (e.res||'').toUpperCase();
      st += stake;
      pnl += profit(e);
      if(od>1){ sumOdds += od; oddsN++; }
      if(r==='W') w++; else if(r==='L') l++; else v++;
    }
    var roi = st>0 ? (pnl/st) : NaN;
    var wr = (w+l)>0 ? (w/(w+l)) : NaN;
    var avgod = oddsN>0 ? (sumOdds/oddsN) : NaN;
    return {cnt:cnt, st:st, pnl:pnl, roi:roi, w:w, l:l, v:v, wr:wr, avgod:avgod, items:items};
  }

  function computeMDD(arr){
    var items = arr.slice().sort(function(a,b){ return (+a.ts||0) - (+b.ts||0); });
    var cum=0, peak=0, mdd=0;
    for(var i=0;i<items.length;i++){
      cum += profit(items[i]);
      if(cum>peak) peak=cum;
      var dd = peak - cum;
      if(dd>mdd) mdd=dd;
    }
    return mdd;
  }

  function badgeClassByROI(roi){
    if(!isFinite(roi)) return 'good';
    if(roi >= 0.02) return 'good';
    if(roi <= -0.02) return 'bad';
    return 'warn';
  }

  function toast(msg){
    try{
      var t = qs('#lbToast');
      if(!t) return;
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(function(){ t.classList.remove('show'); }, 1600);
    }catch(e){}
  }

  function render(){
    var host = qs('#lbSummary');
    if(!host) return;

    var arr = safeRead();
    var wk = compute(arr, weekRange());
    var mk = compute(arr, monthRange());
    var mdd = computeMDD(arr);

    var elW = qs('#lbWroi');
    var elWn = qs('#lbWnote');
    var elM = qs('#lbMroi');
    var elMn = qs('#lbMnote');
    var elD = qs('#lbMdd');
    var elC = qs('#lbCnt');
    var elR = qs('#lbRecent');
    var elB = qs('#lbBadge');

    if(elW) elW.textContent = fmtPct(wk.roi);
    if(elWn) elWn.textContent = (wk.cnt? (wk.cnt+'건 · 순손익 '+fmtWon(wk.pnl)+'원') : '기록 없음');

    if(elM) elM.textContent = fmtPct(mk.roi);
    if(elMn) elMn.textContent = (mk.cnt? (mk.cnt+'건 · 순손익 '+fmtWon(mk.pnl)+'원') : '기록 없음');

    if(elD) elD.textContent = (arr.length? ('-'+fmtWon(mdd)+'원') : '—');
    if(elC) elC.textContent = (arr.length? (arr.length+'건') : '0건');

    if(elB){
      var cls = badgeClassByROI(wk.roi);
      elB.className = 'pro-badge '+cls;
      elB.textContent = (arr.length? ('이번주 '+(wk.cnt? fmtPct(wk.roi) : '기록 없음')) : '로그북 비어 있음');
    }

    if(elR){
      if(!arr.length){
        elR.innerHTML = '<div style="padding:10px 0;opacity:.75">아직 로그북 기록이 없습니다. <a href="/logbook/" style="text-decoration:underline" target="_blank" rel="noopener">/logbook/</a>에서 ‘빠른 기록’을 추가하세요.</div>';
      } else {
        var items = arr.slice().sort(function(a,b){ return (+b.ts||0) - (+a.ts||0); }).slice(0,5);
        var rows = items.map(function(e){
          var r = (e.res||'').toUpperCase();
          var pnl = profit(e);
          var sign = pnl>=0? '+' : '';
          var label = (r==='W'?'WIN':(r==='L'?'LOSE':'VOID'));
          var meta = [
            (e.date||''),
            (e.sport||'').trim(),
            (e.market||'').trim()
          ].filter(Boolean).join(' · ');
          if(meta.length>44) meta = meta.slice(0,44)+'…';
          return '<div class="pro-scanitem" style="align-items:flex-start">'
            + '<div class="meta"><div class="t">'+label+' <span style="opacity:.7">@ '+(isFinite(+e.odds)? (+e.odds).toFixed(2):'—')+'</span></div>'
            + '<div class="d">'+(meta||'')+'</div></div>'
            + '<div class="right" style="flex-direction:column;align-items:flex-end;gap:4px">'
            + '<div style="font-weight:900;font-variant-numeric:tabular-nums">'+sign+fmtWon(pnl)+'원</div>'
            + '<div style="font-size:12px;opacity:.75">투입 '+fmtWon(+e.stake||0)+'원</div>'
            + '</div>'
            + '</div>';
        }).join('');
        elR.innerHTML = rows;
      }
    }

    // actions
    var btnOpen = qs('#btnOpenLogbook');
    if(btnOpen && !btnOpen.__bound){
      btnOpen.__bound = true;
      btnOpen.addEventListener('click', function(){
        window.open('/logbook/', '_blank', 'noopener');
      });
    }

    var btnSync = qs('#btnLbRefresh');
    if(btnSync && !btnSync.__bound){
      btnSync.__bound = true;
      btnSync.addEventListener('click', function(){ render(); });
    }
  }

  // ---- Quick save (analysis → logbook) ----
  var modal, pickBox, stakeEl, resEl, noteEl, previewEl, saveBtn;
  var curPick = null; // {market, sport, odds, stake, res, note}

  function getSelectText(sel){
    try{
      var el = qs(sel);
      if(!el) return '';
      var opt = el.options && el.selectedIndex>=0 ? el.options[el.selectedIndex] : null;
      return (opt && opt.textContent) ? opt.textContent.trim() : '';
    }catch(e){ return ''; }
  }

  function inferMarket(){
    var mSel = qs('#marketSel');
    var mv = (mSel && mSel.value) ? mSel.value : 'auto';
    if(mv && mv!=='auto') return mv;
    // infer by visible input groups
    var g1 = qs('#inputs1x2');
    var g2 = qs('#inputs2way');
    var g3 = qs('#inputsOU');
    var g4 = qs('#inputsHcap');
    function vis(el){ return !!el && (getComputedStyle(el).display !== 'none'); }
    if(vis(g1)) return '1x2';
    if(vis(g3)) return 'ou';
    if(vis(g4)) return 'handicap';
    if(vis(g2)) return '2way';

    // fallback: by table row count
    var rows = qsa('#tblBody tr');
    var cnt = rows.length;
    if(cnt>=3) return '1x2';
    if(cnt===2) return '2way';
    return '1x2';
  }

  function readFromTable(){
    try{
      var rows = qsa('#tblBody tr');
      var out = [];
      rows.forEach(function(tr){
        var tds = tr.querySelectorAll('td');
        if(!tds || tds.length<2) return;
        var label = (tds[0].textContent||'').trim();
        var od = parseOdd(tds[1].textContent||'');
        if(isFinite(od)) out.push({label: label, odds: od});
      });
      return out;
    }catch(e){ return []; }
  }

  function buildPickOptions(){
    var sport = getSelectText('#sportSel') || '';
    var mk = inferMarket();
    var opts = [];

    function val(id){ return parseOdd(qs(id)?.value || ''); }
    function line(id){
      var v = String(qs(id)?.value || '').trim();
      return v;
    }

    if(mk==='1x2'){
      var o1 = val('#od1'), ox = val('#odx'), o2 = val('#od2');
      if(!isFinite(o1) || !isFinite(ox) || !isFinite(o2)){
        var t = readFromTable();
        if(t.length>=3){ o1=t[0].odds; ox=t[1].odds; o2=t[2].odds; }
      }
      if(isFinite(o1)) opts.push({key:'HOME', label:'홈', market:'1X2', odds:o1});
      if(isFinite(ox)) opts.push({key:'DRAW', label:'무', market:'1X2', odds:ox});
      if(isFinite(o2)) opts.push({key:'AWAY', label:'원정', market:'1X2', odds:o2});
    } else if(mk==='2way'){
      var oa = val('#odA'), ob = val('#odB');
      if(!isFinite(oa) || !isFinite(ob)){
        var t2 = readFromTable();
        if(t2.length>=2){ oa=t2[0].odds; ob=t2[1].odds; }
      }
      if(isFinite(oa)) opts.push({key:'A', label:'A', market:'2-way', odds:oa});
      if(isFinite(ob)) opts.push({key:'B', label:'B', market:'2-way', odds:ob});
    } else if(mk==='ou'){
      var ln = line('#lineOU');
      var oo = val('#odO'), ou = val('#odU');
      if(!isFinite(oo) || !isFinite(ou)){
        var t3 = readFromTable();
        if(t3.length>=2){ oo=t3[0].odds; ou=t3[1].odds; }
      }
      var base = ln ? ('OU('+ln+')') : 'OU';
      if(isFinite(oo)) opts.push({key:'OVER', label:'오버'+(ln?(' '+ln):''), market:base, odds:oo});
      if(isFinite(ou)) opts.push({key:'UNDER', label:'언더'+(ln?(' '+ln):''), market:base, odds:ou});
    } else if(mk==='handicap'){
      var lh = line('#lineH');
      var h1 = val('#odH1'), h2 = val('#odH2');
      if(!isFinite(h1) || !isFinite(h2)){
        var t4 = readFromTable();
        if(t4.length>=2){ h1=t4[0].odds; h2=t4[1].odds; }
      }
      var baseH = lh ? ('H('+lh+')') : 'Handicap';
      if(isFinite(h1)) opts.push({key:'A', label:'선택A'+(lh?(' '+lh):''), market:baseH, odds:h1});
      if(isFinite(h2)) opts.push({key:'B', label:'반대B'+(lh?(' '+lh):''), market:baseH, odds:h2});
    }

    return {sport:sport, mk:mk, opts:opts};
  }

  function openModal(){
    modal = modal || qs('#lbSaveModal');
    pickBox = pickBox || qs('#lbPick');
    stakeEl = stakeEl || qs('#lbStake');
    resEl = resEl || qs('#lbRes');
    noteEl = noteEl || qs('#lbNote');
    previewEl = previewEl || qs('#lbPreview');
    saveBtn = saveBtn || qs('#lbSaveBtn');

    if(!modal || !pickBox || !stakeEl || !resEl || !saveBtn) return;

    var data = buildPickOptions();
    if(!data.opts.length){
      toast('저장할 배당을 찾지 못했습니다. 먼저 “분석하기”를 실행하세요.');
      return;
    }

    // stake default
    try{
      var last = localStorage.getItem(KEY_LAST_STAKE) || '';
      if(!stakeEl.value) stakeEl.value = last;
    }catch(e){}

    // render chips
    pickBox.innerHTML = data.opts.map(function(o, idx){
      return '<button type="button" class="lb-chip" data-i="'+idx+'">'
        + '<div class="k">'+escapeHtml(o.market)+' · '+escapeHtml(o.label)+'</div>'
        + '<div class="v">'+(isFinite(o.odds)? o.odds.toFixed(2):'—')+'</div>'
        + '</button>';
    }).join('');

    // default pick
    curPick = { sport: data.sport, market: data.opts[0].market+' '+data.opts[0].label, odds: data.opts[0].odds, label: data.opts[0].label };

    function setOn(i){
      var btns = qsa('.lb-chip', pickBox);
      btns.forEach(function(b){ b.classList.toggle('is-on', b.getAttribute('data-i')===String(i)); });
      var o = data.opts[i];
      if(!o) return;
      curPick.market = o.market+' '+o.label;
      curPick.odds = o.odds;
      curPick.label = o.label;
      updatePreview();
    }

    function updatePreview(){
      if(!previewEl) return;
      var st = parseStake(stakeEl.value);
      var m = qs('#kvMargin') ? (qs('#kvMargin').textContent||'').trim() : '';
      var ov = qs('#kvOver') ? (qs('#kvOver').textContent||'').trim() : '';
      var extra = [];
      if(m) extra.push('마진 '+m);
      if(ov) extra.push('오버라운드 '+ov);
      previewEl.textContent = '기록: '+(curPick.sport? (curPick.sport+' · '):'') + curPick.market + ' @ ' + (isFinite(curPick.odds)? curPick.odds.toFixed(2):'—')
        + (isFinite(st)? (' · 금액 '+fmtWon(st)+'원') : ' · 금액 미입력')
        + (extra.length? (' · '+extra.join(' / ')) : '');
    }

    function save(){
      if(!curPick || !isFinite(curPick.odds)) { toast('선택을 확인하세요'); return; }
      var stake = parseStake(stakeEl.value);
      if(!isFinite(stake) || stake<=0){ toast('금액을 입력하세요'); try{ stakeEl.focus(); }catch(e){} return; }

      var res = (resEl.value||'V').toUpperCase();
      if(res!=='W' && res!=='L' && res!=='V') res='V';
      var note = (noteEl && noteEl.value) ? String(noteEl.value).trim() : '';

      // auto add margin info into note (compact)
      try{
        var m = qs('#kvMargin') ? (qs('#kvMargin').textContent||'').trim() : '';
        var ov = qs('#kvOver') ? (qs('#kvOver').textContent||'').trim() : '';
        var tail = [];
        if(m) tail.push('마진 '+m);
        if(ov) tail.push('OR '+ov);
        if(tail.length){
          note = note ? (note + ' | ' + tail.join(' / ')) : tail.join(' / ');
        }
      }catch(e){}

      var entry = {
        id: String(Date.now()) + Math.random().toString(16).slice(2),
        ts: Date.now(),
        date: today(),
        sport: (curPick.sport||'').trim(),
        market: (curPick.market||'').trim(),
        odds: +curPick.odds,
        stake: stake,
        res: res,
        note: note,
        tag: 'analysis'
      };

      var arr = safeRead();
      arr.push(entry);
      safeWrite(arr);
      try{ localStorage.setItem(KEY_LAST_STAKE, String(stake)); }catch(e){}

      toast('로그북에 저장됨');
      closeModal();
      render();
      try{ window.__88stRefreshUserMenu && window.__88stRefreshUserMenu(); }catch(e){}
    }

    // bind chip clicks
    qsa('.lb-chip', pickBox).forEach(function(btn){
      btn.addEventListener('click', function(){
        var i = parseInt(btn.getAttribute('data-i')||'0', 10);
        setOn(i);
        // quick save if stake already valid
        var st = parseStake(stakeEl.value);
        if(isFinite(st) && st>0){ save(); }
        else { try{ stakeEl.focus(); }catch(e){} }
      });
    });

    // bind save btn (once)
    if(!saveBtn.__bound){
      saveBtn.__bound = true;
      saveBtn.addEventListener('click', save);
    }

    // bind close
    if(!modal.__bound){
      modal.__bound = true;
      qsa('[data-close="1"]', modal).forEach(function(el){
        el.addEventListener('click', closeModal);
      });
      document.addEventListener('keydown', function(e){
        if(e.key==='Escape' && modal.classList.contains('open')) closeModal();
      });
    }

    // input change updates preview
    if(!stakeEl.__bound){
      stakeEl.__bound = true;
      stakeEl.addEventListener('input', updatePreview);
    }
    if(noteEl && !noteEl.__bound){
      noteEl.__bound = true;
      noteEl.addEventListener('input', updatePreview);
    }

    setOn(0);
    updatePreview();

    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    try{ document.body.classList.add('st-no-scroll'); }catch(e){}
    setTimeout(function(){ try{ stakeEl.focus(); }catch(e){} }, 0);
  }

  function closeModal(){
    if(!modal) modal = qs('#lbSaveModal');
    if(!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    try{ document.body.classList.remove('st-no-scroll'); }catch(e){}
  }

  function escapeHtml(s){
    return String(s||'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function bindSaveButton(){
    var btn = qs('#btnSaveToLogbook');
    if(!btn || btn.__bound) return;
    btn.__bound = true;
    btn.addEventListener('click', function(){ openModal(); });
  }

  function boot(){
    render();
    bindSaveButton();
    // Re-render when user comes back from /logbook/
    document.addEventListener('visibilitychange', function(){ if(!document.hidden) { render(); bindSaveButton(); } });
    window.addEventListener('focus', function(){ render(); bindSaveButton(); });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
