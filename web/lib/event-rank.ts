// 자료 등록 챌린지 순위 계산 — 맥비님 안내 페이지(macbe.dothome.co.kr/macbe_archive-challenge.html) 기준.
//   순위: 기간 내 승인 자료 총점 합산 순
//   동점: ① 문서/파일 건수 많은 순 ② 총 등록 건수 많은 순 ③ 최소 기준(15건)을 먼저 달성한 순(등록 일시 기준)
// 참가자 식별은 이메일(이름은 자유입력이라 사칭·오타 위험). 이메일 없는 자료는 순위 제외.
// 검사: /opt/homebrew/bin/node scripts/check-event-rank.mjs  (Node 23.6+ 가 .ts 를 바로 실행)

export type RankInput = {
  email: string | null;
  proposer: string;
  isDoc: boolean;
  score: number; // 자료 1건 점수(기본 + 가산)
  at: string;    // 제출 시각 ISO
};

export type RankEntry = {
  name: string;
  email: string;
  count: number;
  docs: number;
  total: number;
  reachedAt: number; // 최소 기준 달성 시각(ms) — 미달이면 Infinity
  rank: number;
};

export function rankBoard(rows: RankInput[], min: number): RankEntry[] {
  const m = new Map<string, RankEntry & { ats: number[] }>();
  for (const r of rows) {
    if (!r.email) continue;
    const e = m.get(r.email) ?? { name: r.proposer, email: r.email, count: 0, docs: 0, total: 0, reachedAt: Infinity, rank: 0, ats: [] };
    e.count++;
    if (r.isDoc) e.docs++;
    e.total += r.score;
    e.ats.push(Date.parse(r.at));
    e.name = r.proposer; // 표시용 이름(최근 값)
    m.set(r.email, e);
  }
  for (const e of m.values()) {
    if (e.ats.length >= min) e.reachedAt = [...e.ats].sort((a, b) => a - b)[min - 1];
  }
  const arr = [...m.values()].sort(
    (a, b) => b.total - a.total || b.docs - a.docs || b.count - a.count || cmp(a.reachedAt, b.reachedAt)
  );
  let rank = 0;
  let prev: RankEntry | null = null;
  arr.forEach((e, i) => {
    const tie = prev && e.total === prev.total && e.docs === prev.docs && e.count === prev.count && e.reachedAt === prev.reachedAt;
    rank = tie ? rank : i + 1;
    e.rank = rank;
    prev = e;
  });
  return arr.map(({ ats: _ats, ...e }) => e);
}

// Infinity - Infinity = NaN 이라 직접 비교
function cmp(a: number, b: number): number {
  return a === b ? 0 : a < b ? -1 : 1;
}
