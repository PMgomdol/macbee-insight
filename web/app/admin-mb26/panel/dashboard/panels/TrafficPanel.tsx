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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="app-card p-4 flex flex-col gap-3">
      <h3 className="text-sm font-medium text-[var(--fg)]">{title}</h3>
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
        <StatTile label="30일 세션" value={sessTotal} icon={Users} />
        <StatTile label="30일 사용자" value={userTotal} icon={Users} />
        <StatTile label="평균 세션시간" value={`${eng?.avgSessionSec ?? 0}s`} icon={Clock} />
        <StatTile label="참여율" value={`${eng?.engagementRate ?? 0}%`} icon={Clock} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <Card title="세션 추이 (30일)">
          <MiniLineChart points={trend?.sessions ?? []} height={56} />
        </Card>
        <Card title="채널 그룹">
          <BarList items={channels ?? []} />
        </Card>
        <Card title="디바이스">
          <BarList items={devices ?? []} />
        </Card>
        <Card title="신규 vs 재방문">
          <BarList items={nvr ?? []} />
        </Card>
        <Card title="지역 Top">
          <BarList items={countries ?? []} />
        </Card>
      </div>
    </div>
  );
}
