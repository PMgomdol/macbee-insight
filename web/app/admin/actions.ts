'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const MIN_APPROVALS = 2;

async function getCurrentUser(): Promise<{ email: string; id: string } | null> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return null;
  return { email: user.email, id: user.id };
}

async function getRole(): Promise<string | null> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from('profile').select('role').eq('id', user.id).single();
  return data?.role ?? null;
}

async function migrateToArchive(row: any, approvers: string[], extraNote?: string) {
  const sb = await createClient();
  const note = '멤버 제안 — 운영진 ' + approvers.join(', ') + ' 승인' + (extraNote ? `. ${extraNote}` : '');
  const { error: insErr } = await sb.from('archive_item').insert({
    main_category: row.main_category ?? '미분류',
    sub_category: row.sub_category,
    tags: row.tags ?? [],
    title: row.title,
    summary: row.summary,
    external_url: row.external_url,
    file_url: row.file_url,
    format: row.format,
    published_at: row.published_at,
    proposer: row.proposer,
    status: 'public',
    exposure_grade: 'free',
    notes: note,
  });
  if (insErr) throw new Error('이관 실패: ' + insErr.message);
}

export async function approveProposal(id: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error('로그인 필요');
  const role = await getRole();
  if (role !== 'reviewer' && role !== 'admin') throw new Error('운영진만 가능');

  const sb = await createClient();
  const { data: row } = await sb.from('staging_proposal').select('*').eq('id', id).single();
  if (!row) throw new Error('항목 없음');
  if (row.status !== 'pending') throw new Error('이미 처리됨');

  const approvers = new Set<string>(row.approvers ?? []);
  approvers.add(me.email);

  if (approvers.size >= MIN_APPROVALS) {
    await migrateToArchive(row, Array.from(approvers));
    await sb.from('staging_proposal').update({
      status: 'approved',
      approvers: Array.from(approvers),
      reviewed_at: new Date().toISOString(),
    }).eq('id', id);
  } else {
    await sb.from('staging_proposal').update({ approvers: Array.from(approvers) }).eq('id', id);
  }
  revalidatePath('/admin');
}

/**
 * admin 단독 승인 — 운영진 2인 미확보 기간 한시 폴백.
 * admin role만 가능. notes·reviewer_note에 단독승인 명시.
 */
export async function forceApproveProposal(id: string, reason: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error('로그인 필요');
  const role = await getRole();
  if (role !== 'admin') throw new Error('admin 전용 — 단독 승인 권한 없음');
  if (!reason.trim()) throw new Error('단독 승인 사유 필수');

  const sb = await createClient();
  const { data: row } = await sb.from('staging_proposal').select('*').eq('id', id).single();
  if (!row) throw new Error('항목 없음');
  if (row.status !== 'pending') throw new Error('이미 처리됨');

  const approvers = new Set<string>(row.approvers ?? []);
  approvers.add(me.email);

  await migrateToArchive(row, Array.from(approvers), `단독 승인 (admin ${me.email}). 사유: ${reason.trim()}`);
  await sb.from('staging_proposal').update({
    status: 'approved',
    approvers: Array.from(approvers),
    reviewer_note: `[단독승인] ${reason.trim()}`,
    reviewed_at: new Date().toISOString(),
  }).eq('id', id);
  revalidatePath('/admin');
}

export async function rejectProposal(id: string, note: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error('로그인 필요');
  const role = await getRole();
  if (role !== 'reviewer' && role !== 'admin') throw new Error('운영진만 가능');

  const sb = await createClient();
  await sb.from('staging_proposal').update({
    status: 'rejected',
    reviewer_note: note || '거절 (사유 없음)',
    reviewed_at: new Date().toISOString(),
  }).eq('id', id);
  revalidatePath('/admin');
}
