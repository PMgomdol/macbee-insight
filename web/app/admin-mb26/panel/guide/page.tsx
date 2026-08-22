import { existsSync } from 'node:fs';
import { join } from 'node:path';
import Link from 'next/link';
import { UILinkButton } from '@/components/ui/Button';
import { getAuthState } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

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

function GroupHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold tracking-wide text-[var(--muted-2)] uppercase mt-2">{children}</p>;
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
  ['1', '처음 오셨다면 — 로그인과 권한'],
  ['2', '화면 둘러보기'],
  ['3', '자료 등록요청 처리하기'],
  ['4', '자료 관리 — 고치고, 숨기고, 지우고, 되살리기'],
  ['5', '의견(VOC)에 답하기'],
  ['6', '백로그로 할 일 나누기'],
  ['7', '카테고리 손보기'],
  ['8', '새 운영진 들이기'],
  ['9', '대시보드 읽는 법'],
  ['10', '업데이트 내역 남기기'],
  ['11', '자료 하나가 게시되기까지 (전체 흐름)'],
  ['12', '좋은 자료로 다듬는 요령'],
  ['13', '알림 메일은 언제 나가나'],
  ['14', '지금 운영진'],
  ['15', '담당 나눔'],
  ['16', '시스템·계정 구성'],
  ['17', '자주 묻는 것'],
] as const;

async function getOperators(): Promise<{ display_name: string | null; role: string | null }[]> {
  try {
    const sb = createAdminClient();
    const { data } = await sb
      .from('profile')
      .select('display_name, role')
      .in('role', ['admin', 'reviewer'])
      .order('role', { ascending: true })
      .order('display_name', { ascending: true });
    return data ?? [];
  } catch {
    return [];
  }
}

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

  const operators = await getOperators();

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <section className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">운영 가이드</h1>
          <span className="text-xs text-[var(--muted-2)]">{displayName ?? user?.email} · {role === 'admin' ? '관리자' : '운영진'}</span>
        </div>
        <p className="text-sm text-[var(--muted)]">
          맥비 자료실을 함께 운영하는 분들을 위한 안내서예요. 운영진이 새로 오거나 바뀌어도 이 문서 하나만 보면
          같은 방식으로 일할 수 있게 정리했어요. 처음이라면 위에서부터 천천히 읽어보시고, 익숙해지면 필요한 부분만 찾아보세요.
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

      <Section n="1" title="처음 오셨다면 — 로그인과 권한">
        <p>
          운영과 관련된 모든 일은 관리자 페이지 <K>macbe-archive.com/admin-mb26</K> 에서 해요.
          이 주소는 검색이나 사이트 메뉴에는 안 나오니, 즐겨찾기에 담아두면 편해요.
        </p>
        <Step>
          <li>위 주소로 들어가 <b>구글 계정으로 로그인</b>해요.</li>
          <li>이미 운영진 권한이 있으면 왼쪽에 메뉴가 있는 관리 화면으로 바로 들어가져요.</li>
          <li>아직 권한이 없으면 <b>운영진 신청 화면</b>이 보여요. 신청하면 기존 관리자가 확인하고 권한을 줘요(→ 8번 참고).</li>
        </Step>
        <Shot src="/guide-assets/01-login.png" alt="운영진 진입 로그인 화면" caption="운영진 진입 화면 — 구글 로그인" />
        <p>운영진은 하는 일에 따라 두 단계로 나뉘어요. 대부분은 <b>운영진(reviewer)</b>이고, 일부만 <b>관리자(admin)</b>예요.</p>
        <Ul>
          <li><b>운영진(reviewer)</b> — 자료 제안을 검토·승인·반려하고, 자료·의견·카테고리를 관리해요. 평소 운영 업무는 여기서 다 돼요.</li>
          <li><b>관리자(admin)</b> — 위의 모든 것에 더해, 운영진이 2명이 안 될 때의 <b>단독 승인</b>과 <b>새 운영진 권한 부여</b>를 할 수 있어요.</li>
        </Ul>
        <Note>로그인만 하고 권한을 안 받은 사람은 자료를 <b>제안</b>만 할 수 있고, 관리 화면은 못 봐요.</Note>
      </Section>

      <Section n="2" title="화면 둘러보기">
        <p>왼쪽 메뉴에서 모든 기능으로 갈 수 있어요. 각 메뉴가 무슨 일을 하는지 먼저 감을 잡아두면 좋아요.</p>
        <Ul>
          <li><b>홈</b> — 지금 처리할 일(대기 중인 제안·미답변 의견 등)을 한눈에 보여주는 시작 화면</li>
          <li><b>대시보드</b> — 방문 추이, 인기 자료, 사람들이 검색한 말 같은 지표(→ 9번)</li>
          <li><b>자료등록요청</b> — 방문자가 제안한 자료를 검토·승인·반려(옆 숫자 = 대기 건수) (→ 3번)</li>
          <li><b>자료 관리</b> — 이미 올라간 자료를 고치거나 숨기고 지우고 되살리기 (→ 4번)</li>
          <li><b>카테고리</b> — 자료를 분류하는 대분류·소분류 관리 (→ 7번)</li>
          <li><b>VOC</b> — 방문자가 남긴 의견·문의·버그·칭찬 (→ 5번)</li>
          <li><b>백로그</b> — 운영진이 함께 쓰는 할 일 보드 (→ 6번)</li>
          <li><b>운영진 초대</b> — 새 운영진을 들이고 권한 주기 (→ 8번)</li>
          <li><b>업데이트 내역</b> — 사이트가 어떻게 바뀌어 왔는지 기록 (→ 10번)</li>
          <li><b>운영 가이드</b> — 지금 보고 있는 이 문서</li>
        </Ul>
        <Shot src="/guide-assets/02-panel-home.png" alt="관리자 홈 화면과 좌측 메뉴" caption="관리자 홈 — 왼쪽 메뉴로 모든 기능에 접근" />
      </Section>

      <GroupHeading>자주 하는 일</GroupHeading>

      <Section n="3" title="자료 등록요청 처리하기">
        <p>
          방문자가 <K>자료 등록</K> 폼으로 자료를 제안하면, 그 자료가 <b>자료등록요청</b> 화면에 <b>대기</b> 상태로 쌓여요.
          운영진이 확인하고 승인해야 사이트에 올라가요. 이렇게 처리해요.
        </p>
        <Step>
          <li><b>내용을 확인해요.</b> 링크가 잘 열리는지, 이미 올라온 자료와 겹치지 않는지(제출할 때 자동으로 한 번 걸러지긴 해요), 자료실 성격에 맞는지 봐요.</li>
          <li><b>다듬어요.</b> 제목·한 줄 설명·분류·태그를 12번의 요령대로 손봐요. 승인 전에 바로 고칠 수 있어요.</li>
          <li><b>승인해요.</b> <b>운영진 2명</b>이 승인하면 자동으로 사이트에 게시돼요. 서로 다른 사람이 한 번씩 눌러야 해요. (운영진이 2명이 안 되면 관리자가 사유를 적고 혼자 승인할 수 있어요.)</li>
          <li><b>반려해요.</b> 자료실에 맞지 않으면 사유를 적고 반려해요. 사유는 제안한 사람에게 안내 메일로 전달돼요.</li>
        </Step>
        <Shot src="/guide-assets/03-requests.png" alt="자료 등록요청 목록 화면" caption="자료등록요청 — 대기 중인 제안을 검토·승인·반려" />
        <Note>승인하거나 반려하면 제안한 사람에게 결과 메일이 자동으로 나가요(→ 13번). 승인된 자료는 곧바로 사이트에 반영되지만, 화면에 보이기까지 몇 분 걸릴 수 있어요.</Note>
      </Section>

      <Section n="4" title="자료 관리 — 고치고, 숨기고, 지우고, 되살리기">
        <p>
          이미 올라간 자료를 손보는 곳이에요. 가장 안심되는 점은, <b>지워도 바로 사라지지 않는다</b>는 거예요.
          삭제는 &lsquo;휴지통에 넣는&rsquo; 느낌이라 언제든 되살릴 수 있어요. 자료마다 상태가 셋 중 하나예요.
        </p>
        <Ul>
          <li><b>공개</b> — 사이트에 정상적으로 보이는 상태예요.</li>
          <li><b>숨김</b> — 잠깐 안 보이게 내려둔 상태예요. 검토가 필요하거나 잠시 비공개할 때 쓰고, 다시 공개로 쉽게 되돌려요.</li>
          <li><b>삭제</b> — 목록에서 치우지만 데이터는 남아 있어요. &lsquo;삭제됨&rsquo; 탭에서 언제든 <b>복원</b>할 수 있어요.</li>
        </Ul>
        <p>
          화면 위쪽 탭(공개 · 숨김 · 삭제됨 · 거절됨 · 중복)으로 상태별로 골라볼 수 있고, 검색으로 특정 자료를 바로 찾을 수 있어요.
          자료를 여러 개 골라 한 번에 숨기거나 옮기는 것도 돼요. 제목·설명·링크·분류·태그는 <b>수정</b>으로 그 자리에서 고쳐요.
        </p>
        <Shot src="/guide-assets/07-archive.png" alt="자료 관리 화면" caption="자료 관리 — 상태별 탭, 검색, 자료별 수정·숨김·삭제" />
        <Note>실수로 지웠더라도 걱정 마세요. <b>삭제됨 탭 → 복원</b>이면 그대로 돌아와요. 완전히 없애는 것(하드삭제)은 여기서 하는 삭제와 다르고, 함부로 하지 않아요.</Note>
      </Section>

      <Section n="5" title="의견(VOC)에 답하기">
        <p>
          사이트 오른쪽 아래 <b>&lsquo;의견 보내기&rsquo;</b> 버튼으로 방문자가 남긴 의견·문의·버그·칭찬이 여기에 모여요.
          카드를 눌러 상태(신규·처리중·보류·답변완료·종료)를 바꾸고 담당자를 지정할 수 있어요.
          답이 필요한 의견은 남겨준 이메일로 회신하면 돼요.
        </p>
        <Shot src="/guide-assets/04-feedback.png" alt="VOC 의견 목록 화면" caption="VOC — 방문자 의견을 상태별로 관리" />
      </Section>

      <Section n="6" title="백로그로 할 일 나누기">
        <p>
          운영하다 보면 생기는 할 일·아이디어를 카드로 적어두고 함께 처리하는 보드예요.
          &lsquo;할 일 → 진행중 → 완료&rsquo;로 옮기며 관리하고, 담당자와 우선순위를 정할 수 있어요.
          &ldquo;머릿속에만 있던 일&rdquo;을 여기 적어두면 다른 운영진도 알 수 있어요.
        </p>
        <Shot src="/guide-assets/05-backlog.png" alt="백로그 보드 화면" caption="백로그 — 운영 할 일을 카드로 함께 관리" />
      </Section>

      <GroupHeading>가끔 하는 일</GroupHeading>

      <Section n="7" title="카테고리 손보기">
        <p>
          자료를 분류하는 대분류·소분류를 추가하거나 이름을 바꾸는 곳이에요.
          <b>이름을 바꾸면 그 분류에 속한 모든 자료가 함께 바뀌어요</b> — 하나하나 고칠 필요 없어요.
        </p>
        <Shot src="/guide-assets/06-categories.png" alt="카테고리 관리 화면" caption="카테고리 — 대분류·소분류 추가·이름변경" />
        <Note>자료가 남아 있는 분류를 지우려 하면, 실수를 막기 위해 먼저 안내가 떠요.</Note>
      </Section>

      <Section n="8" title="새 운영진 들이기">
        <p>운영진을 새로 들일 때는 이렇게 해요. (권한을 &lsquo;주는&rsquo; 마지막 단계는 관리자만 할 수 있어요.)</p>
        <Step>
          <li><b>초대해요.</b> 운영진 초대 화면에서 상대 이메일을 넣고 <b>초대 메일 보내기</b>를 누르면, 초대 링크가 담긴 메일을 보낼 수 있어요. 링크를 직접 복사해 전달해도 돼요.</li>
          <li><b>상대가 신청해요.</b> 받은 사람이 링크로 들어와 구글 로그인 → 운영진 신청을 해요.</li>
          <li><b>승인해요.</b> 같은 화면 아래 <b>&lsquo;운영진 신청&rsquo; 목록</b>에 그 사람이 뜨면, 관리자가 승인해요. 그러면 바로 운영진으로 일할 수 있어요.</li>
        </Step>
        <Shot src="/guide-assets/09-invite.png" alt="운영진 초대 화면" caption="운영진 초대 — 이메일로 초대하고, 신청을 승인" />
        <Note>보안을 위해, 자기 권한을 스스로 올리는 건 막혀 있어요. 권한을 바꾸는 건 관리자만 할 수 있어요.</Note>
      </Section>

      <Section n="9" title="대시보드 읽는 법">
        <p>운영이 잘 되고 있는지 숫자로 보는 곳이에요. 특히 눈여겨보면 좋은 것:</p>
        <Ul>
          <li><b>인기 자료</b> — 사람들이 많이 찾는 자료. 비슷한 자료를 더 모으면 좋다는 신호예요.</li>
          <li><b>검색어</b> — 방문자가 실제로 검색한 말. 그중 <b>결과가 0건인 검색어</b>는 &ldquo;찾는데 없는 자료&rdquo;라, 다음에 무엇을 채우면 좋을지 알려줘요.</li>
          <li><b>방문·유입</b> — 언제 얼마나 오는지, 어디서 들어오는지.</li>
        </Ul>
        <Shot src="/guide-assets/10-dashboard.png" alt="대시보드 화면" caption="대시보드 — 방문·인기 자료·검색어 지표" />
      </Section>

      <Section n="10" title="업데이트 내역 남기기">
        <p>
          사이트가 어떻게 바뀌어 왔는지 최신순으로 모아둔 기록이에요.
          큰 변화를 만들었다면 여기에 한 줄 남겨두면, 다음 운영진이 &ldquo;언제 왜 이렇게 됐는지&rdquo;를 알 수 있어요.
        </p>
        <Shot src="/guide-assets/08-changelog.png" alt="업데이트 내역 화면" caption="업데이트 내역 — 변경 이력을 최신순으로" />
      </Section>

      <Section n="11" title="자료 하나가 게시되기까지 (전체 흐름)">
        <p>방문자의 제안이 사이트에 오르기까지, 모든 과정이 <b>사이트 안에서</b> 끝나요. (예전엔 구글 시트를 거쳤지만 지금은 아니에요.)</p>
        <pre className="text-[12px] leading-relaxed bg-[var(--card)] border border-[var(--border)] rounded-[var(--r-md)] p-3 overflow-x-auto">{`방문자가 [자료 등록] 폼으로 제안
   │  (제출할 때 중복 자동 확인)
   ▼
대기 목록에 쌓임  ──▶ 운영진에게 "새 제안" 알림 메일
   │  운영진이 확인하고 다듬음
   ▼
운영진 2명 승인  (2명이 안 되면 관리자 단독 승인)
   ▼
사이트에 게시  ──▶ 제안한 사람에게 "승인" 메일`}</pre>
        <p>참고로, 방문자가 보는 공개 화면은 이렇게 생겼어요.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Shot src="/guide-assets/11-home.png" alt="사이트 홈" caption="홈" />
          <Shot src="/guide-assets/12-submit.png" alt="자료 제안 폼" caption="자료 등록(제안)" />
          <Shot src="/guide-assets/13-faq.png" alt="실무 Q&A" caption="실무 Q&A" />
        </div>
      </Section>

      <Section n="12" title="좋은 자료로 다듬는 요령">
        <p>제안을 승인하기 전에 아래를 맞춰주면, 자료실 전체가 깔끔하고 검색도 잘 돼요.</p>

        <GroupHeading>한 줄 설명</GroupHeading>
        <p>
          한 줄 설명은 완성된 문장이 아니라 &lsquo;이름표&rsquo;처럼 써요. <b>명사로 끝맺고 마침표는 붙이지 않아요.</b> 길이는 20~55자 정도.
          홍보 문구나 페이지에 적힌 소개를 그대로 붙이지 말고, 실제 내용이 뭔지 한 줄로 요약해요.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse min-w-[420px]">
            <thead>
              <tr className="text-left text-[var(--muted-2)] border-b border-[var(--border)]">
                <th className="py-1.5 pr-3 font-semibold w-12"> </th>
                <th className="py-1.5 pr-3 font-semibold">예시</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border)]">
                <td className="py-1.5 pr-3 text-[var(--danger-text)] font-semibold align-top">이렇게 X</td>
                <td className="py-1.5 pr-3 text-[var(--muted)]">이 자료는 UX 라이터의 직무를 분석한 자료입니다.<br/><span className="text-[11px] text-[var(--muted-2)]">문장으로 끝남 · 마침표 · &lsquo;이 자료는&rsquo; 서두</span></td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3 text-[var(--success)] font-semibold align-top">이렇게 O</td>
                <td className="py-1.5 pr-3">UX Writer 직무 수요·역량을 링크드인 채용 데이터로 분석한 아티클<br/><span className="text-[11px] text-[var(--muted-2)]">명사로 끝남 · 마침표 없음 · 실제 내용</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <GroupHeading>태그 · 형식 · 링크</GroupHeading>
        <Ul>
          <li><b>태그</b> — 5~6개 정도. 한글 위주로, 이미 쓰고 있는 태그가 있으면 새로 만들기보다 그걸 재사용해요.</li>
          <li><b>형식</b> — 아티클 · 가이드 · 템플릿 · 영상 · 홈페이지 · 강의 중에서 골라요. 템플릿·양식만 <K>양식·템플릿</K> 메뉴로 가고, 나머지는 <K>콘텐츠</K>로 가요.</li>
          <li><b>링크</b> — 단축주소(bit.ly 등)나 구글이 감싼 주소(<K>?sa=D&amp;ust=</K> 가 붙은 것)는 <b>원래 주소로 풀어서</b> 저장해요.</li>
          <li><b>발행일</b> — 알 수 있으면 <K>YYYY-MM-DD</K> 형태로.</li>
        </Ul>
      </Section>

      <Section n="13" title="알림 메일은 언제 나가나">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse min-w-[360px]">
            <thead>
              <tr className="text-left text-[var(--muted-2)] border-b border-[var(--border)]">
                <th className="py-1.5 pr-3 font-semibold">이럴 때</th>
                <th className="py-1.5 pr-3 font-semibold">이 사람에게</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border)]"><td className="py-1.5 pr-3">방문자가 자료를 제안하면</td><td className="py-1.5 pr-3">운영진</td></tr>
              <tr className="border-b border-[var(--border)]"><td className="py-1.5 pr-3">운영진이 승인하면</td><td className="py-1.5 pr-3">제안한 사람</td></tr>
              <tr><td className="py-1.5 pr-3">운영진이 반려하면</td><td className="py-1.5 pr-3">제안한 사람 (사유 포함)</td></tr>
            </tbody>
          </table>
        </div>
        <Note>메일이 안 왔다면 — 하루 발송 한도(100통)를 넘었거나 스팸함에 들어갔을 수 있어요. 메일이 안 나가도 제안 자체는 정상적으로 저장되니 안심하세요.</Note>
      </Section>

      <GroupHeading>참고 자료</GroupHeading>

      <Section n="14" title="지금 운영진">
        <p>현재 이 자료실을 함께 운영하는 사람들이에요. (권한이 바뀌면 여기도 자동으로 갱신돼요.)</p>
        {operators.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse min-w-[280px]">
              <thead>
                <tr className="text-left text-[var(--muted-2)] border-b border-[var(--border)]">
                  <th className="py-1.5 pr-3 font-semibold">이름</th>
                  <th className="py-1.5 pr-3 font-semibold">권한</th>
                </tr>
              </thead>
              <tbody>
                {operators.map((o, i) => (
                  <tr key={i} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-1.5 pr-3">{o.display_name ?? '(이름 없음)'}</td>
                    <td className="py-1.5 pr-3 text-[var(--muted)]">{o.role === 'admin' ? '관리자' : '운영진'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Note>운영진 정보를 불러오지 못했어요.</Note>
        )}
      </Section>

      <Section n="15" title="담당 나눔">
        <p>
          누가 어떤 일을 주로 맡을지 정해두면, 빠뜨리는 일 없이 굴러가요.
          아직 공식으로 나누진 않았어요 — <b>다음 운영 회의에서 정해서 아래 표를 채우기</b>로 해요.
          (이 표를 바꾸려면 코드의 <K>guide/page.tsx</K> 15번 항목을 고치면 돼요.)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse min-w-[360px]">
            <thead>
              <tr className="text-left text-[var(--muted-2)] border-b border-[var(--border)]">
                <th className="py-1.5 pr-3 font-semibold">영역</th>
                <th className="py-1.5 pr-3 font-semibold">담당</th>
              </tr>
            </thead>
            <tbody>
              {['자료 등록요청 검수', '자료 관리·정리', '의견(VOC) 답변', '카테고리·태그 정리', '대시보드·지표 확인', '새 자료 발굴·수집'].map((area) => (
                <tr key={area} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-1.5 pr-3">{area}</td>
                  <td className="py-1.5 pr-3 text-[var(--muted-2)]">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section n="16" title="시스템·계정 구성">
        <p>
          자료실은 아래 서비스들이 연결돼 돌아가요. 문제가 생기거나 설정을 바꿔야 할 때 &ldquo;어디를 봐야 하는지&rdquo; 알아두는 용도예요.
          (비밀번호·키 값은 여기 적지 않아요. 각 서비스 관리 콘솔에서 확인하세요.)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse min-w-[520px]">
            <thead>
              <tr className="text-left text-[var(--muted-2)] border-b border-[var(--border)]">
                <th className="py-1.5 pr-3 font-semibold">역할</th>
                <th className="py-1.5 pr-3 font-semibold">서비스 · 위치</th>
                <th className="py-1.5 pr-3 font-semibold">연결 계정</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['사이트 주소', 'macbe-archive.com (Vercel 커스텀 도메인)', '도메인 등록기관 미확인'],
                ['코드 저장소', 'GitHub · PMgomdol/macbee-insight (main 자동 배포)', 'asa067714 (개인, 핸들 PMgomdol)'],
                ['배포·호스팅', 'Vercel · pmgomdols-projects/macbee-insight (서울 리전)', 'asa067714 (개인)'],
                ['데이터·로그인', 'Supabase · bmsoolrfostbxepzkesy (서울 리전)', 'asa067714 (개인)'],
                ['구글 로그인', 'Google Cloud · OAuth "macbe-archive-web"', 'asa067714 (개인 구글)'],
                ['방문 분석', 'Google Analytics 4 · G-LT2K006JPF (속성 549238948)', 'asa067714 (개인)'],
                ['행동 분석', 'PostHog · 프로젝트 498450', 'asa067714 (개인)'],
                ['AI 분석', 'Google Gemini API', 'asa067714 (개인)'],
                ['알림 메일', 'Google Apps Script · MailApp', 'asa067714 (개인 구글)'],
              ].map(([role_, svc, acct]) => (
                <tr key={role_} className="border-b border-[var(--border)] last:border-0 align-top">
                  <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{role_}</td>
                  <td className="py-1.5 pr-3 text-[var(--muted)]">{svc}</td>
                  <td className="py-1.5 pr-3 text-[var(--muted-2)] whitespace-nowrap">{acct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note>
          계정은 모두 <K>asa067714@gmail.com</K>(개인 계정)으로 통일하는 게 원칙이에요 — 회사 계정은 쓰지도 노출하지도 않아요.
          <br />⚠️ Vercel은 <b>pmgomdols-projects</b>가 진짜 운영 프로젝트예요. 이름이 같은 빈 중복 프로젝트가 따로 있어서,
          환경변수(env)를 거기 넣으면 조용히 안 먹어요 — 설정은 반드시 <b>pmgomdol 계정 대시보드</b>에서 해요.
        </Note>
      </Section>

      <Section n="17" title="자주 묻는 것">
        <div className="flex flex-col gap-2.5">
          <div><b>Q. 승인했는데 사이트에 자료가 안 보여요</b><br/>몇 분 기다린 뒤 새로고침해보고, 자료 관리에서 그 자료 상태가 <K>공개</K>인지 확인해요.</div>
          <div><b>Q. 실수로 자료를 지웠어요</b><br/>괜찮아요. 자료 관리 <K>삭제됨</K> 탭에서 <b>복원</b>하면 그대로 돌아와요.</div>
          <div><b>Q. 제안·승인 메일이 안 와요</b><br/>13번을 보세요 — 하루 100통 한도나 스팸함을 확인. 메일과 무관하게 자료 처리 자체는 정상이에요.</div>
          <div><b>Q. 검색 결과가 이상해요</b><br/>딱 맞는 자료가 없을 때만 &lsquo;비슷한 자료&rsquo;를 대신 보여주는 정상 동작이에요.</div>
          <div><b>Q. 나 혼자 승인할 수 없나요?</b><br/>기본은 서로 다른 운영진 2명이 승인해야 해요. 운영진이 2명이 안 될 때만 관리자가 사유를 적고 단독 승인할 수 있어요.</div>
        </div>
      </Section>

      <p className="text-[12px] text-[var(--muted-2)] border-t border-[var(--border)] pt-3">
        이 가이드는 운영진 전용이에요. 안내가 실제와 달라졌거나 새 기능이 생겼으면, 코드의 <K>guide/page.tsx</K>를 고치고
        <Link href="/admin-mb26/panel/changelog" className="text-[var(--accent)] hover:underline ml-1">업데이트 내역</Link>에도 한 줄 남겨주세요.
      </p>
    </div>
  );
}
