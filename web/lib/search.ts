import { createPublicClient } from './supabase/server';
import { expand } from './synonyms';
import type { ArchiveItem, FAQItem } from '@/types/db';

// 카드 렌더에 실제 쓰는 컬럼만 (queries.ts와 동일 — 검색은 views/registered_at 필요)
const ARCHIVE_CARD_COLS =
  'id, kind, format, external_url, file_url, main_category, sub_category, title, summary, published_at, registered_at, views, tags';
const FAQ_CARD_COLS = 'id, main_category, question, answer, views';

export type SearchOpts = {
  kind?: 'files' | 'insights';
  format?: string;
  main?: string;
  sub?: string;
  sort?: 'relevance' | 'recent' | 'popular';
};

export type SearchResult = {
  archives: ArchiveItem[];
  faqs: FAQItem[];
  expanded: string[];
  synonymCanonical?: string;
};

function clean(s: string) {
  return s.replace(/[%_,()]/g, '').trim();
}

/** 검색어 + 동의어 OR 검색 → 자료 + FAQ + 관련도 점수 정렬 */
export async function searchAll(qRaw: string, opts: SearchOpts = {}): Promise<SearchResult> {
  const q = qRaw.trim();
  if (!q) return { archives: [], faqs: [], expanded: [] };

  const safe = clean(q);
  const syn = expand(q);
  const terms = Array.from(new Set([safe, ...(syn?.expanded.map(clean) ?? [])])).filter(Boolean);

  const sb = createPublicClient();

  const archP = Promise.all(
    terms.map(async (t) => {
      const like = `%${t}%`;
      let q1 = sb
        .from('archive_item')
        .select(ARCHIVE_CARD_COLS)
        .eq('status', 'public')
        .or(`title.ilike.${like},summary.ilike.${like}`);
      if (opts.kind) q1 = q1.eq('kind', opts.kind);
      if (opts.format) q1 = q1.eq('format', opts.format);
      if (opts.main) q1 = q1.eq('main_category', opts.main);
      if (opts.sub) q1 = q1.eq('sub_category', opts.sub);
      const r1 = await q1.limit(40);

      let q2 = sb
        .from('archive_item')
        .select(ARCHIVE_CARD_COLS)
        .eq('status', 'public')
        .contains('tags', [t]);
      if (opts.kind) q2 = q2.eq('kind', opts.kind);
      if (opts.format) q2 = q2.eq('format', opts.format);
      if (opts.main) q2 = q2.eq('main_category', opts.main);
      if (opts.sub) q2 = q2.eq('sub_category', opts.sub);
      const r2 = await q2.limit(20);
      return [...(r1.data ?? []), ...(r2.data ?? [])];
    })
  );

  const faqP = Promise.all(
    terms.map(async (t) => {
      const like = `%${t}%`;
      const r = await sb
        .from('faq')
        .select(FAQ_CARD_COLS)
        .or(`question.ilike.${like},answer.ilike.${like}`)
        .order('views', { ascending: false })
        .limit(20);
      return r.data ?? [];
    })
  );

  const [archAll, faqAll] = await Promise.all([archP, faqP]);

  const archMap = new Map<number, { item: ArchiveItem; score: number }>();
  archAll.forEach((rows, termIdx) => {
    const tScore = termIdx === 0 ? 10 : 5;
    for (const r of rows as ArchiveItem[]) {
      const prev = archMap.get(r.id);
      const titleHit = r.title.toLowerCase().includes(terms[termIdx].toLowerCase()) ? 5 : 0;
      const score = (prev?.score ?? 0) + tScore + titleHit;
      archMap.set(r.id, { item: r, score });
    }
  });

  const faqMap = new Map<number, { item: FAQItem; score: number }>();
  faqAll.forEach((rows, termIdx) => {
    const tScore = termIdx === 0 ? 10 : 5;
    for (const r of rows as FAQItem[]) {
      const prev = faqMap.get(r.id);
      faqMap.set(r.id, { item: r, score: (prev?.score ?? 0) + tScore });
    }
  });

  const sort = opts.sort ?? 'relevance';
  const archivesArr = [...archMap.values()];
  if (sort === 'relevance') archivesArr.sort((a, b) => b.score - a.score || (b.item.views - a.item.views));
  else if (sort === 'popular') archivesArr.sort((a, b) => b.item.views - a.item.views);
  else archivesArr.sort((a, b) => +new Date(b.item.registered_at) - +new Date(a.item.registered_at));

  const faqs = [...faqMap.values()].sort((a, b) => b.score - a.score || b.item.views - a.item.views).map((x) => x.item);

  return {
    archives: archivesArr.map((x) => x.item),
    faqs,
    expanded: terms,
    synonymCanonical: syn?.canonical,
  };
}
