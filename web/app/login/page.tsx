import { redirect } from 'next/navigation';

/** 구 /login → 운영진 진입점으로 리다이렉트 (외부 노출 차단) */
export default function LoginPage() {
  redirect('/admin-mb26');
}
