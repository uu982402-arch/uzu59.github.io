/* tool-slot/index.html inline#1 */
(function(){
  function num(v){
    const x = parseFloat(String(v||'').replace(/,/g,''));
    return (isFinite(x) && x>=0) ? x : NaN;
  }
  function fmtWon(x){
    if(!isFinite(x)) return "-";
    const v = Math.round(x);
    return v.toLocaleString('ko-KR') + "원";
  }
  function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }

  const VOL_MULT = { low:120, mid:220, high:380, vhigh:550 };

  function calc(silent){
    const name = (document.getElementById('slotName').value||'').trim();
    const rtp = num(document.getElementById('rtp').value);
    let rtpPct = rtp;
    // If user enters 0.96 형태면 96%로 자동 해석
    if(isFinite(rtpPct) && rtpPct>0 && rtpPct<=1) rtpPct = rtpPct*100;
    const vol = document.getElementById('vol').value;
    const bet = num(document.getElementById('bet').value);
    const spins = num(document.getElementById('spins').value);

    if(!isFinite(rtpPct) || rtpPct<=0 || rtpPct>100){ if(!silent) alert('RTP(%)를 0~100 사이로 입력해 주세요. (예: 96 또는 0.96)'); return; }
    if(!isFinite(bet) || bet<=0){ if(!silent) alert('스핀당 베팅(원)을 올바르게 입력해 주세요.'); return; }
    if(!isFinite(spins) || spins<=0){ if(!silent) alert('스핀 수를 올바르게 입력해 주세요.'); return; }

    const total = bet * spins;
    const expectedReturn = total * (rtpPct/100);
    const expectedLoss = total - expectedReturn;
    const lossRate = (100 - rtpPct);

    const mult = VOL_MULT[vol] || VOL_MULT.mid;
    const bankroll = bet * mult;
    const stop = bankroll * 0.30;

    document.getElementById('outTotal').textContent = fmtWon(total);
    document.getElementById('outReturn').textContent = fmtWon(expectedReturn);
    document.getElementById('outLoss').textContent = fmtWon(expectedLoss);
    document.getElementById('outLossRate').textContent = lossRate.toFixed(2) + '%';
    document.getElementById('outBankroll').textContent = fmtWon(bankroll);
    document.getElementById('outStop').textContent = fmtWon(stop);

    const volLabel = ({low:'저변동', mid:'중변동', high:'고변동', vhigh:'초고변동'})[vol] || '중변동';
    const namePart = name ? `
· 게임: ${name}` : '';

    const m = clamp(Math.round(mult/10)*10, 100, 700);
    document.getElementById('explain').textContent =
      `요약: ${fmtWon(bet)} × ${spins.toLocaleString('ko-KR')}회 = 총 ${fmtWon(total)}
` +
      `RTP ${rtpPct.toFixed(2)}% 기준, 이론 손실률은 약 ${lossRate.toFixed(2)}% 입니다.
` +
      `${volLabel} 기준 권장 뱅크롤은 “약 ${m}배 베팅단위” 수준으로 표시했습니다. (참고용)` +
      namePart;
  }

  function reset(){
    document.getElementById('slotName').value = '';
    document.getElementById('rtp').value = '96';
    document.getElementById('vol').value = 'mid';
    document.getElementById('bet').value = '1000';
    document.getElementById('spins').value = '300';
    calc(true);
  }

  document.getElementById('calcBtn').addEventListener('click', ()=> calc(false));
  document.getElementById('resetBtn').addEventListener('click', reset);

  ['slotName','rtp','vol','bet','spins'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('input', ()=> calc(true));
    el.addEventListener('change', ()=> calc(true));
  });

  calc(true);
})();
