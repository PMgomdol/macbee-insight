import Link from 'next/link';
import { getAuthState } from '@/lib/auth';

export async function FooterAdminLink() {
  const { isReviewer } = await getAuthState();
  if (!isReviewer) return null;
  return (
    <Link href="/admin-mb26/panel" className="hover:text-white transition-colors">
      운영/관리
    </Link>
  );
}
