/* Fortune v62 — fixes + birth profile query + ban action + pro checklist */
(function(){
  'use strict';

  const STORAGE = {
    profile: '88st_fortune_profile_v2',
    widget: '88st_fortune_widget_v2'
  };

  const $ = (id)=>document.getElementById(id);

  function safeJsonParse(s, fb){ try{ return JSON.parse(s); }catch(_){ return fb; } }
  function lsRead(key, fb){ try{ const v = localStorage.getItem(key); return v ? safeJsonParse(v, fb) : fb; }catch(_){ return fb; } }
  function lsWrite(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(_){ /* ignore */ } }

  function pad2(n){ return String(n).padStart(2,'0'); }
  function todayKey(){
    const d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
  }

  // --- deterministic RNG (xmur3 + mulberry32)
  function xmur3(str){
    let h = 1779033703 ^ str.length;
    for(let i=0;i<str.length;i++){
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function(){
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= (h >>> 16);
      return h >>> 0;
    };
  }
  function mulberry32(a){
    return function(){
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rngFromSeed(seed){
    const h = xmur3(seed)();
    return mulberry32(h);
  }
  function pick(rng, arr){
    if(!arr || !arr.length) return '';
    return arr[Math.floor(rng() * arr.length)];
  }

  // --- sign & zodiac
  const SIGN_KO = {
    aries:'양자리', taurus:'황소자리', gemini:'쌍둥이자리', cancer:'게자리', leo:'사자자리', virgo:'처녀자리',
    libra:'천칭자리', scorpio:'전갈자리', sagittarius:'사수자리', capricorn:'염소자리', aquarius:'물병자리', pisces:'물고기자리'
  };

  const ZODIAC_KO = {
    rat:'쥐띠', ox:'소띠', tiger:'호랑이띠', rabbit:'토끼띠', dragon:'용띠', snake:'뱀띠',
    horse:'말띠', goat:'양띠', monkey:'원숭이띠', rooster:'닭띠', dog:'개띠', pig:'돼지띠'
  };

  const ZODIAC_ORDER = ['rat','ox','tiger','rabbit','dragon','snake','horse','goat','monkey','rooster','dog','pig'];

  function signFromDate(iso){
    // iso: YYYY-MM-DD
    if(!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const m = Number(iso.slice(5,7));
    const d = Number(iso.slice(8,10));
    if(!(m>=1 && m<=12 && d>=1 && d<=31)) return null;

    // Western zodiac boundaries
    const md = m*100 + d;
    if(md >= 321 && md <= 419) return 'aries';
    if(md >= 420 && md <= 520) return 'taurus';
    if(md >= 521 && md <= 620) return 'gemini';
    if(md >= 621 && md <= 722) return 'cancer';
    if(md >= 723 && md <= 822) return 'leo';
    if(md >= 823 && md <= 922) return 'virgo';
    if(md >= 923 && md <= 1022) return 'libra';
    if(md >= 1023 && md <= 1121) return 'scorpio';
    if(md >= 1122 && md <= 1221) return 'sagittarius';
    if(md >= 1222 || md <= 119) return 'capricorn';
    if(md >= 120 && md <= 218) return 'aquarius';
    if(md >= 219 && md <= 320) return 'pisces';
    return null;
  }

  function zodiacFromYear(year){
    const y = Number(year);
    if(!Number.isFinite(y) || y < 1900 || y > 2100) return null;
    // Simple solar-year mapping: 2008=rat etc. (year - 4) % 12 gives rat at 4)
    const idx = (y - 4) % 12;
    return ZODIAC_ORDER[(idx + 12) % 12];
  }

  // --- content pools (premium, concise)
  const KEYWORDS = ['집중', '정리', '타이밍', '절제', '역전', '분산', '확신', '리듬', '정교함', '관찰', '페이스', '현금흐름'];
  const COLORS = ['샴페인 골드', '오프화이트', '오프화이트+블랙', '딥 네이비', '스모키 그레이', '오프화이트+버건디', '차콜', '올리브'];
  const NUMBERS = ['3', '7', '11', '18', '21', '28', '33', '49'];

  const MISSIONS = {
    beginner: [
      '10분 정리(책상/탭/알림)로 “잡음”을 지우기',
      '물 1컵 + 스트레칭 60초, 리듬을 먼저 잡기',
      '오늘은 “한 번만” — 규칙을 단순하게',
      '결정은 늦게, 기록은 빨리(메모 3줄)'
    ],
    pro: [
      '세션 목표/손절을 숫자로 고정하고 시작하기',
      '한 번의 고점보다 “연속성”을 택하기',
      '정보는 추가하지 말고, 기준만 강화하기',
      '속도보다 정확도 — 체크리스트 3개만 통과'
    ],
    risk: [
      '오늘은 승부욕이 강해지는 날: “규칙 위반”을 금지',
      '과몰입 신호가 보이면 즉시 중단(알람 25분)',
      '자금/시간 둘 중 하나라도 제한이 없으면 시작 금지',
      '반드시 휴식 후 재개(물/호흡/걷기 5분)'
    ]
  };

  const HEADS = {
    today: {
      beginner: ['오늘은 “정리”가 이득을 만든다.', '리듬만 잡으면 결과가 따라온다.', '급한 판단만 피하면 무난하게 흐른다.'],
      pro: ['숫자와 규칙이 오늘의 무기다.', '확률보다 “규율”이 승률을 만든다.', '빈틈을 줄이면 체감이 달라진다.'],
      risk: ['충동이 강해질 수 있다. “중단 버튼”을 먼저 잡아라.', '오늘은 과감함보다 절제가 이긴다.', '손실 회복 본능이 올라온다 — 규칙 고정.']
    },
    love: {
      beginner: ['말 한마디가 분위기를 바꾼다.', '가벼운 관심 표현이 호감으로 연결된다.', '무심함보다 “확인”이 필요하다.'],
      pro: ['감정도 리스크 관리가 된다.', '기대치를 조정하면 관계가 편해진다.', '확신 대신 질문이 좋은 날.'],
      risk: ['오해가 커지기 쉬운 날: 단정 금지.', '감정 소비가 크다 — 거리두기 필요.', '연락/결정은 내일로 미루는 편이 낫다.']
    },
    newyear: {
      beginner: ['큰 변화보다 작은 습관이 답이다.', '올해는 “기초체력”이 성과를 만든다.', '흐름을 바꾸려면 환경부터.'],
      pro: ['올해는 레버리지보다 “복리”가 먹힌다.', '목표는 1개, 루틴은 3개로 고정.', '성과는 선택과 집중에서 나온다.'],
      risk: ['올해는 과속 금지: 무리한 확장은 손실로 연결.', '불필요한 경쟁을 내려놓는 게 이득.', '방향을 바꾸되, 속도는 줄여라.']
    },
    zodiac: {
      beginner: ['오늘은 컨디션을 먼저 챙기면 이득.', '작은 기회가 크게 보일 수 있다.', '느슨한 규칙을 조이면 흐름이 좋아진다.'],
      pro: ['관측 → 판단 → 실행 순서를 지켜라.', '리스크가 보이면 줄이는 게 실력.', '짧게, 정확하게.'],
      risk: ['연패/연승 착각에 주의. 기록이 답.', '오늘은 변동성이 커질 수 있다.', '규칙 위반이 손실로 이어질 수 있다.']
    },
    silly: {
      beginner: ['오늘은 “옆자리”가 행운 좌석일 수 있다.', '커피 한 잔이 타이밍을 바꾼다.', '기분 전환이 의외로 정답.'],
      pro: ['오늘의 승부는 “손가락”이 아니라 “기준”이 한다.', '카리스마는 조용한 체크리스트에서 나온다.', '프로는 흔들릴 때 더 느리게 움직인다.'],
      risk: ['오늘은 기세보다 브레이크가 이긴다.', '빈틈을 노리는 건 상대가 아니라 “내 충동”이다.', '승부욕이 커질수록 손절은 더 빠르게.']
    }
  };

  const KPI = {
    money: {
      beginner: ['지출을 줄이는 게 곧 수익이다.', '새로운 결제/충전은 잠시 보류.', '작은 금액부터 시작하면 좋다.'],
      pro: ['손절과 목표를 숫자로 고정할수록 유리.', '분산이 답: 한 번에 몰지 말 것.', '기록이 곧 자산이다.'],
      risk: ['추격매수/추격베팅 금지.', '오늘은 큰 금액이 불리하게 느껴질 수 있다.', '자금 잠금(한도) 설정 권장.']
    },
    body: {
      beginner: ['잠깐의 산책이 집중을 올린다.', '카페인보다 물이 먼저.', '목과 어깨를 풀어라.'],
      pro: ['휴식 타이머를 걸어라(25/5).', '피로가 오면 정확도가 깨진다.', '몸이 무거우면 속도를 줄여라.'],
      risk: ['피곤한 상태에서 결정을 내리면 손해.', '자극(술/과한 카페인) 줄이기.', '몸이 보내는 신호를 무시하지 마라.']
    },
    love: {
      beginner: ['상대의 말 끝을 한 번 더 들어라.', '짧은 칭찬이 분위기를 만든다.', '가벼운 약속이 관계를 부드럽게.'],
      pro: ['감정의 원인을 “사실/해석”으로 분리.', '기대치를 정리하면 갈등이 줄어든다.', '선 긋기/배려의 균형을 잡아라.'],
      risk: ['단정/추측 금지. 확인이 먼저.', '기분이 거칠면 메시지 전송은 보류.', '대화는 짧게, 휴식은 길게.']
    },
    caution: {
      beginner: ['급하게 결론 내리지 말 것.', '새로운 일은 작은 테스트부터.', '핸드폰 알림을 줄여라.'],
      pro: ['체크리스트 없이 시작 금지.', '손익을 “감정”으로 판단하지 말 것.', '몰입이 올라오면 즉시 휴식.'],
      risk: ['연승 착각/손실 회복 욕구 주의.', '규칙 위반 1번이 큰 손실로 연결.', '“한 번만 더” 금지.']
    }
  };

  const BAN_ACTIONS = {
    beginner: ['늦은 밤 과식', '충동 결제', '대충 넘어가기', '욕심내서 일정 추가', '알림 폭주 방치'],
    pro: ['손절 기준 없이 시작', '감정적 배팅/추격', '검증 없는 정보 신뢰', '연패 후 즉시 레버리지', '피로 상태에서 결정'],
    risk: ['연패 회복 베팅', '빚/대출/외상', '술/취기 상태 플레이', '시간 제한 없는 세션', '규칙 변경(중간에)']
  };

  const PRO_CHECK = [
    '세션 목표/손절(숫자) 고정',
    '베팅/행동 전 10초 멈춤',
    '기록(원인/결과) 1줄 남기기',
    '연패 시 “단계/금액” 자동 증가 금지',
    '타이밍 불리하면 쉬고 다시 보기',
    '승리 후 바로 늘리지 않기(고점 방어)'
  ];

  function normalizeLevel(v){
    return (v==='pro' || v==='risk') ? v : 'beginner';
  }

  function buildSeed(opts){
    const day = todayKey();
    const scope = opts.scope || 'today';
    const level = normalizeLevel(opts.level);
    const sign = opts.sign || '';
    const zodiac = opts.zodiac || '';
    const dob = opts.dob || '';
    const t = opts.time || '';
    const g = opts.gender || '';
    // Seed composition: day-locked, user-personalized
    return ['88st', day, scope, level, sign, zodiac, dob, t, g].join('|');
  }

  function scoreFromRng(rng, level){
    // keep within tasteful range
    const base = level==='risk' ? 38 : (level==='pro' ? 52 : 46);
    const span = level==='risk' ? 42 : (level==='pro' ? 44 : 50);
    return Math.max(18, Math.min(96, Math.round(base + rng()*span)));
  }

  function makeFortune(opts){
    const level = normalizeLevel(opts.level);
    const scope = opts.scope || 'today';
    const rng = rngFromSeed(buildSeed(opts));

    const score = scoreFromRng(rng, level);

    const head = pick(rng, (HEADS[scope] && HEADS[scope][level]) || HEADS.today[level]);
    const keyword = pick(rng, KEYWORDS);
    const color = pick(rng, COLORS);
    const number = pick(rng, NUMBERS);
    const mission = pick(rng, (MISSIONS[level] || MISSIONS.beginner));
    const ban = pick(rng, (BAN_ACTIONS[level] || BAN_ACTIONS.beginner));

    const kMoney = pick(rng, KPI.money[level] || KPI.money.beginner);
    const kBody  = pick(rng, KPI.body[level] || KPI.body.beginner);
    const kLove  = pick(rng, KPI.love[level] || KPI.love.beginner);
    const kCaut  = pick(rng, KPI.caution[level] || KPI.caution.beginner);

    const silly = pick(rng, (HEADS.silly[level] || HEADS.silly.beginner));

    // Pro checklist: deterministic selection (3 distinct)
    let proList = [];
    if(level === 'pro'){
      const pool = PRO_CHECK.slice();
      // shuffle with rng
      for(let i=pool.length-1;i>0;i--){
        const j = Math.floor(rng()* (i+1));
        const tmp = pool[i]; pool[i]=pool[j]; pool[j]=tmp;
      }
      proList = pool.slice(0,3);
    }

    return { score, head, keyword, color, number, mission, ban, kMoney, kBody, kLove, kCaut, silly, proList };
  }

  function setText(id, text){
    const el = $(id);
    if(el) el.textContent = (text==null ? '' : String(text));
  }

  function setRing(idOrEl, score){
    const el = (typeof idOrEl === 'string') ? $(idOrEl) : idOrEl;
    if(!el) return;
    el.style.setProperty('--p', String(score));
  }

  function toast(msg){
    if(!msg) return;
    let el = document.querySelector('.fortune-toast');
    if(!el){
      el = document.createElement('div');
      el.className = 'fortune-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>{ if(el) el.textContent=''; }, 2200);
  }

  // --- speech
  function speak(text){
    try{
      if(!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)){
        toast('이 브라우저는 음성 재생을 지원하지 않습니다.');
        return;
      }
      window.speechSynthesis.cancel();
      const ut = new SpeechSynthesisUtterance(text);
      ut.lang = 'ko-KR';
      ut.rate = 1.0;
      ut.pitch = 1.0;
      window.speechSynthesis.speak(ut);
    }catch(_){ toast('음성 재생을 실행할 수 없습니다.'); }
  }
  function stopSpeak(){
    try{ if('speechSynthesis' in window) window.speechSynthesis.cancel(); }catch(_){ /* ignore */ }
  }

  function copyToClipboard(text){
    const s = String(text||'').trim();
    if(!s) return;
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(s).then(()=>toast('복사 완료')).catch(()=>fallbackCopy(s));
    }else{
      fallbackCopy(s);
    }
  }
  function fallbackCopy(text){
    try{
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly','');
      ta.style.position='fixed';
      ta.style.opacity='0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast('복사 완료');
    }catch(_){ toast('복사 실패'); }
  }

  // --- profile persistence
  function loadProfile(){
    const p = lsRead(STORAGE.profile, {});
    return {
      dob: typeof p.dob==='string' ? p.dob : '',
      time: typeof p.time==='string' ? p.time : '',
      gender: typeof p.gender==='string' ? p.gender : '',
      sign: typeof p.sign==='string' ? p.sign : 'aries',
      zodiac: typeof p.zodiac==='string' ? p.zodiac : 'rat'
    };
  }
  function saveProfile(p){
    lsWrite(STORAGE.profile, {
      dob: p.dob||'', time: p.time||'', gender: p.gender||'',
      sign: p.sign||'aries', zodiac: p.zodiac||'rat'
    });
  }

  function applyDobToProfile(profile){
    if(!profile.dob) return profile;
    const s = signFromDate(profile.dob);
    const y = Number(profile.dob.slice(0,4));
    const z = zodiacFromYear(y);
    if(s) profile.sign = s;
    if(z) profile.zodiac = z;
    return profile;
  }

  // --- widget (main index)
  function initMainWidget(){
    const root = document.querySelector('[data-role="fortuneWidget"]');
    if(!root) return;

    const state = lsRead(STORAGE.widget, { level:'beginner' });
    let profile = applyDobToProfile(loadProfile());

    const dob = $('fortuneDob');
    const qbtn = $('fortuneQuery');
    const sign = $('fortuneSign');
    const level = $('fortuneLevel');

    if(dob) dob.value = profile.dob || '';
    if(sign) sign.value = profile.sign || 'aries';
    if(level) level.value = normalizeLevel(state.level);

    function render(){
      profile = loadProfile();
      profile.sign = sign ? sign.value : (profile.sign||'aries');
      profile = applyDobToProfile(profile);

      const lvl = normalizeLevel(level ? level.value : 'beginner');
      saveProfile(profile);
      lsWrite(STORAGE.widget, { level: lvl });

      const data = makeFortune({
        scope:'today',
        level:lvl,
        sign:profile.sign,
        zodiac:profile.zodiac,
        dob:profile.dob
      });

      setRing(root.querySelector('.fortune-ring-inner'), data.score);
      setText('fortuneScore', data.score);
      setText('fortuneDate', todayKey());
      const compact = root.classList.contains('fortune-compact');
      setText('fortuneHead', compact ? `점수 ${data.score} · 주의 ${data.ban} · 추천 ${data.keyword}` : data.head);
      setText('fortuneKeyword', data.keyword);
      setText('fortuneColor', data.color);
      setText('fortuneNumber', data.number);
      setText('fortuneMission', data.mission);
      setText('fortuneBan', data.ban);

      // update sign select if dob derived
      if(sign && profile.dob){
        const s2 = signFromDate(profile.dob);
        if(s2) sign.value = s2;
      }

      // handle silly box state
      const sillyBox = $('fortuneSillyBox');
      const sillyText = $('fortuneSillyText');
      if(sillyBox && sillyText){
        if(!sillyBox.hasAttribute('hidden')){
          sillyText.textContent = data.silly;
        }
      }
    }

    function onQuery(){
      profile = loadProfile();
      profile.dob = dob ? (dob.value || '') : '';
      profile = applyDobToProfile(profile);
      saveProfile(profile);
      if(sign) sign.value = profile.sign || 'aries';
      render();
    }

    if(dob){
      dob.addEventListener('change', ()=>{ /* do not auto-render without query */ });
    }
    if(qbtn){
      qbtn.addEventListener('click', onQuery);
    }
    if(sign){
      sign.addEventListener('change', ()=>{ render(); });
    }
    if(level){
      level.addEventListener('change', ()=>{ render(); });
    }

    const speakBtn = $('fortuneSpeak');
    if(speakBtn){
      speakBtn.addEventListener('click', ()=>{
        const lvl = normalizeLevel(level ? level.value : 'beginner');
        const data = makeFortune({ scope:'today', level:lvl, sign:(sign?sign.value:profile.sign), zodiac:profile.zodiac, dob:profile.dob });
        const text = `오늘의 운 브리핑. ${data.head} 행운 키워드 ${data.keyword}. 행운 컬러 ${data.color}. 행운 숫자 ${data.number}. 미션 ${data.mission}. 오늘의 금지 행동, ${data.ban}.`;
        speak(text);
      });
    }

    const sillyBtn = $('fortuneSilly');
    if(sillyBtn){
      sillyBtn.addEventListener('click', ()=>{
        const box = $('fortuneSillyBox');
        if(!box) return;
        const hidden = box.hasAttribute('hidden');
        if(hidden){ box.removeAttribute('hidden'); }
        else{ box.setAttribute('hidden',''); }
        render();
      });
    }

    const copyBtn = $('fortuneCopy');
    if(copyBtn){
      copyBtn.addEventListener('click', ()=>{
        const lvl = normalizeLevel(level ? level.value : 'beginner');
        const prof = applyDobToProfile(loadProfile());
        const data = makeFortune({ scope:'today', level:lvl, sign:(sign?sign.value:prof.sign), zodiac:prof.zodiac, dob:prof.dob });
        const signName = SIGN_KO[(sign?sign.value:prof.sign)] || '';
        const msg = `[88ST 오늘의 운 브리핑] (${signName}/${lvl==='pro'?'프로':(lvl==='risk'?'하이리스크':'초급')})\n`+
          `${data.head}\n`+
          `키워드: ${data.keyword} / 컬러: ${data.color} / 숫자: ${data.number}\n`+
          `미션: ${data.mission}\n`+
          `금지 행동: ${data.ban}`;
        copyToClipboard(msg);
      });
    }

    render();
  }

  // --- fortune page
  function initFortunePage(){
    const root = document.querySelector('[data-role="fortunePage"]');
    if(!root) return;

    let profile = applyDobToProfile(loadProfile());
    const dob = $('fpDob');
    const time = $('fpTime');
    const gender = $('fpGender');
    const qbtn = $('fpQuery');

    const sign = $('fpSign');
    const zodiac = $('fpZodiac');
    const level = $('fpLevel');

    if(dob) dob.value = profile.dob || '';
    if(time) time.value = profile.time || '';
    if(gender) gender.value = profile.gender || '';
    if(sign) sign.value = profile.sign || 'aries';
    if(zodiac) zodiac.value = profile.zodiac || 'rat';

    // default level: keep widget setting
    const w = lsRead(STORAGE.widget, { level:'beginner' });
    if(level) level.value = normalizeLevel(w.level);

    let curTab = 'today';

    function setTab(tab){
      curTab = tab;
      const btns = Array.from(root.querySelectorAll('.seg-row .seg'));
      btns.forEach(b=>b.classList.toggle('active', b.getAttribute('data-ftab')===tab));

      const scopeEl = $('fpScope');
      if(scopeEl){
        scopeEl.textContent = tab==='today' ? '오늘 브리핑' : (tab==='love' ? '연애 브리핑' : (tab==='newyear' ? '신년 브리핑' : (tab==='zodiac' ? '띠 브리핑' : '쓸데없는 브리핑')));
      }

      const pickSign = $('fpPickSign');
      const pickZod = $('fpPickZodiac');
      if(tab === 'zodiac'){
        if(pickSign) pickSign.setAttribute('hidden','');
        if(pickZod) pickZod.removeAttribute('hidden');
      }else{
        if(pickSign) pickSign.removeAttribute('hidden');
        if(pickZod) pickZod.setAttribute('hidden','');
      }

      const sillyBox = $('fpSillyBox');
      const kpis = $('fpKpis');
      const proCard = $('fpProCard');
      if(tab === 'silly'){
        if(sillyBox) sillyBox.removeAttribute('hidden');
        if(kpis) kpis.setAttribute('hidden','');
        if(proCard) proCard.setAttribute('hidden','');
      }else{
        if(sillyBox) sillyBox.setAttribute('hidden','');
        if(kpis) kpis.removeAttribute('hidden');
      }

      render();
    }

    function render(){
      profile = loadProfile();
      if(dob) profile.dob = dob.value || '';
      if(time) profile.time = time.value || '';
      if(gender) profile.gender = gender.value || '';

      profile.sign = sign ? sign.value : (profile.sign||'aries');
      profile.zodiac = zodiac ? zodiac.value : (profile.zodiac||'rat');
      profile = applyDobToProfile(profile);
      saveProfile(profile);

      // sync derived
      if(profile.dob){
        const s2 = signFromDate(profile.dob);
        if(sign && s2) sign.value = s2;
        const z2 = zodiacFromYear(Number(profile.dob.slice(0,4)));
        if(zodiac && z2) zodiac.value = z2;
      }

      const lvl = normalizeLevel(level ? level.value : 'beginner');
      lsWrite(STORAGE.widget, { level: lvl });

      const data = makeFortune({
        scope: curTab,
        level: lvl,
        sign: profile.sign,
        zodiac: profile.zodiac,
        dob: profile.dob,
        time: profile.time,
        gender: profile.gender
      });

      setRing('fpRing', data.score);
      setText('fpScore', data.score);
      setText('fpDate', todayKey());
      setText('fpHead', data.head);
      setText('fpV1', data.keyword);
      setText('fpV2', data.color);
      setText('fpV3', data.number);
      setText('fpV4', data.mission);
      setText('fpV5', data.ban);
      setText('fpKV1', data.kMoney);
      setText('fpKV2', data.kBody);
      setText('fpKV3', data.kLove);
      setText('fpKV4', data.kCaut);
      setText('fpSillyText', data.silly);

      // pro checklist card
      const proCard = $('fpProCard');
      const proListEl = $('fpProList');
      if(curTab !== 'silly' && lvl === 'pro'){
        if(proCard) proCard.removeAttribute('hidden');
        if(proListEl){
          proListEl.innerHTML = data.proList.map(s=>`<li>${escapeHtml(s)}</li>`).join('');
        }
      }else{
        if(proCard) proCard.setAttribute('hidden','');
        if(proListEl) proListEl.innerHTML = '';
      }

      // label tweaks per tab
      const l4 = $('fpL4');
      if(l4){
        l4.textContent = (curTab==='love') ? '관계 미션' : (curTab==='newyear' ? '올해 미션' : '미션');
      }
    }

    function onQuery(){
      profile = loadProfile();
      profile.dob = dob ? (dob.value || '') : '';
      profile.time = time ? (time.value || '') : '';
      profile.gender = gender ? (gender.value || '') : '';
      profile = applyDobToProfile(profile);
      saveProfile(profile);
      if(sign) sign.value = profile.sign || 'aries';
      if(zodiac) zodiac.value = profile.zodiac || 'rat';
      render();
    }

    const segRow = root.querySelector('.seg-row');
    if(segRow){
      segRow.addEventListener('click', (e)=>{
        const btn = e.target && e.target.closest('button[data-ftab]');
        if(!btn) return;
        setTab(btn.getAttribute('data-ftab'));
      });
    }

    if(qbtn) qbtn.addEventListener('click', onQuery);
    if(sign) sign.addEventListener('change', ()=>{ render(); });
    if(zodiac) zodiac.addEventListener('change', ()=>{ render(); });
    if(level) level.addEventListener('change', ()=>{ render(); });

    const speakBtn = $('fpSpeak');
    if(speakBtn){
      speakBtn.addEventListener('click', ()=>{
        const lvl = normalizeLevel(level ? level.value : 'beginner');
        const name = (curTab==='zodiac') ? (ZODIAC_KO[profile.zodiac]||'') : (SIGN_KO[profile.sign]||'');
        const data = makeFortune({ scope: curTab, level:lvl, sign: profile.sign, zodiac: profile.zodiac, dob: profile.dob, time: profile.time, gender: profile.gender });
        const text = `${name} ${curTab==='love'?'연애 브리핑':(curTab==='newyear'?'신년 브리핑':(curTab==='zodiac'?'띠 브리핑':'오늘 브리핑'))}. ${data.head} 키워드 ${data.keyword}. 미션 ${data.mission}. 금지 행동, ${data.ban}.`;
        speak(text);
      });
    }

    const copyBtn = $('fpCopy');
    if(copyBtn){
      copyBtn.addEventListener('click', ()=>{
        const lvl = normalizeLevel(level ? level.value : 'beginner');
        const name = (curTab==='zodiac') ? (ZODIAC_KO[(zodiac?zodiac.value:profile.zodiac)]||'') : (SIGN_KO[(sign?sign.value:profile.sign)]||'');
        const data = makeFortune({ scope: curTab, level:lvl, sign:(sign?sign.value:profile.sign), zodiac:(zodiac?zodiac.value:profile.zodiac), dob:(dob?dob.value:profile.dob), time:(time?time.value:profile.time), gender:(gender?gender.value:profile.gender) });
        const scopeName = curTab==='today' ? '오늘' : (curTab==='love' ? '연애' : (curTab==='newyear' ? '신년' : (curTab==='zodiac' ? '띠' : '쓸데없음')));
        let msg = `[88ST 운세 브리핑] ${scopeName} · ${name} · ${lvl==='pro'?'프로':(lvl==='risk'?'하이리스크':'초급')}\n`+
          `${data.head}\n`+
          `키워드: ${data.keyword} / 컬러: ${data.color} / 숫자: ${data.number}\n`+
          `미션: ${data.mission}\n`+
          `금지 행동: ${data.ban}`;
        if(lvl==='pro' && data.proList && data.proList.length){
          msg += `\n프로 체크: ${data.proList.join(' / ')}`;
        }
        copyToClipboard(msg);
      });
    }

    const stopBtn = $('fpStop');
    if(stopBtn) stopBtn.addEventListener('click', stopSpeak);

    // init
    setTab('today');
    render();
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, (c)=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  document.addEventListener('DOMContentLoaded', function(){
    initMainWidget();
    initFortunePage();
  });

})();
