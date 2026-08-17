'use client';
import { useState } from 'react';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import { BarChart3, MousePointerClick, TrendingUp, ExternalLink } from 'lucide-react';

type Board = {
  key: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  shareUrl: string;
  posthogUrl: string;
};

const BOARDS: Board[] = [
  {
    key: 'traffic',
    label: '트래픽',
    hint: '페이지뷰·순방문자·유입 소스·디바이스',
    icon: BarChart3,
    shareUrl: 'https://us.posthog.com/embedded/M9T2qs0qeLBb6Ci3M-9vOwYfd9JA5A',
    posthogUrl: 'https://us.posthog.com/project/498450/dashboard/1803216',
  },
  {
    key: 'content',
    label: '콘텐츠',
    hint: '인기 자료·필터 사용률·검색어 Top',
    icon: MousePointerClick,
    shareUrl: 'https://us.posthog.com/embedded/ukrFup4b469_hJv5bZ0bq6d8VD5X0Q',
    posthogUrl: 'https://us.posthog.com/project/498450/dashboard/1803219',
  },
  {
    key: 'conversion',
    label: '전환',
    hint: '검색→클릭·방문→제안·피드백 참여',
    icon: TrendingUp,
    shareUrl: 'https://us.posthog.com/embedded/vf2_qyiXXa3SODqN53izIxLpkgbr8w',
    posthogUrl: 'https://us.posthog.com/project/498450/dashboard/1803221',
  },
];

export function DashboardTabs() {
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <Tabs id="admin-dashboards" selected={selected} onChange={setSelected}>
        <TabList>
          {BOARDS.map((b) => {
            const Icon = b.icon;
            return (
              <Tab key={b.key}>
                <span className="inline-flex items-center gap-1.5">
                  <Icon size={14} aria-hidden />
                  {b.label}
                </span>
              </Tab>
            );
          })}
        </TabList>
        {BOARDS.map((b) => (
          <TabPanel key={b.key}>
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <p className="text-xs text-[var(--muted)]">{b.hint}</p>
                <a
                  href={b.posthogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                >
                  PostHog에서 열기 <ExternalLink size={11} aria-hidden />
                </a>
              </div>
              <div className="relative rounded-[var(--r-md)] border border-[var(--border)] overflow-hidden bg-[var(--card)]">
                <iframe
                  src={b.shareUrl}
                  title={`${b.label} 대시보드`}
                  className="block w-full h-[calc(100vh-260px)] min-h-[600px]"
                  loading="lazy"
                  allow="clipboard-read; clipboard-write"
                />
              </div>
            </div>
          </TabPanel>
        ))}
      </Tabs>

      <p className="text-[11px] text-[var(--muted-2)]">
        데이터는 최대 몇 분 지연될 수 있어요. 실제 트래픽이 쌓이면 그래프가 채워져요.
      </p>
    </div>
  );
}
