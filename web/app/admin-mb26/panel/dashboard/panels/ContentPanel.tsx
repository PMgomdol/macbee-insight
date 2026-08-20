import { Eye, Download, FileText, MessageSquare } from 'lucide-react';
import { StatTile } from '@/components/charts/StatTile';
import { MiniLineChart } from '@/components/charts/MiniLineChart';
import { BarList } from '@/components/charts/BarList';
import {
  getViewsTrend,
  getNewItemsTrend,
  getTopViewedItems,
  getProposalThroughput,
  getFeedbackThroughput,
} from '@/lib/metrics/supabase';
import { getDownloadStats } from '@/lib/metrics/posthog';

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

export async function ContentPanel() {
  const [views, newItems, topViewed, dl, prop, fb] = await Promise.all([
    getViewsTrend(30),
    getNewItemsTrend(30),
    getTopViewedItems(30, 8),
    getDownloadStats(30),
    getProposalThroughput(30),
    getFeedbackThroughput(30),
  ]);
  const viewsTotal = views.reduce((a, p) => a + p.value, 0);
  const newTotal = newItems.reduce((a, p) => a + p.value, 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="30일 조회수" value={viewsTotal} icon={Eye} />
        <StatTile label="30일 신규 자료" value={newTotal} icon={FileText} />
        <StatTile label="다운로드 클릭 (30일)" value={dl?.total ?? 0} sub="파일·문서 자료 클릭" icon={Download} />
        <StatTile
          label="제안 검토까지 걸린 시간"
          value={`${prop.avgApprovalHours}h`}
          sub={`승인 ${prop.approved} · 반려 ${prop.rejected}`}
          icon={MessageSquare}
        />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <Card title="조회수 추이 (30일)">
          <MiniLineChart points={views} height={56} />
        </Card>
        <Card title="신규 등록 추이 (30일)">
          <MiniLineChart points={newItems} height={56} />
        </Card>
        <Card title="인기 자료 (30일 조회)" desc="가장 많이 열어본 자료예요.">
          <BarList items={topViewed} />
        </Card>
        <Card title="다운로드 클릭 추이 (30일)" desc="파일·문서 자료를 클릭한 횟수 추이예요.">
          <MiniLineChart points={dl?.trend ?? []} height={56} />
        </Card>
        <Card title="이용자 의견 접수 추이 (30일)" desc="이용자가 남긴 의견·문의·오류신고예요.">
          <MiniLineChart points={fb.incoming} height={56} />
        </Card>
        <Card title={`의견 종류별 · 평균 해결 ${fb.avgResolutionHours}h`}>
          <BarList items={fb.byKind} />
        </Card>
      </div>
    </div>
  );
}
