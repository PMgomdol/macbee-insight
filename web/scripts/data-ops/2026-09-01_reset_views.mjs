// 2026-09-01 11:22 — 홈 인기 자료용 조회수 초기화 (오픈 전 테스트 클릭 제거)
// 승인: 안재찬 "초기화 진행해" (세션 06e8fd2d). 8/31 운영회의 "안재찬 판단으로 진행" 항목 실행.
// 결과: archive_item.views 129건→0, view_event id 1~216 삭제(214건), 캐시 revalidate.
// 백업: ~/.macbe/backup_views_2026-09-02.json (복원 가능)
//
// ⚠️ 이미 실행됨. 기록용. 재실행하려면 `node --env-file=.env.local scripts/data-ops/2026-09-01_reset_views.mjs --really-run`
// (원문은 인라인 node -e 로 실행됐던 것을 소급 파일화 — 2026-09-10)

if (process.argv[2] !== '--really-run') {
  console.error('이미 2026-09-01에 실행된 작업입니다. 정말 다시 돌리려면 --really-run 을 붙이세요.');
  process.exit(1);
}

const U = process.env.NEXT_PUBLIC_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const fs = await import('fs');

// 1) 스냅샷 저장 (복원용)
const views = await (await fetch(U + '/rest/v1/archive_item?select=id,views&views=gt.0&order=id', { headers: H })).json();
const events = await (await fetch(U + '/rest/v1/view_event?select=*&order=id&limit=1000', { headers: H })).json();
const backup = `${process.env.HOME}/.macbe/backup_views_${new Date().toISOString().slice(0, 10)}.json`;
fs.writeFileSync(backup, JSON.stringify({ saved_at: new Date().toISOString(), archive_views: views, view_events: events }, null, 1));
console.log('스냅샷 저장: views', views.length, '건 / events', events.length, '건 →', backup);

// 2) 초기화
let r = await fetch(U + '/rest/v1/archive_item?views=gt.0', { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ views: 0 }) });
console.log('archive_item views→0:', r.status);
r = await fetch(U + '/rest/v1/view_event?id=gt.0', { method: 'DELETE', headers: { ...H, Prefer: 'return=minimal' } });
console.log('view_event delete:', r.status);

// 3) 검증
const chk = await (await fetch(U + '/rest/v1/archive_item?select=id&views=gt.0&limit=1', { headers: H })).json();
const ev = await fetch(U + '/rest/v1/view_event?select=id&limit=1', { headers: { ...H, Prefer: 'count=exact' } });
console.log('잔여 views>0:', chk.length, '건 | view_event:', ev.headers.get('content-range'));

// 4) 캐시 갱신
const rev = await fetch('https://macbe-archive.com/api/revalidate', { method: 'POST', headers: { Authorization: 'Bearer ' + K } });
console.log('revalidate:', rev.status, await rev.text());
