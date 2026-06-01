import { NextResponse } from 'next/server';

/**
 * env 변수가 등록됐는지 확인용 디버그 엔드포인트.
 * 값 자체는 반환 안 함 (앞 8자만 + 길이).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const keys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
  ] as const;
  const out: Record<string, { exists: boolean; preview: string; length: number }> = {};
  for (const k of keys) {
    const v = process.env[k] ?? '';
    out[k] = {
      exists: v.length > 0,
      preview: v ? v.slice(0, 8) + '...' : 'MISSING',
      length: v.length,
    };
  }
  return NextResponse.json({ env: out, runtime: 'nodejs', timestamp: new Date().toISOString() });
}
