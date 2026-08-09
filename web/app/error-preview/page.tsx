// 오류 페이지 미리보기용 임시 라우트 — 확인 후 삭제 예정.
// force-dynamic: 빌드 프리렌더에서 throw 하면 빌드가 깨지므로 요청 시점에만 실행.
export const dynamic = 'force-dynamic';

export default function ErrorPreview(): never {
  throw new Error('오류 페이지 미리보기');
}
