/* 88ST Home Enhance Pack v154
 * - Conversion: sticky action bar + promo card "copy+go" + connection helper
 * - Retention: recent used + today's status + quick log modal
 * - All features are gated by /assets/config/site.runtime.json (OPS editable)
 */
(function(){
  'use strict';

  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function safeJSON(t){ try{ return JSON.parse(t); }catch(e){ return null; } }

  function isHome(){
    try{
      var p = (window.location && window.location.pathname) ? (window.location.pathname+'') : '/';
      return p==='/' || p==='/index.html';
    }catch(e){ return false; }
  }

  function withVer(url){
    try{
      var v = (window.__BUILD_VER||'0')+'';
      return url + (url.indexOf('?')>=0?'&':'?') + 'v=' + encodeURIComponent(v);
    }catch(e){ return url; }
  }

  function fetchJSON(url){
    return fetch(withVer(url), {cache:'no-store'}).then(function(r){
      if(!r || !r.ok) throw new Error('fetch failed');
      return r.json();
    });
  }

  function toast(msg){
    try{
      var t = qs('._88stToast');
      if(!t){
        t = document.createElement('div');
        t.className = '_88stToast';
        document.body.appendChild(t);
      }
      t.textContent = msg || '';
      t.classList.add('show');
      setTimeout(function(){ try{ t.classList.remove('show'); }catch(e){} }, 1600);
    }catch(e){}
  }

  async function copyText(text){
    try{
      if(!text) return false;
      if(navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(text);
        return true;
      }
    }catch(e){}
    try{
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position='fixed';
      ta.style.left='-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      return !!ok;
    }catch(e){ return false; }
  }

  function fmtWon(x){
    if(!isFinite(x)) return '—';
    var s = Math.round(Math.abs(x)).toLocaleString();
    return (x<0?'−':'+') + s;
  }

  function todayKey(){
    var d=new Date();
    var y=d.getFullYear();
    var m=('0'+(d.getMonth()+1)).slice(-2);
    var dd=('0'+d.getDate()).slice(-2);
    return y+'-'+m+'-'+dd;
  }

  function readLS(key, def){
    try{ var s=localStorage.getItem(key); return s? (safeJSON(s)||def): def; }catch(e){ return def; }
  }

  function writeLS(key, val){
    try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
  }

  function openWin(url){
    try{ return window.open(url, '_blank', 'noopener'); }catch(e){ return null; }
  }

  function ensureModal(){
    var mask = qs('#_88stHomeModal');
    if(mask) return mask;

    mask = document.createElement('div');
    mask.id = '_88stHomeModal';
    mask.className = '_88stModalMask';
    mask.innerHTML = [
      '<div class="_88stModal" role="dialog" aria-modal="true">',
      '  <div class="hd">',
      '    <div class="t" id="_88stHomeModalTitle">안내</div>',
      '    <button class="x" type="button" aria-label="닫기" id="_88stHomeModalClose">×</button>',
      '  </div>',
      '  <div class="bd" id="_88stHomeModalBody"></div>',
      '</div>'
    ].join('');
    document.body.appendChild(mask);

    function close(){ mask.classList.remove('show'); }
    mask.addEventListener('click', function(ev){ if(ev.target===mask) close(); });
    qs('#_88stHomeModalClose', mask).addEventListener('click', close);

    return mask;
  }

  function openModal(title, html){
    var mask = ensureModal();
    var t = qs('#_88stHomeModalTitle', mask);
    var b = qs('#_88stHomeModalBody', mask);
    if(t) t.textContent = title || '안내';
    if(b) b.innerHTML = html || '';
    mask.classList.add('show');
  }

  function getVendorList(certCfg){
    try{
      var v = (certCfg && certCfg.vendors) ? certCfg.vendors : null;
      if(!v || typeof v!=='object') return [];
      return Object.keys(v).map(function(k){ return v[k]; }).filter(Boolean);
    }catch(e){ return []; }
  }

  function pickDefaultVendor(vendors){
    if(!vendors || !vendors.length) return null;
    try{
      var last = localStorage.getItem('__88st_last_vendor_v1');
      if(last){
        for(var i=0;i<vendors.length;i++) if(vendors[i].slug===last) return vendors[i];
      }
    }catch(e){}
    return vendors[0];
  }

  function setLastVendor(slug){
    try{ localStorage.setItem('__88st_last_vendor_v1', slug); }catch(e){}
  }

  function buildActionBar(cfg, certCfg){
    try{ if(document.querySelector('.homeActionBar')) return; }catch(e){}
    var f = (cfg && cfg.features) ? cfg.features : {};
    if(!f.homeActionBar) return;

    var vendors = getVendorList(certCfg);
    var vendor = pickDefaultVendor(vendors);
    if(!vendor) return;

    var host = document.createElement('div');
    host.className = 'homeActionBar';

    var safeLabel = (vendor.title||'인증') + ' · 코드 ' + (vendor.code||'');
    var telegram = (cfg && cfg.links && cfg.links.telegram) ? cfg.links.telegram : (certCfg && certCfg.telegram) || '';

    host.innerHTML = [
      '<div class="hab" aria-label="원클릭 액션 바">',
      '  <div class="habLeft">',
      '    <span class="habChip" id="_habVendorChip" role="button" tabindex="0" aria-label="인증 선택">✅ <span id="_habVendorText">'+escapeHtml(safeLabel)+'</span></span>',
      '    <div class="habTitle">',
      '      <div class="t">원클릭 액션</div>',
      '      <div class="d">복사+이동 / 문의 / 빠른 기록</div>',
      '    </div>',
      '  </div>',
      '  <div class="habRight">',
      '    <button class="habBtn primary" type="button" id="_habGo">복사+이동 →</button>',
      '    <button class="habBtn" type="button" id="_habCopy">코드 복사</button>',
      (telegram? '<button class="habBtn" type="button" id="_habTg">텔레그램</button>' : ''),
      (f.homeQuickLog? '<button class="habBtn" type="button" id="_habQuick">빠른기록</button>' : ''),
      '  </div>',
      '</div>'
    ].join('');

    // insert under header shell
    var wrap = qs('.section-wrap') || document.body;
    wrap.parentNode.insertBefore(host, wrap);

    function openVendorPicker(){
      var rows = vendors.map(function(v){
        return '<button class="btn" type="button" data-slug="'+escapeAttr(v.slug)+'" style="flex:1">'+escapeHtml(v.title||v.slug)+' (코드 '+escapeHtml(v.code||'')+')</button>';
      }).join('');
      openModal('인증 선택', [
        '<div class="p">원하는 인증을 선택하면 액션 바의 기본 대상이 바뀝니다. (로컬 저장)</div>',
        '<div class="row">'+rows+'</div>',
        '<div class="row"><button class="btn" type="button" id="_habPickerClose" style="flex:1">닫기</button></div>'
      ].join(''));

      var mask = ensureModal();
      qsa('button[data-slug]', mask).forEach(function(b){
        b.addEventListener('click', function(){
          var slug = b.getAttribute('data-slug')||'';
          var nv = vendors.find(function(x){ return x.slug===slug; });
          if(nv){
            vendor = nv;
            setLastVendor(vendor.slug);
            var chip = qs('#_habVendorText');
            if(chip) chip.textContent = (vendor.title||'인증') + ' · 코드 ' + (vendor.code||'');
            toast('기본 인증 변경: '+(vendor.title||vendor.slug));
          }
          mask.classList.remove('show');
        });
      });
      var c = qs('#_habPickerClose', mask);
      if(c) c.addEventListener('click', function(){ mask.classList.remove('show'); });
    }

    function showConnHelp(url){
      var tgBtn = telegram ? ('<button class="btn" type="button" id="_connTg" style="flex:1">텔레그램 문의</button>') : '';
      openModal('접속 이슈 안내', [
        '<div class="p">접속이 안 되거나 새 창이 막히면 아래 순서대로 진행하세요.</div>',
        '<div class="p">1) 브라우저 <b>팝업 차단 해제</b> → 다시 시도</div>',
        '<div class="p">2) 그래도 안 되면 <b>인증 페이지</b>에서 혜택/가이드를 확인</div>',
        '<div class="p">3) 마지막으로 텔레그램으로 문의</div>',
        '<div class="row">',
        '  <button class="btn primary" type="button" id="_connRetry" style="flex:1">다시 열기</button>',
        '  <a class="btn" href="'+escapeAttr(vendor.landing_path||'/cert/')+'" style="flex:1; display:inline-flex; align-items:center; justify-content:center; text-decoration:none;">혜택 보기</a>',
        '</div>',
        '<div class="row">'+tgBtn+'<button class="btn" type="button" id="_connClose" style="flex:1">닫기</button></div>'
      ].join(''));

      var mask = ensureModal();
      var retry = qs('#_connRetry', mask);
      if(retry) retry.addEventListener('click', function(){
        var w = openWin(url);
        if(!w) toast('팝업 차단을 해제하세요');
      });
      var close = qs('#_connClose', mask);
      if(close) close.addEventListener('click', function(){ mask.classList.remove('show'); });
      var tg = qs('#_connTg', mask);
      if(tg && telegram) tg.addEventListener('click', function(){ openWin(telegram); });
    }

    function goCopyAndOpen(){
      var code = (vendor.code||'')+'';
      var url = (vendor.join_url||vendor.joinUrl||'')+'';
      if(!url){ toast('링크 없음'); return; }
      if(code){ copyText(code).then(function(ok){ if(ok) toast('코드 복사됨'); }); }

      // record usage
      try{ if(window.__88st_recent && window.__88st_recent.record) window.__88st_recent.record(vendor.landing_path||'/cert/', (vendor.title||'인증')+' 인증', {cat:'cert', type:'cert'}); }catch(e){}

      var w = openWin(url);
      if(!w){
        showConnHelp(url);
        return;
      }
      // show passive helper after short delay (in case of network issues)
      if(f.homeMirrorHelper){
        setTimeout(function(){
          var banner = qs('#_homeConnHint');
          if(!banner){
            banner = document.createElement('div');
            banner.id = '_homeConnHint';
            banner.className = 'homeEnhanceSection';
            banner.innerHTML = '<div class="homeCard" style="padding:12px;">'
              + '<div class="k">접속 이슈</div>'
              + '<div class="h">접속이 안 되면 여기를 눌러주세요</div>'
              + '<div class="d">팝업 차단/접속 불가 등 문제가 있으면 안내 패널을 열어 드립니다.</div>'
              + '<div class="go">안내 열기 →</div>'
              + '</div>';
            var secWrap = qs('.section-wrap');
            if(secWrap) secWrap.insertBefore(banner, secWrap.firstChild);
            banner.addEventListener('click', function(){ showConnHelp(url); });
          }
        }, 1200);
      }
    }

    // bind
    var chip = qs('#_habVendorChip', host);
    if(chip){
      chip.addEventListener('click', openVendorPicker);
      chip.addEventListener('keydown', function(ev){ if(ev.key==='Enter' || ev.key===' '){ ev.preventDefault(); openVendorPicker(); }});
    }

    var btnGo = qs('#_habGo', host);
    if(btnGo) btnGo.addEventListener('click', goCopyAndOpen);

    var btnCopy = qs('#_habCopy', host);
    if(btnCopy) btnCopy.addEventListener('click', function(){
      var code = (vendor.code||'')+'';
      if(!code){ toast('코드 없음'); return; }
      copyText(code).then(function(ok){ toast(ok? '코드 복사됨':'복사 실패'); });
    });

    var btnTg = qs('#_habTg', host);
    if(btnTg && telegram) btnTg.addEventListener('click', function(){ openWin(telegram); });

    var btnQ = qs('#_habQuick', host);
    if(btnQ) btnQ.addEventListener('click', function(){
      try{ if(window.__88st_home && window.__88st_home.openQuickLog) window.__88st_home.openQuickLog(); }
      catch(e){}
    });
  }

  function enhancePromoCards(cfg, certCfg){
    var f = (cfg && cfg.features) ? cfg.features : {};
    if(!f.homeCertCards) return;

    var vendors = getVendorList(certCfg);
    if(!vendors.length) return;

    var cards = qsa('.promo-grid .promo-card');
    if(!cards.length) return;

    var byPath = {};
    vendors.forEach(function(v){
      if(v && v.landing_path) byPath[v.landing_path] = v;
      if(v && v.slug) byPath['/cert/'+v.slug+'/'] = v;
    });

    cards.forEach(function(a){
      try{
        var href = (a.getAttribute('href')||'')+'';
        if(!href) return;
        if(href.length>1 && !href.endsWith('/')) href += '/';
        var v = byPath[href];
        if(!v) return;
        a.dataset.vendor = v.slug || '';

        // SAFE badge + benefit line
        var meta = qs('.promo-meta > div', a);
        if(meta && !qs('.promo-safe', meta)){
          var safe = document.createElement('div');
          safe.className = 'promo-safe';
          safe.title = '사칭 주의: 가입코드는 반드시 직접 복사/입력하세요.';
          safe.innerHTML = 'SAFE <span style="opacity:.75">사칭주의</span>';
          meta.appendChild(safe);
        }

        if(meta && !qs('.promo-benefit', meta)){
          var b = document.createElement('div');
          b.className = 'promo-benefit';
          b.textContent = (v.benefit||'') + (v.notice? (' · '+v.notice):'');
          meta.appendChild(b);
        }

        // Change CTA label
        var pills = qsa('.promo-cta .promo-pill', a);
        if(pills && pills.length>=2){
          pills[1].textContent = '복사+이동';
          pills[1].setAttribute('role','button');
          pills[1].setAttribute('tabindex','0');
          pills[1].dataset.action = 'copygo';
        }
        if(pills && pills.length>=1){
          pills[0].dataset.action = 'view';
        }

      }catch(e){}
    });

    // event delegation
    var grid = qs('.promo-grid');
    if(!grid || grid.__bound) return;
    grid.__bound = true;

    function handleCopyGo(card){
      var slug = card.dataset.vendor||'';
      var v = vendors.find(function(x){ return (x.slug||'')===slug; });
      if(!v) return;
      var code = (v.code||'')+'';
      var url = (v.join_url||'')+'';
      if(code) copyText(code).then(function(){ toast('코드 복사됨'); });

      try{ if(window.__88st_recent && window.__88st_recent.record) window.__88st_recent.record(v.landing_path||'/cert/', (v.title||'인증')+' 인증', {cat:'cert', type:'cert'}); }catch(e){}

      var w = openWin(url);
      if(!w && f.homeMirrorHelper){
        openModal('팝업 차단 / 접속 이슈', [
          '<div class="p">새 창이 차단되었거나 접속이 안 될 수 있습니다.</div>',
          '<div class="p">1) 팝업 차단을 해제한 뒤 다시 시도하세요.</div>',
          '<div class="row">',
          '  <button class="btn primary" type="button" id="_pcRetry" style="flex:1">다시 열기</button>',
          '  <a class="btn" href="'+escapeAttr(v.landing_path||'/cert/')+'" style="flex:1; display:inline-flex; align-items:center; justify-content:center; text-decoration:none;">혜택 보기</a>',
          '</div>'
        ].join(''));
        var mask = ensureModal();
        var r = qs('#_pcRetry', mask);
        if(r) r.addEventListener('click', function(){ var ww=openWin(url); if(!ww) toast('팝업 차단을 해제하세요'); });
      }
    }

    grid.addEventListener('click', function(ev){
      var t = ev.target;
      if(!t) return;
      var pill = null;
      if(t.classList && t.classList.contains('promo-pill')) pill = t;
      else pill = t.closest ? t.closest('.promo-pill') : null;
      if(!pill) return;
      var act = pill.dataset.action||'';
      var card = pill.closest ? pill.closest('.promo-card') : null;
      if(!card) return;
      if(act==='copygo'){
        ev.preventDefault();
        ev.stopPropagation();
        handleCopyGo(card);
      }
    }, true);

    grid.addEventListener('keydown', function(ev){
      var t = ev.target;
      if(!t || !(ev.key==='Enter' || ev.key===' ')) return;
      var pill = t.classList && t.classList.contains('promo-pill') ? t : (t.closest ? t.closest('.promo-pill') : null);
      if(!pill) return;
      if((pill.dataset.action||'')!=='copygo') return;
      var card = pill.closest ? pill.closest('.promo-card') : null;
      if(!card) return;
      ev.preventDefault();
      handleCopyGo(card);
    }, true);
  }

  function renderRecentUsed(cfg){
    try{ if(document.getElementById('homeRecentUsed')) return; }catch(e){}
    var f = (cfg && cfg.features) ? cfg.features : {};
    if(!f.homeRecentUsed) return;

    var read = null;
    try{ read = window.__88st_recent && window.__88st_recent.read; }catch(e){ read=null; }
    if(typeof read!=='function') return;

    var items = read() || [];
    items = items.filter(function(x){ return x && x.path && x.label; });

    var sec = document.createElement('section');
    sec.className = 'homeEnhanceSection';
    sec.id = 'homeRecentUsed';
    sec.innerHTML = [
      '<div class="title"><span class="badge">RECENT</span>최근 사용</div>',
      '<div class="dash-sub">최근 사용한 도구/가이드를 바로 이어서 사용할 수 있습니다. <span class="muted">(로컬 저장)</span></div>',
      '<div class="homeRecentGrid" id="_recentGrid"></div>'
    ].join('');

    var wrap = qs('.section-wrap');
    if(wrap) wrap.insertBefore(sec, qs('#homeQuickStart') || wrap.firstChild);

    var grid = qs('#_recentGrid', sec);

    function addCard(href, k, h, d){
      var a = document.createElement('a');
      a.className = 'homeCard';
      a.href = href;
      a.innerHTML = '<div class="k">'+escapeHtml(k)+'</div>'
        + '<div class="h">'+escapeHtml(h)+'</div>'
        + '<div class="d">'+escapeHtml(d)+'</div>'
        + '<div class="go">바로가기 →</div>';
      grid.appendChild(a);
    }

    if(!items.length){
      addCard('/analysis/','분석기(스포츠)','스포츠 배당 분석기','마진·공정확률 3초 정리');
      addCard('/tool-slot/','분석기(슬롯)','슬롯 RTP 분석기','세션 비용/리스크를 숫자로');
      addCard('/cert/','인증','인증사이트','혜택·가입코드·주의 한 번에');
      return;
    }

    var top = items.slice(0,3);
    top.forEach(function(it){
      addCard(it.path, kindLabel(it.type, it.cat), it.label, '마지막 사용: '+timeAgo(it.ts));
    });
  }

  function timeAgo(ts){
    if(!ts) return '—';
    var d = Date.now() - (+ts||0);
    if(!isFinite(d) || d<0) return '방금';
    var m = Math.floor(d/60000);
    if(m<=1) return '방금';
    if(m<60) return m+'분 전';
    var h = Math.floor(m/60);
    if(h<24) return h+'시간 전';
    var day = Math.floor(h/24);
    return day+'일 전';
  }

  function kindLabel(type, cat){
    if(type==='cert') return '인증';
    if(type==='log') return '기록';
    if(type==='guide') return '가이드';
    if(type==='calc') return '계산기';
    if(type==='tool'){
      if(cat==='sports') return '분석기(스포츠)';
      if(cat==='casino') return '분석기(카지노)';
      if(cat==='slot') return '분석기(슬롯)';
      if(cat==='mini') return '분석기(미니게임)';
      return '분석기';
    }
    return '바로가기';
  }

  function injectTodayStatus(cfg){
    try{ if(document.getElementById('homeTodayStatus')) return; }catch(e){}
    var f = (cfg && cfg.features) ? cfg.features : {};
    if(!f.homeTodayStatus) return;

    var day = todayKey();
    var betlog = readLS('88st_betlog_v1', []);
    var slots = readLS('88st_slot_sessions_v1', []);
    var pnl = 0;

    if(Array.isArray(betlog)){
      betlog.forEach(function(e){
        if(!e || String(e.date||'')!==day) return;
        var st = +e.stake||0;
        var od = +e.odds||0;
        if((e.res||'')==='W') pnl += st*(od-1);
        else if((e.res||'')==='L') pnl -= st;
      });
    }
    if(Array.isArray(slots)){
      slots.forEach(function(e){
        if(!e || String(e.date||'')!==day) return;
        pnl += (+e.pl||0);
      });
    }

    var sx = readLS('__88st_session_safety_v1', {});
    var on = !!sx.on;
    var locked = !!sx.locked;
    var left = 0;
    try{ left = Math.max(0, Math.ceil(((+sx.cooldownUntil||0) - Date.now())/1000)); }catch(e){ left = 0; }

    var sec = document.createElement('section');
    sec.className = 'homeEnhanceSection';
    sec.id = 'homeTodayStatus';
    sec.innerHTML = [
      '<div class="title"><span class="badge">STATUS</span>오늘의 상태</div>',
      '<div class="dash-sub">오늘 상태와 손익을 한 화면에서 확인합니다. <span class="muted">(로컬 저장)</span></div>',
      '<div class="homeStatusRow">',
      '  <div class="homeStatusPill"><div><div class="l">상태</div><div class="v" id="_hsLock">'+escapeHtml((locked?'LOCK':(on?'ON':'OFF')) )+'</div></div></div>',
      '  <div class="homeStatusPill"><div><div class="l">오늘 손익</div><div class="v" id="_hsPnl">'+escapeHtml(fmtWon(pnl))+'</div></div></div>',
      '  <div class="homeStatusPill"><div><div class="l">쿨다운</div><div class="v" id="_hsCd">'+escapeHtml(left? (left+'s') : '—')+'</div></div></div>',
      (f.homeQuickLog? '  <button class="habBtn" type="button" id="_hsQuick" style="height:44px; border-radius:16px;">빠른 기록</button>' : ''),
      '</div>'
    ].join('');

    var wrap = qs('.section-wrap');
    if(wrap) wrap.insertBefore(sec, qs('#homeDash') || qs('#homeQuickStart') || wrap.firstChild);

    var btn = qs('#_hsQuick', sec);
    if(btn) btn.addEventListener('click', function(){
      try{ if(window.__88st_home && window.__88st_home.openQuickLog) window.__88st_home.openQuickLog(); }
      catch(e){}
    });

    // live update
    function refresh(){
      try{
        var sx2 = readLS('__88st_session_safety_v1', {});
        var on2 = !!sx2.on, locked2 = !!sx2.locked;
        var left2 = Math.max(0, Math.ceil(((+sx2.cooldownUntil||0) - Date.now())/1000));
        var el = qs('#_hsLock'); if(el) el.textContent = locked2?'LOCK':(on2?'ON':'OFF');
        var cd = qs('#_hsCd'); if(cd) cd.textContent = left2? (left2+'s') : '—';
      }catch(e){}
    }
    setInterval(refresh, 2000);
    window.addEventListener('storage', refresh);
  }

  function bindQuickLog(cfg){
    var f = (cfg && cfg.features) ? cfg.features : {};
    if(!f.homeQuickLog) return;

    function inferCat(){
      // default: sports
      return 'sports';
    }

    function open(){
      var day = todayKey();
      openModal('빠른 기록', [
        '<div class="p">간단히 기록만 남기세요.</div>',
        '<div class="row">',
        '  <select id="_qlCat">',
        '    <option value="sports">스포츠</option>',
        '    <option value="casino">카지노</option>',
        '    <option value="slot">슬롯</option>',
        '    <option value="mini">미니게임</option>',
        '  </select>',
        '</div>',
        '<div class="row">',
        '  <input id="_qlMemo" placeholder="메모(선택) — 예: EPL 오버 2.5" />',
        '</div>',
        '<div class="row">',
        '  <input id="_qlStake" inputmode="numeric" placeholder="금액(필수)" />',
        '  <input id="_qlOdds" inputmode="decimal" placeholder="배당(선택)" />',
        '</div>',
        '<div class="row">',
        '  <select id="_qlRes">',
        '    <option value="V" selected>대기/VOID</option>',
        '    <option value="W">WIN</option>',
        '    <option value="L">LOSE</option>',
        '  </select>',
        '</div>',
        '<div class="row">',
        '  <button class="btn primary" type="button" id="_qlSave" style="flex:1">저장</button>',
        '  <button class="btn" type="button" id="_qlOpen" style="flex:1">분석기로 이동</button>',
        '</div>'
      ].join(''));

      var mask = ensureModal();
      var cat = qs('#_qlCat', mask);
      if(cat) cat.value = inferCat();

      var save = qs('#_qlSave', mask);
      if(save) save.addEventListener('click', function(){
        var catv = (cat && cat.value) ? cat.value : 'sports';
        var memo = (qs('#_qlMemo', mask).value||'').trim();
        var stakeRaw = (qs('#_qlStake', mask).value||'').replace(/[^0-9.]/g,'');
        var stake = parseFloat(stakeRaw);
        var oddsRaw = (qs('#_qlOdds', mask).value||'').replace(/[^0-9.]/g,'');
        var odds = parseFloat(oddsRaw);
        var res = (qs('#_qlRes', mask).value||'V').trim();

        if(!isFinite(stake) || stake<=0){ toast('금액을 입력하세요'); return; }
        if(!isFinite(odds) || odds<=1) odds = 0;

        var arr = readLS('88st_betlog_v1', []);
        if(!Array.isArray(arr)) arr = [];

        var rec = {
          ts: Date.now(),
          date: day,
          stake: stake,
          odds: odds,
          res: (res==='W'||res==='L')?res:'V',
          sport: (catv==='sports'?'SPORT':(catv==='casino'?'CASINO':(catv==='slot'?'SLOT':'MINI'))),
          market: memo || '빠른 기록',
          cat: catv
        };
        arr.push(rec);
        writeLS('88st_betlog_v1', arr);

        // record usage
        try{ if(window.__88st_recent && window.__88st_recent.record) window.__88st_recent.record('/analysis/', '스포츠 분석기', {cat:'analysis', type:'tool'}); }catch(e){}

        toast('저장 완료');
        mask.classList.remove('show');

        // broadcast
        try{ window.dispatchEvent(new Event('storage')); }catch(e){}
      });

      var openBtn = qs('#_qlOpen', mask);
      if(openBtn) openBtn.addEventListener('click', function(){
        mask.classList.remove('show');
        window.location.href = '/analysis/';
      });
    }

    try{
      window.__88st_home = window.__88st_home || {};
      window.__88st_home.openQuickLog = open;
    }catch(e){}
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, function(m){
      return m==='&'?'&amp;': m==='<'?'&lt;': m==='>'?'&gt;': m==='"'?'&quot;':'&#39;';
    });
  }
  function escapeAttr(s){
    return escapeHtml(s).replace(/\n/g,' ');
  }

  function boot(cfg){
    if(!isHome()) return;

    // ensure CSS loaded only once (for pages that don't use build.loader)
    try{
      var href = '/assets/css/home.enhance.v154.css';
      var exists = qsa('link[rel="stylesheet"]').some(function(l){ return (l.getAttribute('href')||'').indexOf(href)>=0; });
      if(!exists){
        var l = document.createElement('link');
        l.rel='stylesheet';
        l.href=withVer(href);
        (document.head||document.body).appendChild(l);
      }
    }catch(e){}

    fetchJSON('/assets/config/cert.landing.json').then(function(certCfg){
      try{ buildActionBar(cfg, certCfg); }catch(e){}
      try{ enhancePromoCards(cfg, certCfg); }catch(e){}
    }).catch(function(){
      // no cert config
    });

    try{ renderRecentUsed(cfg); }catch(e){}
    try{ injectTodayStatus(cfg); }catch(e){}
    try{ bindQuickLog(cfg); }catch(e){}
  }

  function start(){
    if(!isHome()) return;
    if(typeof window.__88st_ready === 'function'){
      window.__88st_ready(function(cfg){ boot(cfg||{}); });
    }else{
      // fallback without cfg
      boot({features:{homeActionBar:true, homeCertCards:true, homeMirrorHelper:true, homeRecentUsed:true, homeTodayStatus:true, homeQuickLog:true}, links:{telegram:''}});
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
