'use server';

import { after } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath, updateTag } from 'next/cache';
import { notifyProposalResult } from '@/lib/notify';

const MIN_APPROVALS = 2;

/** 게시된 자료 수정 — 운영진이 제목·요약·분류·태그·형식·메뉴위치를 직접 보정. */
export async function updateArchiveItem(
  id: number,
  fields: { title: string; summary: string; main_category: string; sub_category: string; tags: string[]; format: string; kind: 'files' | 'insights'; external_url?: string; file_url?: string }
) {
  const me = await getCurrentUser();
  if (!me) throw new Error('로그인해주세요');
  const role = await getRole();
  if (role !== 'reviewer' && role !== 'admin') throw new Error('운영진만 할 수 있어요');
  const title = fields.title.trim();
  if (!title) throw new Error('제목은 비울 수 없어요');

  const sb = createAdminClient();
  const patch: Record<string, unknown> = {
    title,
    summary: fields.summary.trim() || null,
    main_category: fields.main_category.trim() || '미분류',
    sub_category: fields.sub_category.trim() || null,
    tags: fields.tags.length ? fields.tags : [],
    format: fields.format.trim() || null,
    kind: fields.kind === 'files' ? 'files' : 'insights',
  };
  // URL은 넘어온 경우에만 patch (실수로 링크 지워지는 것 방지). 빈 문자열이면 null로 비움.
  if (fields.external_url !== undefined) patch.external_url = fields.external_url.trim() || null;
  if (fields.file_url !== undefined) patch.file_url = fields.file_url.trim() || null;
  const { error } = await sb
    .from('archive_item')
    .update(patch)
    .eq('id', id);
  if (error) throw new Error('수정에 실패했어요 — ' + error.message);
  updateTag('archive');
  revalidatePath('/admin-mb26/panel/archive');
}

/** 자료 공개 상태 변경 — public(공개) / hidden(숨김) / deleted(삭제, 되살릴 수 있음). */
export async function setArchiveStatus(id: number, status: 'public' | 'hidden' | 'deleted') {
  const me = await getCurrentUser();
  if (!me) throw new Error('로그인해주세요');
  const role = await getRole();
  if (role !== 'reviewer' && role !== 'admin') throw new Error('운영진만 할 수 있어요');
  if (!['public', 'hidden', 'deleted'].includes(status)) throw new Error('알 수 없는 상태예요');

  const sb = createAdminClient();
  const { error } = await sb.from('archive_item').update({ status }).eq('id', id);
  if (error) throw new Error('상태 변경에 실패했어요 — ' + error.message);
  updateTag('archive');
  revalidatePath('/admin-mb26/panel/archive');
}

/** 승인 전 제안 내용 보정 — 운영진이 제목·요약·분류·태그·형식을 다듬어 저장. */
export async function updateProposal(
  id: string,
  fields: { title: string; summary: string; main_category: string; sub_category: string; tags: string[]; format: string }
) {
  const me = await getCurrentUser();
  if (!me) throw new Error('로그인해주세요');
  const role = await getRole();
  if (role !== 'reviewer' && role !== 'admin') throw new Error('운영진만 할 수 있어요');
  const title = fields.title.trim();
  if (!title) throw new Error('제목은 비울 수 없어요');

  const sb = createAdminClient();
  const { error } = await sb
    .from('staging_proposal')
    .update({
      title,
      summary: fields.summary.trim() || null,
      main_category: fields.main_category.trim() || null,
      sub_category: fields.sub_category.trim() || null,
      tags: fields.tags.length ? fields.tags : null,
      format: fields.format.trim() || null,
    })
    .eq('id', id)
    .eq('status', 'pending'); // 이미 처리된 건 수정 금지
  if (error) throw new Error('수정에 실패했어요 — ' + error.message);
  revalidatePath('/admin-mb26/panel');
}

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
  // 원자적 승인 — DB 함수가 행 잠금(FOR UPDATE) 후 approvers append.
  // 동시 승인 시에도 유실 없음. MIN 도달 시 status='approved'로 바꾸고
  // approved=true를 받은 요청 한 곳만 자료실 이관을 수행.
  const { data, error } = await sb.rpc('approve_proposal_atomic', {
    p_id: id,
    p_email: me.email,
    p_min: MIN_APPROVALS,
  });
  if (error) throw new Error('승인 처리에 실패했어요 — ' + error.message);
  const res = data as { ok: boolean; reason?: string; approved?: boolean; approvers?: string[] };
  if (!res.ok) {
    throw new Error(res.reason === 'not_pending' ? '이미 처리한 자료예요' : '자료를 찾지 못했어요');
  }

  if (res.approved) {
    const { data: row } = await sb.from('staging_proposal').select('*').eq('id', id).single();
    if (!row) throw new Error('자료를 찾지 못했어요');
    try {
      await migrateToArchive(row, res.approvers ?? []);
    } catch (e) {
      // 이관 실패 시 pending으로 되돌려 재시도 가능하게 (승인 기록은 유지)
      await sb.from('staging_proposal').update({ status: 'pending' }).eq('id', id);
      throw e;
    }
    updateTag('archive');
    // 제안자에게 승인 결과 메일 — 응답 반환 뒤 백그라운드 발송
    if (row.proposer_email) {
      after(() => notifyProposalResult({ to: row.proposer_email, title: row.title, approved: true }));
    }
  }
  revalidatePath('/admin-mb26/panel');
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
  if (row.proposer_email) {
    after(() => notifyProposalResult({ to: row.proposer_email, title: row.title, approved: true }));
  }
  revalidatePath('/admin-mb26/panel');
}

export async function rejectProposal(id: string, note: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error('로그인해주세요');
  const role = await getRole();
  if (role !== 'reviewer' && role !== 'admin') throw new Error('운영진만 할 수 있어요');

  const sb = await createClient();
  const { data: row } = await sb.from('staging_proposal').update({
    status: 'rejected',
    reviewer_note: note || '거절 (사유를 적지 않았어요)',
    reviewed_at: new Date().toISOString(),
  }).eq('id', id).select('title, proposer_email').single();
  // 제안자에게 반려 결과 메일 — 응답 반환 뒤 백그라운드 발송
  if (row?.proposer_email) {
    after(() => notifyProposalResult({ to: row.proposer_email, title: row.title, approved: false, note: note || null }));
  }
  revalidatePath('/admin-mb26/panel');
}
