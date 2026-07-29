'use client';
import { useEffect } from 'react';
import { track } from '@/lib/track';

/**
 * 검색 결과 수 트래킹 — search_submit은 결과를 알기 전(클라이언트 제출 시점)에
 * 찍히므로, 실제 결과 수·폴백 여부는 서버 렌더 후 여기서 별도 이벤트로 기록.
 * "0건 검색어 리포트"의 데이터 소스.
 */
export function SearchResultsTracker({
  query,
  count,
  fallback,
}: {
  query: string;
  count: number;
  fallback?: 'chosung' | 'fuzzy';
}) {
  useEffect(() => {
    if (!query) return;
    track('search_results', { query, count, fallback: fallback ?? 'none' });
  }, [query, count, fallback]);
  return null;
}
