#!/usr/bin/env node
// 기존 업로드 파일(Supabase Storage) → 맥비님 드라이브 일괄 이관.
// lib/drive-webapp.ts 와 같은 절차: 다운로드 → 웹앱 업로드 → file_url 교체 → 임시 파일 삭제.
//
//   node scripts/drive_migrate_existing.mjs            # 대상 목록만 출력 (dry-run)
//   node scripts/drive_migrate_existing.mjs --apply    # 실제 이관
//   node scripts/drive_migrate_existing.mjs --apply --limit 1
//
// env: web/.env.local 의 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DRIVE_WEBAPP_URL, DRIVE_WEBAPP_SECRET

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const { NEXT_PUBLIC_SUPABASE_URL: SB_URL, SUPABASE_SERVICE_ROLE_KEY: SB_KEY, DRIVE_WEBAPP_URL, DRIVE_WEBAPP_SECRET } = process.env;
if (!SB_URL || !SB_KEY) throw new Error('Supabase env 없음');
if (APPLY && (!DRIVE_WEBAPP_URL || !DRIVE_WEBAPP_SECRET)) throw new Error('DRIVE_WEBAPP_URL / DRIVE_WEBAPP_SECRET 없음');

const BUCKET = 'archive-files';
const PREFIX = `${SB_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/`;
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

function fileName(title, path) {
  const ext = (path.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  const base = (title || '자료').replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || '자료';
  return ext ? `${base}.${ext}` : base;
}

async function upload(name, mimeType, bytes) {
  const res = await fetch(DRIVE_WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ secret: DRIVE_WEBAPP_SECRET, action: 'upload', name, mimeType, base64: Buffer.from(bytes).toString('base64') }),
    redirect: 'follow',
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  return res.json();
}

const { data: items, error } = await sb.from('archive_item').select('id, title, file_url, status').like('file_url', `${PREFIX}%`).order('id');
if (error) throw error;
console.log(`대상 ${items.length}건 (Supabase 파일 링크)${APPLY ? '' : ' — dry-run, --apply 로 실행'}`);

let done = 0, failed = 0;
for (const it of items) {
  if (done >= LIMIT) break;
  const path = decodeURIComponent(it.file_url.slice(PREFIX.length).split('?')[0]);
  const name = fileName(it.title, path);
  if (!APPLY) { console.log(`  #${it.id} [${it.status}] ${name}  ←  ${path}`); continue; }

  try {
    const { data: blob, error: dlErr } = await sb.storage.from(BUCKET).download(path);
    if (dlErr || !blob) throw new Error('download: ' + (dlErr?.message ?? 'no data'));
    const up = await upload(name, blob.type || 'application/octet-stream', new Uint8Array(await blob.arrayBuffer()));
    if (!up.ok) throw new Error('webapp: ' + up.error);
    const { error: upErr } = await sb.from('archive_item').update({ file_url: up.downloadUrl }).eq('id', it.id);
    if (upErr) throw new Error('update: ' + upErr.message + ` (drive id ${up.id})`);
    const { error: rmErr } = await sb.storage.from(BUCKET).remove([path]);
    console.log(`  OK #${it.id} ${name} → ${up.downloadUrl}${rmErr ? '  (임시 삭제 실패: ' + rmErr.message + ')' : ''}`);
    done++;
  } catch (e) {
    failed++;
    console.log(`  FAIL #${it.id} ${name}: ${e.message}`);
  }
}
if (APPLY) console.log(`완료 ${done}건, 실패 ${failed}건`);
