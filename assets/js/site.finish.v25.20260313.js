(function(){
  function clean(s){return (s||'').replace(/\s+/g,' ').trim();}
  function patchButtons(root){
    var map = [
      [/^분석 시작$/,'바로 분석'],
      [/^분석기 열기$/,'바로 분석'],
      [/^분석기 홈$/,'스포츠 분석기'],
      [/^비교 시작$/,'바로 비교'],
      [/^비교 열기$/,'바로 비교'],
      [/^가이드 홈$/,'가이드'],
      [/^계산기 열기$/,'바로 열기'],
      [/^열기\s*→?$/,'바로 보기'],
      [/^회원가입\(이동\)$/,'바로 이동'],
      [/^문의하기$/,'문의'],
      [/^자세히 보기$/,'자세히'],
      [/^도구 열기$/,'도구 보기']
    ];
    var nodes = root.querySelectorAll('a,button,[role="button"],summary');
    for(var i=0;i<nodes.length;i++){
      var el = nodes[i];
      if(el.dataset && el.dataset.v25done==='1') continue;
      var txt = clean(el.textContent || el.innerText || '');
      if(!txt || txt.length > 26) continue;
      for(var j=0;j<map.length;j++){
        if(map[j][0].test(txt)){
          el.textContent = txt.replace(map[j][0], map[j][1]);
          break;
        }
      }
      if(el.dataset) el.dataset.v25done='1';
    }
  }
  function patchMetaLines(root){
    var targets = root.querySelectorAll('.pro-note,.desc,.sub,[data-role="reco"] li,[data-role="warn"] li');
    for(var i=0;i<targets.length;i++){
      var el = targets[i];
      var txt = clean(el.textContent || '');
      if(!txt) continue;
      txt = txt
        .replace(/공정확률,\s*오버라운드,\s*시장 합의,\s*오즈 무브,\s*스트레스 테스트,\s*Kelly 스테이킹 관점까지 확장 해석하는/,'공정확률·마진·시장합의·무브·비중까지 해석하는')
        .replace(/기존 분석 결과 아래에 /,'')
        .replace(/ 이어집니다\.?$/,'')
        .replace(/배당을 입력하면 자동 분석됩니다\.?$/,'입력 후 즉시 분석됩니다.')
        .replace(/마진이 낮은 라인\/북부터 선택하세요\.?$/,'낮은 마진 시장부터 확인하세요.');
      if(txt.length <= 120) el.textContent = txt;
    }
  }
  function run(){ patchButtons(document); patchMetaLines(document); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  try{
    var mo = new MutationObserver(function(){ run(); });
    mo.observe(document.documentElement, {childList:true, subtree:true});
  }catch(e){}
})();
