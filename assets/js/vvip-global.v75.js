/* v75 global: footer CTA dock + minor UX glue */
(function(){
  const TG_URL = "https://t.me/UZU59";
  const links = [
    {t:"인증사이트", href:"/cert/"},
    {t:"스포츠 분석기", href:"/analysis/"},
    {t:"카지노 분석기", href:"/tool-casino/"},
    {t:"슬롯 분석기", href:"/tool-slot/"},
    {t:"미니게임 분석기", href:"/tool-minigame/"},
    {t:"BET365 가상게임", href:"/tool-virtual/"},
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

  function injectDock(){
    if(document.getElementById("vvipCtaDock")) return;

    const dock = el("div",{class:"vvip-cta-dock",id:"vvipCtaDock"});
    const aCert = el("a",{class:"vvip-cta-btn primary",href:"/cert/"},"🛡️ 인증사이트");
    const btnTools = el("button",{class:"vvip-cta-btn",type:"button",id:"vvipToolsBtn"},"🧰 분석기");
    const aTg = el("a",{class:"vvip-cta-btn",href:TG_URL,target:"_blank",rel:"noopener"},"💬 텔레그램 문의");

    dock.appendChild(aCert);
    dock.appendChild(btnTools);
    dock.appendChild(aTg);

    const backdrop = el("div",{class:"vvip-tools-backdrop",id:"vvipToolsBackdrop"});
    backdrop.style.display="none";

    const sheet = el("div",{class:"vvip-tools-sheet",id:"vvipToolsSheet"});
    sheet.style.display="none";

    const title = el("div",{class:"vvip-tools-title"},"빠른 바로가기");
    const sub = el("div",{class:"vvip-tools-sub"},"초보는 요약, 숙련자는 PRO(접기)로 깊게 확인하세요.");
    const grid = el("div",{class:"vvip-tools-grid"});

    const toolLinks = links.slice(1); // analyzers
    for(const L of toolLinks){
      const a = el("a",{href:L.href}, `<span>${L.t}</span><span style="opacity:.7">→</span>`);
      grid.appendChild(a);
    }
    sheet.appendChild(title);
    sheet.appendChild(sub);
    sheet.appendChild(grid);

    function openSheet(){
      sheet.style.display="block";
      backdrop.style.display="block";
      document.body.style.overflow="hidden";
    }
    function closeSheet(){
      sheet.style.display="none";
      backdrop.style.display="none";
      document.body.style.overflow="";
    }
    btnTools.addEventListener("click", ()=>{
      if(sheet.style.display==="none") openSheet();
      else closeSheet();
    });
    backdrop.addEventListener("click", closeSheet);
    document.addEventListener("keydown", (e)=>{
      if(e.key==="Escape") closeSheet();
    });

    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);
    document.body.appendChild(dock);

    // if page already has fixed bottom action dock, add a bit more padding
    if(document.querySelector(".actionDock")){
      document.body.style.paddingBottom = "132px";
    }
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

  function ready(fn){
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(()=>{
    injectDock();
    // give shell a moment if it is injected async
    setTimeout(()=>{ normalizeAccordions(); }, 250);
  });
})();
