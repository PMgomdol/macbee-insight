'use server';

import { createAdminClient } from '@/lib/supabase/server';

export type FeedbackKind = 'suggestion' | 'bug' | 'inquiry' | 'praise';

const KIND_SET: Set<FeedbackKind> = new Set(['suggestion', 'bug', 'inquiry', 'praise']);

export async function submitFeedback(input: {
  kind: string;
  message: string;
  email?: string;
  pageUrl?: string;
  userAgent?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const kind = KIND_SET.has(input.kind as FeedbackKind) ? (input.kind as FeedbackKind) : 'inquiry';
  const message = (input.message ?? '').trim();
  if (!message) return { ok: false, error: '내용을 입력해주세요' };
  if (message.length > 5000) return { ok: false, error: '5000자 이하로 적어주세요' };
  const email = (input.email ?? '').trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: '이메일 형식이 이상해요' };
  }

  try {
    const sb = createAdminClient();
    const { error } = await sb.from('feedback').insert({
      kind,
      message,
      email,
      page_url: input.pageUrl ?? null,
      user_agent: (input.userAgent ?? '').slice(0, 500),
    });
    if (error) return { ok: false, error: '보내지 못했어요 — ' + error.message };
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: '서버 문제로 못 보냈어요: ' + msg.slice(0, 120) };
  }
}
