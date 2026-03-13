# FINAL_APPLIED_CHANGES_20260313_v16

## 이번 정리에서 실제 반영된 것
- 제거 대상 페이지 삭제
  - /logbook/
  - /calc/
  - /fortune/
  - /landing-a/
  - /landing-b/
  - /landing-c/
  - /landing-d/
  - /landing-e/
  - /landing-f/
  - /casino/landing-a_index.html

- 사용자 노출 링크 정리
  - 기존 `/calc/` 링크를 `/analysis/`로 교체
  - 기존 랜딩 링크를 `/analysis/` 또는 `/cert/`로 교체
  - `/fortune/` 링크를 `/guide/`로 교체
  - `/logbook/` 링크를 `/analysis/`로 교체

- 리디렉트 추가
  - 삭제한 페이지들에 301 리디렉트 설정

- 보안/노출 완화
  - robots.txt에 내부/삭제 페이지/asset 경로 Disallow 추가
  - `_headers`에 asset/img noindex 강화
  - `_headers`에 `Origin-Agent-Cluster`, `X-Download-Options` 보강
  - assets/img에 `Cross-Origin-Resource-Policy: same-origin` 유지/보강

- 경량화
  - 랜딩 전용 미사용 CSS 제거
  - fortune 전용 미사용 CSS 제거
  - 기존 릴리즈 노트 제거

## 점검
- `npm run build` 성공
- HTML 로컬 src/href 참조 검사 통과
- 삭제 대상 페이지에 대한 사용자 노출 참조 제거 확인
- 새 빌드 버전: `v20260313-0216`

## 참고
- 클라이언트로 내려가는 프론트엔드 코드를 완전히 숨길 수는 없음
- 이번 마감은 불필요 페이지/파일 제거 + 검색/자산 노출 완화 + 보안 헤더 보강 중심
