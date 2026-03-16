/* 88ST Recent Usage Tracker v154
 * - Stores last visited tools/cert pages in localStorage
 * - Used by home enhancer to render "최근 사용" section
 */
(function(){
  'use strict';
  var KEY = '__88st_recent_used_v1';
  var MAX = 10;

  function safeJSON(t){ try{ return JSON.parse(t); }catch(e){ return null; } }
  function read(){
    try{ var s=localStorage.getItem(KEY); var j=s?safeJSON(s):null; return Array.isArray(j)?j:[]; }catch(e){ return []; }
  }
  function write(arr){
    try{ localStorage.setItem(KEY, JSON.stringify(arr||[])); }catch(e){}
  }

  function now(){ return Date.now(); }

  function normPath(p){
    p = (p||'/')+'';
    // normalize trailing slash except root
    if(p.length>1 && p.endsWith('/')) return p;
    if(p==='/') return '/';
    return p.endsWith('/') ? p : (p+'/');
  }

  function pickLabel(path){
    var p = path;
    if(p.indexOf('/analysis/')===0) return {label:'스포츠 배당 분석기', cat:'sports', type:'tool'};
    if(p.indexOf('/tool-margin/')===0) return {label:'마진 계산기', cat:'sports', type:'calc'};
    if(p.indexOf('/tool-ev/')===0) return {label:'EV 계산기', cat:'sports', type:'calc'};
    if(p.indexOf('/tool-odds/')===0) return {label:'배당↔확률 변환', cat:'sports', type:'calc'};
    if(p.indexOf('/tool-casino/')===0) return {label:'바카라 전략 계산기', cat:'casino', type:'tool'};
    if(p.indexOf('/tool-slot/')===0) return {label:'슬롯 RTP 분석기', cat:'slot', type:'tool'};
    if(p.indexOf('/tool-minigame/')===0) return {label:'미니게임 분석기', cat:'mini', type:'tool'};
    if(p.indexOf('/tool-virtual/')===0) return {label:'가상게임 분석기', cat:'sports', type:'tool'};
    if(p.indexOf('/logbook/')===0) return {label:'베팅 로그북', cat:'log', type:'log'};
    if(p.indexOf('/cert/')===0) {
      if(p.indexOf('/cert/vegas/')===0) return {label:'VEGAS 인증', cat:'cert', type:'cert'};
      if(p.indexOf('/cert/777/')===0) return {label:'777 Bet 인증', cat:'cert', type:'cert'};
      return {label:'인증사이트', cat:'cert', type:'cert'};
    }
    if(p.indexOf('/bonus-checklist/')===0) return {label:'체크리스트', cat:'guide', type:'guide'};
    if(p.indexOf('/guide/courses/')===0) return {label:'추천 루트', cat:'guide', type:'guide'};
    if(p.indexOf('/guide/')===0) return {label:'가이드', cat:'guide', type:'guide'};
    return null;
  }

  function recordCustom(path, label, meta){
    try{
      var item = { path: normPath(path), label: (label||'').trim() || (document.title||'').trim(), ts: now() };
      if(meta && typeof meta==='object'){
        Object.keys(meta).forEach(function(k){ item[k]=meta[k]; });
      }
      var arr = read();
      // de-dup by path
      arr = arr.filter(function(x){ return x && x.path !== item.path; });
      arr.unshift(item);
      if(arr.length>MAX) arr = arr.slice(0, MAX);
      write(arr);
    }catch(e){}
  }

  function recordAuto(){
    try{
      var p = normPath((window.location && window.location.pathname) || '/');
      // don't record admin
      if(p.indexOf('/ops/')===0) return;
      // don't record plain home
      if(p==='/' || p==='/index.html/') return;
      var info = pickLabel(p);
      if(!info) return;
      recordCustom(p, info.label, {cat:info.cat, type:info.type});
    }catch(e){}
  }

  // expose API
  try{
    window.__88st_recent = window.__88st_recent || {};
    window.__88st_recent.read = read;
    window.__88st_recent.write = write;
    window.__88st_recent.record = recordCustom;
  }catch(e){}

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', recordAuto);
  else recordAuto();
})();
