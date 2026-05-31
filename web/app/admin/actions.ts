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

async function isReviewer(): Promise<boolean> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const { data } = await sb.from('profile').select('role').eq('id', user.id).single();
  return data?.role === 'reviewer' || data?.role === 'admin';
}

export async function approveProposal(id: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error('로그인 필요');
  if (!(await isReviewer())) throw new Error('운영진만 가능');

  const sb = await createClient();
  // 현재 승인자 목록 조회
  const { data: row } = await sb.from('staging_proposal').select('*').eq('id', id).single();
  if (!row) throw new Error('항목 없음');
  if (row.status !== 'pending') throw new Error('이미 처리됨');

  const approvers = new Set<string>(row.approvers ?? []);
  approvers.add(me.email);

  if (approvers.size >= MIN_APPROVALS) {
    // 자료실로 이관
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
      notes: '멤버 제안 — 운영진 ' + Array.from(approvers).join(', ') + ' 승인',
    });
    if (insErr) throw new Error('이관 실패: ' + insErr.message);
    await sb.from('staging_proposal').update({
      status: 'approved',
      approvers: Array.from(approvers),
      reviewed_at: new Date().toISOString(),
    }).eq('id', id);
  } else {
    await sb.from('staging_proposal').update({
      approvers: Array.from(approvers),
    }).eq('id', id);
  }
  revalidatePath('/admin');
}

export async function rejectProposal(id: string, note: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error('로그인 필요');
  if (!(await isReviewer())) throw new Error('운영진만 가능');

  const sb = await createClient();
  await sb.from('staging_proposal').update({
    status: 'rejected',
    reviewer_note: note || '거절 (사유 없음)',
    reviewed_at: new Date().toISOString(),
  }).eq('id', id);
  revalidatePath('/admin');
}
