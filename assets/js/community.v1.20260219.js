(() => {
  'use strict';

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const fmtTime = (ts) => {
    try{
      const d = new Date(Number(ts));
      if (Number.isNaN(d.getTime())) return '';
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const dd = String(d.getDate()).padStart(2,'0');
      const hh = String(d.getHours()).padStart(2,'0');
      const mi = String(d.getMinutes()).padStart(2,'0');
      return `${mm}.${dd} ${hh}:${mi}`;
    }catch(e){ return ''; }
  };

  const escapeText = (s) => String(s ?? '');
  const safeSetText = (el, s) => { if (el) el.textContent = escapeText(s); };

  async function api(url, opts){
    const res = await fetch(url, { credentials:'same-origin', ...opts });
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json().catch(()=>null) : await res.text().catch(()=>null);
    if (!res.ok) {
      const msg = (data && data.error) ? data.error : `HTTP_${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  }

  async function loadConfig(){
    try{
      const cfg = await api(`/assets/config/community.json?ts=${Date.now()}`, { method:'GET' });
      return cfg && typeof cfg === 'object' ? cfg : {};
    }catch(e){
      return {};
    }
  }

  function ensureTurnstile(form, cfg){
    const siteKey = String(cfg?.turnstileSiteKey || '').trim();
    const mount = $('.com-turnstile', form);
    const note = $('.com-turnstile-note', form);
    const submitBtn = $('button[type="submit"]', form);

    if (!mount) return { enabled:false, siteKey:'' };

    if (!siteKey || siteKey.startsWith('REPLACE_ME')) {
      mount.innerHTML = '';
      if (note) note.style.display = '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.title = 'Turnstile Site Key 설정 필요';
      }
      return { enabled:false, siteKey };
    }

    if (note) note.style.display = 'none';
    mount.innerHTML = `<div class="cf-turnstile" data-sitekey="${siteKey}"></div>`;
    return { enabled:true, siteKey };
  }

  function getTurnstileToken(form){
    const el = form.querySelector('input[name="cf-turnstile-response"]');
    return (el && el.value) ? String(el.value).trim() : '';
  }

  async function initIndex(){
    const listEl = $('#comList');
    const qEl = $('#comQuery');
    const tabs = $$('.cs-chip[data-sort]');
    let sort = (new URL(location.href)).searchParams.get('sort') || 'latest';

    function setOn(){
      tabs.forEach(b => {
        const on = (b.getAttribute('data-sort')||'') === sort;
        b.classList.toggle('on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    async function load(){
      if (!listEl) return;
      listEl.innerHTML = `<div class="com-empty">불러오는 중…</div>`;
      const q = String(qEl?.value || '').trim();
      const qp = new URLSearchParams();
      if (q) qp.set('q', q);
      if (sort) qp.set('sort', sort);
      const data = await api(`/api/posts?${qp.toString()}`, { method:'GET' });

      const items = Array.isArray(data?.items) ? data.items : [];
      if (!items.length){
        listEl.innerHTML = `<div class="com-empty">아직 글이 없습니다. 첫 글을 작성해보세요.</div>`;
        return;
      }

      const frag = document.createDocumentFragment();
      items.forEach(p => {
        const a = document.createElement('a');
        a.className = 'card com-post';
        a.href = `/community/post/?id=${encodeURIComponent(p.id)}`;
        a.innerHTML = `
          <div class="head">
            <div style="min-width:0">
              <div class="t"></div>
              <div class="meta"></div>
            </div>
            <div class="badgeRow">
              <span class="com-kpi" title="댓글"><span aria-hidden="true">💬</span><span class="n">${Number(p.comment_count||0)}</span></span>
            </div>
          </div>
          <div class="snippet"></div>
        `;
        safeSetText($('.t', a), p.title || '');
        safeSetText($('.meta', a), `${p.author_name || '익명'} · ${fmtTime(p.created_at)} · #${p.id}`);
        safeSetText($('.snippet', a), (p.snippet || '').trim());
        frag.appendChild(a);
      });
      listEl.innerHTML = '';
      listEl.appendChild(frag);
    }

    setOn();
    tabs.forEach(b => b.addEventListener('click', () => {
      sort = (b.getAttribute('data-sort')||'latest');
      setOn();
      load().catch(err => {
        listEl.innerHTML = `<div class="com-empty">오류: ${escapeText(err.message)}</div>`;
      });
    }));

    qEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        load().catch(err => listEl.innerHTML = `<div class="com-empty">오류: ${escapeText(err.message)}</div>`);
      }
    });

    $('#comSearchBtn')?.addEventListener('click', () => {
      load().catch(err => listEl.innerHTML = `<div class="com-empty">오류: ${escapeText(err.message)}</div>`);
    });

    load().catch(err => {
      listEl.innerHTML = `<div class="com-empty">오류: ${escapeText(err.message)}</div>`;
    });
  }

  async function initPost(){
    const url = new URL(location.href);
    const id = url.searchParams.get('id');
    const titleEl = $('#postTitle');
    const metaEl = $('#postMeta');
    const bodyEl = $('#postBody');
    const comList = $('#commentList');
    const form = $('#commentForm');

    if (!id){
      if (titleEl) titleEl.textContent = '잘못된 접근';
      if (bodyEl) bodyEl.textContent = '글 ID가 없습니다.';
      return;
    }

    async function load(){
      const data = await api(`/api/posts/${encodeURIComponent(id)}`, { method:'GET' });
      safeSetText(titleEl, data?.post?.title || '');
      safeSetText(metaEl, `${data?.post?.author_name || '익명'} · ${fmtTime(data?.post?.created_at)} · #${data?.post?.id}`);
      safeSetText(bodyEl, data?.post?.body || '');

      const items = Array.isArray(data?.comments) ? data.comments : [];
      if (comList){
        if (!items.length){
          comList.innerHTML = `<div class="com-empty">댓글이 없습니다.</div>`;
        } else {
          const frag = document.createDocumentFragment();
          items.forEach(c => {
            const d = document.createElement('div');
            d.className = 'com-comment';
            d.innerHTML = `
              <div class="top">
                <div class="name"></div>
                <div class="time"></div>
              </div>
              <div class="body"></div>
            `;
            safeSetText($('.name', d), c.author_name || '익명');
            safeSetText($('.time', d), fmtTime(c.created_at));
            safeSetText($('.body', d), c.body || '');
            frag.appendChild(d);
          });
          comList.innerHTML = '';
          comList.appendChild(frag);
        }
      }

      const badge = $('#commentCount');
      if (badge) badge.textContent = String(Number(data?.post?.comment_count || items.length || 0));
    }

    const cfg = await loadConfig();
    if (form) ensureTurnstile(form, cfg);

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = String($('#cName')?.value || '').trim();
      const body = String($('#cBody')?.value || '').trim();
      const token = getTurnstileToken(form);

      const btn = $('button[type="submit"]', form);
      if (btn) btn.disabled = true;

      try{
        await api(`/api/posts/${encodeURIComponent(id)}/comments`, {
          method:'POST',
          headers:{ 'content-type':'application/json' },
          body: JSON.stringify({ author_name:name, body, turnstileToken: token })
        });
        $('#cBody').value = '';
        try{ window.turnstile && window.turnstile.reset && window.turnstile.reset(); }catch(_){}
        await load();
      }catch(err){
        alert(`댓글 등록 실패: ${err.message}`);
      }finally{
        if (btn) btn.disabled = false;
      }
    });

    await load();
  }

  async function initWrite(){
    const form = $('#postForm');
    const cfg = await loadConfig();
    if (form) ensureTurnstile(form, cfg);

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = String($('#pTitle')?.value || '').trim();
      const name = String($('#pName')?.value || '').trim();
      const body = String($('#pBody')?.value || '').trim();
      const token = getTurnstileToken(form);

      const btn = $('button[type="submit"]', form);
      if (btn) btn.disabled = true;

      try{
        const data = await api('/api/posts', {
          method:'POST',
          headers:{ 'content-type':'application/json' },
          body: JSON.stringify({ title, author_name:name, body, turnstileToken: token })
        });
        const id = data?.id;
        location.href = id ? `/community/post/?id=${encodeURIComponent(id)}` : '/community/';
      }catch(err){
        alert(`등록 실패: ${err.message}`);
      }finally{
        if (btn) btn.disabled = false;
      }
    });
  }

  function boot(){
    const page = document.body?.getAttribute('data-page') || '';
    if (page === 'community-index') initIndex();
    if (page === 'community-post') initPost();
    if (page === 'community-write') initWrite();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
