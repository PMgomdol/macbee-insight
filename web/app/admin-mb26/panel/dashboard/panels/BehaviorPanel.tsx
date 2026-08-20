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

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="app-card p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium text-[var(--fg)]">{title}</h3>
        {desc && <p className="text-[11px] text-[var(--muted-2)] leading-snug">{desc}</p>}
      </div>
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
        <StatTile label="검색 성공률" value={`${conv?.searchSuccessRate ?? 0}%`} sub="검색 후 결과를 클릭한 비율" icon={Search} />
        <StatTile label="결과 없는 검색" value={`${conv?.zeroRate ?? 0}%`} sub="찾았지만 자료가 없던 비율 · 낮을수록 좋음" icon={Search} />
        <StatTile label="자료 클릭" value={conv?.cardClicks ?? 0} sub="자료 카드를 연 횟수" icon={MousePointerClick} />
        <StatTile label="재방문율" value={`${ret?.rate ?? 0}%`} sub={`다시 찾아온 방문자 ${ret?.returning ?? 0}/${ret?.total ?? 0}명`} icon={Repeat} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <Card title="인기 검색어 (30일)" desc="이용자가 많이 검색한 말이에요.">
          <BarList items={topSearch ?? []} />
        </Card>
        <Card title="결과가 없던 검색어" desc="이용자가 찾았지만 자료가 없던 말이에요. 먼저 채우면 좋아요.">
          <BarList items={zeroSearch ?? []} />
        </Card>
        <Card title="많이 쓴 필터" desc="목록을 좁힐 때 어떤 필터를 자주 쓰는지예요.">
          <BarList items={filters ?? []} />
        </Card>
        <Card title="분야별 자료 클릭" desc="어떤 분야 자료를 많이 여는지예요.">
          <BarList items={cardCats ?? []} />
        </Card>
      </div>
    </div>
  );
}
