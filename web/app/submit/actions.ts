'use server';

import { createClient, createAdminClient, createPublicClient } from '@/lib/supabase/server';
import { fetchUrlMeta, isFileUrl, normalizeUrl } from '@/lib/url-meta';
import { classify } from '@/lib/ai-classify';
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

export async function analyzeUrl(url: string): Promise<AnalyzeResult> {
  url = url.trim();
  if (!url) return { ok: false, error: 'URL을 입력해주세요' };
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: 'http:// 또는 https://로 시작해야 합니다' };

  const meta = await fetchUrlMeta(url);
  if (!meta.ok) return { ok: false, error: `URL 분석 실패: ${meta.error ?? 'unknown'}` };

  // 메타 추출·분류·중복 검사 병렬 — finalUrl로 검사 (리다이렉트 풀린 후 키)
  const [cls, duplicate] = await Promise.all([
    classify(url, { title: meta.title, description: meta.description }),
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

  if (!title) return { ok: false, error: '제목 필수' };
  if (!url && !fileUrl) return { ok: false, error: 'URL 또는 파일 둘 중 하나 필수' };

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
      if (r.error) return { ok: false, error: '등록 실패: ' + r.error.message };
      insertedId = r.data?.id ?? null;
    } catch (e: any) {
      return { ok: false, error: '등록 실패: ' + (e?.message ?? lastErr ?? 'unknown') };
    }
  }

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
    if (file.size === 0) return { ok: false, error: '빈 파일' };
    if (file.size > 50 * 1024 * 1024) {
      return { ok: false, error: `크기 ${(file.size / 1024 / 1024).toFixed(1)}MB — 50MB 한도 초과` };
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
        return { ok: false, error: `Storage 용량 초과 — ${msg}` };
      }
      if (msg.toLowerCase().includes('mime') || msg.toLowerCase().includes('type')) {
        return { ok: false, error: `허용되지 않은 파일 형식 (${ext}) — ${msg}` };
      }
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('bucket')) {
        return { ok: false, error: `Storage 버킷 오류 — ${msg}. 운영자 문의.` };
      }
      return { ok: false, error: msg };
    }

    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch (e: any) {
    // Server Action body size 초과는 throw로 옴
    const msg = e?.message ?? String(e);
    if (msg.toLowerCase().includes('body') && msg.toLowerCase().includes('size')) {
      return { ok: false, error: `요청 크기 초과 — Body size limit. 파일을 줄이거나 운영자 문의.` };
    }
    return { ok: false, error: `서버 오류: ${msg.slice(0, 200)}` };
  }
}
