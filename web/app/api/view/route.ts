import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * 일별 UV 측정 — 카드 클릭 시 호출.
 * - 쿠키 `vw_seen` 에 {date, ids[]} 저장. 같은 날 같은 ID는 카운트 안 함
 * - 새 ID면 archive_item.views += 1 (service_role atomic)
 * - 쿠키 24h 만료. 익일 새 카운트
 */

const COOKIE = 'vw_seen';
const TTL_SEC = 24 * 60 * 60;
const MAX_IDS = 1000;

type Seen = { date: string; ids: number[] };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseCookie(raw: string | undefined): Seen {
  if (!raw) return { date: today(), ids: [] };
  try {
    const v = JSON.parse(raw) as Seen;
    if (v.date !== today()) return { date: today(), ids: [] };
    return { date: v.date, ids: Array.isArray(v.ids) ? v.ids : [] };
  } catch {
    return { date: today(), ids: [] };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = Number(body?.id);
    if (!id || !Number.isFinite(id)) {
      return NextResponse.json({ ok: false, error: 'invalid id' }, { status: 400 });
    }

    const store = await cookies();
    const seen = parseCookie(store.get(COOKIE)?.value);

    if (seen.ids.includes(id)) {
      return NextResponse.json({ ok: true, counted: false, reason: 'already viewed today' });
    }

    const sb = createAdminClient();
    // atomic increment via RPC (race condition 해결)
    const { data: next, error: rpcErr } = await sb.rpc('increment_archive_views', { p_id: id });
    if (rpcErr) {
      return NextResponse.json({ ok: false, error: rpcErr.message }, { status: 500 });
    }
    // 월간/주간 Top 집계용 시점 로그
    await sb.from('view_event').insert({ item_id: id });

    // 쿠키 갱신 — 최대 MAX_IDS만 유지 (앞에서 잘림)
    const ids = [...seen.ids, id].slice(-MAX_IDS);
    store.set(COOKIE, JSON.stringify({ date: seen.date, ids }), {
      maxAge: TTL_SEC,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json({ ok: true, counted: true, views: next ?? null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'unknown' }, { status: 500 });
  }
}
