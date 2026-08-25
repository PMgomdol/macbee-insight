import { linePath } from './svg';
import type { DayPoint } from '@/lib/metrics/types';

// 'YYYY-MM-DD' → 'MM.DD'
function shortDate(d: string): string {
  return d.length >= 10 ? d.slice(5).replace('-', '.') : d;
}

// 스파크라인 + 축 수치. y축=최대·0(baseline 0), x축=시작·끝 날짜.
// 합계는 옆 StatTile이 별도로 보여줌. 상세 hover 툴팁 필요해지면 레이어 추가.
export function MiniLineChart({ points, height = 48 }: { points: DayPoint[]; height?: number }) {
  const w = 240;
  const pts = linePath(points, w, height);
  if (!pts) return <div className="text-xs text-[var(--muted-2)]">데이터 없음</div>;

  const max = Math.max(1, ...points.map((p) => p.value));
  const first = points[0]?.date;
  const last = points[points.length - 1]?.date;

  return (
    <div className="flex gap-1.5">
      {/* y축 눈금 (최대 / 0) */}
      <div
        className="flex flex-col justify-between text-[9px] leading-none text-[var(--muted-2)] tabular-nums shrink-0 py-px"
        style={{ height }}
        aria-hidden
      >
        <span>{max.toLocaleString()}</span>
        <span>0</span>
      </div>
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <svg
          viewBox={`0 0 ${w} ${height}`}
          preserveAspectRatio="none"
          style={{ height }}
          className="w-full"
          role="img"
          aria-label={`추이 — 최대 ${max.toLocaleString()}, ${first ?? ''}~${last ?? ''}`}
        >
          <polyline
            points={pts}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* x축 날짜 (시작 / 끝) */}
        <div className="flex justify-between text-[9px] leading-none text-[var(--muted-2)] tabular-nums" aria-hidden>
          <span>{shortDate(first)}</span>
          <span>{shortDate(last)}</span>
        </div>
      </div>
    </div>
  );
}
