// 메일 노티 — Apps Script webapp(MailApp)으로 발송 위임.
// MAIL_WEBAPP_URL / MAIL_WEBAPP_SECRET 미설정이면 조용히 건너뜀 (로컬 개발 등).
// 알림 실패가 본 동작(등록·승인·반려)을 막으면 안 되므로 절대 throw하지 않는다.

import { createAdminClient } from '@/lib/supabase/server';

// 개인 계정 — 자료실 알림에서 영구 제외 (운영진 등록돼 있어도 메일 안 감).
const EXCLUDE_EMAILS = new Set(['openpath@duotone.io']);

/**
 * 제안 알림 수신자 = 운영진(reviewer/admin) 이메일. 운영진이 추가되면 자동 반영.
 * profile엔 email이 없어 auth.users에서 조인. openpath는 제외.
 * MAIL_NOTIFY_TO(콤마 구분) 설정 시 그 목록으로 강제 — 테스트·단계 롤아웃용.
 * 배포 전 env를 비우면 실제 운영진 리스트가 자동으로 흐른다.
 */
async function reviewerEmails(): Promise<string[]> {
  const override = process.env.MAIL_NOTIFY_TO;
  if (override) {
    return override.split(',').map((s) => s.trim()).filter((e) => e && !EXCLUDE_EMAILS.has(e));
  }
  try {
    const sb = createAdminClient();
    const { data: profs } = await sb.from('profile').select('id').in('role', ['reviewer', 'admin']);
    const ids = new Set((profs ?? []).map((p) => p.id));
    if (!ids.size) return [];
    const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
    return (list?.users ?? [])
      .filter((u) => ids.has(u.id) && u.email && !EXCLUDE_EMAILS.has(u.email))
      .map((u) => u.email as string);
  } catch (e) {
    console.error('reviewerEmails error:', e);
    return [];
  }
}

type SubmittedPayload = {
  id?: string | null;
  title: string;
  proposer?: string | null;
  proposerEmail?: string | null;
  url?: string | null;
  summary?: string | null;
};

type ResultPayload = {
  to: string;
  title: string;
  approved: boolean;
  note?: string | null;
};

type FeedbackPayload = {
  kind: string;
  kindLabel: string;
  message: string;
  name?: string | null;
  email?: string | null;
  pageUrl?: string | null;
};

async function post(event: string, data: Record<string, unknown>) {
  const url = process.env.MAIL_WEBAPP_URL;
  const secret = process.env.MAIL_WEBAPP_SECRET;
  if (!url || !secret) return;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret, event, data }),
      redirect: 'follow', // Apps Script는 302 → googleusercontent.com으로 응답
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error(`notify ${event} failed: HTTP ${res.status}`);
      return;
    }
    const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (body && body.ok === false) console.error(`notify ${event} rejected: ${body.error}`);
  } catch (e) {
    console.error(`notify ${event} error:`, e);
  }
}

/** 신규 자료 제안 → 운영진에게 알림 (수신자는 Supabase 운영진 목록에서 자동 조회) */
export async function notifyProposalSubmitted(d: SubmittedPayload) {
  const admins = await reviewerEmails();
  if (!admins.length) return; // 수신자 없음 — 발송 스킵
  return post('proposal_submitted', { ...d, admins });
}

/** 승인/반려 결과 → 제안자에게 알림 */
export function notifyProposalResult(d: ResultPayload) {
  return post('proposal_result', d);
}

/** 사용자 의견([의견 보내기]) → 운영진에게 알림 (수신자 자동 조회) */
export async function notifyFeedbackSubmitted(d: FeedbackPayload) {
  const admins = await reviewerEmails();
  if (!admins.length) return; // 수신자 없음 — 발송 스킵
  return post('feedback_submitted', { ...d, admins });
}

type DriveFailPayload = { id: number; title: string; reason: string };

/** 승인된 자료의 드라이브 전송 실패 → 운영진에게 알림 (파일은 Supabase 링크로 그대로 서비스됨) */
export async function notifyDriveTransferFailed(d: DriveFailPayload) {
  const admins = await reviewerEmails();
  if (!admins.length) return;
  return post('drive_transfer_failed', { ...d, admins });
}

export type StaleProposalItem = { id: string; title: string; proposer?: string | null; days: number };

/** 7일 이상 미검수 등록 요청 → 운영진 리마인드 (api/cron/stale-proposals에서 호출) */
export async function notifyStaleProposals(items: StaleProposalItem[]) {
  if (!items.length) return;
  const admins = await reviewerEmails();
  if (!admins.length) return;
  return post('stale_proposals', { items, admins });
}
