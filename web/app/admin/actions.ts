'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath, updateTag } from 'next/cache';

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
    // 자료 형식이 메뉴 배치 기준: 템플릿만 양식·템플릿, 나머지는 콘텐츠
    kind: row.format === '템플릿' ? 'files' : 'insights',
  });
  if (insErr) throw new Error('자료실로 옮기지 못했어요 — ' + insErr.message);
}

export async function approveProposal(id: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error('로그인해주세요');
  const role = await getRole();
  if (role !== 'reviewer' && role !== 'admin') throw new Error('운영진만 할 수 있어요');

  const sb = await createClient();
  const { data: row } = await sb.from('staging_proposal').select('*').eq('id', id).single();
  if (!row) throw new Error('자료를 찾지 못했어요');
  if (row.status !== 'pending') throw new Error('이미 처리한 자료예요');

  const approvers = new Set<string>(row.approvers ?? []);
  approvers.add(me.email);

  if (approvers.size >= MIN_APPROVALS) {
    await migrateToArchive(row, Array.from(approvers));
    await sb.from('staging_proposal').update({
      status: 'approved',
      approvers: Array.from(approvers),
      reviewed_at: new Date().toISOString(),
    }).eq('id', id);
    updateTag('archive');
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
  if (!me) throw new Error('로그인해주세요');
  const role = await getRole();
  if (role !== 'admin') throw new Error('단독 승인은 관리자만 할 수 있어요');
  if (!reason.trim()) throw new Error('단독 승인 사유를 적어주세요');

  const sb = await createClient();
  const { data: row } = await sb.from('staging_proposal').select('*').eq('id', id).single();
  if (!row) throw new Error('자료를 찾지 못했어요');
  if (row.status !== 'pending') throw new Error('이미 처리한 자료예요');

  const approvers = new Set<string>(row.approvers ?? []);
  approvers.add(me.email);

  await migrateToArchive(row, Array.from(approvers), `단독 승인 (admin ${me.email}). 사유: ${reason.trim()}`);
  await sb.from('staging_proposal').update({
    status: 'approved',
    approvers: Array.from(approvers),
    reviewer_note: `[단독승인] ${reason.trim()}`,
    reviewed_at: new Date().toISOString(),
  }).eq('id', id);
  updateTag('archive');
  revalidatePath('/admin');
}

export async function rejectProposal(id: string, note: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error('로그인해주세요');
  const role = await getRole();
  if (role !== 'reviewer' && role !== 'admin') throw new Error('운영진만 할 수 있어요');

  const sb = await createClient();
  await sb.from('staging_proposal').update({
    status: 'rejected',
    reviewer_note: note || '거절 (사유를 적지 않았어요)',
    reviewed_at: new Date().toISOString(),
  }).eq('id', id);
  revalidatePath('/admin');
}
