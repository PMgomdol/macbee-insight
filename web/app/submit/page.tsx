import { getCategories } from '@/lib/queries';
import { submitProposal } from './actions';

const FORMATS = ['아티클', '영상', '가이드', '템플릿', '기획서', '세미나'];

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const categories = await getCategories();
  const cats = Array.from(new Set(categories.map((c) => c.main_category)));
  const subsByMain: Record<string, string[]> = {};
  for (const c of categories) {
    if (c.sub_category) {
      subsByMain[c.main_category] = subsByMain[c.main_category] ?? [];
      subsByMain[c.main_category].push(c.sub_category);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold">자료 등록</h1>
        <p className="text-sm text-[var(--muted)]">
          URL 또는 자료 정보를 제출하면 운영진 2명이 검토 후 자료실로 이관됩니다.
        </p>
      </section>

      {sp.ok && (
        <div className="p-4 rounded border border-green-500/40 bg-green-500/10 text-sm">
          ✅ 등록 완료. 운영진 검토 대기 중.
        </div>
      )}
      {sp.error && (
        <div className="p-4 rounded border border-red-500/40 bg-red-500/10 text-sm">
          ⚠ {sp.error}
        </div>
      )}

      <form action={submitProposal} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">
            URL <span className="text-red-500">*</span>
          </label>
          <input
            name="url"
            type="url"
            required
            placeholder="https://..."
            className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--card)] text-sm focus:border-[var(--accent)] outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            name="title"
            type="text"
            required
            placeholder="자료 제목"
            className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--card)] text-sm focus:border-[var(--accent)] outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">한 줄 설명</label>
          <textarea
            name="summary"
            rows={3}
            placeholder="이 자료가 어떤 내용인지 한 줄로..."
            className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--card)] text-sm focus:border-[var(--accent)] outline-none resize-y"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">대분류</label>
            <select
              name="main_category"
              className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--card)] text-sm focus:border-[var(--accent)] outline-none"
            >
              <option value="">선택 안 함</option>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">자료 형식</label>
            <select
              name="format"
              className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--card)] text-sm focus:border-[var(--accent)] outline-none"
            >
              <option value="">선택 안 함</option>
              {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">태그 (쉼표로 구분)</label>
          <input
            name="tags"
            type="text"
            placeholder="피그마, 디자인툴, 무료리소스"
            className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--card)] text-sm focus:border-[var(--accent)] outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">제안자 (선택)</label>
            <input
              name="proposer"
              type="text"
              placeholder="이름·닉네임"
              className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--card)] text-sm focus:border-[var(--accent)] outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">이메일 (선택)</label>
            <input
              name="proposer_email"
              type="email"
              placeholder="검토 결과 알림용"
              className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--card)] text-sm focus:border-[var(--accent)] outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="mt-4 px-4 py-2.5 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] text-sm font-semibold"
        >
          등록 신청
        </button>
      </form>
    </div>
  );
}
