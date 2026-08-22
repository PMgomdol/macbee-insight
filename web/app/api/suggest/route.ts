import { NextResponse } from 'next/server';
import { expand, allKeys, TRENDING } from '@/lib/synonyms';
import { getSearchIndex, isChosungQuery, toChosung } from '@/lib/search-index';

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

// 자동완성은 키 입력마다 호출되므로 지연이 곧 체감 렉.
// 예전엔 매 호출마다 Supabase ilike 3회(제목·태그·카테고리) 왕복 → ~1s.
// 이제 1시간 캐시된 인메모리 인덱스(getSearchIndex)만 필터 → DB 왕복 0, ~수십ms.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '10') || 10, 20);

  const index = await getSearchIndex();

  // 입력 없음 → 트렌드 + 인기 태그
  if (!q) {
    const tagc = new Map<string, number>();
    for (const e of index) {
      for (const t of e.tags) {
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

  // 초성 입력("ㅍㄱㅁ") — 초성 인덱스로 제목·태그 제안
  if (isChosungQuery(q)) {
    const needle = q.replace(/\s+/g, '');
    const titles: Suggestion[] = [];
    const tagc = new Map<string, number>();
    for (const e of index) {
      if (titles.length < 6 && e.cho.includes(needle)) {
        titles.push({ type: 'title', text: e.title, url: e.url || `/search?q=${encodeURIComponent(e.title)}`, meta: e.category });
      }
      for (const t of e.tags) {
        if (toChosung(t.replace(/\s+/g, '')).includes(needle)) {
          tagc.set(t, (tagc.get(t) ?? 0) + 1);
        }
      }
    }
    const tags: Suggestion[] = [...tagc.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([text, count]) => ({ type: 'tag', text, count }));
    return NextResponse.json<Resp>({
      query: q,
      trending: TRENDING,
      synonyms: null,
      suggestions: [...tags, ...titles].slice(0, limit),
    });
  }

  // 일반 텍스트 — 인메모리 부분일치 필터
  const ql = q.toLowerCase();
  const syn = expand(q);

  // 제목 (부분일치, 조회수 높은 순)
  const titles: Suggestion[] = index
    .filter((e) => e.title.toLowerCase().includes(ql))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8)
    .map((e) => ({
      type: 'title',
      text: e.title,
      url: e.url || `/${e.kind === 'files' ? 'files' : 'insights'}`,
      meta: e.category,
    }));

  // 태그 빈도 (q 부분일치)
  const tagc = new Map<string, number>();
  for (const e of index) {
    for (const t of e.tags) {
      if (t.toLowerCase().includes(ql)) tagc.set(t, (tagc.get(t) ?? 0) + 1);
    }
  }
  const tags: Suggestion[] = [...tagc.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([text, count]) => ({ type: 'tag', text, count }));

  // 카테고리 (q 부분일치)
  const catc = new Map<string, number>();
  for (const e of index) {
    if (e.category && e.category.toLowerCase().includes(ql)) catc.set(e.category, (catc.get(e.category) ?? 0) + 1);
  }
  const cats: Suggestion[] = [...catc.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([text, count]) => ({ type: 'category', text, count }));

  // 동의어 제안
  const synSugs: Suggestion[] = [];
  if (syn) {
    for (const e of syn.expanded.slice(0, 4)) synSugs.push({ type: 'synonym', text: e, from: syn.canonical });
  } else {
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
