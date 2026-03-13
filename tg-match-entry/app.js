(() => {
  const tg = window.Telegram?.WebApp ?? null;
  const LS_KEYS = {
    favoriteLeagues: '88st.matchEntry.favoriteLeagues',
    recentPicks: '88st.matchEntry.recentPicks',
    recentLeagues: '88st.matchEntry.recentLeagues',
  };
  const stageMeta = [
    { code: 'ALL', name: '전체', desc: '선택한 종목 전체' },
    { code: 'LEAGUE', name: '리그', desc: '정규리그 중심' },
    { code: 'CLUB_CUP', name: '클럽대항전', desc: 'UCL · 컵 · 메이저' },
    { code: 'INTL', name: '국가대표', desc: '월드컵 · 국제대회' },
    { code: 'WOMEN', name: '여자', desc: '여자 경기' },
    { code: 'YOUTH', name: '유소년', desc: '연령별 대회' },
  ];
  const steps = [
    { key: 'sport', title: '종목', note: '스포츠 선택' },
    { key: 'league', title: '리그', note: '대회 선택' },
    { key: 'team', title: '경기', note: '팀 선택' },
    { key: 'summary', title: '완료', note: '텔레그램 적용' },
  ];
  const state = {
    catalog: null,
    sportCode: '',
    stage: 'ALL',
    regionFilter: 'ALL',
    leagueCode: '',
    homeTeamId: '',
    awayTeamId: '',
    favorites: [],
    recentPicks: [],
    recentLeagues: [],
    activeStep: 'sport',
  };

  const el = {
    toggleQuickBtn: document.getElementById('toggleQuickBtn'),
    quickPanel: document.getElementById('quickPanel'),
    stepTabs: document.getElementById('stepTabs'),
    sportsGrid: document.getElementById('sportsGrid'),
    sportCount: document.getElementById('sportCount'),
    stageTabsRail: document.getElementById('stageTabsRail'),
    regionSelect: document.getElementById('regionSelect'),
    favoriteRail: document.getElementById('favoriteRail'),
    recentRail: document.getElementById('recentRail'),
    favoriteLeagueBtn: document.getElementById('favoriteLeagueBtn'),
    clearRecentBtn: document.getElementById('clearRecentBtn'),
    leagueSearch: document.getElementById('leagueSearch'),
    leagueCount: document.getElementById('leagueCount'),
    leagueList: document.getElementById('leagueList'),
    teamCount: document.getElementById('teamCount'),
    homeSearch: document.getElementById('homeSearch'),
    awaySearch: document.getElementById('awaySearch'),
    homeSelect: document.getElementById('homeSelect'),
    awaySelect: document.getElementById('awaySelect'),
    manualHome: document.getElementById('manualHome'),
    manualAway: document.getElementById('manualAway'),
    kickoffInput: document.getElementById('kickoffInput'),
    stageLabelInput: document.getElementById('stageLabelInput'),
    summaryCard: document.getElementById('summaryCard'),
    copyPayloadBtn: document.getElementById('copyPayloadBtn'),
    sendTelegramBtn: document.getElementById('sendTelegramBtn'),
    toast: document.getElementById('toast'),
  };

  function toast(message) {
    el.toast.hidden = false;
    el.toast.textContent = message;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { el.toast.hidden = true; }, 1500);
  }

  function clean(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function pushCap(arr, item, limit = 8, match = (a, b) => a === b) {
    const next = [item, ...arr.filter((x) => !match(x, item))];
    return next.slice(0, limit);
  }

  function currentSport() {
    return state.catalog?.sports.find((sport) => sport.code === state.sportCode) ?? null;
  }

  function currentLeague() {
    return filteredLeagues().find((league) => league.code === state.leagueCode)
      || state.catalog?.leagues.find((league) => league.code === state.leagueCode)
      || null;
  }

  function currentTeams() {
    return currentLeague()?.teams || [];
  }

  function stageName(code) {
    return stageMeta.find((item) => item.code === code)?.name || code || '기타';
  }

  function regionLabel(league) {
    return clean(league?.countryName || league?.regionLabel || league?.region || '전체');
  }

  function filteredLeagues() {
    if (!state.catalog) return [];
    const query = clean(el.leagueSearch.value).toLowerCase();
    return state.catalog.leagues.filter((league) => {
      if (state.sportCode && league.sportCode !== state.sportCode) return false;
      if (state.stage !== 'ALL' && league.stage !== state.stage) return false;
      if (state.regionFilter !== 'ALL' && regionLabel(league) !== state.regionFilter) return false;
      if (!query) return true;
      return `${league.name} ${league.code} ${regionLabel(league)} ${league.countryName || ''}`.toLowerCase().includes(query);
    });
  }

  function filteredTeams(searchValue) {
    const query = clean(searchValue).toLowerCase();
    const teams = currentTeams().slice();
    if (!query) return teams;
    return teams.filter((team) => `${team.label} ${team.id}`.toLowerCase().includes(query));
  }

  function buildPayload() {
    const sport = currentSport();
    const league = currentLeague();
    const teams = currentTeams();
    const homeManual = clean(el.manualHome.value);
    const awayManual = clean(el.manualAway.value);
    const homeSel = teams.find((team) => team.id === state.homeTeamId) ?? null;
    const awaySel = teams.find((team) => team.id === state.awayTeamId) ?? null;
    const home = homeManual || homeSel?.label || '';
    const away = awayManual || awaySel?.label || '';
    if (!sport || !league || !home || !away || home === away) return null;

    const eventId = [sport.code, league.code, (homeSel?.id || home).slice(0, 24), (awaySel?.id || away).slice(0, 24)]
      .join('-')
      .replace(/[^A-Za-z0-9가-힣-]+/g, '-')
      .toLowerCase();

    return {
      kind: 'MATCH_PICK',
      v: 2,
      sportCode: sport.code,
      sportName: sport.name,
      leagueCode: league.code,
      leagueName: league.name,
      stageLabel: clean(el.stageLabelInput.value) || stageName(league.stage),
      countryName: clean(league.countryName || ''),
      regionLabel: regionLabel(league),
      homeTeam: { id: homeSel?.id || '', label: home },
      awayTeam: { id: awaySel?.id || '', label: away },
      kickoff: clean(el.kickoffInput.value),
      eventLabel: `${league.name} · ${home} vs ${away}`,
      eventId,
    };
  }

  function stepIndex(key) {
    return steps.findIndex((step) => step.key === key);
  }

  function stepAllowed(key) {
    if (key === 'sport') return true;
    if (key === 'league') return Boolean(state.sportCode);
    if (key === 'team') return Boolean(state.sportCode && state.leagueCode);
    if (key === 'summary') return Boolean(buildPayload());
    return false;
  }

  function gotoStep(key, force = false) {
    if (!force && !stepAllowed(key)) {
      if (key === 'league') toast('먼저 종목을 선택하세요');
      if (key === 'team') toast('먼저 리그를 선택하세요');
      if (key === 'summary') toast('홈팀과 원정팀을 먼저 선택하세요');
      return;
    }
    state.activeStep = key;
    renderStepTabs();
    document.querySelectorAll('.stage-card').forEach((node) => node.classList.toggle('active', node.id === `step-${key}`));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderStepTabs() {
    el.stepTabs.innerHTML = '';
    steps.forEach((step, idx) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'step-tab';
      const active = state.activeStep === step.key;
      const complete = idx < stepIndex(state.activeStep) && stepAllowed(step.key === 'summary' ? 'summary' : step.key);
      if (active) button.classList.add('active');
      if (complete) button.classList.add('complete');
      button.innerHTML = `<div><strong>${step.title}</strong><span>${step.note}</span></div><em>${idx + 1}</em>`;
      button.addEventListener('click', () => gotoStep(step.key));
      el.stepTabs.appendChild(button);
    });
  }

  function regionOptions() {
    const source = (state.catalog?.leagues || []).filter((league) => !state.sportCode || league.sportCode === state.sportCode);
    const labels = Array.from(new Set(source.map(regionLabel).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ko'));
    return ['ALL', ...labels];
  }

  function renderRegionOptions() {
    const options = regionOptions();
    if (!options.includes(state.regionFilter)) state.regionFilter = 'ALL';
    el.regionSelect.innerHTML = '';
    options.forEach((item) => {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = item === 'ALL' ? '전체' : item;
      option.selected = state.regionFilter === item;
      el.regionSelect.appendChild(option);
    });
  }

  function renderSports() {
    if (!state.catalog) return;
    el.sportsGrid.innerHTML = '';
    el.sportCount.textContent = `${state.catalog.sports.length}개`;
    const tpl = document.getElementById('sportChipTpl');
    state.catalog.sports.forEach((sport) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.innerHTML = `<strong>${sport.emoji} ${sport.name}</strong><span>${sport.code}</span>`;
      node.classList.toggle('active', state.sportCode === sport.code);
      node.addEventListener('click', () => {
        state.sportCode = sport.code;
        state.stage = 'ALL';
        state.regionFilter = 'ALL';
        state.leagueCode = '';
        state.homeTeamId = '';
        state.awayTeamId = '';
        el.leagueSearch.value = '';
        el.homeSearch.value = '';
        el.awaySearch.value = '';
        renderLeagues();
        renderTeams();
        renderSummary();
      });
      el.sportsGrid.appendChild(node);
    });
  }

  function renderStageRail() {
    el.stageTabsRail.innerHTML = '';
    const tpl = document.getElementById('stageChipTpl');
    stageMeta.forEach((item) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.textContent = item.name;
      node.classList.toggle('active', state.stage === item.code);
      node.addEventListener('click', () => {
        state.stage = item.code;
        state.leagueCode = '';
        state.homeTeamId = '';
        state.awayTeamId = '';
        renderLeagues();
        renderTeams();
        renderSummary();
      });
      el.stageTabsRail.appendChild(node);
    });
  }

  function saveRecentLeague(code) {
    if (!code) return;
    state.recentLeagues = pushCap(state.recentLeagues, code, 12);
    writeJson(LS_KEYS.recentLeagues, state.recentLeagues);
  }

  function saveRecentPick(payload) {
    state.recentPicks = pushCap(state.recentPicks, payload, 10, (a, b) => a.eventId === b.eventId);
    writeJson(LS_KEYS.recentPicks, state.recentPicks);
  }

  function toggleFavoriteCurrentLeague() {
    const league = currentLeague();
    if (!league) {
      toast('먼저 리그를 선택하세요');
      return;
    }
    if (state.favorites.includes(league.code)) {
      state.favorites = state.favorites.filter((code) => code !== league.code);
      toast('즐겨찾기 해제');
    } else {
      state.favorites = pushCap(state.favorites, league.code, 18);
      toast('즐겨찾기 저장');
    }
    writeJson(LS_KEYS.favoriteLeagues, state.favorites);
    renderRails();
  }

  function renderPillRail(target, items, buildText, emptyText, onClick) {
    target.innerHTML = '';
    if (!items.length) {
      target.classList.add('empty');
      target.textContent = emptyText;
      return;
    }
    target.classList.remove('empty');
    const tpl = document.getElementById('pillTpl');
    items.forEach((item) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.innerHTML = buildText(item);
      node.addEventListener('click', () => onClick(item));
      target.appendChild(node);
    });
  }

  function applyRecentPick(payload) {
    const league = state.catalog?.leagues.find((item) => item.code === payload.leagueCode);
    if (!league) {
      toast('카탈로그에 없는 경기입니다');
      return;
    }
    state.sportCode = payload.sportCode || league.sportCode;
    state.stage = league.stage || 'ALL';
    state.regionFilter = regionLabel(league);
    state.leagueCode = league.code;
    state.homeTeamId = payload.homeTeam?.id || '';
    state.awayTeamId = payload.awayTeam?.id || '';
    el.manualHome.value = payload.homeTeam?.label || '';
    el.manualAway.value = payload.awayTeam?.label || '';
    el.kickoffInput.value = payload.kickoff || '';
    el.stageLabelInput.value = payload.stageLabel || '';
    renderAll();
    gotoStep('summary', true);
  }

  function renderRails() {
    const favoriteLeagues = state.favorites.map((code) => state.catalog?.leagues.find((league) => league.code === code)).filter(Boolean);
    renderPillRail(
      el.favoriteRail,
      favoriteLeagues,
      (league) => `<strong>${league.name}</strong><span>${regionLabel(league)} · ${stageName(league.stage)}</span>`,
      '저장된 즐겨찾기 없음',
      (league) => {
        state.sportCode = league.sportCode;
        state.stage = league.stage || 'ALL';
        state.regionFilter = regionLabel(league);
        state.leagueCode = league.code;
        state.homeTeamId = '';
        state.awayTeamId = '';
        el.homeSearch.value = '';
        el.awaySearch.value = '';
        renderAll();
        gotoStep('league', true);
      }
    );

    renderPillRail(
      el.recentRail,
      state.recentPicks,
      (pick) => `<strong>${pick.leagueName}</strong><span>${pick.homeTeam?.label || '-'} vs ${pick.awayTeam?.label || '-'}${pick.kickoff ? ` · ${pick.kickoff}` : ''}</span>`,
      '아직 선택한 경기 없음',
      applyRecentPick
    );
  }

  function renderLeagues() {
    const leagues = filteredLeagues();
    if (!state.leagueCode && leagues[0]) state.leagueCode = leagues[0].code;
    if (state.leagueCode && !leagues.some((league) => league.code === state.leagueCode)) state.leagueCode = leagues[0]?.code || '';
    el.leagueCount.textContent = `${leagues.length}개`;
    el.leagueList.innerHTML = '';
    const tpl = document.getElementById('leagueCardTpl');
    leagues.forEach((league) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.querySelector('.league-name').textContent = league.name;
      node.querySelector('.league-meta').textContent = `${regionLabel(league)} · ${stageName(league.stage)}\n${league.code} · ${league.teams.length}팀`;
      node.classList.toggle('active', state.leagueCode === league.code);
      node.addEventListener('click', () => {
        state.leagueCode = league.code;
        state.homeTeamId = '';
        state.awayTeamId = '';
        el.homeSearch.value = '';
        el.awaySearch.value = '';
        saveRecentLeague(league.code);
        renderLeagues();
        renderTeams();
        renderSummary();
      });
      el.leagueList.appendChild(node);
    });
  }

  function fillSelect(select, teams, selectedId) {
    select.innerHTML = '';
    teams.forEach((team) => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = team.label;
      option.selected = selectedId === team.id;
      select.appendChild(option);
    });
  }

  function renderTeams() {
    const league = currentLeague();
    const homeTeams = filteredTeams(el.homeSearch.value);
    const awayTeams = filteredTeams(el.awaySearch.value);
    el.teamCount.textContent = league ? `${league.teams.length}팀` : '0팀';
    fillSelect(el.homeSelect, homeTeams, state.homeTeamId);
    fillSelect(el.awaySelect, awayTeams, state.awayTeamId);
  }

  function syncTelegramButton(payload) {
    if (!tg) return;
    tg.ready();
    tg.expand();
    const btn = tg.MainButton || tg.BottomButton;
    if (!btn) return;
    btn.setText(payload ? '텔레그램으로 적용' : '경기를 먼저 선택하세요');
    if (payload) btn.show(); else btn.hide();
    btn.onClick?.(() => {
      if (!payload) return;
      saveRecentPick(payload);
      tg.sendData(JSON.stringify(payload));
    });
  }

  function renderSummary() {
    const payload = buildPayload();
    if (!payload) {
      el.summaryCard.classList.add('empty');
      el.summaryCard.innerHTML = `
        <div class="summary-title">아직 경기 선택 전</div>
        <div class="summary-body">종목과 리그, 팀을 고르면 이곳에 텔레그램으로 전달될 경기 정보가 표시됩니다.</div>
      `;
      el.sendTelegramBtn.disabled = true;
      el.copyPayloadBtn.disabled = true;
      syncTelegramButton(null);
      renderStepTabs();
      return;
    }
    el.summaryCard.classList.remove('empty');
    el.summaryCard.innerHTML = `
      <div class="summary-title">${payload.eventLabel}</div>
      <div class="summary-body">종목: ${payload.sportName}
리그/대회: ${payload.leagueName}
권역: ${payload.countryName || payload.regionLabel || '미지정'}
구분: ${payload.stageLabel || '미입력'}
시간: ${payload.kickoff || '미입력'}

텔레그램에서는 이 경기 정보가 먼저 반영되고, 이후 배당과 적중·미적중만 빠르게 이어집니다.</div>
    `;
    el.sendTelegramBtn.disabled = false;
    el.copyPayloadBtn.disabled = false;
    syncTelegramButton(payload);
    renderStepTabs();
  }

  function renderAll() {
    renderStepTabs();
    renderSports();
    renderStageRail();
    renderRegionOptions();
    renderRails();
    renderLeagues();
    renderTeams();
    renderSummary();
  }

  async function copySummary() {
    const payload = buildPayload();
    if (!payload) return;
    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    saveRecentPick(payload);
    renderRails();
    toast('요약 복사 완료');
  }

  function sendToTelegram() {
    const payload = buildPayload();
    if (!payload) return;
    saveRecentPick(payload);
    renderRails();
    if (!tg?.sendData) {
      copySummary();
      toast('일반 브라우저에서는 요약만 복사됩니다');
      return;
    }
    tg.sendData(JSON.stringify(payload));
  }

  function bindNavigation() {
    document.querySelectorAll('[data-next]').forEach((button) => {
      button.addEventListener('click', () => gotoStep(button.getAttribute('data-next')));
    });
    document.querySelectorAll('[data-prev]').forEach((button) => {
      button.addEventListener('click', () => gotoStep(button.getAttribute('data-prev'), true));
    });
  }

  async function boot() {
    try {
      const res = await fetch('./data/catalog.88st.json', { cache: 'no-store' });
      state.catalog = await res.json();
    } catch (error) {
      console.error(error);
      toast('카탈로그 로딩 실패');
      return;
    }

    state.favorites = readJson(LS_KEYS.favoriteLeagues, []);
    state.recentPicks = readJson(LS_KEYS.recentPicks, []);
    state.recentLeagues = readJson(LS_KEYS.recentLeagues, []);
    state.sportCode = state.catalog.sports[0]?.code || '';

    const lastLeagueCode = state.recentLeagues[0];
    const lastLeague = state.catalog.leagues.find((league) => league.code === lastLeagueCode);
    if (lastLeague) {
      state.sportCode = lastLeague.sportCode;
      state.leagueCode = lastLeague.code;
      state.stage = lastLeague.stage || 'ALL';
      state.regionFilter = regionLabel(lastLeague);
      state.activeStep = 'league';
    }

    if (tg) {
      document.documentElement.style.setProperty('--primary', tg.themeParams?.button_color || '#3f7bff');
      document.documentElement.style.setProperty('--primary-2', tg.themeParams?.link_color || '#6ba9ff');
    }

    bindNavigation();
    el.toggleQuickBtn.addEventListener('click', () => {
      el.quickPanel.classList.toggle('is-collapsed');
      el.toggleQuickBtn.textContent = el.quickPanel.classList.contains('is-collapsed')
        ? '최근 선택 / 즐겨찾기 보기'
        : '최근 선택 / 즐겨찾기 접기';
    });
    el.leagueSearch.addEventListener('input', () => { renderLeagues(); renderSummary(); });
    el.regionSelect.addEventListener('change', () => {
      state.regionFilter = el.regionSelect.value;
      state.leagueCode = '';
      state.homeTeamId = '';
      state.awayTeamId = '';
      renderLeagues();
      renderTeams();
      renderSummary();
    });
    el.homeSearch.addEventListener('input', renderTeams);
    el.awaySearch.addEventListener('input', renderTeams);
    el.homeSelect.addEventListener('change', () => { state.homeTeamId = el.homeSelect.value; el.manualHome.value = ''; renderSummary(); });
    el.awaySelect.addEventListener('change', () => { state.awayTeamId = el.awaySelect.value; el.manualAway.value = ''; renderSummary(); });
    el.manualHome.addEventListener('input', () => { state.homeTeamId = ''; renderSummary(); });
    el.manualAway.addEventListener('input', () => { state.awayTeamId = ''; renderSummary(); });
    el.kickoffInput.addEventListener('input', renderSummary);
    el.stageLabelInput.addEventListener('input', renderSummary);
    el.copyPayloadBtn.addEventListener('click', copySummary);
    el.sendTelegramBtn.addEventListener('click', sendToTelegram);
    el.favoriteLeagueBtn.addEventListener('click', toggleFavoriteCurrentLeague);
    el.clearRecentBtn.addEventListener('click', () => {
      state.recentPicks = [];
      writeJson(LS_KEYS.recentPicks, state.recentPicks);
      renderRails();
      toast('최근 경기 비움');
    });

    renderAll();
    gotoStep(state.activeStep, true);
  }

  boot();
})();
