import type { DayPoint } from '@/lib/metrics/types';

/** points → SVG polyline 좌표 문자열. 빈 배열이면 ''. 단일 점이면 수평선. */
export function linePath(points: DayPoint[], w: number, h: number, pad = 4): string {
  if (points.length === 0) return '';
  const max = Math.max(1, ...points.map((p) => p.value));
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const stepX = points.length === 1 ? 0 : innerW / (points.length - 1);
  return points
    .map((p, i) => {
      const x = pad + stepX * i;
      const y = pad + innerH - (p.value / max) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

// 셀프체크: npx --yes tsx web/components/charts/svg.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  const assert = (c: boolean, m: string) => { if (!c) throw new Error('FAIL: ' + m); };
  assert(linePath([], 100, 40) === '', '빈 배열은 빈 문자열');
  const one = linePath([{ date: 'd', value: 5 }], 100, 40, 4);
  assert(one.split(' ').length === 1, '단일 점은 좌표 1개');
  const two = linePath([{ date: 'a', value: 0 }, { date: 'b', value: 10 }], 100, 40, 4);
  const [p1, p2] = two.split(' ');
  assert(p1.startsWith('4.0,'), '첫 점 x=pad');
  assert(Number(p2.split(',')[1]) < Number(p1.split(',')[1]), '값 큰 점이 위(y 작음)');
  console.log('svg.ts self-check OK');
}
