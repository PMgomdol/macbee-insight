import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase 클라이언트 — 'use client' 컴포넌트에서만 사용.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
