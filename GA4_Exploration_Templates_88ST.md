# 88ST.Cloud — GA4 Exploration 템플릿(요약)

## Conversion(전환) 추천 3개
- analysis_complete
- save_history
- outbound_click

## Exploration 1: Funnel (Session, Open)
목적: 메인(index) → /analysis 사용 → 전환 병목 찾기
Steps:
1) cta_click  (조건: cta_id = open_tool_sports (또는 open_tool_*))
2) analysis_start
3) analysis_complete
4) save_history OR outbound_click
Breakdown: device category, session source/medium

## Exploration 2: Funnel (User, Open)
목적: 분석기 UX 자체(입력→완료→저장→재사용→전환)
Steps:
1) analysis_start
2) analysis_complete
3) save_history
4) history_open
5) outbound_click
Breakdown: market_type, sport

## Exploration 3: Cohort / Retention
목적: 분석 완료 사용자의 7일 재방문
- Inclusion: analysis_complete
- Return: analysis_start (또는 analysis_complete)
- Range: 7일 / 14일
Breakdown: device category, session source/medium

## Exploration 4: Free form (소스/미디엄별 전환율)
Rows: session source/medium
Values: Sessions, Event count(analysis_start), Event count(analysis_complete), Event count(outbound_click)
차트 추천:
- Bar: analysis_complete 상위 소스
- Scatter: X=Sessions, Y=analysis_complete/Sessions

## Exploration 5: Path exploration
Start point: analysis_complete
다음 노드에서 save_history, share_*, outbound_click 흐름 확인
