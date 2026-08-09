'use client';

import { useState, useTransition } from 'react';
import {
  Sparkles, Upload, CheckCircle2, AlertCircle, FileCheck2, X, AlertTriangle,
} from 'lucide-react';
import Button, { LinkButton } from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import {
  analyzeUrl, analyzeFile, submitProposal, uploadFile,
  type AnalyzeResult, type DuplicateMatch,
} from './actions';
import { track } from '@/lib/track';

type Props = { categories: { main_category: string; sub_category: string | null }[] };

export function SubmitForm({ categories }: Props) {
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [finalUrl, setFinalUrl] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [main, setMain] = useState('');
  const [sub, setSub] = useState('');
  const [tags, setTags] = useState('');
  const [format, setFormat] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [proposer, setProposer] = useState('');
  const [proposerEmail, setProposerEmail] = useState('');
  const [analyzing, startAnalyze] = useTransition();
  const [uploading, startUpload] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [analyzeMsg, setAnalyzeMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [manual, setManual] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateMatch | null>(null);
  const [forceSubmit, setForceSubmit] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 점진적 노출 — URL 분석 성공·파일 업로드 완료·직접 입력 선택 시점부터 상세 필드 노출.
  // 분석이 실패해도 (브런치·페이월·JS 렌더 사이트) 직접 입력으로 등록할 수 있어야 함
  const showDetails = analyzed || manual || !!fileUrl;

  function resetForm() {
    setUrl('');
    setFileUrl('');
    setFinalUrl('');
    setTitle('');
    setSummary('');
    setMain('');
    setSub('');
    setTags('');
    setFormat('');
    setPublishedAt('');
    setFileName(null);
    setAnalyzeMsg(null);
    setAnalyzed(false);
    setManual(false);
    setDuplicate(null);
    setForceSubmit(false);
    setSubmitDone(false);
    setSubmitError(null);
  }

  function startManual() {
    setManual(true);
    setAnalyzeMsg({ kind: 'ok', text: '아래에 직접 입력해주세요. 제목만 채우면 등록할 수 있어요.' });
    track('submit_manual_fallback', { mode });
  }

  const cats = Array.from(new Set(categories.map((c) => c.main_category)));
  const subs: Record<string, string[]> = {};
  categories.forEach((c) => {
    if (c.sub_category) {
      subs[c.main_category] = subs[c.main_category] ?? [];
      subs[c.main_category].push(c.sub_category);
    }
  });

  function applyAnalysis(r: AnalyzeResult) {
    if (!r.ok) {
      setAnalyzeMsg({ kind: 'error', text: r.error ?? '분석하지 못했어요' });
      return;
    }
    if (r.title) setTitle(r.title);
    if (r.summary) setSummary(r.summary);
    if (r.mainCategory) setMain(r.mainCategory);
    if (r.subCategory) setSub(r.subCategory);
    if (r.tags) setTags(r.tags.join(', '));
    if (r.format) setFormat(r.format);
    if (r.publishedAt) setPublishedAt(r.publishedAt);
    if (r.finalUrl && r.finalUrl !== url) setFinalUrl(r.finalUrl);
    else setFinalUrl('');
    setDuplicate(r.duplicate ?? null);
    setForceSubmit(false);
    setAnalyzed(true);
    setAnalyzeMsg({
      kind: 'ok',
      text: r.aiUsed
        ? 'AI가 자동으로 채워뒀어요. 내용을 확인하고 등록해주세요.'
        : '메타 정보로 채워뒀어요. 내용을 확인하고 등록해주세요.',
    });
    track('submit_analyzed', { mode, ai_used: !!r.aiUsed });
  }

  function onAnalyze() {
    if (!url.trim()) { setAnalyzeMsg({ kind: 'error', text: 'URL을 먼저 입력해주세요' }); return; }
    setAnalyzeMsg(null);
    setDuplicate(null);
    track('submit_start', { mode: 'url' });
    startAnalyze(async () => {
      const r = await analyzeUrl(url);
      applyAnalysis(r);
    });
  }

  function onUrlKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAnalyze();
    }
  }

  const MAX_BYTES = 50 * 1024 * 1024;
  function fmtMB(b: number) { return (b / 1024 / 1024).toFixed(1) + 'MB'; }

  function switchMode(next: 'url' | 'file') {
    if (mode === next) return;
    setMode(next);
    // 탭 전환 시 이전 탭에서 입력·분석된 정보 모두 초기화 (URL→파일 또는 파일→URL)
    setUrl('');
    setFileUrl('');
    setFinalUrl('');
    setTitle('');
    setSummary('');
    setMain('');
    setSub('');
    setTags('');
    setFormat('');
    setPublishedAt('');
    setFileName(null);
    setAnalyzeMsg(null);
    setAnalyzed(false);
    setManual(false);
    setDuplicate(null);
    setForceSubmit(false);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setFileUrl('');
    setAnalyzeMsg(null);

    if (f.size === 0) {
      setAnalyzeMsg({ kind: 'error', text: `${f.name} — 비어있는 파일이에요. 다른 파일을 골라주세요.` });
      return;
    }
    if (f.size > MAX_BYTES) {
      setAnalyzeMsg({
        kind: 'error',
        text: `${f.name} — ${fmtMB(f.size)}로 너무 커요. 50MB까지 올릴 수 있어요. PDF로 압축하거나 Google Drive 링크를 URL로 등록해보세요.`,
      });
      return;
    }

    track('submit_start', { mode: 'file' });
    const fd = new FormData();
    fd.append('file', f);
    startUpload(async () => {
      const r = await uploadFile(fd);
      if (!r.ok) {
        setAnalyzeMsg({
          kind: 'error',
          text: `파일을 못 올렸어요 — ${r.error ?? '서버에 문제가 생겼어요'}. ${
            r.error?.includes('Body exceeded') || r.error?.includes('body size')
              ? '크기가 너무 커요. Google Drive 링크를 URL로 등록해보세요.'
              : '크기와 확장자를 확인하고 다시 시도해주세요.'
          }`,
        });
        return;
      }
      const uploadedUrl = r.url ?? '';
      setFileUrl(uploadedUrl);
      setAnalyzeMsg({ kind: 'ok', text: `파일을 올렸어요 (${fmtMB(f.size)}) · 분석 중...` });

      // 파일 자동 분석 — 파일명 기반 classify로 제목·요약·카테고리·태그 자동 채움
      startAnalyze(async () => {
        const ar = await analyzeFile(uploadedUrl, f.name);
        applyAnalysis(ar);
      });
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('url', finalUrl || url);
    fd.set('file_url', fileUrl);
    fd.set('title', title);
    fd.set('summary', summary);
    fd.set('main_category', main);
    fd.set('sub_category', sub);
    fd.set('tags', tags);
    fd.set('format', format);
    fd.set('published_at', publishedAt);
    fd.set('proposer', proposer);
    fd.set('proposer_email', proposerEmail);
    if (forceSubmit) fd.set('force', '1');
    setSubmitError(null);
    startSubmit(async () => {
      const r = await submitProposal(fd);
      if ('ok' in r && r.ok) {
        setSubmitDone(true);
        track('submit_success', { mode, category: main });
        return;
      }
      if ('duplicate' in r && r.duplicate) {
        setDuplicate(r.duplicate);
        setSubmitError('이미 등록된 자료예요. 아래 안내를 확인해주세요.');
        return;
      }
      setSubmitError((r as { error: string }).error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 w-full min-w-0">
      {/* 등록 방식 — 밑줄 탭 (박스 중첩 회피, UI 규칙: 전환 탭은 탭답게) */}
      <div role="tablist" aria-label="등록 방식" className="flex gap-1 border-b border-[var(--border)]">
        {([['url', 'URL 등록'], ['file', '파일 업로드']] as const).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`px-4 py-2.5 text-sm -mb-px border-b-2 transition ${
              mode === m
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--fg)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* URL 입력 + 자동분석 — 첫 단계 */}
      {mode === 'url' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="url-input">
            URL <span className="text-[var(--danger)]">*</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch">
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setUrl(e.target.value);
                // 링크 바꾸면 이전 분석 결과 파생상태 초기화 — stale finalUrl이 제출되는 것 방지
                setFinalUrl('');
                setDuplicate(null);
                setForceSubmit(false);
                if (analyzed) setAnalyzed(false);
              }}
              onKeyDown={onUrlKeyDown}
              placeholder="https://..."
              autoFocus
              className="flex-1 min-w-0 h-11 px-4 rounded-full border-2 border-[var(--border)] bg-[var(--bg)] text-sm focus:border-[var(--focus-ring)] transition-colors"
            />
            <Button
              type="button"
              appearance="primary"
              onClick={onAnalyze}
              isDisabled={analyzing || !url.trim()}
            >
              <span className="inline-flex items-center gap-1.5">
                {analyzing ? <Spinner size="small" /> : <Sparkles size={14} aria-hidden />}
                {analyzing ? '분석 중…' : '자동 분석'}
              </span>
            </Button>
          </div>
          <p className="text-xs text-[var(--muted)]">
            URL만 붙여넣으면 제목·요약·카테고리·태그를 알아서 채워드려요. Enter로 바로 분석할 수 있어요.
          </p>
          {finalUrl && finalUrl !== url && (
            <p className="text-[11px] text-[var(--muted-2)] break-all">
              ↳ 실제 링크: <span className="text-[var(--fg)]">{finalUrl}</span>
            </p>
          )}
        </div>
      )}

      {mode === 'file' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">
            파일 <span className="text-[var(--danger)]">*</span>
          </label>
          <label className="flex items-center justify-center gap-2 px-4 py-6 rounded-[var(--r-lg)] border-2 border-dashed border-[var(--border-strong)] bg-[var(--card)] cursor-pointer hover:border-[var(--accent)] transition-colors">
            <input type="file" onChange={onFileChange} className="hidden" />
            {uploading ? <Spinner size="small" /> : <Upload size={16} />}
            <span className="text-sm">
              {uploading ? '올리고 있어요...' : fileName ?? '파일 고르기 (50MB까지)'}
            </span>
          </label>
          {fileUrl && (
            <div className="text-xs text-[var(--muted)] break-all flex items-center gap-1.5">
              <FileCheck2 size={12} className="text-[var(--success)] shrink-0" aria-hidden />
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">{fileUrl}</a>
            </div>
          )}
        </div>
      )}

      {analyzeMsg && (
        <div
          role={analyzeMsg.kind === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-2 p-3 rounded-[var(--r-sm)] border text-sm ${
            analyzeMsg.kind === 'error'
              ? 'border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--fg)]'
              : 'border-[var(--accent)]/40 bg-[var(--accent-bg)] text-[var(--fg)]'
          }`}
        >
          {analyzeMsg.kind === 'error'
            ? <AlertCircle size={16} className="text-[var(--danger)] shrink-0 mt-0.5" aria-hidden />
            : <CheckCircle2 size={16} className="text-[var(--success)] shrink-0 mt-0.5" aria-hidden />}
          <span className="flex-1">
            {analyzeMsg.text}
            {/* 분석 실패 폴백 — 자동 분석이 막힌 사이트(브런치·페이월 등)도 직접 입력으로 등록 가능해야 함 */}
            {analyzeMsg.kind === 'error' && mode === 'url' && !showDetails && (
              <>
                {' '}
                <button
                  type="button"
                  onClick={startManual}
                  className="text-[var(--accent)] font-medium hover:underline"
                >
                  직접 입력해서 등록하기
                </button>
              </>
            )}
          </span>
        </div>
      )}

      {duplicate && (
        <div role="alert" className="flex flex-col gap-2 p-3 rounded-[var(--r-sm)] border border-[var(--warning)]/50 bg-[var(--warning)]/10 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-[var(--warning)] shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                이미 있는 자료예요
              </p>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {duplicate.source === 'archive'
                  ? `자료실에 이미 올라가 있어요: "${duplicate.title}"`
                  : `검토 큐에 이미 들어가 있어요: "${duplicate.title}" (${dupStatusLabel(duplicate.status)})`}
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer pl-6">
            <input
              type="checkbox"
              checked={forceSubmit}
              onChange={(e) => setForceSubmit(e.target.checked)}
              className="accent-[var(--warning)]"
            />
            그래도 등록할게요 (운영진이 다시 판단해요)
          </label>
        </div>
      )}

      {/* 점진 노출 — 분석/업로드 완료 후 상세 필드 + 등록 버튼 */}
      {showDetails && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">제목 <span className="text-[var(--danger)]">*</span></label>
            <Textfield
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              isRequired
              placeholder="자료 제목"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">한 줄 설명</label>
            <TextArea
              value={summary}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSummary(e.target.value)}
              minimumRows={3}
              placeholder="이 자료가 어떤 내용인지 한 줄로 적어주세요"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="text-sm font-medium">대분류</label>
              <Select
                inputId="main-cat"
                value={main ? { label: main, value: main } : null}
                onChange={(o: any) => { setMain(o?.value ?? ''); setSub(''); }}
                options={cats.map((c) => ({ label: c, value: c }))}
                placeholder="선택"
                isClearable
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="text-sm font-medium">소분류</label>
              <Select
                inputId="sub-cat"
                value={sub ? { label: sub, value: sub } : null}
                onChange={(o: any) => setSub(o?.value ?? '')}
                options={[
                  ...(subs[main] ?? []).map((s) => ({ label: s, value: s })),
                  ...(sub && !(subs[main] ?? []).includes(sub) ? [{ label: `${sub} (신규)`, value: sub }] : []),
                ]}
                placeholder="선택"
                isClearable
                isDisabled={!main}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium" htmlFor="published-at">발행일 <span className="text-[var(--muted-2)] font-normal">(선택 · 자동 추출)</span></label>
            <div className="w-full sm:max-w-xs">
              <Textfield
                id="published-at"
                type="date"
                value={publishedAt}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPublishedAt(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <span className="text-[11px] text-[var(--muted-2)]">원본에 발행일이 있으면 알아서 채워드려요. 없으면 비워둬도 괜찮아요.</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">태그 <span className="text-[var(--muted-2)] font-normal">(쉼표 구분)</span></label>
            <Textfield
              value={tags}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTags(e.target.value)}
              placeholder="피그마, Figma, 디자인툴"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--border)]">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="text-sm font-medium">제안자 <span className="text-[var(--muted-2)] font-normal">(선택)</span></label>
              <Textfield
                value={proposer}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProposer(e.target.value)}
                placeholder="이름·닉네임"
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="text-sm font-medium">이메일 <span className="text-[var(--muted-2)] font-normal">(선택)</span></label>
              <Textfield
                type="email"
                value={proposerEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProposerEmail(e.target.value)}
                placeholder="검토 결과를 알려드려요"
              />
            </div>
          </div>

          {submitError && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-[var(--r-sm)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 text-sm">
              <AlertCircle size={16} className="text-[var(--danger)] shrink-0 mt-0.5" aria-hidden />
              <span>{submitError}</span>
            </div>
          )}

          <div className="mt-4">
            <Button
              type="submit"
              appearance="primary"
              isDisabled={submitting || !title || (!url && !fileUrl) || (!!duplicate && !forceSubmit)}
              shouldFitContainer
            >
              {submitting ? '보내고 있어요…' : '등록할게요'}
            </Button>
          </div>
        </>
      )}

      {submitDone && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-done-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={resetForm}
        >
          <div
            className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-md)] shadow-[var(--shadow-3)] max-w-md w-full p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={22} className="text-[var(--success)]" aria-hidden />
                <h2 id="submit-done-title" className="text-lg font-bold tracking-tight">잘 보냈어요</h2>
              </div>
              <button
                type="button"
                onClick={resetForm}
                aria-label="닫기"
                className="p-1 -m-1 text-[var(--muted)] hover:text-[var(--fg)]"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              자료를 잘 받았어요. 운영진 두 분이 확인한 뒤 자료실에 올라가요.
              {proposerEmail && ' 결과는 이메일로 알려드릴게요.'}
            </p>
            <div className="flex gap-2 mt-1 [&>button]:flex-1 [&>a]:flex-1">
              <Button appearance="primary" onClick={resetForm} shouldFitContainer>하나 더 등록할래요</Button>
              <LinkButton href="/" appearance="default" shouldFitContainer>홈으로 갈래요</LinkButton>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function dupStatusLabel(status: string | null): string {
  switch (status) {
    case 'pending': return '검토 대기 중';
    case 'approved': return '승인됐어요';
    case 'rejected': return '거절됐어요';
    default: return status ?? '상태를 모르겠어요';
  }
}
