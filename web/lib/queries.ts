import { createClient } from './supabase/server';
import type { ArchiveItem, FAQItem, Category } from '@/types/db';

export async function getPopularItems(limit = 8): Promise<ArchiveItem[]> {
  const sb = await createClient();
  const { data } = await sb
    .from('archive_item')
    .select('*')
    .eq('status', 'public')
    .order('views', { ascending: false })
    .order('registered_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as ArchiveItem[];
}

export async function getRecentItems(limit = 8): Promise<ArchiveItem[]> {
  const sb = await createClient();
  const { data } = await sb
    .from('archive_item')
    .select('*')
    .eq('status', 'public')
    .order('registered_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as ArchiveItem[];
}

export async function getItemsByKind(
  kind: 'files' | 'insights',
  opts: { page?: number; pageSize?: number; main?: string; sub?: string; format?: string; sort?: 'recent' | 'popular' | 'views' } = {}
) {
  const { page = 1, pageSize = 24, main, sub, format, sort = 'recent' } = opts;
  const sb = await createClient();
  let q = sb
    .from('archive_item')
    .select('*', { count: 'exact' })
    .eq('status', 'public')
    .eq('kind', kind);
  if (main) q = q.eq('main_category', main);
  if (sub) q = q.eq('sub_category', sub);
  if (format) q = q.eq('format', format);
  if (sort === 'popular' || sort === 'views') q = q.order('views', { ascending: false });
  q = q.order('registered_at', { ascending: false });
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count } = await q.range(from, to);
  return { items: (data ?? []) as ArchiveItem[], total: count ?? 0 };
}

export async function getFAQs(): Promise<FAQItem[]> {
  const sb = await createClient();
  const { data } = await sb
    .from('faq')
    .select('*')
    .order('main_category')
    .order('registered_at', { ascending: false });
  return (data ?? []) as FAQItem[];
}

export async function getCategories(): Promise<Category[]> {
  const sb = await createClient();
  const { data } = await sb.from('category').select('*').order('main_category').order('sub_category');
  return (data ?? []) as Category[];
}

export async function getCategoryCounts() {
  const sb = await createClient();
  const { data } = await sb
    .from('archive_item')
    .select('main_category')
    .eq('status', 'public');
  const counts = new Map<string, number>();
  for (const r of data ?? []) {
    counts.set(r.main_category, (counts.get(r.main_category) ?? 0) + 1);
  }
  return counts;
}
