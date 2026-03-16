/* ui.guard.v1.20260226.js
 * 88ST.Cloud — Interaction hardening
 * - Fix "ghost overlays" that block clicks (stuck backdrop/popup)
 * - Universal close hooks for popups/modals
 * - Accessibility: make div.btn keyboard-activatable
 *
 * Design goal: stability-first. Never throws.
 */
(function(){
  'use strict';

  function onReady(fn){
    try{
      if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once:true });
      else fn();
    }catch(_){}
  }

  function safeQS(sel, root){
    try{ return (root||document).querySelector(sel); }catch(_){ return null; }
  }
  function safeQSA(sel, root){
    try{ return Array.prototype.slice.call((root||document).querySelectorAll(sel) || []); }catch(_){ return []; }
  }

  function makeDivButtonsAccessible(){
    try{
      // Common "button-like" DIVs used across pages
      var list = safeQSA('div.btn, div.opsBtn, div.opsMiniBtn, div.stx-btn, .scam-box .btn');
      for(var i=0;i<list.length;i++){
        var el = list[i];
        if(!el || !el.tagName) continue;
        var tag = String(el.tagName).toLowerCase();
        if(tag === 'a' || tag === 'button' || tag === 'input') continue;
        if(!el.hasAttribute('role')) el.setAttribute('role','button');
        if(!el.hasAttribute('tabindex')) el.setAttribute('tabindex','0');
      }

      if(!document.__UI_GUARD_KEY){
        document.__UI_GUARD_KEY = 1;
        document.addEventListener('keydown', function(ev){
          try{
            if(!ev) return;
            var k = ev.key;
            if(k !== 'Enter' && k !== ' ') return;
            var a = document.activeElement;
            if(!a || !a.tagName) return;
            if(String(a.tagName).toLowerCase() !== 'div') return;
            var isBtn = (a.classList && a.classList.contains('btn')) || (a.getAttribute && a.getAttribute('role') === 'button');
            if(!isBtn) return;
            ev.preventDefault();
            try{ a.click(); }catch(_){}
          }catch(_){}
        }, true);
      }
    }catch(_){}
  }

  function hideNode(node){
    try{
      if(!node) return;
      // "soft hide" to avoid layout break
      node.style.pointerEvents = 'none';
      node.style.display = 'none';
      node.style.visibility = 'hidden';
      try{ node.setAttribute('aria-hidden','true'); }catch(_){}
    }catch(_){}
  }

  function removeNode(node){
    try{
      if(!node) return;
      try{ node.remove(); return; }catch(_){}
      hideNode(node);
    }catch(_){}
  }

  function closeOverlayFromTarget(t){
    try{
      if(!t) return;
      var root = null;
      try{
        root = t.closest ? t.closest('.evtPop, .stx-modal, .popup, .ad-popup, #cardPopup, #adPopup') : null;
      }catch(_){ root = null; }

      if(root){
        // Event popup
        try{
          if(root.classList && root.classList.contains('evtPop')){
            root.classList.remove('is-on');
            removeNode(root);
            return;
          }
        }catch(_){}

        // Tool history modal
        try{
          if(root.classList && root.classList.contains('stx-modal')){
            root.classList.remove('open');
            removeNode(root);
            return;
          }
        }catch(_){}


        // Analysis ad popup
        try{
          if(root.id === 'adPopup' || (root.classList && root.classList.contains('ad-popup'))){
            root.style.display = 'none';
            try{ root.setAttribute('aria-hidden','true'); }catch(_){ }
            return;
          }
        }catch(_){ }

        // Cert popup / generic popup
        try{
          if(root.id === 'cardPopup' || (root.classList && root.classList.contains('popup'))){
            root.classList.remove('open');
            root.style.display = 'none';
            try{ root.setAttribute('aria-hidden','true'); }catch(_){}
            return;
          }
        }catch(_){}
      }
    }catch(_){}
  }

  function bindUniversalClose(){
    try{
      if(document.__UI_GUARD_CLOSE) return;
      document.__UI_GUARD_CLOSE = 1;

      document.addEventListener('click', function(ev){
        try{
          var t = ev && ev.target;
          if(!t || !t.matches) return;

          // Unified close triggers
          var isClose =
            t.matches('[data-close="1"]') ||
            t.matches('.popup-close') ||
            t.matches('#closeBtn') ||
            t.matches('.evtPop__close') ||
            t.matches('.evtPop__mute') ||
            t.matches('.ad-close') ||
            t.matches('[data-ad-close="1"]');

          if(!isClose) return;

          try{ ev.preventDefault(); ev.stopPropagation(); }catch(_){}
          closeOverlayFromTarget(t);
        }catch(_){}
      }, true);

      // Click backdrop to close (common patterns)
      document.addEventListener('click', function(ev){
        try{
          var t = ev && ev.target;
          if(!t) return;
                    if(t.classList && t.classList.contains('ad-popup')){
            // click outside box closes
            if(t === (t.closest ? t.closest('#adPopup, .ad-popup') : t)) closeOverlayFromTarget(t);
          }
if(t.classList && t.classList.contains('stx-modal-backdrop')){
            closeOverlayFromTarget(t);
          }
        }catch(_){}
      }, true);
    }catch(_){}
  }

  function cleanupGhostOverlays(){
    try{
      // 1) Known overlays that should never be interactive when "closed"
      safeQSA('.evtPop:not(.is-on)').forEach(removeNode);
      safeQSA('.stx-modal:not(.open)').forEach(function(n){
        // if it's already display:none then leave; if stuck, hide/remove
        try{
          var cs = getComputedStyle(n);
          if(cs && cs.display !== 'none') hideNode(n);
        }catch(_){}
      });
      safeQSA('.popup[aria-hidden="true"]').forEach(function(n){
        try{
          var cs = getComputedStyle(n);
          if(cs && cs.display !== 'none') hideNode(n);
        }catch(_){}
      });
      // Analysis ad popup
      safeQSA('.ad-popup').forEach(function(n){
        try{
          var cs = getComputedStyle(n);
          if(cs && cs.display === 'none') return;
          // If it's open but no visible box (rare), still allow explicit close
          // If aria-hidden true, hide
          if(n.getAttribute && n.getAttribute('aria-hidden') === 'true') hideNode(n);
        }catch(_){ }
      });


      // 2) Safety net: if a topmost element is an invisible overlay/backdrop, neutralize it
      var w = window.innerWidth || 0;
      var h = window.innerHeight || 0;
      if(w < 40 || h < 40) return;

      var pts = [
        [Math.floor(w/2), Math.floor(h/2)],
        [Math.floor(w/2), Math.min(h-10, 120)],
        [Math.floor(w/2), Math.max(10, h-20)]
      ];

      for(var i=0;i<pts.length;i++){
        var x = pts[i][0], y = pts[i][1];
        var top = null;
        try{ top = document.elementFromPoint ? document.elementFromPoint(x,y) : null; }catch(_){ top = null; }
        if(!top) continue;

        var ov = null;
        try{
          ov = top.closest ? top.closest('.evtPop, .stx-modal, .popup, .ad-popup, .stx-modal-backdrop, #adPopup') : null;
        }catch(_){ ov = null; }

        if(!ov) continue;

        var cs2 = null;
        try{ cs2 = getComputedStyle(ov); }catch(_){ cs2 = null; }
        if(!cs2) continue;

        var op = 1;
        try{ op = parseFloat(cs2.opacity || '1'); }catch(_){ op = 1; }

        // Treat as ghost when effectively invisible or not displayed
        if(cs2.display === 'none' || cs2.visibility === 'hidden' || op < 0.05){
          removeNode(ov);
        }
      }
    }catch(_){}
  }

  function boot(){
    try{
      if(typeof window.closeAdPopup !== 'function'){
        window.closeAdPopup = function(mark){
          try{ var e = document.getElementById('adPopup'); if(e) e.style.display='none'; }catch(_){ }
          if(mark){ try{ localStorage.setItem('88_analysis_adpopup_date', (new Date()).toISOString().slice(0,10)); }catch(__){} }
        };
      }
    }catch(_){ }

    makeDivButtonsAccessible();
    bindUniversalClose();
    cleanupGhostOverlays();

    // Re-check shortly after (fonts/assets may shift overlays)
    try{
      window.setTimeout(makeDivButtonsAccessible, 700);
      window.setTimeout(cleanupGhostOverlays, 700);
      window.addEventListener('pageshow', function(){ try{ cleanupGhostOverlays(); }catch(_){} }, { passive:true });
    }catch(_){}
  }

  onReady(boot);
})();