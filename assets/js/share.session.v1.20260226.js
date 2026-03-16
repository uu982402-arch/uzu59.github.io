/* 88ST Share Card + Session Safety (v1.20260226)
 * - Adds "이미지" share button to tool bars (stx-bar)
 * - Generates premium PNG card via Canvas
 * - Session safety widget: stop-loss / take-profit / cooldown with optional button lock
 */
(function(){
  'use strict';

  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function safeJSON(s){ try{ return JSON.parse(s); }catch(e){ return null; } }
  function todayKST(){
    // Asia/Seoul offset +9
    var d = new Date(Date.now() + (9*60*60*1000));
    var y = d.getUTCFullYear();
    var m = String(d.getUTCMonth()+1).padStart(2,'0');
    var dd = String(d.getUTCDate()).padStart(2,'0');
    return y+'-'+m+'-'+dd;
  }

  function toast(msg){
    try{
      var host = document.getElementById('_88stToastHost');
      if(!host){
        host = document.createElement('div');
        host.id = '_88stToastHost';
        host.setAttribute('aria-live','polite');
        document.body.appendChild(host);
      }
      var t = document.createElement('div');
      t.className = 'stx-toast';
      t.textContent = msg;
      host.appendChild(t);
      requestAnimationFrame(function(){ t.classList.add('show'); });
      setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ try{t.remove();}catch(e){} }, 260); }, 1900);
    }catch(e){}
  }

  async function copyText(text){
    if(!text) return false;
    try{ await navigator.clipboard.writeText(text); return true; }
    catch(e){
      try{
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly','readonly');
        ta.style.position='fixed';
        ta.style.left='-9999px';
        ta.style.top='-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        return true;
      }catch(e2){ return false; }
    }
  }

  // --- Share card ---
  function ensureShareModal(){
    var m = document.getElementById('_88stShareCardModal');
    if(m) return m;
    m = document.createElement('div');
    m.id = '_88stShareCardModal';
    m.className = 'sc-modal';
    m.innerHTML = [
      '<div class="sc-backdrop" data-close="1"></div>',
      '<div class="sc-box" role="dialog" aria-modal="true" aria-label="공유 카드 생성">',
      '  <div class="sc-head">',
      '    <div>',
      '      <div class="sc-title">공유 카드(이미지)</div>',
      '      <div class="sc-sub">텔레그램/커뮤니티에 올리기 좋은 1장 요약 이미지를 생성합니다.</div>',
      '    </div>',
      '    <button class="sc-x" type="button" data-close="1" aria-label="닫기">✕</button>',
      '  </div>',
      '  <div class="sc-body">',
      '    <div class="sc-row">',
      '      <button class="sc-btn primary" type="button" id="_88stSCDownload">PNG 다운로드</button>',
      '      <button class="sc-btn" type="button" id="_88stSCCopyLink">링크 복사</button>',
      '      <button class="sc-btn" type="button" id="_88stSCCopyText">텍스트 요약 복사</button>',
      '      <span style="flex:1"></span>',
      '      <button class="sc-btn" type="button" id="_88stSCRegenerate">새로 생성</button>',
      '    </div>',
      '    <div class="sc-canvasWrap"><canvas id="_88stSCCanvas" width="1080" height="1080"></canvas></div>',
      '    <div class="sc-tip">* 민감한 정보는 포함하지 마세요. 이 이미지는 브라우저에서만 생성됩니다.</div>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(m);

    function close(){ m.classList.remove('open'); }
    m.addEventListener('click', function(ev){
      var t = ev.target;
      if(t && t.getAttribute && t.getAttribute('data-close')==='1') close();
    });
    document.addEventListener('keydown', function(ev){ if(ev.key==='Escape') close(); });
    return m;
  }

  function pickText(el){
    try{ return (el && el.textContent ? String(el.textContent).trim() : ''); }catch(e){ return ''; }
  }

  function extractToolSummary(){
    // Prefer toolconfig output IDs if present
    var title = document.title || '88ST';
    var lines = [];

    // Common KPI patterns
    var kpis = qsa('.kv .item');
    if(kpis && kpis.length){
      kpis.slice(0,6).forEach(function(it){
        var k = pickText(qs('.k', it));
        var v = pickText(qs('.v', it));
        if(k && v) lines.push(k+' : '+v);
      });
    }

    // Tool EV/Margin pages
    var ids = ['be','evPct','evAmt','judge','margin','sumImp','fairOdds','fairProb','probOut','oddsOut','beOut','outLoss','outTotal','outBankroll'];
    ids.forEach(function(id){
      var el = document.getElementById(id);
      if(el){
        var v = pickText(el);
        if(v) lines.push(id+' : '+v);
      }
    });

    // Fallback: first visible result text blocks
    if(lines.length<2){
      var outs = qsa('.out, .result, .ps-out');
      outs.slice(0,2).forEach(function(o){
        var t = pickText(o);
        if(t){
          t = t.replace(/\s+/g,' ').trim();
          if(t.length>140) t = t.slice(0,140)+'…';
          lines.push(t);
        }
      });
    }

    // Hard cap
    lines = lines.filter(Boolean).slice(0,10);

    return {
      title: title,
      lines: lines,
      link: window.location.href
    };
  }

  function drawCard(data){
    var c = document.getElementById('_88stSCCanvas');
    if(!c) return;
    var ctx = c.getContext('2d');

    // Theme detection
    var dark = (document.documentElement && document.documentElement.getAttribute('data-theme')==='dark');

    var W = c.width, H = c.height;
    ctx.clearRect(0,0,W,H);

    // Background
    ctx.fillStyle = dark ? '#0b0c10' : '#f7f7fb';
    ctx.fillRect(0,0,W,H);

    // Subtle grid
    ctx.globalAlpha = dark ? 0.06 : 0.08;
    ctx.strokeStyle = dark ? '#ffffff' : '#000000';
    for(var x=60;x<W;x+=80){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(var y=60;y<H;y+=80){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.globalAlpha = 1;

    // Card surface
    var pad = 64;
    var r = 44;
    var x0 = pad, y0 = pad, w0 = W - pad*2, h0 = H - pad*2;

    function rr(x,y,w,h,rad){
      ctx.beginPath();
      ctx.moveTo(x+rad,y);
      ctx.arcTo(x+w,y,x+w,y+h,rad);
      ctx.arcTo(x+w,y+h,x,y+h,rad);
      ctx.arcTo(x,y+h,x,y,rad);
      ctx.arcTo(x,y,x+w,y,rad);
      ctx.closePath();
    }

    // shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,'+(dark?0.55:0.22)+')';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 18;
    rr(x0,y0,w0,h0,r);
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.92)';
    ctx.fill();
    ctx.restore();

    // border
    rr(x0,y0,w0,h0,r);
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Header
    var brand = (window.__88st_cfg && window.__88st_cfg('brand.name','88ST.Cloud')) || '88ST.Cloud';
    var stamp = todayKST();

    ctx.fillStyle = dark ? '#ffffff' : '#0b0c10';
    ctx.font = '900 40px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(brand, x0+44, y0+74);

    ctx.globalAlpha = 0.78;
    ctx.font = '700 22px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('RESULT SNAPSHOT · '+stamp, x0+44, y0+108);
    ctx.globalAlpha = 1;

    // Title
    var t = (data.title||'').replace(/\s+/g,' ').trim();
    if(t.length>44) t = t.slice(0,44)+'…';
    ctx.font = '900 34px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(t, x0+44, y0+164);

    // Divider
    ctx.globalAlpha = dark ? 0.20 : 0.12;
    ctx.fillRect(x0+44, y0+188, w0-88, 2);
    ctx.globalAlpha = 1;

    // Lines
    ctx.font = '700 26px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.86)';

    var y = y0+240;
    var lineMax = 10;
    var lh = 48;
    var maxW = w0-88;

    function wrapLine(s){
      var out=[];
      var words = String(s||'').split(/\s+/);
      var cur='';
      for(var i=0;i<words.length;i++){
        var nxt = (cur?cur+' ':'') + words[i];
        if(ctx.measureText(nxt).width > maxW){
          if(cur) out.push(cur);
          cur = words[i];
        }else cur=nxt;
      }
      if(cur) out.push(cur);
      return out;
    }

    var rows=[];
    (data.lines||[]).forEach(function(s){
      if(!s) return;
      wrapLine(s).forEach(function(w){ rows.push(w); });
    });
    rows = rows.slice(0,lineMax);

    rows.forEach(function(s, idx){
      var bulletX = x0+44;
      var textX = x0+78;
      var yy = y + idx*lh;
      // bullet dot
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(bulletX, yy-8, 6, 0, Math.PI*2);
      ctx.fillStyle = dark ? 'rgba(121,83,255,0.95)' : 'rgba(121,83,255,0.90)';
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = dark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.86)';
      ctx.fillText(s, textX, yy);
    });

    // Footer badge
    var footer = window.__88st_cfg ? (window.__88st_cfg('links.cert','/cert/')||'/cert/') : '/cert/';
    var footY = y0 + h0 - 86;

    // footer pill
    var pill = '인증사이트 · '+footer;
    ctx.font = '800 22px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
    var tw = ctx.measureText(pill).width;
    var px = x0+44;
    var py = footY;
    rr(px, py-34, tw+34, 44, 22);
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
    ctx.fill();
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.10)';
    ctx.stroke();
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.78)';
    ctx.fillText(pill, px+18, py);

    // Right small note
    ctx.globalAlpha = 0.68;
    ctx.font = '700 20px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
    var note = '참고용 · 과몰입 금지';
    var noteW = ctx.measureText(note).width;
    ctx.fillText(note, x0+w0-44-noteW, py);
    ctx.globalAlpha = 1;
  }

  function openShareCard(){
    var m = ensureShareModal();
    var data = extractToolSummary();
    drawCard(data);
    m.classList.add('open');

    var dl = document.getElementById('_88stSCDownload');
    var reg = document.getElementById('_88stSCRegenerate');
    var cl = document.getElementById('_88stSCCopyLink');
    var ct = document.getElementById('_88stSCCopyText');

    if(dl && !dl.dataset.bound){
      dl.dataset.bound='1';
      dl.addEventListener('click', function(){
        try{
          var c = document.getElementById('_88stSCCanvas');
          var url = c.toDataURL('image/png');
          var a = document.createElement('a');
          a.href = url;
          a.download = '88st_card_'+todayKST()+'.png';
          document.body.appendChild(a);
          a.click();
          a.remove();
        }catch(e){ toast('다운로드 실패'); }
      });
    }

    if(reg && !reg.dataset.bound){
      reg.dataset.bound='1';
      reg.addEventListener('click', function(){
        var d = extractToolSummary();
        drawCard(d);
        toast('새로 생성됨');
      });
    }

    if(cl && !cl.dataset.bound){
      cl.dataset.bound='1';
      cl.addEventListener('click', async function(){
        var ok = await copyText(window.location.href);
        toast(ok?'링크 복사됨':'복사 실패');
      });
    }

    if(ct && !ct.dataset.bound){
      ct.dataset.bound='1';
      ct.addEventListener('click', async function(){
        var d = extractToolSummary();
        var text = (d.title+'\n\n'+(d.lines||[]).map(function(x){return '• '+x;}).join('\n')+'\n\n'+d.link).trim();
        var ok = await copyText(text);
        toast(ok?'요약 복사됨':'복사 실패');
      });
    }
  }

  function injectShareBtn(){
    try{
      var bar = qs('.stx-bar');
      if(!bar) return;
      if(qs('#_88stShareCardBtn', bar)) return;
      var right = qs('.stx-right', bar);
      if(!right) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'stx-btn ghost';
      b.id = '_88stShareCardBtn';
      b.textContent = '이미지';
      b.addEventListener('click', function(){ openShareCard(); });
      // Insert after "공유" if present
      var share = qs('#_88stShareBtn', right);
      if(share && share.nextSibling) right.insertBefore(b, share.nextSibling);
      else right.insertBefore(b, right.firstChild);
    }catch(e){}
  }

  // --- Session Safety ---
  var SKEY = '__88st_session_safety_v1';

  function readSession(){
    try{ var s = localStorage.getItem(SKEY); return s? (safeJSON(s)||{}): {}; }catch(e){ return {}; }
  }
  function writeSession(o){
    try{ localStorage.setItem(SKEY, JSON.stringify(o||{})); }catch(e){}
  }

  function readBetlogPnl(day){
    var KEY = '88st_betlog_v1';
    try{
      var s = localStorage.getItem(KEY);
      var arr = s? (safeJSON(s)||[]): [];
      if(!Array.isArray(arr)) return {pnl:0, st:0};
      var pnl=0, st=0;
      arr.forEach(function(e){
        if(!e) return;
        var d = String(e.date||'');
        if(d!==day) return;
        var stake = +e.stake||0;
        var od = +e.odds||0;
        st += stake;
        if(e.res==='W') pnl += stake*(od-1);
        else if(e.res==='L') pnl -= stake;
      });
      return {pnl:pnl, st:st};
    }catch(e){ return {pnl:0, st:0}; }
  }

  function readSlotPnl(day){
    var KEY = '88st_slot_sessions_v1';
    try{
      var s = localStorage.getItem(KEY);
      var arr = s? (safeJSON(s)||[]): [];
      if(!Array.isArray(arr)) return {pnl:0, bet:0};
      var pnl=0, bet=0;
      arr.forEach(function(e){
        if(!e) return;
        var d = String(e.date||'');
        if(d!==day) return;
        pnl += (+e.pl||0);
        bet += (+e.totalBet||0);
      });
      return {pnl:pnl, bet:bet};
    }catch(e){ return {pnl:0, bet:0}; }
  }

  function computePnl(day){
    var a = readBetlogPnl(day);
    var b = readSlotPnl(day);
    return {
      pnl: (a.pnl||0) + (b.pnl||0),
      stake: (a.st||0),
      slotBet: (b.bet||0)
    };
  }

  function fmtWon(x){
    if(!isFinite(x)) return '—';
    var s = Math.round(Math.abs(x)).toLocaleString();
    return (x<0? '−':'') + s;
  }

  function ensureSessionWidget(){
    var host = document.getElementById('_88stSessionWidget');
    if(host) return host;
    host = document.createElement('div');
    host.id = '_88stSessionWidget';
    host.className = 'sx-session';
    host.innerHTML = [
      '<div class="hd">',
      '  <div class="min">',
      '    <div><div class="ttl">세이프티 락</div><div class="badge" id="_sxState">OFF</div></div>',
      '  </div>',
      '  <button class="x" type="button" id="_sxHide" aria-label="숨기기">✕</button>',
      '</div>',
      '<div class="body">',
      '  <div class="kpis">',
      '    <div class="kpi"><div class="k">오늘 손익</div><div class="v" id="_sxPnl">—</div></div>',
      '    <div class="kpi"><div class="k">손절선</div><div class="v" id="_sxSL">—</div></div>',
      '    <div class="kpi"><div class="k">익절선</div><div class="v" id="_sxTP">—</div></div>',
      '  </div>',
      '  <div class="row">',
      '    <input id="_sxBank" inputmode="numeric" placeholder="오늘 기준 자금(원)"/>',
      '    <button class="btn" type="button" id="_sxOn">ON</button>',
      '    <button class="btn" type="button" id="_sxOff">OFF</button>',
      '  </div>',
      '  <div class="row">',
      '    <input id="_sxStop" inputmode="decimal" placeholder="손절 %"/>',
      '    <input id="_sxTake" inputmode="decimal" placeholder="익절 %"/>',
      '    <input id="_sxCool" inputmode="numeric" placeholder="쿨다운(분)"/>' ,
      '  </div>',
      '  <div class="row">',
      '    <button class="btn primary" type="button" id="_sxApply">적용</button>',
      '    <button class="btn" type="button" id="_sxReset">리셋</button>',
      '    <button class="btn" type="button" id="_sxUnlock">잠금 해제</button>',
      '  </div>',
      '  <div class="note" id="_sxNote">* 오늘 손익은 로그북(스포츠) + 슬롯 세션 기록을 합산합니다.</div>',
      '</div>'
    ].join('');

    document.body.appendChild(host);

    return host;
  }

  function shouldHideWidget(){
    try{ return localStorage.getItem('__88st_session_hide_v1')==='1'; }catch(e){ return false; }
  }

  function setHideWidget(on){
    try{ localStorage.setItem('__88st_session_hide_v1', on?'1':'0'); }catch(e){}
  }

  function isOps(){
    try{ return (location.pathname||'').indexOf('/ops')===0; }catch(e){ return false; }
  }

  function bindSessionWidget(cfg){
    if(isOps()) return;

    var enabled = !!(cfg && cfg.features && cfg.features.sessionSafety);
    if(!enabled) return;

    if(shouldHideWidget()) return;

    var w = ensureSessionWidget();
    var day = todayKST();

    var state = readSession();
    if(state.day !== day){
      state.day = day;
      state.locked = false;
      state.cooldownUntil = 0;
      // keep config values
      writeSession(state);
    }

    function defaults(){
      var r = (cfg && cfg.risk) ? cfg.risk : {};
      return {
        bank: (state.bank||''),
        stop: (state.stopPct!=null? state.stopPct : (r.stopLossPct!=null?r.stopLossPct:3)),
        take: (state.takePct!=null? state.takePct : (r.takeProfitPct!=null?r.takeProfitPct:5)),
        cool: (state.coolMin!=null? state.coolMin : (r.cooldownMin!=null?r.cooldownMin:15)),
        on: (state.on!=null? !!state.on : !!(r.lockEnabledDefault))
      };
    }

    function render(){
      state = readSession();
      if(state.day !== day){ state.day = day; writeSession(state); }

      var d = defaults();
      var pnl = computePnl(day).pnl;

      var bank = parseFloat(d.bank||0);
      var sl = bank>0 ? -bank*(+d.stop||0)/100 : NaN;
      var tp = bank>0 ? bank*(+d.take||0)/100 : NaN;

      qs('#_sxPnl', w).textContent = fmtWon(pnl);
      qs('#_sxSL', w).textContent = isFinite(sl) ? fmtWon(sl) : '—';
      qs('#_sxTP', w).textContent = isFinite(tp) ? fmtWon(tp) : '—';

      qs('#_sxBank', w).value = d.bank;
      qs('#_sxStop', w).value = String(d.stop);
      qs('#_sxTake', w).value = String(d.take);
      qs('#_sxCool', w).value = String(d.cool);

      var locked = !!state.locked;
      var on = !!d.on;
      var badge = qs('#_sxState', w);
      if(badge) badge.textContent = locked ? 'LOCK' : (on ? 'ON' : 'OFF');

      // evaluate lock condition
      if(on && bank>0){
        var cooldown = (state.cooldownUntil||0) > Date.now();
        var hitSL = pnl <= sl;
        var hitTP = pnl >= tp;
        if((hitSL || hitTP) && !locked){
          state.locked = true;
          state.lockReason = hitSL ? 'stoploss' : 'takeprofit';
          // apply cooldown
          var cm = Math.max(0, parseInt(d.cool||0,10));
          state.cooldownUntil = Date.now() + cm*60*1000;
          writeSession(state);
          toast(hitSL ? '손절선 도달: 세이프티 락 활성' : '익절선 도달: 세이프티 락 활성');
        }
        if(cooldown && !locked){
          // nothing
        }
      }

      applyLockToButtons();
    }

    function applyLockToButtons(){
      state = readSession();
      var d = defaults();
      var locked = !!state.locked;
      var on = !!d.on;
      var cooldown = (state.cooldownUntil||0) > Date.now();

      var block = (on && (locked || cooldown));
      document.body.classList.toggle('sx-locked', block);

      // Only block "compute" clicks (not navigation)
      function isComputeBtn(el){
        if(!el || !(el instanceof HTMLElement)) return false;
        if(el.matches('.ps-btn.primary')) return true;
        if(el.id && /(calc|run|sim|add|save|compute)/i.test(el.id)) return true;
        if(el.getAttribute('data-act') && el.matches('button')) return true;
        // legacy div.btn in some tools
        if(el.classList && el.classList.contains('btn') && el.closest('.card')){
          var txt = (el.textContent||'').trim();
          if(/계산|시뮬|저장|생성/i.test(txt)) return true;
        }
        return false;
      }

      if(!document.body.dataset.sxBound){
        document.body.dataset.sxBound='1';
        document.addEventListener('click', function(ev){
          try{
            var t = ev.target;
            if(!block) return;
            var el = t && t.closest ? t.closest('button, .btn, [role="button"]') : null;
            if(!el) return;
            if(isComputeBtn(el)){
              ev.preventDefault();
              ev.stopPropagation();
              var msg = locked ? '세이프티 락: 잠금 상태입니다' : '쿨다운 중입니다';
              toast(msg);
            }
          }catch(e){}
        }, true);
      }

      // Update note
      var note = qs('#_sxNote', w);
      if(note){
        if(block){
          var left = cooldown ? Math.max(0, Math.ceil(((state.cooldownUntil||0)-Date.now())/1000)) : 0;
          note.textContent = locked
            ? ('* 잠금 사유: '+(state.lockReason==='stoploss'?'손절선':'익절선')+' · 쿨다운 '+left+'초')
            : ('* 쿨다운 '+left+'초');
        }else{
          note.textContent = '* 오늘 손익은 로그북(스포츠) + 슬롯 세션 기록을 합산합니다.';
        }
      }
    }

    // bind buttons
    var hideBtn = qs('#_sxHide', w);
    if(hideBtn && !hideBtn.dataset.bound){
      hideBtn.dataset.bound='1';
      hideBtn.addEventListener('click', function(){
        w.classList.add('sx-hidden');
        setHideWidget(true);
      });
    }

    function bindOnce(id, fn){
      var el = qs(id, w);
      if(el && !el.dataset.bound){ el.dataset.bound='1'; el.addEventListener('click', fn); }
    }

    bindOnce('#_sxOn', function(){ state = readSession(); state.on = true; writeSession(state); render(); toast('ON'); });
    bindOnce('#_sxOff', function(){ state = readSession(); state.on = false; state.locked=false; writeSession(state); render(); toast('OFF'); });

    bindOnce('#_sxApply', function(){
      state = readSession();
      state.day = day;
      state.bank = (qs('#_sxBank', w).value||'').trim();
      state.stopPct = parseFloat(qs('#_sxStop', w).value||'');
      state.takePct = parseFloat(qs('#_sxTake', w).value||'');
      state.coolMin = parseInt(qs('#_sxCool', w).value||'',10);
      // sanitize
      if(!isFinite(state.stopPct) || state.stopPct<=0) state.stopPct = 3;
      if(!isFinite(state.takePct) || state.takePct<=0) state.takePct = 5;
      if(!isFinite(state.coolMin) || state.coolMin<0) state.coolMin = 15;
      writeSession(state);
      render();
      toast('적용됨');
    });

    bindOnce('#_sxReset', function(){
      var r = (cfg && cfg.risk) ? cfg.risk : {};
      state = { day: day, on: !!r.lockEnabledDefault, locked:false, cooldownUntil:0, bank:'', stopPct:r.stopLossPct||3, takePct:r.takeProfitPct||5, coolMin:r.cooldownMin||15 };
      writeSession(state);
      render();
      toast('리셋 완료');
    });

    bindOnce('#_sxUnlock', function(){
      state = readSession();
      state.locked = false;
      state.cooldownUntil = 0;
      writeSession(state);
      render();
      toast('잠금 해제');
    });

    // periodic refresh
    render();
    setInterval(render, 2500);
    window.addEventListener('storage', function(){ render(); });
  }

  function boot(){
    // Share button
    if(window.__88st_ready){
      window.__88st_ready(function(cfg){
        if(cfg && cfg.features && cfg.features.shareCard) injectShareBtn();
        bindSessionWidget(cfg||{});
      });
    }else{
      injectShareBtn();
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
