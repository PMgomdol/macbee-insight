import { getAuthState } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { UILinkButton } from '@/components/ui/Button';
import { fileExtFromUrl } from '@/lib/file-ext';
import { EventDashboard, type EventRow } from './EventDashboard';

export const metadata = { title: '등록이벤트 · 운영/관리' };

// 집계 기간 (KST). 기본 시작 = 오늘(테스트 위해), 종료 = 11/1. URL ?from=YYYY-MM-DD&to=YYYY-MM-DD 로 조정 가능.
// 정식 운영은 from=2026-10-01 로 좁히면 됨.
const DEFAULT_FROM = '2026-10-02'; // 이벤트 시작(공지일)
const DEFAULT_TO = '2026-11-01';   // 10/31까지 (상한 미포함)
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const kst = (d: string) => `${d}T00:00:00+09:00`;

function isDoc(it: { file_url: string | null; file_ext: string | null; external_url: string | null }): boolean {
  if (it.file_url || it.file_ext) return true;
  return fileExtFromUrl(it.external_url || '') !== null;
}

function normUrl(raw: string): string {
  if (!raw) return '';
  try {
    const u = new URL(raw.trim().toLowerCase());
    const keep = new URLSearchParams();
    for (const [k, v] of u.searchParams) {
      if (!k.startsWith('utm_') && !['fbclid', 'gclid', 'igshid', 'spm', 'ref'].includes(k)) keep.append(k, v);
    }
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/$/, '')}${keep.toString() ? '?' + keep : ''}`;
  } catch {
    return raw.trim().toLowerCase().replace(/\/$/, '');
  }
}

export default async function EventPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const fromD = sp.from && dateRe.test(sp.from) ? sp.from : DEFAULT_FROM;
  const toD = sp.to && dateRe.test(sp.to) ? sp.to : DEFAULT_TO;
  const START = kst(fromD);
  const END = kst(toD);
  const { user, isReviewer } = await getAuthState();
  if (!user || !isReviewer) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">등록이벤트</h1>
        <p className="text-sm text-[var(--muted)]">운영진만 볼 수 있어요.</p>
        <UILinkButton href="/admin-mb26" className="w-fit">로그인</UILinkButton>
      </div>
    );
  }

  const sb = createAdminClient();
  const [itemsRes, bonusRes] = await Promise.all([
    sb
      .from('archive_item')
      .select('id, title, proposer, proposer_email, external_url, file_url, file_ext, registered_at')
      .eq('status', 'public')
      .gte('registered_at', START)
      .lt('registered_at', END)
      .order('registered_at', { ascending: false }),
    sb.from('event_bonus').select('item_id, rarity, practical, updated_by, updated_at'),
  ]);

  const bonusById = new Map<number, { rarity: boolean; practical: boolean; by: string | null; at: string | null }>();
  for (const b of bonusRes.data ?? []) bonusById.set((b as any).item_id, { rarity: (b as any).rarity, practical: (b as any).practical, by: (b as any).updated_by ?? null, at: (b as any).updated_at ?? null });

  // 중복의심 — 정규화 URL 카운트
  const items = itemsRes.data ?? [];
  const normCount = new Map<string, number>();
  for (const it of items) {
    const n = normUrl((it as any).file_url || (it as any).external_url || '');
    if (n) normCount.set(n, (normCount.get(n) ?? 0) + 1);
  }

  const rows: EventRow[] = items.map((it: any) => {
    const doc = isDoc(it);
    const b = bonusById.get(it.id);
    const n = normUrl(it.file_url || it.external_url || '');
    return {
      id: it.id,
      title: it.title,
      proposer: (it.proposer || '').trim() || '(미기재)',
      email: (it.proposer_email || '').trim().toLowerCase() || null,
      url: it.file_url || it.external_url || '',
      date: (it.registered_at || '').slice(0, 10),
      type: doc ? '문서' : '링크',
      base: doc ? 2 : 1,
      rarity: b?.rarity ?? false,
      practical: b?.practical ?? false,
      reviewed: bonusById.has(it.id), // event_bonus 행 존재 = 검수완료
      reviewedBy: b?.by ? b.by.split('@')[0] : null, // 이메일 로컬파트만 표시
      reviewedAt: b?.at ? b.at.slice(0, 10) : null,
      dup: (normCount.get(n) ?? 0) > 1,
    };
  });

  const me = (user.email || '').split('@')[0] || null;
  return <EventDashboard rows={rows} windowLabel={`${fromD} ~ ${toD}`} me={me} />;
}
