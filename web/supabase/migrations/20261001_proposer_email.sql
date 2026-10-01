-- 등록이벤트 순위를 '이름(자유입력)' 대신 '이메일' 기준으로 집계하기 위해, 승인 시 제안자 이메일도 보존.
-- staging_proposal.proposer_email 은 있었으나 승인(migrateToArchive) 때 archive_item으로 안 넘어가고 있었음.
alter table archive_item add column if not exists proposer_email text;
