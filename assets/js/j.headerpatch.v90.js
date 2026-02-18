(()=> {
  const TELE = "https://t.me/UZU59";
  const once = (fn) => { let done=false; return () => { if(done) return; done=true; fn(); }; };
  const run = once(() => {
    const header = document.getElementById("_88stShellHeader");
    if(!header) return;
    // 1) logo unify
    header.querySelectorAll('img[src="/img/logo.png"]').forEach(img => img.src="/img/brand88_masked.png");
    // 2) remove blue CTA 문의 button if exists
    header.querySelectorAll('a.st-shell-btn').forEach(a => {
      if((a.textContent||"").trim()==="문의") a.remove();
    });
    // 3) remove "계산기 홈" entry inside calculator menu
    header.querySelectorAll('a[href="/calc/"]').forEach(a => a.remove());

    // 4) ensure 문의 link next to guide (as plain nav link)
    const nav = header.querySelector(".st-shell-nav");
    if(nav){
      // remove any existing 문의 links we previously added (avoid duplicates)
      nav.querySelectorAll('a.st-shell-link').forEach(a=>{
        if((a.textContent||"").trim()==="문의") a.remove();
      });
      const inquiry = document.createElement("a");
      inquiry.className = "st-shell-link";
      inquiry.href = TELE;
      inquiry.target = "_blank";
      inquiry.rel = "noopener";
      inquiry.textContent = "문의";

      // insert right after the guide dropdown trigger if possible
      const guideBtn = Array.from(nav.querySelectorAll("button.st-shell-link")).find(b => (b.textContent||"").trim()==="가이드");
      if(guideBtn){
        const dd = guideBtn.closest(".st-shell-dd");
        if(dd && dd.nextSibling){
          dd.insertAdjacentElement("afterend", inquiry);
        } else if(dd){
          dd.parentNode.appendChild(inquiry);
        } else {
          nav.appendChild(inquiry);
        }
      } else {
        nav.appendChild(inquiry);
      }
    }
  });

  const tick = () => {
    const header = document.getElementById("_88stShellHeader");
    if(header){ run(); return; }
    requestAnimationFrame(tick);
  };
  tick();
})();
