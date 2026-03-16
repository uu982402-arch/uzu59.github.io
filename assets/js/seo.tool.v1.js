(function(){
  'use strict';

  const G = window.__SEO_GATE__ || {};
  const HASH_HEX = String(G.HASH_HEX || '').trim();
  const AUTH_KEY = String(G.AUTH_KEY || 'vvip_ops_authed_v1');

  const $ = (id)=>document.getElementById(id);

  function hexToBuf(hex){
    const bytes = new Uint8Array(hex.length/2);
    for(let i=0;i<bytes.length;i++){
      bytes[i] = parseInt(hex.substr(i*2,2),16);
    }
    return bytes;
  }

  async function sha256hex(str){
    const enc = new TextEncoder().encode(str);
    const digest = await crypto.subtle.digest('SHA-256', enc);
    const bytes = new Uint8Array(digest);
    return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function authed(){
    try{ return sessionStorage.getItem(AUTH_KEY) === '1'; }catch(e){ return false; }
  }
  function setAuthed(){
    try{ sessionStorage.setItem(AUTH_KEY,'1'); }catch(e){}
  }

  function showApp(){
    $('gate').hidden = true;
    $('app').hidden = false;
    $('appTop').hidden = false;
  }

  async function doLogin(){
    const pw = $('pw').value || '';
    const msg = $('gateMsg');
    msg.textContent = '';
    if(!pw){ msg.textContent = '비밀번호를 입력하세요.'; return; }
    const h = await sha256hex(pw);
    if(h === HASH_HEX){
      setAuthed();
      showApp();
    }else{
      msg.textContent = '비밀번호가 올바르지 않습니다.';
    }
  }

  function dl(name, text, mime){
    const blob = new Blob([text], {type: mime || 'text/plain;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  async function copy(text){
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch(e){
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position='fixed';ta.style.left='-9999px';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      try{ document.execCommand('copy'); }catch(_){}
      ta.remove();
      return true;
    }
  }

  // --- SEO BANK ---
  const BANK_URL = '/assets/config/seo.bank.json';
  let BANK = null;

  async function loadBank(){
    const res = await fetch(BANK_URL, {cache:'no-store'});
    if(!res.ok) throw new Error('bank fetch failed: '+res.status);
    BANK = await res.json();
    return BANK;
  }

  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function uniq(arr){
    const out = [];
    const s = new Set();
    for(const x of arr){
      const k = x.trim();
      if(!k) continue;
      if(s.has(k)) continue;
      s.add(k);
      out.push(k);
    }
    return out;
  }

  function makeClusters(topic, catKey, opts){
    const b = BANK || {};
    const cat = (b.categories && b.categories[catKey]) || {};
    const base = uniq([topic, ...(cat.seed || []), ...((b.common && b.common.seed) || [])]);

    const mods = uniq([
      ...(((b.common||{}).modifiers||[])),
      ...((cat.modifiers||[]))
    ]);
    const intents = uniq([
      ...(((b.common||{}).intents||[])),
      ...((cat.intents||[]))
    ]);
    const tails = uniq([
      ...(((b.common||{}).tails||[])),
      ...((cat.tails||[]))
    ]);

    const brand = opts.brand ? (b.brand && b.brand.terms) || [] : [];
    const langEN = opts.en ? (b.common && b.common.enTerms) || [] : [];

    const out = [];
    // primary
    base.forEach(k=>{
      out.push(k);
      mods.forEach(m=> out.push(`${k} ${m}`));
      intents.forEach(i=> out.push(`${k} ${i}`));
      tails.forEach(t=> out.push(`${k} ${t}`));
    });

    // combos
    base.forEach(k=>{
      intents.forEach(i=>{
        mods.forEach(m=>{
          out.push(`${k} ${m} ${i}`);
        });
      });
    });

    brand.forEach(bk=>{
      base.forEach(k=> out.push(`${bk} ${k}`));
      intents.forEach(i=> out.push(`${bk} ${i}`));
    });

    langEN.forEach(en=>{
      base.forEach(k=> out.push(`${k} ${en}`));
    });

    return uniq(out).slice(0, 180);
  }

  function makeTitleMeta(path, focus, catKey, tone){
    const b = BANK || {};
    const cat = (b.categories && b.categories[catKey]) || {};
    const brand = (b.brand && b.brand.site) || '88st.cloud';

    const tpls = (b.templates && b.templates.titles) || [];
    const descTpls = (b.templates && b.templates.descriptions) || [];
    const kwTpls = (b.templates && b.templates.keywordLines) || [];

    const ctx = {
      brand,
      path,
      focus,
      catName: cat.name || catKey,
      promise: pick((cat.promises||[]).concat((b.common && b.common.promises)||[])),
      cta: pick((b.common && b.common.ctas)||['바로 확인','지금 시작']),
    };

    function fmt(s){
      return s.replace(/\{(\w+)\}/g, (_,k)=> (ctx[k] ?? ''));
    }

    const titles = uniq(tpls.map(fmt)).slice(0, 8);
    const descs  = uniq(descTpls.map(fmt)).slice(0, 5);
    const kws    = uniq(kwTpls.map(fmt)).slice(0, 5);

    // tone tweaks (simple)
    function toneAdjust(s){
      if(tone === 'luxe') return s.replace(/무료|쉽게/g,'빠르게').replace(/방법/g,'가이드');
      if(tone === 'cta') return s + ' · ' + ctx.cta;
      return s;
    }

    const outTitles = titles.map(toneAdjust);
    const outDescs  = descs.map(toneAdjust);

    const kwLine = kws.join(', ');
    return {titles: outTitles, descs: outDescs, kwLine};
  }

  function makeOutline(focus, catKey){
    const b = BANK || {};
    const cat = (b.categories && b.categories[catKey]) || {};
    const blocks = (b.templates && b.templates.outlines) || [];
    const ctx = {focus, catName: cat.name || catKey};
    const fmt = (s)=> s.replace(/\{(\w+)\}/g, (_,k)=> (ctx[k] ?? ''));
    return uniq(blocks.map(fmt)).slice(0, 10);
  }

  function cleanupText(t){
    return (t||'')
      .replace(/\r\n/g,'\n')
      .replace(/[ \t]+\n/g,'\n')
      .replace(/\n{3,}/g,'\n\n')
      .replace(/[ \t]{2,}/g,' ')
      .trim();
  }

  function splitSentences(t){
    const parts = t.split(/(?<=[\.\!\?]|다\.)\s+/g);
    return parts.map(p=>p.trim()).filter(Boolean);
  }

  function rewrite(t, mode){
    const b = BANK || {};
    const map = (b.rewrite && b.rewrite.replace) || {};
    let s = cleanupText(t);

    // standardize terms
    Object.keys(map).forEach(k=>{
      const v = map[k];
      try{
        s = s.replace(new RegExp(k,'g'), v);
      }catch(e){}
    });

    // remove filler lines
    const drop = (b.rewrite && b.rewrite.dropPhrases) || [];
    drop.forEach(p=>{
      try{ s = s.replace(new RegExp(p,'g'), ''); }catch(e){}
    });

    // sentence shaping
    const sentences = splitSentences(s);
    let out = [];
    if(mode === 'short'){
      // keep only key sentences, compress to ~8 lines
      for(const sent of sentences){
        if(out.length >= 8) break;
        const ss = sent.replace(/(입니다|합니다)$/,'').trim();
        if(ss.length < 8) continue;
        out.push(ss);
      }
      out = out.map(x=>`• ${x}`);
    }else{
      // explain: keep more, group 2-3 per paragraph
      let buf = [];
      for(const sent of sentences){
        if(sent.length < 6) continue;
        buf.push(sent);
        if(buf.length >= 3){
          out.push(buf.join(' '));
          buf = [];
        }
        if(out.length >= 6) break;
      }
      if(buf.length) out.push(buf.join(' '));
    }
    return cleanupText(out.join('\n'));
  }

  function makeMetaJsonSnippet(path, title, desc, keywords){
    const obj = {};
    obj[path] = {
      title,
      description: desc,
      keywords
    };
    return JSON.stringify(obj, null, 2);
  }

  async function init(){
    // gate
    $('btnLogin').addEventListener('click', doLogin);
    $('pw').addEventListener('keydown', (e)=>{ if(e.key==='Enter') doLogin(); });
    // OPS link removed (admin page hidden from users)
    try{ var __go=$('btnGoOps'); if(__go) __go.remove(); }catch(e){}
    if(authed()){
      showApp();
    }

    // load bank lazy
    async function ensureBank(){
      if(BANK) return BANK;
      try{
        await loadBank();
      }catch(e){
        console.error(e);
        alert('seo.bank.json 로드 실패: '+e.message);
      }
      return BANK;
    }

    $('btnReloadBank').addEventListener('click', async ()=>{
      BANK = null;
      await ensureBank();
      alert('키워드 뱅크 새로고침 완료');
    });

    // KW gen
    $('btnGenKw').addEventListener('click', async ()=>{
      await ensureBank();
      const topic = ($('topic').value||'').trim();
      if(!topic){ alert('주제/서비스를 입력하세요.'); return; }
      const cat = $('cat').value;
      const tone = $('tone').value;
      const opts = {brand:$('kwBrand').checked, kr:$('kwKR').checked, en:$('kwEN').checked};
      const kws = makeClusters(topic, cat, opts);
      const header = `# 키워드 클러스터\n- topic: ${topic}\n- category: ${cat}\n- count: ${kws.length}\n\n`;
      $('outKw').value = header + kws.map(k=>`- ${k}`).join('\n');
    });
    $('btnClearKw').addEventListener('click', ()=>{ $('outKw').value=''; });

    $('btnCopyKw').addEventListener('click', ()=>copy($('outKw').value||''));
    $('btnDlKw').addEventListener('click', ()=>dl('keywords.txt', $('outKw').value||'', 'text/plain;charset=utf-8'));

    // meta
    $('btnGenMeta').addEventListener('click', async ()=>{
      await ensureBank();
      const path = ($('path').value||'').trim() || '/';
      const focus = ($('focus').value||'').trim();
      if(!focus){ alert('핵심 키워드를 입력하세요.'); return; }
      const cat = $('cat').value;
      const tone = $('tone').value;
      const r = makeTitleMeta(path, focus, cat, tone);
      const out = [];
      out.push(`## Title 추천`);
      r.titles.forEach((t,i)=> out.push(`${i+1}. ${t}`));
      out.push(`\n## Meta Description 추천`);
      r.descs.forEach((d,i)=> out.push(`${i+1}. ${d}`));
      out.push(`\n## Keywords 라인(예시)\n${r.kwLine}`);
      $('outMeta').value = out.join('\n');

      const ol = makeOutline(focus, cat);
      $('outOutline').value = ol.map(x=>`- ${x}`).join('\n');

      $('outJson').value = '';
    });
    $('btnClearMeta').addEventListener('click', ()=>{
      $('outMeta').value=''; $('outOutline').value=''; $('outJson').value='';
    });
    $('btnCopyMeta').addEventListener('click', ()=>copy($('outMeta').value||''));
    $('btnDlMeta').addEventListener('click', ()=>dl('meta.txt', $('outMeta').value||'', 'text/plain;charset=utf-8'));

    $('btnMakeJson').addEventListener('click', ()=>{
      const path = ($('path').value||'').trim() || '/';
      const meta = $('outMeta').value||'';
      // best pick: first title/desc lines
      const lines = meta.split('\n').map(l=>l.trim()).filter(Boolean);
      const tLine = lines.find(l=>/^\d+\.\s/.test(l)) || '';
      const title = tLine.replace(/^\d+\.\s*/,'').trim() || $('focus').value.trim();
      const dIdx = lines.findIndex(l=>l.includes('Meta Description'));
      let desc = '';
      for(let i=dIdx+1;i<lines.length;i++){
        if(/^\d+\.\s/.test(lines[i])){ desc = lines[i].replace(/^\d+\.\s*/,'').trim(); break; }
      }
      const kwMatch = meta.match(/## Keywords[\s\S]*?\n(.+)$/m);
      const keywords = kwMatch ? (kwMatch[1]||'').trim() : '';
      $('outJson').value = makeMetaJsonSnippet(path, title, desc, keywords);
    });
    $('btnCopyJson').addEventListener('click', ()=>copy($('outJson').value||''));
    $('btnDlJson').addEventListener('click', ()=>dl('seo.meta.snippet.json', $('outJson').value||'{}', 'application/json;charset=utf-8'));

    // rewrite
    $('btnCleanup').addEventListener('click', ()=>{ $('src').value = cleanupText($('src').value||''); });
    $('btnRewriteShort').addEventListener('click', async ()=>{
      await ensureBank();
      $('outBody').value = rewrite($('src').value||'', 'short');
    });
    $('btnRewriteExplain').addEventListener('click', async ()=>{
      await ensureBank();
      $('outBody').value = rewrite($('src').value||'', 'explain');
    });
    $('btnCopyBody').addEventListener('click', ()=>copy($('outBody').value||''));
    $('btnDlBody').addEventListener('click', ()=>dl('rewrite.txt', $('outBody').value||'', 'text/plain;charset=utf-8'));

    // bank viewer
    $('btnLoadBank').addEventListener('click', async ()=>{
      await ensureBank();
      $('bank').value = JSON.stringify(BANK, null, 2);
    });
    $('btnCopyBank').addEventListener('click', ()=>copy($('bank').value||''));
    $('btnDlBank').addEventListener('click', ()=>dl('seo.bank.json', $('bank').value||'{}', 'application/json;charset=utf-8'));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
