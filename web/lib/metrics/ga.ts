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

export async function getSessionsTrend(days = 30): Promise<{ sessions: DayPoint[]; users: DayPoint[] } | null> {
  const c = client();
  if (!c) return null;
  const [res] = await c.runReport({
    property: prop(),
    dateRanges: range(days),
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });
  const sessions: DayPoint[] = [];
  const users: DayPoint[] = [];
  for (const r of res.rows ?? []) {
    const date = gaDateToISO(r.dimensionValues?.[0]?.value ?? '');
    sessions.push({ date, value: Number(r.metricValues?.[0]?.value ?? 0) });
    users.push({ date, value: Number(r.metricValues?.[1]?.value ?? 0) });
  }
  return { sessions, users };
}

export const getChannelBreakdown = (days = 30) => dims(days, 'sessionDefaultChannelGroup', 'sessions');
export const getDeviceBreakdown = (days = 30) => dims(days, 'deviceCategory', 'sessions');
export const getNewVsReturning = (days = 30) => dims(days, 'newVsReturning', 'activeUsers');
export const getTopCountries = (days = 30, limit = 6) => dims(days, 'country', 'activeUsers', limit);

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
