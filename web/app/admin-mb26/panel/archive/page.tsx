import { getAuthState } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { getCategories } from '@/lib/queries';
import { UILinkButton } from '@/components/ui/Button';
import { ArchiveManager, type ArchiveRowItem, type RejectedRow } from '../ArchiveManager';

export const metadata = { title: '자료 관리 · 운영/관리' };

export default async function ArchivePage() {
  const { user, isReviewer } = await getAuthState();

  if (!user || !isReviewer) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">자료 관리</h1>
        <p className="text-sm text-[var(--muted)]">운영진만 볼 수 있어요.</p>
        <UILinkButton href="/admin-mb26" className="w-fit">로그인</UILinkButton>
      </div>
    );
  }

  const sb = createAdminClient();
  const [itemsRes, rejectedRes, checkRes, cats] = await Promise.all([
    sb
      .from('archive_item')
      .select('id, title, summary, main_category, sub_category, tags, format, kind, status, external_url, file_url, views, registered_at')
      .order('id', { ascending: false })
      .limit(5000),
    sb
      .from('staging_proposal')
      .select('id, title, external_url, file_url, proposer, proposed_at, reviewer_note, reviewed_at')
      .eq('status', 'rejected')
      .order('reviewed_at', { ascending: false })
      .limit(500),
    // 링크 점검 스냅샷 (link_check.py가 매주 갱신). note = archive_item id.
    sb.from('check_log').select('note, result, checked_at').limit(5000),
    getCategories(),
  ]);
  const items = (itemsRes.data ?? []) as ArchiveRowItem[];
  const rejected = (rejectedRes.data ?? []) as RejectedRow[];
  const categories = cats.map((c) => ({ main_category: c.main_category, sub_category: c.sub_category }));

  // { archive_item id → {result, checked_at} }
  const linkStatus: Record<number, { result: string; checked_at: string | null }> = {};
  for (const r of checkRes.data ?? []) {
    const id = Number((r as any).note);
    if (id) linkStatus[id] = { result: (r as any).result, checked_at: (r as any).checked_at };
  }

  return <ArchiveManager items={items} rejected={rejected} categories={categories} linkStatus={linkStatus} />;
}
