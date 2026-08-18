import { getAuthState } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { getCategories } from '@/lib/queries';
import { UILinkButton } from '@/components/ui/Button';
import { ArchiveManager, type ArchiveRowItem } from '../ArchiveManager';

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
  const [itemsRes, cats] = await Promise.all([
    sb
      .from('archive_item')
      .select('id, title, summary, main_category, sub_category, tags, format, kind, status, external_url, file_url, views')
      .order('id', { ascending: false })
      .limit(5000),
    getCategories(),
  ]);
  const items = (itemsRes.data ?? []) as ArchiveRowItem[];
  const categories = cats.map((c) => ({ main_category: c.main_category, sub_category: c.sub_category }));

  return <ArchiveManager items={items} categories={categories} />;
}
