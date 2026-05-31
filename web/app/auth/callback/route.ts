import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const sb = await createClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      // profile 자동 생성 (없으면)
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        const { data: existing } = await sb.from('profile').select('id').eq('id', user.id).maybeSingle();
        if (!existing) {
          await sb.from('profile').insert({
            id: user.id,
            display_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'unknown',
            role: 'member',
          });
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
