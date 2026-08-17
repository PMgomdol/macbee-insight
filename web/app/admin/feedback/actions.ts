'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getAuthState } from '@/lib/auth';

export type FeedbackStatus = 'new' | 'in_progress' | 'hold' | 'answered' | 'closed';

export type FeedbackTicket = {
  id: number;
  kind: string;
  message: string;
  email: string | null;
  page_url: string | null;
  submitted_at: string | null;
  status: FeedbackStatus;
  assignee: string | null;
  priority: 'low' | 'normal' | 'high';
  answer: string | null;
  answered_at: string | null;
  answered_by: string | null;
  reviewer_note: string | null;
  updated_at: string | null;
};

async function guard() {
  const s = await getAuthState();
  if (!s.isReviewer) throw new Error('권한이 없어요');
  return s;
}

type Patch = Partial<Pick<FeedbackTicket, 'status' | 'assignee' | 'priority' | 'reviewer_note'>>;

/** 상태·담당자·우선순위·내부메모 변경 */
export async function updateTicket(id: number, patch: Patch): Promise<{ ok: boolean; error?: string }> {
  await guard();
  const sb = createAdminClient();
  const { error } = await sb
    .from('feedback')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** 답변 저장 → 상태 자동으로 '답변완료'로. 발송은 클라이언트 mailto로 별도. */
export async function saveAnswer(
  id: number,
  answer: string
): Promise<{ ok: boolean; error?: string; answeredBy?: string | null; answeredAt?: string }> {
  const s = await guard();
  const sb = createAdminClient();
  const answeredBy = s.displayName ?? s.user?.email ?? null;
  const answeredAt = new Date().toISOString();
  const { error } = await sb
    .from('feedback')
    .update({ answer, answered_at: answeredAt, answered_by: answeredBy, status: 'answered', updated_at: answeredAt })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, answeredBy, answeredAt };
}
