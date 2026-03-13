(function(){
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function text(el){ return ((el && (el.textContent||el.innerText)) || '').replace(/\s+/g,' ').trim(); }
  function findReport(){ return document.querySelector('#analysisEngineMount .ae-sheet, .ae-sheet'); }
  function ensureDock(sheet){
    if(!sheet) return;
    var mount = sheet.parentElement;
    if(!mount) return;
    var actionBoxes = sheet.querySelectorAll('.ae-sheet-actionbox');
    var action = actionBoxes[0] ? text(actionBoxes[0].querySelector('strong')) : '—';
    var pick = actionBoxes[1] ? text(actionBoxes[1].querySelector('strong')) : '—';
    var stake = actionBoxes[2] ? text(actionBoxes[2].querySelector('strong')) : '—';
    var timing = '—';
    var maybe = Array.prototype.slice.call(sheet.querySelectorAll('.ae-box')).find(function(box){ return /State Flow|Timing|Action/i.test(text(box.querySelector('.k'))); });
    if(maybe) timing = text(maybe.querySelector('.v')) || '—';
    var dock = document.getElementById('aeDock');
    if(!dock){
      dock = document.createElement('div');
      dock.id = 'aeDock';
      dock.innerHTML = '<div class="ae-dock-row"><div class="ae-dock-kpis"></div><div class="ae-dock-actions"><button class="ae-dock-btn" type="button" data-act="toggle-details">세부 펼치기</button><button class="ae-dock-btn secondary" type="button" data-act="jump-top">입력으로</button></div></div>';
      mount.insertBefore(dock, sheet);
      dock.addEventListener('click', function(ev){
        var btn = ev.target.closest('button[data-act]');
        if(!btn) return;
        var act = btn.getAttribute('data-act');
        if(act==='toggle-details'){
          var opens = Array.prototype.slice.call(document.querySelectorAll('.ae-deep'));
          var anyClosed = opens.some(function(d){ return !d.open; });
          opens.forEach(function(d){ d.open = anyClosed; });
          btn.textContent = anyClosed ? '세부 접기' : '세부 펼치기';
        } else if(act==='jump-top'){
          var target = document.getElementById('proInput') || document.querySelector('#quickPaste');
          if(target && target.scrollIntoView) target.scrollIntoView({behavior:'smooth', block:'start'});
        }
      });
    }
    var kpis = dock.querySelector('.ae-dock-kpis');
    kpis.innerHTML = '';
    [
      ['행동', action],
      ['탑픽', pick],
      ['비중', stake],
      ['타이밍', timing]
    ].forEach(function(pair){
      var chip = document.createElement('span');
      chip.className='ae-dock-chip';
      chip.innerHTML = '<span>'+pair[0]+'</span><strong>'+pair[1]+'</strong>';
      kpis.appendChild(chip);
    });
  }
  function collapseDeep(){
    var groups = document.querySelectorAll('.ae-deep');
    for(var i=0;i<groups.length;i++) groups[i].open = false;
  }
  function compactCopy(){
    var sheet = findReport();
    if(!sheet) return;
    var sub = sheet.querySelector('.ae-sheet-sub');
    if(sub) sub.textContent = '핵심 판단, 공동시장 적합, 상태별 보정, 강건 비중, 무브 해석을 한 장으로 먼저 확인합니다.';
    var lines = sheet.querySelectorAll('.ae-sheet-lines .ae-item p');
    for(var i=0;i<lines.length;i++){
      var t = text(lines[i])
        .replace(/를 먼저 보고 상세 로직은 아래에서 펼칠 수 있습니다\.?/g,'')
        .replace(/강건 비중 엔진은 /g,'')
        .replace(/를 동시에 반영합니다\.?/g,' 반영')
        .replace(/입니다\.?$/g,'');
      lines[i].textContent = t;
    }
  }
  function hideLegacyBlocks(){
    if(findReport()) document.body.classList.add('analysis-has-report');
    else document.body.classList.remove('analysis-has-report');
  }
  function polish(){
    var sheet = findReport();
    if(!sheet) return;
    compactCopy();
    collapseDeep();
    ensureDock(sheet);
    hideLegacyBlocks();
  }
  ready(function(){
    polish();
    try{
      var mo = new MutationObserver(function(){ polish(); });
      mo.observe(document.body, {childList:true, subtree:true});
    }catch(e){}
  });
})();
