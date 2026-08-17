import { createPublicClient } from './supabase/server';
import { expand } from './synonyms';
import { getSearchIndex, isChosungQuery, chosungMatch, fuzzyMatch } from './search-index';
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

export type ScoredArchive = { item: ArchiveItem; score: number };

export type SearchResult = {
  archives: ArchiveItem[];
  faqs: FAQItem[];
  expanded: string[];
  synonymCanonical?: string;
  /** 정확 매칭 0건 → 초성/유사도 폴백으로 찾은 결과임을 표시 */
  fallback?: 'chosung' | 'fuzzy';
  /** 관련도 점수 동봉 (컷오프 실험용 — prod /search는 사용 안 함) */
  archivesScored?: ScoredArchive[];
};

function clean(s: string) {
  return s.replace(/[%_,()]/g, '').trim();
}

// 문장형 질의 대응 — "회원가입 정책이 궁금해요" → [회원가입, 정책]
// 검색 의도와 무관한 꼬리 어절
const STOPWORDS = new Set([
  '궁금해요', '궁금합니다', '궁금', '있을까요', '있나요', '있어요', '알려주세요',
  '알려줘', '주세요', '해주세요', '어떻게', '어떤', '무엇', '뭐', '관련', '자료',
  '예시', '샘플요청', '필요해요', '필요합니다', '좀', '혹시', '문의',
  '찾아줘', '찾아주세요', '찾아봐', '찾고있어요', '찾습니다', '검색', '검색해줘',
  '보여줘', '보여주세요', '추천', '추천해줘', '추천해주세요', '공유해주세요', '공유',
]);
// 어절 끝 조사 — 제거 후 2자 이상 남을 때만 적용 ("정책이"→"정책", "회의"는 유지)
const JOSA = /(이|가|을|를|은|는|의|에|에서|으로|로|이란|란|처럼|같은)$/;

function tokenize(q: string): string[] {
  const words = q.split(/\s+/).map(clean).filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    if (STOPWORDS.has(w)) continue;
    let t = w;
    const stripped = w.replace(JOSA, '');
    if (stripped.length >= 2 && stripped !== w) t = stripped;
    if (t.length >= 2 && !STOPWORDS.has(t)) out.push(t);
  }
  return Array.from(new Set(out)).slice(0, 4); // 과도한 쿼리 수 방지
}

/** 검색어 + 동의어 OR 검색 → 자료 + FAQ + 관련도 점수 정렬 */
export async function searchAll(qRaw: string, opts: SearchOpts = {}): Promise<SearchResult> {
  const q = qRaw.trim();
  if (!q) return { archives: [], faqs: [], expanded: [] };

  const safe = clean(q);
  const syn = expand(q);
  // 문장형이면 토큰도 검색 대상에 — 원질의(가중치 최고) > 토큰 > 동의어 순
  const tokens = tokenize(q);
  const tokenTerms = tokens.length >= 2 ? tokens : [];
  const terms = Array.from(
    new Set([safe, ...tokenTerms, ...(syn?.expanded.map(clean) ?? [])])
  ).filter(Boolean);

  const sb = createPublicClient();

  // 초성 질의("ㅍㄱㅁ")는 ilike로 잡히지 않음 — 처음부터 초성 인덱스로
  if (isChosungQuery(q)) {
    const index = await getSearchIndex();
    const ids = chosungMatch(index, safe);
    const archives = await fetchByIds(sb, ids, opts);
    return { archives, archivesScored: archives.map((item) => ({ item, score: 0 })), faqs: [], expanded: [safe], fallback: 'chosung' };
  }

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

  // 가중치: 원질의 전체 매칭 10 > 문장 토큰 7 > 동의어 5.
  // 토큰 여러 개에 함께 걸리면 합산되어 자연히 상위로.
  const weightOf = (termIdx: number) => {
    if (termIdx === 0) return 10;
    if (termIdx <= tokenTerms.length) return 7;
    return 5;
  };

  const archMap = new Map<number, { item: ArchiveItem; score: number }>();
  archAll.forEach((rows, termIdx) => {
    const tScore = weightOf(termIdx);
    for (const r of rows as ArchiveItem[]) {
      const prev = archMap.get(r.id);
      const titleHit = r.title.toLowerCase().includes(terms[termIdx].toLowerCase()) ? 5 : 0;
      const score = (prev?.score ?? 0) + tScore + titleHit;
      archMap.set(r.id, { item: r, score });
    }
  });

  const faqMap = new Map<number, { item: FAQItem; score: number }>();
  faqAll.forEach((rows, termIdx) => {
    const tScore = weightOf(termIdx);
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

  // 정확 매칭 0건 → 오타 허용 폴백 (바이그램 유사도). 정상 결과가 있으면 건드리지 않음.
  if (archivesArr.length === 0 && faqs.length === 0) {
    const index = await getSearchIndex();
    const ids = fuzzyMatch(index, safe);
    if (ids.length > 0) {
      const archives = await fetchByIds(sb, ids, opts);
      if (archives.length > 0) {
        return { archives, archivesScored: archives.map((item) => ({ item, score: 0 })), faqs: [], expanded: terms, synonymCanonical: syn?.canonical, fallback: 'fuzzy' };
      }
    }
  }

  return {
    archives: archivesArr.map((x) => x.item),
    archivesScored: archivesArr,
    faqs,
    expanded: terms,
    synonymCanonical: syn?.canonical,
  };
}

/** id 목록으로 카드 데이터 조회 — 입력 순서(관련도순) 보존 */
async function fetchByIds(
  sb: ReturnType<typeof createPublicClient>,
  ids: number[],
  opts: SearchOpts
): Promise<ArchiveItem[]> {
  if (ids.length === 0) return [];
  let q1 = sb
    .from('archive_item')
    .select(ARCHIVE_CARD_COLS)
    .eq('status', 'public')
    .in('id', ids);
  if (opts.kind) q1 = q1.eq('kind', opts.kind);
  if (opts.format) q1 = q1.eq('format', opts.format);
  if (opts.main) q1 = q1.eq('main_category', opts.main);
  if (opts.sub) q1 = q1.eq('sub_category', opts.sub);
  const { data } = await q1;
  const order = new Map(ids.map((id, i) => [id, i]));
  return ((data ?? []) as ArchiveItem[]).sort(
    (a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99)
  );
}
