import { unstable_cache } from 'next/cache';
import { createPublicClient } from './supabase/server';

/**
 * 인메모리 퍼지 검색 인덱스 — 오타 허용 + 초성 검색.
 *
 * 자료 ~700건 규모에선 DB 확장(pg_trgm) 없이 제목·태그를 통째로 캐시해
 * 서버에서 바이그램 유사도를 계산하는 쪽이 배포·운영이 단순하다.
 * (수천 건 규모가 되면 pg_trgm/tsvector 마이그레이션으로 교체 — 기존 로드맵)
 */

export type IndexEntry = {
  id: number;
  title: string;
  tags: string[];
  /** 제목의 초성 문자열 (공백 제거) — "피그마 가이드" → "ㅍㄱㅁㄱㅇㄷ" */
  cho: string;
};

const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

/** 한글 음절 → 초성. 그 외 문자는 그대로 (영문·숫자 혼용 제목 대응) */
export function toChosung(s: string): string {
  let out = '';
  for (const c of s) {
    const code = c.charCodeAt(0) - 0xac00;
    out += code >= 0 && code < 11172 ? CHO[Math.floor(code / 588)] : c;
  }
  return out;
}

/** 질의가 초성으로만 이뤄졌는지 — "ㅍㄱㅁ", "ㅎㅁㅅㄱ" 등 (2자 이상) */
export function isChosungQuery(q: string): boolean {
  const s = q.replace(/\s+/g, '');
  return s.length >= 2 && /^[ㄱ-ㅎ]+$/.test(s);
}

const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

/**
 * 한글 음절 → 자모 분해 ("픽마" → "ㅍㅣㄱㅁㅏ").
 * 음절 단위 바이그램은 한 글자 오타에도 교집합이 0이 되므로
 * (픽마={픽마} vs 피그마={피그,그마}) 자모 수준에서 비교해야 오타가 잡힌다.
 */
function toJamo(s: string): string {
  let out = '';
  for (const c of s) {
    const code = c.charCodeAt(0) - 0xac00;
    if (code >= 0 && code < 11172) {
      out += CHO[Math.floor(code / 588)] + JUNG[Math.floor((code % 588) / 28)] + JONG[code % 28];
    } else {
      out += c;
    }
  }
  return out;
}

function bigrams(s: string): Set<string> {
  const t = toJamo(s.toLowerCase().replace(/\s+/g, ''));
  const out = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
}

/** 바이그램 Dice 계수 (0~1) — 짧은 한글 단어 오타에 잘 맞음 */
export function diceSimilarity(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}

export const getSearchIndex = unstable_cache(
  async (): Promise<IndexEntry[]> => {
    const sb = createPublicClient();
    const { data } = await sb
      .from('archive_item')
      .select('id, title, tags')
      .eq('status', 'public')
      .limit(2000);
    return (data ?? []).map((r) => ({
      id: r.id as number,
      title: (r.title as string) ?? '',
      tags: ((r.tags as string[] | null) ?? []).filter(Boolean),
      cho: toChosung(((r.title as string) ?? '').replace(/\s+/g, '')),
    }));
  },
  ['search-fuzzy-index'],
  { revalidate: 60 * 60, tags: ['archive'] }
);

/** 초성 질의 매칭 — 제목 초성 연속 포함 or 태그 초성 매칭 */
export function chosungMatch(index: IndexEntry[], q: string, limit = 12): number[] {
  const needle = q.replace(/\s+/g, '');
  const hits: { id: number; pos: number }[] = [];
  for (const e of index) {
    const pos = e.cho.indexOf(needle);
    if (pos >= 0) {
      hits.push({ id: e.id, pos });
      continue;
    }
    if (e.tags.some((t) => toChosung(t.replace(/\s+/g, '')).includes(needle))) {
      hits.push({ id: e.id, pos: 100 });
    }
  }
  // 제목 앞쪽 매칭 우선
  return hits.sort((a, b) => a.pos - b.pos).slice(0, limit).map((h) => h.id);
}

/**
 * 오타 허용 매칭 — 질의를 제목 단어·태그와 바이그램 유사도로 비교.
 * 정확 검색이 0건일 때만 폴백으로 사용 (정상 결과 정렬을 오염시키지 않음).
 */
export function fuzzyMatch(index: IndexEntry[], q: string, limit = 12): number[] {
  const needle = q.trim();
  if (needle.replace(/\s+/g, '').length < 2) return [];
  const scored: { id: number; score: number }[] = [];
  for (const e of index) {
    let best = diceSimilarity(needle, e.title);
    for (const w of e.title.split(/[\s·/|()\-—]+/)) {
      if (w.length >= 2) best = Math.max(best, diceSimilarity(needle, w));
    }
    for (const t of e.tags) best = Math.max(best, diceSimilarity(needle, t));
    if (best >= 0.5) scored.push({ id: e.id, score: best });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.id);
}
