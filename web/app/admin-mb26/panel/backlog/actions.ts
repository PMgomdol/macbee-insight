'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getAuthState } from '@/lib/auth';

export type BacklogStatus = 'todo' | 'doing' | 'done';

export type BacklogItem = {
  id: number;
  title: string;
  detail: string | null;
  category: string | null;
  status: BacklogStatus;
  assignee: string | null;
  priority: 'low' | 'normal' | 'high';
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

async function guard() {
  const s = await getAuthState();
  if (!s.isReviewer) throw new Error('권한이 없어요');
  return s;
}

type NewInput = { title: string; detail?: string; category?: string; priority?: BacklogItem['priority']; assignee?: string };

/** 백로그 추가 */
export async function createBacklog(input: NewInput): Promise<{ ok: boolean; error?: string; item?: BacklogItem }> {
  const s = await guard();
  if (!input.title.trim()) return { ok: false, error: '제목을 입력해주세요' };
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('backlog')
    .insert({
      title: input.title.trim(),
      detail: input.detail?.trim() || null,
      category: input.category?.trim() || null,
      priority: input.priority ?? 'normal',
      assignee: input.assignee || null,
      status: 'todo',
      created_by: s.displayName ?? s.user?.email ?? null,
    })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, item: data as BacklogItem };
}

type Patch = Partial<Pick<BacklogItem, 'title' | 'detail' | 'category' | 'status' | 'assignee' | 'priority'>>;

/** 백로그 수정 (상태·담당자·우선순위·내용) */
export async function updateBacklog(id: number, patch: Patch): Promise<{ ok: boolean; error?: string }> {
  await guard();
  const sb = createAdminClient();
  const { error } = await sb
    .from('backlog')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** 백로그 삭제 */
export async function deleteBacklog(id: number): Promise<{ ok: boolean; error?: string }> {
  await guard();
  const sb = createAdminClient();
  const { error } = await sb.from('backlog').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
