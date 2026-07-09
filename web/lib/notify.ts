// 메일 노티 — Apps Script webapp(MailApp)으로 발송 위임.
// MAIL_WEBAPP_URL / MAIL_WEBAPP_SECRET 미설정이면 조용히 건너뜀 (로컬 개발 등).
// 알림 실패가 본 동작(등록·승인·반려)을 막으면 안 되므로 절대 throw하지 않는다.

type SubmittedPayload = {
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

/** 신규 자료 제안 → 운영진에게 알림 */
export function notifyProposalSubmitted(d: SubmittedPayload) {
  return post('proposal_submitted', d);
}

/** 승인/반려 결과 → 제안자에게 알림 */
export function notifyProposalResult(d: ResultPayload) {
  return post('proposal_result', d);
}
