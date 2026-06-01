import { createPublicClient } from './supabase/server';
import type { ArchiveItem, FAQItem } from '@/types/db';

export async function searchAll(q: string): Promise<{ archives: ArchiveItem[]; faqs: FAQItem[] }> {
  q = q.trim();
  if (!q) return { archives: [], faqs: [] };
  // PostgREST가 쓰는 PostgREST-or 문자 escape (%, , 를 제거)
  const safe = q.replace(/[%_,()]/g, '');
  const like = `%${safe}%`;
  const sb = createPublicClient();

  // archive_item: 제목·요약·태그 검색
  const archP = sb
    .from('archive_item')
    .select('*')
    .eq('status', 'public')
    .or(`title.ilike.${like},summary.ilike.${like}`)
    .order('views', { ascending: false })
    .limit(60);

  // 태그 배열 — 별도 쿼리 후 합침
  const tagP = sb
    .from('archive_item')
    .select('*')
    .eq('status', 'public')
    .contains('tags', [safe])
    .order('views', { ascending: false })
    .limit(20);

  const faqP = sb
    .from('faq')
    .select('*')
    .or(`question.ilike.${like},answer.ilike.${like}`)
    .order('views', { ascending: false })
    .limit(20);

  const [arch, tag, faq] = await Promise.all([archP, tagP, faqP]);

  // 중복 제거 (id 기준)
  const seen = new Set<number>();
  const archives: ArchiveItem[] = [];
  for (const r of [...(arch.data ?? []), ...(tag.data ?? [])]) {
    if (!seen.has(r.id)) { seen.add(r.id); archives.push(r as ArchiveItem); }
  }

  return { archives, faqs: (faq.data ?? []) as FAQItem[] };
}
