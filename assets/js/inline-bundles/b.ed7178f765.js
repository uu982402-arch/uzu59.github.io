/* tool/ev/index.html inline#1 */
function num(v){ const x=parseFloat(v); return (isFinite(x)) ? x : NaN; }
function pct(x){ return (x*100).toFixed(2) + "%"; }
function won(x){ 
  if(!isFinite(x)) return "-";
  const s = (x>=0? "" : "-");
  const n = Math.abs(x);
  return s + Math.round(n).toLocaleString() + "원";
}
function calc(){
  const odds=num(document.getElementById("odds").value);
  const p=num(document.getElementById("p").value)/100;
  const stake=num(document.getElementById("stake").value);
  if(!isFinite(odds) || odds<=1){ alert("배당을 올바르게 입력해 주세요 (1.01 이상)."); return; }
  if(!isFinite(p) || p<=0 || p>=1){ alert("승률(%)을 1~99 사이로 입력해 주세요."); return; }
  if(!isFinite(stake) || stake<=0){ alert("베팅 금액을 입력해 주세요."); return; }

  const be = 1/odds;
  const winProfit = (odds-1)*stake;
  const ev = p*winProfit - (1-p)*stake;
  const evRate = ev / stake;

  document.getElementById("be").textContent = pct(be);
  document.getElementById("evAmt").textContent = won(ev);
  document.getElementById("evPct").textContent = pct(evRate);
  document.getElementById("judge").textContent = (ev>0? "+EV" : (ev<0? "-EV" : "0"));

  document.getElementById("explain").textContent =
    `손익분기점은 ${pct(be)} 입니다. 내 추정 승률이 이보다 높으면 +EV 가능성이 있습니다(장기 평균 관점).`;
}
document.getElementById("calcBtn").addEventListener("click", calc);
document.getElementById("resetBtn").addEventListener("click", ()=>{
  document.getElementById("odds").value="1.90";
  document.getElementById("p").value="55";
  document.getElementById("stake").value="10000";
  calc();
});
["odds","p","stake"].forEach(id=> document.getElementById(id).addEventListener("input", ()=> calc()));
calc();
