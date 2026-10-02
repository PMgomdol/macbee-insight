// 챌린지 순위·동점 규칙 검사 (상금 순위가 걸린 로직). 실패하면 throw.
// 실행: /opt/homebrew/bin/node scripts/check-event-rank.mjs   (Node 23.6+ — .ts 직접 import)
import assert from 'node:assert/strict';
import { rankBoard } from '../lib/event-rank.ts';

const MIN = 15;
// 사람 email 이 n건 등록. doc=문서 건수, extra=가산점 총합(첫 건에 몰아줌), t0=첫 제출 시각(이후 1시간 간격)
function person(email, n, { doc = 0, extra = 0, t0 = '2026-10-02T00:00:00Z' } = {}) {
  return Array.from({ length: n }, (_, i) => ({
    email, proposer: email.split('@')[0], isDoc: i < doc,
    score: (i < doc ? 2 : 1) + (i === 0 ? extra : 0),
    at: new Date(Date.parse(t0) + i * 3600e3).toISOString(),
  }));
}
const order = (b) => b.map((e) => `${e.rank}:${e.name}`);

// 총점 우선
assert.deepEqual(order(rankBoard([...person('a@x', 3), ...person('b@x', 5)], MIN)), ['1:b', '2:a']);
// ① 총점 같으면 문서 건수 많은 순 — a: 문서1+링크2=4점(3건), b: 링크4=4점(4건) → 문서 많은 a 가 위
assert.deepEqual(order(rankBoard([...person('b@x', 4), ...person('a@x', 3, { doc: 1 })], MIN)), ['1:a', '2:b']);
// ② 총점·문서 같으면 총 건수 많은 순 — a: 링크2+가산1=3점(2건), b: 링크3=3점(3건)
assert.deepEqual(order(rankBoard([...person('a@x', 2, { extra: 1 }), ...person('b@x', 3)], MIN)), ['1:b', '2:a']);
// ③ 위 셋이 같으면 15건 먼저 달성한 순 — 같은 15건·점수, b 가 하루 먼저 시작
const late = person('a@x', MIN, { t0: '2026-10-03T00:00:00Z' });
const early = person('b@x', MIN, { t0: '2026-10-02T00:00:00Z' });
assert.deepEqual(order(rankBoard([...late, ...early], MIN)), ['1:b', '2:a']);
// ③ 달성 시각은 '15번째 제출'로 판정 — 입력 순서가 뒤섞여도 같아야 함
assert.deepEqual(order(rankBoard([...late.reverse(), ...early.reverse()], MIN)), ['1:b', '2:a']);
// 전부 같으면 공동 순위, 다음 순위는 건너뜀(1,1,3)
assert.deepEqual(order(rankBoard([...person('a@x', 3), ...person('b@x', 3), ...person('c@x', 2)], MIN)), ['1:a', '1:b', '3:c']);
// 이메일 없는 자료는 순위 제외
assert.deepEqual(order(rankBoard([...person('a@x', 1), { email: null, proposer: '익명', isDoc: true, score: 9, at: '2026-10-02T00:00:00Z' }], MIN)), ['1:a']);

console.log('✅ 순위·동점 규칙 7개 통과');
