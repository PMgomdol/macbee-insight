import { getAuthState } from '@/lib/auth';
import { MobileNavClient } from './MobileNav';

export async function MobileNavServer() {
  const { isReviewer } = await getAuthState();
  return <MobileNavClient isReviewer={isReviewer} />;
}
