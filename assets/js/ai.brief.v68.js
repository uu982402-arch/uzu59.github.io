(()=>{
  const $=(id)=>document.getElementById(id);
  const outRows=$('outRows');
  const brief=$('aiBrief');
  if(!outRows||!brief) return;

  function parsePct(s){
    if(!s) return null;
    const m=String(s).match(/([0-9]+(?:\.[0-9]+)?)/);
    return m?parseFloat(m[1]):null;
  }
  function pickTop(){
    const rows=[...outRows.querySelectorAll('tr')];
    const items=[];
    for(const tr of rows){
      const tds=[...tr.querySelectorAll('td')];
      if(tds.length<3) continue;
      const sel=(tds[0].innerText||'').trim();
      const odds=(tds[1].innerText||'').trim();
      const prob=parsePct(tds[2].innerText);
      if(!sel||prob==null) continue;
      items.push({sel,odds,prob});
    }
    items.sort((a,b)=>b.prob-a.prob);
    return items;
  }

  function computeScore(items){
    // Heuristic: higher separation => higher confidence; very high implied margin should reduce score
    if(!items.length) return {score:0, warn:'—', rec:'—'};
    const p1=items[0].prob/100;
    const p2=(items[1]?.prob||0)/100;
    const sep=Math.max(0, p1-p2);
    // Estimate market "noise" from separation
    let score=55 + Math.round(sep*180);
    if(p1>=0.70) score+=5;
    if(p1<=0.42) score-=8;
    score=Math.max(35, Math.min(90, score));

    let warn='표본/부가정보 없음';
    if(sep<0.05) warn='박빙(변동 가능)';
    else if(sep<0.12) warn='중간 변동성';
    else warn='우세 구간';

    const rec=`최고확률: ${items[0].sel} (${items[0].prob.toFixed(2)}%) · 보조: ${items[1]?.sel||'—'}`;
    return {score, warn, rec};
  }

  function render(){
    try{
      const items=pickTop();
      if(!items.length){ brief.textContent='—'; return; }
      const {score,warn,rec}=computeScore(items);
      brief.textContent=`점수 ${score} · 주의: ${warn} · 추천: ${rec}`;
    }catch(e){ /* ignore */ }
  }

  const mo=new MutationObserver(()=>render());
  mo.observe(outRows,{childList:true,subtree:true,characterData:true});
  render();
})();
