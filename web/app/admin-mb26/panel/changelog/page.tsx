import { ChevronRight } from 'lucide-react';
import { UILinkButton } from '@/components/ui/Button';
import { getAuthState } from '@/lib/auth';
import { CHANGELOG, TYPE_META, TYPE_ORDER, type Release } from '@/lib/changelog';

export const metadata = { title: '업데이트 내역 · 운영/관리' };

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;
}

function ReleaseCard({ rel, open }: { rel: Release; open: boolean }) {
  const groups = TYPE_ORDER.map((t) => ({ t, items: rel.changes.filter((c) => c.type === t) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <details open={open} className="group rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--card)] open:bg-[var(--bg)]">
      <summary className="flex items-center gap-3 p-4 cursor-pointer list-none select-none">
        <ChevronRight
          size={18}
          className="shrink-0 text-[var(--muted-2)] transition-transform group-open:rotate-90"
          aria-hidden
        />
        <div className="flex-1 min-w-0 flex flex-col">
          {rel.title && <span className="font-bold text-sm sm:text-base tracking-tight">{rel.title}</span>}
          <time className="text-xs text-[var(--muted-2)]" dateTime={rel.date}>
            {formatDate(rel.date)}
          </time>
        </div>
        <span className="shrink-0 text-xs text-[var(--muted-2)]">{rel.changes.length}건</span>
      </summary>

      <div className="px-4 pb-4 pl-[calc(1rem+18px+0.75rem)] flex flex-col gap-4">
        {groups.map(({ t, items }) => {
          const meta = TYPE_META[t];
          return (
            <div key={t} className="flex flex-col gap-1.5">
              <span
                className="w-fit inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold"
                style={{ color: meta.color, borderColor: meta.color, background: `color-mix(in srgb, ${meta.color} 8%, var(--bg))` }}
              >
                {meta.label}
              </span>
              <ul className="flex flex-col gap-1 text-sm leading-relaxed text-[var(--fg)]">
                {items.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[var(--muted-2)] shrink-0" aria-hidden>·</span>
                    <span>{c.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {rel.media && rel.media.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            {rel.media.map((m, i) => (
              <figure key={i} className="flex flex-col gap-1.5">
                <div className="overflow-hidden rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--card)]">
                  {m.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element -- 관리자 내부 페이지, 최적화 불필요
                    <img src={m.src} alt={m.caption ?? ''} className="w-full h-auto block" loading="lazy" />
                  ) : (
                    <video src={m.src} controls className="w-full h-auto block" />
                  )}
                </div>
                {m.caption && <figcaption className="text-[11px] text-[var(--muted-2)]">{m.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

export default async function ChangelogPage() {
  const { user, isReviewer, displayName, role } = await getAuthState();

  if (!user || !isReviewer) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8 mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">업데이트 내역</h1>
        <p className="text-sm text-[var(--muted)]">운영진만 볼 수 있어요.</p>
        <UILinkButton href="/admin-mb26" className="w-fit">로그인</UILinkButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">업데이트 내역</h1>
          <span className="text-xs text-[var(--muted-2)]">{displayName ?? user.email} · {role === 'admin' ? '관리자' : '운영진'}</span>
        </div>
        <p className="text-sm text-[var(--muted)]">자료실이 어떻게 바뀌어 왔는지 최신순으로 모았어요. 제목을 눌러 자세히 볼 수 있어요.</p>
      </section>

      <div className="flex flex-col gap-2.5">
        {CHANGELOG.map((rel, i) => (
          <ReleaseCard key={rel.date} rel={rel} open={i === 0} />
        ))}
      </div>
    </div>
  );
}
