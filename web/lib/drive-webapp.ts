// 승인된 자료의 업로드 파일을 맥비님 드라이브로 옮기는 모듈.
//
// 경로: Supabase Storage(검수 대기 중 임시 보관) → 맥비님 계정 Apps Script 웹앱 → 맥비님 드라이브
//       → archive_item.file_url 을 드라이브 링크로 교체 → Supabase 임시 파일 삭제
//
// 실행 주체는 웹앱을 배포한 맥비님 계정이라 파일은 맥비님 소유·용량으로 저장된다.
// 이중 저장은 하지 않는다 (사용자 결정, 2026-08-30). 실패하면 Supabase 링크를 그대로 두고 운영진에게 알린다.
//
// DRIVE_WEBAPP_URL / DRIVE_WEBAPP_SECRET 미설정이면 아무것도 하지 않는다 (로컬·연결 전).
// 절대 throw하지 않는다 — 승인 자체를 막으면 안 된다.

import { createAdminClient } from '@/lib/supabase/server';
import { notifyDriveTransferFailed } from '@/lib/notify';

export const ARCHIVE_BUCKET = 'archive-files';
const MAX_BYTES = 30 * 1024 * 1024;

export type DriveUploadResult = {
  ok: true;
  id: string;
  name: string;
  size: number;
  viewUrl: string;
  downloadUrl: string;
} | { ok: false; error: string };

export function driveEnabled(): boolean {
  return !!(process.env.DRIVE_WEBAPP_URL && process.env.DRIVE_WEBAPP_SECRET);
}

/** 우리 Supabase 버킷의 공개 URL이면 스토리지 경로를 돌려준다. 아니면 null. */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const prefix = `${base.replace(/\/$/, '')}/storage/v1/object/public/${ARCHIVE_BUCKET}/`;
  if (!url.startsWith(prefix)) return null;
  const rest = url.slice(prefix.length).split('?')[0];
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}

/** 드라이브 파일명 — "정리된 제목.확장자". 경로 문자·제어문자만 제거. */
export function driveFileName(title: string, storagePath: string): string {
  const ext = (storagePath.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  const base = (title || '자료')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || '자료';
  return ext ? `${base}.${ext}` : base;
}

/** 웹앱 호출 — 바이트를 base64로 실어 보낸다 (30MB → 약 40MB, Apps Script POST 한도 50MB). */
export async function uploadToDrive(args: { name: string; mimeType: string; bytes: Uint8Array }): Promise<DriveUploadResult> {
  const url = process.env.DRIVE_WEBAPP_URL;
  const secret = process.env.DRIVE_WEBAPP_SECRET;
  if (!url || !secret) return { ok: false, error: 'drive webapp not configured' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        secret,
        action: 'upload',
        name: args.name,
        mimeType: args.mimeType,
        base64: Buffer.from(args.bytes).toString('base64'),
      }),
      redirect: 'follow', // Apps Script는 302 → googleusercontent.com으로 응답
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const body = (await res.json().catch(() => null)) as DriveUploadResult | null;
    if (!body) return { ok: false, error: 'invalid response' };
    return body;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 연결 확인 — 운영 점검용. */
export async function pingDrive(): Promise<{ ok: boolean; folder?: string; error?: string }> {
  const url = process.env.DRIVE_WEBAPP_URL;
  const secret = process.env.DRIVE_WEBAPP_SECRET;
  if (!url || !secret) return { ok: false, error: 'not configured' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret, action: 'ping' }),
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
    return (await res.json()) as { ok: boolean; folder?: string; error?: string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * archive_item 한 건의 파일을 드라이브로 옮긴다. 승인 액션의 after()에서 호출.
 * 반환값은 로그·스크립트용. 어떤 경우에도 throw하지 않는다.
 */
export async function transferArchiveFileToDrive(archiveId: number): Promise<{ ok: boolean; skipped?: string; error?: string; url?: string }> {
  if (!driveEnabled()) return { ok: false, skipped: 'not configured' };
  const sb = createAdminClient();
  const { data: item, error: selErr } = await sb.from('archive_item').select('id, title, file_url').eq('id', archiveId).single();
  if (selErr || !item) return { ok: false, error: selErr?.message ?? 'item not found' };

  const path = storagePathFromUrl(item.file_url);
  if (!path) return { ok: false, skipped: 'not a supabase file' };

  const fail = async (reason: string) => {
    console.error(`drive transfer failed (#${archiveId}): ${reason}`);
    await notifyDriveTransferFailed({ id: archiveId, title: item.title, reason });
    return { ok: false as const, error: reason };
  };

  try {
    const { data: blob, error: dlErr } = await sb.storage.from(ARCHIVE_BUCKET).download(path);
    if (dlErr || !blob) return fail('임시 파일을 읽지 못함 — ' + (dlErr?.message ?? 'no data'));
    if (blob.size === 0 || blob.size > MAX_BYTES) return fail(`파일 크기 이상 (${blob.size} bytes)`);

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const name = driveFileName(item.title, path);
    const mimeType = blob.type || 'application/octet-stream';
    const up = await uploadToDrive({ name, mimeType, bytes });
    if (!up.ok) return fail('드라이브 웹앱 응답 — ' + up.error);

    const { error: upErr } = await sb.from('archive_item').update({ file_url: up.downloadUrl }).eq('id', archiveId);
    if (upErr) return fail('링크 교체 실패 — ' + upErr.message + ' (드라이브 파일 id ' + up.id + ')');

    // 링크가 바뀐 뒤에만 임시 파일 삭제. 삭제 실패는 치명적이지 않으니 로그만.
    const { error: rmErr } = await sb.storage.from(ARCHIVE_BUCKET).remove([path]);
    if (rmErr) console.error(`drive transfer: temp delete failed (#${archiveId}, ${path}): ${rmErr.message}`);

    return { ok: true, url: up.downloadUrl };
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}
