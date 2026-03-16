/* ops.sitemap.v1.20260226.js
 * 88ST OPS — sitemap.xml parser → "full-site purge list" generator
 * - Parses /sitemap.xml (urlset or sitemapindex)
 * - Outputs: full URL list, relative path list, Cloudflare purge JSON
 */
(function(){
  'use strict';

  function $(id){ try{return document.getElementById(id);}catch(_){return null;} }
  function esc(s){ return String(s||'').replace(/[&<>"]/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]);}); }

  async function fetchText(url){
    const r = await fetch(url, { cache:'no-store' });
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.text();
  }

  function parseLocs(xmlText){
    try{
      const dom = new DOMParser().parseFromString(xmlText, 'text/xml');
      const locNodes = dom.getElementsByTagName('loc');
      const out = [];
      for(let i=0;i<locNodes.length;i++){
        const t = (locNodes[i].textContent||'').trim();
        if(t) out.push(t);
      }
      return out;
    }catch(_){ return []; }
  }

  async function loadSitemapAll(url){
    const xml = await fetchText(url);
    // Detect sitemapindex
    if(xml.indexOf('<sitemapindex') !== -1){
      const idxLocs = parseLocs(xml);
      const all = [];
      for(const sm of idxLocs){
        try{
          const x2 = await fetchText(sm);
          const locs2 = parseLocs(x2);
          for(const u of locs2) all.push(u);
        }catch(_){}
      }
      return all;
    }
    return parseLocs(xml);
  }

  function uniq(arr){
    const s = new Set();
    const out = [];
    for(const x of arr){
      const k = String(x||'').trim();
      if(!k) continue;
      if(s.has(k)) continue;
      s.add(k);
      out.push(k);
    }
    return out;
  }

  function toRel(urls){
    const out = [];
    for(const u of urls){
      try{
        const U = new URL(u, location.origin);
        out.push(U.pathname + (U.search||''));
      }catch(_){}
    }
    return out;
  }

  async function copyText(text){
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch(_){
      try{
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        return true;
      }catch(__){ return false; }
    }
  }

  function setMsg(el, msg, isErr){
    if(!el) return;
    el.textContent = msg;
    el.style.color = isErr ? 'rgba(255,80,80,.95)' : '';
  }

  function render(urls){
    const out = $('opsSitemapOut');
    const json = $('opsSitemapJson');
    const meta = $('opsSitemapMeta');
    if(meta) meta.textContent = '총 '+urls.length+'개 URL (sitemap.xml 기준)';

    const rel = toRel(urls);

    const fullText = urls.join('\n');
    const relText  = rel.join('\n');
    const purgeJson = JSON.stringify({ files: urls }, null, 2);

    if(out){
      out.value =
        '# FULL URLS (Cloudflare Purge "files")\n' + fullText +
        '\n\n# RELATIVE PATHS (for quick testing)\n' + relText + '\n';
    }
    if(json) json.value = purgeJson;

    // expose for OPS smoke or other tools
    try{ window.__OPS_SITEMAP_URLS = urls.slice(); }catch(_){}
  }

  async function boot(){
    const btnLoad = $('opsSitemapLoad');
    const btnCopy = $('opsSitemapCopy');
    const btnCopyJson = $('opsSitemapCopyJson');
    const msg = $('opsSitemapMsg');

    if(!btnLoad) return;

    btnLoad.addEventListener('click', async ()=>{
      try{
        btnLoad.disabled = true;
        setMsg(msg, '불러오는 중…', false);

        const urls = uniq(await loadSitemapAll('/sitemap.xml'));
        // Stable ordering (path, then full URL)
        urls.sort((a,b)=> String(a).localeCompare(String(b)));

        render(urls);
        setMsg(msg, '완료: 사이트맵 파싱 성공', false);
      }catch(e){
        setMsg(msg, '실패: sitemap.xml 파싱 오류 — ' + (e && e.message ? e.message : String(e)), true);
      }finally{
        btnLoad.disabled = false;
      }
    });

    if(btnCopy){
      btnCopy.addEventListener('click', async ()=>{
        const out = $('opsSitemapOut');
        const ok = await copyText(out ? out.value : '');
        setMsg(msg, ok ? '복사 완료' : '복사 실패(브라우저 권한 확인)', !ok);
      });
    }

    if(btnCopyJson){
      btnCopyJson.addEventListener('click', async ()=>{
        const ta = $('opsSitemapJson');
        const ok = await copyText(ta ? ta.value : '');
        setMsg(msg, ok ? 'JSON 복사 완료' : '복사 실패(브라우저 권한 확인)', !ok);
      });
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();