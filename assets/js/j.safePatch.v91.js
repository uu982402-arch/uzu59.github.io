(()=> {
  const TELE = "https://t.me/UZU59";
  const onReady = (fn) => (document.readyState === "loading")
    ? document.addEventListener("DOMContentLoaded", fn, { once:true })
    : fn();

  function ensureInquiryNextToGuide(header){
    const nav = header.querySelector("nav.st-shell-nav");
    if(!nav) return;

    // remove blue CTA 문의 in actions (right button)
    header.querySelectorAll(".st-shell-actions a").forEach(a=>{
      if((a.textContent||"").trim()==="문의") a.remove();
    });

    // remove existing nav 문의 duplicates
    nav.querySelectorAll("a.st-shell-link").forEach(a=>{
      if((a.textContent||"").trim()==="문의") a.remove();
    });

    // insert after guide dropdown block
    const guideBtn = Array.from(nav.querySelectorAll("button, a")).find(el => (el.textContent||"").trim()==="가이드");
    if(guideBtn){
      const guideWrap = guideBtn.closest(".st-shell-dd") || guideBtn.parentElement;
      const a = document.createElement("a");
      a.className = "st-shell-link";
      a.href = TELE;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "문의";
      guideWrap?.insertAdjacentElement("afterend", a);
    } else {
      // fallback append at end
      const a = document.createElement("a");
      a.className="st-shell-link";
      a.href=TELE; a.target="_blank"; a.rel="noopener";
      a.textContent="문의";
      nav.appendChild(a);
    }
  }

  function removeCalcHomeFromDropdown(header){
    // remove '계산기 홈' link anywhere inside mega menus
    header.querySelectorAll('a[href="/calc/"]').forEach(a=>{
      const t=(a.textContent||"").replace(/\s+/g," ").trim();
      if(t.includes("계산기 홈")) a.remove();
    });
  }

  function fixHeroText(){
    // enforce 88ST.Cloud text in hero typing area
    const el = document.getElementById("searchTyping");
    if(el) el.textContent = "88ST.Cloud";
    // remove hint line if exists
    document.querySelectorAll(".searchHint").forEach(n=>n.remove());
  }

  function runPatch(){
    const header = document.getElementById("_88stShellHeader");
    if(!header) return false;
    ensureInquiryNextToGuide(header);
    removeCalcHomeFromDropdown(header);
    fixHeroText();
    return true;
  }

  onReady(()=> {
    if(runPatch()) return;
    // observe until shell injects header
    const obs = new MutationObserver(()=> {
      if(runPatch()) obs.disconnect();
    });
    obs.observe(document.documentElement, { childList:true, subtree:true });
    setTimeout(()=> obs.disconnect(), 12000);
  });
})();
