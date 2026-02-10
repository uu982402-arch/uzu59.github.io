/* 88ST History Hub (Luxe)
   - Renders recent saved calculations across tools.
   - Uses the same localStorage key as 88st-tool-history.js
   - Safe no-op unless a host exists (#_88stHistoryHub) or a button (#_88stGlobalHistoryBtn).
*/
(function(){
  "use strict";

  const KEY = "88st_tool_history_v1";
  const MAX_VIEW = 6;

  const TOOL_LABEL = {
    margin: "마진",
    ev: "EV",
    odds: "배당↔확률",
    kelly: "Kelly"
  };

  const $ = (sel, root=document)=> root.querySelector(sel);

  function escapeHtml(s){
    return String(s||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
      .replace(/'/g,"&#039;");
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
    }catch(e){
      return "-";
    }
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
      if(!Array.isArray(arr)) return [];
      return arr.filter(x=>x && typeof x === "object" && x.ts && x.url);
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
    return a.slice(0, 50);
  }

  function ensureModal(){
    if(document.getElementById("_88stHubModal")) return;

    const m = document.createElement("div");
    m.id = "_88stHubModal";
    m.className = "stx-modal";
    m.innerHTML = `
      <div class="stx-modal-backdrop" data-close="1"></div>
      <div class="stx-modal-box" role="dialog" aria-modal="true" aria-label="최근 저장 전체">
        <div class="stx-modal-head">
          <div>
            <div class="stx-modal-title">최근 저장 (전체)</div>
            <div class="stx-modal-sub">저장한 계산 링크를 다시 열거나, 링크를 복사할 수 있어요.</div>
          </div>
          <button class="stx-icon-btn" type="button" data-close="1" aria-label="닫기">✕</button>
        </div>
        <div class="stx-modal-body">
          <div class="stx-hist-list" id="_88stHubList"></div>
        </div>
        <div class="stx-modal-foot">
          <button class="stx-btn danger" type="button" id="_88stHubClear">전체 삭제</button>
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

    const clearBtn = document.getElementById("_88stHubClear");
    if(clearBtn){
      clearBtn.addEventListener("click", ()=>{
        saveAll([]);
        toast("전체 삭제 완료");
        renderModalList();
        renderInline();
      });
    }
  }

  function openModal(){
    const m = document.getElementById("_88stHubModal");
    if(!m) return;
    m.classList.add("open");
  }

  function closeModal(){
    const m = document.getElementById("_88stHubModal");
    if(!m) return;
    m.classList.remove("open");
  }

  function renderModalList(){
    const host = document.getElementById("_88stHubList");
    if(!host) return;

    const all = loadAll();
    if(!all.length){
      host.innerHTML = `
        <div class="stx-empty">
          <div class="stx-empty-title">저장된 항목이 없어요</div>
          <div class="stx-empty-sub">계산기에서 <b>저장</b>을 누르면 여기에 표시됩니다.</div>
        </div>
      `;
      return;
    }

    host.innerHTML = "";
    all.slice(0, 20).forEach((it)=>{
      const row = document.createElement("div");
      row.className = "stx-hist-item";
      const time = nowKSTLabel(it.ts);
      const tool = TOOL_LABEL[it.tool] || (it.tool || "도구");
      const sum = it.summary ? escapeHtml(it.summary) : "";

      row.innerHTML = `
        <div class="stx-hist-meta">
          <div class="stx-hist-time">${tool} · ${time}</div>
          <div class="stx-hist-sum">${sum || "-"}</div>
        </div>
        <div class="stx-hist-actions">
          <a class="stx-btn" href="${escapeHtml(it.url)}">열기</a>
          <button class="stx-btn ghost" type="button" data-act="copy">링크</button>
          <button class="stx-btn danger" type="button" data-act="del">삭제</button>
        </div>
      `;

      const copyBtn = row.querySelector('[data-act="copy"]');
      const delBtn = row.querySelector('[data-act="del"]');

      if(copyBtn){
        copyBtn.addEventListener("click", async ()=>{
          const ok = await copyText(it.url);
          toast(ok ? "링크 복사됨" : "복사 실패");
        });
      }

      if(delBtn){
        delBtn.addEventListener("click", ()=>{
          const next = prune(loadAll().filter(x=>x !== it));
          saveAll(next);
          toast("삭제 완료");
          renderModalList();
          renderInline();
        });
      }

      host.appendChild(row);
    });
  }

  function renderInline(){
    const host = document.getElementById("_88stHistoryHub");
    if(!host) return;

    const limit = Number(host.dataset.limit || MAX_VIEW);
    const all = loadAll();

    if(!all.length){
      host.innerHTML = `
        <div class="stx-empty">
          <div class="stx-empty-title">최근 저장이 비어 있어요</div>
          <div class="stx-empty-sub">계산기에서 <b>저장</b>을 누르면 여기에 표시됩니다.</div>
        </div>
      `;
      return;
    }

    const items = all.slice(0, Math.max(1, Math.min(12, limit)));

    host.innerHTML = `
      <div class="stx-hub">
        <div class="stx-hub-head">
          <div>
            <div class="stx-hub-title">최근 저장된 계산</div>
            <div class="stx-hub-sub">클릭하면 저장 당시 링크로 열립니다.</div>
          </div>
          <div class="stx-hub-actions">
            <button class="stx-btn ghost" type="button" id="_88stHubCopyLatest">최근 링크 복사</button>
            <button class="stx-btn" type="button" id="_88stHubOpen">전체 보기</button>
          </div>
        </div>
        <div class="stx-hist-list" id="_88stHubInlineList"></div>
      </div>
    `;

    const list = document.getElementById("_88stHubInlineList");
    if(!list) return;

    items.forEach((it)=>{
      const row = document.createElement("div");
      row.className = "stx-hist-item";
      const time = nowKSTLabel(it.ts);
      const tool = TOOL_LABEL[it.tool] || (it.tool || "도구");
      const sum = it.summary ? escapeHtml(it.summary) : "";

      row.innerHTML = `
        <div class="stx-hist-meta">
          <div class="stx-hist-time">${tool} · ${time}</div>
          <div class="stx-hist-sum">${sum || "-"}</div>
        </div>
        <div class="stx-hist-actions">
          <a class="stx-btn" href="${escapeHtml(it.url)}">열기</a>
          <button class="stx-btn ghost" type="button" data-act="copy">링크</button>
        </div>
      `;

      const copyBtn = row.querySelector('[data-act="copy"]');
      if(copyBtn){
        copyBtn.addEventListener("click", async ()=>{
          const ok = await copyText(it.url);
          toast(ok ? "링크 복사됨" : "복사 실패");
        });
      }

      list.appendChild(row);
    });

    const openBtn = document.getElementById("_88stHubOpen");
    if(openBtn){
      openBtn.addEventListener("click", ()=>{
        ensureModal();
        renderModalList();
        openModal();
      });
    }

    const copyLatest = document.getElementById("_88stHubCopyLatest");
    if(copyLatest){
      copyLatest.addEventListener("click", async ()=>{
        const latest = all[0];
        const ok = await copyText(latest ? latest.url : "");
        toast(ok ? "최근 링크 복사됨" : "복사 실패");
      });
    }
  }

  function bindGlobalButton(){
    const btn = document.getElementById("_88stGlobalHistoryBtn");
    if(!btn) return;
    btn.addEventListener("click", ()=>{
      ensureModal();
      renderModalList();
      openModal();
    });
  }

  function boot(){
    bindGlobalButton();
    renderInline();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
