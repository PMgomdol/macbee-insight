'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Sparkles, Upload, Loader2, CheckCircle2, AlertCircle, FileCheck2, X, AlertTriangle,
} from 'lucide-react';
import {
  analyzeUrl, submitProposal, uploadFile,
  type AnalyzeResult, type DuplicateMatch,
} from './actions';

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
  const [duplicate, setDuplicate] = useState<DuplicateMatch | null>(null);
  const [forceSubmit, setForceSubmit] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 점진적 노출 — URL 분석 성공 또는 파일 업로드 완료 시점부터 상세 필드 노출
  const showDetails = analyzed || !!fileUrl;

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
    setDuplicate(null);
    setForceSubmit(false);
    setSubmitDone(false);
    setSubmitError(null);
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
      setAnalyzeMsg({ kind: 'error', text: r.error ?? '분석 실패' });
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
      text: r.aiUsed ? 'AI 분석 완료 — 내용 확인 후 등록' : '메타 추출 완료 — 내용 확인 후 등록',
    });
  }

  function onAnalyze() {
    if (!url.trim()) { setAnalyzeMsg({ kind: 'error', text: 'URL을 먼저 입력' }); return; }
    setAnalyzeMsg(null);
    setDuplicate(null);
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
    setMode(next);
    setAnalyzeMsg(null);
    setDuplicate(null);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setFileUrl('');
    setAnalyzeMsg(null);

    if (f.size === 0) {
      setAnalyzeMsg({ kind: 'error', text: `${f.name} — 빈 파일입니다. 다른 파일 선택.` });
      return;
    }
    if (f.size > MAX_BYTES) {
      setAnalyzeMsg({
        kind: 'error',
        text: `${f.name} — 크기 ${fmtMB(f.size)} (최대 50MB). PDF로 압축하거나 Google Drive 링크 + URL 등록 권장.`,
      });
      return;
    }

    const fd = new FormData();
    fd.append('file', f);
    startUpload(async () => {
      const r = await uploadFile(fd);
      if (!r.ok) {
        setAnalyzeMsg({
          kind: 'error',
          text: `파일 업로드 실패 — ${r.error ?? '서버 오류'}. ${
            r.error?.includes('Body exceeded') || r.error?.includes('body size')
              ? '크기 초과. Google Drive 링크 + URL 등록 권장.'
              : '크기·확장자 확인 후 재시도.'
          }`,
        });
        return;
      }
      setFileUrl(r.url ?? '');
      if (!title) {
        const base = f.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
        setTitle(base);
      }
      setAnalyzeMsg({ kind: 'ok', text: `파일 업로드 완료 (${fmtMB(f.size)})` });
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
        return;
      }
      if ('duplicate' in r && r.duplicate) {
        setDuplicate(r.duplicate);
        setSubmitError('이미 등록된 자료입니다. 아래 경고 확인 후 다시 시도하세요.');
        return;
      }
      setSubmitError((r as { error: string }).error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 w-full min-w-0">
      <div role="tablist" aria-label="등록 방식" className="grid grid-cols-2 gap-1 p-0.5 rounded-[var(--r-sm)] bg-[var(--card)] border border-[var(--border)]">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'url'}
          onClick={() => switchMode('url')}
          className={`px-3 py-2 rounded-[var(--r-sm)] text-sm transition ${mode === 'url' ? 'bg-[var(--bg)] shadow-[var(--shadow-2)] font-semibold' : 'text-[var(--muted)]'}`}
        >
          URL 등록
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'file'}
          onClick={() => switchMode('file')}
          className={`px-3 py-2 rounded-[var(--r-sm)] text-sm transition ${mode === 'file' ? 'bg-[var(--bg)] shadow-[var(--shadow-2)] font-semibold' : 'text-[var(--muted)]'}`}
        >
          파일 업로드
        </button>
      </div>

      {/* URL 입력 + 자동분석 — 첫 단계 */}
      {mode === 'url' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="url-input">
            URL <span className="text-[var(--danger)]">*</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); if (analyzed) setAnalyzed(false); }}
              onKeyDown={onUrlKeyDown}
              placeholder="https://..."
              autoFocus
              className="flex-1 min-w-0 px-3 py-2 rounded-[var(--r-sm)] border border-[var(--border-strong)] border-b-2 bg-[var(--bg)] text-sm focus:border-b-[var(--accent)] outline-none"
            />
            <button
              type="button"
              onClick={onAnalyze}
              disabled={analyzing || !url.trim()}
              className="fc-btn fc-btn-primary px-4 whitespace-nowrap shrink-0"
            >
              {analyzing ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Sparkles size={14} aria-hidden />}
              {analyzing ? '분석 중...' : '자동 분석'}
            </button>
          </div>
          <p className="text-xs text-[var(--muted)]">
            URL만 붙여넣으면 제목·요약·카테고리·태그가 자동으로 채워져요. Enter로 바로 분석.
          </p>
          {finalUrl && finalUrl !== url && (
            <p className="text-[11px] text-[var(--muted-2)] break-all">
              ↳ 최종 링크: <span className="text-[var(--fg)]">{finalUrl}</span>
            </p>
          )}
        </div>
      )}

      {mode === 'file' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">
            파일 <span className="text-[var(--danger)]">*</span>
          </label>
          <label className="flex items-center gap-2 px-3 py-3 rounded-[var(--r-sm)] border-2 border-dashed border-[var(--border-strong)] bg-[var(--card)] cursor-pointer hover:border-[var(--accent)]">
            <input type="file" onChange={onFileChange} className="hidden" />
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            <span className="text-sm">
              {uploading ? '업로드 중...' : fileName ?? '파일 선택 (최대 50MB)'}
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
          <span className="flex-1">{analyzeMsg.text}</span>
        </div>
      )}

      {duplicate && (
        <div role="alert" className="flex flex-col gap-2 p-3 rounded-[var(--r-sm)] border border-[var(--warning)]/50 bg-[var(--warning)]/10 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-[var(--warning)] shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                이미 등록된 자료
              </p>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {duplicate.source === 'archive'
                  ? `자료실에 이미 공개된 자료: "${duplicate.title}"`
                  : `검토 큐에 이미 제안된 자료: "${duplicate.title}" (${dupStatusLabel(duplicate.status)})`}
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
            중복임을 알면서도 등록 (운영진이 검토 시 판단)
          </label>
        </div>
      )}

      {/* 점진 노출 — 분석/업로드 완료 후 상세 필드 + 등록 버튼 */}
      {showDetails && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">제목 <span className="text-[var(--danger)]">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="자료 제목"
              className="px-3 py-2 rounded-[var(--r-sm)] border border-[var(--border-strong)] border-b-2 bg-[var(--bg)] text-sm focus:border-b-[var(--accent)] outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">한 줄 설명</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="이 자료가 어떤 내용인지 한 줄로..."
              className="px-3 py-2 rounded-[var(--r-sm)] border border-[var(--border-strong)] border-b-2 bg-[var(--bg)] text-sm focus:border-b-[var(--accent)] outline-none resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="text-sm font-medium">대분류</label>
              <select
                value={main}
                onChange={(e) => { setMain(e.target.value); setSub(''); }}
                className="px-3 py-2 rounded-[var(--r-sm)] border border-[var(--border-strong)] border-b-2 bg-[var(--bg)] text-sm focus:border-b-[var(--accent)] outline-none"
              >
                <option value="">선택</option>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="text-sm font-medium">소분류</label>
              <select
                value={sub}
                onChange={(e) => setSub(e.target.value)}
                className="px-3 py-2 rounded-[var(--r-sm)] border border-[var(--border-strong)] border-b-2 bg-[var(--bg)] text-sm focus:border-b-[var(--accent)] outline-none"
              >
                <option value="">선택</option>
                {(subs[main] ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
                {sub && !(subs[main] ?? []).includes(sub) && <option value={sub}>{sub} (신규)</option>}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium" htmlFor="published-at">발행일 <span className="text-[var(--muted-2)] font-normal">(선택 · 자동 추출)</span></label>
            <input
              id="published-at"
              type="date"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              lang="ko-KR"
              placeholder="YYYY-MM-DD"
              className="px-3 py-2 rounded-[var(--r-sm)] border border-[var(--border-strong)] border-b-2 bg-[var(--bg)] text-sm focus:border-b-[var(--accent)] outline-none w-full sm:max-w-xs"
            />
            <span className="text-[11px] text-[var(--muted-2)]">원본 자료에 발행일 메타가 있으면 자동 입력. 없으면 비워둬도 OK.</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">태그 <span className="text-[var(--muted-2)] font-normal">(쉼표 구분)</span></label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="피그마, Figma, 디자인툴"
              className="px-3 py-2 rounded-[var(--r-sm)] border border-[var(--border-strong)] border-b-2 bg-[var(--bg)] text-sm focus:border-b-[var(--accent)] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--border)]">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="text-sm font-medium">제안자 <span className="text-[var(--muted-2)] font-normal">(선택)</span></label>
              <input
                value={proposer}
                onChange={(e) => setProposer(e.target.value)}
                placeholder="이름·닉네임"
                className="px-3 py-2 rounded-[var(--r-sm)] border border-[var(--border-strong)] border-b-2 bg-[var(--bg)] text-sm focus:border-b-[var(--accent)] outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="text-sm font-medium">이메일 <span className="text-[var(--muted-2)] font-normal">(선택)</span></label>
              <input
                type="email"
                value={proposerEmail}
                onChange={(e) => setProposerEmail(e.target.value)}
                placeholder="검토 결과 알림용"
                className="px-3 py-2 rounded-[var(--r-sm)] border border-[var(--border-strong)] border-b-2 bg-[var(--bg)] text-sm focus:border-b-[var(--accent)] outline-none"
              />
            </div>
          </div>

          {submitError && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-[var(--r-sm)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 text-sm">
              <AlertCircle size={16} className="text-[var(--danger)] shrink-0 mt-0.5" aria-hidden />
              <span>{submitError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !title || (!url && !fileUrl) || (!!duplicate && !forceSubmit)}
            className="fc-btn fc-btn-primary mt-4 px-4 py-3"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? '등록 중...' : '등록 신청'}
          </button>
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
                <h2 id="submit-done-title" className="text-lg font-bold tracking-tight">등록 완료</h2>
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
              제안이 접수되었어요. 운영진 2명 검토 후 자료실로 이관됩니다.
              {proposerEmail && ' 검토 결과는 이메일로 안내드려요.'}
            </p>
            <div className="flex gap-2 mt-1">
              <button type="button" onClick={resetForm} className="fc-btn fc-btn-primary flex-1 px-4 py-2.5">
                추가 등록하기
              </button>
              <Link href="/" className="fc-btn fc-btn-subtle flex-1 px-4 py-2.5 justify-center text-center">
                홈으로 가기
              </Link>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function dupStatusLabel(status: string | null): string {
  switch (status) {
    case 'pending': return '검토 대기';
    case 'approved': return '승인됨';
    case 'rejected': return '거절됨';
    default: return status ?? '상태 불명';
  }
}
