# INLINE EVENTS OBFUSCATION v22

v21(액션맵+해시파일명+무-eval) 기반에서 **기능 저하 없이** 추가로 하드닝했습니다.

## 1) HTML 속성명 의미 제거
- 기존: `data-ev-click`, `data-ev-change`
- 변경: `data-x`(click), `data-y`(change)

> HTML에서 이벤트 타입/의도가 더 드러나지 않도록 속성명을 축약했습니다.

## 2) 단일 라우터(공통 핸들러)로 이벤트 처리
- `click`/`change` 각각에 리스너는 유지하되,
- 실제 라우팅 로직은 **단일 핸들러(U)**에서 처리합니다.

장점
- 중복 코드 감소 → 유지보수/오류 가능성 감소
- 이벤트 위임(delegation) 방식 유지 → 동적 DOM에도 안정

## 동작 원리(요약)
- 이벤트 발생 시 `composedPath()`를 따라가며
- `click`이면 `data-x`, `change`이면 `data-y`를 찾아 Action ID를 얻고
- 액션맵(디코딩된 매핑)으로 전역 함수 호출 + 인자 주입을 실행합니다.

## 운영/유지보수 팁
- 새 버튼/셀렉트에 액션을 붙일 때는 `data-x` 또는 `data-y`에 **Action ID**만 넣으면 됩니다.
- CSP가 강한 환경에서도 동작하도록 **eval/new Function을 사용하지 않습니다.**
