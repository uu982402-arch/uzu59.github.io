/* 88ST Tool History + Share + Examples (Luxe)
   - Safe no-op unless a config block exists.
   - Works for static tool pages (margin/ev/odds) without requiring a build step.
   - Stores to localStorage and supports shareable URL params.
*/
(function(){
  "use strict";

  const CONFIG_ID = "__88stToolConfig";
  const KEY = "88st_tool_history_v1";
  const MAX_ITEMS = 20;

  const $ = (sel, root=document)=> root.querySelector(sel);
  const $$ = (sel, root=document)=> Array.from(root.querySelectorAll(sel));

  function safeJsonParse(text){
    try{ return JSON.parse(text); }catch(e){ return null; }
  }

  function nowKSTLabel(ts){
    try{
      const d = new Date(ts);
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,'0');
      const dd = String(d.getDate()).padStart(2,'0');
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      return `${y}.${m}.${dd} ${hh}:${mm}`;
    }catch(e){ return "-"; }
  }

  function toast(msg){
    if(!msg) return;
    let host = document.getElementById("_88stToastHost");
    if(!host){
      host = document.createElement("div");
      host.id = "_88stToastHost";
      host.setAttribute("aria-live","polite");
      document.body.appendChild(host);
    }
    const t = document.createElement("div");
    t.className = "stx-toast";
    t.textContent = msg;
    host.appendChild(t);
    requestAnimationFrame(()=> t.classList.add("show"));
    window.setTimeout(()=>{
      t.classList.remove("show");
      window.setTimeout(()=> t.remove(), 260);
    }, 2100);
  }

  async function copyText(text){
    if(!text) return false;
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch(e){
      try{
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly","readonly");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        return true;
      }catch(e2){
        return false;
      }
    }
  }

  function loadAll(){
    try{
      const raw = localStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    }catch(e){
      return [];
    }
  }
  function saveAll(arr){
    try{ localStorage.setItem(KEY, JSON.stringify(arr)); }catch(e){}
  }
  function prune(arr){
    const a = arr.filter(x=>x && typeof x === "object" && x.ts);
    a.sort((p,q)=> (q.ts||0) - (p.ts||0));
    return a.slice(0, MAX_ITEMS);
  }

  function getConfig(){
    const el = document.getElementById(CONFIG_ID);
    if(!el) return null;
    const cfg = safeJsonParse(el.textContent || "");
    if(!cfg || typeof cfg !== "object") return null;
    if(!cfg.tool) return null;
    cfg.inputs = Array.isArray(cfg.inputs) ? cfg.inputs : [];
    cfg.outputs = cfg.outputs && typeof cfg.outputs === "object" ? cfg.outputs : {};
    cfg.examples = Array.isArray(cfg.examples) ? cfg.examples : [];
    cfg.shareParams = cfg.shareParams && typeof cfg.shareParams === "object" ? cfg.shareParams : {};
    cfg.title = cfg.title || "도구";
    return cfg;
  }

  function readInputs(cfg){
    const out = {};
    cfg.inputs.forEach(inp=>{
      const id = (typeof inp === "string") ? inp : inp.id;
      if(!id) return;
      const el = document.getElementById(id);
      if(!el) return;
      out[id] = String(el.value ?? "").trim();
    });
    return out;
  }

  function readOutputs(cfg){
    const out = {};
    Object.entries(cfg.outputs).forEach(([k, sel])=>{
      const el = document.querySelector(sel);
      out[k] = el ? String(el.textContent || "").trim() : "";
    });
    return out;
  }

  function applyValues(values){
    if(!values || typeof values !== "object") return;
    Object.entries(values).forEach(([id, v])=>{
      const el = document.getElementById(id);
      if(!el) return;
      el.value = (v==null) ? "" : String(v);
      el.dispatchEvent(new Event("input", {bubbles:true}));
      el.dispatchEvent(new Event("change", {bubbles:true}));
    });
  }

  function buildShareUrl(cfg, inputs){
    try{
      const u = new URL(window.location.href);
      // clean old share params
      Object.values(cfg.shareParams).forEach(p=>{ if(p) u.searchParams.delete(p); });
      // write
      Object.entries(cfg.shareParams).forEach(([inputId, param])=>{
        if(!param) return;
        const v = inputs[inputId];
        if(v == null || v === "") return;
        u.searchParams.set(param, v);
      });
      // small marker so we can optionally show a subtle hint
      u.searchParams.set("_s", "1");
      return u.toString();
    }catch(e){
      return window.location.href;
    }
  }

  function restoreFromUrl(cfg){
    try{
      const u = new URL(window.location.href);
      const values = {};
      let touched = false;
      Object.entries(cfg.shareParams).forEach(([inputId, param])=>{
        if(!param) return;
        const v = u.searchParams.get(param);
        if(v == null) return;
        values[inputId] = v;
        touched = true;
      });
      if(touched) applyValues(values);
    }catch(e){}
  }

  function summarize(cfg, inputs, outputs){
    // Tool-specific concise summary used in history list.
    const tool = String(cfg.tool || "");
    if(tool === "margin"){
      const mode = inputs.mode === "2" ? "2-way" : "3-way";
      const odds = [inputs.o1, inputs.o2, inputs.o3].filter(Boolean).join("/");
      const m = outputs.margin || "";
      return `${mode} ${odds} · 마진 ${m || "-"}`;
    }
    if(tool === "ev"){
      const o = inputs.odds || "-";
      const p = inputs.p || "-";
      const evp = outputs.evPct || "";
      const j = outputs.judge || "";
      return `배당 ${o} · 승률 ${p}% · ${j || "EV"} ${evp || "-"}`;
    }
    if(tool === "odds"){
      const o = inputs.odds || "-";
      const pr = inputs.prob || "-";
      const pOut = outputs.probOut || "";
      const oOut = outputs.oddsOut || "";
      return `배당 ${o} → ${pOut || "-"} · 확률 ${pr}% → ${oOut || "-"}`;
    }
    if(tool === "kelly"){
      const o = inputs.odds || "-";
      const p = inputs.prob || "-";
      const frac = inputs.frac || "-";
      const cap = inputs.cap || "-";
      const kFinal = outputs.kFinal || "";
      return `배당 ${o} · 확률 ${p}% · ${frac}x · cap ${cap}% · 최종 ${kFinal || "-"}`;
    }

    if(tool === "slot"){
      const name = (inputs.slotName || "").trim();
      const rtp = inputs.rtp || "-";
      const volMap = {low:"저", mid:"중", high:"고", vhigh:"초고"};
      const vol = volMap[inputs.vol] || (inputs.vol || "");
      const bet = inputs.bet || "-";
      const spins = inputs.spins || "-";
      const loss = outputs.loss || "-";
      const total = outputs.total || "";
      const head = name ? `슬롯 ${name}` : "슬롯";
      const totPart = total ? ` · 총베팅 ${total}` : "";
      return `${head} · RTP ${rtp}% · ${vol}변동 · ${bet}×${spins}${totPart} · 기대손실 ${loss}`;
    }
    return `${cfg.title}`;
  }

  function ensureModal(){
    if(document.getElementById("_88stHistModal")) return;
    const m = document.createElement("div");
    m.id = "_88stHistModal";
    m.className = "stx-modal";
    m.innerHTML = `
      <div class="stx-modal-backdrop" data-close="1"></div>
      <div class="stx-modal-box" role="dialog" aria-modal="true" aria-label="최근 계산 히스토리">
        <div class="stx-modal-head">
          <div>
            <div class="stx-modal-title">최근 저장</div>
            <div class="stx-modal-sub">저장한 입력값을 빠르게 복원하거나 링크로 공유할 수 있어요.</div>
          </div>
          <button class="stx-icon-btn" type="button" data-close="1" aria-label="닫기">✕</button>
        </div>
        <div class="stx-modal-body">
          <div class="stx-hist-list" id="_88stHistList"></div>
        </div>
        <div class="stx-modal-foot">
          <button class="stx-btn ghost" type="button" id="_88stHistClear">전체 삭제</button>
          <div style="flex:1"></div>
          <button class="stx-btn" type="button" data-close="1">닫기</button>
        </div>
      </div>
    `;
    document.body.appendChild(m);
    m.addEventListener("click", (e)=>{
      const t = e.target;
      if(!(t instanceof HTMLElement)) return;
      if(t.dataset.close === "1") closeModal();
    });
    document.addEventListener("keydown", (e)=>{
      if(e.key === "Escape") closeModal();
    });
  }

  function openModal(){
    const m = document.getElementById("_88stHistModal");
    if(!m) return;
    m.classList.add("open");
  }
  function closeModal(){
    const m = document.getElementById("_88stHistModal");
    if(!m) return;
    m.classList.remove("open");
  }

  function renderList(cfg){
    const list = document.getElementById("_88stHistList");
    if(!list) return;

    const all = loadAll();
    const items = all.filter(x=>x.tool === cfg.tool);

    if(!items.length){
      list.innerHTML = `
        <div class="stx-empty">
          <div class="stx-empty-title">아직 저장된 항목이 없어요</div>
          <div class="stx-empty-sub">계산 후 <b>저장</b>을 누르면 여기에 쌓입니다.</div>
        </div>
      `;
      return;
    }

    list.innerHTML = "";
    items.slice(0, 10).forEach((it, idx)=>{
      const row = document.createElement("div");
      row.className = "stx-hist-item";
      const time = nowKSTLabel(it.ts);
      const summary = it.summary || "";
      row.innerHTML = `
        <div class="stx-hist-meta">
          <div class="stx-hist-time">${time}</div>
          <div class="stx-hist-sum">${escapeHtml(summary)}</div>
        </div>
        <div class="stx-hist-actions">
          <button class="stx-btn" type="button" data-act="restore" data-i="${idx}">복원</button>
          <button class="stx-btn ghost" type="button" data-act="copy" data-i="${idx}">링크</button>
          <button class="stx-btn danger" type="button" data-act="del" data-i="${idx}">삭제</button>
        </div>
      `;
      row.querySelectorAll("button").forEach(btn=>{
        btn.addEventListener("click", async ()=>{
          const act = btn.dataset.act;
          const pos = Number(btn.dataset.i);
          const target = items[pos];
          if(!target) return;
          if(act === "restore"){
            applyValues(target.inputs);
            toast("복원 완료");
            closeModal();
          }
          if(act === "copy"){
            const ok = await copyText(target.url || "");
            toast(ok ? "공유 링크 복사됨" : "복사 실패");
          }
          if(act === "del"){
            const next = prune(all.filter(x=>x !== target));
            saveAll(next);
            toast("삭제 완료");
            renderList(cfg);
          }
        });
      });
      list.appendChild(row);
    });
  }

  function escapeHtml(s){
    return String(s||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function mountBar(cfg){
    // Place inside the second card within the main grid (result side), if possible.
    const grid = document.querySelector('.grid');
    const resultCard = grid ? grid.querySelector(':scope > .card:nth-child(2)') : null;
    const host = resultCard || document.querySelector('.hero') || document.body;

    const bar = document.createElement("div");
    bar.className = "stx-bar";
    bar.innerHTML = `
      <div class="stx-left">
        <div class="stx-chiprow" id="_88stExampleRow"></div>
      </div>
      <div class="stx-right">
        <button type="button" class="stx-btn ghost" id="_88stShareBtn">공유</button>
        <button type="button" class="stx-btn" id="_88stSaveBtn">저장</button>
        <button type="button" class="stx-btn" id="_88stHistBtn">히스토리</button>
      </div>
    `;

    // Insert neatly:
    // - odds page: bar sits above the two converter cards (covers both inputs)
    // - others: under result title (h2)
    if(cfg.tool === "odds" && grid){
      grid.insertAdjacentElement('beforebegin', bar);
    } else {
      const h2 = resultCard ? resultCard.querySelector('h2') : null;
      if(h2 && h2.parentNode) h2.insertAdjacentElement('afterend', bar);
      else host.appendChild(bar);
    }

    // examples
    const exRow = document.getElementById("_88stExampleRow");
    if(exRow && cfg.examples.length){
      cfg.examples.slice(0, 3).forEach(ex=>{
        const b = document.createElement("button");
        b.type = "button";
        b.className = "stx-chip";
        b.textContent = ex.label || "예시";
        b.addEventListener("click", ()=>{
          applyValues(ex.values || {});
          toast("예시 입력 적용");
        });
        exRow.appendChild(b);
      });
    } else if(exRow) {
      exRow.innerHTML = `<span class="stx-chip stx-chip--muted" aria-hidden="true">예시</span>`;
    }

    // actions
    $("#_88stShareBtn").addEventListener("click", async ()=>{
      const inputs = readInputs(cfg);
      const url = buildShareUrl(cfg, inputs);
      const ok = await copyText(url);
      toast(ok ? "공유 링크 복사됨" : "복사 실패");
    });

    $("#_88stSaveBtn").addEventListener("click", ()=>{
      const inputs = readInputs(cfg);
      const outputs = readOutputs(cfg);
      const url = buildShareUrl(cfg, inputs);
      const item = {
        tool: cfg.tool,
        title: cfg.title,
        ts: Date.now(),
        inputs,
        outputs,
        url,
        summary: summarize(cfg, inputs, outputs)
      };
      const all = loadAll();
      const next = prune([item, ...all]);
      saveAll(next);
      toast("저장 완료");
    });

    $("#_88stHistBtn").addEventListener("click", ()=>{
      ensureModal();
      renderList(cfg);
      const clearBtn = document.getElementById("_88stHistClear");
      if(clearBtn && !clearBtn.dataset.bound){
        clearBtn.dataset.bound = "1";
        clearBtn.addEventListener("click", ()=>{
          const all = loadAll();
          const next = prune(all.filter(x=>x.tool !== cfg.tool));
          saveAll(next);
          toast("전체 삭제 완료");
          renderList(cfg);
        });
      }
      openModal();
    });
  }

  function boot(){
    const cfg = getConfig();
    if(!cfg) return; // no-op

    // restore if share params exist
    restoreFromUrl(cfg);

    // mount UI
    mountBar(cfg);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
