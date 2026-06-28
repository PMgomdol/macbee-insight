import Link from 'next/link';
import { getAuthState } from '@/lib/auth';

export async function FooterAdminLink() {
  const { isReviewer } = await getAuthState();
  if (!isReviewer) return null;
  return (
    <Link href="/admin" className="hover:text-[var(--fg)]">
      운영진
    </Link>
  );
}
