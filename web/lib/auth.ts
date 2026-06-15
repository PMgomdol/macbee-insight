import { cache } from 'react';
import { createClient, createAdminClient } from './supabase/server';

export type AuthState = {
  user: { id: string; email: string | undefined } | null;
  role: string | null;
  displayName: string | null;
  isReviewer: boolean;
  isAdmin: boolean;
};

/**
 * Server Component 안에서 호출되는 인증 + 프로필 조회.
 * React `cache`로 동일 요청 안에서 layout + page 중복 호출 dedupe.
 * Layout에서 한 번 호출 → page에서 다시 호출해도 동일 객체 반환.
 */
export const getAuthState = cache(async (): Promise<AuthState> => {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return { user: null, role: null, displayName: null, isReviewer: false, isAdmin: false };
  }
  const sba = createAdminClient();
  const { data: prof } = await sba
    .from('profile')
    .select('role, display_name')
    .eq('id', user.id)
    .maybeSingle();
  const role = prof?.role ?? null;
  return {
    user: { id: user.id, email: user.email ?? undefined },
    role,
    displayName: prof?.display_name ?? null,
    isReviewer: role === 'reviewer' || role === 'admin',
    isAdmin: role === 'admin',
  };
});
