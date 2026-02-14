# v20 Inline Events: Action-ID Mapping (No Inline Code)

이 버전은 HTML에 남아있던 `data-ev-click="함수(...)"`, `data-ev-change="함수(...)"` 형태의 **코드 문자열을 전부 제거**하고,

- `data-ev-click="aXXXXXXXXXX"` (액션 ID)
- `data-ev-change="aXXXXXXXXXX"` (액션 ID)

처럼 **해시 기반 액션 ID**로 치환했습니다.

## 동작 방식
- `assets/js/ie.*.js` 내부에 액션 맵(107개)이 포함되어 있습니다.
- 클릭/체인지 발생 시:
  1) 이벤트 경로(composedPath)에서 `data-ev-click|change` 속성을 찾고
  2) 해당 값(액션 ID)로 액션 맵을 조회
  3) 맵에 정의된 전역 함수(`window[fn]`)를 **eval 없이** `apply()`로 호출합니다.

## 효과
- F12로 HTML을 봐도 실행 코드가 노출되지 않음 (ID만 노출)
- `new Function`/`eval` 미사용 → CSP 환경에서 더 안전
- UI/UX/기능 로직은 기존과 동일 (기존에 호출되던 전역 함수들을 그대로 호출)

## 주의
- 새로 버튼을 추가할 때는 `data-ev-click` 값에 임의 코드를 넣지 말고,
  기존 액션 ID 패턴처럼 **액션 맵에 등록된 ID**를 사용해야 합니다.
- 액션 추가/변경이 필요하면: 같은 방식으로 액션 ID를 생성하고(sha1 10자리), 맵을 갱신해야 합니다.

