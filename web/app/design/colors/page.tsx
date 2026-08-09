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

// 전부 실서비스의 실제 프라이머리 컬러 원본값 (톤다운 없음)
const PALETTES: Palette[] = [
  {
    name: '현행',
    ref: 'Atlassian Blue',
    accent: '#1868DB',
    hover: '#1558BC',
    accentBg: '#E9F2FE',
    note: '현재 상태. 업무툴 인상.',
  },
  {
    name: '잉크 블랙',
    ref: '브런치·무신사·퍼블리',
    accent: '#1B1C1F',
    hover: '#33353A',
    accentBg: '#F0F1F2',
    note: '로고와 같은 색. 콘텐츠 플랫폼 모노톤 — 링크만 블루 유지.',
    linkColor: '#3182F6',
  },
  {
    name: '토스 블루',
    ref: '토스',
    accent: '#3182F6',
    hover: '#2272E0',
    accentBg: '#EAF2FE',
    note: '현행보다 밝고 경쾌한 블루. 익숙함 유지하면서 인상만 젊게.',
  },
  {
    name: '벨로그 틸',
    ref: 'velog',
    accent: '#12B886',
    hover: '#0FA274',
    accentBg: '#E6F7F1',
    note: '개발·지식 블로그 무드. 아카이브·기록 정체성과 잘 붙음.',
  },
  {
    name: '네이버 그린',
    ref: '네이버',
    accent: '#03C75A',
    hover: '#02AB4E',
    accentBg: '#E5F9EE',
    note: '흰 글자 대비 낮은 편(주로 검정 글자와 조합하는 색) — 참고용.',
  },
  {
    name: '당근 오렌지',
    ref: '당근',
    accent: '#FF6F0F',
    hover: '#E85F06',
    accentBg: '#FFF1E6',
    note: '커뮤니티·동네 무드. 배너 크림 톤과 온도 맞음.',
  },
  {
    name: '컬리 퍼플',
    ref: '마켓컬리',
    accent: '#5F0080',
    hover: '#4C0066',
    accentBg: '#F5E9F9',
    note: '희소한 계열이라 기억에 남음. 무게감 있는 프리미엄 톤.',
  },
  {
    name: '채널톡 바이올렛',
    ref: '채널톡·flex 계열',
    accent: '#5E56F0',
    hover: '#4B44D6',
    accentBg: '#EEEDFD',
    note: 'SaaS·프로덕트 툴 무드. 기획자 타깃과 결이 맞는 색.',
  },
  {
    name: '왓챠 핑크',
    ref: '왓챠',
    accent: '#FF0558',
    hover: '#E00050',
    accentBg: '#FFE9EF',
    note: '강한 개성. 자료실 톤에는 과할 수 있음 — 스펙트럼 끝 참고용.',
  },
  {
    name: '리디 블루',
    ref: '리디',
    accent: '#1E9EFF',
    hover: '#158AE4',
    accentBg: '#E8F5FF',
    note: '책·읽기 서비스의 하늘색. 밝고 개방적인 인상.',
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
