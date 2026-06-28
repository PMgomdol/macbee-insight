import { getAuthState } from '@/lib/auth';
import { HeaderNavClient } from './HeaderNav';

export async function HeaderNavServer() {
  const { isReviewer } = await getAuthState();
  return <HeaderNavClient isReviewer={isReviewer} />;
}
