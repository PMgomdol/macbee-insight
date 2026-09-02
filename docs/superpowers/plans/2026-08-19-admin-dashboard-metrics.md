# 어드민 지표 대시보드 (메트릭 레이어 + 콘텐츠·유입 탭) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PostHog iframe 임베드 대시보드를, 서버가 직접 데이터를 꺼내오는 커스텀 대시보드(콘텐츠 성과=Supabase 실시간 · 유입=GA4)로 교체한다. 행동·전환 탭은 PostHog 키 발급 전까지 "연동 필요" 빈 상태.

**Architecture:** 섹션별 async Server Component가 자기 소스를 fetch → `<Suspense>` 스트리밍. 외부 소스(GA)는 자격 없으면 `null` 반환 → 패널이 빈 상태 렌더(그레이스풀 디그레이데이션). 새 테이블·크론 없음. 차트는 의존성 없는 인라인 SVG 컴포넌트(디자인 토큰).

**Tech Stack:** Next.js 16 (App Router, RSC, Suspense), TypeScript, Tailwind 4, Supabase (`createAdminClient`), `@google-analytics/data` (설치 완료 v6), lucide-react.

**Spec:** [docs/superpowers/specs/2026-08-19-admin-dashboard-redesign-design.md](../specs/2026-08-19-admin-dashboard-redesign-design.md)

## Global Constraints

- **디자인 토큰만.** 색: `--accent`(#3182F6)·`--fg`·`--muted`·`--border`·semantic(`--success`/`--danger`/`--warning`). 라운드: `--r-sm`/`--r-md`/`--r-lg`+full. 하드코딩 px·hex·rounded-lg 금지. 컴포넌트 레시피 = [app/design/page.tsx](../../../web/app/design/page.tsx).
- **이모지 금지**, 아이콘은 lucide-react.
- **차트 색은 단색 accent 계열.** 여러 계열 색 필요 시 accent 스케일(50/300/500/600/900)만. 차트 코드 작성 전 dataviz 스킬 로드.
- **비밀값 출력 금지.** GA 자격은 `web/.env.local`(gitignore됨)에 base64로 이미 등록: `GA_PROPERTY_ID=549238948`, `GA_SERVICE_ACCOUNT_JSON=<base64>`.
- **Next 16:** 동적 데이터는 반드시 `<Suspense>` 안. `cookies()`는 캐시 함수 밖에서만. 어드민 페이지는 `isReviewer` 게이트(기존 `getAuthState()`).
- **캐시:** Supabase 지표는 실시간(캐시 안 함). GA 지표는 `unstable_cache` `revalidate: 3600`, tag `metrics-ga`.
- 자료 접근은 `createAdminClient()` (service_role) — 어드민 전용 페이지라 RLS 우회 정상.

**공유 타입** (`lib/metrics/types.ts`, Task 1에서 생성):
```ts
export type DayPoint = { date: string; value: number };      // date = 'YYYY-MM-DD'
export type LabelValue = { label: string; value: number };
```

---

### Task 1: 차트 프리미티브 (인라인 SVG, 의존성 0)

**Files:**
- Create: `web/lib/metrics/types.ts`
- Create: `web/components/charts/svg.ts` (순수 path 빌더 + 셀프체크)
- Create: `web/components/charts/MiniLineChart.tsx`
- Create: `web/components/charts/BarList.tsx`
- Create: `web/components/charts/StatTile.tsx`

**Interfaces:**
- Produces: `DayPoint`, `LabelValue` (types.ts) · `linePath(points, w, h, pad): string` (svg.ts) · `<MiniLineChart points height>` · `<BarList items>` · `<StatTile label value sub? icon?>`

- [ ] **Step 1: 공유 타입 작성**

`web/lib/metrics/types.ts`:
```ts
export type DayPoint = { date: string; value: number }; // 'YYYY-MM-DD'
export type LabelValue = { label: string; value: number };
```

- [ ] **Step 2: 순수 path 빌더 + 셀프체크 작성**

`web/components/charts/svg.ts`:
```ts
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
```

- [ ] **Step 3: 셀프체크 실행 (통과 확인)**

Run: `cd web && npx --yes tsx components/charts/svg.ts`
Expected: `svg.ts self-check OK`
(npx 불가 환경이면: 로직 육안 검토로 대체하고 로그에 남긴다.)

- [ ] **Step 4: dataviz 스킬 로드 후 차트 컴포넌트 3종 작성**

먼저 dataviz 스킬 로드. `web/components/charts/MiniLineChart.tsx`:
```tsx
import { linePath } from './svg';
import type { DayPoint } from '@/lib/metrics/types';

export function MiniLineChart({ points, height = 48 }: { points: DayPoint[]; height?: number }) {
  const w = 240;
  const pts = linePath(points, w, height);
  if (!pts) return <div className="text-xs text-[var(--muted-2)]">데이터 없음</div>;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label="추이">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={1.5}
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
```

`web/components/charts/BarList.tsx`:
```tsx
import type { LabelValue } from '@/lib/metrics/types';

export function BarList({ items }: { items: LabelValue[] }) {
  if (items.length === 0) return <p className="text-xs text-[var(--muted-2)]">데이터 없음</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 truncate text-[var(--muted)]" title={it.label}>{it.label}</span>
          <span className="relative flex-1 h-5 rounded-[var(--r-sm)] bg-[var(--card)] overflow-hidden">
            <span className="absolute inset-y-0 left-0 rounded-[var(--r-sm)] bg-[var(--accent)]"
              style={{ width: `${(it.value / max) * 100}%` }} />
          </span>
          <span className="w-12 shrink-0 text-right tabular-nums text-[var(--fg)]">{it.value.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}
```

`web/components/charts/StatTile.tsx`:
```tsx
export function StatTile({ label, value, sub, icon: Icon }: {
  label: string; value: string | number; sub?: string;
  icon?: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
}) {
  return (
    <div className="app-card p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[var(--muted)]">
        {Icon && <Icon size={14} aria-hidden />}
        <span className="text-xs">{label}</span>
      </div>
      <strong className="text-xl font-bold tracking-tight tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </strong>
      {sub && <span className="text-[11px] text-[var(--muted-2)]">{sub}</span>}
    </div>
  );
}
```

- [ ] **Step 5: 타입체크 + 커밋**

Run: `cd web && npx tsc --noEmit` (에러 없음 확인)
```bash
git add web/lib/metrics/types.ts web/components/charts/
git commit -m "feat(dashboard): 차트 프리미티브 — SVG 라인·바리스트·스탯타일"
```

---

### Task 2: Supabase 지표 레이어 (실시간 집계)

**Files:**
- Create: `web/lib/metrics/supabase.ts`

**Interfaces:**
- Consumes: `DayPoint`, `LabelValue` (Task 1) · `createAdminClient` (`@/lib/supabase/server`)
- Produces:
  - `bucketDaily(timestamps: string[], days: number, endMs: number): DayPoint[]` (순수, export)
  - `avgHoursBetween(pairs: [string, string][]): number` (순수, export)
  - `getViewsTrend(days?: number): Promise<DayPoint[]>`
  - `getNewItemsTrend(days?: number): Promise<DayPoint[]>`
  - `getTopViewedItems(days?: number, limit?: number): Promise<LabelValue[]>`
  - `getDownloadsSummary(limit?: number): Promise<{ total: number; top: LabelValue[] }>`
  - `getProposalThroughput(days?: number): Promise<{ approved: number; rejected: number; avgApprovalHours: number }>`
  - `getFeedbackThroughput(days?: number): Promise<{ incoming: DayPoint[]; byKind: LabelValue[]; avgResolutionHours: number }>`

- [ ] **Step 1: 순수 헬퍼 + 셀프체크 작성**

`web/lib/metrics/supabase.ts` (상단):
```ts
import 'server-only';
import { createAdminClient } from '@/lib/supabase/server';
import type { DayPoint, LabelValue } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** 타임스탬프 배열을 최근 `days`일 일별 카운트로. 빈 날짜는 0으로 채움. endMs 기준 역산. */
export function bucketDaily(timestamps: string[], days: number, endMs: number): DayPoint[] {
  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    const key = new Date(ts).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(endMs - i * DAY_MS).toISOString().slice(0, 10);
    out.push({ date: key, value: counts.get(key) ?? 0 });
  }
  return out;
}

/** [시작, 끝] ISO 쌍들의 평균 경과 시간(시간 단위, 소수 1자리). 빈 배열이면 0. */
export function avgHoursBetween(pairs: [string, string][]): number {
  if (pairs.length === 0) return 0;
  const sum = pairs.reduce((a, [s, e]) => a + (new Date(e).getTime() - new Date(s).getTime()), 0);
  return Math.round((sum / pairs.length / 3600000) * 10) / 10;
}
```

`web/lib/metrics/supabase.selfcheck.ts`:
```ts
import { bucketDaily, avgHoursBetween } from './supabase';
const assert = (c: boolean, m: string) => { if (!c) throw new Error('FAIL: ' + m); };

const end = Date.UTC(2026, 7, 19); // 2026-08-19
const b = bucketDaily(['2026-08-19T05:00:00Z', '2026-08-19T09:00:00Z', '2026-08-17T00:00:00Z'], 3, end);
assert(b.length === 3, '3일치');
assert(b[2].date === '2026-08-19' && b[2].value === 2, '마지막날 2건');
assert(b[0].date === '2026-08-17' && b[0].value === 1, '첫날 1건');
assert(b[1].value === 0, '중간 빈날 0');

assert(avgHoursBetween([]) === 0, '빈 쌍 0');
assert(avgHoursBetween([['2026-08-19T00:00:00Z', '2026-08-19T12:00:00Z']]) === 12, '12시간');
console.log('supabase metrics self-check OK');
```

- [ ] **Step 2: 셀프체크 실행**

Run: `cd web && npx --yes tsx lib/metrics/supabase.selfcheck.ts`
Expected: `supabase metrics self-check OK`

- [ ] **Step 3: 집계 쿼리 함수 작성 (같은 파일에 이어서)**

`web/lib/metrics/supabase.ts` (헬퍼 아래 추가):
```ts
const DEFAULT_DAYS = 30;

export async function getViewsTrend(days = DEFAULT_DAYS): Promise<DayPoint[]> {
  const sb = createAdminClient();
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const { data } = await sb.from('view_event').select('viewed_at').gte('viewed_at', since);
  return bucketDaily((data ?? []).map((r) => r.viewed_at as string), days, Date.now());
}

export async function getNewItemsTrend(days = DEFAULT_DAYS): Promise<DayPoint[]> {
  const sb = createAdminClient();
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const { data } = await sb.from('archive_item').select('registered_at').gte('registered_at', since);
  return bucketDaily((data ?? []).map((r) => r.registered_at as string), days, Date.now());
}

export async function getTopViewedItems(days = DEFAULT_DAYS, limit = 10): Promise<LabelValue[]> {
  const sb = createAdminClient();
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const { data: ev } = await sb.from('view_event').select('item_id').gte('viewed_at', since);
  const counts = new Map<number, number>();
  for (const r of ev ?? []) counts.set(r.item_id as number, (counts.get(r.item_id as number) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (top.length === 0) return [];
  const { data: items } = await sb.from('archive_item').select('id, title').in('id', top.map(([id]) => id));
  const titles = new Map((items ?? []).map((i) => [i.id as number, i.title as string]));
  return top.map(([id, value]) => ({ label: titles.get(id) ?? `#${id}`, value }));
}

export async function getDownloadsSummary(limit = 10): Promise<{ total: number; top: LabelValue[] }> {
  const sb = createAdminClient();
  const { data } = await sb.from('archive_item').select('title, downloads')
    .gt('downloads', 0).order('downloads', { ascending: false }).limit(limit);
  const { data: all } = await sb.from('archive_item').select('downloads').gt('downloads', 0);
  const total = (all ?? []).reduce((a, r) => a + (r.downloads as number), 0);
  return { total, top: (data ?? []).map((r) => ({ label: r.title as string, value: r.downloads as number })) };
}

export async function getProposalThroughput(days = DEFAULT_DAYS) {
  const sb = createAdminClient();
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const { data } = await sb.from('staging_proposal').select('status, proposed_at, reviewed_at')
    .gte('proposed_at', since);
  const rows = data ?? [];
  const approved = rows.filter((r) => r.status === 'approved').length;
  const rejected = rows.filter((r) => r.status === 'rejected' || r.status === 'duplicate').length;
  const pairs = rows.filter((r) => r.reviewed_at && r.status === 'approved')
    .map((r) => [r.proposed_at, r.reviewed_at] as [string, string]);
  return { approved, rejected, avgApprovalHours: avgHoursBetween(pairs) };
}

export async function getFeedbackThroughput(days = DEFAULT_DAYS) {
  const sb = createAdminClient();
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const { data } = await sb.from('feedback').select('kind, submitted_at, answered_at').gte('submitted_at', since);
  const rows = data ?? [];
  const incoming = bucketDaily(rows.map((r) => r.submitted_at as string), days, Date.now());
  const kindMap = new Map<string, number>();
  for (const r of rows) kindMap.set(r.kind as string, (kindMap.get(r.kind as string) ?? 0) + 1);
  const byKind = [...kindMap.entries()].map(([label, value]) => ({ label, value }));
  const pairs = rows.filter((r) => r.answered_at).map((r) => [r.submitted_at, r.answered_at] as [string, string]);
  return { incoming, byKind, avgResolutionHours: avgHoursBetween(pairs) };
}
```

- [ ] **Step 4: 타입체크 + 커밋**

Run: `cd web && npx tsc --noEmit`
```bash
git add web/lib/metrics/supabase.ts web/lib/metrics/supabase.selfcheck.ts
git commit -m "feat(dashboard): Supabase 실시간 지표 집계 레이어"
```

---

### Task 3: 커스텀 대시보드 셸 + 콘텐츠 성과 탭 (iframe 제거, 배포 가능 슬라이스)

**Files:**
- Rewrite: `web/app/admin-mb26/panel/dashboard/DashboardTabs.tsx` (client, 탭 셸)
- Create: `web/app/admin-mb26/panel/dashboard/panels/ContentPanel.tsx` (server)
- Create: `web/app/admin-mb26/panel/dashboard/panels/BehaviorEmpty.tsx` (server, 빈 상태)
- Modify: `web/app/admin-mb26/panel/dashboard/page.tsx` (패널 조립 + Suspense)

**Interfaces:**
- Consumes: Task 1 차트, Task 2 Supabase 함수
- Produces: `<DashboardTabs traffic content behavior />` (3 ReactNode props)

- [ ] **Step 1: 탭 셸 재작성 (밑줄 탭 = /design 레시피)**

`DashboardTabs.tsx` 전체 교체:
```tsx
'use client';
import { useState } from 'react';
import { BarChart3, MousePointerClick, TrendingUp } from 'lucide-react';

const TABS = [
  { key: 'content', label: '콘텐츠 성과', icon: TrendingUp },
  { key: 'traffic', label: '유입', icon: BarChart3 },
  { key: 'behavior', label: '행동·전환', icon: MousePointerClick },
] as const;

export function DashboardTabs({ content, traffic, behavior }: {
  content: React.ReactNode; traffic: React.ReactNode; behavior: React.ReactNode;
}) {
  const [sel, setSel] = useState<'content' | 'traffic' | 'behavior'>('content');
  const panels = { content, traffic, behavior };
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex gap-1 border-b border-[var(--border)] overflow-x-auto no-scrollbar">
        {TABS.map((t) => {
          const Icon = t.icon; const active = sel === t.key;
          return (
            <button key={t.key} role="tab" aria-selected={active} onClick={() => setSel(t.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm -mb-px border-b-2 whitespace-nowrap transition ${
                active ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                       : 'border-transparent text-[var(--muted)] hover:text-[var(--fg)]'}`}>
              <Icon size={14} aria-hidden />{t.label}
            </button>
          );
        })}
      </div>
      {(['content', 'traffic', 'behavior'] as const).map((k) => (
        <div key={k} hidden={sel !== k}>{panels[k]}</div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 콘텐츠 성과 패널 작성**

`panels/ContentPanel.tsx`:
```tsx
import { Eye, Download, FileText, MessageSquare } from 'lucide-react';
import { StatTile } from '@/components/charts/StatTile';
import { MiniLineChart } from '@/components/charts/MiniLineChart';
import { BarList } from '@/components/charts/BarList';
import {
  getViewsTrend, getNewItemsTrend, getTopViewedItems, getDownloadsSummary,
  getProposalThroughput, getFeedbackThroughput,
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
    getViewsTrend(30), getNewItemsTrend(30), getTopViewedItems(30, 8),
    getDownloadsSummary(8), getProposalThroughput(30), getFeedbackThroughput(30),
  ]);
  const viewsTotal = views.reduce((a, p) => a + p.value, 0);
  const newTotal = newItems.reduce((a, p) => a + p.value, 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="30일 조회수" value={viewsTotal} icon={Eye} />
        <StatTile label="30일 신규 자료" value={newTotal} icon={FileText} />
        <StatTile label="총 다운로드" value={dl.total} icon={Download} />
        <StatTile label="제안 승인 소요" value={`${prop.avgApprovalHours}h`} sub={`승인 ${prop.approved} · 반려 ${prop.rejected}`} icon={MessageSquare} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <Card title="조회수 추이 (30일)"><MiniLineChart points={views} height={56} /></Card>
        <Card title="신규 등록 추이 (30일)"><MiniLineChart points={newItems} height={56} /></Card>
        <Card title="인기 자료 Top (30일 조회)"><BarList items={topViewed} /></Card>
        <Card title="다운로드 Top"><BarList items={dl.top} /></Card>
        <Card title="VOC 유입 추이 (30일)"><MiniLineChart points={fb.incoming} height={56} /></Card>
        <Card title={`VOC 종류별 · 평균 해결 ${fb.avgResolutionHours}h`}><BarList items={fb.byKind} /></Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 행동·전환 빈 상태 패널**

`panels/BehaviorEmpty.tsx`:
```tsx
import { Info } from 'lucide-react';

export function BehaviorEmpty() {
  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-[var(--r-md)] bg-[var(--accent-bg)] max-w-lg">
      <Info size={16} className="text-[var(--accent)] shrink-0 mt-0.5" aria-hidden />
      <div className="text-sm">
        <p className="font-medium">PostHog 연동 필요</p>
        <p className="text-[var(--muted)] mt-0.5">
          검색어·필터 사용·전환 퍼널 지표는 PostHog 개인 API 키를 발급하면 표시돼요.
          (읽기용 <code className="text-xs">phx_</code> 키 + 프로젝트 498450)
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: page.tsx 조립 (기존 iframe 안내문/DashboardTabs 호출부만 교체)**

`dashboard/page.tsx`의 `return (...)` 안 `<DashboardTabs />` 부분을 교체하고 상단 import 추가:
```tsx
import { Suspense } from 'react';
import { DashboardTabs } from './DashboardTabs';
import { ContentPanel } from './panels/ContentPanel';
import { BehaviorEmpty } from './panels/BehaviorEmpty';
import { TrafficPanel } from './panels/TrafficPanel'; // Task 5에서 생성 — 그 전엔 BehaviorEmpty 유사 placeholder

// ...isReviewer 통과 후 return 내부:
const fallback = <div className="text-sm text-[var(--muted)] py-8">불러오는 중…</div>;
// <DashboardTabs /> 대신:
<DashboardTabs
  content={<Suspense fallback={fallback}><ContentPanel /></Suspense>}
  traffic={<Suspense fallback={fallback}><TrafficPanel /></Suspense>}
  behavior={<BehaviorEmpty />}
/>
```
또한 상단 소개 문구(`PostHog 실시간 지표...`)를 `콘텐츠·유입·행동 세 관점의 운영 지표.`로 수정.

> Task 5 전에 이 태스크를 먼저 배포하려면: `TrafficPanel` import를 임시로 `BehaviorEmpty`류 "GA 연동됨 — 유입 탭 준비중" placeholder로 두거나, Task 5를 이 태스크 직후 이어서 한다(권장).

- [ ] **Step 5: 시각 검증 (run 스킬)**

run 스킬로 `npm run dev` 구동 → `/admin-mb26/panel/dashboard` 접속(운영진 로그인) → 콘텐츠 성과 탭에 스탯 4개 + 차트 6개 렌더, iframe 사라짐 확인. 탭 전환 동작 확인.

- [ ] **Step 6: 커밋**

```bash
git add web/app/admin-mb26/panel/dashboard/
git commit -m "feat(dashboard): 커스텀 셸 + 콘텐츠 성과 탭 — PostHog iframe 교체"
```

---

### Task 4: GA4 지표 레이어 (그레이스풀 디그레이데이션)

**Files:**
- Create: `web/lib/metrics/ga.ts`

**Interfaces:**
- Consumes: `DayPoint`, `LabelValue` · `@google-analytics/data` · env `GA_PROPERTY_ID`, `GA_SERVICE_ACCOUNT_JSON`
- Produces:
  - `gaConfigured(): boolean` (순수)
  - `gaDateToISO(d: string): string` (순수, 'YYYYMMDD'→'YYYY-MM-DD')
  - `getSessionsTrend(days?): Promise<{ sessions: DayPoint[]; users: DayPoint[] } | null>`
  - `getChannelBreakdown(days?): Promise<LabelValue[] | null>`
  - `getDeviceBreakdown(days?): Promise<LabelValue[] | null>`
  - `getNewVsReturning(days?): Promise<LabelValue[] | null>`
  - `getTopCountries(days?, limit?): Promise<LabelValue[] | null>`
  - `getEngagement(days?): Promise<{ avgSessionSec: number; engagementRate: number } | null>`

- [ ] **Step 1: 순수 헬퍼 + 셀프체크**

`web/lib/metrics/ga.ts` (상단):
```ts
import 'server-only';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import type { DayPoint, LabelValue } from './types';

export function gaConfigured(): boolean {
  return Boolean(process.env.GA_PROPERTY_ID && process.env.GA_SERVICE_ACCOUNT_JSON);
}

export function gaDateToISO(d: string): string {
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}
```

`web/lib/metrics/ga.selfcheck.ts`:
```ts
import { gaDateToISO } from './ga';
const assert = (c: boolean, m: string) => { if (!c) throw new Error('FAIL: ' + m); };
assert(gaDateToISO('20260819') === '2026-08-19', 'GA 날짜 파싱');
console.log('ga metrics self-check OK');
```

- [ ] **Step 2: 셀프체크 실행**

Run: `cd web && npx --yes tsx lib/metrics/ga.selfcheck.ts`
Expected: `ga metrics self-check OK`
(주의: 이 셀프체크는 `gaDateToISO`만 import — 클라이언트 생성/네트워크 없음.)

- [ ] **Step 3: 클라이언트 + 리포트 함수 작성**

`web/lib/metrics/ga.ts` (헬퍼 아래):
```ts
let cached: BetaAnalyticsDataClient | null | undefined;
function client(): BetaAnalyticsDataClient | null {
  if (cached !== undefined) return cached;
  if (!gaConfigured()) { cached = null; return null; }
  const creds = JSON.parse(Buffer.from(process.env.GA_SERVICE_ACCOUNT_JSON!, 'base64').toString('utf8'));
  cached = new BetaAnalyticsDataClient({ credentials: creds });
  return cached;
}
const prop = () => `properties/${process.env.GA_PROPERTY_ID}`;
const range = (days: number) => [{ startDate: `${days}daysAgo`, endDate: 'today' }];

async function dims(days: number, dimension: string, metric: string, limit?: number): Promise<LabelValue[] | null> {
  const c = client(); if (!c) return null;
  const [res] = await c.runReport({
    property: prop(), dateRanges: range(days),
    dimensions: [{ name: dimension }], metrics: [{ name: metric }],
    orderBys: [{ metric: { metricName: metric }, desc: true }], limit,
  });
  return (res.rows ?? []).map((r) => ({
    label: r.dimensionValues?.[0]?.value ?? '(기타)',
    value: Number(r.metricValues?.[0]?.value ?? 0),
  }));
}

export async function getSessionsTrend(days = 30) {
  const c = client(); if (!c) return null;
  const [res] = await c.runReport({
    property: prop(), dateRanges: range(days),
    dimensions: [{ name: 'date' }], metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });
  const sessions: DayPoint[] = [], users: DayPoint[] = [];
  for (const r of res.rows ?? []) {
    const date = gaDateToISO(r.dimensionValues?.[0]?.value ?? '');
    sessions.push({ date, value: Number(r.metricValues?.[0]?.value ?? 0) });
    users.push({ date, value: Number(r.metricValues?.[1]?.value ?? 0) });
  }
  return { sessions, users };
}

export const getChannelBreakdown = (days = 30) => dims(days, 'sessionDefaultChannelGroup', 'sessions');
export const getDeviceBreakdown = (days = 30) => dims(days, 'deviceCategory', 'sessions');
export const getNewVsReturning = (days = 30) => dims(days, 'newVsReturning', 'activeUsers');
export const getTopCountries = (days = 30, limit = 6) => dims(days, 'country', 'activeUsers', limit);

export async function getEngagement(days = 30) {
  const c = client(); if (!c) return null;
  const [res] = await c.runReport({
    property: prop(), dateRanges: range(days),
    metrics: [{ name: 'averageSessionDuration' }, { name: 'engagementRate' }],
  });
  const m = res.rows?.[0]?.metricValues ?? [];
  return { avgSessionSec: Math.round(Number(m[0]?.value ?? 0)), engagementRate: Math.round(Number(m[1]?.value ?? 0) * 1000) / 10 };
}
```

- [ ] **Step 4: 실연동 확인 + 커밋**

임시 확인: `cd web && npx --yes tsx -e "import('./lib/metrics/ga.ts').then(async m=>console.log((await m.getSessionsTrend(7))))"`
(env가 tsx에 로드 안 되면 Task 5의 dev 서버 렌더로 확인. 실패해도 `null`이면 그레이스풀 정상.)
```bash
git add web/lib/metrics/ga.ts web/lib/metrics/ga.selfcheck.ts
git commit -m "feat(dashboard): GA4 Data API 지표 레이어 — 자격 없으면 null"
```

---

### Task 5: 유입 탭 (GA4 패널)

**Files:**
- Create: `web/app/admin-mb26/panel/dashboard/panels/TrafficPanel.tsx` (server)
- (Task 3에서 넣은 임시 placeholder가 있으면 실제 패널로 교체 확인)

**Interfaces:**
- Consumes: Task 1 차트, Task 4 GA 함수

- [ ] **Step 1: 유입 패널 작성 (null이면 빈 상태)**

`panels/TrafficPanel.tsx`:
```tsx
import { Info, Users, Clock } from 'lucide-react';
import { StatTile } from '@/components/charts/StatTile';
import { MiniLineChart } from '@/components/charts/MiniLineChart';
import { BarList } from '@/components/charts/BarList';
import {
  gaConfigured, getSessionsTrend, getChannelBreakdown, getDeviceBreakdown,
  getNewVsReturning, getTopCountries, getEngagement,
} from '@/lib/metrics/ga';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="app-card p-4 flex flex-col gap-3"><h3 className="text-sm font-medium">{title}</h3>{children}</div>;
}

export async function TrafficPanel() {
  if (!gaConfigured()) {
    return (
      <div className="flex items-start gap-2.5 p-3.5 rounded-[var(--r-md)] bg-[var(--accent-bg)] max-w-lg">
        <Info size={16} className="text-[var(--accent)] shrink-0 mt-0.5" aria-hidden />
        <div className="text-sm"><p className="font-medium">GA4 연동 필요</p>
          <p className="text-[var(--muted)] mt-0.5">서비스 계정 자격을 등록하면 유입 지표가 표시돼요.</p></div>
      </div>
    );
  }
  const [trend, channels, devices, nvr, countries, eng] = await Promise.all([
    getSessionsTrend(30), getChannelBreakdown(30), getDeviceBreakdown(30),
    getNewVsReturning(30), getTopCountries(30, 6), getEngagement(30),
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
        <Card title="세션 추이 (30일)"><MiniLineChart points={trend?.sessions ?? []} height={56} /></Card>
        <Card title="채널 그룹"><BarList items={channels ?? []} /></Card>
        <Card title="디바이스"><BarList items={devices ?? []} /></Card>
        <Card title="신규 vs 재방문"><BarList items={nvr ?? []} /></Card>
        <Card title="지역 Top"><BarList items={countries ?? []} /></Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: page.tsx의 임시 placeholder를 실제 TrafficPanel로 교체 (Task 3에서 임시 처리한 경우)**

Task 3 Step 4의 `import { TrafficPanel }`가 실제 파일을 가리키는지 확인.

- [ ] **Step 3: 시각 검증 (run 스킬)**

dev 서버에서 유입 탭 → 세션 100·사용자 74(최근 검증값 근처) + 채널/디바이스/지역 바 렌더 확인. GA 응답 지연 시 Suspense fallback 노출 정상.

- [ ] **Step 4: 커밋**

```bash
git add web/app/admin-mb26/panel/dashboard/panels/TrafficPanel.tsx web/app/admin-mb26/panel/dashboard/page.tsx
git commit -m "feat(dashboard): 유입 탭 — GA4 세션·채널·디바이스·지역"
```

---

## 이 계획의 범위 밖 (후속 플랜)

- **행동·전환 탭 (PostHog)**: 개인 API 키 발급 후. `lib/metrics/posthog.ts`(HogQL) + BehaviorPanel. 리텐션·활성화·검색성공·무결과 검색어.
- **케이스 스터디 페이지 (`/story`)** + `lib/experiments.ts` + 릴리즈 오버레이 (spec §PM 성과·실험 레이어).
- **`download_event` 계측**: 다운로드 추이용. 소급 불가라 별도 빠른 태스크로 우선 처리 권장.
- Vercel 프로덕션 env에 `GA_PROPERTY_ID`/`GA_SERVICE_ACCOUNT_JSON` 등록 (배포 전).

## Self-Review

- **Spec 커버리지:** 탭1(콘텐츠 성과)=Task 2·3, 탭3(유입)=Task 4·5, 탭2(행동)=빈 상태(Task 3 Step 3), 차트/토큰=Task 1·Global Constraints, 그레이스풀 디그레이데이션=Task 4·5. 미포함(의도적, 후속): PostHog 탭·케이스 스터디·download_event — "범위 밖"에 명시.
- **Placeholder 스캔:** 모든 코드 스텝에 실제 코드. TrafficPanel 임시 처리 경로만 조건부 — Task 5를 Task 3 직후 실행하면 해소(권장 순서 명시).
- **타입 일관성:** `DayPoint`/`LabelValue` 전 태스크 공유(types.ts). `bucketDaily(_, _, endMs:number)`·`avgHoursBetween(pairs)`·`gaDateToISO`·`gaConfigured` 시그니처 Task 2/4 정의 = 소비처 일치. 차트 props(`points`/`items`/`label,value,sub,icon`) Task 1 정의 = Task 3/5 사용 일치.
