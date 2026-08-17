import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // 세션 쿠키 없는 게스트는 Supabase Auth 호출 스킵 — 매 nav마다 ~150ms 네트워크 콜 제거
  const hasSessionCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'));
  if (!hasSessionCookie) return supabaseResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 세션 갱신 — 매 nav마다 getUser() 네트워크 검증하면 로그인 사용자(운영진)의
  // 모든 탭 이동이 ~수백ms씩 느려진다. 토큰이 아직 싱싱하면 쿠키 로컬 확인만 하고,
  // 만료 임박(2분 이내)·세션 없음일 때만 getUser로 검증+토큰 갱신(setAll로 새 쿠키 기록).
  const { data: { session } } = await supabase.auth.getSession();
  const now = Math.floor(Date.now() / 1000);
  if (!session || (session.expires_at ?? 0) - now < 120) {
    await supabase.auth.getUser();
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // 정적 자산 제외
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
