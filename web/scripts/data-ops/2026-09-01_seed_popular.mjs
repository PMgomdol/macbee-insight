// 2026-09-01 11:41 — 홈 "사람들이 많이 보고 있어요" 오픈 부트스트랩 (운영진 추천 10선) + #932 중복 삭제
// 승인: 안재찬 "어느정도 부스트 해놓으려" (세션 06e8fd2d). 추천 10선 = 맥비 4 + 서지연 2 + 실조회 4.
// 방식: 30일 집계(view_event)에 계단식 12→3회를 실행시각−0~3일 랜덤으로 심고 views 동기화.
//       → 오픈 첫날부터 원하는 순서로 노출, 30일 뒤(≈9/28~10/2) 자연 소멸하며 실클릭 순위로 교체.
// 결과: view_event 75건 삽입(201), 집계 #930:12 #863:11 #933:10 #931:9 #862:8 #861:7 #597:6 #23:5 #523:4 #554:3, #932 deleted.
// 흔적: view_event id≥217, viewed_at이 id 순서와 역행(시각 지정 삽입), views==view_event 일관.
//
// ⚠️ 이미 실행됨. 기록용. 재실행하려면 `node --env-file=.env.local scripts/data-ops/2026-09-01_seed_popular.mjs --really-run`
// (원문은 인라인 node -e 로 실행됐던 것을 소급 파일화 — 2026-09-10)

if (process.argv[2] !== '--really-run') {
  console.error('이미 2026-09-01에 실행된 작업입니다. 정말 다시 돌리려면 --really-run 을 붙이세요.');
  process.exit(1);
}

const U = process.env.NEXT_PUBLIC_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };

// 1) #932 소프트 삭제 (#863 맥비님 라이브 시트와 내용 100% 동일한 xlsx 스냅샷)
let r = await fetch(U + '/rest/v1/archive_item?id=eq.932', { method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify({ status: 'deleted', notes: '2026-09-02 중복 정리: #863(맥비님 라이브 시트)과 내용 100% 동일한 xlsx 스냅샷 — 승인: 안재찬' }) });
let j = await r.json(); console.log('#932 삭제:', r.status, j[0]?.status);

// 2) 큐레이션 부트스트랩 — 계단식 view_event
const plan = [[930, 12], [863, 11], [933, 10], [931, 9], [862, 8], [861, 7], [597, 6], [23, 5], [523, 4], [554, 3]];
const now = Date.now(); const rows = [];
for (const [id, n] of plan) for (let i = 0; i < n; i++) rows.push({ item_id: id, viewed_at: new Date(now - Math.floor(Math.random() * 3 * 86400 * 1000)).toISOString() });
r = await fetch(U + '/rest/v1/view_event', { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
console.log('view_event 시딩:', r.status, rows.length, '건');

// 3) views 동기화
for (const [id, n] of plan) { await fetch(U + '/rest/v1/archive_item?id=eq.' + id, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ views: n }) }); }

// 4) 검증
const ev = await (await fetch(U + '/rest/v1/view_event?select=item_id&limit=200', { headers: H })).json();
const c = {}; for (const e of ev) c[e.item_id] = (c[e.item_id] || 0) + 1;
console.log('집계 순위:', Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => '#' + k + ':' + v).join(' '));

// 5) 캐시 갱신
const rev = await fetch('https://macbe-archive.com/api/revalidate', { method: 'POST', headers: { Authorization: 'Bearer ' + K } });
console.log('revalidate:', rev.status);
