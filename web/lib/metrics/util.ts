// 순수 헬퍼 — server-only/외부 클라이언트에 의존하지 않음(tsx 셀프체크 가능).
import type { DayPoint } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** 타임스탬프 배열을 최근 `days`일 일별 카운트로. 빈 날짜는 0으로 채움. endMs 기준 역산. */
export function bucketDaily(timestamps: string[], days: number, endMs: number): DayPoint[] {
  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    const key = new Date(ts).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(endMs - i * DAY_MS).toISOString().slice(0, 10);
    out.push({ date: key, value: counts.get(key) ?? 0 });
  }
  return out;
}

/** [시작, 끝] ISO 쌍들의 평균 경과 시간(시간 단위, 소수 1자리). 빈 배열이면 0. */
export function avgHoursBetween(pairs: [string, string][]): number {
  if (pairs.length === 0) return 0;
  const sum = pairs.reduce((a, [s, e]) => a + (new Date(e).getTime() - new Date(s).getTime()), 0);
  return Math.round((sum / pairs.length / 3600000) * 10) / 10;
}

/** GA4 'YYYYMMDD' → 'YYYY-MM-DD'. */
export function gaDateToISO(d: string): string {
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}
