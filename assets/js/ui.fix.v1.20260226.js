/* ui.fix.v1.20260226.js
 * Global interaction fixes (zero-dependency)
 * - Make scamPopup "확인" always closable even if page-local JS fails.
 * - Add small /analysis win-prob hint (market-implied, not a guarantee).
 */
(function(){
  'use strict';

  function today(){
    try{ return (new Date()).toISOString().slice(0,10); }catch(e){ return ''; }
  }

  function ensureCloseScam(){
    if (typeof window.closeScam === 'function') return;
    window.closeScam = function(){
      try{ localStorage.setItem('scam_popup_date', today()); }catch(e){}
      var el = document.getElementById('scamPopup');
      if(el) el.style.display = 'none';
    };
  }

  function bindScamPopup(){
    try{
      ensureCloseScam();
      var pop = document.getElementById('scamPopup');
      if(!pop) return;
      var btn = pop.querySelector('.scam-box .btn, .scam-box button');
      if(btn && !btn.__boundClose){
        btn.__boundClose = true;
        btn.addEventListener('click', function(ev){
          try{ ev.preventDefault(); ev.stopPropagation(); }catch(e){}
          try{ window.closeScam(); }catch(e){}
        }, true);
      }
      // Escape to close (only if visible)
      if(!document.__boundScamEsc){
        document.__boundScamEsc = true;
        document.addEventListener('keydown', function(ev){
          try{
            if(ev && (ev.key === 'Escape' || ev.key === 'Esc')){
              var p = document.getElementById('scamPopup');
              if(p && (p.style.display === 'flex' || p.style.display === 'block')){
                window.closeScam();
              }
            }
          }catch(e){}
        }, true);
      }
    }catch(e){}
  }

  // --- /analysis: market-implied win probability hint ---
  function analysisWinHint(){
    try{
      var path = (location && location.pathname) ? String(location.pathname) : '/';
      if(path.indexOf('/analysis') !== 0) return;

      function num(v){
        var s = String(v==null?'':v).replace(/,/g,'').trim();
        if(!s) return NaN;
        var x = Number(s);
        return Number.isFinite(x) ? x : NaN;
      }
      function pct01(p){
        return (p*100).toFixed(1) + '%';
      }
      function clamp(x,a,b){
        x = Number(x);
        if(!Number.isFinite(x)) return a;
        return Math.max(a, Math.min(b, x));
      }

      function compute2(a,b){
        var ia = 1/a, ib = 1/b;
        var s = ia+ib;
        if(!(s>0)) return null;
        return {
          sum:s,
          margin:s-1,
          pA:ia/s,
          pB:ib/s
        };
      }
      function compute3(h,d,a){
        var ih=1/h, id=1/d, ia=1/a;
        var s = ih+id+ia;
        if(!(s>0)) return null;
        return {
          sum:s,
          margin:s-1,
          pH:ih/s,
          pD:id/s,
          pA:ia/s
        };
      }

      function ensureBox(target){
        var box = document.getElementById('stWinHint');
        if(box) return box;
        box = document.createElement('div');
        box.id = 'stWinHint';
        box.className = 'pro-card';
        box.style.marginTop = '12px';
        box.innerHTML = ''+
          '<div style="font-weight:950; font-size:13px; margin-bottom:8px;">확률 기반 승리 예상 <span style="opacity:.75;font-weight:800;">(시장 기준 · 참고용)</span></div>'+
          '<div id="stWinHintLine" style="font-size:13px; line-height:1.45; opacity:.92;">배당을 입력하면 공정확률(마진 제거) 기준으로 우세 쪽과 확률을 표시합니다.</div>'+
          '<div id="stWinHintMeta" style="margin-top:8px; font-size:12px; opacity:.75;">※ 독립 시행/변수(라인업/결장/뉴스)에 따라 달라질 수 있습니다.</div>';
        if(target && target.parentNode){
          target.insertAdjacentElement('afterbegin', box);
        }else{
          (document.querySelector('main') || document.body).insertAdjacentElement('afterbegin', box);
        }
        return box;
      }

      function update(){
        var box = ensureBox(document.getElementById('result') || document.querySelector('.app-right') || document.querySelector('main'));
        var line = document.getElementById('stWinHintLine');
        var meta = document.getElementById('stWinHintMeta');
        if(!(box && line && meta)) return;

        // Try 3-way first
        var h = document.getElementById('main3OddsH');
        var d = document.getElementById('main3OddsD');
        var a = document.getElementById('main3OddsA');
        var A2 = document.getElementById('main2OddsA');
        var B2 = document.getElementById('main2OddsB');

        var out = null;
        if(h && d && a && (String(h.value||'').trim()||String(d.value||'').trim()||String(a.value||'').trim())){
          var oh = num(h.value), od = num(d.value), oa = num(a.value);
          if(oh>1 && od>1 && oa>1){
            var r = compute3(oh,od,oa);
            if(r){
              var arr = [
                {k:'홈', p:r.pH},
                {k:'무', p:r.pD},
                {k:'원정', p:r.pA}
              ].sort(function(x,y){return y.p-x.p;});
              var best = arr[0];
              var edge = (arr[0].p - arr[1].p);
              var conf = Math.round(clamp((edge*220) + 40 - (r.margin*200), 10, 90));
              out = {
                mode:'3way',
                best: best.k,
                p: best.p,
                margin: r.margin,
                conf: conf
              };
            }
          }
        }else if(A2 && B2 && (String(A2.value||'').trim()||String(B2.value||'').trim())){
          var oa2 = num(A2.value), ob2 = num(B2.value);
          if(oa2>1 && ob2>1){
            var r2 = compute2(oa2,ob2);
            if(r2){
              var arr2 = [
                {k:'A', p:r2.pA},
                {k:'B', p:r2.pB}
              ].sort(function(x,y){return y.p-x.p;});
              var best2 = arr2[0];
              var edge2 = (arr2[0].p - arr2[1].p);
              var conf2 = Math.round(clamp((edge2*260) + 38 - (r2.margin*220), 10, 90));
              out = {
                mode:'2way',
                best: best2.k,
                p: best2.p,
                margin: r2.margin,
                conf: conf2
              };
            }
          }
        }

        if(!out){
          line.textContent = '배당을 입력하면 공정확률(마진 제거) 기준으로 우세 쪽과 확률을 표시합니다.';
          meta.textContent = '※ 독립 시행/변수(라인업/결장/뉴스)에 따라 달라질 수 있습니다.';
          return;
        }

        line.innerHTML = '<b>'+ out.best + '</b> 우세 · 공정확률 <b>'+ pct01(out.p) + '</b> · 신뢰도 <b>'+ out.conf + '/100</b>';
        meta.textContent = '마진 ' + (out.margin*100).toFixed(2) + '% (Σ-1) · 수치 기반 참고용';
      }

      // Wait for analysis DOM to be built
      var tries = 0;
      var iv = setInterval(function(){
        tries++;
        try{ update(); }catch(e){}
        var ok = document.getElementById('main2OddsA') || document.getElementById('main3OddsH');
        if(ok){
          // Bind listeners once
          if(!document.__boundWinHint){
            document.__boundWinHint = true;
            ['main2OddsA','main2OddsB','main3OddsH','main3OddsD','main3OddsA'].forEach(function(id){
              var el = document.getElementById(id);
              if(el) el.addEventListener('input', function(){ try{ update(); }catch(e){} }, {passive:true});
            });
          }
        }
        if(tries > 40){ clearInterval(iv); }
      }, 250);

    }catch(e){}
  }

  function boot(){
    bindScamPopup();
    analysisWinHint();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }
})();
