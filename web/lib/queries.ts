import { unstable_cache } from 'next/cache';
import { createPublicClient } from './supabase/server';
import type { ArchiveItem, FAQItem, Category } from '@/types/db';

const HOUR = 60 * 60;
const DAY = 24 * HOUR;

export const getPopularItems = unstable_cache(
  async (limit = 8): Promise<ArchiveItem[]> => {
    const sb = createPublicClient();
    const { data } = await sb
      .from('archive_item')
      .select('*')
      .eq('status', 'public')
      .order('views', { ascending: false })
      .order('registered_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as ArchiveItem[];
  },
  ['popular-items-v2'],
  { revalidate: HOUR, tags: ['archive'] }
);

export const getRecentItems = unstable_cache(
  async (limit = 8): Promise<ArchiveItem[]> => {
    const sb = createPublicClient();
    const { data } = await sb
      .from('archive_item')
      .select('*')
      .eq('status', 'public')
      .order('registered_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as ArchiveItem[];
  },
  ['recent-items-v2'],
  { revalidate: HOUR, tags: ['archive'] }
);

export const getItemsByKind = unstable_cache(
  async (
    kind: 'files' | 'insights',
    opts: { page?: number; pageSize?: number; main?: string; sub?: string; format?: string; sort?: 'recent' | 'popular' | 'views' } = {}
  ) => {
    const { page = 1, pageSize = 24, main, sub, format, sort = 'recent' } = opts;
    const sb = createPublicClient();
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
  },
  ['items-by-kind-v2'],
  { revalidate: HOUR, tags: ['archive'] }
);

export const getFAQs = unstable_cache(
  async (): Promise<FAQItem[]> => {
    const sb = createPublicClient();
    const { data } = await sb
      .from('faq')
      .select('*')
      .order('main_category')
      .order('registered_at', { ascending: false });
    return (data ?? []) as FAQItem[];
  },
  ['faqs'],
  { revalidate: HOUR, tags: ['faq'] }
);

export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const sb = createPublicClient();
    const { data } = await sb.from('category').select('*').order('main_category').order('sub_category');
    return (data ?? []) as Category[];
  },
  ['categories'],
  { revalidate: DAY, tags: ['category'] }
);

export const getCategoryCounts = unstable_cache(
  async (kind?: 'files' | 'insights') => {
    const sb = createPublicClient();
    let q = sb
      .from('archive_item')
      .select('main_category')
      .eq('status', 'public');
    if (kind) q = q.eq('kind', kind);
    const { data } = await q;
    const counts: Record<string, number> = {};
    for (const r of data ?? []) {
      counts[r.main_category] = (counts[r.main_category] ?? 0) + 1;
    }
    return counts;
  },
  ['category-counts-v2'],
  { revalidate: HOUR, tags: ['archive'] }
);
