import 'server-only';
import type { DayPoint, LabelValue } from './types';
import { bucketDaily } from './util';

// HogQL Query API. 수집키(phc_)가 아니라 개인키(phx_)가 필요 — 읽기 전용.
// 쿼리엔 사용자 입력이 안 들어가고 days/limit는 코드가 통제하는 정수라 인젝션 위험 없음.
const HOST = 'https://us.posthog.com';
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID ?? '498450';

export function posthogConfigured(): boolean {
  return Boolean(process.env.POSTHOG_PERSONAL_API_KEY);
}

async function hogql(query: string): Promise<unknown[][] | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${HOST}/api/projects/${PROJECT_ID}/query/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
      next: { revalidate: 3600, tags: ['metrics-posthog'] }, // 1시간 캐시
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: unknown[][] };
    return data.results ?? null;
  } catch {
    return null;
  }
}

function toLabelValues(rows: unknown[][] | null): LabelValue[] | null {
  if (!rows) return null;
  return rows.map((r) => ({ label: String(r[0] ?? '') || '(기타)', value: Number(r[1] ?? 0) }));
}

const since = (days: number) => `timestamp > now() - INTERVAL ${days} DAY`;

export function getTopSearches(days = 30, limit = 10) {
  return toLabelValues0(
    `SELECT properties.query AS q, count() AS c FROM events
     WHERE event='search_submit' AND ${since(days)} AND properties.query != ''
     GROUP BY q ORDER BY c DESC LIMIT ${limit}`
  );
}

export function getZeroResultSearches(days = 30, limit = 10) {
  return toLabelValues0(
    `SELECT properties.query AS q, count() AS c FROM events
     WHERE event='search_results' AND toInt(properties.count)=0 AND ${since(days)} AND properties.query != ''
     GROUP BY q ORDER BY c DESC LIMIT ${limit}`
  );
}

export function getFilterUsage(days = 30, limit = 10) {
  return toLabelValues0(
    `SELECT properties.type AS t, count() AS c FROM events
     WHERE event='filter_change' AND ${since(days)}
     GROUP BY t ORDER BY c DESC LIMIT ${limit}`
  );
}

export function getCardClickCategories(days = 30, limit = 10) {
  return toLabelValues0(
    `SELECT properties.category AS cat, count() AS c FROM events
     WHERE event='card_click' AND ${since(days)}
     GROUP BY cat ORDER BY c DESC LIMIT ${limit}`
  );
}

async function toLabelValues0(query: string) {
  return toLabelValues(await hogql(query));
}

export async function getConversion(days = 30) {
  const rows = await hogql(
    `SELECT countIf(event='search_submit'), countIf(event='search_result_click'),
            countIf(event='card_click'), countIf(event='search_results'),
            countIf(event='search_results' AND toInt(properties.count)=0)
     FROM events WHERE ${since(days)}`
  );
  if (!rows || !rows[0]) return null;
  const [searches, resultClicks, cardClicks, searchResults, zeroResults] = rows[0].map(Number);
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
  return {
    searches,
    resultClicks,
    cardClicks,
    searchSuccessRate: pct(resultClicks, searches),
    zeroRate: pct(zeroResults, searchResults),
  };
}

// 다운로드 = card_click 중 action='download'인 것 (파일/문서형 자료 클릭).
// 조회수와 뭉뚱그리지 않고 여기서만 집계. 추이는 배포 후 쌓인 이벤트 기준(소급 불가).
export async function getDownloadStats(days = 30): Promise<{ total: number; trend: DayPoint[] } | null> {
  const rows = await hogql(
    `SELECT timestamp FROM events
     WHERE event='card_click' AND properties.action='download' AND ${since(days)}`
  );
  if (!rows) return null;
  const ts = rows.map((r) => String(r[0]));
  return { total: ts.length, trend: bucketDaily(ts, days, Date.now()) };
}

export async function getReturningRate(days = 30) {
  const rows = await hogql(
    `SELECT count(DISTINCT person_id),
            count(DISTINCT if(person_id IN (
              SELECT DISTINCT person_id FROM events WHERE timestamp < now() - INTERVAL ${days} DAY
            ), person_id, NULL))
     FROM events WHERE ${since(days)}`
  );
  if (!rows || !rows[0]) return null;
  const [total, returning] = rows[0].map(Number);
  return { total, returning, rate: total > 0 ? Math.round((returning / total) * 1000) / 10 : 0 };
}
