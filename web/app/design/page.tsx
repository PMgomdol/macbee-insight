import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '디자인 가이드 — 맥비 자료실',
  robots: { index: false },
};

/**
 * 내부 스타일가이드 (비공개 URL) — 컴포넌트 표준의 단일 기준.
 * 새 UI를 만들 때 여기 레시피의 클래스를 그대로 복사해 쓴다.
 * 규칙 요약은 web/AGENTS.md 'UI 일관성 규칙' 참조.
 */

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 py-6 border-b border-[var(--border)]">
      <div>
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
        {desc && <p className="text-xs text-[var(--muted)] mt-0.5">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function Recipe({ code }: { code: string }) {
  return (
    <pre className="text-[11px] leading-relaxed text-[var(--muted)] bg-[var(--card)] rounded-[var(--r-sm)] px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">
      {code}
    </pre>
  );
}

export default function DesignGuide() {
  return (
    <div className="flex flex-col gap-2 max-w-3xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight pt-2">디자인 가이드</h1>
      <p className="text-sm text-[var(--muted)]">
        컴포넌트 표준 (2026-08-09 정립). 같은 모양 = 같은 역할 — 새 UI는 아래 레시피를 그대로 사용.
      </p>

      <Section title="컬러 — Primary (Toss Blue 스케일)" desc="기본은 시맨틱 토큰(--accent 등)만 사용. 스케일 직접 참조는 배너 등 프로모 영역만.">
        <div className="flex flex-wrap gap-2 text-[10px]">
          {[
            ['50', '#E8F3FF', '--accent-bg · 옅은 배경'],
            ['100', '#C9E2FF', ''],
            ['300', '#64A8FF', '--focus-ring'],
            ['500', '#3182F6', '--accent · primary'],
            ['600', '#1B64DA', '--accent-hover'],
            ['700', '#1957C2', '--accent-pressed'],
            ['900', '#194086', '배너 텍스트'],
          ].map(([step, hex, role]) => (
            <div key={step} className="flex flex-col gap-1 w-[76px]">
              <div className="h-12 rounded-[var(--r-sm)] border border-[var(--border)]" style={{ background: hex }} />
              <strong>{step}</strong>
              <span className="text-[var(--muted)]">{hex}</span>
              {role && <span className="text-[var(--muted-2)]">{role}</span>}
            </div>
          ))}
        </div>
      </Section>

      <Section title="컬러 — Neutral · Semantic" desc="글자·면·테두리는 Neutral 토큰, 상태 표시는 Semantic 토큰.">
        <div className="flex flex-wrap gap-2 text-[10px]">
          {[
            ['fg', 'var(--fg)', '본문 텍스트'],
            ['muted', 'var(--muted)', '보조 텍스트'],
            ['muted-2', 'var(--muted-2)', '힌트·메타'],
            ['border', 'var(--border)', '기본 테두리'],
            ['border-strong', 'var(--border-strong)', '인풋 테두리'],
            ['card', 'var(--card)', '옅은 면'],
            ['bg-alt', 'var(--bg-alt)', '구역 배경'],
          ].map(([name, v, role]) => (
            <div key={name} className="flex flex-col gap-1 w-[76px]">
              <div className="h-12 rounded-[var(--r-sm)] border border-[var(--border)]" style={{ background: v }} />
              <strong>{name}</strong>
              <span className="text-[var(--muted-2)]">{role}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          {[
            ['success', 'var(--success)', '완료·정상'],
            ['warning', 'var(--warning)', '주의'],
            ['danger', 'var(--danger)', '오류·삭제'],
          ].map(([name, v, role]) => (
            <div key={name} className="flex flex-col gap-1 w-[76px]">
              <div className="h-12 rounded-[var(--r-sm)]" style={{ background: v }} />
              <strong>{name}</strong>
              <span className="text-[var(--muted-2)]">{role}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="타이포 스케일" desc="Pretendard. 이 6단계 밖의 크기 임의 사용 금지.">
        <div className="flex flex-col gap-2.5">
          <p className="text-xl sm:text-2xl font-bold tracking-tight">페이지 제목 — text-xl sm:text-2xl font-bold tracking-tight</p>
          <p className="text-base font-bold tracking-tight">섹션 제목 — text-base font-bold tracking-tight</p>
          <p className="text-sm font-medium">항목 제목·라벨 — text-sm font-medium</p>
          <p className="text-sm">본문 — text-sm (기본 14px)</p>
          <p className="text-xs text-[var(--muted)]">캡션·설명 — text-xs text-[var(--muted)]</p>
          <p className="text-[11px] text-[var(--muted-2)]">마이크로·메타 — text-[11px] text-[var(--muted-2)]</p>
        </div>
      </Section>

      <Section title="라운드 스케일" desc="3단계 토큰 + full. 임의 px 값 금지 — 반드시 토큰 사용.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            ['--r-sm · 6px', 'rounded-[var(--r-sm)]', '알림 박스, 작은 컨트롤, 스켈레톤'],
            ['--r-md · 8px', 'rounded-[var(--r-md)]', '버튼, 폼 필드, 리스트 hover'],
            ['--r-lg · 12px', 'rounded-[var(--r-lg)]', '카드, 모달, 배너, 드롭존'],
            ['full', 'rounded-full', '칩, 태그, 검색 인풋, 도트'],
          ].map(([label, cls, use]) => (
            <div key={label} className="flex flex-col gap-1.5 items-start">
              <div className={`w-full h-14 border-2 border-[var(--border-strong)] bg-[var(--card)] ${cls}`} />
              <strong>{label}</strong>
              <span className="text-[var(--muted)]">{use}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="버튼 — 3위계" desc="화면당 프라이머리는 1개 원칙. 파란 버튼 글자는 항상 흰색 (hover 포함).">
        <div className="flex flex-wrap items-center gap-2">
          <button className="px-4 py-2 rounded-[var(--r-md)] bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] active:bg-[var(--accent-pressed)]">
            프라이머리 — 핵심 행동
          </button>
          <button className="px-4 py-2 rounded-[var(--r-md)] border border-[var(--border)] text-sm hover:bg-[var(--card)]">
            세컨더리 — 대안 행동
          </button>
          <button className="px-3 py-2 rounded-[var(--r-md)] text-sm text-[var(--accent)] font-medium hover:bg-[var(--accent-bg)]">
            터시어리 — 보조 행동
          </button>
          <button className="px-2 py-1 rounded-[var(--r-sm)] border border-[var(--border)] text-xs text-[var(--muted)] hover:bg-[var(--card)]">
            소형 (로그아웃 등)
          </button>
          <button className="px-4 py-2 rounded-[var(--r-md)] bg-[var(--accent)] text-white text-sm font-medium opacity-50" disabled>
            비활성
          </button>
        </div>
        <Recipe code={`프라이머리: px-4 py-2 rounded-[var(--r-md)] bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] active:bg-[var(--accent-pressed)]
세컨더리:   px-4 py-2 rounded-[var(--r-md)] border border-[var(--border)] text-sm hover:bg-[var(--card)]
터시어리:   px-3 py-2 rounded-[var(--r-md)] text-sm text-[var(--accent)] font-medium hover:bg-[var(--accent-bg)]`} />
      </Section>

      <Section title="칩 (필터 전용)" desc="rounded-full. 누르면 목록이 좁혀지는 필터에만 사용 — 네비게이션 금지.">
        <div className="flex flex-wrap gap-1.5">
          <span className="px-3 py-1.5 rounded-full text-xs sm:text-sm border bg-[var(--accent)] text-white border-[var(--accent)]">
            선택됨 (12)
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs sm:text-sm border border-[var(--border)] text-[var(--muted)]">
            기본 (34)
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs sm:text-sm border border-[var(--border)] text-[var(--muted-2)] opacity-50">
            비활성 (0)
          </span>
        </div>
        <Recipe code={`선택: px-3 py-1.5 rounded-full text-xs sm:text-sm border bg-[var(--accent)] text-white border-[var(--accent)]
기본: px-3 py-1.5 rounded-full text-xs sm:text-sm border border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]`} />
      </Section>

      <Section title="탭 (전환·네비게이션)" desc="밑줄 스타일. 화면 내 모드 전환·구획 이동에 사용 — 칩 모양 금지.">
        <div className="flex gap-1 border-b border-[var(--border)]">
          <span className="px-4 py-2.5 text-sm -mb-px border-b-2 border-[var(--accent)] text-[var(--accent)] font-semibold">활성 탭</span>
          <span className="px-4 py-2.5 text-sm -mb-px border-b-2 border-transparent text-[var(--muted)]">기본 탭</span>
        </div>
        <Recipe code={`활성: px-4 py-2.5 text-sm -mb-px border-b-2 border-[var(--accent)] text-[var(--accent)] font-semibold
기본: px-4 py-2.5 text-sm -mb-px border-b-2 border-transparent text-[var(--muted)] hover:text-[var(--fg)]`} />
      </Section>

      <Section title="인풋" desc="검색·URL 등 단일행 핵심 인풋 = 필(full). 폼 내부 일반 필드 = @atlaskit Textfield 유지.">
        <div className="flex flex-col gap-2 max-w-md">
          <div className="flex items-center gap-2 px-4 h-11 rounded-full border border-[var(--border-strong)] bg-[var(--bg)]">
            <span className="text-[var(--muted)] text-sm">돋보기 아이콘 + 검색 인풋 (h-11, 1px strong)</span>
          </div>
        </div>
        <Recipe code={`필 인풋: h-11 px-4 rounded-full border border-[var(--border-strong)] bg-[var(--bg)] text-sm focus:border-[var(--focus-ring)] (또는 focus-within)`} />
      </Section>

      <Section title="카드" desc="app-card 클래스 (라운드 lg 12px, hover 시 그림자+테두리 강조).">
        <div className="app-card p-4 max-w-xs">
          <strong className="text-sm">카드 제목</strong>
          <p className="text-xs text-[var(--muted)] mt-1">.app-card 클래스 하나로 통일. 개별 라운드 지정 금지.</p>
        </div>
      </Section>

      <Section title="알림 박스" desc="라운드 sm(6px), 시맨틱 컬러 30~50% 테두리 + 10% 배경.">
        <div className="flex flex-col gap-2 max-w-md text-sm">
          <div className="p-3 rounded-[var(--r-sm)] border border-[var(--accent)]/30 bg-[var(--accent-bg)]">안내 — accent</div>
          <div className="p-3 rounded-[var(--r-sm)] border border-[var(--warning)]/50 bg-[var(--warning)]/10">주의 — warning</div>
          <div className="p-3 rounded-[var(--r-sm)] border border-[var(--danger)]/40 bg-[var(--danger)]/10">오류 — danger</div>
        </div>
      </Section>

      <Section title="색 단계 (배너 등 프로모 영역)" desc="같은 계열 3단: 배경 50 / 포인트 500 / 텍스트 900.">
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="rounded-[var(--r-lg)] px-5 py-4" style={{ background: '#E8F3FF', color: '#194086' }}>
            <span className="px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wider" style={{ color: '#3182F6', borderColor: '#3182F6' }}>BLUE</span>
            <p className="font-bold mt-1.5">50 배경 · 500 뱃지 · 900 텍스트</p>
          </div>
          <div className="rounded-[var(--r-lg)] px-5 py-4" style={{ background: '#FFF7D6', color: '#533F04' }}>
            <span className="px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wider" style={{ color: '#946F00', borderColor: '#946F00' }}>YELLOW</span>
            <p className="font-bold mt-1.5">50 배경 · 500 뱃지 · 900 텍스트</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
