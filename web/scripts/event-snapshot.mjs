// 챌린지 기간 일일 현황 — 등록(DB) + 등록 흐름·클릭(PostHog). 읽기 전용, 이메일 등 개인정보는 출력 안 함.
// 실행: /opt/homebrew/bin/node --env-file=.env.local scripts/event-snapshot.mjs   (web/ 에서, Node 23.6+)
// 기간은 lib/event.ts 단일 출처. PostHog 숫자는 쿠키 동의한 방문자만 — 실제보다 적다. 등록 수는 DB가 정답.
import { createRequire } from 'node:module';
import { EVENT } from '../lib/event.ts';

const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const SINCE = new Date(`${EVENT.start}T00:00:00+09:00`).toISOString();
const kstDay = (t) => new Date(Date.parse(t) + 9 * 3600e3).toISOString().slice(5, 10);

// ── 운영진 이메일 (profile엔 이메일이 없어 auth 사용자와 id로 매칭)
const { data: prof } = await sb.from('profile').select('id, role');
const staffIds = new Set((prof ?? []).filter((p) => ['admin', 'reviewer'].includes(p.role)).map((p) => p.id));
const staff = new Set();
for (let page = 1; ; page++) {
  const { data } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
  for (const u of data.users) if (staffIds.has(u.id) && u.email) staff.add(u.email.toLowerCase());
  if (data.users.length < 1000) break;
}

// ── 등록 (DB)
const { data: props, error } = await sb.from('staging_proposal').select('proposed_at, proposer, proposer_email, status, external_url, file_url').gte('proposed_at', SINCE);
if (error) throw new Error(error.message);
// 운영진이 로그인 계정과 다른 이메일로 등록하기도 함(1회차 10/7 건) → 이름이 운영진 명단(사이트 푸터와 동일)이면 운영진으로.
const STAFF_NAMES = ['맥비', '김소정', '서지연', '안재찬', '임종헌'];
const who = (p) => {
  const e = (p.proposer_email || '').toLowerCase();
  if (staff.has(e) || STAFF_NAMES.some((n) => (p.proposer || '').includes(n))) return '운영진';
  return e ? '일반' : '이메일없음';
};
const tally = (rows, f) => rows.reduce((m, r) => ((m[f(r)] = (m[f(r)] || 0) + 1), m), {});
console.log(`\n■ 챌린지 ${EVENT.label} — ${kstDay(new Date().toISOString())} 기준`);
console.log(`등록 ${props.length}건`, JSON.stringify(tally(props, who)), '| 상태', JSON.stringify(tally(props, (p) => p.status)), '| 방식', JSON.stringify(tally(props, (p) => (p.file_url ? '파일' : '링크'))));
console.log('일별', JSON.stringify(tally(props, (p) => kstDay(p.proposed_at))));
const general = props.filter((p) => who(p) === '일반');
const per = (rows) => Object.values(tally(rows, (p) => p.proposer_email.toLowerCase()));
for (const [label, rows] of [['제출', general], ['승인', general.filter((p) => p.status === 'approved')]]) {
  const n = per(rows);
  console.log(`일반 멤버(${label} 기준): ${n.length}명 | 1건+ ${n.filter((x) => x >= 1).length}명(커피 추첨 20) | 3건+ ${n.filter((x) => x >= 3).length}명(1만원 추첨 5) | 최다 ${Math.max(0, ...n)}건`);
}
const pending = props.filter((p) => p.status === 'pending');
if (pending.length) console.log(`대기 ${pending.length}건 — 가장 오래된 것 ${kstDay(pending.map((p) => p.proposed_at).sort()[0])} 제출`);

// ── 등록 흐름·클릭 (PostHog, 쿠키 동의자만)
async function hq(query) {
  const r = await fetch('https://us.posthog.com/api/projects/498450/query/', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.POSTHOG_PERSONAL_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`PostHog ${r.status}`);
  return j.results;
}
const S = `timestamp >= toDateTime('${SINCE.slice(0, 19).replace('T', ' ')}')`;
const fmt = (rows) => rows.map((r) => `${r.slice(0, -2).join(' ')} ${r.at(-2)}회·${r.at(-1)}명`).join(', ') || '없음';
console.log('\n■ PostHog (쿠키 동의자만 — 실제보다 적음)');
console.log('방문:', fmt(await hq(`select properties.$pathname p, properties.$device_type d, count(), count(distinct person_id) from events where ${S} and event='$pageview' and properties.$pathname in ('/','/submit') group by p, d order by p, d`)));
console.log('단계:', fmt(await hq(`select event, count(), count(distinct person_id) from events where ${S} and event in ('submit_start','submit_analyzed','submit_success','submit_error','submit_manual_fallback') group by event order by event`)));
console.log('에러:', fmt(await hq(`select properties.stage, properties.reason, count(), count(distinct person_id) from events where ${S} and event='submit_error' group by 1, 2 order by 3 desc limit 5`)));
console.log('클릭:', fmt(await hq(`select extract(elements_chain, 'data-cta="([a-z-]+)"') c, properties.$device_type d, count(), count(distinct person_id) from events where ${S} and event='$autocapture' and elements_chain like '%data-cta%' group by c, d order by c, d`)));
