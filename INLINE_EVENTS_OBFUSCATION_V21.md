# INLINE EVENTS OBFUSCATION v21

이번 버전은 **기능 저하 없이**(UI/UX 동일) 아래 3가지를 추가 적용했습니다.

## 1) Action ID 재생성(버전별 랜덤)
- 모든 `data-ev-click`, `data-ev-change` 값(Action ID)을 **랜덤 재생성**했습니다.
- HTML에 의미 있는 함수/코드/식별자 노출을 최소화합니다.

## 2) Action Map 난독화(무-eval, CSP 친화)
- 이벤트 디스패치 맵(액션→함수/인자)을 **Base64 + XOR 인코딩된 JSON**으로 내장했습니다.
- 런타임에 디코딩하여 매핑을 구성하며, **eval/new Function 사용하지 않음**(CSP 제약에 강함).
- 함수명 문자열도 소스에 평문으로 남기지 않고, 디코딩 페이로드 안에서만 존재합니다.

## 3) 파일명 해시화
- 인라인 이벤트 처리 스크립트: `/assets/js/ie.*.js`
- 페이지별 인라인 번들: `/assets/js/inline-bundles/b.*.js`
- tool config JSON: `/assets/config/toolconfig/c.*.json`

> 파일명에 해시가 포함되므로 캐시 무효화가 자연스럽게 되며, 의미 기반 파일명 노출을 줄입니다.

## 운영/유지보수 팁
- 이벤트(액션) 추가/수정이 필요하면 `data-ev-*`를 직접 건드리기보다,
  빌드 스크립트(재패키징 시)로 Action ID와 맵을 재생성하는 흐름이 가장 안전합니다.
