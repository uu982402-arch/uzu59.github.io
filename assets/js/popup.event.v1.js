/* 88ST.Cloud - Event Popup (static, zero-backend)
 * Shows on selected pages only (script inclusion).
 * Frequency: always show on first visit/revisit (intervalHours=0),
 * with optional "오늘 그만" mute for 24h.
 */
(function(){
  const CFG_URL = '/assets/config/popup.event.json';
  const KEY_LAST = '88st_evtPop_lastShown';
  const KEY_MUTE_UNTIL = '88st_evtPop_muteUntil';

  const now = () => Date.now();
  const hours = (h)=> h*60*60*1000;

  function getBuildVer(){
    try{ return (window.__BUILD_VER || '').trim() || 'v'; }catch(_){ return 'v'; }
  }

  function pathStartsWithAny(path, prefixes){
    if(!Array.isArray(prefixes)) return false;
    return prefixes.some(p=> {
      if(!p) return false;
      const pp = String(p);
      if(path === pp) return true;
      if(pp.endsWith('/')) return path.startsWith(pp);
      return path.startsWith(pp);
    });
  }

  async function loadCfg(){
    const v = encodeURIComponent(getBuildVer());
    const url = `${CFG_URL}?v=${v}`;
    const res = await fetch(url, { cache: 'no-store' });
    if(!res.ok) throw new Error('popup cfg fetch failed');
    return await res.json();
  }

  function shouldSkip(cfg){
    const p = location.pathname || '/';
    if(pathStartsWithAny(p, cfg.excludePaths)) return true;

    const muteUntil = Number(localStorage.getItem(KEY_MUTE_UNTIL) || 0);
    if(muteUntil && now() < muteUntil) return true;

    const interval = Number(cfg.intervalHours || 0);
    if(interval > 0){
      const last = Number(localStorage.getItem(KEY_LAST) || 0);
      if(last && (now() - last) < hours(interval)) return true;
    }
    return false;
  }

  function mount(cfg){
    const wrap = document.createElement('div');
    wrap.className = 'evtPop';
    wrap.setAttribute('role','dialog');
    wrap.setAttribute('aria-modal','true');
    wrap.innerHTML = `
      <div class="evtPop__card">
        <img class="evtPop__img" alt="88ST.Cloud" src="${cfg.image}">
        <button class="evtPop__close" type="button" aria-label="close">✕</button>
        <div class="evtPop__cta">
          <a class="evtPop__btn" href="${cfg.ctaUrl}" target="_blank" rel="noopener noreferrer">${cfg.ctaText || '@uzu59'}</a>
          <button class="evtPop__mute" type="button">오늘 그만</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    const close = () => {
      wrap.classList.remove('is-on');
      setTimeout(()=>{ try{ wrap.remove(); }catch(_){} }, 60);
    };

    wrap.addEventListener('click', (e)=>{
      if(e.target === wrap) close();
    });
    wrap.querySelector('.evtPop__close')?.addEventListener('click', close);
    wrap.querySelector('.evtPop__mute')?.addEventListener('click', ()=>{
      localStorage.setItem(KEY_MUTE_UNTIL, String(now() + hours(24)));
      close();
    });

    document.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape') close();
    }, { once:true });

    requestAnimationFrame(()=> wrap.classList.add('is-on'));
  }

  async function boot(){
    try{
      const cfg = await loadCfg();
      if(!cfg || !cfg.enabled) return;
      if(shouldSkip(cfg)) return;

      try{ localStorage.setItem(KEY_LAST, String(now())); }catch(_){ }
      mount(cfg);
    }catch(_){ /* silent */ }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }
})();
