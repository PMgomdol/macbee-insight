-- =========================================================================
-- 2026-10-02 — 챌린지 마감 기준을 맥비님 안내 페이지에 맞춤 + 문서/링크 수동 지정
--
-- 맥비님 페이지(macbe.dothome.co.kr/macbe_archive-challenge.html) 규칙:
--   "마감일(10월 31일 23:59)까지 등록된 건에 한하여 심사가 진행되며, 운영진 심사는 등록 후 순차 진행"
--   동점 3순위 "이벤트 최소 기준(15건)을 먼저 달성한 순 (등록 일시 기준)"
-- 문제: archive_item.registered_at 은 승인(자료실 이관) 시각이다(실측 확인). 대시보드가 이 값으로
--   기간을 자르면 10월 말 제출 → 11월 승인 건이 순위에서 빠진다.
-- 조치: 승인 때 staging_proposal.proposed_at(제출 시각)을 archive_item.proposed_at 에 보관하고,
--   대시보드는 제출 시각으로 기간·동점을 판정한다. 기존 행은 null → 대시보드가 registered_at 으로 대체.
--   (적용 시점 기준 10/2 이후 제출 건 0건 → 백필 불필요)
-- 공개 노출 없음: archive_item 은 20261002_pii_column_lockdown 으로 컬럼 단위 grant 라
--   새 컬럼은 anon/authenticated 에 열리지 않는다(의도 — 어드민은 service_role 로 읽음).
--
-- ⚠️ 순서: 이 SQL 을 먼저 실행한 뒤 코드를 배포할 것. 반대로 하면 승인 시 없는 컬럼에 써서 승인이 실패함.
-- =========================================================================

alter table archive_item add column if not exists proposed_at timestamptz;

-- 문서(2점)/링크(1점) 판정을 운영진이 자료별로 바꿀 수 있게(Notion 등 애매한 경우). null = 자동 판정.
alter table event_bonus add column if not exists doc_override boolean;
