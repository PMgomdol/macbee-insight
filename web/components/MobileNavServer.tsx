import { getAuthState } from '@/lib/auth';
import { MobileNavClient } from './MobileNav';

export async function MobileNavServer() {
  const { isReviewer, user, displayName } = await getAuthState();
  return <MobileNavClient isReviewer={isReviewer} loggedIn={!!user} accountLabel={displayName ?? user?.email ?? null} />;
}
