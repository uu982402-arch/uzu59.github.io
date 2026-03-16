(function(){
  'use strict';
  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, {once:true});
    else fn();
  }
  ready(function(){
    try{
      document.querySelectorAll('.hdrNavDesktop details.hdrDD, .hdrMobileGroup details').forEach(function(node){
        if(node.__stBound) return;
        node.__stBound = 1;
        node.addEventListener('toggle', function(){
          if(!node.open) return;
          var parent = node.parentElement || document;
          parent.querySelectorAll('details').forEach(function(other){
            if(other !== node && other.open) other.open = false;
          });
        });
      });
    }catch(_){ }

    try{
      document.addEventListener('click', function(ev){
        var t = ev.target;
        if(!t) return;
        var hit = t.closest ? t.closest('[data-close="1"], .popup-close, .evtPop__close, .evtPop__mute, .ad-close') : null;
        if(!hit) return;
        var lb = hit.closest ? hit.closest('.lb-modal') : null;
        if(lb){
          lb.classList.remove('open');
          lb.setAttribute('aria-hidden','true');
          document.body.classList.remove('modal-open');
        }
      }, true);
    }catch(_){ }

    try{
      document.querySelectorAll('a[target="_blank"]').forEach(function(a){
        var rel = (a.getAttribute('rel') || '').trim();
        if(rel.indexOf('noopener') === -1){
          a.setAttribute('rel', (rel ? rel + ' ' : '') + 'noopener noreferrer');
        }
      });
    }catch(_){ }
  });
})();
