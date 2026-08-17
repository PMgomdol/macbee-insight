'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getAuthState } from '@/lib/auth';

export type FeedbackRow = {
  id: number;
  kind: string;
  message: string;
  email: string | null;
  page_url: string | null;
  submitted_at: string | null;
  resolved: boolean;
  reviewer_note: string | null;
};

/** 운영진이 의견 처리 여부를 토글. 운영진 권한 필수. */
export async function setFeedbackResolved(
  id: number,
  resolved: boolean
): Promise<{ ok: boolean; error?: string }> {
  const { isReviewer } = await getAuthState();
  if (!isReviewer) return { ok: false, error: '권한이 없어요' };

  const sb = createAdminClient();
  const { error } = await sb.from('feedback').update({ resolved }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
