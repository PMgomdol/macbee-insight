import { getAuthState } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { UILinkButton } from '@/components/ui/Button';
import { RecommendManager, type FeaturedRow } from './RecommendManager';

export const metadata = { title: '추천 자료 · 운영/관리' };

export default async function RecommendPage() {
  const { user, isReviewer } = await getAuthState();

  if (!user || !isReviewer) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">추천 자료</h1>
        <p className="text-sm text-[var(--muted)]">운영진만 볼 수 있어요.</p>
        <UILinkButton href="/admin-mb26" className="w-fit">로그인</UILinkButton>
      </div>
    );
  }

  const sb = createAdminClient();
  const [featuredRes, poolRes] = await Promise.all([
    sb
      .from('archive_item')
      .select('id, title, main_category, format, file_ext, external_url, file_url, featured_at')
      .not('featured_at', 'is', null)
      .order('featured_at', { ascending: false }),
    // 전체 공개자료(추천 안 된 것) — 자료 관리처럼 전부 불러와 클라에서 즉시 필터
    sb
      .from('archive_item')
      .select('id, title, main_category, format, file_ext, external_url, file_url')
      .eq('status', 'public')
      .is('featured_at', null)
      .order('registered_at', { ascending: false })
      .limit(5000),
  ]);

  return (
    <RecommendManager
      initial={(featuredRes.data ?? []) as FeaturedRow[]}
      pool={(poolRes.data ?? []) as FeaturedRow[]}
    />
  );
}
