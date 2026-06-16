import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient, createAdminClient } from './supabase/server';

export type AuthState = {
  user: { id: string; email: string | undefined } | null;
  role: string | null;
  displayName: string | null;
  isReviewer: boolean;
  isAdmin: boolean;
};

/**
 * userId → profile.role + display_name. 5분 캐시.
 * profile 변경 (role 승인/거절) 시 admin actions에서 revalidateTag 또는 revalidatePath로 무효화.
 */
const getProfileCached = unstable_cache(
  async (userId: string) => {
    const sba = createAdminClient();
    const { data } = await sba
      .from('profile')
      .select('role, display_name')
      .eq('id', userId)
      .maybeSingle();
    return data ?? null;
  },
  ['profile-by-id'],
  { revalidate: 300, tags: ['profile'] }
);

const EMPTY: AuthState = { user: null, role: null, displayName: null, isReviewer: false, isAdmin: false };

/**
 * Layout/NAV 등 페이지마다 호출되는 경량 인증 조회.
 * - `auth.getSession()` 으로 JWT를 쿠키에서 즉시 읽음 (auth 서버 round-trip 없음).
 * - 보안이 필요한 서버 액션은 여전히 `auth.getUser()` 사용.
 * - React `cache`로 layout/page 중복 호출 dedupe + 5분 단위 role 캐시로 DB 호출 자체도 최소화.
 */
export const getAuthState = cache(async (): Promise<AuthState> => {
  const sb = await createClient();
  const { data: { session } } = await sb.auth.getSession();
  const user = session?.user;
  if (!user) return EMPTY;
  const prof = await getProfileCached(user.id);
  const role = prof?.role ?? null;
  return {
    user: { id: user.id, email: user.email ?? undefined },
    role,
    displayName: prof?.display_name ?? null,
    isReviewer: role === 'reviewer' || role === 'admin',
    isAdmin: role === 'admin',
  };
});
