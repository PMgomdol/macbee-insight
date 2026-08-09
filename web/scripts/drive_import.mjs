/**
 * Drive 폴더 → 자료실(archive_item) 동기화. 재실행 가능 — 중복(Drive 링크)은 skip.
 *
 * 사용:
 *   cd web && npx tsx scripts/drive_import.mjs [folderId] [--dry]
 *   --dry : 삽입 없이 분류 결과만 출력 (안전 미리보기)
 *
 * 준비: Drive API 활성 + 폴더를 서비스계정(sheets_sa.json)에 공유,
 *       web/.env.local 에 SUPABASE·GEMINI 키.
 */
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { classify } from '../lib/ai-classify.ts';
import { normalizeUrl } from '../lib/url-meta.ts';

// ---- 설정 ----
const SA_PATH = '/Users/duotne/.macbe/sheets_sa.json';
const DEFAULT_FOLDER = '1uyPowagjQeF462FSfOM16WU60NgSnRUG';
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const FOLDER = args.find((a) => !a.startsWith('--')) || DEFAULT_FOLDER;

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SA = JSON.parse(readFileSync(SA_PATH, 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

// ---- Drive 인증(서비스계정 JWT → access token) ----
async function driveToken() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url({ alg: 'RS256', typ: 'JWT' });
  const body = b64url({
    iss: SA.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });
  const sig = crypto.createSign('RSA-SHA256').update(`${head}.${body}`).sign(SA.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${body}.${sig}` }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Drive 토큰 실패: ' + JSON.stringify(j));
  return j.access_token;
}

async function driveList(tok, folderId) {
  const files = [];
  let pageToken;
  do {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const u = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,mimeType,size,webViewLink)&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const j = await (await fetch(u, { headers: { Authorization: `Bearer ${tok}` } })).json();
    files.push(...(j.files || []));
    pageToken = j.nextPageToken;
  } while (pageToken);
  return files;
}

async function gatherFiles(tok, folderId, depth = 0) {
  const out = [];
  for (const it of await driveList(tok, folderId)) {
    if (it.mimeType === 'application/vnd.google-apps.folder') {
      if (depth < 3) out.push(...await gatherFiles(tok, it.id, depth + 1));
    } else out.push(it);
  }
  return out;
}

async function driveExport(tok, id, mime) {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=${encodeURIComponent(mime)}`, { headers: { Authorization: `Bearer ${tok}` } });
  return r.ok ? r.text() : '';
}
async function driveDownload(tok, id) {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${tok}` } });
  return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
}

// 파일 → { body(분류 근거 텍스트), fileRes(다운로드 자료면 true) }
async function fileToContent(tok, f) {
  const mt = f.mimeType;
  if (mt === 'application/vnd.google-apps.document') return { body: await driveExport(tok, f.id, 'text/plain'), fileRes: false };
  if (mt === 'application/vnd.google-apps.spreadsheet') return { body: await driveExport(tok, f.id, 'text/csv'), fileRes: false };
  if (mt === 'application/vnd.google-apps.presentation') return { body: await driveExport(tok, f.id, 'text/plain'), fileRes: false };
  if (/zip/i.test(mt) || /\.zip$/i.test(f.name)) {
    const buf = await driveDownload(tok, f.id);
    if (!buf) return { body: '', fileRes: true };
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir).map((n) => n.split('/').pop());
    return { body: `압축(zip) 자료 묶음. 포함 파일:\n${names.join('\n')}`, fileRes: true };
  }
  // 기타 바이너리(pdf/office 등) — 파일명 기반 (필요 시 확장)
  return { body: '', fileRes: true };
}

// ---- Supabase ----
async function existingUrlSet() {
  const r = await fetch(`${SB_URL}/rest/v1/archive_item?select=external_url,file_url&limit=6000`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  const set = new Set();
  for (const row of await r.json()) {
    if (row.external_url) set.add(normalizeUrl(row.external_url));
    if (row.file_url) set.add(normalizeUrl(row.file_url));
  }
  return set;
}
async function insertItem(item) {
  const r = await fetch(`${SB_URL}/rest/v1/archive_item`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(item),
  });
  if (!r.ok) throw new Error(`insert 실패 ${r.status}: ${await r.text()}`);
}

// ---- 메인 ----
const tok = await driveToken();
const files = await gatherFiles(tok, FOLDER);
console.log(`폴더 파일 ${files.length}개${DRY ? ' (DRY RUN)' : ''}\n`);
const seen = await existingUrlSet();

let added = 0, skipped = 0, failed = 0;
for (const f of files) {
  const link = f.webViewLink;
  const key = normalizeUrl(link);
  if (seen.has(key)) { console.log(`skip(중복): ${f.name}`); skipped++; continue; }

  try {
    const { body, fileRes } = await fileToContent(tok, f);
    const title = f.name.replace(/\.[^.]+$/, '');
    const cls = await classify(link, { title, description: '', body: (body || '').slice(0, 6000) });
    // 분류 실패(429·오류 → 요약 빈값)면 공개하지 않고 보류 — 재실행 때 채움
    if (!cls.aiUsed) { console.log(`보류(분류 실패, 재실행): ${title}`); failed++; await sleep(3500); continue; }
    const format = cls.format || (fileRes ? '템플릿' : '아티클');
    const item = {
      main_category: cls.mainCategory || '미분류',
      sub_category: cls.subCategory || null,
      tags: cls.tags?.length ? cls.tags : null,
      title: cls.title || title,
      summary: cls.summary || null,
      external_url: fileRes ? null : link,
      file_url: fileRes ? link : null,
      format,
      status: 'public',
      exposure_grade: 'free',
      proposer: '맥비',
      notes: 'Drive 동기화 — 자료실에 공유하는 자료',
      kind: format === '템플릿' ? 'files' : 'insights',
      registered_at: new Date().toISOString(),
    };
    console.log(`${DRY ? '[dry] ' : ''}add: ${title}\n     → ${cls.mainCategory}/${cls.subCategory} · ${format} · ai=${cls.aiUsed}\n     요약: ${cls.summary}`);
    if (!DRY) { await insertItem(item); seen.add(key); }
    added++;
    await sleep(3500); // Gemini free tier 20 RPM 아래로 유지
  } catch (e) {
    console.log(`FAIL: ${f.name} — ${String(e).slice(0, 160)}`);
    failed++;
  }
}
console.log(`\n완료: 추가 ${added}, 중복skip ${skipped}, 실패 ${failed}${DRY ? ' (실제 삽입 안 함)' : ''}`);
