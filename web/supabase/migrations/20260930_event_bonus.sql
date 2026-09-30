-- 등록이벤트(2026-10) 가산점 저장 — 자료별 희소성(+1)·실무형(+2)은 사람이 판단하는 값이라 별도 저장.
-- 기본점수(링크1/문서2)는 archive_item에서 자동 계산하므로 저장 안 함. 이벤트 전용, 1개월성.
create table if not exists event_bonus (
  item_id bigint primary key references archive_item(id) on delete cascade,
  rarity boolean not null default false,      -- 희소성 +1
  practical boolean not null default false,   -- 실무형 +2
  updated_by text,
  updated_at timestamptz not null default now()
);

-- 서버 액션(service_role)으로만 접근 — 공개 REST 차단
alter table event_bonus enable row level security;
