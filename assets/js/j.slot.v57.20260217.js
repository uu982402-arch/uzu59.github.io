/* Slot tool v57 — tabs + Pragmatic DB + session tracker */
(function(){
  'use strict';

  const TAB_KEY = '88st_slot_tab_v1';
  const SESS_KEY = '88st_slot_sessions_v1';

  const $ = (id)=>document.getElementById(id);

  function safeJsonParse(s, fallback){
    try{ return JSON.parse(s); }catch(_){ return fallback; }
  }
  function lsRead(key, fallback){
    try{
      const v = localStorage.getItem(key);
      return v ? safeJsonParse(v, fallback) : fallback;
    }catch(_){ return fallback; }
  }
  function lsWrite(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(_){ /* ignore */ }
  }

  function num(v){
    const s = String(v ?? '').replace(/,/g,'').replace(/원/g,'').trim();
    if(!s) return NaN;
    const x = Number(s);
    return Number.isFinite(x) ? x : NaN;
  }
  function fmtWon(x){
    if(!Number.isFinite(x)) return '-';
    return Math.round(x).toLocaleString('ko-KR') + '원';
  }
  function fmtX(x){
    if(!Number.isFinite(x) || x<=0) return '—';
    return Math.round(x).toLocaleString('en-US') + 'x';
  }
  function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }

  function esc(s){
    return String(s||'').replace(/[&<>"']/g, (c)=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  const VOL_LABEL = { low:'저변동', mid:'중변동', high:'고변동', vhigh:'초고변동', unknown:'미표기' };

  // Pragmatic DB (lightweight seed — user can extend later)
  // NOTE: RTP can vary by operator/version; keep null unless verified.
  const SLOT_DB = [
    { id:'pp_gates_olympus', provider:'Pragmatic', name:'Gates of Olympus', vol:'high', maxWin:5000, rtp:null },
    { id:'pp_sweet_bonanza', provider:'Pragmatic', name:'Sweet Bonanza', vol:'high', maxWin:21100, rtp:null },
    { id:'pp_dog_house', provider:'Pragmatic', name:'The Dog House', vol:'high', maxWin:6750, rtp:null },
    { id:'pp_big_bass_bonanza', provider:'Pragmatic', name:'Big Bass Bonanza', vol:'high', maxWin:2100, rtp:null },
    { id:'pp_sugar_rush', provider:'Pragmatic', name:'Sugar Rush', vol:'high', maxWin:5000, rtp:null },
    { id:'pp_wanted', provider:'Pragmatic', name:'Wanted Dead or a Wild', vol:'vhigh', maxWin:12500, rtp:null },
    { id:'pp_starlight_princess', provider:'Pragmatic', name:'Starlight Princess', vol:'high', maxWin:5000, rtp:null },
    { id:'pp_fruit_party', provider:'Pragmatic', name:'Fruit Party', vol:'mid', maxWin:5000, rtp:null },
    { id:'pp_power_thor_megaways', provider:'Pragmatic', name:'Power of Thor Megaways', vol:'high', maxWin:5000, rtp:null },
    { id:'pp_jokers_jewels', provider:'Pragmatic', name:"Joker's Jewels", vol:'low', maxWin:1000, rtp:null },
    { id:'pp_5lions_megaways', provider:'Pragmatic', name:'5 Lions Megaways', vol:'high', maxWin:5000, rtp:null },
    { id:'pp_aztec_gems', provider:'Pragmatic', name:'Aztec Gems', vol:'low', maxWin:405, rtp:null },
    { id:'pp_madame_destiny', provider:'Pragmatic', name:'Madame Destiny Megaways', vol:'high', maxWin:5000, rtp:null },
    { id:'pp_great_rhino_megaways', provider:'Pragmatic', name:'Great Rhino Megaways', vol:'high', maxWin:5000, rtp:null },
    { id:'pp_fire_strike_2', provider:'Pragmatic', name:'Fire Strike 2', vol:'mid', maxWin:5000, rtp:null },
    { id:'pp_wolf_gold', provider:'Pragmatic', name:'Wolf Gold', vol:'mid', maxWin:2500, rtp:null },
    { id:'pp_john_hunter_scarab', provider:'Pragmatic', name:'John Hunter and the Tomb of the Scarab Queen', vol:'mid', maxWin:1250, rtp:null },
    { id:'pp_mustang_gold', provider:'Pragmatic', name:'Mustang Gold', vol:'mid', maxWin:5000, rtp:null },
    { id:'pp_release_kraken', provider:'Pragmatic', name:'Release the Kraken', vol:'mid', maxWin:5000, rtp:null },
    { id:'pp_rise_giza', provider:'Pragmatic', name:'Rise of Giza PowerNudge', vol:'high', maxWin:5000, rtp:null },
  ];

  function setActiveTab(tab){
    const tabs = Array.from(document.querySelectorAll('#slTabs .sl-tab'));
    const panels = Array.from(document.querySelectorAll('.sl-panel'));
    tabs.forEach(btn=>{
      const on = btn.getAttribute('data-tab') === tab;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(p=>{
      const on = p.getAttribute('data-panel') === tab;
      p.classList.toggle('on', on);
    });
    lsWrite(TAB_KEY, tab);
  }

  function initTabs(){
    const root = $('slTabs');
    if(!root) return;

    root.addEventListener('click', (e)=>{
      const btn = e.target && e.target.closest('button[data-tab]');
      if(!btn) return;
      setActiveTab(btn.getAttribute('data-tab'));
    });

    const saved = lsRead(TAB_KEY, 'calc');
    setActiveTab(['calc','db','session'].includes(saved) ? saved : 'calc');
  }

  function maxwinBucket(v){
    if(!Number.isFinite(v)) return 'unknown';
    return v>=5000 ? 'gte5000' : 'lt5000';
  }

  function renderDb(){
    const body = $('slDbBody');
    if(!body) return;

    const q = String(($('slDbQ') && $('slDbQ').value) || '').trim().toLowerCase();
    const vol = ($('slDbVol') && $('slDbVol').value) || '';
    const mx = ($('slDbMaxwin') && $('slDbMaxwin').value) || '';

    let list = SLOT_DB.slice();
    if(q){
      list = list.filter(it=>String(it.name||'').toLowerCase().includes(q));
    }
    if(vol){
      list = list.filter(it=>(it.vol||'unknown')===vol);
    }
    if(mx){
      list = list.filter(it=>maxwinBucket(Number(it.maxWin))===mx);
    }

    if(!list.length){
      body.innerHTML = '<tr><td colspan="4" class="sl-muted">조건에 맞는 게임이 없습니다.</td></tr>';
      return;
    }

    body.innerHTML = list.map(it=>{
      const volLabel = VOL_LABEL[it.vol||'unknown'] || '미표기';
      const maxWin = Number.isFinite(Number(it.maxWin)) ? fmtX(Number(it.maxWin)) : '—';
      return `
        <tr>
          <td data-label="게임">${esc(it.name)} <span class="sl-muted" style="margin-left:6px; font-weight:900;">(${esc(it.provider||'')})</span></td>
          <td data-label="변동성">${esc(volLabel)}</td>
          <td data-label="Max Win">${esc(maxWin)}</td>
          <td data-label="액션">
            <div class="sl-actions">
              <button class="sl-mini" type="button" data-load="${esc(it.id)}">RTP로</button>
              <button class="sl-mini" type="button" data-session="${esc(it.id)}">세션</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function wireDb(){
    const q = $('slDbQ');
    const vol = $('slDbVol');
    const mx = $('slDbMaxwin');
    [q,vol,mx].forEach(el=>{
      if(!el) return;
      el.addEventListener('input', ()=>renderDb());
      el.addEventListener('change', ()=>renderDb());
    });

    const body = $('slDbBody');
    if(body){
      body.addEventListener('click', (e)=>{
        const loadBtn = e.target && e.target.closest('button[data-load]');
        const sessBtn = e.target && e.target.closest('button[data-session]');
        if(!loadBtn && !sessBtn) return;

        const id = (loadBtn||sessBtn).getAttribute(loadBtn?'data-load':'data-session');
        const it = SLOT_DB.find(x=>x.id===id);
        if(!it) return;

        if(loadBtn){
          const nameEl = $('slotName');
          const volEl = $('vol');
          if(nameEl) nameEl.value = it.name;
          if(volEl && it.vol && ['low','mid','high','vhigh'].includes(it.vol)) volEl.value = it.vol;
          // If rtp is known later, we can prefill it.
          if(Number.isFinite(it.rtp) && $('rtp')) $('rtp').value = String(it.rtp);
          setActiveTab('calc');
          if($('rtp')) $('rtp').focus();
        }

        if(sessBtn){
          if($('slSessGame')) $('slSessGame').value = it.name;
          setActiveTab('session');
          if($('slSessBet')) $('slSessBet').focus();
        }
      });
    }

    renderDb();
  }

  // ---- Session tracker ----
  function loadSessions(){
    const v = lsRead(SESS_KEY, []);
    return Array.isArray(v) ? v : [];
  }
  function saveSessions(list){
    lsWrite(SESS_KEY, list);
  }

  function setBad(el, bad){
    if(!el) return;
    el.classList.toggle('sl-bad', !!bad);
  }

  function dateLabel(ts){
    try{
      const d = new Date(ts);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const dd = String(d.getDate()).padStart(2,'0');
      return `${yyyy}-${mm}-${dd}`;
    }catch(_){ return '—'; }
  }

  function renderSessions(){
    const body = $('slSessBody');
    if(!body) return;

    const list = loadSessions();
    if(!list.length){
      body.innerHTML = '<tr><td colspan="6" class="sl-muted">아직 기록이 없습니다.</td></tr>';
      $('slSessKpiCount').textContent = '0';
      $('slSessKpiBet').textContent = '-';
      $('slSessKpiPL').textContent = '-';
      $('slSessKpiRoi').textContent = '-';
      return;
    }

    const totalBet = list.reduce((a,b)=>a+(Number(b.totalBet)||0),0);
    const totalRet = list.reduce((a,b)=>a+(Number(b.ret)||0),0);
    const totalPL = totalRet - totalBet;
    const roi = totalBet>0 ? (totalPL/totalBet)*100 : NaN;

    $('slSessKpiCount').textContent = String(list.length);
    $('slSessKpiBet').textContent = fmtWon(totalBet);
    $('slSessKpiPL').textContent = fmtWon(totalPL);
    $('slSessKpiPL').classList.toggle('neg', totalPL<0);
    $('slSessKpiRoi').textContent = Number.isFinite(roi) ? roi.toFixed(2)+'%' : '-';

    body.innerHTML = list.slice(0, 120).map(it=>{
      const pl = Number(it.pl)||0;
      return `
        <tr>
          <td data-label="날짜">${esc(dateLabel(it.ts))}</td>
          <td data-label="게임">${esc(it.game||'')}</td>
          <td data-label="총 베팅">${esc(fmtWon(Number(it.totalBet)||0))}</td>
          <td data-label="회수">${esc(fmtWon(Number(it.ret)||0))}</td>
          <td data-label="손익"><span style="${pl<0?'color:rgba(255,120,120,.92);':''}">${esc(fmtWon(pl))}</span></td>
          <td data-label="삭제"><button class="sl-mini" type="button" data-del="${esc(it.id)}">삭제</button></td>
        </tr>
      `;
    }).join('');

    body.querySelectorAll('button[data-del]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-del');
        const next = loadSessions().filter(x=>x && x.id !== id);
        saveSessions(next);
        renderSessions();
      });
    });
  }

  function addSession(){
    const gameEl = $('slSessGame');
    const betEl = $('slSessBet');
    const spinsEl = $('slSessSpins');
    const retEl = $('slSessReturn');

    const game = String(gameEl && gameEl.value || '').trim();
    const bet = num(betEl && betEl.value);
    const spins = num(spinsEl && spinsEl.value);
    const ret = num(retEl && retEl.value);

    const badGame = !game;
    const badBet = !(Number.isFinite(bet) && bet>0);
    const badSpins = !(Number.isFinite(spins) && spins>0);
    const badRet = !(Number.isFinite(ret) && ret>=0);

    setBad(gameEl, badGame);
    setBad(betEl, badBet);
    setBad(spinsEl, badSpins);
    setBad(retEl, badRet);

    if(badGame || badBet || badSpins || badRet){
      return;
    }

    const totalBet = bet * spins;
    const pl = ret - totalBet;

    const entry = {
      id: 'sl_' + Math.random().toString(36).slice(2,10) + '_' + Date.now(),
      ts: Date.now(),
      game,
      bet: Math.floor(bet),
      spins: Math.floor(spins),
      ret: Math.floor(ret),
      totalBet: Math.floor(totalBet),
      pl: Math.floor(pl)
    };

    const list = loadSessions();
    list.unshift(entry);
    saveSessions(list.slice(0, 500));

    // Clear only numeric fields for quick re-entry
    if(betEl) betEl.value = '';
    if(spinsEl) spinsEl.value = '';
    if(retEl) retEl.value = '';

    renderSessions();
  }

  function copyText(text){
    if(!text) return;
    const doFallback = ()=>{
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try{ document.execCommand('copy'); }catch(_){ /* ignore */ }
      document.body.removeChild(ta);
    };

    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).catch(()=>doFallback());
    }else doFallback();
  }

  function buildSummary(){
    const list = loadSessions();
    const totalBet = list.reduce((a,b)=>a+(Number(b.totalBet)||0),0);
    const totalRet = list.reduce((a,b)=>a+(Number(b.ret)||0),0);
    const totalPL = totalRet - totalBet;
    const roi = totalBet>0 ? (totalPL/totalBet)*100 : NaN;

    const lines = [];
    lines.push('[88ST 슬롯 세션 요약]');
    lines.push(`세션: ${list.length}개`);
    lines.push(`총 베팅: ${fmtWon(totalBet)}`);
    lines.push(`총 회수: ${fmtWon(totalRet)}`);
    lines.push(`총 손익: ${fmtWon(totalPL)} (${Number.isFinite(roi)?roi.toFixed(2)+'%':'-'})`);
    lines.push('');

    list.slice(0, 8).forEach((it, idx)=>{
      lines.push(`${idx+1}. ${dateLabel(it.ts)} | ${it.game} | 베팅 ${fmtWon(it.totalBet)} | 회수 ${fmtWon(it.ret)} | 손익 ${fmtWon(it.pl)}`);
    });

    return lines.join('\n');
  }

  function exportCsv(){
    const list = loadSessions();
    const header = ['date','game','bet_per_spin','spins','total_bet','return','pl'];
    const rows = list.map(it=>[
      dateLabel(it.ts),
      String(it.game||'').replace(/\n/g,' '),
      String(it.bet||0),
      String(it.spins||0),
      String(it.totalBet||0),
      String(it.ret||0),
      String(it.pl||0),
    ]);

    const csv = [header.join(','), ...rows.map(r=>r.map(v=>{
      const s = String(v ?? '');
      return /[\",\n]/.test(s) ? '"'+s.replace(/\"/g,'""')+'"' : s;
    }).join(','))].join('\n');

    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '88st_slot_sessions.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function wireSessions(){
    const addBtn = $('slSessAdd');
    const copyBtn = $('slSessCopy');
    const csvBtn = $('slSessCsv');
    const clearBtn = $('slSessClear');

    if(addBtn) addBtn.addEventListener('click', addSession);
    if(copyBtn) copyBtn.addEventListener('click', ()=>copyText(buildSummary()));
    if(csvBtn) csvBtn.addEventListener('click', exportCsv);
    if(clearBtn) clearBtn.addEventListener('click', ()=>{
      if(confirm('세션 기록을 모두 삭제할까요?')){
        saveSessions([]);
        renderSessions();
      }
    });

    // live validation
    ['slSessGame','slSessBet','slSessSpins','slSessReturn'].forEach(id=>{
      const el = $(id);
      if(!el) return;
      el.addEventListener('input', ()=>setBad(el, false));
      el.addEventListener('change', ()=>setBad(el, false));
    });

    renderSessions();
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    initTabs();
    wireDb();
    wireSessions();
  });

})();
