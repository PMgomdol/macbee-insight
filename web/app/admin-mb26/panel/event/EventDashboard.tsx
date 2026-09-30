'use client';

import { useMemo, useState, useTransition } from 'react';
import { Search, ExternalLink, Check } from 'lucide-react';
import { setEventBonus, clearEventBonus } from '../actions';

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
  reviewed: boolean;
  dup: boolean;
};

const MIN = 15; // 최소 등록 기준(2일 1개)

function rowTotal(r: EventRow): number {
  return r.base + (r.rarity ? 1 : 0) + (r.practical ? 2 : 0);
}

const chip = (active: boolean) =>
  `shrink-0 px-3 py-1.5 rounded-full text-xs border whitespace-nowrap transition ${
    active
      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
      : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'
  }`;

export function EventDashboard({ rows: initial, windowLabel }: { rows: EventRow[]; windowLabel?: string }) {
  const [rows, setRows] = useState<EventRow[]>(initial);
  const [q, setQ] = useState('');
  const [typeF, setTypeF] = useState<'' | '문서' | '링크'>('');
  const [reviewF, setReviewF] = useState<'' | 'todo' | 'done'>('');
  const [qualifiedOnly, setQualifiedOnly] = useState(false);
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
  const boardShown = qualifiedOnly ? board.filter((e) => e.count >= MIN) : board;

  const filtered = useMemo(() => {
    const kws = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      if (typeF && r.type !== typeF) return false;
      if (reviewF === 'todo' && r.reviewed) return false;
      if (reviewF === 'done' && !r.reviewed) return false;
      if (kws.length) {
        const hay = (r.title + ' ' + r.proposer).toLowerCase();
        if (!kws.every((k) => hay.includes(k))) return false;
      }
      return true;
    });
  }, [rows, q, typeF, reviewF]);

  const reviewedCount = rows.filter((r) => r.reviewed).length;

  function patch(id: number, next: Partial<EventRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...next } : r)));
  }

  function toggleBonus(id: number, field: 'rarity' | 'practical') {
    setErr(null);
    const cur = rows.find((r) => r.id === id);
    if (!cur) return;
    const nextR = field === 'rarity' ? !cur.rarity : cur.rarity;
    const nextP = field === 'practical' ? !cur.practical : cur.practical;
    patch(id, { rarity: nextR, practical: nextP, reviewed: true }); // 낙관적 (가산 = 자동 검수완료)
    startTransition(async () => {
      try {
        await setEventBonus(id, nextR, nextP);
      } catch (e) {
        patch(id, { rarity: cur.rarity, practical: cur.practical, reviewed: cur.reviewed });
        setErr(e instanceof Error ? e.message : '저장 실패');
      }
    });
  }

  function toggleReviewed(id: number) {
    setErr(null);
    const cur = rows.find((r) => r.id === id);
    if (!cur) return;
    if (cur.reviewed) {
      patch(id, { reviewed: false, rarity: false, practical: false }); // 검수취소 = 가산도 초기화
      startTransition(async () => {
        try {
          await clearEventBonus(id);
        } catch (e) {
          patch(id, { reviewed: cur.reviewed, rarity: cur.rarity, practical: cur.practical });
          setErr(e instanceof Error ? e.message : '저장 실패');
        }
      });
    } else {
      patch(id, { reviewed: true });
      startTransition(async () => {
        try {
          await setEventBonus(id, cur.rarity, cur.practical);
        } catch (e) {
          patch(id, { reviewed: cur.reviewed });
          setErr(e instanceof Error ? e.message : '저장 실패');
        }
      });
    }
  }

  const totalItems = rows.length;
  const totalDocs = rows.filter((r) => r.type === '문서').length;

  return (
    <div className="flex flex-col gap-6 py-2">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">등록이벤트 대시보드</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {windowLabel && <span className="text-[var(--muted-2)]">[{windowLabel}] </span>}
          승인 {totalItems}건 (문서 {totalDocs} · 링크 {totalItems - totalDocs}) · 참가자 {board.length}명
          {' · '}<b className={totalItems - reviewedCount > 0 ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}>미검수 {totalItems - reviewedCount}건</b>
        </p>
      </div>

      {err && (
        <p className="text-sm text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_10%,var(--bg))] border border-[var(--danger)] rounded-[var(--r-sm)] px-3 py-2">{err}</p>
      )}

      {/* 참가자 순위 */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium text-[var(--muted)]">참가자 순위</div>
          <button type="button" onClick={() => setQualifiedOnly((v) => !v)} className={chip(qualifiedOnly)}>
            {MIN}개↑ 자격자만
          </button>
        </div>
        {boardShown.length === 0 ? (
          <p className="text-sm text-[var(--muted-2)] py-3">{board.length === 0 ? '아직 집계된 자료가 없어요.' : '자격 충족자가 아직 없어요.'}</p>
        ) : (
          <div className="border border-[var(--border)] rounded-[var(--r-sm)] overflow-x-auto">
            <table className="w-full text-sm min-w-[440px]">
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
                {boardShown.map((e) => (
                  <tr
                    key={e.name}
                    onClick={() => setQ(e.name)}
                    className="border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--card)]"
                    title="클릭하면 이 사람 자료만 보기"
                  >
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
      <section className="flex flex-col gap-3 border-t border-dashed border-[var(--border)] pt-5">
        <div className="text-sm font-medium text-[var(--muted)]">자료 채점 ({filtered.length}건)</div>
        <p className="text-[12px] text-[var(--muted-2)] leading-relaxed -mt-1">
          각 줄 왼쪽 상태를 눌러 <b className="text-[var(--fg)]">검수완료</b>로 바꿔요. 가산점(희소·실무)을 체크하면 자동으로 검수완료 처리돼요.
          기본점수는 링크 1점·문서 2점 자동. (최소 {MIN}개 기준)
        </p>

        <div className="flex items-center gap-2 border-2 border-[var(--border)] focus-within:border-[var(--accent)] rounded-[var(--r-sm)] px-3 py-2 bg-[var(--bg)] transition max-w-md">
          <Search size={16} className="text-[var(--muted-2)] shrink-0" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목·등록자로 찾기"
            aria-label="자료 검색"
            className="flex-1 bg-transparent outline-none text-sm text-[var(--fg)] placeholder:text-[var(--muted-2)]"
          />
          {q && <button type="button" onClick={() => setQ('')} className="text-[var(--muted-2)] hover:text-[var(--fg)] text-xs">지우기</button>}
        </div>

        {/* 필터 — 형식 / 검수여부 */}
        <div className="flex flex-wrap gap-1.5">
          {([['', '형식 전체'], ['문서', '문서'], ['링크', '링크']] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTypeF(k)} className={chip(typeF === k)}>{l}</button>
          ))}
          <span className="w-px bg-[var(--border)] mx-1" />
          {([['', '검수 전체'], ['todo', '미검수'], ['done', '검수완료']] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setReviewF(k)} className={chip(reviewF === k)}>{l}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--muted-2)] py-3">해당 자료가 없어요.</p>
        ) : (
          <div className="border border-[var(--border)] rounded-[var(--r-sm)] overflow-hidden divide-y divide-[var(--border)]">
            {filtered.map((r) => (
              <div key={r.id} className={`flex items-center gap-3 px-3 py-2.5 transition border-l-[3px] ${r.reviewed ? 'bg-[color-mix(in_srgb,var(--accent)_6%,var(--bg))] border-[var(--accent)]' : 'border-transparent hover:bg-[var(--card)]'}`}>
                {/* 왼쪽 검수 상태 토글 — 한눈에 미검수/검수완료 구분 */}
                <button
                  type="button"
                  onClick={() => toggleReviewed(r.id)}
                  disabled={pending}
                  title={r.reviewed ? '검수완료 — 클릭하면 미검수로 되돌려요' : '클릭하면 검수완료로 표시돼요'}
                  className={`shrink-0 inline-flex items-center gap-1 w-[74px] justify-center px-2 py-1.5 rounded-full text-[11px] font-semibold border transition ${
                    r.reviewed
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'bg-[var(--bg)] text-[var(--muted-2)] border-[var(--border-strong)] hover:text-[var(--fg)]'
                  }`}
                >
                  {r.reviewed ? <><Check size={12} aria-hidden />검수완료</> : '미검수'}
                </button>

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
                  <div className="text-[11px] text-[var(--muted-2)] mt-0.5">
                    <button type="button" onClick={() => setQ(r.proposer)} className="hover:text-[var(--accent)] hover:underline">{r.proposer}</button>
                    {' · '}{r.date} · 총 {rowTotal(r)}점
                  </div>
                </div>

                {/* 오른쪽 가산점 그룹 */}
                <div className="flex items-center gap-2.5 shrink-0 text-xs">
                  <span className="text-[10px] text-[var(--muted-2)] hidden sm:inline">가산</span>
                  <label className="inline-flex items-center gap-1 cursor-pointer select-none" title="희소성 +1">
                    <input type="checkbox" checked={r.rarity} disabled={pending} onChange={() => toggleBonus(r.id, 'rarity')} className="accent-[var(--accent)] w-3.5 h-3.5" />
                    <span className="text-[var(--muted)]">희소<span className="text-[var(--muted-2)]">+1</span></span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer select-none" title="실무형 +2">
                    <input type="checkbox" checked={r.practical} disabled={pending} onChange={() => toggleBonus(r.id, 'practical')} className="accent-[var(--accent)] w-3.5 h-3.5" />
                    <span className="text-[var(--muted)]">실무<span className="text-[var(--muted-2)]">+2</span></span>
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
