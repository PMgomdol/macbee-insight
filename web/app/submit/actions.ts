'use server';

import { createClient, createAdminClient, createPublicClient } from '@/lib/supabase/server';
import { fetchUrlMeta, isFileUrl } from '@/lib/url-meta';
import { classify } from '@/lib/ai-classify';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';

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
};

export async function analyzeUrl(url: string): Promise<AnalyzeResult> {
  url = url.trim();
  if (!url) return { ok: false, error: 'URL을 입력해주세요' };
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: 'http:// 또는 https://로 시작해야 합니다' };

  const meta = await fetchUrlMeta(url);
  if (!meta.ok) return { ok: false, error: `URL 분석 실패: ${meta.error ?? 'unknown'}` };

  const cls = await classify(url, { title: meta.title, description: meta.description });

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
  };
}

/**
 * 멤버 제안 등록 — anon publishable 키 우선, 실패시 service_role 폴백.
 * 정상 RLS 정책(staging_anyone_insert)이 적용되면 1·2차에서 성공해야 함.
 */
export async function submitProposal(formData: FormData) {
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

  if (!title) redirect('/submit?error=' + encodeURIComponent('제목 필수'));
  if (!url && !fileUrl) redirect('/submit?error=' + encodeURIComponent('URL 또는 파일 둘 중 하나 필수'));

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
      if (r.error) redirect('/submit?error=' + encodeURIComponent('등록 실패: ' + r.error.message));
      insertedId = r.data?.id ?? null;
    } catch (e: any) {
      redirect('/submit?error=' + encodeURIComponent('등록 실패: ' + (e?.message ?? lastErr ?? 'unknown')));
    }
  }

  redirect('/submit?ok=1' + (insertedId ? `&id=${insertedId}` : ''));
}

export async function uploadFile(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: '파일이 없습니다' };
  if (file.size === 0) return { ok: false, error: '빈 파일' };
  if (file.size > 50 * 1024 * 1024) return { ok: false, error: '50MB 초과' };

  const safeName = file.name.replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ\.\-]/g, '_').slice(0, 80);
  const path = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;

  const sb = createAdminClient();
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
