import { existsSync } from 'node:fs';
import { join } from 'node:path';
import Link from 'next/link';
import { UILinkButton } from '@/components/ui/Button';
import { getAuthState } from '@/lib/auth';

export const metadata = { title: '운영 가이드 · 운영/관리' };

// 스크린샷 파일이 아직 없으면 깨진 이미지 대신 자리표시를 보여줌.
function shotExists(src: string): boolean {
  try { return existsSync(join(process.cwd(), 'public', src.replace(/^\//, ''))); } catch { return false; }
}

/* eslint-disable @next/next/no-img-element -- 관리자 내부 페이지, 이미지 최적화 불필요 */
function Shot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  const ok = shotExists(src);
  return (
    <figure className="flex flex-col gap-1.5 my-1">
      {ok ? (
        <div className="overflow-hidden rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--card)]">
          <img src={src} alt={alt} className="w-full h-auto block" loading="lazy" />
        </div>
      ) : (
        <div className="rounded-[var(--r-md)] border border-dashed border-[var(--border)] bg-[var(--card)] py-8 px-3 flex flex-col items-center justify-center gap-1 text-center">
          <span className="text-[13px] font-medium text-[var(--muted)]">스크린샷 예정</span>
          <span className="text-[11px] text-[var(--muted-2)] font-mono">{src.replace('/guide-assets/', '')}</span>
        </div>
      )}
      {caption && <figcaption className="text-[11px] text-[var(--muted-2)]">{caption}</figcaption>}
    </figure>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={`s${n}`} className="flex flex-col gap-3 scroll-mt-20">
      <h2 className="text-base sm:text-lg font-bold tracking-tight border-b border-[var(--border)] pb-1.5">
        <span className="text-[var(--muted-2)] font-mono text-sm mr-2">{n}</span>{title}
      </h2>
      <div className="text-sm leading-relaxed text-[var(--fg)] flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal pl-5 flex flex-col gap-1.5 marker:text-[var(--muted-2)]">{children}</ol>;
}
function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 flex flex-col gap-1.5">{children}</ul>;
}
function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--muted)]">
      {children}
    </div>
  );
}
function K({ children }: { children: React.ReactNode }) {
  return <code className="px-1 py-0.5 rounded bg-[var(--card)] text-[var(--fg)] text-[12px] border border-[var(--border)]">{children}</code>;
}

const TOC = [
  ['1', '접속과 로그인'],
  ['2', '화면 한눈에'],
  ['3', '자료 등록요청 처리'],
  ['4', '자료 관리 — 수정·숨김·삭제·복원'],
  ['5', '카테고리 관리'],
  ['6', '의견(VOC) 관리'],
  ['7', '백로그 보드'],
  ['8', '운영진 초대·권한'],
  ['9', '대시보드'],
  ['10', '업데이트 내역'],
  ['11', '전체 흐름 — 제안이 어떻게 게시되나'],
  ['12', '알림 메일'],
  ['13', '콘텐츠 작성 규칙'],
  ['14', '자주 묻는 것'],
] as const;

export default async function GuidePage() {
  const { user, isReviewer, displayName, role } = await getAuthState();

  if (!user || !isReviewer) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8 mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">운영 가이드</h1>
        <p className="text-sm text-[var(--muted)]">운영진만 볼 수 있어요.</p>
        <UILinkButton href="/admin-mb26" className="w-fit">로그인</UILinkButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <section className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">운영 가이드</h1>
          <span className="text-xs text-[var(--muted-2)]">{displayName ?? user?.email} · {role === 'admin' ? '관리자' : '운영진'}</span>
        </div>
        <p className="text-sm text-[var(--muted)]">
          운영진이 새로 합류하거나 바뀌어도 이 문서 하나로 같은 업무를 할 수 있게 정리했어요. 최종 갱신: 2026-08-20.
        </p>
      </section>

      {/* 목차 */}
      <nav className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--card)] p-3">
        <p className="text-[11px] font-semibold text-[var(--muted-2)] mb-1.5">목차</p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
          {TOC.map(([n, t]) => (
            <li key={n}>
              <a href={`#s${n}`} className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
                <span className="font-mono text-[var(--muted-2)] mr-1.5">{n}</span>{t}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Section n="1" title="접속과 로그인">
        <p>운영은 모두 관리자 페이지 <K>macbe-archive.com/admin-mb26</K> 에서 해요. 검색엔진에는 노출되지 않는 주소예요.</p>
        <Step>
          <li><b>Google 계정으로 로그인</b> — 회사 계정 노출 방지를 위해 <K>asa067714@gmail.com</K> 계열 개인 계정 사용.</li>
          <li>로그인 후 운영진(reviewer·admin) 권한이 있으면 좌측 메뉴가 있는 관리 화면으로 들어가져요.</li>
          <li>권한이 없으면 <b>운영진 신청 폼</b>이 보여요 — 신청하면 기존 admin이 권한을 부여해요(§8).</li>
        </Step>
        <Shot src="/guide-assets/01-login.png" alt="운영진 진입 로그인 화면" caption="① macbe-archive.com/admin-mb26 — Google 로그인" />
        <Note>권한 3단계 — <b>admin</b>: 전체(승인·강제승인·권한부여) · <b>reviewer</b>: 제안 승인·반려 · <b>일반 로그인</b>: 자료 제안만.</Note>
      </Section>

      <Section n="2" title="화면 한눈에">
        <p>왼쪽 메뉴로 모든 기능에 접근해요. 각 메뉴가 하는 일:</p>
        <Ul>
          <li><b>홈</b> — 진입점·요약</li>
          <li><b>대시보드</b> — 방문·인기 자료·검색어 지표</li>
          <li><b>자료등록요청</b> — 방문자 제안 검토·승인·반려 (숫자 배지 = 대기 건수)</li>
          <li><b>자료 관리</b> — 게시된 자료 수정·숨김·삭제·복원</li>
          <li><b>카테고리</b> — 대분류/소분류 추가·이름변경</li>
          <li><b>VOC</b> — 방문자 의견·버그·문의</li>
          <li><b>백로그</b> — 운영 할 일 보드</li>
          <li><b>운영진 초대</b> — 새 운영진 권한 부여</li>
          <li><b>업데이트 내역</b> — 사이트 변경 이력</li>
        </Ul>
        <Shot src="/guide-assets/02-panel-home.png" alt="관리자 홈 화면과 좌측 메뉴" caption="② 관리자 홈 — 좌측 메뉴 9개" />
      </Section>

      <Section n="3" title="자료 등록요청 처리">
        <p>방문자가 <K>/submit</K> 폼으로 제안하면 여기 <b>대기(pending)</b>로 쌓여요. 처리 순서:</p>
        <Step>
          <li><b>내용 확인</b> — 링크 열리는지, 중복 아닌지(제출 시 자동 중복검사 있음), 자료실 성격에 맞는지.</li>
          <li><b>보정</b> — 제목·한줄설명·분류·태그·형식을 규칙(§13)에 맞게 다듬어요.</li>
          <li><b>승인</b> — <b>운영진 2명</b>이 승인하면 자동으로 자료실에 게시돼요. admin은 2인 미확보 시 <b>단독 승인(사유 필수)</b> 가능.</li>
          <li><b>반려</b> — 사유를 적으면 제안자에게 안내 메일이 가요.</li>
        </Step>
        <Shot src="/guide-assets/03-requests.png" alt="자료 등록요청 목록 화면" caption="③ 자료등록요청 — 대기 제안 검토·승인·반려" />
        <Note>승인·반려하면 제안자 이메일로 결과가 자동 발송돼요(§12). 승인분은 Supabase에 바로 게시 → 사이트 캐시로 최대 몇 분 지연.</Note>
      </Section>

      <Section n="4" title="자료 관리 — 수정·숨김·삭제·복원">
        <p>게시된 자료를 관리해요. 삭제는 <b>바로 사라지지 않는 소프트삭제</b>라 되돌릴 수 있어요.</p>
        <Ul>
          <li><b>공개(public)</b> — 사이트에 보임</li>
          <li><b>숨김(hidden)</b> — 잠시 내림(검토 중 등), 복구 쉬움</li>
          <li><b>삭제(deleted)</b> — 목록에서 제거하되 DB에는 남음 → 언제든 복원 가능</li>
        </Ul>
        <Shot src="/guide-assets/07-archive.png" alt="자료 관리 화면" caption="④ 자료 관리 — 상태 변경·수정" />
        <Note>⚠️ 과거 삭제분이 재유입된 사고가 있었어요. 대량 임포트 시 삭제분 URL과 대조는 스크립트로 처리하고, 개별 삭제는 이 화면에서 소프트삭제로.</Note>
      </Section>

      <Section n="5" title="카테고리 관리">
        <p>대분류·소분류를 추가하거나 이름을 바꿔요. <b>이름 변경 시 그 분류의 모든 자료가 함께 갱신</b>돼요(cascade).</p>
        <Shot src="/guide-assets/06-categories.png" alt="카테고리 관리 화면" caption="⑤ 카테고리 — 대분류/소분류 관리" />
        <Note>자료가 남아있는 분류는 실수 삭제를 막기 위해 삭제 전 안내가 떠요.</Note>
      </Section>

      <Section n="6" title="의견(VOC) 관리">
        <p>사이트 전 페이지 우하단 <b>&lsquo;의견 보내기&rsquo;</b>로 들어온 방문자 의견·버그·문의·칭찬을 모아 봐요. 답변이 필요하면 남겨준 이메일로 회신해요.</p>
        <Shot src="/guide-assets/04-feedback.png" alt="VOC 의견 목록 화면" caption="⑥ VOC — 방문자 의견·버그·문의" />
      </Section>

      <Section n="7" title="백로그 보드">
        <p>운영하며 생기는 할 일·아이디어를 카드로 관리하는 보드예요. 담당·상태로 정리해요.</p>
        <Shot src="/guide-assets/05-backlog.png" alt="백로그 보드 화면" caption="⑦ 백로그 — 운영 할 일" />
      </Section>

      <Section n="8" title="운영진 초대·권한">
        <p>새 운영진을 들일 때:</p>
        <Step>
          <li><b>초대</b> — 대상자 이메일을 넣고 <b>초대 메일 보내기</b>(내 메일앱에서 초대 링크가 열려요), 또는 초대 링크를 직접 공유.</li>
          <li>대상자가 링크 접속 → <b>구글 로그인</b> → <b>운영진 신청</b>.</li>
          <li>이 화면 아래 <b>&lsquo;운영진 신청&rsquo; 목록</b>에서 admin이 <b>승인</b>하면 reviewer 권한이 부여돼요.</li>
        </Step>
        <Shot src="/guide-assets/09-invite.png" alt="운영진 초대 화면" caption="⑧ 운영진 초대 — 이메일 초대·신청 승인" />
        <Note>권한 자가 승격은 막혀 있어요(2026-08-20 보안 잠금). 권한 변경은 admin만.</Note>
      </Section>

      <Section n="9" title="대시보드">
        <p>방문 추이·인기 자료·검색어(특히 <b>결과 0건 검색어</b>) 등 운영 지표를 봐요. 결과 0건 검색어는 동의어 보강·수집 우선순위 힌트예요.</p>
        <Shot src="/guide-assets/10-dashboard.png" alt="대시보드 화면" caption="⑨ 대시보드 — 방문·인기·검색 지표" />
      </Section>

      <Section n="10" title="업데이트 내역">
        <p>사이트가 어떻게 바뀌어 왔는지 최신순 기록이에요. 큰 변경을 하면 여기 한 줄 남겨두면 다음 운영진이 맥락을 알기 좋아요.</p>
        <Shot src="/guide-assets/08-changelog.png" alt="업데이트 내역 화면" caption="⑩ 업데이트 내역 — 변경 이력" />
      </Section>

      <Section n="11" title="전체 흐름 — 제안이 어떻게 게시되나">
        <p>방문자 제안부터 게시까지 전 과정은 <b>사이트(Supabase) 안에서</b> 끝나요. 예전 구글 시트·Apps Script 방식은 은퇴했어요.</p>
        <pre className="text-[12px] leading-relaxed bg-[var(--card)] border border-[var(--border)] rounded-[var(--r-md)] p-3 overflow-x-auto">{`방문자 /submit 폼
   │  (제출 전 자동 중복검사)
   ▼
제안 대기(staging_proposal · pending)  ── 운영진에게 알림 메일
   │  운영진 검토·보정
   ▼
운영진 2명 승인 (admin 단독승인 폴백)
   ▼
자료실 게시(archive_item · public)  ── 제안자에게 승인 메일`}</pre>
        <p>방문자가 보는 공개 화면:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Shot src="/guide-assets/11-home.png" alt="사이트 홈" caption="홈" />
          <Shot src="/guide-assets/12-submit.png" alt="자료 제안 폼" caption="자료 제안" />
          <Shot src="/guide-assets/13-faq.png" alt="실무 Q&A" caption="실무 Q&A" />
        </div>
      </Section>

      <Section n="12" title="알림 메일">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="text-left text-[var(--muted-2)] border-b border-[var(--border)]">
              <th className="py-1.5 pr-3 font-semibold">시점</th>
              <th className="py-1.5 pr-3 font-semibold">받는 사람</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--border)]"><td className="py-1.5 pr-3">방문자가 자료 제안</td><td className="py-1.5 pr-3">운영진</td></tr>
            <tr className="border-b border-[var(--border)]"><td className="py-1.5 pr-3">운영진이 승인</td><td className="py-1.5 pr-3">제안자</td></tr>
            <tr><td className="py-1.5 pr-3">운영진이 반려</td><td className="py-1.5 pr-3">제안자 (사유 포함)</td></tr>
          </tbody>
        </table>
        <Note>메일이 안 오면 — 발송 쿼터(하루 100통) 초과 여부, 스팸함을 먼저 확인. 제안 자체는 쿼터와 무관하게 정상 저장돼요.</Note>
      </Section>

      <Section n="13" title="콘텐츠 작성 규칙">
        <Ul>
          <li><b>한줄설명(요약)</b> — <b>개조식</b>(명사로 끝, <b>마침표 없음</b>), 20~55자, 실제 내용 기준. &lsquo;~입니다/합니다&rsquo;체·&lsquo;이 자료는&rsquo; 서두·메타 복붙 금지. <br/><span className="text-[var(--muted-2)]">예) &ldquo;UX Writer 직무 수요·역량을 링크드인 채용 데이터로 분석한 아티클&rdquo;</span></li>
          <li><b>태그</b> — 5~6개, 한글 위주, 기존 태그 재사용 우선</li>
          <li><b>자료 형식</b> — 아티클 / 가이드 / 템플릿 / 영상 / 홈페이지 / 강의 (템플릿만 &lsquo;양식·템플릿&rsquo; 메뉴로, 나머지는 콘텐츠)</li>
          <li><b>링크</b> — 단축링크(bit.ly)·구글 리다이렉트 래퍼(<K>?sa=D&amp;ust=</K>)는 <b>원본 URL로 풀어서</b> 저장</li>
          <li><b>발행일</b> — <K>YYYY-MM-DD</K></li>
        </Ul>
      </Section>

      <Section n="14" title="자주 묻는 것">
        <div className="flex flex-col gap-2.5">
          <div><b>Q. 사이트에 자료가 안 보여요</b><br/>캐시 몇 분 대기 → 자료 관리에서 상태가 <K>공개</K>인지 확인.</div>
          <div><b>Q. 실수로 자료를 지웠어요</b><br/>소프트삭제라 자료 관리에서 <b>복원</b>하면 돼요. 완전삭제(하드삭제)는 백업 후에만.</div>
          <div><b>Q. 제안 메일이 안 와요</b><br/>§12 — 쿼터(100통/일)·스팸함 확인.</div>
          <div><b>Q. 검색이 이상해요</b><br/>정확히 일치하는 게 0건일 때만 &lsquo;비슷한 자료&rsquo;를 보여주는 정상 동작이에요.</div>
          <div><b>Q. 자료를 고쳤는데 사이트에 그대로예요</b><br/>DB를 사이트 밖에서 직접 고치면 캐시 때문에 지연돼요. 이 관리 화면으로 고치면 바로 반영돼요.</div>
        </div>
      </Section>

      <p className="text-[12px] text-[var(--muted-2)] border-t border-[var(--border)] pt-3">
        이 가이드는 운영진 전용 페이지예요. 크게 바꾼 게 있으면 <Link href="/admin-mb26/panel/changelog" className="text-[var(--accent)] hover:underline">업데이트 내역</Link>에도 한 줄 남겨주세요.
      </p>
    </div>
  );
}
