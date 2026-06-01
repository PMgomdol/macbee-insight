import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase 클라이언트 — Server Components / Route Handlers / Server Actions에서 사용.
 * 익명 사용자 또는 로그인된 사용자 컨텍스트로 동작.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서는 set 호출 시 무시 (middleware가 처리)
          }
        },
      },
    }
  );
}

/**
 * 서비스 롤 권한 클라이언트 — 관리자 작업·import·트리거 함수에서만 사용.
 * RLS 우회. 절대 클라이언트로 노출 X.
 */
export function createAdminClient() {
  const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * 공개 데이터 전용 anon 클라이언트 — 쿠키 없음, 캐시 함수 안에서 사용 가능.
 * RLS 정책에 의해 status='public'인 row만 노출됨.
 */
export function createPublicClient() {
  const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
