import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const sb = await createClient();
  await sb.auth.signOut();
  // 303: POST → GET 전환 리다이렉트. 307이면 홈에 POST로 재요청돼 오류 페이지가 뜸.
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
