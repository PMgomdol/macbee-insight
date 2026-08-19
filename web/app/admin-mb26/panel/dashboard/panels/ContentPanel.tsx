import { Eye, Download, FileText, MessageSquare } from 'lucide-react';
import { StatTile } from '@/components/charts/StatTile';
import { MiniLineChart } from '@/components/charts/MiniLineChart';
import { BarList } from '@/components/charts/BarList';
import {
  getViewsTrend,
  getNewItemsTrend,
  getTopViewedItems,
  getDownloadsSummary,
  getProposalThroughput,
  getFeedbackThroughput,
} from '@/lib/metrics/supabase';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="app-card p-4 flex flex-col gap-3">
      <h3 className="text-sm font-medium text-[var(--fg)]">{title}</h3>
      {children}
    </div>
  );
}

export async function ContentPanel() {
  const [views, newItems, topViewed, dl, prop, fb] = await Promise.all([
    getViewsTrend(30),
    getNewItemsTrend(30),
    getTopViewedItems(30, 8),
    getDownloadsSummary(8),
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
        <StatTile label="총 다운로드" value={dl.total} icon={Download} />
        <StatTile
          label="제안 승인 소요"
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
        <Card title="인기 자료 Top (30일 조회)">
          <BarList items={topViewed} />
        </Card>
        <Card title="다운로드 Top">
          <BarList items={dl.top} />
        </Card>
        <Card title="VOC 유입 추이 (30일)">
          <MiniLineChart points={fb.incoming} height={56} />
        </Card>
        <Card title={`VOC 종류별 · 평균 해결 ${fb.avgResolutionHours}h`}>
          <BarList items={fb.byKind} />
        </Card>
      </div>
    </div>
  );
}
