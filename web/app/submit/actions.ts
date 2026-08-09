'use server';

import { after } from 'next/server';
import { createClient, createAdminClient, createPublicClient } from '@/lib/supabase/server';
import { fetchUrlMeta, isFileUrl, isYouTubeUrl, normalizeUrl } from '@/lib/url-meta';
import { classify, type InlineData } from '@/lib/ai-classify';
import { notifyProposalSubmitted } from '@/lib/notify';
import { randomUUID } from 'crypto';

export type SubmitResult = { ok: true; id: string | null } | { ok: false; error: string };

export type DuplicateMatch = {
  source: 'archive' | 'staging';
  id: string | number;
  title: string;
  status: string | null;
  kind?: string | null;
};

/**
 * 동일 URL이 archive_item(공개) 또는 staging_proposal(대기/거절 포함) 안에 있는지 검사.
 * normalizeUrl로 트래킹 파라미터·트래일링 슬래시·도메인 prefix 제거 후 비교.
 * 외부 URL 또는 파일 URL 둘 다 검사.
 */
async function findDuplicate(externalUrl: string, fileUrl: string): Promise<DuplicateMatch | null> {
  const sb = createAdminClient();
  const targetExt = externalUrl ? normalizeUrl(externalUrl) : '';
  const targetFile = fileUrl ? normalizeUrl(fileUrl) : '';
  if (!targetExt && !targetFile) return null;

  // 1) archive_item — public 게시본
  const arch = await sb
    .from('archive_item')
    .select('id, title, status, kind, external_url, file_url')
    .or(
      [
        targetExt ? `external_url.ilike.${escapeIlike(externalUrl)}` : '',
        targetFile ? `file_url.ilike.${escapeIlike(fileUrl)}` : '',
      ].filter(Boolean).join(',')
    )
    .limit(20);
  for (const r of arch.data ?? []) {
    const ext = (r as any).external_url as string | null;
    const fp = (r as any).file_url as string | null;
    if (targetExt && ext && normalizeUrl(ext) === targetExt) {
      return { source: 'archive', id: r.id, title: r.title, status: r.status, kind: (r as any).kind ?? null };
    }
    if (targetFile && fp && normalizeUrl(fp) === targetFile) {
      return { source: 'archive', id: r.id, title: r.title, status: r.status, kind: (r as any).kind ?? null };
    }
  }

  // 2) staging_proposal — pending / approved / rejected 모두 포함
  const st = await sb
    .from('staging_proposal')
    .select('id, title, status, external_url, file_url')
    .in('status', ['pending', 'approved', 'rejected'])
    .or(
      [
        targetExt ? `external_url.ilike.${escapeIlike(externalUrl)}` : '',
        targetFile ? `file_url.ilike.${escapeIlike(fileUrl)}` : '',
      ].filter(Boolean).join(',')
    )
    .limit(20);
  for (const r of st.data ?? []) {
    const ext = (r as any).external_url as string | null;
    const fp = (r as any).file_url as string | null;
    if (targetExt && ext && normalizeUrl(ext) === targetExt) {
      return { source: 'staging', id: r.id, title: r.title, status: r.status };
    }
    if (targetFile && fp && normalizeUrl(fp) === targetFile) {
      return { source: 'staging', id: r.id, title: r.title, status: r.status };
    }
  }

  return null;
}

function escapeIlike(s: string): string {
  // PostgREST .or() ilike 값에 % _ , ( ) 들어가면 깨짐 — 보수적으로 제거 + 와일드카드 감싸기
  const safe = s.replace(/[%_,()]/g, '');
  return `%${safe}%`;
}

/** 외부에서 사용 — 자료 등록 폼이 분석 직후 호출하여 미리 중복 알림 */
export async function checkDuplicate(externalUrl: string, fileUrl: string): Promise<DuplicateMatch | null> {
  return findDuplicate(externalUrl.trim(), fileUrl.trim());
}

const BUCKET = 'archive-files';

export type AnalyzeResult = {
  ok: boolean;
  error?: string;
  title?: string;
  summary?: string;
  mainCategory?: string;
  subCategory?: string;
  tags?: string[];
  format?: string;
  isFile?: boolean;
  publishedAt?: string | null;
  finalUrl?: string;
  aiUsed?: boolean;
  duplicate?: DuplicateMatch | null;
};

/**
 * 이미지·PDF는 Gemini에 직접 바이트 전송해 시각 분석 가능 (inline_data).
 * Gemini 2.5 Flash inline 한도: 20MB. 더 크면 null (텍스트 추출 폴백 또는 파일명만 사용)
 */
const VISION_MAX_BYTES = 18 * 1024 * 1024; // 20MB 한도, 여유분
const VISION_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

async function fetchInlineForVision(fileUrl: string, ext: string): Promise<InlineData | null> {
  const mime = VISION_MIME[ext];
  if (!mime) return null;
  try {
    const resp = await fetch(fileUrl, { signal: AbortSignal.timeout(20000) });
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > VISION_MAX_BYTES) return null;
    return { mime, base64: buf.toString('base64') };
  } catch (e) {
    console.error('fetchInlineForVision error:', e);
    return null;
  }
}

/** XML 엔티티 최소 디코드 */
function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
}

/** OOXML(zip) 안에서 조건 맞는 XML 파일들의 내용을 자연수 순(slide2 < slide10)으로 반환 */
async function unzipXmls(buf: Buffer, match: (name: string) => boolean): Promise<string[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buf);
  const num = (s: string) => Number(s.match(/(\d+)\.xml$/)?.[1] ?? 0);
  const names = Object.keys(zip.files).filter(match).sort((a, b) => num(a) - num(b) || a.localeCompare(b));
  return Promise.all(names.map((n) => zip.files[n].async('string')));
}

/** PPTX: 슬라이드별 <a:t> 텍스트 런 추출 */
async function extractPptxText(buf: Buffer): Promise<string> {
  const xmls = await unzipXmls(buf, (n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  const text = xmls
    .map((x) => (x.match(/<a:t>([\s\S]*?)<\/a:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join(' '))
    .join('\n');
  return decodeXml(text).replace(/\s+/g, ' ').trim().slice(0, 4000);
}

/** XLSX: sharedStrings + 시트 inlineStr <t> 텍스트 추출 (라벨·헤더 위주) */
async function extractXlsxText(buf: Buffer): Promise<string> {
  const xmls = await unzipXmls(buf, (n) => n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  const text = xmls
    .map((x) => (x.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join(' '))
    .join(' ');
  return decodeXml(text).replace(/\s+/g, ' ').trim().slice(0, 4000);
}

/** HWP(구 바이너리 CFB): 압축 없는 PrvText 스트림(UTF-16LE 미리보기) 추출 */
async function extractHwpText(buf: Buffer): Promise<string> {
  const CFB = (await import('cfb')).default;
  const cfb = CFB.read(new Uint8Array(buf), { type: 'buffer' });
  const prv = CFB.find(cfb, 'PrvText');
  if (!prv || !prv.content) return '';
  return Buffer.from(prv.content as Uint8Array)
    .toString('utf16le')
    .replace(/[<>]/g, ' ') // 필드·셀 구분자 노이즈 제거
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

/** HWPX(OWPML zip): Contents/section*.xml의 <hp:t> 텍스트 런 추출 */
async function extractHwpxText(buf: Buffer): Promise<string> {
  const xmls = await unzipXmls(buf, (n) => /^Contents\/section\d+\.xml$/i.test(n));
  const text = xmls
    .map((x) => (x.match(/<hp:t[^>]*>([\s\S]*?)<\/hp:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join(' '))
    .join('\n');
  return decodeXml(text).replace(/\s+/g, ' ').trim().slice(0, 4000);
}

/**
 * 업로드된 파일의 실제 본문 텍스트 추출.
 * - PDF: pdf-parse, 첫 10페이지 (vision 한도 초과 시 폴백용)
 * - DOCX: mammoth / PPTX·XLSX·HWPX: jszip으로 OOXML/OWPML 텍스트 추출
 * - HWP(구 바이너리): cfb로 PrvText 미리보기 스트림 추출
 * - TXT/MD/CSV: 그대로 utf-8 디코드
 * - 그 외(구 바이너리 doc/xls/ppt): 빈 문자열 → 파일명 기반 분류
 */
async function extractFileText(fileUrl: string, ext: string): Promise<string> {
  const SUPPORTED = ['pdf', 'docx', 'pptx', 'xlsx', 'xlsm', 'hwp', 'hwpx', 'txt', 'md', 'csv'];
  if (!SUPPORTED.includes(ext)) return '';
  try {
    const resp = await fetch(fileUrl, { signal: AbortSignal.timeout(20000) });
    if (!resp.ok) return '';
    const buf = Buffer.from(await resp.arrayBuffer());

    if (ext === 'pdf') {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      try {
        const r = await parser.getText({ first: 10 });
        return (r.text || '').replace(/\s+/g, ' ').trim().slice(0, 4000);
      } finally {
        await parser.destroy().catch(() => {});
      }
    }

    if (ext === 'docx') {
      const mammoth = await import('mammoth');
      const r = await mammoth.extractRawText({ buffer: buf });
      return (r.value || '').replace(/\s+/g, ' ').trim().slice(0, 4000);
    }

    if (ext === 'pptx') return await extractPptxText(buf);
    if (ext === 'xlsx' || ext === 'xlsm') return await extractXlsxText(buf);
    if (ext === 'hwp') return await extractHwpText(buf);
    if (ext === 'hwpx') return await extractHwpxText(buf);

    // txt / md / csv
    return buf.toString('utf-8').replace(/\s+/g, ' ').trim().slice(0, 4000);
  } catch (e) {
    console.error('extractFileText error:', e);
    return '';
  }
}

/**
 * 업로드된 파일 자동 분석 — 우선순위:
 *   ① 이미지/PDF (≤18MB): Gemini 멀티모달로 바이트 직접 전송 → 시각 분석
 *   ② DOCX/TXT/MD/CSV 또는 vision 한도 초과 PDF: 본문 텍스트 추출 → classify
 *   ③ 그 외 (PPTX/XLSX/HWP 등): 파일명만 사용
 */
export async function analyzeFile(fileUrl: string, fileName: string): Promise<AnalyzeResult> {
  fileUrl = fileUrl.trim();
  fileName = fileName.trim();
  if (!fileUrl || !fileName) return { ok: false, error: '파일 정보가 부족해요' };

  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const base = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_\-]+/g, ' ')
    .trim();

  // 중복 검사 + (이미지/PDF면 vision용 inline data 준비) 병렬
  const isVisionEligible = ext in VISION_MIME;
  const [inline, duplicate] = await Promise.all([
    isVisionEligible ? fetchInlineForVision(fileUrl, ext) : Promise.resolve(null),
    findDuplicate('', fileUrl),
  ]);

  let cls;
  if (inline) {
    // 시각 분석 — Gemini가 파일을 직접 본다
    cls = await classify(fileUrl, { title: base, description: '' }, inline);
  } else {
    // 폴백: 본문 텍스트 추출 (PDF가 18MB 초과거나 DOCX/TXT 등)
    const bodyText = await extractFileText(fileUrl, ext);
    const description = bodyText
      ? bodyText
      : `업로드 파일 (${ext.toUpperCase() || '?'}) — 본문 추출 불가, 파일명만 기반 분류`;
    cls = await classify(fileUrl, { title: base, description });
  }

  // format은 확장자로 강제 보정 (AI가 파일명·본문 보고 잘못 추정하는 케이스 방지)
  // 이미지(png/jpg 등)는 AI가 보고 판단한 format(템플릿/가이드 등) 그대로 신뢰
  const fmtByExt: Record<string, string> = {
    pdf: '가이드',
    pptx: '템플릿', ppt: '템플릿',
    docx: '기획서', doc: '기획서',
    xlsx: '템플릿', xls: '템플릿',
    hwp: '기획서', hwpx: '기획서',
  };
  const format = fmtByExt[ext] ?? cls.format;

  return {
    ok: true,
    title: cls.title || base,
    summary: cls.summary,
    mainCategory: cls.mainCategory,
    subCategory: cls.subCategory,
    tags: cls.tags,
    format,
    isFile: true,
    publishedAt: null,
    aiUsed: cls.aiUsed,
    duplicate,
  };
}

/** URL 확장자 (쿼리·해시 제거) */
function urlExt(url: string): string {
  return (url.split(/[?#]/)[0].split('.').pop() || '').toLowerCase();
}

/** YouTube oEmbed — API 키 없이 영상 제목·채널명 확보 (데이터센터 IP·consent월에서도 동작) */
async function youtubeOembed(url: string): Promise<{ title: string; author: string } | null> {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return { title: String(j.title || ''), author: String(j.author_name || '') };
  } catch {
    return null;
  }
}

async function analyzeYouTube(url: string): Promise<AnalyzeResult> {
  // oEmbed로 확실한 제목 확보 + og 병행. Gemini가 영상을 직접 시청해 요약.
  const [oembed, meta] = await Promise.all([youtubeOembed(url), fetchUrlMeta(url)]);
  const baseTitle = oembed?.title || meta.title || '';
  const baseDesc = meta.description || (oembed?.author ? `${oembed.author} 채널의 영상` : '');
  // YouTube canonical = 사용자가 붙인 watch/youtu.be URL. meta.finalUrl은 consent월
  // 리다이렉트(consent.youtube.com 등)일 수 있어 쓰지 않는다.
  const [cls, duplicate] = await Promise.all([
    classify(url, { title: baseTitle, description: baseDesc }, null, url),
    findDuplicate(url, ''),
  ]);
  // Gemini 실패(429/timeout 등)해도 oEmbed 제목으로 최소 정보 보장 — 빈 제목/요약 방지
  return {
    ok: true,
    title: cls.title || baseTitle,
    summary: cls.summary || baseDesc || baseTitle,
    mainCategory: cls.mainCategory,
    subCategory: cls.subCategory,
    tags: cls.tags,
    format: '영상',
    isFile: false,
    publishedAt: meta.publishedAt,
    finalUrl: '',
    aiUsed: cls.aiUsed,
    duplicate,
  };
}

export async function analyzeUrl(url: string): Promise<AnalyzeResult> {
  url = url.trim();
  if (!url) return { ok: false, error: 'URL을 먼저 입력해주세요' };
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: 'URL은 http:// 또는 https://로 시작해요' };

  // YouTube → 영상 이해
  if (isYouTubeUrl(url)) return analyzeYouTube(url);

  // 문서·미디어 URL(.pdf/.png/.xlsx 등)은 파일 분석 경로 재사용 — HTML로 fetch하면 바이트가 깨짐
  const ext = urlExt(url);
  if (ext in MIME_FALLBACK) {
    const name = decodeURIComponent(url.split(/[?#]/)[0].split('/').pop() || `file.${ext}`);
    return analyzeFile(url, name);
  }

  // 일반 아티클 — og + 본문 발췌
  const meta = await fetchUrlMeta(url);
  if (!meta.ok) return { ok: false, error: `URL을 못 가져왔어요 — ${meta.error ?? '잠시 후 다시 시도'}` };
  const [cls, duplicate] = await Promise.all([
    classify(url, { title: meta.title, description: meta.description, body: meta.bodyText }),
    findDuplicate(meta.finalUrl, ''),
  ]);
  return {
    ok: true,
    title: cls.title,
    summary: cls.summary,
    mainCategory: cls.mainCategory,
    subCategory: cls.subCategory,
    tags: cls.tags,
    format: cls.format,
    isFile: isFileUrl(meta.finalUrl),
    publishedAt: meta.publishedAt,
    finalUrl: meta.finalUrl,
    aiUsed: cls.aiUsed,
    duplicate,
  };
}

/**
 * 멤버 제안 등록 — anon publishable 키 우선, 실패시 service_role 폴백.
 * 정상 RLS 정책(staging_anyone_insert)이 적용되면 1·2차에서 성공해야 함.
 */
export type SubmitDuplicateResult = { ok: false; duplicate: DuplicateMatch };

export async function submitProposal(formData: FormData): Promise<SubmitResult | SubmitDuplicateResult> {
  const url = String(formData.get('url') ?? '').trim();
  const fileUrl = String(formData.get('file_url') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const summary = String(formData.get('summary') ?? '').trim();
  const main = String(formData.get('main_category') ?? '').trim();
  const sub = String(formData.get('sub_category') ?? '').trim();
  const tags = String(formData.get('tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean);
  const format = String(formData.get('format') ?? '').trim();
  const publishedAt = String(formData.get('published_at') ?? '').trim();
  const proposer = String(formData.get('proposer') ?? '').trim();
  const proposer_email = String(formData.get('proposer_email') ?? '').trim();
  const force = String(formData.get('force') ?? '') === '1';

  if (!title) return { ok: false, error: '제목을 입력해주세요' };
  if (!url && !fileUrl) return { ok: false, error: 'URL이나 파일 중 하나는 있어야 해요' };

  // 최종 안전 검사 — 분석 단계 이후 다른 자료가 등록되었을 수 있어 한 번 더 확인.
  // force=1 이면 운영진이 의도적으로 중복 허용한 케이스
  if (!force) {
    const dup = await findDuplicate(url, fileUrl);
    if (dup) return { ok: false, duplicate: dup } as SubmitDuplicateResult;
  }

  const row = {
    external_url: url || null,
    file_url: fileUrl || null,
    title,
    summary: summary || null,
    main_category: main || null,
    sub_category: sub || null,
    tags: tags.length ? tags : null,
    format: format || null,
    published_at: publishedAt && /^\d{4}-\d{2}-\d{2}$/.test(publishedAt) ? publishedAt : null,
    proposer: proposer || null,
    proposer_email: proposer_email || null,
    status: 'pending',
  };

  let insertedId: string | null = null;
  let lastErr: string | null = null;

  // 1차 — 쿠키 anon (로그인 상태면 auth.uid() 사용 가능)
  try {
    const sbCookie = await createClient();
    const r = await sbCookie.from('staging_proposal').insert(row).select('id').single();
    if (!r.error) insertedId = r.data?.id ?? null;
    else lastErr = r.error.message;
  } catch (e: any) { lastErr = e?.message ?? 'cookie-client error'; }

  // 2차 — public anon (쿠키 없는 컨텍스트)
  if (!insertedId) {
    try {
      const sbPublic = createPublicClient();
      const r = await sbPublic.from('staging_proposal').insert(row).select('id').single();
      if (!r.error) insertedId = r.data?.id ?? null;
      else lastErr = r.error.message;
    } catch (e: any) { lastErr = e?.message ?? 'public-client error'; }
  }

  // 3차 — service_role (RLS 우회 폴백)
  if (!insertedId) {
    try {
      const sbAdmin = createAdminClient();
      const r = await sbAdmin.from('staging_proposal').insert(row).select('id').single();
      if (r.error) return { ok: false, error: '등록하지 못했어요 — ' + r.error.message };
      insertedId = r.data?.id ?? null;
    } catch (e: any) {
      return { ok: false, error: '등록하지 못했어요 — ' + (e?.message ?? lastErr ?? '잠시 후 다시 시도해주세요') };
    }
  }

  // 운영진 노티 — 응답 반환 뒤 백그라운드 발송 (등록 지연 없음)
  after(() =>
    notifyProposalSubmitted({
      id: insertedId,
      title,
      proposer: proposer || null,
      proposerEmail: proposer_email || null,
      url: url || fileUrl || null,
      summary: summary || null,
    })
  );

  return { ok: true, id: insertedId };
}

const MIME_FALLBACK: Record<string, string> = {
  pdf: 'application/pdf',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  hwp: 'application/x-hwp',
  hwpx: 'application/hwp+zip',
  zip: 'application/zip',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  txt: 'text/plain',
};

export async function uploadFile(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get('file');
    if (!(file instanceof File)) return { ok: false, error: '파일이 첨부되지 않음' };
    if (file.size === 0) return { ok: false, error: '비어있는 파일이에요' };
    if (file.size > 50 * 1024 * 1024) {
      return { ok: false, error: `파일이 ${(file.size / 1024 / 1024).toFixed(1)}MB예요. 50MB까지 올릴 수 있어요.` };
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const safeName = file.name.replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ\.\-]/g, '_').slice(0, 80);
    const path = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
    const contentType = file.type || MIME_FALLBACK[ext] || 'application/octet-stream';

    const sb = createAdminClient();
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await sb.storage.from(BUCKET).upload(path, buf, {
      contentType,
      upsert: false,
    });
    if (error) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('exceeded') || msg.toLowerCase().includes('size')) {
        return { ok: false, error: `용량을 초과했어요 — ${msg}` };
      }
      if (msg.toLowerCase().includes('mime') || msg.toLowerCase().includes('type')) {
        return { ok: false, error: `못 올리는 파일 형식이에요 (${ext})` };
      }
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('bucket')) {
        return { ok: false, error: `저장소에 문제가 있어요. 운영진에게 알려주세요.` };
      }
      return { ok: false, error: msg };
    }

    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch (e: any) {
    // Server Action body size 초과는 throw로 옴
    const msg = e?.message ?? String(e);
    if (msg.toLowerCase().includes('body') && msg.toLowerCase().includes('size')) {
      return { ok: false, error: `요청 크기가 너무 커요. 파일을 줄이거나 운영진에게 알려주세요.` };
    }
    return { ok: false, error: `서버에 문제가 생겼어요: ${msg.slice(0, 200)}` };
  }
}
