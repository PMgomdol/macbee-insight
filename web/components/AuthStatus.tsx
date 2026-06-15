import { getAuthState } from '@/lib/auth';
import { AuthStatusClient } from './AuthStatusClient';

export async function AuthStatus() {
  const { user, displayName, isReviewer } = await getAuthState();

  if (!user) {
    return <AuthStatusClient state={{ kind: 'guest' }} />;
  }
  const name = displayName ?? user.email?.split('@')[0] ?? '?';
  return <AuthStatusClient state={{ kind: 'user', name, isReviewer }} />;
}
