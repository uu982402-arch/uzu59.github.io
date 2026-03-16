/* Presets Core (v1.20260226)
 * - Global low-friction preset bar for all tools
 * - Stores profile in localStorage and exposes helpers
 * - Respects /assets/config/site.runtime.json
 */
(function(){
  'use strict';

  var KEY = '__88st_preset_profile_v1';
  var KEY_DISMISS = '__88st_preset_dismiss_v1';

  function cfg(path, fallback){
    try{ return (typeof window.__88st_cfg === 'function') ? window.__88st_cfg(path, fallback) : fallback; }
    catch(e){ return fallback; }
  }

  function getProfile(){
    var def = (cfg('presets.default', 'balanced')+'').trim() || 'balanced';
    try{
      var v = localStorage.getItem(KEY);
      if(v && typeof v==='string') return v;
    }catch(e){}
    return def;
  }

  function setProfile(p){
    p = (p||'balanced')+'';
    if(['safe','balanced','aggressive'].indexOf(p)<0) p='balanced';
    try{ localStorage.setItem(KEY, p); }catch(e){}
    try{ window.__88st_preset_profile = p; }catch(e){}
    return p;
  }

  function profileMeta(p){
    if(p==='safe') return { id:'safe', label:'안전', sub:'낙폭 우선', mul:0.85 };
    if(p==='aggressive') return { id:'aggressive', label:'공격', sub:'변동성 큼', mul:1.20 };
    return { id:'balanced', label:'밸런스', sub:'기본 추천', mul:1.00 };
  }

  function mul(kind){
    // One knob to keep the site consistent.
    // Used by bankroll hints, session safety guidance, and optional tool tuning.
    var p = getProfile();
    var m = profileMeta(p).mul;
    if(kind==='risk'){
      // slightly stronger effect for risk-related output
      if(p==='safe') return 0.80;
      if(p==='aggressive') return 1.25;
      return 1.00;
    }
    return m;
  }

  function toast(msg){
    try{
      var t = document.querySelector('#copyToast');
      if(t){ t.textContent = msg; t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); }, 1400); return; }
    }catch(e){}
    try{
      // fallback minimal toast
      var el = document.createElement('div');
      el.style.position='fixed';
      el.style.left='50%';
      el.style.bottom='20px';
      el.style.transform='translateX(-50%)';
      el.style.zIndex='9999';
      el.style.padding='10px 12px';
      el.style.borderRadius='14px';
      el.style.border='1px solid rgba(255,255,255,.14)';
      el.style.background='rgba(20,20,24,.85)';
      el.style.color='#fff';
      el.style.fontWeight='900';
      el.style.fontSize='13px';
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(function(){ try{ el.remove(); }catch(e){} }, 1200);
    }catch(e){}
  }

  function shouldSkip(){
    try{
      var p = (location && location.pathname) ? (location.pathname+'') : '/';
      if(p.indexOf('/ops')===0) return true;
      if(p.indexOf('/cert')===0) return true;
      if(p.indexOf('/landing')===0) return true;
      if(p.indexOf('/seo')===0) return true;
      if(p.indexOf('/docs')===0) return true;
      return false;
    }catch(e){ return false; }
  }

  function pickMount(){
    // Prefer: tool pages -> first main card / container header
    var sels = [
      '#proWrap',
      '.hub',
      '.pro-wrap',
      '.st-app .hub',
      '.st-app',
      'main'
    ];
    for(var i=0;i<sels.length;i++){
      try{
        var el = document.querySelector(sels[i]);
        if(el) return el;
      }catch(e){}
    }
    return null;
  }

  function insertBar(){
    if(document.querySelector('.psPresetBar')) return;
    if(shouldSkip()) return;

    // feature gate
    var on = cfg('features.presetBar', true);
    if(on === false) return;

    // optional dismissal (user can hide bar)
    try{ if(localStorage.getItem(KEY_DISMISS)==='1') return; }catch(e){}

    var mount = pickMount();
    if(!mount) return;

    var p = getProfile();
    setProfile(p);

    var meta = profileMeta(p);

    var bar = document.createElement('section');
    bar.className = 'psPresetBar';
    bar.setAttribute('data-profile', meta.id);

    bar.innerHTML = [
      '<div class="psPresetTop">',
      '  <div class="psPresetLeft">',
      '    <div class="psPresetRow">',
      '      <span class="psPresetBadge">SETTINGS</span>',
      '      <span class="psPresetTitle">추천 설정</span>',
      '      <span class="psPresetSub" id="_88stPresetNow">현재: <b>'+meta.label+'</b> · '+meta.sub+'</span>',
      '    </div>',
      '    <div class="psPresetSub">선택 부담 없이 “기본 추천”을 적용하고, 원하면 안전/공격 모드로만 바꿀 수 있습니다.</div>',
      '  </div>',
      '  <div class="psPresetActions">',
      '    <button class="psPresetBtn primary" type="button" id="_88stPresetApply">추천 설정 적용</button>',
      '    <button class="psPresetBtn" type="button" id="_88stPresetMore">옵션</button>',
      '    <label class="psPresetToggle"><input type="checkbox" id="_88stPresetHide"/> 숨김</label>',
      '  </div>',
      '</div>',
      '<div class="psPresetPick" id="_88stPresetPick">',
      '  <div class="psPresetChips">',
      '    <button type="button" class="psPresetChip" data-p="safe"><span>안전</span><span class="m">낙폭 우선</span></button>',
      '    <button type="button" class="psPresetChip" data-p="balanced"><span>밸런스</span><span class="m">기본 추천</span></button>',
      '    <button type="button" class="psPresetChip" data-p="aggressive"><span>공격</span><span class="m">변동성 큼</span></button>',
      '  </div>',
      '  <div class="psPresetHint">TIP) 안전 모드는 권장 뱅크롤을 높이고(보수적), 공격 모드는 변동성 경고를 강화합니다.</div>',
      '</div>'
    ].join('');

    // Insert near top of mount
    try{
      var first = mount.firstElementChild;
      if(first) mount.insertBefore(bar, first);
      else mount.appendChild(bar);
    }catch(e){
      try{ document.body.insertBefore(bar, document.body.firstChild); }catch(e2){}
    }

    function setActive(){
      var cur = getProfile();
      var now = document.getElementById('_88stPresetNow');
      var m = profileMeta(cur);
      if(now) now.innerHTML = '현재: <b>'+m.label+'</b> · '+m.sub;
      bar.setAttribute('data-profile', m.id);
      bar.querySelectorAll('.psPresetChip').forEach(function(btn){
        btn.classList.toggle('active', btn.getAttribute('data-p')===cur);
      });
    }

    function applyDefault(){
      setProfile('balanced');
      setActive();
      toast('밸런스(추천) 적용');
      try{ if(window.track) window.track('preset_apply', {profile:'balanced'}); }catch(e){}
      // broadcast
      try{ window.dispatchEvent(new CustomEvent('88st:preset', {detail:{profile:'balanced'}})); }catch(e){}
    }

    function applyProfile(pp){
      pp = setProfile(pp);
      setActive();
      var m = profileMeta(pp);
      toast(m.label+' 모드 적용');
      try{ if(window.track) window.track('preset_apply', {profile:pp}); }catch(e){}
      try{ window.dispatchEvent(new CustomEvent('88st:preset', {detail:{profile:pp}})); }catch(e){}
    }

    var btnApply = document.getElementById('_88stPresetApply');
    if(btnApply) btnApply.addEventListener('click', applyDefault);

    var btnMore = document.getElementById('_88stPresetMore');
    var pick = document.getElementById('_88stPresetPick');
    if(btnMore && pick){
      btnMore.addEventListener('click', function(){
        var open = pick.style.display==='block';
        pick.style.display = open ? 'none' : 'block';
        try{ if(window.track) window.track('preset_more', {open:!open}); }catch(e){}
      });
    }

    bar.querySelectorAll('.psPresetChip').forEach(function(btn){
      btn.addEventListener('click', function(){
        var pp = btn.getAttribute('data-p');
        applyProfile(pp);
      });
    });

    var hide = document.getElementById('_88stPresetHide');
    if(hide) hide.addEventListener('change', function(){
      if(hide.checked){
        try{ localStorage.setItem(KEY_DISMISS, '1'); }catch(e){}
        try{ bar.remove(); }catch(e2){}
        toast('추천 설정 숨김');
      }
    });

    setActive();
  }

  // Public helpers
  try{
    window.__88st_preset_get = getProfile;
    window.__88st_preset_set = setProfile;
    window.__88st_preset_mul = mul;
  }catch(e){}

  function boot(){
    // Wait for runtime config if available
    if(typeof window.__88st_ready==='function'){
      window.__88st_ready(function(){ insertBar(); });
    }else{
      insertBar();
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
