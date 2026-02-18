/* v76 global: shell accordion sync + cleanup legacy bottom CTAs */
(function(){
  const LEGACY_IDS = [
    "vvipCtaDock",
    "vvipToolsBackdrop",
    "vvipToolsSheet",
    "stCertDock",
  ];

  function el(tag, attrs, html){
    const n = document.createElement(tag);
    if(attrs) for(const k in attrs){
      if(k==="class") n.className=attrs[k];
      else if(k==="id") n.id=attrs[k];
      else if(k==="href") n.setAttribute("href", attrs[k]);
      else if(k==="type") n.setAttribute("type", attrs[k]);
      else if(k==="target") n.setAttribute("target", attrs[k]);
      else if(k==="rel") n.setAttribute("rel", attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    if(html!=null) n.innerHTML = html;
    return n;
  }

  function cleanupBottomCtas(){
    try{
      for(const id of LEGACY_IDS){
        const node = document.getElementById(id);
        if(node && node.parentNode) node.parentNode.removeChild(node);
      }
      document.querySelectorAll('.vvip-cta-dock, .vvip-tools-backdrop, .vvip-tools-sheet, .st-certdock')
        .forEach(n=>{ try{ n.remove(); }catch(e){} });

      // Reset any forced padding
      if(document.body && document.body.style && document.body.style.paddingBottom){
        document.body.style.paddingBottom = "";
      }
    }catch(e){}
  }

  function normalizeAccordions(){
    // Only allow one open within calc dropdown (optional)
    const accs = document.querySelectorAll(".st-shell-mega-acc details.st-acc");
    if(!accs || accs.length<2) return;
    accs.forEach(d=>{
      d.addEventListener("toggle", ()=>{
        if(!d.open) return;
        accs.forEach(o=>{ if(o!==d) o.removeAttribute("open"); });
      });
    });
  }


  function hardHideStyle(){
    try{
      if(document.getElementById("vvipNoBottomCtaStyle")) return;
      const s = document.createElement("style");
      s.id = "vvipNoBottomCtaStyle";
      s.textContent = `
        .vvip-cta-dock, .vvip-tools-backdrop, .vvip-tools-sheet, .st-certdock{
          display:none !important;
          visibility:hidden !important;
          pointer-events:none !important;
        }
        body{ padding-bottom: 0 !important; }
      `;
      document.head.appendChild(s);
    }catch(e){}
  }

  function watchBottomCtas(){
    try{
      // Some pages inject late. Observe for a short window and keep removing.
      let ticks = 0;
      const iv = setInterval(()=>{
        cleanupBottomCtas();
        if(++ticks >= 30) clearInterval(iv);
      }, 250);

      const mo = new MutationObserver(()=>{ cleanupBottomCtas(); });
      mo.observe(document.documentElement, {childList:true, subtree:true});
      setTimeout(()=>{ try{ mo.disconnect(); }catch(e){} }, 8000);
    }catch(e){}
  }

  function ready(fn){
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(()=>{
    hardHideStyle();
    cleanupBottomCtas();
    watchBottomCtas();
    // give shell a moment if it is injected async
    setTimeout(()=>{ normalizeAccordions(); }, 250);
  });
})();

;(()=>{try{var s=document.createElement('script');s.defer=true;s.src='/assets/js/j.safePatch.v91.js';document.head.appendChild(s);}catch(e){}})();
