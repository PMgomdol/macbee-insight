'use client';

import { useState, useTransition } from 'react';
import { Sparkles, Upload, Loader2, CheckCircle2, AlertCircle, FileCheck2 } from 'lucide-react';
import { analyzeUrl, submitProposal, uploadFile, type AnalyzeResult } from './actions';

const FORMATS = ['아티클', '영상', '가이드', '템플릿', '기획서', '세미나'];

type Props = { categories: { main_category: string; sub_category: string | null }[] };

export function SubmitForm({ categories }: Props) {
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
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
    setAnalyzeMsg({ kind: 'ok', text: r.aiUsed ? 'AI 분석 완료 — 내용 확인 후 등록' : '메타 추출 완료 — 내용 확인 후 등록' });
  }

  function onAnalyze() {
    if (!url.trim()) { setAnalyzeMsg({ kind: 'error', text: 'URL을 먼저 입력' }); return; }
    setAnalyzeMsg(null);
    startAnalyze(async () => {
      const r = await analyzeUrl(url);
      applyAnalysis(r);
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setAnalyzeMsg(null);
    const fd = new FormData();
    fd.append('file', f);
    startUpload(async () => {
      const r = await uploadFile(fd);
      if (!r.ok) {
        setAnalyzeMsg({ kind: 'error', text: '파일 업로드 실패: ' + r.error });
        return;
      }
      setFileUrl(r.url ?? '');
      if (!title) {
        const base = f.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
        setTitle(base);
      }
      setAnalyzeMsg({ kind: 'ok', text: '파일 업로드 완료' });
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('url', url);
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
    startSubmit(() => submitProposal(fd));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 w-full min-w-0">
      {/* 모드 토글 — segmented */}
      <div role="tablist" aria-label="등록 방식" className="grid grid-cols-2 gap-1 p-0.5 rounded-[var(--r-sm)] bg-[var(--card)] border border-[var(--border)]">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'url'}
          onClick={() => setMode('url')}
          className={`px-3 py-2 rounded-[var(--r-sm)] text-sm transition ${mode === 'url' ? 'bg-[var(--bg)] shadow-[var(--shadow-2)] font-semibold' : 'text-[var(--muted)]'}`}
        >
          URL 등록
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'file'}
          onClick={() => setMode('file')}
          className={`px-3 py-2 rounded-[var(--r-sm)] text-sm transition ${mode === 'file' ? 'bg-[var(--bg)] shadow-[var(--shadow-2)] font-semibold' : 'text-[var(--muted)]'}`}
        >
          파일 업로드
        </button>
      </div>

      {/* URL 입력 + 자동분석 */}
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
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
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
          <p className="text-xs text-[var(--muted)]">URL 분석으로 제목·요약·카테고리·태그가 자동 채워짐. 수정 후 등록.</p>
        </div>
      )}

      {/* 파일 업로드 */}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <label className="text-sm font-medium">자료 형식</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="px-3 py-2 rounded-[var(--r-sm)] border border-[var(--border-strong)] border-b-2 bg-[var(--bg)] text-sm focus:border-b-[var(--accent)] outline-none"
          >
            <option value="">선택</option>
            {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 min-w-0">
          <label className="text-sm font-medium" htmlFor="published-at">발행일 <span className="text-[var(--muted-2)] font-normal">(선택)</span></label>
          <input
            id="published-at"
            type="date"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            lang="ko-KR"
            placeholder="YYYY-MM-DD"
            className="px-3 py-2 rounded-[var(--r-sm)] border border-[var(--border-strong)] border-b-2 bg-[var(--bg)] text-sm focus:border-b-[var(--accent)] outline-none"
          />
          <span className="text-[11px] text-[var(--muted-2)]">예: 2026-05-12 (원본 자료 발행일)</span>
        </div>
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

      <button
        type="submit"
        disabled={submitting || !title || (!url && !fileUrl)}
        className="fc-btn fc-btn-primary mt-4 px-4 py-3"
      >
        {submitting && <Loader2 size={14} className="animate-spin" />}
        {submitting ? '등록 중...' : '등록 신청'}
      </button>
    </form>
  );
}
