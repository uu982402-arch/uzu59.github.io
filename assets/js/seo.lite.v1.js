/* 88ST.Cloud - SEO Keyword Tool (Lite, public, zero-cost)
 * No external API. Generates keyword clusters + title/meta drafts locally.
 */
(function(){
  'use strict';

  var ADV_KEY = 'seoLite_adv_open_v1';

  var $ = function(sel, root){ return (root||document).querySelector(sel); };
  var $$ = function(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); };

  function uniq(arr){
    var seen = Object.create(null);
    var out = [];
    for (var i=0;i<arr.length;i++){
      var v = String(arr[i] || '').trim();
      if(!v) continue;
      if(seen[v]) continue;
      seen[v]=1;
      out.push(v);
    }
    return out;
  }

  function pickN(arr, n){
    var a = arr.slice();
    // Fisher–Yates shuffle (deterministic-ish by seed if needed)
    for (var i=a.length-1;i>0;i--){
      var j = Math.floor(Math.random()*(i+1));
      var t=a[i]; a[i]=a[j]; a[j]=t;
    }
    return a.slice(0, Math.max(0, Math.min(n, a.length)));
  }

  function toToast(msg){
    var el = $('#seoLiteToast');
    if(!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toToast._t);
    toToast._t = setTimeout(function(){ el.classList.remove('on'); }, 1100);
  }

  async function copyText(text){
    try{
      if (navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(text);
        return true;
      }
    }catch(e){}

    try{
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly','');
      ta.style.position='fixed';
      ta.style.left='-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    }catch(e){
      return false;
    }
  }

  function downloadText(filename, text){
    try{
      var blob = new Blob([text], {type:'text/plain;charset=utf-8'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){
        URL.revokeObjectURL(url);
        a.remove();
      }, 30);
    }catch(e){}
  }

  var BANK = {
    // Core
    sports: {
      base: [
        '스포츠 분석', '배당 분석', '오즈무브', '공정배당', '오버라운드',
        'EV 계산', '켈리 기준', '마진 계산', '배당 확률 변환',
        '핸디캡', '오버언더', '승무패', '승률', '리스크 관리', 'ROI',
        '라인 변동', '배당 흐름', '시장 마진'
      ],
      niche: ['토토', '온라인 스포츠', '스포츠픽', '배당 계산기', '픽 분석', '스포츠 배팅', '고배당', '언더독']
    },
    soccer: {
      base: ['축구 분석', '축구 배당', '승무패 예측', '오버언더 기준', '핸디캡 기준', '득점 기대값', '라인업 변수'],
      niche: ['EPL', '챔피언스리그', 'K리그', '유럽축구', '축구픽']
    },
    basketball: {
      base: ['농구 분석', '농구 배당', '스프레드 기준', '토탈 기준', '페이스', '공격/수비 효율', '라인 변동'],
      niche: ['NBA', 'KBL', 'NCAA', '농구픽']
    },
    baseball: {
      base: ['야구 분석', '야구 배당', '선발 매치업', '불펜 변수', '득점 기대', '오버언더 기준'],
      niche: ['KBO', 'MLB', 'NPB', '야구픽']
    },
    esports: {
      base: ['e스포츠 분석', '맵/밴픽 변수', '2-way 배당', '승패 예측', '라인 변동'],
      niche: ['LOL', '발로란트', 'CS2', '도타', 'e스포츠픽']
    },

    // Casino
    casino: {
      base: ['카지노 확률', '하우스엣지', '세션 관리', '뱅크롤', '룰렛', '블랙잭', '리스크 관리'],
      niche: ['온라인카지노', '카지노 맛집', '카지노 추천', '입플', '롤링']
    },
    baccarat: {
      base: ['바카라 전략', '바카라 확률', '추세/흐름', '플레이어/뱅커', '타이/페어', '진입 타이밍'],
      niche: ['바카라 가이드', '바카라 패턴', '바카라 계산기']
    },
    roulette: {
      base: ['룰렛 확률', '룰렛 하우스엣지', '유럽 룰렛', '미국 룰렛', '컬러/홀짝', '세션 관리'],
      niche: ['룰렛 전략', '룰렛 가이드', '룰렛 배팅']
    },
    blackjack: {
      base: ['블랙잭 확률', '기본전략', '딜러 업카드', '카운팅', '하우스엣지', '리스크 관리'],
      niche: ['블랙잭 가이드', '블랙잭 전략', '블랙잭 룰']
    },
    slot: {
      base: ['슬롯 RTP', '슬롯 변동성', '맥스윈', '프라그마틱 RTP', '슬롯 분석', 'RTP 확인'],
      niche: ['슬롯맛집', '슬롯 추천', 'RTP 높은 슬롯', '프라그마틱 슬롯']
    },
    minigame: {
      base: ['미니게임 분석', '확률 추정', '연속/편차', '다음 확률', '리스크 태그', '승률 관리'],
      niche: ['미니게임맛집', '미니게임 추천', '사다리', '파워볼', '하이로우']
    },
    virtual: {
      base: ['버추얼 스포츠', '가상 경기', '시뮬레이션 배당', '공정확률', '오버라운드', '리스크 관리'],
      niche: ['가상스포츠', '버추얼 축구', '버추얼 농구']
    },

    // Promo / Community
    promo: {
      base: ['인증 사이트', '가입 코드', '보너스 조건', '롤링 규정', '출금 규정', '가입 혜택', '이벤트'],
      niche: ['안전한 토토사이트', '안전 토토', '온라인카지노 추천', '입플사이트', '먹튀검증']
    },
    community: {
      base: ['텔레그램 봇', '그룹 운영', '공지 자동화', '분석 봇', '브리핑', '운영 세팅'],
      niche: ['텔레그램 스포츠 분석', '그룹 운영자', '스포츠 분석 봇', '자동 공지']
    }
  };

  var INTENT = {
    howto: ['사용법', '하는법', '가이드', '정리', '예시', '입문'],
    calc: ['계산기', '계산', '변환', '공식', '자동 계산', '표'],
    strategy: ['전략', '룰', '체크리스트', '리스크', '기준', '팁'],
    review: ['추천', '비교', 'top', 'best', '선택', '후기'],
    definition: ['뜻', '정의', '개념', '용어', '의미'],
    faq: ['FAQ', '문제해결', '오류', '자주 묻는 질문', '해결 방법'],
    safety: ['안전', '검증', '주의', '체크', '주의사항'],
    bonus: ['보너스', '이벤트', '혜택', '프로모션', '가입 혜택'],
    template: ['템플릿', '양식', '문장 예시', '카피', '구성'],
    list: ['모음', '리스트', 'TOP10', '추천 리스트', '정리본'],
    seo: ['키워드', '메타', 'SEO', '구조(H2)', '클러스터']
  };

  var MOD = {
    luxe: ['정확한', '빠른', '깔끔한', '실전', '고급'],
    pro: ['데이터', '근거', '지표', '모델', '확률'],
    short: ['한눈에', '요약', '핵심', '3분', '간단'],
    newbie: ['초보', '입문', '쉬운', '처음', '기초'],
    mobile: ['모바일', '간단', '원클릭', '빠른 입력'],
    sales: ['혜택', '추천', '무료', '즉시', '확인'],
    calm: ['신뢰', '안정', '정리', '원칙', '안전'],
    neutral: ['객관', '기준', '체크', '정리', '보수'],
    community: ['커뮤니티', '공유', '참고', '의견', '토론']
  };

  function pickTopics(query, keywords){
    var seeds = [];
    var q = normalizeQuery(query);
    if(q){
      var parts = q.split(/[\/\,\|]+/g).map(function(x){return String(x||'').trim();}).filter(Boolean);
      seeds = seeds.concat(parts.length ? parts : [q]);
    }
    if(Array.isArray(keywords) && keywords.length){
      // only keep compact seeds (avoid longtail phrases)
      var k = keywords.filter(function(x){
        x = String(x||'').trim();
        return x && x.length <= 18;
      }).slice(0, 10);
      seeds = seeds.concat(k);
    }
    seeds = uniq(seeds);
    return seeds.slice(0, 3);
  }

  function normalizeQuery(q){
    var s = String(q || '').replace(/\s+/g,' ').trim();
    if(!s) return '';
    // cut extreme length
    if(s.length > 48) s = s.slice(0,48).trim();
    return s;
  }

  function buildKeywords(catKey, intentKey, toneKey, limit, query){
    var cat = BANK[catKey] || BANK.sports;
    var intent = INTENT[intentKey] || INTENT.howto;
    var mod = MOD[toneKey] || MOD.luxe;

    var q = normalizeQuery(query);

    var bases = uniq(cat.base.concat(cat.niche));
    if(q){
      // allow multi token ("A / B" or "A, B")
      var parts = q.split(/[\/\,\|]+/g).map(function(x){return String(x||'').trim();}).filter(Boolean);
      if(parts.length){ bases = uniq(parts.concat(bases)); }
      else { bases = uniq([q].concat(bases)); }
    }
    var intents = uniq(intent);
    var mods = uniq(mod);

    // pick subsets to keep output tight
    var bPick = pickN(bases, Math.min(10, bases.length));
    var iPick = pickN(intents, Math.min(5, intents.length));
    var mPick = pickN(mods, Math.min(5, mods.length));

    var out = [];

    // Core
    bPick.forEach(function(b){
      out.push(b);
      iPick.forEach(function(i){ out.push(b + ' ' + i); });
    });

    // Longtail
    bPick.forEach(function(b){
      mPick.forEach(function(m){
        out.push(m + ' ' + b);
        iPick.forEach(function(i){ out.push(m + ' ' + b + ' ' + i); });
      });
    });

    // Compact variations
    bPick.forEach(function(b){
      out.push(b.replace(/\s+/g,'') + ' 가이드');
      out.push(b.replace(/\s+/g,'') + ' 계산기');
    });

    // If query is provided, make sure it appears and expands
    if(q){
      var qParts = q.split(/[\/\,\|]+/g).map(function(x){return String(x||'').trim();}).filter(Boolean);
      (qParts.length ? qParts : [q]).forEach(function(seed){
        out.push(seed);
        iPick.forEach(function(i){ out.push(seed + ' ' + i); });
        mPick.forEach(function(m){ out.push(m + ' ' + seed); });
      });
    }

    out = uniq(out);

    // hard cap
    var lim = Number(limit || 120);
    if (out.length > lim) out = out.slice(0, lim);
    return out;
  }

  function buildTitles(catKey, intentKey, query, keywords){
    var p = BANK[catKey] || BANK.sports;
    var picks = pickTopics(query, keywords);
    var topic = picks[0] || (p.base[0] || '키워드');
    var topic2 = picks[1] || (p.niche && p.niche[0]) || '';
    var intent = (INTENT[intentKey] || INTENT.howto);
    var i0 = intent[0] || '가이드';
    var i1 = intent[1] || i0;

    // Topic-first titles (no brand / no tool-promo)
    var t = [
      topic + ' ' + i0 + ' 총정리 (핵심만)',
      topic + ' ' + i0 + ': 실수 줄이는 기준 7가지',
      topic + ' ' + i1 + ' 예시 — 바로 써먹는 템플릿',
      '초보도 이해하는 ' + topic + ' ' + i0 + ' (체크리스트 포함)',
      topic + ' ' + i0 + ' FAQ: 자주 묻는 질문 12개',
      topic + ' 관련 키워드 묶음(클러스터) + 구조(H2) 예시',
      topic + ' ' + i0 + '에서 자주 하는 실수 TOP5',
      topic + ' ' + i0 + ' 한 장 요약: 개념·예시·주의사항'
    ];

    if(topic2){
      t.push(topic + ' vs ' + topic2 + ' 비교: 무엇이 다를까?');
      t.push(topic + ' ' + i0 + ' + ' + topic2 + ' 체크 포인트');
    }

    // Add a few niche-driven variants for broader coverage
    (p.niche || []).slice(0, 4).forEach(function(n){
      t.push(n + ' ' + i0 + ' (초보용)');
    });

    return uniq(t);
  }

  function clampDesc(s, min, max){
    var t = String(s || '').replace(/\s+/g,' ').trim();
    if (t.length > max) t = t.slice(0, max-1).trim() + '…';
    if (t.length < min) {
      // pad without brand/promo
      t = (t + ' — 기준·예시·주의사항까지 한 번에 정리').replace(/\s+/g,' ').slice(0, max);
    }
    return t;
  }

  function buildDescriptions(catKey, query, keywords){
    var p = BANK[catKey] || BANK.sports;
    var picks = pickTopics(query, keywords);
    var topic = picks[0] || (p.base[0] || '키워드');
    var d = [
      topic + '를 처음 보는 사람도 이해할 수 있게 핵심만 정리했습니다. 기준·예시·주의사항을 한 번에 확인하세요.',
      topic + ' 관련 키워드(클러스터)와 글 구조(H2)를 함께 제시합니다. 제목/본문 구성에 바로 적용할 수 있습니다.',
      topic + '에서 자주 하는 실수와 체크 포인트를 정리했습니다. 초보 기준으로 빠르게 점검해보세요.',
      topic + ' 개념부터 실전 적용 예시까지 요약했습니다. 불필요한 말은 빼고 필요한 기준만 남겼습니다.',
      topic + ' FAQ: 많이 물어보는 질문과 답을 모아 빠르게 찾아볼 수 있게 구성했습니다.'
    ];
    return uniq(d.map(function(x){ return clampDesc(x, 110, 155); }));
  }

  function buildOutline(catKey, query){
    var p = BANK[catKey] || BANK.sports;
    var topic = normalizeQuery(query) || (p.base[0] || '키워드');
    var out = [
      'H2: ' + topic + ' 한 줄 정의',
      'H2: 왜 중요한가? (핵심 포인트 3가지)',
      'H2: 기준/룰 — 체크리스트',
      'H2: 예시 — 상황별 적용 방법',
      'H2: 자주 하는 실수 TOP5',
      'H2: 추천 키워드 클러스터(보조 키워드)',
      'H2: FAQ'
    ];
    return out;
  }

  function buildCommunityPost(catKey, intentKey, toneKey, query, keywords){
    var p = BANK[catKey] || BANK.sports;
    var picks = pickTopics(query, keywords);
    var topic = picks[0] || (p.base[0] || '키워드');
    var topKw = Array.isArray(keywords) ? keywords.slice(0, 14) : [];
    var intent = (INTENT[intentKey] || INTENT.howto);
    var i0 = intent[0] || '가이드';
    var mod = (MOD[toneKey] || MOD.luxe);
    var m0 = mod[0] || '핵심';

    var tags = [];
    var baseTag = topic.replace(/\s+/g,'');
    if(baseTag) tags.push('#' + baseTag);
    (p.niche||[]).slice(0,4).forEach(function(x){ tags.push('#' + String(x).replace(/\s+/g,'')); });
    tags.push('#' + String(i0).replace(/\s+/g,''));

    var lines = [];
    lines.push('[' + topic + ' ' + i0 + '] ' + m0 + ' 기준 총정리');
    lines.push('');
    lines.push('✅ 핵심 요약');
    lines.push('- ' + topic + '에서 먼저 확인할 것: 기준/조건/예외');
    lines.push('- 초보는 “용어 정의 → 체크리스트 → 예시” 순서로 보면 실수 줄어듭니다.');
    lines.push('');
    lines.push('📌 체크리스트(바로 적용)');
    lines.push('- 핵심 조건 3개(필수/권장/주의)로 나눠서 정리');
    lines.push('- 숫자/비율/제한 조건은 표로(있다면)');
    lines.push('- 예외 케이스(자주 틀리는 포인트) 2개 이상 명시');
    lines.push('');
    lines.push('🧩 예시 템플릿');
    lines.push('- 상황: ___');
    lines.push('- 적용: ___ (왜 이렇게 하는지 1문장 설명)');
    lines.push('- 주의: ___');
    lines.push('');
    lines.push('❓ 자주 묻는 질문(FAQ)');
    lines.push('- Q. ' + topic + '에서 가장 많이 실수하는 부분은?');
    lines.push('  A. 기준/조건을 한 줄로 못 정리하고 예외를 놓치는 경우가 많습니다.');
    lines.push('');
    lines.push('🏷️ 관련 키워드');
    lines.push(tags.join(' '));
    if(topKw.length){
      lines.push('');
      lines.push('🔎 추천 키워드(복붙용)');
      lines.push('- ' + topKw.join(' / '));
    }

    return lines.join('\n');
  }

function renderOut(id, lines){
    var ta = $(id);
    if(!ta) return;
    ta.value = (lines || []).join('\n');
  }

  function setCount(id, n){
    var el = $(id);
    if(el) el.textContent = String(n || 0);
  }

  function getState(){
    return {
      query: ($('#seoQuery')||{}).value || '',
      cat: ($('#seoCat')||{}).value || 'sports',
      intent: ($('#seoIntent')||{}).value || 'howto',
      tone: ($('#seoTone')||{}).value || 'luxe',
      limit: Number((($('#seoLimit')||{}).value) || 120)
    };
  }

  function generate(){
    var st = getState();

    var q = normalizeQuery(st.query);
    var kw = buildKeywords(st.cat, st.intent, st.tone, st.limit, q);
    var ttl = buildTitles(st.cat, st.intent, q, kw);
    var desc = buildDescriptions(st.cat, q, kw);
    var outline = buildOutline(st.cat, q);
    var post = buildCommunityPost(st.cat, st.intent, st.tone, q, kw);

    renderOut('#outKeywords', kw);
    renderOut('#outTitles', ttl);
    renderOut('#outDesc', desc);
    renderOut('#outOutline', outline);

    var outPost = $('#outCommunity');
    if(outPost) outPost.value = post || '';

    setCount('#kwCount', kw.length);
    setCount('#ttlCount', ttl.length);
    setCount('#descCount', desc.length);

    toToast('생성 완료');
  }

  function resetAll(){
    var q = $('#seoQuery');
    if(q) q.value='';
    $('#outKeywords').value='';
    $('#outTitles').value='';
    $('#outDesc').value='';
    $('#outOutline').value='';
    var oc = $('#outCommunity');
    if(oc) oc.value='';
    setCount('#kwCount', 0);
    setCount('#ttlCount', 0);
    setCount('#descCount', 0);
    toToast('초기화');
  }

  function wire(){
    // Search-first mode: hide advanced selects unless user expands
    (function initAdvancedToggle(){
      var adv = $('#seoAdvanced');
      var sw = $('#seoOptSwitch');
      if(!adv || !sw) return;

      function setOpen(open, persist){
        if(open){
          adv.classList.remove('is-collapsed');
          sw.checked = true;
        }else{
          adv.classList.add('is-collapsed');
          sw.checked = false;
        }
        if(persist){
          try{ localStorage.setItem(ADV_KEY, open ? '1' : '0'); }catch(e){}
        }
      }

      var open = false;
      try{ open = localStorage.getItem(ADV_KEY) === '1'; }catch(e){}
      setOpen(open, false);

      sw.addEventListener('change', function(){
        setOpen(!!sw.checked, true);
      });
    })();

    $('#btnGen')?.addEventListener('click', generate);
    $('#btnReset')?.addEventListener('click', resetAll);

    $('#seoQuery')?.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){
        e.preventDefault();
        generate();
      }
      if(e.key === 'Escape'){
        e.preventDefault();
        this.value = '';
      }
    });

    $('#btnCopyInquiry')?.addEventListener('click', async function(){
      var ok = await copyText('스포츠 배당 분석 봇 지원');
      toToast(ok ? '문의 문구 복사' : '복사 실패');
    });

    // Fill datalist for search input (keep it light)
    (function fillDatalist(){
      var dl = $('#seoQueryList');
      if(!dl) return;
      var pool = [];
      Object.keys(BANK).forEach(function(k){
        var b = BANK[k];
        pool = pool.concat((b.base||[]), (b.niche||[]));
      });
      pool = uniq(pool).slice(0, 80);
      dl.innerHTML = pool.map(function(x){ return '<option value="' + String(x).replace(/"/g,'&quot;') + '"></option>'; }).join('');
    })();

    $$('.btnCopy').forEach(function(btn){
      btn.addEventListener('click', async function(){
        var target = btn.getAttribute('data-target');
        var ta = target ? $(target) : null;
        if(!ta) return;
        var ok = await copyText(ta.value || '');
        toToast(ok ? '복사 완료' : '복사 실패');
      });
    });

    $$('.btnDown').forEach(function(btn){
      btn.addEventListener('click', function(){
        var target = btn.getAttribute('data-target');
        var ta = target ? $(target) : null;
        if(!ta) return;
        var name = btn.getAttribute('data-fn') || 'seo.txt';
        downloadText(name, ta.value || '');
        toToast('다운로드');
      });
    });

    // Generate once on first load for nice UX
    setTimeout(generate, 50);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', wire);
  }else{
    wire();
  }
})();
