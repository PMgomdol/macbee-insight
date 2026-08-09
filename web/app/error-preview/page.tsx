// 오류 페이지 미리보기용 임시 라우트 — 확인 후 삭제 예정.
// cacheComponents: 동적 접근(connection)은 Suspense 안에서만 — 빌드는 fallback까지만 프리렌더.
import { Suspense } from 'react';
import { connection } from 'next/server';

async function Thrower(): Promise<React.ReactNode> {
  await connection();
  throw new Error('오류 페이지 미리보기');
}

export default function ErrorPreview() {
  return (
    <Suspense fallback={null}>
      <Thrower />
    </Suspense>
  );
}
