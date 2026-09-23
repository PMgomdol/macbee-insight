-- 추천 자료(운영진 큐레이션) — featured_at 이 채워진 자료를 홈 '운영진이 추천하는 자료에요' 섹션에 노출.
-- null = 추천 아님. 최근 추천한 순(featured_at desc)으로 정렬, 최대 6개.
alter table archive_item add column if not exists featured_at timestamptz;

-- 추천 목록은 소수(≤6)라 partial index 로 충분.
create index if not exists idx_archive_featured
  on archive_item (featured_at desc)
  where featured_at is not null;
