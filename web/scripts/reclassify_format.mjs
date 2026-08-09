/**
 * 기존 archive_item 중 툴/파일 소스인데 format='아티클'로 오분류된 것 재분류.
 * 제목+내용으로 Gemini 재분류해 format·kind만 갱신(제목·요약·태그는 유지).
 * 사용: cd web && npx tsx scripts/reclassify_format.mjs [--dry]
 */
import { readFileSync } from 'node:fs';
import { fetchUrlMeta } from '../lib/url-meta.ts';
import { classify } from '../lib/ai-classify.ts';

const DRY = process.argv.includes('--dry');
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}
if (process.env.GEMINI_IMPORT_KEY) { process.env.GEMINI_API_KEY = process.env.GEMINI_IMPORT_KEY; console.log('유료 키 사용'); }
const U = process.env.NEXT_PUBLIC_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TOOL = /docs\.google\.com|drive\.google\.com|miro\.com|figma\.com|canva\.com|notion\.(so|site)/;
const all = await (await fetch(`${U}/rest/v1/archive_item?format=eq.아티클&select=id,title,external_url,file_url&limit=3000`, { headers: H })).json();
const cand = all.filter((x) => TOOL.test(x.external_url || x.file_url || ''));
console.log(`후보 ${cand.length}건${DRY ? ' (DRY)' : ''}\n`);

let changed = 0, kept = 0, failed = 0, consec = 0;
for (const x of cand) {
  const u = x.external_url || x.file_url;
  try {
    const meta = await fetchUrlMeta(u).catch(() => ({ description: '', bodyText: '' }));
    const cls = await classify(u, { title: x.title, description: meta.description || '', body: meta.bodyText || '' });
    if (!cls.aiUsed) { console.log(`보류(분류실패): ${x.title.slice(0, 30)}`); failed++; if (++consec >= 3) { console.log('연속 실패 3 — 중단'); break; } await sleep(1500); continue; }
    consec = 0;
    if (cls.format && cls.format !== '아티클') {
      const kind = cls.format === '템플릿' ? 'files' : 'insights';
      console.log(`[${x.id}] 아티클→${cls.format} | ${x.title.slice(0, 34)}`);
      if (!DRY) {
        const r = await fetch(`${U}/rest/v1/archive_item?id=eq.${x.id}`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ format: cls.format, kind }) });
        if (!r.ok) throw new Error(`patch ${r.status}: ${await r.text()}`);
      }
      changed++;
    } else kept++;
    await sleep(1200);
  } catch (e) { console.log(`FAIL [${x.id}]: ${String(e).slice(0, 120)}`); failed++; }
}
console.log(`\n완료: 변경 ${changed}, 유지(아티클) ${kept}, 실패 ${failed}${DRY ? ' (실제 변경 안 함)' : ''}`);
