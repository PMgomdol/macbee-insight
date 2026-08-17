-- 의견 제출자 이름(선택 입력). 없어도 제출은 정상 동작(서버가 이름만 빼고 저장).
alter table feedback add column if not exists name text;
