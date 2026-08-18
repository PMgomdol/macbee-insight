import { NextRequest, NextResponse } from 'next/server';
import { updateTag } from 'next/cache';

/**
 * 자료 DB를 앱 밖(스크립트·SQL)에서 일괄 수정한 뒤 캐시를 즉시 무효화하는 관리용 엔드포인트.
 * 평소 등록·승인은 서버 액션이 updateTag를 부르지만, 직접 수정은 태그가 안 깨져 최대 1시간 지연되므로 이 라우트로 강제 갱신한다.
 * service_role 키를 아는 사람만 호출 가능 (Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>).
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token || token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const tags = ['archive', 'popular', 'faq'];
  for (const t of tags) updateTag(t);
  return NextResponse.json({ ok: true, revalidated: tags });
}
