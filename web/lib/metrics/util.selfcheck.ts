import { bucketDaily, avgHoursBetween, gaDateToISO } from './util';
const assert = (c: boolean, m: string) => { if (!c) throw new Error('FAIL: ' + m); };

const end = Date.UTC(2026, 7, 19); // 2026-08-19
const b = bucketDaily(['2026-08-19T05:00:00Z', '2026-08-19T09:00:00Z', '2026-08-17T00:00:00Z'], 3, end);
assert(b.length === 3, '3일치');
assert(b[2].date === '2026-08-19' && b[2].value === 2, '마지막날 2건');
assert(b[0].date === '2026-08-17' && b[0].value === 1, '첫날 1건');
assert(b[1].value === 0, '중간 빈날 0');

assert(avgHoursBetween([]) === 0, '빈 쌍 0');
assert(avgHoursBetween([['2026-08-19T00:00:00Z', '2026-08-19T12:00:00Z']]) === 12, '12시간');

assert(gaDateToISO('20260819') === '2026-08-19', 'GA 날짜 파싱');
console.log('metrics util self-check OK');
