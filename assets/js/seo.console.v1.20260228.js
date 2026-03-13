/* SEO Console (v1.20260228)
   - Reads GSC-derived opportunities stored in D1
   - Manual sync trigger (POST /api/seo/sync) protected by ADMIN_TOKEN
*/
(function(){
  'use strict';
  const $ = (id)=>document.getElementById(id);

  const TOKEN_KEY = 'vvip_seo_admin_token_v1';

  function setMsg(text, isErr){
    const el = $('msg');
    if(!el) return;
    el.textContent = text || '';
    el.className = 'msg' + (isErr ? ' err' : '');
    if(text) setTimeout(()=>{ try{ el.textContent=''; el.className='msg'; }catch(e){} }, 3400);
  }

  function fmtNum(n){
    const x = Number(n||0);
    if(!isFinite(x)) return '0';
    return x.toLocaleString('ko-KR');
  }
  function fmtPct(p){
    const x = Number(p||0);
    if(!isFinite(x)) return '0%';
    return (x*100).toFixed(1)+'%';
  }
  function fmtPos(p){
    const x = Number(p||0);
    if(!isFinite(x)) return '-';
    return x.toFixed(1);
  }

  function getToken(){
    try{ return (sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || '').trim(); }catch(e){ return ''; }
  }
  function saveToken(v){
    try{
      localStorage.setItem(TOKEN_KEY, v||'');
      sessionStorage.setItem(TOKEN_KEY, v||'');
    }catch(e){}
  }

  async function api(path, opts){
    opts = opts || {};
    const headers = new Headers(opts.headers || {});
    headers.set('accept','application/json');
    const tok = getToken();
    if(tok) headers.set('authorization', 'Bearer ' + tok);
    const res = await fetch(path, Object.assign({}, opts, { headers }));
    const json = await res.json().catch(()=>null);
    if(!res.ok){
      const msg = (json && (json.error || json.message)) || ('HTTP_'+res.status);
      throw new Error(msg);
    }
    return json;
  }

  function setStatus(ok){
    const el = $('seoStatus');
    if(!el) return;
    el.textContent = ok ? 'online' : 'offline';
    el.style.opacity = ok ? '1' : '.7';
  }

  function renderKPI(sum){
    const grid = $('kpiGrid');
    if(!grid) return;
    grid.style.display = 'grid';
    const items = [
      {k:'기간', v: (sum && sum.range) || '-', m:'최근 데이터 범위'},
      {k:'클릭', v: fmtNum(sum && sum.clicks), m:'GSC 합산'},
      {k:'노출', v: fmtNum(sum && sum.impressions), m:'GSC 합산'},
      {k:'CTR', v: fmtPct(sum && sum.ctr), m:'클릭/노출'},
    ];
    grid.innerHTML = items.map(it=>(
      '<div class="kpi"><div class="k">'+it.k+'</div><div class="v">'+it.v+'</div><div class="m">'+it.m+'</div></div>'
    )).join('');
  }

  function renderOpp(list){
    const table = $('oppTable');
    const body = $('oppBody');
    if(!table || !body) return;
    table.style.display = 'table';
    body.innerHTML = (list||[]).map(row=>{
      const rec = (row && row.reco) || '';
      const page = (row && row.page_path) || (row && row.page) || '';
      return '<tr>'+
        '<td><b>'+fmtNum(row.score)+'</b></td>'+
        '<td>'+escapeHtml(row.query || '')+'</td>'+
        '<td class="mono">'+escapeHtml(page)+'</td>'+
        '<td>'+fmtNum(row.impressions)+'</td>'+
        '<td>'+fmtNum(row.clicks)+'</td>'+
        '<td>'+fmtPct(row.ctr)+'</td>'+
        '<td>'+fmtPos(row.position)+'</td>'+
        '<td>'+escapeHtml(rec)+'</td>'+
      '</tr>';
    }).join('');
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  async function refresh(){
    try{
      setMsg('불러오는 중…');
      const sum = await api('/api/seo/summary');
      setStatus(true);
      $('seoMeta').textContent = (sum && sum.site_url ? sum.site_url : '') + (sum && sum.last_sync ? (' · last_sync=' + sum.last_sync) : '');
      renderKPI(sum);
      const opp = await api('/api/seo/opportunities?limit=50');
      renderOpp(opp.items || []);
      setMsg('완료');
    }catch(e){
      setStatus(false);
      renderKPI(null);
      renderOpp([]);
      setMsg('오류: ' + (e && e.message ? e.message : e), true);
    }
  }

  async function sync(){
    try{
      setMsg('동기화 시작…');
      const res = await api('/api/seo/sync', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ days: 28 }) });
      setMsg('동기화 완료: rows=' + (res && res.rows ? res.rows : 0));
      await refresh();
    }catch(e){
      setMsg('동기화 실패: ' + (e && e.message ? e.message : e), true);
    }
  }

  function init(){
    const tok = getToken();
    if(tok) $('adminToken').value = tok;

    $('btnSaveToken').addEventListener('click', ()=>{
      const v = String($('adminToken').value || '').trim();
      if(!v){ setMsg('토큰을 입력해줘'); return; }
      saveToken(v);
      setMsg('저장됨');
    });

    $('btnRefresh').addEventListener('click', refresh);
    $('btnSync').addEventListener('click', sync);

    refresh();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
