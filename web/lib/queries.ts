import { unstable_cache } from 'next/cache';
import { createPublicClient } from './supabase/server';
import type { ArchiveItem, FAQItem, Category } from '@/types/db';

const MINUTE = 60;
const HOUR = 60 * 60;
const DAY = 24 * HOUR;

// 카드/리스트 렌더에 실제 쓰는 컬럼만 — RSC 페이로드 ~40% 절감
const ARCHIVE_CARD_COLS =
  'id, kind, format, external_url, file_url, main_category, sub_category, title, summary, published_at, registered_at, views, tags';
const FAQ_CARD_COLS = 'id, main_category, question, answer';

/**
 * 월간 Top — 최근 30일 view_event 집계 → 자료 조회.
 * 폴백: 30일 데이터 부족 시 누적 views 기준 (초기 운영 단계 대응).
 */
export const getMonthlyPopularItems = unstable_cache(
  async (limit = 10): Promise<ArchiveItem[]> => {
    const sb = createPublicClient();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    // 최근 30일 view_event → item_id별 카운트
    const { data: events } = await sb
      .from('view_event')
      .select('item_id')
      .gte('viewed_at', since);
    const counts = new Map<number, number>();
    for (const r of events ?? []) {
      const itemId = (r as { item_id: number }).item_id;
      counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
    }
    let topIds = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    // 30일 데이터 부족 시 누적 views 폴백
    if (topIds.length < limit) {
      const need = limit - topIds.length;
      const exclude = topIds.length > 0 ? `(${topIds.join(',')})` : '(0)';
      const { data: fallback } = await sb
        .from('archive_item')
        .select('id')
        .eq('status', 'public')
        .not('id', 'in', exclude)
        .order('views', { ascending: false })
        .order('registered_at', { ascending: false })
        .limit(need);
      const fbIds = (fallback ?? []).map((r) => (r as { id: number }).id);
      topIds = [...topIds, ...fbIds];
    }

    if (topIds.length === 0) return [];

    // 자료 상세 조회 — 순서 보존
    const { data: items } = await sb
      .from('archive_item')
      .select(ARCHIVE_CARD_COLS)
      .eq('status', 'public')
      .in('id', topIds);
    const map = new Map<number, ArchiveItem>();
    for (const it of (items ?? []) as ArchiveItem[]) map.set(it.id, it);
    return topIds.map((id) => map.get(id)).filter(Boolean) as ArchiveItem[];
  },
  ['monthly-popular-v1'],
  { revalidate: HOUR, tags: ['archive', 'popular'] }
);

// 호환 alias — 검색 결과 정렬 등에서 누적 views 기준 필요 시
export const getPopularItems = getMonthlyPopularItems;

export const getRecentItems = unstable_cache(
  async (limit = 8): Promise<ArchiveItem[]> => {
    const sb = createPublicClient();
    const { data } = await sb
      .from('archive_item')
      .select(ARCHIVE_CARD_COLS)
      .eq('status', 'public')
      .order('registered_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as ArchiveItem[];
  },
  ['recent-items-v4'],
  { revalidate: HOUR, tags: ['archive'] }
);

export const getItemsByKind = unstable_cache(
  async (
    kind: 'files' | 'insights',
    opts: { page?: number; pageSize?: number; main?: string; sub?: string; format?: string; sort?: 'recent' | 'popular' | 'views'; q?: string } = {}
  ) => {
    const { page = 1, pageSize = 24, main, sub, format, sort = 'recent', q: qRaw } = opts;
    const sb = createPublicClient();
    let q = sb
      .from('archive_item')
      .select(ARCHIVE_CARD_COLS, { count: 'exact' })
      .eq('status', 'public')
      .eq('kind', kind);
    if (main) q = q.eq('main_category', main);
    if (sub) q = q.eq('sub_category', sub);
    if (format) q = q.eq('format', format);
    if (qRaw && qRaw.trim()) {
      const safe = qRaw.trim().replace(/[%_,()]/g, '');
      const like = `%${safe}%`;
      q = q.or(`title.ilike.${like},summary.ilike.${like}`);
    }
    if (sort === 'popular' || sort === 'views') q = q.order('views', { ascending: false });
    q = q.order('registered_at', { ascending: false });
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count } = await q.range(from, to);
    return { items: (data ?? []) as ArchiveItem[], total: count ?? 0 };
  },
  ['items-by-kind-v5'],
  { revalidate: HOUR, tags: ['archive'] }
);

export const getFAQs = unstable_cache(
  async (): Promise<FAQItem[]> => {
    const sb = createPublicClient();
    const { data } = await sb
      .from('faq')
      .select(FAQ_CARD_COLS)
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
  ['category-counts-v4'],
  { revalidate: HOUR, tags: ['archive'] }
);

/** 특정 대분류 안의 소분류별 자료 수 */
export const getSubCategoryCounts = unstable_cache(
  async (main: string, kind?: 'files' | 'insights') => {
    if (!main) return {} as Record<string, number>;
    const sb = createPublicClient();
    let q = sb
      .from('archive_item')
      .select('sub_category')
      .eq('status', 'public')
      .eq('main_category', main);
    if (kind) q = q.eq('kind', kind);
    const { data } = await q;
    const counts: Record<string, number> = {};
    for (const r of data ?? []) {
      const s = r.sub_category;
      if (!s) continue;
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  },
  ['sub-category-counts-v1'],
  { revalidate: HOUR, tags: ['archive'] }
);
