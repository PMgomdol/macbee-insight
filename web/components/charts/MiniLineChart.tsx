import { linePath } from './svg';
import type { DayPoint } from '@/lib/metrics/types';

// ponytail: 축 없는 스파크라인 — 크로스헤어 툴팁 생략. 합계는 옆 StatTile이 보여줌.
// 상세 인터랙션 필요해지면 hover 레이어 추가.
export function MiniLineChart({ points, height = 48 }: { points: DayPoint[]; height?: number }) {
  const w = 240;
  const pts = linePath(points, w, height);
  if (!pts) return <div className="text-xs text-[var(--muted-2)]">데이터 없음</div>;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label="추이">
      <polyline
        points={pts}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
