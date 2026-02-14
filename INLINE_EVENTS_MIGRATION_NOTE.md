# Inline 이벤트 핸들러 제거(v19)

## 적용 내용
- 모든 HTML의 `onclick`, `onchange` 속성을 제거했습니다.
- 대신 동일한 코드를 `data-ev-click`, `data-ev-change` 속성으로 옮기고,
  공통 스크립트(`assets/js/ie.*.js`)에서 `addEventListener`로 실행합니다.

## 동작 방식
- 이벤트 발생 시 `event.composedPath()` 경로를 따라 `data-ev-*`가 있는 노드를 찾습니다.
- 발견한 코드를 캐시된 Function으로 실행하고, `this`는 해당 요소로 바인딩됩니다.
- 핸들러가 `false`를 리턴하면 기존 inline handler와 동일하게 `preventDefault/stopPropagation` 처리합니다.

## 주의 (CSP)
- 내부적으로 `new Function()`을 사용하므로, 향후 CSP를 강하게 걸고 `unsafe-eval`을 금지하면
  이 파일이 동작하지 않습니다.
- 현재 배포 구조(정적 호스팅, CSP 미설정)에서는 기능 저하 없이 정상 동작합니다.
