'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath, updateTag } from 'next/cache';

const FALLBACK_MAIN = '미분류';

export type CategoryFields = {
  main_category: string;
  sub_category: string;
  description: string;
  owner: string;
  channels: string;
  monitor_days: string; // 숫자 문자열 또는 ''
};

export type CatKey = { main: string; sub: string | null };

async function requireReviewer() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('로그인해주세요');
  const { data } = await sb.from('profile').select('role').eq('id', user.id).single();
  if (data?.role !== 'reviewer' && data?.role !== 'admin') throw new Error('운영진만 할 수 있어요');
}

function parseDays(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** (main, sub) 쌍으로 archive_item을 거르는 쿼리 빌더 — sub가 null이면 IS NULL 매칭. */
function matchItems(q: any, key: CatKey) {
  q = q.eq('main_category', key.main);
  return key.sub ? q.eq('sub_category', key.sub) : q.is('sub_category', null);
}

/** 카테고리 추가 — 같은 (대분류, 소분류) 쌍이 이미 있으면 거부. */
export async function createCategory(f: CategoryFields) {
  await requireReviewer();
  const main = f.main_category.trim();
  const sub = f.sub_category.trim();
  if (!main) throw new Error('대분류는 비울 수 없어요');

  const sb = createAdminClient();
  let dupQ = sb.from('category').select('id').eq('main_category', main);
  dupQ = sub ? dupQ.eq('sub_category', sub) : dupQ.is('sub_category', null);
  const { data: dup } = await dupQ.maybeSingle();
  if (dup) throw new Error('이미 있는 분류예요');

  const { error } = await sb.from('category').insert({
    main_category: main,
    sub_category: sub || null,
    description: f.description.trim() || null,
    owner: f.owner.trim() || null,
    channels: f.channels.trim() || null,
    monitor_days: parseDays(f.monitor_days),
  });
  if (error) throw new Error('추가에 실패했어요 — ' + error.message);
  updateTag('archive');
  revalidatePath('/admin-mb26/panel/categories');
}

/**
 * 카테고리 수정. 이름((대분류, 소분류))이 바뀌면 그 분류를 쓰던 archive_item도 함께 바꿔
 * 분류 문자열 정합성을 유지한다(cascade). 설명·담당·채널·모니터링 주기만 바뀌면 자료는 안 건드림.
 */
export async function updateCategory(id: number, old: CatKey, f: CategoryFields) {
  await requireReviewer();
  const newMain = f.main_category.trim();
  const newSub = f.sub_category.trim();
  if (!newMain) throw new Error('대분류는 비울 수 없어요');

  const sb = createAdminClient();
  const renamed = newMain !== old.main || (newSub || null) !== old.sub;

  if (renamed) {
    // ponytail: category + archive_item 순차 update (원자성 없음). 이름 변경은 드문 관리 작업이고
    // 실패 시 그대로 재실행하면 복구되므로 트랜잭션 RPC까지는 안 감. 원자성 필요해지면 RPC로 승격.
    const upd = matchItems(
      sb.from('archive_item').update({ main_category: newMain, sub_category: newSub || null }),
      old
    );
    const { error: e1 } = await upd;
    if (e1) throw new Error('자료 재분류에 실패했어요 — ' + e1.message);
  }

  const { error: e2 } = await sb.from('category').update({
    main_category: newMain,
    sub_category: newSub || null,
    description: f.description.trim() || null,
    owner: f.owner.trim() || null,
    channels: f.channels.trim() || null,
    monitor_days: parseDays(f.monitor_days),
  }).eq('id', id);
  if (e2) throw new Error('수정에 실패했어요 — ' + e2.message);

  updateTag('archive');
  revalidatePath('/admin-mb26/panel/categories');
}

/**
 * 카테고리 삭제. 자료가 붙어 있으면 기본 차단하고, moveToFallback=true면 그 자료를
 * 미분류로 옮긴 뒤 삭제한다. 미분류 대분류 자체는 삭제 불가(폴백 자리라서).
 */
export async function deleteCategory(id: number, key: CatKey, moveToFallback: boolean) {
  await requireReviewer();
  if (key.main === FALLBACK_MAIN && !key.sub) throw new Error('미분류는 삭제할 수 없어요');

  const sb = createAdminClient();
  const { count } = await matchItems(
    sb.from('archive_item').select('id', { count: 'exact', head: true }),
    key
  );

  if (count && count > 0) {
    if (!moveToFallback) throw new Error(`이 분류를 쓰는 자료 ${count}건이 있어요. 미분류로 옮긴 뒤 삭제하세요.`);
    const move = matchItems(
      sb.from('archive_item').update({ main_category: FALLBACK_MAIN, sub_category: null }),
      key
    );
    const { error: me } = await move;
    if (me) throw new Error('미분류 이동에 실패했어요 — ' + me.message);
  }

  const { error } = await sb.from('category').delete().eq('id', id);
  if (error) throw new Error('삭제에 실패했어요 — ' + error.message);
  updateTag('archive');
  revalidatePath('/admin-mb26/panel/categories');
}
