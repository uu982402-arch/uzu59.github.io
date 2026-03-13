
const STORAGE_KEY = '88stAdminState_v3';
const DEFAULT_STATE = {
  promos: [
    { id: 'promo_1', status: 'on', order: 1, codeName: 'VEGAS', display: 'VEGAS', code: '6789', scope: ['웹','DM'], period: '상시', url: 'https://las403.com', notes: '메인 노출', startAt: '', endAt: '' },
    { id: 'promo_2', status: 'on', order: 2, codeName: '777', display: '777', code: '6767', scope: ['웹','DM'], period: '상시', url: 'https://82clf.com/', notes: '안정 운영', startAt: '', endAt: '' },
    { id: 'promo_3', status: 'on', order: 3, codeName: 'FIX', display: 'FIX', code: '7799', scope: ['웹','DM'], period: '상시', url: 'https://example.com/fix', notes: '테스트 링크', startAt: '', endAt: '' },
    { id: 'promo_4', status: 'on', order: 4, codeName: 'TPY', display: '태평양', code: 'kaka 자동기입', scope: ['웹','DM'], period: '상시', url: 'https://tpy-777.com/@kaka', notes: '코드:kaka 자동기입', startAt: '', endAt: '' },
    { id: 'promo_5', status: 'off', order: 5, codeName: 'NEW-A', display: '신규업체A', code: '9090', scope: ['웹'], period: '예약', url: 'https://example.com/new', notes: '예약 노출', startAt: '', endAt: '' }
  ],
  groups: [
    { id: 'grp_1', title: '축구정보방', chatId: '-100123456789', status: 'allowed', lastSeen: '5분 전', notes: '메인 운영방' },
    { id: 'grp_2', title: '테스트그룹', chatId: '-100987654321', status: 'blocked', lastSeen: '1일 전', notes: '테스트용' },
    { id: 'grp_3', title: '야구분석채널', chatId: '-100333444555', status: 'allowed', lastSeen: '34분 전', notes: '야구 전용' }
  ],
  texts: [
    { id: 'txt_1', key: 'playground.notice', group: 'playground', value: '인증 사이트 선택 → 코드 확인 → 텔레그램 분석\n\n인증 사이트 입장과 코드 확인은\n이 화면에서 빠르게 진행할 수 있습니다.\n\n배당 분석은 텔레그램에서\n이어서 이용하실 수 있습니다.', original: '인증 사이트 선택 → 코드 확인 → 텔레그램 분석\n\n인증 사이트 입장과 코드 확인은\n이 화면에서 빠르게 진행할 수 있습니다.\n\n배당 분석은 텔레그램에서\n이어서 이용하실 수 있습니다.' },
    { id: 'txt_2', key: 'tg_match_entry.intro', group: 'webapp', value: '분석할 경기를 선택해주세요. 배당 입력은 텔레그램에서 이어집니다.', original: '분석할 경기를 선택해주세요. 배당 입력은 텔레그램에서 이어집니다.' },
    { id: 'txt_3', key: 'odds.hero.subtitle', group: 'landing', value: '배당 분석 흐름으로 빠르게 이동하세요.', original: '배당 분석 흐름으로 빠르게 이동하세요.' }
  ],
  features: [
    { key: 'analysis.webapp.enabled', label: '경기 정보 웹앱 사용', desc: 'tg-match-entry 연결을 켜고 끕니다.', enabled: true },
    { key: 'results.quick_input_enabled', label: '결과 빠른 입력', desc: '적중 / 미적중 버튼과 빠른 입력 흐름을 사용합니다.', enabled: true },
    { key: 'history.capture_enabled', label: '기록 저장', desc: '분석 이력과 결과 회수를 기록합니다.', enabled: true },
    { key: 'promo.dm.enabled', label: 'DM 프로모 노출', desc: '개인 DM 대상 프로모 노출 기능입니다.', enabled: true },
    { key: 'promo.group.enabled', label: '그룹 프로모 노출', desc: '그룹방 대상 프로모 노출 기능입니다.', enabled: false }
  ],
  settings: [
    { key: 'conservative_level', label: '보수 안내 강도', type: 'select', value: '중간', options: ['낮음','중간','높음'] },
    { key: 'catalog_mode', label: '카탈로그 노출 범위', type: 'select', value: '확장', options: ['핵심','확장','전체'] },
    { key: 'result_notice', label: '결과 회수 안내', type: 'select', value: '표준', options: ['간단','표준','강조'] },
    { key: 'admin_note', label: '운영 메모', type: 'text', value: '내부 엔진 용어는 관리자 UI에서도 직접 노출하지 않습니다.' }
  ],
  landing: {
    tgMatchEntryUrl: 'https://88st.cloud/tg-match-entry/',
    oddsUrl: 'https://88st.cloud/odds/',
    playgroundUrl: 'https://88st.cloud/tg-odds/app',
    supportUrl: 'https://t.me/KAKAcloud',
    oddsButtonLabel: '배당분석 바로가기',
    supportButtonLabel: '텔레그램 문의',
    landingIntro: '스포츠 이용자에게 필요시 스포츠 분석 봇 지원 해드립니다. 문의 주세요.'
  },
  schedules: [
    { id: 'sch_1', title: '축구 뉴스 다이제스트', time: '09:00 / 13:00 / 18:00', status: true, type: 'news' },
    { id: 'sch_2', title: '글로벌 TOP3', time: '09:30 / 12:00 / 15:00 / 01:00', status: true, type: 'top3' },
    { id: 'sch_3', title: 'DM 프로모', time: '짝수 시간 00~02분', status: true, type: 'promo' },
    { id: 'sch_4', title: 'Odds Import', time: '15분 간격', status: false, type: 'feed' }
  ],
  systemLogs: [
    { id: 'log_1', type: 'system', level: 'INFO', source: 'news', message: 'soccer digest sent', time: '2026-03-10 09:00' },
    { id: 'log_2', type: 'system', level: 'WARN', source: 'dm-promo', message: 'copyMessage partial fail', time: '2026-03-10 08:02' },
    { id: 'log_3', type: 'result', level: 'INFO', source: 'results', message: 'latest pending result marked as hit', time: '2026-03-10 07:20' }
  ],
  auditLogs: [
    { id: 'audit_1', title: '프로모 링크 수정', meta: 'VEGAS URL 변경 · 관리자 8551197689 · 5분 전' },
    { id: 'audit_2', title: '그룹 허용 추가', meta: '축구정보방 등록 · 관리자 8551197689 · 17분 전' },
    { id: 'audit_3', title: '안내 문구 수정', meta: 'playground.notice 변경 · 관리자 8551197689 · 1시간 전' }
  ],
  admins: [
    { id: 'admin_1', name: 'primary-admin', telegramId: '8551197689', role: 'super_admin', active: true },
    { id: 'admin_2', name: 'manager', telegramId: '9999999999', role: 'admin', active: false }
  ],
  securityChecks: [
    { id: 'sec_1', title: 'Cloudflare Access', detail: '관리자 경로 /admin/* 보호 권장', state: 'warn' },
    { id: 'sec_2', title: '관리자 세션', detail: 'TTL 12시간 이하 권장', state: 'on' },
    { id: 'sec_3', title: '변경 이력', detail: '설정 변경 시 감사 로그 저장 권장', state: 'on' }
  ]
};

const panelMeta = {
  dashboard: { title: '운영 대시보드', subtitle: '오늘 상태, 광고 노출, 그룹 허용, 오류 로그를 빠르게 확인할 수 있습니다.' },
  promos: { title: '프로모 / 인증놀이터 관리', subtitle: '광고 업체 추가, 수정, 순서 변경, 숨김 처리를 한 화면에서 관리합니다.' },
  groups: { title: '그룹 관리', subtitle: '허용 그룹, 차단 그룹, 최근 활동, 메모를 빠르게 확인합니다.' },
  texts: { title: '키워드 / 문구 관리', subtitle: '상태 메시지, 안내 문구, 버튼 라벨, 키워드를 운영자 화면에서 관리합니다.' },
  analysis: { title: '배당 분석 설정', subtitle: '내부 엔진 수치 노출 없이 운영 옵션만 켜고 끄는 구조를 권장합니다.' },
  landing: { title: '웹앱 / 랜딩 관리', subtitle: 'tg-match-entry, odds, playground 링크와 버튼 문구를 관리합니다.' },
  schedules: { title: '스케줄 / 뉴스 관리', subtitle: '뉴스 발송, TOP3, 드립, 테스트 실행 상태를 정리합니다.' },
  logs: { title: '로그 / 이력', subtitle: '오류, 관리자 액션, 결과 회수 로그를 빠르게 살펴봅니다.' },
  security: { title: '권한 / 보안', subtitle: 'Cloudflare Access, 관리자 세션, 감사 로그 연동 구조를 정리합니다.' }
};

const state = loadState();
let activePanel = 'dashboard';
let selectedTextId = state.texts[0]?.id || null;
let toastTimer = null;

const API_BASE = `${location.origin}/tg-odds/admin-api`;
const ADMIN_KEY_STORAGE = '88stAdminApiKey_v1';
let apiEnabled = false;

function apiHeaders(withJson = true) {
  const headers = { accept: 'application/json' };
  const adminKey = localStorage.getItem(ADMIN_KEY_STORAGE) || '';
  if (adminKey) headers['x-admin-key'] = adminKey;
  if (withJson) headers['content-type'] = 'application/json';
  return headers;
}
async function apiFetch(path, options = {}) {
  const makeRequest = async () => fetch(`${API_BASE}${path}`, { ...options, headers: { ...apiHeaders(!(options.body instanceof FormData)), ...(options.headers || {}) } });
  let res = await makeRequest();
  if (res.status === 401) {
    const adminKey = window.prompt('관리자 키를 입력해주세요.', '') || '';
    if (adminKey) {
      localStorage.setItem(ADMIN_KEY_STORAGE, adminKey.trim());
      res = await makeRequest();
    }
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API ${res.status}`);
  }
  return await res.json();
}
function mergeRemoteState(payload) {
  if (!payload || typeof payload !== 'object') return;
  if (Array.isArray(payload.promos)) state.promos = payload.promos;
  if (Array.isArray(payload.groups)) state.groups = payload.groups;
  if (Array.isArray(payload.texts)) state.texts = payload.texts.map((item) => ({ ...item, original: item.original || item.value }));
  if (Array.isArray(payload.features)) state.features = payload.features;
  if (Array.isArray(payload.settings)) state.settings = payload.settings;
  if (payload.landing) state.landing = payload.landing;
  if (Array.isArray(payload.schedules)) state.schedules = payload.schedules;
  if (Array.isArray(payload.systemLogs)) state.systemLogs = payload.systemLogs;
  if (Array.isArray(payload.auditLogs)) state.auditLogs = payload.auditLogs;
  if (Array.isArray(payload.admins)) state.admins = payload.admins;
  if (Array.isArray(payload.securityChecks)) state.securityChecks = payload.securityChecks;
  if (!selectedTextId && state.texts[0]) selectedTextId = state.texts[0].id;
}
async function syncRemoteBootstrap(silent = false) {
  try {
    const data = await apiFetch('/bootstrap', { method: 'GET' });
    mergeRemoteState(data);
    apiEnabled = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderAll();
    if (!silent) showToast('관리자 API 연동 완료');
  } catch (err) {
    apiEnabled = false;
    if (!silent) showToast('관리자 API 연결 실패 · 로컬 모드로 동작합니다.', 'warn');
  }
}
async function syncRemoteAfterMutation(message, kind = 'success') {
  await syncRemoteBootstrap(true);
  renderAll();
  showToast(message, kind);
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return deepClone(DEFAULT_STATE);
    return mergeDefaults(JSON.parse(raw), DEFAULT_STATE);
  } catch {
    return deepClone(DEFAULT_STATE);
  }
}
function mergeDefaults(current, defaults) {
  if (Array.isArray(defaults)) return Array.isArray(current) ? current : deepClone(defaults);
  if (defaults && typeof defaults === 'object') {
    const out = {};
    for (const key of Object.keys(defaults)) out[key] = mergeDefaults(current?.[key], defaults[key]);
    for (const key of Object.keys(current || {})) if (!(key in out)) out[key] = current[key];
    return out;
  }
  return current ?? defaults;
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}
function pushAudit(title, meta) {
  state.auditLogs.unshift({ id: uid('audit'), title, meta });
  state.auditLogs = state.auditLogs.slice(0, 20);
}
function pushSystemLog(type, level, source, message) {
  state.systemLogs.unshift({ id: uid('log'), type, level, source, message, time: new Date().toLocaleString('ko-KR') });
  state.systemLogs = state.systemLogs.slice(0, 40);
}
function showToast(message, kind = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2200);
}
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}
function setActivePanel(panelId) {
  activePanel = panelId;
  document.querySelectorAll('.menu-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.panel === panelId);
  });
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === panelId);
  });
  const meta = panelMeta[panelId];
  const title = document.getElementById('panel-title');
  const subtitle = document.getElementById('panel-subtitle');
  if (title && meta) title.textContent = meta.title;
  if (subtitle && meta) subtitle.textContent = meta.subtitle;
}
function renderKPIs() {
  const el = document.getElementById('kpi-grid');
  if (!el) return;
  const activePromos = state.promos.filter((p) => p.status === 'on').length;
  const activeGroups = state.groups.filter((g) => g.status === 'allowed').length;
  const pendingResults = 87 + state.groups.length;
  const errors = state.systemLogs.filter((x) => x.level === 'ERROR').length;
  const items = [
    ['오늘 요청 수', '1,248', '전일 대비 +12.4%'],
    ['활성 그룹 수', activeGroups, '허용 그룹 기준'],
    ['활성 업체 수', activePromos, '웹/DM 노출 포함'],
    ['미정산 결과 수', pendingResults, '최근 7일 기준'],
    ['오류 수', errors, '최근 24시간']
  ];
  el.innerHTML = items.map(([label, value, sub]) => `<article class="kpi-card"><span>${label}</span><strong>${value}</strong><small>${sub}</small></article>`).join('');
}
function renderAuditList() {
  const el = document.getElementById('audit-list');
  if (!el) return;
  el.innerHTML = state.auditLogs.map((item) => `<article class="row-card"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.meta)}</p></article>`).join('') || '<div class="empty">이력이 없습니다.</div>';
}
function getPromoFilters() {
  return {
    q: (document.getElementById('promo-search')?.value || '').trim().toLowerCase(),
    status: document.getElementById('promo-status-filter')?.value || 'all',
    scope: document.getElementById('promo-scope-filter')?.value || 'all'
  };
}
function renderPromos() {
  const body = document.getElementById('promo-table-body');
  if (!body) return;
  const { q, status, scope } = getPromoFilters();
  const items = [...state.promos].sort((a,b)=>a.order-b.order).filter((item)=>{
    const hay = `${item.codeName} ${item.display} ${item.code} ${item.scope.join(' ')} ${item.url}`.toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (status !== 'all' && item.status !== status) return false;
    if (scope !== 'all' && !item.scope.includes(scope)) return false;
    return true;
  });
  body.innerHTML = items.map((item) => `
    <tr>
      <td><span class="status ${item.status}">${item.status === 'on' ? 'ON' : 'OFF'}</span></td>
      <td>${item.order}</td>
      <td>${escapeHtml(item.codeName)}</td>
      <td>${escapeHtml(item.display)}</td>
      <td>${escapeHtml(item.code)}</td>
      <td>${escapeHtml(item.scope.join(' / '))}</td>
      <td>${escapeHtml(item.period)}</td>
      <td>
        <div class="action-inline">
          <button class="primary" data-action="edit-promo" data-id="${item.id}">수정</button>
          <button data-action="duplicate-promo" data-id="${item.id}">복제</button>
          <button data-action="move-promo-up" data-id="${item.id}">위로</button>
          <button data-action="move-promo-down" data-id="${item.id}">아래로</button>
          <button class="${item.status === 'on' ? 'danger' : 'success'}" data-action="toggle-promo" data-id="${item.id}">${item.status === 'on' ? '숨김' : '노출'}</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="8"><div class="empty">조건에 맞는 업체가 없습니다.</div></td></tr>';
}
function getGroupFilters() {
  return {
    q: (document.getElementById('group-search')?.value || '').trim().toLowerCase(),
    status: document.getElementById('group-status-filter')?.value || 'all'
  };
}
function renderGroups() {
  const body = document.getElementById('group-table-body');
  if (!body) return;
  const { q, status } = getGroupFilters();
  const items = state.groups.filter((item)=>{
    const hay = `${item.title} ${item.chatId} ${item.notes}`.toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (status !== 'all' && item.status !== status) return false;
    return true;
  });
  body.innerHTML = items.map((item)=>`
    <tr>
      <td><span class="status ${item.status === 'allowed' ? 'on' : 'off'}">${item.status === 'allowed' ? '허용' : '차단'}</span></td>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.chatId)}</td>
      <td>${escapeHtml(item.lastSeen)}</td>
      <td>${escapeHtml(item.notes || '-')}</td>
      <td>
        <div class="action-inline">
          <button class="primary" data-action="edit-group" data-id="${item.id}">상세</button>
          <button class="success" data-action="allow-group" data-id="${item.id}">허용</button>
          <button class="danger" data-action="block-group" data-id="${item.id}">차단</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6"><div class="empty">조건에 맞는 그룹이 없습니다.</div></td></tr>';
}
function renderTexts() {
  const list = document.getElementById('text-list');
  if (!list) return;
  list.innerHTML = state.texts.map((item)=>`
    <button class="text-item ${item.id === selectedTextId ? 'active' : ''}" data-action="select-text" data-id="${item.id}">
      <strong>${escapeHtml(item.key)}</strong>
      <p>${escapeHtml(item.group)} · ${escapeHtml(item.value.slice(0, 72))}${item.value.length > 72 ? '…' : ''}</p>
    </button>
  `).join('');
  const selected = state.texts.find((x)=>x.id === selectedTextId) || state.texts[0];
  if (selected) {
    selectedTextId = selected.id;
    document.getElementById('text-key').value = selected.key;
    document.getElementById('text-group').value = selected.group;
    document.getElementById('text-value').value = selected.value;
  }
}
function renderAnalysis() {
  const featureList = document.getElementById('feature-list');
  if (featureList) {
    featureList.innerHTML = state.features.map((item)=>`
      <div class="toggle-row">
        <div>
          <strong>${escapeHtml(item.label)}</strong>
          <p>${escapeHtml(item.desc)}</p>
        </div>
        <label class="switch">
          <input type="checkbox" data-action="toggle-feature" data-key="${item.key}" ${item.enabled ? 'checked' : ''} />
          <span class="track"><span class="thumb"></span></span>
        </label>
      </div>
    `).join('');
  }
  const settingForm = document.getElementById('setting-form');
  if (settingForm) {
    settingForm.innerHTML = state.settings.map((item)=>{
      if (item.type === 'select') {
        return `<label>${escapeHtml(item.label)}<select data-action="change-setting" data-key="${item.key}">${item.options.map((opt)=>`<option value="${escapeHtml(opt)}" ${opt===item.value?'selected':''}>${escapeHtml(opt)}</option>`).join('')}</select></label>`;
      }
      return `<label>${escapeHtml(item.label)}<input type="text" data-action="change-setting" data-key="${item.key}" value="${escapeHtml(item.value)}" /></label>`;
    }).join('') + '<div class="actions"><button class="glass-btn primary" data-action="save-settings">설정 저장</button></div>';
  }
}
function renderLanding() {
  const form = document.getElementById('landing-form');
  if (!form) return;
  const landing = state.landing;
  form.innerHTML = `
    <label><span>tg-match-entry URL</span><input id="landing-tg-match" type="text" value="${escapeHtml(landing.tgMatchEntryUrl)}"></label>
    <label><span>odds URL</span><input id="landing-odds" type="text" value="${escapeHtml(landing.oddsUrl)}"></label>
    <label><span>playground URL</span><input id="landing-playground" type="text" value="${escapeHtml(landing.playgroundUrl)}"></label>
    <label><span>텔레그램 문의 URL</span><input id="landing-support" type="text" value="${escapeHtml(landing.supportUrl)}"></label>
    <label><span>배당분석 버튼 문구</span><input id="landing-odds-label" type="text" value="${escapeHtml(landing.oddsButtonLabel)}"></label>
    <label><span>문의 버튼 문구</span><input id="landing-support-label" type="text" value="${escapeHtml(landing.supportButtonLabel)}"></label>
    <label class="full"><span>운영 안내 문구</span><textarea id="landing-intro">${escapeHtml(landing.landingIntro)}</textarea></label>
  `;
}
function renderSchedules() {
  const list = document.getElementById('schedule-list');
  const logList = document.getElementById('schedule-log-list');
  if (list) {
    list.innerHTML = state.schedules.map((item)=>`
      <div class="schedule-item">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.time)}</p>
        <div class="actions top-gap">
          <button class="glass-btn small ${item.status ? 'danger' : 'success'}" data-action="toggle-schedule" data-id="${item.id}">${item.status ? '중지' : '시작'}</button>
        </div>
      </div>
    `).join('');
  }
  if (logList) {
    const scheduleLogs = state.systemLogs.filter((x)=>['news','dm-promo'].includes(x.source) || x.type==='schedule');
    logList.innerHTML = scheduleLogs.map((item)=>`<div class="row-card"><strong>[${escapeHtml(item.level)}] ${escapeHtml(item.source)}</strong><p>${escapeHtml(item.message)} · ${escapeHtml(item.time)}</p></div>`).join('') || '<div class="empty">스케줄 로그가 없습니다.</div>';
  }
}
function renderLogs() {
  const type = document.getElementById('log-type-filter')?.value || 'all';
  const list = document.getElementById('log-list');
  if (!list) return;
  let entries = [];
  if (type === 'all' || type === 'system') entries = entries.concat(state.systemLogs.map((x)=>({kind:'system', ...x})));
  if (type === 'all' || type === 'audit') entries = entries.concat(state.auditLogs.map((x)=>({kind:'audit', level:'INFO', source:'admin', message:x.title, time:x.meta})));
  if (type === 'all' || type === 'result') entries = entries.concat(state.systemLogs.filter((x)=>x.type === 'result').map((x)=>({kind:'result', ...x})));
  list.innerHTML = entries.map((item)=>`<article class="log-entry"><strong>[${escapeHtml(item.level)}] ${escapeHtml(item.message)}</strong><div class="log-meta">${escapeHtml(item.source || item.kind)} · ${escapeHtml(item.time)}</div></article>`).join('') || '<div class="empty">표시할 로그가 없습니다.</div>';
}
function renderSecurity() {
  const adminBody = document.getElementById('admin-table-body');
  if (adminBody) {
    adminBody.innerHTML = state.admins.map((item)=>`<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.telegramId)}</td><td>${escapeHtml(item.role)}</td><td><span class="status ${item.active ? 'on' : 'off'}">${item.active ? '활성' : '비활성'}</span></td></tr>`).join('');
  }
  const secList = document.getElementById('security-list');
  if (secList) {
    secList.innerHTML = state.securityChecks.map((item)=>`<div class="security-item"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p><span class="status ${item.state === 'on' ? 'on' : item.state === 'warn' ? 'warn' : 'off'}">${item.state === 'on' ? '권장' : item.state === 'warn' ? '확인 필요' : '비활성'}</span></div>`).join('');
  }
}
function renderAll() {
  renderKPIs();
  renderAuditList();
  renderPromos();
  renderGroups();
  renderTexts();
  renderAnalysis();
  renderLanding();
  renderSchedules();
  renderLogs();
  renderSecurity();
}
function openModal({ title, subtitle, body }) {
  const modal = document.getElementById('modal');
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-subtitle').textContent = subtitle || '';
  document.getElementById('modal-body').innerHTML = body;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}
function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.getElementById('modal-body').innerHTML = '';
}
function promoFormHtml(item = {}) {
  return `
    <div class="form">
      <label>업체명<input id="promo-codeName" type="text" value="${escapeHtml(item.codeName || '')}"></label>
      <label>표시명<input id="promo-display" type="text" value="${escapeHtml(item.display || '')}"></label>
      <label>코드<input id="promo-code" type="text" value="${escapeHtml(item.code || '')}"></label>
      <label>URL<input id="promo-url" type="text" value="${escapeHtml(item.url || '')}"></label>
      <label>노출 위치<select id="promo-scope"><option value="웹 / DM">웹 / DM</option><option value="웹">웹</option><option value="DM">DM</option><option value="그룹">그룹</option></select></label>
      <label>운영 메모<textarea id="promo-notes">${escapeHtml(item.notes || '')}</textarea></label>
      <div class="actions">
        <button class="glass-btn primary" data-action="save-promo" data-id="${item.id || ''}">저장</button>
        <button class="glass-btn" data-action="close-modal">닫기</button>
      </div>
    </div>`;
}
function groupFormHtml(item = {}) {
  return `
    <div class="form">
      <label>그룹명<input id="group-title" type="text" value="${escapeHtml(item.title || '')}"></label>
      <label>chat_id<input id="group-chatId" type="text" value="${escapeHtml(item.chatId || '')}"></label>
      <label>메모<textarea id="group-notes">${escapeHtml(item.notes || '')}</textarea></label>
      <div class="actions">
        <button class="glass-btn primary" data-action="save-group" data-id="${item.id || ''}">저장</button>
        <button class="glass-btn" data-action="close-modal">닫기</button>
      </div>
    </div>`;
}
function findPromo(id) { return state.promos.find((x)=>x.id===id); }
function findGroup(id) { return state.groups.find((x)=>x.id===id); }
async function handleAction(action, target) {
  const id = target.dataset.id;
  switch (action) {
    case 'switch-panel':
      setActivePanel(target.dataset.targetPanel);
      return;
    case 'quick-add-promo':
    case 'new-promo':
      setActivePanel('promos');
      openModal({ title: '신규 업체 추가', subtitle: '프로모 / 인증놀이터 항목을 등록합니다.', body: promoFormHtml() });
      return;
    case 'edit-promo': {
      const promo = findPromo(id); if (!promo) return;
      openModal({ title: `${promo.display} 수정`, subtitle: '링크, 코드, 노출 정보를 수정합니다.', body: promoFormHtml(promo) });
      return;
    }
    case 'save-promo': {
      const codeName = document.getElementById('promo-codeName')?.value.trim();
      const display = document.getElementById('promo-display')?.value.trim();
      const code = document.getElementById('promo-code')?.value.trim();
      const url = document.getElementById('promo-url')?.value.trim();
      const scope = document.getElementById('promo-scope')?.value || '웹 / DM';
      const notes = document.getElementById('promo-notes')?.value.trim() || '';
      if (!codeName || !display || !url) return showToast('업체명, 표시명, URL을 입력해주세요.', 'warn');
      const item = id ? findPromo(id) : null;
      const scopeArray = scope.split(' / ');
      if (apiEnabled) {
        const payload = { codeName, display, code, url, scope: scopeArray, notes };
        if (item) await apiFetch(`/promo-items/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        else await apiFetch('/promo-items', { method: 'POST', body: JSON.stringify(payload) });
        closeModal();
        await syncRemoteAfterMutation('프로모 항목이 저장되었습니다.');
        return;
      }
      if (item) {
        Object.assign(item, { codeName, display, code, url, scope: scopeArray, notes });
        pushAudit('프로모 항목 수정', `${display} 저장 · 관리자 8551197689 · 방금 전`);
      } else {
        state.promos.push({ id: uid('promo'), status: 'on', order: state.promos.length + 1, codeName, display, code, url, scope: scopeArray, period: '상시', notes, startAt:'', endAt:'' });
        pushAudit('프로모 항목 추가', `${display} 등록 · 관리자 8551197689 · 방금 전`);
      }
      pushSystemLog('system', 'INFO', 'promo', `${display} saved`);
      saveState(); closeModal(); showToast('프로모 항목이 저장되었습니다.');
      return;
    }
    case 'duplicate-promo': {
      const item = findPromo(id); if (!item) return;
      if (apiEnabled) {
        await apiFetch(`/promo-items/${id}/duplicate`, { method: 'POST' });
        await syncRemoteAfterMutation('업체가 복제되었습니다.');
        return;
      }
      const copy = deepClone(item); copy.id = uid('promo'); copy.order = state.promos.length + 1; copy.codeName = `${copy.codeName}-COPY`; copy.display = `${copy.display} 복사본`;
      state.promos.push(copy); pushAudit('프로모 항목 복제', `${item.display} 복제 · 관리자 8551197689 · 방금 전`); saveState(); showToast('업체가 복제되었습니다.'); return;
    }
    case 'toggle-promo': {
      const item = findPromo(id); if (!item) return;
      if (apiEnabled) {
        await apiFetch(`/promo-items/${id}/toggle`, { method: 'PATCH' });
        await syncRemoteAfterMutation(item.status === 'on' ? '업체를 숨김 처리했습니다.' : '업체를 다시 노출했습니다.');
        return;
      }
      item.status = item.status === 'on' ? 'off' : 'on';
      pushAudit('프로모 노출 상태 변경', `${item.display} → ${item.status.toUpperCase()} · 관리자 8551197689 · 방금 전`);
      saveState(); showToast(item.status === 'on' ? '업체를 다시 노출했습니다.' : '업체를 숨김 처리했습니다.'); return;
    }
    case 'move-promo-up':
    case 'move-promo-down': {
      const sorted = [...state.promos].sort((a,b)=>a.order-b.order);
      const index = sorted.findIndex((x)=>String(x.id)===String(id)); if (index < 0) return;
      const nextIndex = action === 'move-promo-up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= sorted.length) return showToast('더 이동할 수 없습니다.', 'warn');
      if (apiEnabled) {
        const clone = [...sorted];
        const current = clone[index]; const other = clone[nextIndex];
        clone[index] = other; clone[nextIndex] = current;
        await apiFetch('/promo-items/reorder', { method: 'POST', body: JSON.stringify({ ids: clone.map((item) => Number(item.id)) }) });
        await syncRemoteAfterMutation('노출 순서를 변경했습니다.');
        return;
      }
      const current = sorted[index]; const other = sorted[nextIndex];
      const temp = current.order; current.order = other.order; other.order = temp;
      pushAudit('프로모 순서 변경', `${current.display} 순서 이동 · 관리자 8551197689 · 방금 전`);
      saveState(); showToast('노출 순서를 변경했습니다.'); return;
    }
    case 'quick-add-group':
    case 'new-group':
      setActivePanel('groups');
      openModal({ title: '그룹 추가', subtitle: '허용할 그룹의 chat_id와 메모를 등록합니다.', body: groupFormHtml() });
      return;
    case 'edit-group': {
      const group = findGroup(id); if (!group) return;
      openModal({ title: `${group.title} 상세`, subtitle: '그룹 상태와 메모를 수정합니다.', body: groupFormHtml(group) });
      return;
    }
    case 'save-group': {
      const title = document.getElementById('group-title')?.value.trim();
      const chatId = document.getElementById('group-chatId')?.value.trim();
      const notes = document.getElementById('group-notes')?.value.trim() || '';
      if (!title || !chatId) return showToast('그룹명과 chat_id를 입력해주세요.', 'warn');
      const item = id ? findGroup(id) : null;
      if (apiEnabled) {
        const payload = { title, chatId, notes };
        if (item) await apiFetch(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        else await apiFetch('/groups', { method: 'POST', body: JSON.stringify(payload) });
        closeModal();
        await syncRemoteAfterMutation('그룹 정보가 저장되었습니다.');
        return;
      }
      if (item) {
        Object.assign(item, { title, chatId, notes });
        pushAudit('그룹 정보 수정', `${title} 저장 · 관리자 8551197689 · 방금 전`);
      } else {
        state.groups.push({ id: uid('grp'), title, chatId, notes, status: 'allowed', lastSeen: '방금 전' });
        pushAudit('그룹 허용 추가', `${title} 등록 · 관리자 8551197689 · 방금 전`);
      }
      pushSystemLog('system', 'INFO', 'groups', `${title} saved`);
      saveState(); closeModal(); showToast('그룹 정보가 저장되었습니다.'); return;
    }
    case 'allow-group': {
      const group = findGroup(id); if (!group) return;
      if (apiEnabled) {
        await apiFetch(`/groups/${id}/allow`, { method: 'PATCH' });
        await syncRemoteAfterMutation('그룹을 허용 상태로 변경했습니다.');
        return;
      }
      group.status = 'allowed'; group.lastSeen = '방금 전';
      pushAudit('그룹 허용 처리', `${group.title} 허용 · 관리자 8551197689 · 방금 전`);
      pushSystemLog('system','INFO','groups', `${group.title} allowed`);
      saveState(); showToast('그룹을 허용 상태로 변경했습니다.'); return;
    }
    case 'block-group': {
      const group = findGroup(id); if (!group) return;
      if (apiEnabled) {
        await apiFetch(`/groups/${id}/block`, { method: 'PATCH' });
        await syncRemoteAfterMutation('그룹을 차단 상태로 변경했습니다.', 'warn');
        return;
      }
      group.status = 'blocked'; group.lastSeen = '방금 전';
      pushAudit('그룹 차단 처리', `${group.title} 차단 · 관리자 8551197689 · 방금 전`);
      pushSystemLog('system','WARN','groups', `${group.title} blocked`);
      saveState(); showToast('그룹을 차단 상태로 변경했습니다.', 'warn'); return;
    }
    case 'select-text':
      selectedTextId = id; renderTexts(); return;
    case 'save-text': {
      const item = state.texts.find((x)=>x.id===selectedTextId); if (!item) return;
      item.value = document.getElementById('text-value')?.value || '';
      if (apiEnabled) {
        await apiFetch(`/ui-texts/${encodeURIComponent(item.key)}`, { method: 'PUT', body: JSON.stringify({ value: item.value }) });
        await syncRemoteAfterMutation('문구를 저장했습니다.');
        return;
      }
      pushAudit('문구 수정', `${item.key} 저장 · 관리자 8551197689 · 방금 전`);
      saveState(); showToast('문구를 저장했습니다.'); return;
    }
    case 'reset-text': {
      const item = state.texts.find((x)=>x.id===selectedTextId); if (!item) return;
      item.value = item.original;
      document.getElementById('text-value').value = item.original;
      if (apiEnabled) {
        await apiFetch(`/ui-texts/${encodeURIComponent(item.key)}`, { method: 'PUT', body: JSON.stringify({ value: item.original }) });
        await syncRemoteAfterMutation('원본 문구로 복원했습니다.', 'warn');
        return;
      }
      saveState(); showToast('원본 문구로 복원했습니다.', 'warn'); return;
    }
    case 'preview-text': {
      const item = state.texts.find((x)=>x.id===selectedTextId); if (!item) return;
      openModal({ title: item.key, subtitle: '현재 문구 미리보기', body: `<div class="surface" style="padding:0;border:none;box-shadow:none;background:transparent"><p style="white-space:pre-wrap">${escapeHtml(document.getElementById('text-value')?.value || item.value)}</p></div><div class="actions top-gap"><button class="glass-btn" data-action="close-modal">닫기</button></div>` });
      return;
    }
    case 'toggle-feature': {
      const item = state.features.find((x)=>x.key===target.dataset.key); if (!item) return;
      if (apiEnabled) {
        await apiFetch(`/features/${encodeURIComponent(item.key)}`, { method: 'PATCH' });
        await syncRemoteAfterMutation('기능 상태를 업데이트했습니다.');
        return;
      }
      item.enabled = !!target.checked;
      pushAudit('기능 토글 변경', `${item.label} → ${item.enabled ? 'ON' : 'OFF'} · 관리자 8551197689 · 방금 전`);
      saveState(); showToast('기능 상태를 업데이트했습니다.'); return;
    }
    case 'save-settings':
      if (apiEnabled) {
        for (const setting of state.settings.filter((x)=>x.key !== 'admin_note')) {
          await apiFetch(`/settings/${encodeURIComponent(setting.key)}`, { method: 'PUT', body: JSON.stringify({ value: setting.value }) });
        }
        await syncRemoteAfterMutation('운영 설정을 저장했습니다.');
        return;
      }
      pushAudit('분석 설정 저장', `운영 설정 저장 · 관리자 8551197689 · 방금 전`);
      saveState(); showToast('운영 설정을 저장했습니다.'); return;
    case 'change-setting': {
      const setting = state.settings.find((x)=>x.key===target.dataset.key); if (!setting) return;
      setting.value = target.value;
      return;
    }
    case 'save-landing': {
      state.landing.tgMatchEntryUrl = document.getElementById('landing-tg-match').value.trim();
      state.landing.oddsUrl = document.getElementById('landing-odds').value.trim();
      state.landing.playgroundUrl = document.getElementById('landing-playground').value.trim();
      state.landing.supportUrl = document.getElementById('landing-support').value.trim();
      state.landing.oddsButtonLabel = document.getElementById('landing-odds-label').value.trim();
      state.landing.supportButtonLabel = document.getElementById('landing-support-label').value.trim();
      state.landing.landingIntro = document.getElementById('landing-intro').value;
      if (apiEnabled) {
        await apiFetch('/landing-config', { method: 'PUT', body: JSON.stringify(state.landing) });
        await syncRemoteAfterMutation('랜딩 설정을 저장했습니다.');
        return;
      }
      pushAudit('랜딩/웹앱 설정 저장', `랜딩 링크 저장 · 관리자 8551197689 · 방금 전`);
      saveState(); showToast('랜딩 설정을 저장했습니다.'); return;
    }
    case 'preview-landing': {
      const url = document.getElementById('landing-odds').value.trim() || state.landing.oddsUrl;
      window.open(url, '_blank', 'noopener');
      showToast('새 탭에서 랜딩 페이지를 열었습니다.');
      return;
    }
    case 'toggle-schedule': {
      const item = state.schedules.find((x)=>x.id===id); if (!item) return;
      if (apiEnabled) {
        await apiFetch(`/schedules/${encodeURIComponent(id)}/toggle`, { method: 'PATCH' });
        await syncRemoteAfterMutation(item.status ? '스케줄을 중지했습니다.' : '스케줄을 다시 시작했습니다.', item.status ? 'warn' : 'success');
        return;
      }
      item.status = !item.status;
      pushAudit('스케줄 상태 변경', `${item.title} → ${item.status ? 'ON' : 'OFF'} · 관리자 8551197689 · 방금 전`);
      pushSystemLog('schedule', item.status ? 'INFO' : 'WARN', 'scheduler', `${item.title} ${item.status ? 'enabled' : 'disabled'}`);
      saveState(); showToast(item.status ? '스케줄을 다시 시작했습니다.' : '스케줄을 중지했습니다.', item.status ? 'success' : 'warn'); return;
    }
    case 'test-schedule':
    case 'quick-test':
      if (apiEnabled) {
        await apiFetch('/schedules/test-run', { method: 'POST' });
        await syncRemoteAfterMutation('테스트 실행 로그를 추가했습니다.');
        return;
      }
      pushSystemLog('schedule', 'INFO', 'scheduler', 'manual test run executed');
      pushAudit('테스트 실행', `수동 테스트 발송 · 관리자 8551197689 · 방금 전`);
      saveState(); showToast('테스트 실행 로그를 추가했습니다.'); return;
    case 'reset-demo':
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
      return;
    case 'close-modal':
      closeModal();
      return;
  }
}
function bindEvents() {
  document.querySelectorAll('.menu-item').forEach((button) => {
    button.addEventListener('click', () => setActivePanel(button.dataset.panel));
  });
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    event.preventDefault();
    Promise.resolve(handleAction(target.dataset.action, target)).catch((err) => {
      console.error(err);
      showToast('처리 중 오류가 발생했습니다.', 'warn');
    });
  });
  ['promo-search','promo-status-filter','promo-scope-filter'].forEach((id)=>{
    const el = document.getElementById(id); if (el) el.addEventListener('input', renderPromos), el.addEventListener('change', renderPromos);
  });
  ['group-search','group-status-filter'].forEach((id)=>{
    const el = document.getElementById(id); if (el) el.addEventListener('input', renderGroups), el.addEventListener('change', renderGroups);
  });
  const logFilter = document.getElementById('log-type-filter');
  if (logFilter) logFilter.addEventListener('change', renderLogs);
}
async function init() {
  bindEvents();
  renderAll();
  setActivePanel(activePanel);
  await syncRemoteBootstrap(true);
}
document.addEventListener('DOMContentLoaded', init);
