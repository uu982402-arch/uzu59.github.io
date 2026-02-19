/* tool-odds/index.html inline#1 */
function num(v){ const x=parseFloat(v); return (isFinite(x)) ? x : NaN; }
function pct(x){ return (x*100).toFixed(2) + "%"; }
function fmt(x){ return isFinite(x) ? x.toFixed(3) : "-"; }

function toProb(){
  const o=num(document.getElementById("odds").value);
  if(!isFinite(o) || o<=1){ alert("배당을 올바르게 입력해 주세요 (1.01 이상)."); return; }
  const p = 1/o;
  document.getElementById("probOut").textContent = pct(p);
  document.getElementById("beOut").textContent = pct(p);
}
function toOdds(){
  const p=num(document.getElementById("prob").value)/100;
  if(!isFinite(p) || p<=0 || p>=1){ alert("확률(%)을 1~99 사이로 입력해 주세요."); return; }
  const o = 1/p;
  document.getElementById("oddsOut").textContent = fmt(o);
  document.getElementById("noteOut").textContent = "마진 없는 공정 배당(단순 계산)";
}
document.getElementById("toProbBtn").addEventListener("click", toProb);
document.getElementById("toOddsBtn").addEventListener("click", toOdds);
document.getElementById("toProbReset").addEventListener("click", ()=>{ document.getElementById("odds").value="1.95"; toProb(); });
document.getElementById("toOddsReset").addEventListener("click", ()=>{ document.getElementById("prob").value="52"; toOdds(); });
document.getElementById("odds").addEventListener("input", toProb);
document.getElementById("prob").addEventListener("input", toOdds);
toProb(); toOdds();
