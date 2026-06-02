import { createClient } from '@/lib/supabase/server';
import { AuthStatusClient } from './AuthStatusClient';

export async function AuthStatus() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  if (!user) {
    return <AuthStatusClient state={{ kind: 'guest' }} />;
  }

  const { data: prof } = await sb.from('profile').select('display_name, role').eq('id', user.id).maybeSingle();
  const name = prof?.display_name ?? user.email?.split('@')[0] ?? '?';
  const isReviewer = prof?.role === 'reviewer' || prof?.role === 'admin';

  return <AuthStatusClient state={{ kind: 'user', name, isReviewer }} />;
}
