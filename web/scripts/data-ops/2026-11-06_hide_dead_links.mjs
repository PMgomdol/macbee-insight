// 2026-11-06 — 링크가 죽은 공개 자료 5건 숨김 (status public → hidden, 되살리기 가능)
// 승인: 안재찬 "숨김 처리 ㄱ" (세션 06e8fd2d, 2026-11-06)
// 근거: 2026-10-31 curl + 2026-11-05 크롬/헤드리스 직접 열람
//   #45  disquiet 메이커로그 → 404
//   #465 disquiet 메이커로그 → 404
//   #455 horsebiz 기사 → 404
//   #416 fastcampus 미디어 → 접속 불가
//   #890 bit.ly → 카페24 도움말 글이 없어진 페이지
//   (#770은 보류 — 사용자 판단 대기, #511은 정상)
// 백업: ~/.macbe/backup_dead_links_2026-11-06.json (실행 직전 5건 전체 행)
// 되돌리기: 같은 id를 status 'public'으로 (관리자 화면 '자료 관리'에서도 가능)
//
// 실행: node --env-file=.env.local scripts/data-ops/2026-11-06_hide_dead_links.mjs --really-run

import { writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';

if (process.argv[2] !== '--really-run') {
  console.error('DB를 바꾸는 작업입니다. 실행하려면 --really-run 을 붙이세요. (2026-11-06 실행됨)');
  process.exit(1);
}

const IDS = [45, 465, 455, 416, 890];
const U = process.env.NEXT_PUBLIC_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const inIds = 'id=in.(' + IDS.join(',') + ')';

// 1) 백업 (이미 있으면 덮어쓰지 않음 — 첫 실행 상태 보존)
const before = await (await fetch(`${U}/rest/v1/archive_item?${inIds}&select=*`, { headers: H })).json();
if (before.length !== IDS.length) throw new Error(`대상 ${IDS.length}건 중 ${before.length}건만 조회됨 — 중단`);
const bak = `${homedir()}/.macbe/backup_dead_links_2026-11-06.json`;
if (!existsSync(bak)) writeFileSync(bak, JSON.stringify(before, null, 2));
console.log('백업:', bak, '| 실행 전 상태:', before.map((r) => `#${r.id}:${r.status}`).join(' '));

// 2) 숨김 — 관리자 화면 setArchiveStatus와 같은 변경(status만)
const r = await fetch(`${U}/rest/v1/archive_item?${inIds}`, {
  method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify({ status: 'hidden' }),
});
const after = await r.json();
console.log('숨김:', r.status, after.map((x) => `#${x.id}:${x.status}`).join(' '));

// 3) 사이트 캐시 갱신
const rev = await fetch('https://macbe-archive.com/api/revalidate', { method: 'POST', headers: { Authorization: 'Bearer ' + K } });
console.log('revalidate:', rev.status);
