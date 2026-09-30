import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '자료 등록 챌린지 · 맥비 자료실',
  description: '10월 한 달, 기획·PM·IT 실무 자료를 등록하고 상품을 받아가세요. 참여 방법·평가 기준·시상 내역 안내.',
};

const REWARDS = [
  { rank: '1위', who: '최우수 아카이빙 챔피언 · 1명', prize: '상품권 10만 원' },
  { rank: '2위', who: '우수 기여 멤버 · 1명', prize: '상품권 5만 원' },
  { rank: '3위', who: '성실 참여 멤버 · 2명', prize: '상품권 2만 원' },
  { rank: '4위', who: '성실 참여 멤버 · 10명', prize: '상품권 1만 원' },
];

const EXAMPLES = [
  { cat: '기획/PM 산출물', items: '서비스 정책서, PRD, 기능 정의서(IA), 와이어프레임 템플릿' },
  { cat: 'AI & 실무 생산성', items: '업무용 프롬프트, 기획·리서치 자동화 워크플로우, AI 툴 활용 노하우' },
  { cat: '리서치 & 데이터', items: '시장·경쟁사 분석 리포트, 지표 대시보드 템플릿, UX 리서치 요약' },
  { cat: '협업 자료', items: 'API 명세서 읽는 법, 개발·디자인 협업 체크리스트, 커뮤니케이션 템플릿' },
  { cat: '실무 꿀팁 · 아티클', items: '생산성을 올려준 템플릿, 북마크해둔 실무 아티클' },
];

const SCORES = [
  { label: '링크 자료', pt: '1점', desc: '유용한 아티클, 툴·서비스 링크, 리포트 원문 링크' },
  { label: '문서·파일 자료', pt: '2점', desc: '다운로드 가능한 템플릿·기획서 (PDF·PPT·Figma·Excel 등)' },
  { label: '희소성 가산', pt: '+1점', desc: '시중에서 구하기 힘든 전문 분석 자료, 독창적 방법론' },
  { label: '실무 현장형 가산', pt: '+2점', desc: '실제 프로젝트에 활용된 완성도 높은 산출물·프레임워크' },
];

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-bold text-[var(--accent)] tabular-nums">{n}</span>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function EventPage() {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-10 sm:gap-12 py-8 sm:py-12">
      {/* Hero */}
      <header className="flex flex-col items-start gap-4 rounded-[var(--r-lg)] p-6 sm:p-9 bg-[#E6F4EA] text-[#0B5323]">
        <span className="text-[10px] font-semibold tracking-[0.08em] px-2 py-0.5 rounded-full border border-[#1E8E3E] text-[#1E8E3E]">
          EVENT · 2026.10
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
          기획·PM·IT 실무 자료<br />등록 챌린지
        </h1>
        <p className="text-sm sm:text-base leading-relaxed opacity-80">
          현업에서 진짜 쓰는 자료를 맥비 자료실에 모아주세요.<br className="hidden sm:block" />
          혼자 보기 아까웠던 인사이트와 템플릿을 공유하고 상품도 받아가세요.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            href="/submit"
            className="inline-flex items-center px-5 py-2.5 rounded-[var(--r-sm)] bg-[#1E8E3E] text-white text-sm font-semibold hover:brightness-95 transition"
          >
            자료 등록하러 가기
          </Link>
          <span className="text-xs opacity-70">10월 1일 ~ 10월 31일 · 맥비기획 전 멤버</span>
        </div>
      </header>

      <Section n="01" title="이벤트 개요">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            ['진행 기간', '10/1(목) ~ 10/31(토)'],
            ['참여 대상', '맥비기획 모든 멤버'],
            ['결과 발표', '11/4(수) 예정'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[var(--r-md)] border border-[var(--border)] p-3">
              <div className="text-[11px] text-[var(--muted-2)]">{k}</div>
              <div className="text-sm font-semibold mt-0.5">{v}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section n="02" title="참여 방법">
        <ol className="flex flex-col gap-2 text-sm text-[var(--muted)]">
          <li><b className="text-[var(--fg)]">1.</b> 자료실에서 기획/PM/IT 실무에 유익한 자료를 등록해요.</li>
          <li><b className="text-[var(--fg)]">2.</b> 운영진이 기준에 따라 검토 후 <b className="text-[var(--fg)]">승인</b>하면 자료실에 반영돼요.</li>
          <li className="text-[var(--muted-2)] text-[13px]">무분별한 도배·성의 없는 글 방지를 위해 승인제로 운영됩니다.</li>
        </ol>
      </Section>

      <Section n="03" title="이런 자료를 환영해요">
        <div className="flex flex-col divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {EXAMPLES.map((e) => (
            <div key={e.cat} className="flex flex-col sm:flex-row sm:gap-4 py-2.5">
              <div className="text-sm font-semibold sm:w-40 shrink-0">{e.cat}</div>
              <div className="text-[13px] text-[var(--muted)] leading-relaxed">{e.items}</div>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-[var(--muted-2)]">국문·영문 자료 모두 환영해요.</p>
      </Section>

      <Section n="04" title="평가 방식">
        <div className="rounded-[var(--r-md)] border border-[var(--border)] p-4 flex flex-col gap-1">
          <div className="text-sm font-semibold">기본 자격 (성실도)</div>
          <p className="text-[13px] text-[var(--muted)] leading-relaxed">
            이벤트 기간 동안 <b className="text-[var(--fg)]">승인 기준 최소 15개 이상</b> 등록 (2일에 1개 페이스).
            하루 등록 개수 제한은 없어요.
          </p>
        </div>
        <div className="text-sm font-semibold mt-1">점수 (품질)</div>
        <div className="flex flex-col divide-y divide-[var(--border)] border border-[var(--border)] rounded-[var(--r-md)] overflow-hidden">
          {SCORES.map((s) => (
            <div key={s.label} className="flex items-center gap-3 px-3 py-2.5">
              <span className="text-sm font-bold text-[var(--accent)] tabular-nums w-12 shrink-0">{s.pt}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-[12px] text-[var(--muted-2)]">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-[var(--r-md)] bg-[var(--card)] p-3 text-[13px] text-[var(--muted)] leading-relaxed">
          <b className="text-[var(--fg)]">점수 예시</b><br />
          · 웹 아티클 링크 = 1점 · 일반 템플릿 문서 = 2점<br />
          · 구하기 힘든 심층 분석 문서 = 2 + 1(희소) = <b className="text-[var(--fg)]">3점</b><br />
          · 자체 제작 고도화 기획서 = 2 + 1(희소) + 2(실무) = <b className="text-[var(--fg)]">5점</b>
        </div>
        <p className="text-[12px] text-[var(--muted-2)]">
          동점 시: 총점 &gt; 문서(파일) 등록 수 &gt; 최소 개수 먼저 달성 순으로 순위를 정해요.
        </p>
      </Section>

      <Section n="05" title="시상 내역">
        <div className="flex flex-col gap-2">
          {REWARDS.map((r) => (
            <div key={r.rank} className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-bold text-[var(--accent)] w-9 shrink-0">{r.rank}</span>
                <span className="text-[13px] text-[var(--muted)] truncate">{r.who}</span>
              </div>
              <span className="text-sm font-semibold shrink-0">{r.prize}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section n="06" title="등록 시 꼭 확인해주세요">
        <ul className="flex flex-col gap-2.5 text-[13px] text-[var(--muted)] leading-relaxed">
          <li><b className="text-[var(--fg)]">보안·개인정보</b> — 회사 기밀, 고객 개인정보, 민감 수치는 반드시 마스킹(비식별화) 후 올려주세요.</li>
          <li><b className="text-[var(--fg)]">공유 설정</b> — 드라이브·구글 문서 링크는 <b className="text-[var(--fg)]">‘링크 있는 모든 사용자 - 뷰어’</b>로 열어주셔야 다른 멤버가 볼 수 있어요.</li>
          <li><b className="text-[var(--fg)]">도배 방지</b> — 자료 출처·추천 이유·핵심 요약 2~3줄이 있어야 승인돼요.</li>
          <li><b className="text-[var(--fg)]">저작권</b> — 배포가 금지된 저작물은 승인이 반려될 수 있어요.</li>
        </ul>
      </Section>

      <div className="flex flex-col items-center gap-3 rounded-[var(--r-lg)] border border-[var(--border)] p-6 text-center">
        <p className="text-sm text-[var(--muted)]">기획자·PM의 집단지성으로 더 든든해질 맥비 자료실, 함께 채워가요.</p>
        <Link
          href="/submit"
          className="inline-flex items-center px-6 py-3 rounded-[var(--r-sm)] bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-hover)] transition"
        >
          지금 자료 등록하기
        </Link>
      </div>
    </div>
  );
}
