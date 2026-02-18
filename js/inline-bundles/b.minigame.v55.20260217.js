/* tool-minigame/index.html inline#1 */
window.SITE_CONFIG = window.SITE_CONFIG || {};
    window.SITE_CONFIG.GA4_ID = 'G-KWT87FBY6S';

/* tool-minigame/index.html inline#2 */
// mgFallbackReload: if analyzer didn't render tabs (cache/script race), reload analyzer once.
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      try{
        var host = document.getElementById('mgGameTabs');
        if((!window.__MG_INIT_DONE) && host && host.children && host.children.length === 0){
          var s = document.createElement('script');
          s.src = '/assets/js/j.minigame.v55.20260217.js';
          s.defer = true;
          document.body.appendChild(s);
        }
      }catch(e){}
    }, 350);
  });
