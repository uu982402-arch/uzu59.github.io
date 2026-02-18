/* tool-margin/index.html inline#1 */
function num(v){ const x=parseFloat(v); return (isFinite(x) && x>1e-9) ? x : NaN; }
function pct(x){ return (x*100).toFixed(2) + "%"; }
function fmt(x){ return isFinite(x) ? x.toFixed(3) : "-"; }

function calc(){
  const mode = document.getElementById("mode").value;
  const o1=num(document.getElementById("o1").value);
  const o2=num(document.getElementById("o2").value);
  const o3=num(document.getElementById("o3").value);

  const odds = (mode==="2") ? [o1,o2] : [o1,o2,o3];
  if(odds.some(x=>!isFinite(x) || x<=1)) { alert("배당을 올바르게 입력해 주세요 (1.01 이상)."); return; }

  const imps = odds.map(o=>1/o);
  const sum = imps.reduce((a,b)=>a+b,0);
  const over = sum - 1;

  const fairP = imps.map(p=>p/sum);
  const fairO = fairP.map(p=>1/p);

  document.getElementById("sumImp").textContent = pct(sum);
  document.getElementById("margin").textContent = (over>=0? "+" : "") + pct(over);

  document.getElementById("fairProb").textContent = fairP.map(p=>pct(p)).join(" · ");
  document.getElementById("fairOdds").textContent = fairO.map(o=>fmt(o)).join(" · ");

  document.getElementById("explain").textContent =
    "암시확률 합이 100%를 넘는 만큼(오버라운드)이 북메이커 마진입니다. 동일한 추정 실력이라면 마진이 낮은 시장이 장기적으로 유리합니다.";
}

function sync(){
  const mode = document.getElementById("mode").value;
  document.getElementById("o3wrap").style.display = (mode==="2") ? "none" : "flex";
}

document.getElementById("mode").addEventListener("change", ()=>{ sync(); calc(); });
document.getElementById("calcBtn").addEventListener("click", calc);
document.getElementById("resetBtn").addEventListener("click", ()=>{
  document.getElementById("mode").value="3";
  document.getElementById("o1").value="1.85";
  document.getElementById("o2").value="3.40";
  document.getElementById("o3").value="4.20";
  sync(); calc();
});
["o1","o2","o3"].forEach(id=> document.getElementById(id).addEventListener("input", ()=> calc()));
sync(); calc();
