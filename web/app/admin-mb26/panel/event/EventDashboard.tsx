'use client';

import { useMemo, useState, useTransition } from 'react';
import { Search, ExternalLink } from 'lucide-react';
import { setEventBonus } from '../actions';

export type EventRow = {
  id: number;
  title: string;
  proposer: string;
  url: string;
  date: string;
  type: '문서' | '링크';
  base: number;
  rarity: boolean;
  practical: boolean;
  dup: boolean;
};

const MIN = 15; // 최소 등록 기준(2일 1개)

function rowTotal(r: EventRow): number {
  return r.base + (r.rarity ? 1 : 0) + (r.practical ? 2 : 0);
}

export function EventDashboard({ rows: initial, windowLabel }: { rows: EventRow[]; windowLabel?: string }) {
  const [rows, setRows] = useState<EventRow[]>(initial);
  const [q, setQ] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const board = useMemo(() => {
    const m = new Map<string, { name: string; count: number; docs: number; total: number; rank: number }>();
    for (const r of rows) {
      const e = m.get(r.proposer) ?? { name: r.proposer, count: 0, docs: 0, total: 0, rank: 0 };
      e.count++;
      if (r.type === '문서') e.docs++;
      e.total += rowTotal(r);
      m.set(r.proposer, e);
    }
    const arr = [...m.values()].sort((a, b) => b.total - a.total || b.docs - a.docs);
    let rank = 0, pt: number | null = null, pd: number | null = null;
    arr.forEach((e, i) => {
      if (e.total === pt && e.docs === pd) e.rank = rank;
      else { rank = i + 1; e.rank = rank; }
      pt = e.total; pd = e.docs;
    });
    return arr;
  }, [rows]);

  const filtered = useMemo(() => {
    const kws = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!kws.length) return rows;
    return rows.filter((r) => {
      const hay = (r.title + ' ' + r.proposer).toLowerCase();
      return kws.every((k) => hay.includes(k));
    });
  }, [rows, q]);

  function toggle(id: number, field: 'rarity' | 'practical') {
    setErr(null);
    const cur = rows.find((r) => r.id === id);
    if (!cur) return;
    const next = { ...cur, [field]: !cur[field] };
    setRows((prev) => prev.map((r) => (r.id === id ? next : r))); // 낙관적
    startTransition(async () => {
      try {
        await setEventBonus(id, next.rarity, next.practical);
      } catch (e) {
        setRows((prev) => prev.map((r) => (r.id === id ? cur : r))); // 롤백
        setErr(e instanceof Error ? e.message : '저장 실패');
      }
    });
  }

  const totalItems = rows.length;
  const totalDocs = rows.filter((r) => r.type === '문서').length;

  return (
    <div className="flex flex-col gap-6 py-2">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">등록이벤트 대시보드</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {windowLabel && <span className="text-[var(--muted-2)]">[{windowLabel}] </span>}
          기간 승인 자료 {totalItems}건 (문서 {totalDocs} · 링크 {totalItems - totalDocs}) · 참가자 {board.length}명 · 최소 {MIN}개 기준
        </p>
        <p className="text-[11.5px] text-[var(--muted-2)] mt-1">
          기본점수(링크1·문서2)는 자동. 아래 목록에서 <b>희소성(+1)·실무형(+2)</b>만 체크하면 순위에 바로 반영돼요.
        </p>
      </div>

      {err && (
        <p className="text-sm text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_10%,var(--bg))] border border-[var(--danger)] rounded-[var(--r-sm)] px-3 py-2">{err}</p>
      )}

      {/* 참가자 순위 */}
      <section className="flex flex-col gap-2">
        <div className="text-sm font-medium text-[var(--muted)]">참가자 순위</div>
        {board.length === 0 ? (
          <p className="text-sm text-[var(--muted-2)] py-3">아직 이벤트 기간 승인 자료가 없어요.</p>
        ) : (
          <div className="border border-[var(--border)] rounded-[var(--r-sm)] overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="text-[11px] text-[var(--muted-2)] border-b border-[var(--border)] bg-[var(--card)]">
                  <th className="text-left font-medium px-3 py-2 w-12">순위</th>
                  <th className="text-left font-medium px-3 py-2">등록자</th>
                  <th className="text-right font-medium px-3 py-2 w-16">승인수</th>
                  <th className="text-right font-medium px-3 py-2 w-16">문서</th>
                  <th className="text-right font-medium px-3 py-2 w-20">총점</th>
                  <th className="text-center font-medium px-3 py-2 w-16">{MIN}개↑</th>
                </tr>
              </thead>
              <tbody>
                {board.map((e) => (
                  <tr key={e.name} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-2 font-semibold tabular-nums">{e.rank}</td>
                    <td className="px-3 py-2 truncate max-w-[160px]">{e.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.count}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[var(--muted-2)]">{e.docs}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-[var(--accent)]">{e.total}</td>
                    <td className="px-3 py-2 text-center">
                      {e.count >= MIN ? <span className="text-[var(--accent)]">✓</span> : <span className="text-[var(--muted-2)]">{e.count}/{MIN}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 자료 채점 */}
      <section className="flex flex-col gap-2 border-t border-dashed border-[var(--border)] pt-5">
        <div className="text-sm font-medium text-[var(--muted)]">자료 채점 ({filtered.length}건)</div>
        <div className="flex items-center gap-2 border-2 border-[var(--border)] focus-within:border-[var(--accent)] rounded-[var(--r-sm)] px-3 py-2 bg-[var(--bg)] transition max-w-md">
          <Search size={16} className="text-[var(--muted-2)] shrink-0" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목·등록자로 찾기"
            aria-label="자료 검색"
            className="flex-1 bg-transparent outline-none text-sm text-[var(--fg)] placeholder:text-[var(--muted-2)]"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--muted-2)] py-3">해당 자료가 없어요.</p>
        ) : (
          <div className="border border-[var(--border)] rounded-[var(--r-sm)] overflow-hidden divide-y divide-[var(--border)]">
            {filtered.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-[var(--card)] transition">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--r-sm)] shrink-0 ${r.type === '문서' ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'bg-[var(--card)] text-[var(--muted)]'}`}>
                      {r.type} {r.base}
                    </span>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1 text-sm font-medium truncate hover:text-[var(--accent)]" title="새 탭에서 원문">
                        <span className="truncate">{r.title}</span>
                        <ExternalLink size={12} className="shrink-0 opacity-0 group-hover:opacity-70" aria-hidden />
                      </a>
                    ) : (
                      <span className="text-sm font-medium truncate">{r.title}</span>
                    )}
                    {r.dup && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--r-sm)] bg-[color-mix(in_srgb,var(--danger)_12%,var(--bg))] text-[var(--danger)] shrink-0">중복의심</span>}
                  </div>
                  <div className="text-[11px] text-[var(--muted-2)] mt-0.5">{r.proposer} · {r.date} · 총 {rowTotal(r)}점</div>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <label className="inline-flex items-center gap-1 cursor-pointer select-none" title="희소성 +1">
                    <input type="checkbox" checked={r.rarity} disabled={pending} onChange={() => toggle(r.id, 'rarity')} className="accent-[var(--accent)] w-3.5 h-3.5" />
                    <span className="text-[var(--muted)]">희소 <span className="text-[var(--muted-2)]">+1</span></span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer select-none" title="실무형 +2">
                    <input type="checkbox" checked={r.practical} disabled={pending} onChange={() => toggle(r.id, 'practical')} className="accent-[var(--accent)] w-3.5 h-3.5" />
                    <span className="text-[var(--muted)]">실무 <span className="text-[var(--muted-2)]">+2</span></span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
