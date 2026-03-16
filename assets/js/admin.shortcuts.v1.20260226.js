/* v158: admin shortcuts (no nav exposure)
 * - Ctrl+Shift+O : open /ops/
 * - Ctrl+Shift+K : open /seo/ (keyword generator)
 * - Click logo 7 times quickly : open /ops/
 */
(function(){
  "use strict";
  function openSafe(url){
    try { window.location.href = url; } catch(e){}
  }
  // Keyboard shortcuts
  window.addEventListener("keydown", function(e){
    if(!(e && e.ctrlKey && e.shiftKey)) return;
    var k = (e.key || "").toLowerCase();
    if(k === "o"){
      e.preventDefault(); openSafe("/ops/"); return;
    }
    if(k === "k"){
      e.preventDefault(); openSafe("/seo/"); return;
    }
  }, {passive:false});

  // Logo multi-click
  var clicks = 0;
  var lastTs = 0;
  function hit(){
    var now = Date.now();
    if(now - lastTs > 900) clicks = 0;
    lastTs = now;
    clicks++;
    if(clicks >= 7){
      clicks = 0;
      openSafe("/ops/");
    }
  }
  function bind(){
    var el = document.querySelector(".hdrBrand") ||
             document.querySelector(".hdrLogo") ||
             document.querySelector("a[href='/']");
    if(!el) return;
    el.addEventListener("click", function(ev){
      // Don't break normal nav; only count
      hit();
    }, {passive:true});
  }
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
