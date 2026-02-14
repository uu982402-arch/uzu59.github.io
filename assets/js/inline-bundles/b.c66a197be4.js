/* tool/kelly/index.html inline#1 */
function fmtPct(x){ return (x*100).toFixed(2)+"%"; }
function calcKelly(){
  const odds = parseFloat(document.getElementById('odds').value);
  const p = parseFloat(document.getElementById('prob').value)/100;
  const frac = parseFloat(document.getElementById('frac').value);
  const capPct = parseFloat(document.getElementById('cap').value);

  if(!(odds>1.0) || !(p>0 && p<1)){
    document.getElementById('kFull').textContent='—';
    document.getElementById('kAdj').textContent='—';
    document.getElementById('kFinal').textContent='—';
    document.getElementById('judgement').textContent='입력값 확인';
    return;
  }
  const b = odds-1;
  const q = 1-p;
  let f = (b*p - q)/b;
  if(!isFinite(f)) f = 0;
  const fFull = Math.max(0, f);
  const fAdj = Math.max(0, fFull*frac);
  let cap = (isFinite(capPct) && capPct>=0 && capPct<=100) ? (capPct/100) : 1;
  const fFinal = Math.min(fAdj, cap);

  document.getElementById('kFull').textContent = fmtPct(fFull);
  document.getElementById('kAdj').textContent  = fmtPct(fAdj);
  document.getElementById('kFinal').textContent = fmtPct(fFinal);

  const ev = p*(odds-1) - (1-p);
  const j = fFull<=0 ? '비중 0% (EV 음수 가능)' : (ev>0 ? '+EV 가능 · 변동성 주의' : 'EV 애매 · 보수 권장');
  document.getElementById('judgement').textContent = j;

  try{ if(typeof track==='function') track('kelly_calc',{odds:odds, prob:p, frac:frac, cap:capPct}); }catch(e){}
}

const calcBtn = document.getElementById('calcBtn');
calcBtn.addEventListener('click', calcKelly);
document.getElementById('resetBtn').addEventListener('click', ()=>{
  document.getElementById('odds').value='1.95';
  document.getElementById('prob').value='55';
  document.getElementById('frac').value='0.25';
  document.getElementById('cap').value='10';
  calcKelly();
});
['odds','prob','frac','cap'].forEach(id=> document.getElementById(id).addEventListener('input', calcKelly));
calcKelly();
