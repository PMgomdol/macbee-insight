'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function submitProposal(formData: FormData) {
  const url = String(formData.get('url') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const summary = String(formData.get('summary') ?? '').trim();
  const main = String(formData.get('main_category') ?? '').trim();
  const sub = String(formData.get('sub_category') ?? '').trim();
  const tags = String(formData.get('tags') ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const format = String(formData.get('format') ?? '').trim();
  const proposer = String(formData.get('proposer') ?? '').trim();
  const proposer_email = String(formData.get('proposer_email') ?? '').trim();

  if (!title) {
    return redirect('/submit?error=' + encodeURIComponent('제목을 입력해주세요'));
  }
  if (!url) {
    return redirect('/submit?error=' + encodeURIComponent('URL을 입력해주세요'));
  }

  const sb = await createClient();
  const { error } = await sb.from('staging_proposal').insert({
    external_url: url,
    title,
    summary: summary || null,
    main_category: main || null,
    sub_category: sub || null,
    tags: tags.length ? tags : null,
    format: format || null,
    proposer: proposer || null,
    proposer_email: proposer_email || null,
    status: 'pending',
  });

  if (error) {
    return redirect('/submit?error=' + encodeURIComponent('등록 실패: ' + error.message));
  }
  redirect('/submit?ok=1');
}
