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

/**
 * 업로드된 파일의 실제 본문 텍스트 추출.
 * - PDF: pdf-parse, 첫 10페이지 (vision 한도 초과 시 폴백용)
 * - DOCX: mammoth
 * - TXT/MD/CSV: 그대로 utf-8 디코드
 * - 그 외: 빈 문자열
 */
async function extractFileText(fileUrl: string, ext: string): Promise<string> {
  const SUPPORTED = ['pdf', 'docx', 'txt', 'md', 'csv'];
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

export async function analyzeUrl(url: string): Promise<AnalyzeResult> {
  url = url.trim();
  if (!url) return { ok: false, error: 'URL을 먼저 입력해주세요' };
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: 'URL은 http:// 또는 https://로 시작해요' };

  const isYt = isYouTubeUrl(url);
  const meta = await fetchUrlMeta(url);
  // YouTube은 fetch가 봇차단·consent월에 막혀도 Gemini 영상분석으로 진행. 일반 URL만 실패 처리.
  if (!meta.ok && !isYt) return { ok: false, error: `URL을 못 가져왔어요 — ${meta.error ?? '잠시 후 다시 시도'}` };

  const finalUrl = meta.ok ? meta.finalUrl : url;

  // 분류·중복 검사 병렬. YouTube면 영상 자체를 Gemini에 전달, 아티클이면 본문 발췌 전달.
  const [cls, duplicate] = await Promise.all([
    isYt
      ? classify(url, { title: meta.title, description: meta.description }, null, url)
      : classify(url, { title: meta.title, description: meta.description, body: meta.bodyText }),
    findDuplicate(finalUrl, ''),
  ]);

  return {
    ok: true,
    title: cls.title,
    summary: cls.summary,
    mainCategory: cls.mainCategory,
    subCategory: cls.subCategory,
    tags: cls.tags,
    format: cls.format,
    isFile: isFileUrl(finalUrl),
    publishedAt: meta.publishedAt,
    finalUrl,
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
