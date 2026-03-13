/* 88ST Site Runtime (v1.20260226)
 * - Loads /assets/config/site.runtime.json (deploy-time config)
 * - Extends header nav without editing every HTML
 * - Provides global helpers: __88st_cfg(), __88st_ready(cb)
 */
(function(){
  'use strict';
  var CFG_URL = '/assets/config/site.runtime.json';

  function safeJSON(t){ try{ return JSON.parse(t); }catch(e){ return null; } }
  function withVer(url){
    try{
      var v = (window.__BUILD_VER||'0')+'';
      return url + (url.indexOf('?')>=0?'&':'?') + 'v=' + encodeURIComponent(v);
    }catch(e){ return url; }
  }

  function merge(a,b){
    if(!b || typeof b!=='object') return a;
    if(!a || typeof a!=='object') a = {};
    Object.keys(b).forEach(function(k){
      var bv = b[k];
      var av = a[k];
      if(bv && typeof bv==='object' && !Array.isArray(bv)) a[k] = merge(av, bv);
      else a[k] = bv;
    });
    return a;
  }

  var _readyQ = [];
  window.__88st_ready = function(cb){
    try{
      if(typeof cb==='function'){
        if(window.__88st_cfg_loaded) cb(window.__88st_cfg||{});
        else _readyQ.push(cb);
      }
    }catch(e){}
  };

  window.__88st_cfg = function(path, fallback){
    try{
      var o = window.__88st_cfg_obj || window.__88st_cfg || {};
      if(!path) return o;
      var seg = (path+'').split('.');
      for(var i=0;i<seg.length;i++){
        if(!o || typeof o!=='object') return fallback;
        o = o[seg[i]];
      }
      return (o==null)? fallback : o;
    }catch(e){ return fallback; }
  };

  function loadCfg(){
    return fetch(withVer(CFG_URL), {cache:'no-store'}).then(function(r){
      if(!r || !r.ok) throw new Error('cfg fetch failed');
      return r.text();
    }).then(function(t){
      var j = safeJSON((t||'').trim());
      if(!j) j = {};
      // Local override (OPS) for quick tests
      try{
        var ov = localStorage.getItem('__88st_cfg_override_v1');
        var ovj = ov ? safeJSON(ov) : null;
        if(ovj) j = merge(j, ovj);
      }catch(e){}
      window.__88st_cfg = window.__88st_cfg; // keep function
      window.__88st_cfg_obj = j;
      window.__88st_cfg_loaded = true;
      for(var i=0;i<_readyQ.length;i++){
        try{ _readyQ[i](j); }catch(e2){}
      }
      _readyQ = [];
      return j;
    }).catch(function(){
      window.__88st_cfg_obj = window.__88st_cfg_obj || {};
      window.__88st_cfg_loaded = true;
      for(var i=0;i<_readyQ.length;i++){
        try{ _readyQ[i](window.__88st_cfg_obj); }catch(e2){}
      }
      _readyQ = [];
      return window.__88st_cfg_obj;
    });
  }

  function addLink(menu, href, text){
    try{
      if(!menu || !href || !text) return;
      var as = menu.querySelectorAll('a');
      for(var i=0;i<as.length;i++){
        if((as[i].getAttribute('href')||'') === href) return;
      }
      var a = document.createElement('a');
      a.href = href;
      a.textContent = text;
      menu.appendChild(a);
    }catch(e){}
  }

  function extendHeader(cfg){
    try{
      var ft = (cfg && cfg.features) ? cfg.features : {};
      // Desktop
      var dd = document.querySelectorAll('.hdrDD');
      dd.forEach(function(d){
        var sum = d.querySelector('summary');
        var label = sum ? (sum.textContent||'').trim() : '';
        var menu = d.querySelector('.hdrMenu');
        if(!menu) return;
        try{ menu.querySelectorAll('a[href="/ops/"]').forEach(function(a){ a.remove(); }); }catch(e){}
        if(label.indexOf('분석기')>=0){
          addLink(menu, '/tool-virtual/', '가상게임 분석기');
        }
        if(label.indexOf('계산기')>=0){
          addLink(menu, '/tool/fair-odds/', '공정배당(Fair Odds)');
          addLink(menu, '/tool/overround/', '오버라운드');
          addLink(menu, '/tool/kelly/', 'Kelly 비중');
        }
        if(label.indexOf('가이드')>=0){
          if(ft.guideCourses!==false) addLink(menu, '/guide/courses/', '추천 루트');        }
      });

      // Mobile
      var mDetails = document.querySelectorAll('.hdrMobileGroup details');
      mDetails.forEach(function(d){
        var sum = d.querySelector('summary');
        var label = sum ? (sum.textContent||'').trim() : '';
        var menu = d.querySelector('.hdrMenu');
        if(!menu) return;
        try{ menu.querySelectorAll('a[href="/ops/"]').forEach(function(a){ a.remove(); }); }catch(e){}
        if(label.indexOf('분석기')>=0){
          addLink(menu, '/tool-virtual/', '가상게임 분석기');
        }
        if(label.indexOf('계산기')>=0){
          addLink(menu, '/tool/fair-odds/', '공정배당(Fair Odds)');
          addLink(menu, '/tool/overround/', '오버라운드');
          addLink(menu, '/tool/kelly/', 'Kelly 비중');
        }
        if(label.indexOf('가이드')>=0){
          if(ft.guideCourses!==false) addLink(menu, '/guide/courses/', '추천 루트');        }
      });
    }catch(e){}
  }

  function boot(){
    loadCfg().then(function(){
      extendHeader(window.__88st_cfg_obj||{});
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
