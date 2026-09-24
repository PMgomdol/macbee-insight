import { getAuthState } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { UILinkButton } from '@/components/ui/Button';
import type { ArchiveItem } from '@/types/db';
import { RecommendManager, type PoolRow } from './RecommendManager';

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
    // 추천 목록 — 홈 미리보기(ItemCard)까지 쓰므로 카드 전체 컬럼
    sb
      .from('archive_item')
      .select('id, kind, format, file_ext, external_url, file_url, main_category, sub_category, title, summary, published_at, registered_at, views, tags, featured_at')
      .not('featured_at', 'is', null)
      .order('featured_at', { ascending: false }),
    // 전체 공개자료(추천 안 된 것) — 클라 필터/정렬용 경량 컬럼
    sb
      .from('archive_item')
      .select('id, title, summary, main_category, kind, format, file_ext, external_url, file_url, views, registered_at')
      .eq('status', 'public')
      .is('featured_at', null)
      .order('registered_at', { ascending: false })
      .limit(5000),
  ]);

  return (
    <RecommendManager
      initial={(featuredRes.data ?? []) as ArchiveItem[]}
      pool={(poolRes.data ?? []) as PoolRow[]}
    />
  );
}
