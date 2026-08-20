import { Info, Users, Clock } from 'lucide-react';
import { StatTile } from '@/components/charts/StatTile';
import { MiniLineChart } from '@/components/charts/MiniLineChart';
import { BarList } from '@/components/charts/BarList';
import {
  gaConfigured,
  getSessionsTrend,
  getChannelBreakdown,
  getDeviceBreakdown,
  getNewVsReturning,
  getTopCountries,
  getEngagement,
} from '@/lib/metrics/ga';

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

export async function TrafficPanel() {
  if (!gaConfigured()) {
    return (
      <div className="flex items-start gap-2.5 p-3.5 rounded-[var(--r-md)] bg-[var(--accent-bg)] max-w-lg">
        <Info size={16} className="text-[var(--accent)] shrink-0 mt-0.5" aria-hidden />
        <div className="text-sm">
          <p className="font-medium">GA4 연동 필요</p>
          <p className="text-[var(--muted)] mt-0.5">서비스 계정 자격을 등록하면 유입 지표가 표시돼요.</p>
        </div>
      </div>
    );
  }
  const [trend, channels, devices, nvr, countries, eng] = await Promise.all([
    getSessionsTrend(30),
    getChannelBreakdown(30),
    getDeviceBreakdown(30),
    getNewVsReturning(30),
    getTopCountries(30, 6),
    getEngagement(30),
  ]);
  const sessTotal = trend?.sessions.reduce((a, p) => a + p.value, 0) ?? 0;
  const userTotal = trend?.users.reduce((a, p) => a + p.value, 0) ?? 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="30일 방문 횟수" value={sessTotal} sub="사이트에 들어온 총 횟수(세션)" icon={Users} />
        <StatTile label="30일 방문자 수" value={userTotal} sub="중복 제외 사람 수" icon={Users} />
        <StatTile label="평균 체류시간" value={`${eng?.avgSessionSec ?? 0}s`} sub="한 번 방문에 머문 시간" icon={Clock} />
        <StatTile label="참여율" value={`${eng?.engagementRate ?? 0}%`} sub="그냥 안 나가고 둘러본 방문 비율" icon={Clock} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <Card title="방문 추이 (30일)">
          <MiniLineChart points={trend?.sessions ?? []} height={56} />
        </Card>
        <Card title="유입 경로" desc="이용자가 어떤 경로로 들어왔는지예요 (검색·직접 접속·외부 링크 등).">
          <BarList items={channels ?? []} />
        </Card>
        <Card title="기기" desc="PC·모바일·태블릿 비율이에요.">
          <BarList items={devices ?? []} />
        </Card>
        <Card title="신규 vs 재방문" desc="처음 온 사람과 다시 온 사람 비율이에요.">
          <BarList items={nvr ?? []} />
        </Card>
        <Card title="지역">
          <BarList items={countries ?? []} />
        </Card>
      </div>
    </div>
  );
}
