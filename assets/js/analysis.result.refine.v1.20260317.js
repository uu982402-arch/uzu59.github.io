
(function(){
  function tune(){
    var root = document.getElementById('sprtBrief');
    if(root){
      var label = root.querySelector('.vvip-brief-score .lab');
      if(label){
        var t = (label.textContent||'').trim();
        label.classList.remove('is-good','is-warn','is-bad','is-mid');
        if(t === '안정') label.classList.add('is-good');
        else if(t === '양호') label.classList.add('is-mid');
        else if(t === '재확인') label.classList.add('is-warn');
        else if(t === '주의') label.classList.add('is-bad');
      }
      var n = root.querySelector('.vvip-brief-score .n');
      if(n){
        var score = parseFloat((n.textContent||'').replace(/[^0-9.]/g,''));
        n.style.color = isFinite(score) ? (score >= 85 ? '#8ff0d2' : score >= 70 ? '#dfe9ff' : score >= 55 ? '#ffd690' : '#ffb8b8') : '#dfe9ff';
      }
    }
    var note = document.getElementById('noteVol');
    if(note && !note.querySelector('.analysis-note-k')){
      note.innerHTML = '<span class="analysis-note-k" style="display:inline-flex;min-width:56px;height:22px;align-items:center;justify-content:center;border-radius:999px;background:rgba(255,255,255,.08);margin-right:8px;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#fff">NOTE</span>' + note.innerHTML;
    }
  }
  var start = function(){
    tune();
    var target = document.getElementById('proResult');
    if(target){
      var mo = new MutationObserver(function(){ tune(); });
      mo.observe(target, { childList:true, subtree:true, characterData:true });
    }
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
