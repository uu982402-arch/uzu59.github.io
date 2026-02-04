[전체 사용자 인기(Real Popularity) 연동 가이드]

A) 프론트(index.html) 설정
- window.SITE_CONFIG.GA4_ID          : GA4 Measurement ID (예: G-XXXXXXXXXX)
- window.SITE_CONFIG.POPULAR_API     : API 엔드포인트 (예: /api/popular 또는 https://api.yourdomain.com/popular)

B) GA4 설정 (필수)
1) GA4 Property 생성
2) Admin → Data streams → Web → Measurement ID 확인 (G-....)
3) Admin → Custom definitions → Create custom dimension (Event-scoped) 2개 생성:
   - Name: search_term   / Event parameter: search_term
   - Name: card_id       / Event parameter: card_id
   (프론트에서 track("search", {search_term}) / track("card_open", {card_id}) 형태로 전송)

C) 서버리스 API 배포 (둘 중 하나 선택)

1) Vercel
- serverless/vercel 폴더를 별도 프로젝트로 배포
- Env 설정:
  GA_PROPERTY_ID, GA_CLIENT_EMAIL, GA_PRIVATE_KEY
- 배포 후 엔드포인트: https://<project>.vercel.app/api/popular
- index.html의 POPULAR_API에 위 URL 지정

2) Netlify Functions
- serverless/netlify를 Netlify 사이트에 배포
- Functions 엔드포인트: /.netlify/functions/popular
- index.html의 POPULAR_API에 해당 경로 지정

D) 동작 확인
- GA4 실시간(Realtime)에서 이벤트(search, card_open)가 찍히는지 확인
- index.html에서 “오늘의 인기” 상단에 [전체 사용자 기준] pill이 나타나면 성공
- 연동 전에는 로컬 집계(내 브라우저 기준)로만 보입니다.
