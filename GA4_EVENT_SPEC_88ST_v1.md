# 88ST.Cloud — GA4 이벤트 구조(권장안) v1

빌드 기준: **VIP4_20260214_17**
측정 ID: **G-KWT87FBY6S**

이 문서는 **버튼 클릭(분석기 4종 / 인증페이지)** + **/cert 카드별 전환 흐름**을 GA4에서 일관되게 분석하기 위한 표준입니다.

---

## 1) 공통 원칙

### ✅ 이벤트는 “적게, 정확하게”
- 클릭 계열은 **`cta_click`** 하나로 통일
- 인증 카드 클릭은 **`card_open`** (카드별 성과)
- 모달 행동은 **`copy_code` / `outbound_click` / `fav_vendor_toggle`**

### ✅ 자동 outbound 추적 중복 방지
- 자동 outbound(전역) + 수동 outbound(모달) **중복으로 2번 찍히는 것을 방지**하기 위해,
  - 수동으로 보내는 링크에는 `data-no-auto-outbound="1"` + `data-outbound-manual="1"`를 부여

### ✅ 스키마 버전 고정
모든 이벤트에는 자동으로 아래 파라미터가 포함됩니다.
- `schema_ver = "88st_ga4_v1"`

---

## 2) 이벤트 목록(핵심)

### A. 버튼 클릭(분석기/진입 CTA)

**event:** `cta_click`

**파라미터(권장)**
- `cta_id` (또는 `cta`) : CTA 식별자
- `cta_location` : 위치(자동 추정)
- `cta_text` : 버튼 텍스트(최대 60자)
- `cta_href` : href(최대 140자)

**표준 cta_id(권장 값)**
- `open_tool_sports` : 스포츠 분석기
- `open_tool_casino` : 카지노 전략 분석기
- `open_tool_slot` : 슬롯 RTP 분석기
- `open_tool_minigame` : 미니게임 분석기
- `open_cert` : 인증사이트(/cert)

**추가 CTA는 이렇게 붙이면 끝**
```html
<a data-cta="open_tool_sports" href="/analysis/">스포츠 분석기</a>
```

---

### B. 인증 카드 클릭(모달 오픈)

**event:** `card_open`

**파라미터(표준)**
- `vendor_id` : `card1`, `card2` ...
- `vendor_name` : 카드 타이틀
- `vendor_group` : `guarantee | verified`
- `vendor_pos` : 현재 그리드에서의 노출 순번(1부터)
- `filter` : `all | guarantee | verified | rec | new`
- `sort` : `default | pop`

**핵심 지표 예시**
- 카드별 관심도: `card_open` by `vendor_id`
- 카드별 전환율: `outbound_click(vendor_site) / card_open`

---

### C. 인증 모달에서 코드 복사

**event:** `copy_code`

**파라미터(표준)**
- `vendor_id`
- `vendor_name`
- `code_present` : `true | false`

> 보안/분석 효율상 **코드 원문은 전송하지 않습니다.**

---

### D. 인증 모달에서 외부 이동(사이트/텔레그램)

**event:** `outbound_click`

**파라미터(표준)**
- `outbound_type` : `vendor_site | telegram | external`
- `vendor_id` *(해당되는 경우)*
- `vendor_name` *(해당되는 경우)*
- `url`
- `destination_domain` *(analytics 모듈이 자동 보강)*

---

### E. 즐겨찾기 토글

**event:** `fav_vendor_toggle`

**파라미터(표준)**
- `vendor_id`
- `vendor_name`
- `state` : `on | off`

---

## 3) 인증 페이지 UX 추적(옵션)

데이터가 필요할 때만 사용하세요.

- `cert_filter_change` : 필터 변경
  - `filter`
- `cert_sort_change` : 정렬 변경
  - `sort`
- `cert_search` : 검색 입력(디바운스 450ms)
  - `q_len`, `filter`, `sort`

---

## 4) GA4 관리자 설정(필수)

### Custom definitions (Event-scoped) 등록 추천
아래 파라미터를 등록하면 Exploration에서 바로 쓸 수 있습니다.

- `cta_id`
- `cta_location`
- `vendor_id`
- `vendor_name`
- `vendor_group`
- `vendor_pos`
- `outbound_type`
- `state`
- `filter`
- `sort`
- `schema_ver`

### Conversion(전환) 추천
- `outbound_click`  *(실제 전환으로 보기 좋음)*
- (선택) `copy_code` *(상담/가입 의도 지표)*

---

## 5) 바로 써먹는 리포트/탐색(추천)

### ① 분석기 진입 성과
- Event: `cta_click`
- Breakdown: `cta_id`, `cta_location`
- 비교: source/medium, device

### ② 인증카드 퍼널
- `card_open` → `copy_code` → `outbound_click(outbound_type=vendor_site)`
- Breakdown: `vendor_id`, `vendor_group`

### ③ 카드별 전환율(핵심)
- metric: `outbound_click(vendor_site) / card_open`
- Breakdown: `vendor_id`

---

## 6) QA(적용 확인)

1) URL에 `?debug=1` 붙여 접속
2) DevTools 콘솔에서 이벤트 로그 확인
   - `[88ST track] ...`
3) GA4 → **DebugView**에서 이벤트 실시간 확인
4) outbound 중복 여부 체크
   - 모달의 “사이트 이동/텔레그램” 클릭 시 `outbound_click`이 **1번만** 찍혀야 정상

---

## 7) 구현 위치(코드 기준)

- 공통 추적/UTM/자동 outbound: `assets/js/88st-analytics.js`
- 인증 카드/모달 이벤트: `assets/js/88st-cert.js`
- 모달 링크 자동 outbound 차단: `cert/index.html` (pLink/pTelegram에 data-no-auto-outbound)
