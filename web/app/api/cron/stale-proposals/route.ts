import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { notifyStaleProposals, type StaleProposalItem } from '@/lib/notify';

/**
 * 등록 요청 7일 미검수 리마인드 (2026-08-31 회의 결정)
 * GitHub Actions가 매일 09:30 KST에 호출 (.github/workflows/stale-proposals.yml).
 *
 * 동작: status=pending 이고 7일 이상 지난 제안을 조회.
 * 그중 "어제~오늘 사이 7일을 갓 넘긴 건"이 있을 때만 메일 발송 (건별 1회 알림).
 * 메일 본문에는 맥락을 위해 7일 넘은 대기 건 전체를 나열한다.
 *
 * 인증: Authorization: Bearer <MAIL_WEBAPP_SECRET> (메일 인프라와 동일 시크릿 재사용).
 * ?dry=1 — 발송 없이 무엇을 보낼지 JSON으로 반환 (검증용).
 */
export async function POST(req: NextRequest) {
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const secret = process.env.MAIL_WEBAPP_SECRET;
  if (!secret || auth !== secret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get('dry') === '1';

  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const staleBefore = new Date(now - 7 * DAY).toISOString();

  const sb = createAdminClient();
  const { data, error } = await sb
    .from('staging_proposal')
    .select('id, title, proposer, proposed_at')
    .eq('status', 'pending')
    .lte('proposed_at', staleBefore)
    .order('proposed_at');
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const items: StaleProposalItem[] = (data ?? []).map((r) => ({
    id: r.id as string,
    title: (r.title as string) || '(제목 없음)',
    proposer: r.proposer as string | null,
    days: Math.floor((now - new Date(r.proposed_at as string).getTime()) / DAY),
  }));
  // 갓 7일을 넘긴 건(7일 이상 ~ 8일 미만)이 있을 때만 발송 — 매일 반복 발송 방지.
  // (크론이 하루 걸러 실패하면 그 건은 알림을 놓칠 수 있으나, 다음 신규 건 알림에 함께 나열된다)
  const newlyStale = items.filter((i) => i.days < 8);

  if (!dry && newlyStale.length > 0) await notifyStaleProposals(items);
  return NextResponse.json({
    ok: true,
    stale: items.length,
    newlyStale: newlyStale.length,
    sent: !dry && newlyStale.length > 0,
    ...(dry ? { items } : {}),
  });
}
