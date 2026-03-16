/* OPS: site.runtime.json editor (v153)
   - Generates deploy JSON + local override preview
   - Adds: preset bar + logbook category report
*/
(function(){
  'use strict';
  function $(id){ return document.getElementById(id); }
  function toast(msg, isErr){
    var el = $('opsSiteMsg');
    if(!el) return;
    el.textContent = msg || '';
    el.classList.toggle('opsErr', !!isErr);
    if(msg) setTimeout(function(){ try{ el.textContent=''; }catch(e){} }, 2800);
  }

  function safeJSON(t){ try{ return JSON.parse(t); }catch(e){ return null; } }

  function buildJSON(){
    var presetDefault = String(($('sitePresetDefault') && $('sitePresetDefault').value) || 'balanced').trim();
    if(['safe','balanced','aggressive'].indexOf(presetDefault)<0) presetDefault = 'balanced';

    var cfg = {
      version: 'v153',
      brand: { name: '88ST.Cloud', mark: '88', themeColor: '#0b0c10' },
      links: {
        home: '/',
        cert: '/cert/',
        telegram: String(($('siteTelegram') && $('siteTelegram').value) || 'https://t.me/UZU59').trim()
      },
      features: {
        shareCard: !!($('siteShareCard') && $('siteShareCard').checked),        certCrossPromo: !!($('siteCertPromo') && $('siteCertPromo').checked),
        guideCourses: !!($('siteGuideCourses') && $('siteGuideCourses').checked),
        proSuite: !!($('siteProSuite') && $('siteProSuite').checked),
        presetBar: !!($('sitePresetBar') && $('sitePresetBar').checked),      },
      presets: {
        default: presetDefault
      },
      risk: {
        lockEnabledDefault: !!($('siteLockDefault') && $('siteLockDefault').checked),
        stopLossPct: Number(($('siteStopLoss') && $('siteStopLoss').value) || 3),
        takeProfitPct: Number(($('siteTakeProfit') && $('siteTakeProfit').value) || 5),
        cooldownMin: Number(($('siteCooldown') && $('siteCooldown').value) || 15)
      },
      promo: {
        cert: {
          enabled: true,
          label: '인증사이트',
          cta: '원클릭 복사+이동',
          hideAfterHours: Number(($('sitePromoHide') && $('sitePromoHide').value) || 24)
        }
      },
      ops: { smokeMax: 60 }
    };

    // sanitize
    if(!isFinite(cfg.risk.stopLossPct) || cfg.risk.stopLossPct<=0) cfg.risk.stopLossPct = 3;
    if(!isFinite(cfg.risk.takeProfitPct) || cfg.risk.takeProfitPct<=0) cfg.risk.takeProfitPct = 5;
    if(!isFinite(cfg.risk.cooldownMin) || cfg.risk.cooldownMin<0) cfg.risk.cooldownMin = 15;
    if(!isFinite(cfg.promo.cert.hideAfterHours) || cfg.promo.cert.hideAfterHours<0) cfg.promo.cert.hideAfterHours = 24;

    return cfg;
  }

  async function loadDeploy(){
    try{
      const r = await fetch('/assets/config/site.runtime.json?v=' + encodeURIComponent(window.__BUILD_VER||'0'), {cache:'no-store'});
      if(!r.ok) throw new Error('fetch failed');
      const j = await r.json();
      applyToForm(j||{});
      $('opsSiteJson').value = JSON.stringify(j||{}, null, 2);
      toast('배포 설정 불러옴');
    }catch(e){
      toast('불러오기 실패', true);
    }
  }

  function applyToForm(j){
    try{
      if($('siteTelegram')) $('siteTelegram').value = (j.links && j.links.telegram) ? j.links.telegram : 'https://t.me/UZU59';
      if($('siteShareCard')) $('siteShareCard').checked = !!(j.features && j.features.shareCard);      if($('siteCertPromo')) $('siteCertPromo').checked = !!(j.features && j.features.certCrossPromo);
      if($('siteGuideCourses')) $('siteGuideCourses').checked = !!(j.features && j.features.guideCourses);
      if($('siteProSuite')) $('siteProSuite').checked = !!(j.features && j.features.proSuite);
      if($('sitePresetBar')) $('sitePresetBar').checked = !!(j.features && j.features.presetBar);
      if($('sitePresetDefault')) {
        var pd = (j.presets && j.presets.default) ? String(j.presets.default) : 'balanced';
        if(['safe','balanced','aggressive'].indexOf(pd)<0) pd = 'balanced';
        $('sitePresetDefault').value = pd;
      }

      if($('siteLockDefault')) $('siteLockDefault').checked = !!(j.risk && j.risk.lockEnabledDefault);
      if($('siteStopLoss')) $('siteStopLoss').value = (j.risk && j.risk.stopLossPct!=null) ? String(j.risk.stopLossPct) : '3';
      if($('siteTakeProfit')) $('siteTakeProfit').value = (j.risk && j.risk.takeProfitPct!=null) ? String(j.risk.takeProfitPct) : '5';
      if($('siteCooldown')) $('siteCooldown').value = (j.risk && j.risk.cooldownMin!=null) ? String(j.risk.cooldownMin) : '15';
      if($('sitePromoHide')) $('sitePromoHide').value = (j.promo && j.promo.cert && j.promo.cert.hideAfterHours!=null) ? String(j.promo.cert.hideAfterHours) : '24';
    }catch(e){}
  }

  function makeJSON(){
    var cfg = buildJSON();
    $('opsSiteJson').value = JSON.stringify(cfg, null, 2);
    toast('JSON 생성 완료');
  }

  async function copyJSON(){
    var t = ($('opsSiteJson') && $('opsSiteJson').value) || '';
    if(!t.trim()) { makeJSON(); t = $('opsSiteJson').value; }
    try{ await navigator.clipboard.writeText(t); toast('JSON 복사됨'); }
    catch(e){ toast('복사 실패', true); }
  }

  function downloadJSON(){
    var t = ($('opsSiteJson') && $('opsSiteJson').value) || '';
    if(!t.trim()) { makeJSON(); t = $('opsSiteJson').value; }
    try{
      var blob = new Blob([t], {type:'application/json'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'site.runtime.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function(){ try{ URL.revokeObjectURL(url); }catch(e){} }, 800);
      toast('다운로드 생성');
    }catch(e){ toast('다운로드 실패', true); }
  }

  function applyLocalOverride(){
    try{
      var txt = ($('opsSiteJson') && $('opsSiteJson').value) || '';
      if(!txt.trim()) makeJSON();
      txt = ($('opsSiteJson') && $('opsSiteJson').value) || '';
      var j = safeJSON(txt);
      if(!j) { toast('JSON 형식 오류', true); return; }
      localStorage.setItem('__88st_cfg_override_v1', JSON.stringify(j));
      toast('로컬 오버라이드 적용됨 (이 브라우저만)');
    }catch(e){ toast('적용 실패', true); }
  }

  function clearLocalOverride(){
    try{ localStorage.removeItem('__88st_cfg_override_v1'); toast('로컬 오버라이드 제거'); }
    catch(e){ toast('제거 실패', true); }
  }

  function bind(){
    if(!$('opsSiteLoad')) return;
    $('opsSiteLoad').addEventListener('click', loadDeploy);
    $('opsSiteMake').addEventListener('click', makeJSON);
    $('opsSiteCopy').addEventListener('click', copyJSON);
    $('opsSiteDownload').addEventListener('click', downloadJSON);
    $('opsSiteApply').addEventListener('click', applyLocalOverride);
    $('opsSiteClear').addEventListener('click', clearLocalOverride);

    // initial defaults
    try{ if($('opsSiteJson') && !$('opsSiteJson').value.trim()) makeJSON(); }catch(e){}
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
