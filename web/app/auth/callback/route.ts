import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // 오픈리다이렉트 차단 — 사이트 내부 상대경로만 허용 ('//' 프로토콜상대·역슬래시 우회 거부)
  const nextRaw = searchParams.get('next') ?? '/';
  const next = /^\/(?![/\\])/.test(nextRaw) ? nextRaw : '/';

  if (code) {
    const sb = await createClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      // profile 자동 생성 (없으면)
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        const { data: existing } = await sb.from('profile').select('id').eq('id', user.id).maybeSingle();
        if (!existing) {
          // role은 지정하지 않는다 — DB 컬럼 default('member')로 채워진다.
          // authenticated 클라이언트엔 role 쓰기 권한이 없다(자가 승격 차단, 20260820 마이그레이션).
          await sb.from('profile').insert({
            id: user.id,
            display_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'unknown',
          });
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
