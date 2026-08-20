import 'server-only';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import type { DayPoint, LabelValue } from './types';
import { gaDateToISO } from './util';

export function gaConfigured(): boolean {
  return Boolean(process.env.GA_PROPERTY_ID && process.env.GA_SERVICE_ACCOUNT_JSON);
}

let cached: BetaAnalyticsDataClient | null | undefined;
function client(): BetaAnalyticsDataClient | null {
  if (cached !== undefined) return cached;
  if (!gaConfigured()) {
    cached = null;
    return null;
  }
  const creds = JSON.parse(Buffer.from(process.env.GA_SERVICE_ACCOUNT_JSON!, 'base64').toString('utf8'));
  cached = new BetaAnalyticsDataClient({ credentials: creds });
  return cached;
}

const prop = () => `properties/${process.env.GA_PROPERTY_ID}`;
const range = (days: number) => [{ startDate: `${days}daysAgo`, endDate: 'today' }];

async function dims(days: number, dimension: string, metric: string, limit?: number): Promise<LabelValue[] | null> {
  const c = client();
  if (!c) return null;
  const [res] = await c.runReport({
    property: prop(),
    dateRanges: range(days),
    dimensions: [{ name: dimension }],
    metrics: [{ name: metric }],
    orderBys: [{ metric: { metricName: metric }, desc: true }],
    limit,
  });
  return (res.rows ?? []).map((r) => {
    const raw = r.dimensionValues?.[0]?.value;
    const label = raw && raw !== '(not set)' ? raw : '(기타)';
    return { label, value: Number(r.metricValues?.[0]?.value ?? 0) };
  });
}

// 추이는 '참여 방문(engagedSessions)'과 '전체 방문(sessions)' 둘 다 반환.
// 참여 = 10초+ 머물거나·2페이지+ 보거나·전환한 방문 → 1페이지 찍고 튀는 봇/크롤러 자동 제외.
export async function getSessionsTrend(days = 30): Promise<{ engaged: DayPoint[]; total: DayPoint[] } | null> {
  const c = client();
  if (!c) return null;
  const [res] = await c.runReport({
    property: prop(),
    dateRanges: range(days),
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'engagedSessions' }, { name: 'sessions' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });
  const engaged: DayPoint[] = [];
  const total: DayPoint[] = [];
  for (const r of res.rows ?? []) {
    const date = gaDateToISO(r.dimensionValues?.[0]?.value ?? '');
    engaged.push({ date, value: Number(r.metricValues?.[0]?.value ?? 0) });
    total.push({ date, value: Number(r.metricValues?.[1]?.value ?? 0) });
  }
  return { engaged, total };
}

// 지역·채널·기기·신규재방문 = 참여 세션 기준 (봇에 덜 흔들리는 업계 표준 지표).
export const getChannelBreakdown = (days = 30) => dims(days, 'sessionDefaultChannelGroup', 'engagedSessions');
export const getDeviceBreakdown = (days = 30) => dims(days, 'deviceCategory', 'engagedSessions');
export const getNewVsReturning = (days = 30) => dims(days, 'newVsReturning', 'engagedSessions');
export const getTopCountries = (days = 30, limit = 6) => dims(days, 'country', 'engagedSessions', limit);

export async function getEngagement(days = 30): Promise<{ avgSessionSec: number; engagementRate: number } | null> {
  const c = client();
  if (!c) return null;
  const [res] = await c.runReport({
    property: prop(),
    dateRanges: range(days),
    metrics: [{ name: 'averageSessionDuration' }, { name: 'engagementRate' }],
  });
  const m = res.rows?.[0]?.metricValues ?? [];
  return {
    avgSessionSec: Math.round(Number(m[0]?.value ?? 0)),
    engagementRate: Math.round(Number(m[1]?.value ?? 0) * 1000) / 10,
  };
}
