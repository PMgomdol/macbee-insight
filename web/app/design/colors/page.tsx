import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '프라이머리 컬러 비교 — 맥비 자료실',
  robots: { index: false },
};

/**
 * 프라이머리 컬러 후보 비교 (임시) — 결정 후 삭제.
 * 각 패널은 CSS 변수만 로컬 오버라이드 — 실제 컴포넌트 레시피 그대로 렌더.
 */

type Palette = {
  name: string;
  ref: string;
  accent: string;
  hover: string;
  accentBg: string;
  note: string;
  linkColor?: string; // 블랙 팔레트: 링크만 기능색 블루 유지
};

const PALETTES: Palette[] = [
  {
    name: '현행 · 블루',
    ref: '원티드·Atlassian 계열',
    accent: '#1868DB',
    hover: '#1558BC',
    accentBg: '#E9F2FE',
    note: '안전하고 익숙함. 다만 업무툴 인상 — 로고(블랙)와 출처가 다른 색.',
  },
  {
    name: 'A · 잉크 블랙',
    ref: '브런치·퍼블리·무신사',
    accent: '#1B1C1F',
    hover: '#33353A',
    accentBg: '#F0F1F2',
    note: '로고와 같은 색 = 브랜드 일관. 콘텐츠가 주인공인 아카이브에 맞음. 링크는 블루 유지.',
    linkColor: '#1868DB',
  },
  {
    name: 'B · 딥 그린',
    ref: '인프런 계열 톤다운',
    accent: '#0E8345',
    hover: '#0A6A38',
    accentBg: '#E7F5EC',
    note: '교육 플랫폼 연상. 성장·학습 무드. 오픈패스 틸과는 거리 있는 그린.',
  },
  {
    name: 'C · 웜 오렌지',
    ref: '클래스101 계열 톤다운',
    accent: '#D9560B',
    hover: '#B84A0A',
    accentBg: '#FCEEE3',
    note: '배너 폴더 아이콘(크림·옐로)과 온도 맞음. 경고색과 계열 겹침 주의.',
  },
];

function Panel({ p }: { p: Palette }) {
  const link = p.linkColor ?? p.accent;
  return (
    <div
      className="flex flex-col gap-4 p-5 border border-[var(--border)] rounded-[var(--r-lg)] bg-white"
      style={{
        ['--accent' as string]: p.accent,
        ['--accent-hover' as string]: p.hover,
        ['--accent-bg' as string]: p.accentBg,
      }}
    >
      <div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-bold">{p.name}</h2>
          <span className="text-[11px] text-[var(--muted-2)]">{p.ref} · {p.accent}</span>
        </div>
        <p className="text-[11px] text-[var(--muted)] mt-0.5">{p.note}</p>
      </div>

      {/* 헤더 조각 */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
        <span className="flex items-center gap-1 font-bold text-sm">
          <svg viewBox="0 0 64 64" className="w-[16px] h-[16px]" aria-hidden fill="#1B1C1F">
            <path d="M10 44V10h13l9 17 9-17h13v34H42V28l-7 13h-6l-7-13v16z" />
            <rect x="10" y="50" width="44" height="6" rx="2" />
          </svg>
          맥비 자료실
        </span>
        <span className="text-[11px] text-[var(--muted)]">
          안재찬 <span style={{ color: p.accent }}>·운영진</span>
        </span>
      </div>

      {/* 버튼 */}
      <div className="flex flex-wrap gap-1.5">
        <span className="px-3.5 py-1.5 rounded-[var(--r-md)] text-white text-xs font-medium" style={{ background: p.accent }}>
          자료 제안하기
        </span>
        <span className="px-3.5 py-1.5 rounded-[var(--r-md)] border border-[var(--border)] text-xs">
          더 보기
        </span>
      </div>

      {/* 칩 */}
      <div className="flex flex-wrap gap-1">
        <span className="px-2.5 py-1 rounded-full text-[11px] border text-white" style={{ background: p.accent, borderColor: p.accent }}>
          기획/PM (214)
        </span>
        <span className="px-2.5 py-1 rounded-full text-[11px] border border-[var(--border)] text-[var(--muted)]">
          UX/디자인 (98)
        </span>
        <span className="px-2.5 py-1 rounded-full text-[11px] border border-[var(--border)] text-[var(--muted)]">
          개발/기술 (57)
        </span>
      </div>

      {/* 탭 + 링크 */}
      <div>
        <div className="flex gap-1 border-b border-[var(--border)] text-xs">
          <span className="px-3 py-2 -mb-px border-b-2 font-semibold" style={{ borderColor: p.accent, color: p.accent }}>URL 등록</span>
          <span className="px-3 py-2 -mb-px border-b-2 border-transparent text-[var(--muted)]">파일 업로드</span>
        </div>
        <p className="text-xs mt-2.5 text-[var(--fg)]">
          검색 결과에서{' '}
          <span className="underline decoration-dotted underline-offset-2" style={{ color: link }}>
            PRD 템플릿 모음
          </span>
          {' '}링크를 눌러 이동합니다.
        </p>
      </div>

      {/* 카드 */}
      <div className="app-card p-3">
        <div className="flex items-center justify-between">
          <strong className="text-xs">서비스 정책서 작성 가이드</strong>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: p.accentBg, color: p.accent }}>
            아티클
          </span>
        </div>
        <p className="text-[11px] text-[var(--muted)] mt-1">정책서에 담아야 할 항목과 작성 순서 정리</p>
      </div>
    </div>
  );
}

export default function ColorCompare() {
  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight pt-2">프라이머리 컬러 비교</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          같은 컴포넌트를 색만 바꿔 렌더. 로고·본문·테두리는 전 패널 동일 (실제 조건).
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PALETTES.map((p) => <Panel key={p.name} p={p} />)}
      </div>
    </div>
  );
}
