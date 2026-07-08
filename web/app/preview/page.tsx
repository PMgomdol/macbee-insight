import { redirect } from 'next/navigation';

// 프리뷰 시안이 2026-07-08 회의 승인으로 메인에 적용됨 — 공유된 링크는 메인으로
export default function PreviewRedirect() {
  redirect('/');
}
