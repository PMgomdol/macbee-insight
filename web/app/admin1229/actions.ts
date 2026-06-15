'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * 운영진 신청 — 로그인된 사용자가 본인 profile에 role='pending' 기록.
 * - 기존 profile이 없으면 생성
 * - 이미 reviewer/admin이면 거부
 * - notes에 신청 시각·사유 기록
 */
export async function applyReviewer(
  displayName: string,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !user.email) return { ok: false, error: '로그인 필요' };
  if (!displayName.trim()) return { ok: false, error: '이름 필수' };

  // service_role로 안전하게 처리 (RLS profile_self_update 정책 활용 시도)
  const sba = createAdminClient();
  const { data: existing } = await sba
    .from('profile')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (existing?.role === 'reviewer' || existing?.role === 'admin') {
    return { ok: false, error: '이미 운영진 권한 보유' };
  }
  if (existing?.role === 'pending') {
    return { ok: false, error: '이미 신청 완료 — 승인 대기 중' };
  }

  const now = new Date().toISOString();
  const note = `reviewer-applied:${now}` + (reason ? ` reason:${reason.slice(0, 200)}` : '');

  const uid = user.id;
  async function tryWrite(withNotes: boolean) {
    const base = { role: 'pending' as const, display_name: displayName };
    const payload: Record<string, unknown> = withNotes ? { ...base, notes: note } : base;
    if (existing) {
      return await sba.from('profile').update(payload).eq('id', uid);
    }
    return await sba.from('profile').insert({ id: uid, ...payload });
  }

  // 1차: notes 포함. 컬럼 없으면 fallback (스키마 마이그레이션 안 된 환경)
  let r = await tryWrite(true);
  if (r.error && /notes/.test(r.error.message)) {
    r = await tryWrite(false);
  }
  if (r.error) return { ok: false, error: r.error.message };

  revalidatePath('/admin1229');
  revalidatePath('/admin');
  return { ok: true };
}

/** 운영진(reviewer/admin) — 신청 승인 (pending → reviewer). 본인 self-approve 금지 */
export async function approveReviewer(profileId: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: '로그인 필요' };
  if (user.id === profileId) return { ok: false, error: '본인 신청은 본인이 승인 불가' };
  const sba = createAdminClient();
  const { data: me } = await sba.from('profile').select('role').eq('id', user.id).maybeSingle();
  if (me?.role !== 'admin' && me?.role !== 'reviewer') return { ok: false, error: '운영진 전용' };

  const { error } = await sba
    .from('profile')
    .update({ role: 'reviewer' })
    .eq('id', profileId)
    .eq('role', 'pending');
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin');
  revalidatePath('/admin1229');
  return { ok: true };
}

/** 운영진 — 신청 거절 (pending → member). 본인 self-reject 금지 */
export async function rejectReviewer(profileId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: '로그인 필요' };
  if (user.id === profileId) return { ok: false, error: '본인 신청은 본인이 처리 불가' };
  const sba = createAdminClient();
  const { data: me } = await sba.from('profile').select('role').eq('id', user.id).maybeSingle();
  if (me?.role !== 'admin' && me?.role !== 'reviewer') return { ok: false, error: '운영진 전용' };

  const note = `reviewer-rejected:${new Date().toISOString()}` + (reason ? ` reason:${reason.slice(0, 200)}` : '');
  let r = await sba
    .from('profile')
    .update({ role: 'member', notes: note })
    .eq('id', profileId)
    .eq('role', 'pending');
  if (r.error && /notes/.test(r.error.message)) {
    r = await sba
      .from('profile')
      .update({ role: 'member' })
      .eq('id', profileId)
      .eq('role', 'pending');
  }
  if (r.error) return { ok: false, error: r.error.message };

  revalidatePath('/admin');
  revalidatePath('/admin1229');
  return { ok: true };
}
