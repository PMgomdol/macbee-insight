import { Search, MousePointerClick, SlidersHorizontal, Repeat } from 'lucide-react';
import { StatTile } from '@/components/charts/StatTile';
import { BarList } from '@/components/charts/BarList';
import {
  posthogConfigured,
  getTopSearches,
  getZeroResultSearches,
  getFilterUsage,
  getCardClickCategories,
  getConversion,
  getReturningRate,
} from '@/lib/metrics/posthog';
import { BehaviorEmpty } from './BehaviorEmpty';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="app-card p-4 flex flex-col gap-3">
      <h3 className="text-sm font-medium text-[var(--fg)]">{title}</h3>
      {children}
    </div>
  );
}

export async function BehaviorPanel() {
  if (!posthogConfigured()) return <BehaviorEmpty />;

  const [topSearch, zeroSearch, filters, cardCats, conv, ret] = await Promise.all([
    getTopSearches(30, 8),
    getZeroResultSearches(30, 8),
    getFilterUsage(30, 8),
    getCardClickCategories(30, 8),
    getConversion(30),
    getReturningRate(30),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="검색 성공률" value={`${conv?.searchSuccessRate ?? 0}%`} sub="검색 → 결과 클릭" icon={Search} />
        <StatTile label="무결과 검색률" value={`${conv?.zeroRate ?? 0}%`} sub="낮을수록 좋음" icon={Search} />
        <StatTile label="카드 클릭" value={conv?.cardClicks ?? 0} sub={`검색 ${conv?.searches ?? 0}회`} icon={MousePointerClick} />
        <StatTile label="재방문율" value={`${ret?.rate ?? 0}%`} sub={`재방문 ${ret?.returning ?? 0}/${ret?.total ?? 0}명`} icon={Repeat} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <Card title="검색어 Top (30일)">
          <BarList items={topSearch ?? []} />
        </Card>
        <Card title="무결과 검색어 (수급 우선순위)">
          <BarList items={zeroSearch ?? []} />
        </Card>
        <Card title="필터 사용 (종류별)">
          <BarList items={filters ?? []} />
        </Card>
        <Card title="카드 클릭 (카테고리별)">
          <BarList items={cardCats ?? []} />
        </Card>
      </div>
    </div>
  );
}
