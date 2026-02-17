/* v59 Fortune (VVVVIP) — deterministic daily brief, local-only */
(() => {
  'use strict';

  const TZ = 'Asia/Seoul';
  const LS_SIGN = 'st_fortune_sign_v1';

  const $ = (sel, root = document) => root.querySelector(sel);

  function kstDateKey() {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());
      const y = parts.find(p => p.type === 'year')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const d = parts.find(p => p.type === 'day')?.value;
      return `${y}-${m}-${d}`;
    } catch {
      // fallback: local date
      const dt = new Date();
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'fortune-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(6px)';
      el.style.transition = 'opacity .18s ease, transform .18s ease';
      setTimeout(() => el.remove(), 220);
    }, 1100);
  }

  // --- deterministic RNG (xmur3 + mulberry32)
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  function mulberry32(a) {
    return function () {
      let t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rngFor(...parts) {
    const seedFn = xmur3(parts.join('|'));
    return mulberry32(seedFn());
  }
  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }
  function int(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  // --- tone packs (luxury)
  const HEAD = [
    '오늘은 <b>속도보다 정확도</b>가 이기는 날입니다. 한 번 더 확인하면 손실이 줄어듭니다.',
    '기회는 많지만, <b>선택을 줄일수록</b> 결과가 깔끔해집니다.',
    '감각이 예민한 날입니다. 단, <b>충동은 신호가 아니라 소음</b>입니다.',
    '오늘의 키워드는 <b>정리</b>. 환경을 정리하면 판단이 정리됩니다.',
    '이길 날을 고르는 게 아니라, <b>실수할 날을 피하는</b> 쪽이 유리합니다.',
    '작은 이득을 지키는 날. <b>욕심을 낮출수록</b> 흐름이 안정됩니다.',
    '오늘은 강하게 밀기보다, <b>리듬을 관리</b>하는 쪽이 더 고급입니다.'
  ];

  const KEYWORDS = [
    '정확도', '절제', '정리', '타이밍', '안정', '균형', '집중', '메모', '체크리스트', '루틴'
  ];

  const COLORS = [
    '샴페인 골드', '오프화이트', '딥 네이비', '차콜 블랙', '오프화이트 그레이', '올리브 그린', '버건디', '코발트 블루'
  ];

  const NUMBERS = ['2', '7', '11', '18', '21', '28', '33', '39'];

  const MISSIONS = [
    '결정 전에 <b>10초 멈춤</b> — 한 번만 더 확인하기',
    '오늘은 <b>선택지를 1개 줄이기</b> — 덜 하는 게 이기는 날',
    '지갑/앱 정리 30초 — <b>불필요한 탭 닫기</b>',
    '메모 한 줄: “오늘은 무엇을 안 할까?”',
    '물 한 컵 + 스트레칭 20초 — <b>컨디션이 운을 만든다</b>'
  ];

  const SILLY = [
    '오늘은 ‘두 번 확인한 사람’이 이깁니다. 그냥… 두 번 확인하세요.',
    '행운은 멀리 있지 않습니다. 방금 열어둔 탭을 닫는 순간, 운이 따라옵니다.',
    '지갑이 얇으면 운이 두꺼워집니다. 아니면… 그냥 지갑이 얇습니다.',
    '오늘은 숫자 {n}이 눈에 띄면? 의미는 없습니다. 하지만 기분은 좋아집니다.',
    '오늘의 미신: 물건을 떨어뜨리면… 운이 빠져나간 게 아니라 <b>중력이 이긴 것</b>입니다.',
    '운이 안 풀리면? 손을 씻고 다시 시작하세요. 최소한 손은 깨끗해집니다.',
    '오늘은 “대박”보다 “무사”가 더 고급입니다. 무사히만 끝내도 승리.'
  ];

  const SIGN_NAMES = {
    aries: '양자리', taurus: '황소자리', gemini: '쌍둥이자리',
    cancer: '게자리', leo: '사자자리', virgo: '처녀자리',
    libra: '천칭자리', scorpio: '전갈자리', sagittarius: '사수자리',
    capricorn: '염소자리', aquarius: '물병자리', pisces: '물고기자리'
  };

  const MONEY = [
    '지출이 새어 나가기 쉬운 날. <b>구독/자동결제</b> 한 번만 점검하세요.',
    '작은 이득을 지키는 쪽이 유리합니다. <b>리스크를 줄이는 선택</b>이 돈이 됩니다.',
    '오늘은 “큰 한 방”보다 <b>작은 누수 차단</b>이 체감 효율이 큽니다.',
    '금전운은 무난. 다만 <b>즉흥 구매</b>가 전체 밸런스를 흔들 수 있어요.',
    '정리하면 생깁니다. <b>불필요한 항목 삭제</b>가 곧 절약입니다.'
  ];
  const HEALTH = [
    '집중이 오래가지만, 한 번 꺾이면 급격히 떨어집니다. <b>짧은 휴식</b>을 먼저 확보하세요.',
    '컨디션은 평범. 대신 <b>수면 빚</b>이 판단을 흐릴 수 있어요.',
    '오늘은 “속도”보다 “호흡”. <b>물 한 컵</b>이 생각보다 큰 차이를 만듭니다.',
    '몸이 가벼운 날. 다만 <b>과열</b>되기 쉬우니 템포를 조절하세요.',
    '긴장도가 높습니다. <b>목/어깨 스트레칭</b> 20초만 해도 체감이 좋아집니다.'
  ];
  const LOVE_BRIEF = [
    '관계는 설득보다 <b>정리된 말 한 문장</b>이 더 강합니다.',
    '오늘은 먼저 다가가기보다, <b>반응을 읽는 타이밍</b>이 중요합니다.',
    '확신이 없으면 질문을. <b>오해를 줄이는 한 마디</b>가 운을 바꿉니다.',
    '감정은 수치가 아닙니다. 오늘은 <b>온도</b>를 맞추는 날입니다.',
    '연락은 짧게, 진심은 길게. <b>무리한 결론</b>은 미루세요.'
  ];
  const RISK = [
    '“조금만 더”가 함정입니다. <b>한 번 더</b>를 줄이면 손실이 줄어듭니다.',
    '오늘은 <b>리벤지</b>가 가장 비싼 선택입니다.',
    '판단이 흐려질 땐 수치를. <b>기록/메모</b>가 방어선을 만듭니다.',
    '컨디션이 떨어지면 기준도 떨어집니다. <b>중단 기준</b>을 먼저 정하세요.',
    '확률이 아니라 <b>리듬</b>에 끌릴 수 있어요. 속도를 늦추세요.'
  ];

  const HEAD_LOVE = [
    '오늘의 관계운은 <b>정돈된 진심</b>이 핵심입니다. 말이 짧을수록 품격이 남습니다.',
    '감정이 예민해질 수 있는 날. 그래서 더 <b>부드러운 속도</b>가 필요합니다.',
    '오늘은 “정답”보다 “이해”. <b>상대의 리듬</b>을 먼저 맞춰보세요.',
    '연애운은 무난. 다만 <b>확인받고 싶은 마음</b>이 과하면 피로해집니다.'
  ];

  const NEWYEAR_HEAD = [
    '올해의 키워드는 <b>정리</b>. 덜어낼수록 속도가 붙습니다.',
    '올해는 <b>리스크를 줄이는 실력</b>이 성과를 만듭니다.',
    '올해는 <b>루틴</b>이 운입니다. 작은 반복이 큰 차이를 냅니다.',
    '올해는 <b>선택과 집중</b>. 넓히기보다 좁히는 쪽이 유리합니다.'
  ];
  const NEWYEAR_FOCUS = [
    '상반기에는 기반을, 하반기에는 결과를. <b>순서를 지키면</b> 흐름이 좋습니다.',
    '올해는 “확장”보다 <b>정교화</b>가 더 많은 이득을 줍니다.',
    '올해는 <b>기록</b>이 자산입니다. 숫자/메모가 곧 방향입니다.',
    '올해는 <b>관계 정리</b>가 체감 성과를 올립니다. 소음을 줄이세요.'
  ];
  const NEWYEAR_WARN = [
    '무리한 기대는 피로를 부릅니다. <b>기준을 낮추는 게 아니라</b>, 계획을 현실로 맞추세요.',
    '올해는 “한 번에”보다 “꾸준히”. <b>폭주</b>는 손실로 돌아올 수 있어요.',
    '올해는 <b>충동 구매/충동 결정</b>이 새는 구멍이 됩니다. 잠깐만 멈추세요.'
  ];

  function buildDaily(sign) {
    const day = kstDateKey();
    const rng = rngFor('fortune', day, sign);

    // score (premium: biased toward mid-high, with variance)
    const base = int(rng, 58, 86);
    const swing = int(rng, -6, 10);
    const score = Math.max(45, Math.min(95, base + swing));

    const head = pick(rng, HEAD);
    const keyword = pick(rng, KEYWORDS);
    const color = pick(rng, COLORS);
    const number = pick(rng, NUMBERS);
    const mission = pick(rng, MISSIONS);

    const sillyRng = rngFor('fortune_silly', day, sign);
    const silly = pick(sillyRng, SILLY).replace('{n}', number);

    const money = pick(rng, MONEY);
    const health = pick(rng, HEALTH);
    const love = pick(rng, LOVE_BRIEF);
    const risk = pick(rng, RISK);

    return { day, score, head, keyword, color, number, mission, silly, money, health, love, risk };
  }

  function buildLove(sign) {
    const day = kstDateKey();
    const rng = rngFor('fortune_love', day, sign);
    const score = Math.max(45, Math.min(95, int(rng, 52, 88) + int(rng, -4, 9)));
    const head = pick(rng, HEAD_LOVE);
    const keyword = pick(rng, ['온도', '배려', '타이밍', '정리', '진심', '유연함']);
    const color = pick(rng, ['로즈 베이지', '오프화이트', '딥 네이비', '샴페인 골드', '차콜 블랙']);
    const number = pick(rng, NUMBERS);
    const mission = pick(rng, [
      '한 문장으로 표현하기: “나는 지금 ___가 필요해.”',
      '연락은 짧게, <b>약속은 선명하게</b>',
      '감정이 올라오면 10분 뒤에 답장하기',
      '<b>감사</b> 한 마디를 먼저 보내기'
    ]);
    const love = pick(rng, LOVE_BRIEF);
    const risk = pick(rng, [
      '확인받고 싶은 마음이 과하면 관계가 피곤해집니다.',
      '결론을 서두르지 마세요. 오늘은 “정리”가 우선입니다.',
      '말의 톤이 운을 좌우합니다. 단어보다 <b>속도</b>를 조절하세요.'
    ]);
    const money = pick(rng, [
      '선물/지출은 작게, 마음은 크게. <b>과한 소비</b>는 피하세요.',
      '관계의 비용이 늘어날 수 있어요. <b>예산</b>을 먼저 정하세요.'
    ]);
    const health = pick(rng, HEALTH);
    const sillyRng = rngFor('fortune_silly', day, sign);
    const silly = pick(sillyRng, SILLY).replace('{n}', number);
    return { day, score, head, keyword, color, number, mission, silly, money, health, love, risk };
  }

  function buildNewYear(sign) {
    const day = kstDateKey();
    const year = day.slice(0, 4);
    const rng = rngFor('fortune_newyear', year, sign);
    const score = Math.max(45, Math.min(95, int(rng, 55, 90) + int(rng, -6, 8)));
    const head = pick(rng, NEWYEAR_HEAD);
    const keyword = pick(rng, ['정리', '루틴', '정교화', '절제', '집중', '선명함']);
    const color = pick(rng, COLORS);
    const number = pick(rng, NUMBERS);
    const mission = pick(rng, ['상반기: 기반 / 하반기: 결과', '올해는 “기록”을 습관으로', '하지 않을 리스트를 만들기', '작은 루틴 1개 고정']);
    const money = pick(rng, ['올해는 <b>새는 돈</b>을 막는 해. 구독/수수료를 정리하세요.', '큰 베팅보다 <b>안정적 반복</b>이 유리합니다.']);
    const health = pick(rng, ['올해는 컨디션이 성과를 좌우합니다. <b>수면</b>을 지키면 운이 따라옵니다.', '올해는 <b>폭주</b>를 피하세요. 템포가 곧 건강입니다.']);
    const love = pick(rng, ['관계는 넓히기보다 <b>정리</b>가 이득입니다.', '올해는 <b>신뢰</b>를 쌓는 해. 말보다 약속이 중요합니다.']);
    const risk = pick(rng, NEWYEAR_WARN);
    const sillyRng = rngFor('fortune_silly', year, sign);
    const silly = pick(sillyRng, SILLY).replace('{n}', number);
    const focus = pick(rng, NEWYEAR_FOCUS);
    return { day: `${year}`, score, head: `${head} ${focus}`, keyword, color, number, mission, silly, money, health, love, risk };
  }

  function summaryText(sign, data) {
    const sname = SIGN_NAMES[sign] || '별자리';
    return `[88 운 브리핑] ${data.day} · ${sname}\n점수: ${data.score}/100\n키워드: ${data.keyword}\n컬러: ${data.color}\n숫자: ${data.number}\n미션: ${stripTags(data.mission)}\n한 줄: ${stripTags(htmlToText(data.head))}`;
  }

  function htmlToText(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || '').trim();
  }

  function stripTags(s) {
    return String(s).replace(/<[^>]*>/g, '').trim();
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) {
      toast('이 브라우저는 “운세 듣기”를 지원하지 않습니다.');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR';
      u.rate = 0.98;
      u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    } catch {
      toast('운세 듣기 실행에 실패했습니다.');
    }
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('요약을 복사했습니다.');
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        toast('요약을 복사했습니다.');
      } catch {
        toast('복사에 실패했습니다.');
      }
      ta.remove();
    }
  }

  function mountWidget() {
    const root = $('[data-role="fortuneWidget"]');
    if (!root) return;

    const sel = $('#fortuneSign');
    const scoreEl = $('#fortuneScore');
    const dateEl = $('#fortuneDate');
    const headEl = $('#fortuneHead');
    const kwEl = $('#fortuneKeyword');
    const colorEl = $('#fortuneColor');
    const numEl = $('#fortuneNumber');
    const missionEl = $('#fortuneMission');
    const sillyBox = $('#fortuneSillyBox');
    const sillyText = $('#fortuneSillyText');

    const btnSpeak = $('#fortuneSpeak');
    const btnSilly = $('#fortuneSilly');
    const btnCopy = $('#fortuneCopy');

    const saved = localStorage.getItem(LS_SIGN);
    if (saved && sel) sel.value = saved;

    function render() {
      const sign = sel?.value || 'aries';
      localStorage.setItem(LS_SIGN, sign);

      const data = buildDaily(sign);

      scoreEl.textContent = String(data.score);
      dateEl.textContent = data.day;
      headEl.innerHTML = data.head;
      kwEl.textContent = data.keyword;
      colorEl.textContent = data.color;
      numEl.textContent = data.number;
      missionEl.innerHTML = data.mission;
      sillyText.textContent = htmlToText(data.silly);

      // ring progress: set --p (0..100)
      const ring = $('.fortune-ring-inner', root);
      if (ring) ring.style.setProperty('--p', String(data.score));

      // hide silly by default
      if (sillyBox) sillyBox.hidden = true;
    }

    sel?.addEventListener('change', render);

    btnSpeak?.addEventListener('click', () => {
      const sign = sel?.value || 'aries';
      const data = buildDaily(sign);
      const t = `${SIGN_NAMES[sign] || '오늘'} 운 브리핑. 점수 ${data.score}점. ${htmlToText(data.head)}. 행운 키워드 ${data.keyword}. 행운 컬러 ${data.color}. 행운 숫자 ${data.number}. 오늘의 미션. ${htmlToText(data.mission)}.`;
      speak(t);
    });

    btnSilly?.addEventListener('click', () => {
      const sign = sel?.value || 'aries';
      const data = buildDaily(sign);
      if (sillyBox) sillyBox.hidden = !sillyBox.hidden;
      if (sillyBox && !sillyBox.hidden) {
        speak(htmlToText(data.silly));
      }
    });

    btnCopy?.addEventListener('click', () => {
      const sign = sel?.value || 'aries';
      const data = buildDaily(sign);
      copy(summaryText(sign, data));
    });

    render();
  }

  function mountFortunePage() {
    const root = document.querySelector('[data-role="fortunePage"]');
    if (!root) return;

    const tabs = Array.from(document.querySelectorAll('[data-ftab]'));
    const scopeEl = document.getElementById('fpScope');
    const sel = document.getElementById('fpSign');

    const ring = document.getElementById('fpRing');
    const scoreEl = document.getElementById('fpScore');
    const dateEl = document.getElementById('fpDate');
    const headEl = document.getElementById('fpHead');

    const L1 = document.getElementById('fpL1');
    const L2 = document.getElementById('fpL2');
    const L3 = document.getElementById('fpL3');
    const L4 = document.getElementById('fpL4');
    const V1 = document.getElementById('fpV1');
    const V2 = document.getElementById('fpV2');
    const V3 = document.getElementById('fpV3');
    const V4 = document.getElementById('fpV4');

    const K1 = document.getElementById('fpK1');
    const K2 = document.getElementById('fpK2');
    const K3 = document.getElementById('fpK3');
    const K4 = document.getElementById('fpK4');
    const KV1 = document.getElementById('fpKV1');
    const KV2 = document.getElementById('fpKV2');
    const KV3 = document.getElementById('fpKV3');
    const KV4 = document.getElementById('fpKV4');

    const btnSpeak = document.getElementById('fpSpeak');
    const btnCopy = document.getElementById('fpCopy');
    const btnStop = document.getElementById('fpStop');

    const sillyBox = document.getElementById('fpSillyBox');
    const sillyText = document.getElementById('fpSillyText');

    const saved = localStorage.getItem(LS_SIGN);
    if (saved && sel) sel.value = saved;

    let activeTab = 'today';

    function setActive(tab) {
      activeTab = tab;
      tabs.forEach(b => b.classList.toggle('active', b.getAttribute('data-ftab') === tab));
      render();
    }

    function render() {
      const sign = sel?.value || 'aries';
      localStorage.setItem(LS_SIGN, sign);

      let data;
      let scopeName = '오늘 브리핑';
      if (activeTab === 'love') {
        data = buildLove(sign);
        scopeName = '연애 브리핑';
      } else if (activeTab === 'newyear') {
        data = buildNewYear(sign);
        scopeName = '신년 브리핑';
      } else if (activeTab === 'silly') {
        data = buildDaily(sign);
        scopeName = '쓸데없는 브리핑';
      } else {
        data = buildDaily(sign);
        scopeName = '오늘 브리핑';
      }

      if (scopeEl) scopeEl.textContent = scopeName;

      scoreEl.textContent = String(data.score);
      dateEl.textContent = (activeTab === 'newyear') ? `${data.day}년` : data.day;
      headEl.innerHTML = data.head;

      // labels per scope
      if (activeTab === 'newyear') {
        L1.textContent = '연간 키워드';
        L2.textContent = '추천 컬러';
        L3.textContent = '포인트 넘버';
        L4.textContent = '올해의 미션';
      } else if (activeTab === 'love') {
        L1.textContent = '관계 키워드';
        L2.textContent = '추천 컬러';
        L3.textContent = '포인트 넘버';
        L4.textContent = '오늘의 액션';
      } else if (activeTab === 'silly') {
        L1.textContent = '오늘의 키워드';
        L2.textContent = '오늘의 컬러';
        L3.textContent = '오늘의 숫자';
        L4.textContent = '쓸데없는 미션';
      } else {
        L1.textContent = '행운 키워드';
        L2.textContent = '행운 컬러';
        L3.textContent = '행운 숫자';
        L4.textContent = '미션';
      }

      V1.textContent = data.keyword;
      V2.textContent = data.color;
      V3.textContent = data.number;
      V4.innerHTML = data.mission;

      K1.textContent = (activeTab === 'love') ? '관계 리듬' : (activeTab === 'newyear' ? '금전 포커스' : '금전 브리핑');
      K2.textContent = (activeTab === 'newyear') ? '컨디션 포커스' : '컨디션 브리핑';
      K3.textContent = (activeTab === 'newyear') ? '관계 포커스' : '연애/관계 브리핑';
      K4.textContent = (activeTab === 'newyear') ? '주의 포인트' : '주의 포인트';

      KV1.innerHTML = data.money;
      KV2.innerHTML = data.health;
      KV3.innerHTML = data.love;
      KV4.innerHTML = data.risk;

      // ring progress
      if (ring) ring.style.setProperty('--p', String(data.score));

      if (sillyBox) {
        sillyText.textContent = htmlToText(data.silly);
        sillyBox.hidden = activeTab !== 'silly';
      }
    }

    tabs.forEach(btn => {
      btn.addEventListener('click', () => setActive(btn.getAttribute('data-ftab') || 'today'));
    });
    sel?.addEventListener('change', render);

    btnSpeak?.addEventListener('click', () => {
      const sign = sel?.value || 'aries';
      const d = (activeTab === 'love') ? buildLove(sign) : (activeTab === 'newyear' ? buildNewYear(sign) : buildDaily(sign));
      const label = (activeTab === 'newyear') ? '신년 브리핑' : (activeTab === 'love' ? '연애 브리핑' : '오늘 브리핑');
      const t = `${SIGN_NAMES[sign] || '오늘'} ${label}. 점수 ${d.score}점. ${htmlToText(d.head)}. 키워드 ${d.keyword}. 컬러 ${d.color}. 숫자 ${d.number}. ${htmlToText(d.mission)}.`;
      speak(t);
    });

    btnStop?.addEventListener('click', () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      toast('정지했습니다.');
    });

    btnCopy?.addEventListener('click', () => {
      const sign = sel?.value || 'aries';
      const d = (activeTab === 'love') ? buildLove(sign) : (activeTab === 'newyear' ? buildNewYear(sign) : buildDaily(sign));
      copy(summaryText(sign, d));
    });

    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    mountWidget();
    mountFortunePage();
  });
})();
