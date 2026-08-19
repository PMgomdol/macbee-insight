import 'server-only';
import { createAdminClient } from '@/lib/supabase/server';
import type { DayPoint, LabelValue } from './types';
import { bucketDaily, avgHoursBetween } from './util';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 30;

export async function getViewsTrend(days = DEFAULT_DAYS): Promise<DayPoint[]> {
  const sb = createAdminClient();
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const { data } = await sb.from('view_event').select('viewed_at').gte('viewed_at', since);
  return bucketDaily((data ?? []).map((r) => r.viewed_at as string), days, Date.now());
}

export async function getNewItemsTrend(days = DEFAULT_DAYS): Promise<DayPoint[]> {
  const sb = createAdminClient();
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const { data } = await sb.from('archive_item').select('registered_at').gte('registered_at', since);
  return bucketDaily((data ?? []).map((r) => r.registered_at as string), days, Date.now());
}

export async function getTopViewedItems(days = DEFAULT_DAYS, limit = 10): Promise<LabelValue[]> {
  const sb = createAdminClient();
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const { data: ev } = await sb.from('view_event').select('item_id').gte('viewed_at', since);
  const counts = new Map<number, number>();
  for (const r of ev ?? []) counts.set(r.item_id as number, (counts.get(r.item_id as number) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (top.length === 0) return [];
  const { data: items } = await sb.from('archive_item').select('id, title').in('id', top.map(([id]) => id));
  const titles = new Map((items ?? []).map((i) => [i.id as number, i.title as string]));
  return top.map(([id, value]) => ({ label: titles.get(id) ?? `#${id}`, value }));
}

export async function getDownloadsSummary(limit = 10): Promise<{ total: number; top: LabelValue[] }> {
  const sb = createAdminClient();
  const { data } = await sb
    .from('archive_item')
    .select('title, downloads')
    .gt('downloads', 0)
    .order('downloads', { ascending: false })
    .limit(limit);
  const { data: all } = await sb.from('archive_item').select('downloads').gt('downloads', 0);
  const total = (all ?? []).reduce((a, r) => a + (r.downloads as number), 0);
  return { total, top: (data ?? []).map((r) => ({ label: r.title as string, value: r.downloads as number })) };
}

export async function getProposalThroughput(days = DEFAULT_DAYS) {
  const sb = createAdminClient();
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const { data } = await sb
    .from('staging_proposal')
    .select('status, proposed_at, reviewed_at')
    .gte('proposed_at', since);
  const rows = data ?? [];
  const approved = rows.filter((r) => r.status === 'approved').length;
  const rejected = rows.filter((r) => r.status === 'rejected' || r.status === 'duplicate').length;
  const pairs = rows
    .filter((r) => r.reviewed_at && r.status === 'approved')
    .map((r) => [r.proposed_at, r.reviewed_at] as [string, string]);
  return { approved, rejected, avgApprovalHours: avgHoursBetween(pairs) };
}

export async function getFeedbackThroughput(days = DEFAULT_DAYS) {
  const sb = createAdminClient();
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const { data } = await sb
    .from('feedback')
    .select('kind, submitted_at, answered_at')
    .gte('submitted_at', since);
  const rows = data ?? [];
  const incoming = bucketDaily(rows.map((r) => r.submitted_at as string), days, Date.now());
  const kindMap = new Map<string, number>();
  for (const r of rows) kindMap.set(r.kind as string, (kindMap.get(r.kind as string) ?? 0) + 1);
  const byKind = [...kindMap.entries()].map(([label, value]) => ({ label, value }));
  const pairs = rows
    .filter((r) => r.answered_at)
    .map((r) => [r.submitted_at, r.answered_at] as [string, string]);
  return { incoming, byKind, avgResolutionHours: avgHoursBetween(pairs) };
}
