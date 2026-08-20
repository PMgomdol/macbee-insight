'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { notifyFeedbackSubmitted } from '@/lib/notify';
import { tooMany } from '@/lib/rate-limit';

export type FeedbackKind = 'suggestion' | 'bug' | 'inquiry' | 'praise';

const KIND_SET: Set<FeedbackKind> = new Set(['suggestion', 'bug', 'inquiry', 'praise']);
const KIND_LABEL: Record<FeedbackKind, string> = { suggestion: '제안', bug: '오류', inquiry: '문의', praise: '칭찬' };

export async function submitFeedback(input: {
  kind: string;
  message: string;
  name?: string;
  email?: string;
  pageUrl?: string;
  userAgent?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (await tooMany('feedback', 10)) return { ok: false, error: '요청이 몰렸어요. 잠시 후 다시 시도해주세요.' };
  const kind = KIND_SET.has(input.kind as FeedbackKind) ? (input.kind as FeedbackKind) : 'inquiry';
  const message = (input.message ?? '').trim();
  if (!message) return { ok: false, error: '내용을 입력해주세요' };
  if (message.length > 5000) return { ok: false, error: '5000자 이하로 적어주세요' };
  const email = (input.email ?? '').trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: '이메일 주소를 확인해주세요' };
  }
  const name = (input.name ?? '').trim().slice(0, 80) || null;

  try {
    const sb = createAdminClient();
    const base = {
      kind,
      message,
      email,
      page_url: input.pageUrl ?? null,
      user_agent: (input.userAgent ?? '').slice(0, 500),
    };
    let { error } = await sb.from('feedback').insert({ ...base, name });
    // name 컬럼이 아직 없으면(마이그레이션 전) 이름만 빼고 저장 — 사용자 제출이 깨지지 않게
    if (error && /name|column/i.test(error.message)) {
      ({ error } = await sb.from('feedback').insert(base));
    }
    if (error) return { ok: false, error: '보내지 못했어요 — ' + error.message };
    // 운영진 알림 — 실패해도 제출은 성공 처리 (notify는 throw 안 함)
    await notifyFeedbackSubmitted({
      kind,
      kindLabel: KIND_LABEL[kind],
      message,
      name,
      email,
      pageUrl: input.pageUrl ?? null,
    });
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: '서버 문제로 못 보냈어요: ' + msg.slice(0, 120) };
  }
}
