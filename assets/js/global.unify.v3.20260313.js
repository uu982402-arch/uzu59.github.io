
(function(){
  'use strict';
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn();}
  function qsa(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel));}
  function txt(el){return ((el&&el.textContent)||'').replace(/\s+/g,' ').trim();}
  function kill(node){ if(node && node.remove) node.remove(); }
  function stripIfMatch(selector,re){ qsa(selector).forEach(function(el){ if(re.test(txt(el))) kill(el); }); }
  function pruneLogbook(){
    try{
      qsa('a[href="/analysis/"]').forEach(function(a){
        if(location.pathname.indexOf('/analysis/')===0) return;
        var card=a.closest('.hub-card, .qs-card, .dash-card, .st-shell-row, .hdrMenu, .hdrMobileMenu, .hdrNavDesktop, .pro-inline, .pro-opts-body, .st-acc-body, .st-shell-acc-body, .tool-card, .homeCard');
        if(card && !/^(A|DIV|DETAILS|NAV)$/i.test(card.tagName)) kill(card); else kill(a);
      });
      stripIfMatch('.st-shell-chip, .st-shell-row, .st-shell-link, .st-shell-sec-title, .st-shell-tab, .homeEnhanceSection .badge, .homeEnhanceSection .pill, #proHero .pro-note, #analysisUpgradeLead .pro-badge, .sum-line, .sum-sub', /로그북|루틴|세이프티 락|세이프티/);
    }catch(_){ }
  }
  function pruneSafety(){
    try{ ['__88st_session_safety_v1','88st_betlog_v1'].forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){}; }); }catch(_){ }
    try{ qsa('[id*="_hs"], #homeTodayStatus, #_habQuick, #_qlSave, #_qlOpen, #_sxRoot, #_sxBar, #_sxFab').forEach(kill); }catch(_){ }
    try{ stripIfMatch('#homeTodayStatus, .homeEnhanceSection, #proHero .pro-note, #analysisUpgradeLead .pro-note, .st-shell-row, .st-shell-chip, .st-shell-link', /세이프티 락|세이프티|오늘의 루틴|주의 패턴|주패턴/); }catch(_){ }
  }
  function bindDetails(){
    try{qsa('.hdrNavDesktop details.hdrDD, .hdrMobileGroup details, .st-shell-dd details, .st-shell-acc details, details.hdrDD').forEach(function(node){if(node.__stBound)return;node.__stBound=1;node.addEventListener('toggle',function(){if(!node.open)return;var parent=node.parentElement||document;qsa('details',parent).forEach(function(other){if(other!==node&&other.open)other.open=false;});});});}catch(_){ }
  }
  function cleanupAnalysis(){
    if(!/\/analysis\/?$/.test(location.pathname)) return;
    try{ qsa('.lb-modal, #lbToast').forEach(kill); }catch(_){ }
    try{ qsa('#btnLogSave, #btnLogbook, #logSummaryBox, #recentLogs, [data-role="logbook"], [data-logbook]').forEach(kill); }catch(_){ }
  }
  function hardenLinks(){
    try{qsa('a[target="_blank"]').forEach(function(a){var rel=(a.getAttribute('rel')||'').trim();if(rel.indexOf('noopener')===-1)a.setAttribute('rel',(rel?rel+' ':'')+'noopener noreferrer');});}catch(_){ }
  }
  function bindGlobalClose(){
    try{document.addEventListener('click',function(ev){var t=ev.target;if(!t||!t.closest)return;var link=t.closest('.hdrMenu a, .hdrMobileMenu a');if(link){qsa('.hdrNavMobile details, .hdrMobileGroup details, .hdrDD').forEach(function(d){d.open=false;});}var hit=t.closest('[data-close="1"], .popup-close, .evtPop__close, .evtPop__mute, .ad-close');if(!hit)return;qsa('.lb-modal.open, .popup.show, .evtPop.is-on, .stx-modal.open').forEach(function(m){m.classList.remove('open');m.classList.remove('show');m.classList.remove('is-on');m.setAttribute('aria-hidden','true');});document.body.classList.remove('modal-open');},true);}catch(_){ }
  }
  ready(function(){
    try{document.body.classList.add('renewal-ui');}catch(_){ }
    bindDetails();
    pruneLogbook();
    pruneSafety();
    cleanupAnalysis();
    hardenLinks();
    bindGlobalClose();
    try{var mo=new MutationObserver(function(){ pruneLogbook(); pruneSafety(); cleanupAnalysis(); }); mo.observe(document.documentElement,{childList:true,subtree:true}); }catch(_){ }
  });
})();
