import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/server';
import { expand, allKeys, TRENDING } from '@/lib/synonyms';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

type Suggestion =
  | { type: 'title'; text: string; url: string; meta?: string }
  | { type: 'tag'; text: string; count: number }
  | { type: 'category'; text: string; count: number }
  | { type: 'synonym'; text: string; from: string };

type Resp = {
  query: string;
  trending: string[];
  synonyms: { from: string; expanded: string[] } | null;
  suggestions: Suggestion[];
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '10') || 10, 20);

  const sb = createPublicClient();

  // 입력 없음 → 트렌드 + 인기 태그
  if (!q) {
    const { data: items } = await sb
      .from('archive_item')
      .select('tags')
      .eq('status', 'public')
      .limit(500);
    const tagc = new Map<string, number>();
    for (const it of items ?? []) {
      for (const t of (it.tags as string[] | null) ?? []) {
        const k = t.trim();
        if (k) tagc.set(k, (tagc.get(k) ?? 0) + 1);
      }
    }
    const topTags: Suggestion[] = [...tagc.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([text, count]) => ({ type: 'tag', text, count }));
    return NextResponse.json<Resp>({ query: '', trending: TRENDING, synonyms: null, suggestions: topTags });
  }

  // 동의어 확장
  const syn = expand(q);

  // 검색어 본체 + 동의어를 OR로 묶어서 후보 ilike — like-escape 안전
  const safe = q.replace(/[%_,()]/g, '');
  const like = `%${safe}%`;

  // 제목 prefix·contain 매칭
  const titleP = sb
    .from('archive_item')
    .select('id, title, kind, main_category, file_url, external_url')
    .eq('status', 'public')
    .ilike('title', like)
    .order('views', { ascending: false })
    .limit(8);

  // 태그 contains
  const tagP = sb
    .from('archive_item')
    .select('tags')
    .eq('status', 'public')
    .ilike('tags::text', like)
    .limit(200);

  // 카테고리 매칭
  const catP = sb
    .from('archive_item')
    .select('main_category')
    .eq('status', 'public')
    .ilike('main_category', like)
    .limit(50);

  const [titleR, tagR, catR] = await Promise.all([titleP, tagP, catP]);

  const titles: Suggestion[] = (titleR.data ?? []).map((it: any) => ({
    type: 'title',
    text: it.title,
    url: it.file_url || it.external_url || `/${it.kind === 'files' ? 'files' : 'insights'}`,
    meta: it.main_category,
  }));

  // 태그 빈도 집계 (q 부분일치만)
  const tagc = new Map<string, number>();
  for (const it of tagR.data ?? []) {
    for (const t of (it.tags as string[] | null) ?? []) {
      if (t.toLowerCase().includes(q.toLowerCase())) {
        tagc.set(t, (tagc.get(t) ?? 0) + 1);
      }
    }
  }
  const tags: Suggestion[] = [...tagc.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([text, count]) => ({ type: 'tag', text, count }));

  const catc = new Map<string, number>();
  for (const it of catR.data ?? []) {
    catc.set(it.main_category, (catc.get(it.main_category) ?? 0) + 1);
  }
  const cats: Suggestion[] = [...catc.entries()]
    .slice(0, 3)
    .map(([text, count]) => ({ type: 'category', text, count }));

  // 동의어 제안 — 본 검색어가 매핑 사전에 없어도 비슷한 키 노출
  const synSugs: Suggestion[] = [];
  if (syn) {
    for (const e of syn.expanded.slice(0, 4)) {
      synSugs.push({ type: 'synonym', text: e, from: syn.canonical });
    }
  } else {
    // 사전 키 prefix·contains 매칭
    const ql = q.toLowerCase();
    const matched = allKeys()
      .filter((k) => k.toLowerCase().includes(ql) && k.toLowerCase() !== ql)
      .slice(0, 3);
    for (const m of matched) synSugs.push({ type: 'synonym', text: m, from: m });
  }

  // 최종 정렬: synonyms → tags → categories → titles
  const all: Suggestion[] = [...synSugs, ...tags, ...cats, ...titles].slice(0, limit);

  return NextResponse.json<Resp>({
    query: q,
    trending: TRENDING,
    synonyms: syn ? { from: syn.canonical, expanded: syn.expanded } : null,
    suggestions: all,
  });
}
