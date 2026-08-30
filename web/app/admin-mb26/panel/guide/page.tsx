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

// 6개 대그룹 구분선
function GroupTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-[13px] font-bold tracking-wide text-[var(--accent)] uppercase mt-6 pt-3 border-t border-[var(--border)] scroll-mt-20">
      {children}
    </h2>
  );
}
// 섹션 안의 소제목
function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-semibold text-[var(--fg)] mt-1.5">{children}</p>;
}
function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={`s${n}`} className="flex flex-col gap-3 scroll-mt-20">
      <h3 className="text-base sm:text-lg font-bold tracking-tight">
        <span className="text-[var(--muted-2)] font-mono text-sm mr-2">{n}</span>{title}
      </h3>
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
// 다른 섹션으로 가는 링크 — "(자세히는 4번)" 대신 눌러서 바로 이동
function S({ n, children }: { n: string; children?: React.ReactNode }) {
  const title = SECTION_TITLE[n] ?? '';
  return (
    <a href={`#s${n}`} className="text-[var(--accent)] hover:underline whitespace-nowrap">
      {children ?? `${n}. ${title}`}
    </a>
  );
}
// 외부 링크
function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline break-all">{children}</a>;
}

// 목차 = 6개 그룹으로 묶음
const TOC_GROUPS: { group: string; gid: string; items: [string, string][] }[] = [
  { group: '개요와 원리', gid: 'g-concept', items: [
    ['1', '맥비 자료실이란'],
    ['2', '데이터 구조 — 자료의 구성과 저장'],
    ['3', '등록 원리 — 자료가 게시되기까지'],
  ] },
  { group: '시작하기', gid: 'g-start', items: [
    ['4', '로그인과 권한'],
    ['5', '화면 둘러보기'],
  ] },
  { group: '자주 하는 일', gid: 'g-daily', items: [
    ['6', '자료 등록요청 처리'],
    ['7', '자료 관리'],
    ['8', '의견(VOC) 답변'],
    ['9', '백로그'],
  ] },
  { group: '가끔 하는 일', gid: 'g-occasional', items: [
    ['10', '카테고리'],
    ['11', '운영진 초대'],
    ['12', '대시보드 보는 법'],
    ['13', '업데이트 내역 남기기'],
  ] },
  { group: '참고 자료', gid: 'g-reference', items: [
    ['14', '콘텐츠 작성 규칙'],
    ['15', '알림 메일'],
    ['16', '지금 운영진'],
    ['17', '담당 나눔'],
    ['18', '시스템·계정 구성'],
  ] },
  { group: '도움말', gid: 'g-help', items: [
    ['19', '자주 묻는 것'],
  ] },
];

const SECTION_TITLE: Record<string, string> = Object.fromEntries(TOC_GROUPS.flatMap((g) => g.items));

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
          맥비 자료실을 함께 운영하는 분들을 위한 안내서예요. 운영진이 바뀌어도 이 문서 하나로 같은 방식으로 일할 수 있게 정리했어요.
        </p>
        <Ul>
          <li><b>처음이라면</b> — <S n="1" /> → <S n="2" /> → <S n="3" /> 순서로 읽고, <S n="4" />에서 로그인해 시작하세요.</li>
          <li><b>일하다가 막히면</b> — 목차에서 해당 항목을 찾거나 <S n="19" />를 보세요.</li>
          <li><b>구글 시트로 일하셨던 분</b> — <S n="2">2. 데이터 구조의 &lsquo;기존 시트 변경 히스토리&rsquo;</S>를 먼저 보면 연결이 돼요.</li>
        </Ul>
      </section>

      {/* 목차 — 6개 그룹 */}
      <nav className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--card)] p-4">
        <p className="text-[11px] font-semibold text-[var(--muted-2)] mb-2">목차</p>
        <div className="columns-1 sm:columns-2 gap-x-5">
          {TOC_GROUPS.map(({ group, gid, items }) => (
            <div key={gid} className="flex flex-col gap-1 break-inside-avoid mb-3 last:mb-0">
              <a href={`#${gid}`} className="text-[11px] font-bold uppercase tracking-wide text-[var(--accent)] hover:underline">{group}</a>
              <ol className="flex flex-col gap-0.5 text-[13px]">
                {items.map(([n, t]) => (
                  <li key={n}>
                    <a href={`#s${n}`} className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
                      <span className="font-mono text-[var(--muted-2)] mr-1.5">{n}</span>{t}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </nav>

      {/* ─────────── 개요와 원리 ─────────── */}
      <GroupTitle id="g-concept">개요와 원리</GroupTitle>

      <Section n="1" title="맥비 자료실이란">
        <p>
          맥비 자료실은 기획 업무에 도움 되는 자료(양식·템플릿, 아티클, 영상, 사이트, 강의 등)를 한곳에 모아
          <b> 검색하고 공유하는 웹사이트</b>예요. 방문자는 자료를 찾아보고 제안할 수 있고, <b>운영진은 그 자료를 검수하고 관리</b>해요.
        </p>
        <p>
          운영진 업무는 관리 화면 <K>macbe-archive.com/admin-mb26</K> 에서 해요(<S n="4" />).
          권한은 <b>운영진</b>과 <b>관리자</b> 두 단계예요(<S n="4" />).
        </p>
        <SubHeading>방문자가 보는 공개 화면</SubHeading>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Shot src="/guide-assets/11-home.png" alt="사이트 홈" caption="홈 — 검색 중심" />
          <Shot src="/guide-assets/12-submit.png" alt="자료 제안 폼" caption="자료 등록(제안)" />
          <Shot src="/guide-assets/13-faq.png" alt="실무 Q&A" caption="실무 Q&A" />
        </div>
      </Section>

      <Section n="2" title="데이터 구조 — 자료의 구성과 저장">
        <p>자료가 어떻게 생겼고 어디에 저장되는지 안내해요.</p>

        <SubHeading>자료 한 건의 구성</SubHeading>
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,260px)_1fr] gap-4 items-start">
          <Shot src="/guide-assets/14-card-example.png" alt="자료 카드 예시" caption="사이트에 보이는 자료 카드 한 장" />
          <Ul>
            <li><b>형식</b> — 카드 왼쪽 위 배지. 아티클 · 가이드 · 템플릿 · 영상 · 홈페이지 · 강의</li>
            <li><b>제목</b> · <b>한 줄 설명</b> — 목록·검색에 보이는 이름표 (작성 규칙 <S n="14" />)</li>
            <li><b>태그</b> — 검색용 키워드 5~6개</li>
            <li><b>링크(URL)</b> 또는 <b>업로드 파일</b> — 카드를 누르면 가는 곳. &lsquo;바로가기&rsquo;는 링크, &lsquo;다운로드&rsquo;는 파일</li>
            <li><b>분류</b> — 대분류 / 소분류 (예: 기획·PM / 프로세스). 카드엔 안 보이고 메뉴·필터에 쓰여요</li>
            <li><b>상태</b> — 공개 · 숨김 · 삭제 (아래)</li>
          </Ul>
        </div>

        <SubHeading>상태 — 모든 자료는 셋 중 하나</SubHeading>
        <Ul>
          <li><b>공개</b> — 사이트에 정상적으로 보임</li>
          <li><b>숨김</b> — 잠깐 안 보이게 내려둠. 언제든 다시 공개</li>
          <li><b>삭제</b> — 목록에서 치우지만 데이터는 남아 <b>언제든 복원</b> 가능 (<S n="7" />)</li>
        </Ul>

        <SubHeading>어디에 저장되나</SubHeading>
        <p>
          자료 정보(제목·설명·분류·태그·링크·상태)는 전부 사이트의 <b>데이터베이스</b> 한 곳에 있어요.
          <b> 이 데이터베이스가 원본</b>이고, 운영진은 관리 화면에서만 고쳐요. 다른 곳(시트 등)을 고쳐도 사이트에는 반영되지 않아요.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse min-w-[400px]">
            <tbody>
              {([
                ['무엇', '데이터베이스 서비스 Supabase. 우리 컴퓨터가 아니라 Supabase 회사의 서버(서울)에 있고, 사이트가 여기에 읽고 써요.'],
                ['누구 계정', <>asa067714@gmail.com(안재찬 개인 구글)으로 만든 프로젝트예요. 다른 서비스도 같은 계정으로 통일돼 있어요(<S n="18" />).</>],
                ['백업', '매일 새벽 5시 운영 시트의 "자료 DB (Supabase 미러)" 탭으로 자동 복사돼요. 아래 히스토리 참고.'],
                ['직접 볼 수 있나', '평소엔 관리 화면이 유일한 창구예요. 엑셀처럼 한눈에 훑고 싶으면 위 미러 탭을 열면 돼요(수정은 안 됨). 데이터베이스 관리 콘솔은 관리자만, 설정 변경이 필요할 때만 들어가요.'],
                ['파일은', '자료 정보와 달리 파일 자체는 맥비님 구글 드라이브에 저장돼요(바로 아래).'],
              ] as [string, React.ReactNode][]).map(([k, v]) => (
                <tr key={k} className="border-b border-[var(--border)] last:border-0 align-top">
                  <td className="py-1.5 pr-4 font-medium whitespace-nowrap">{k}</td>
                  <td className="py-1.5 text-[var(--muted)]">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <SubHeading>업로드 파일은 이렇게 관리돼요</SubHeading>
        <p>링크가 아니라 파일(PDF·PPT·이미지 등, 10MB까지)을 올린 자료는 파일 자체가 따로 보관돼요. 흐름은 이래요.</p>
        <Step>
          <li><b>제출</b> — 방문자가 <K>자료 등록</K> 폼에서 파일을 올리면, 검수 대기 중에는 사이트 저장소에 임시로 있어요.</li>
          <li><b>승인</b> — 운영진 승인이 끝나는 순간 파일이 <b>맥비님 구글 드라이브</b>의 &lsquo;맥비기획 자료실 (자료실 업로드)&rsquo; 폴더로 옮겨지고, 사이트의 다운로드 링크도 드라이브 주소로 바뀌어요. 자동이라 운영진이 할 일은 없어요.</li>
          <li><b>파일 이름</b> — 드라이브에는 올린 사람의 원래 파일명이 아니라 <b>운영진이 정리한 제목</b>으로 저장돼요. 승인 전에 제목을 다듬어두면 폴더도 깔끔해요.</li>
          <li><b>반려</b> — 반려된 자료의 파일은 드라이브에 들어가지 않아요.</li>
          <li><b>옮기지 못했을 때</b> — 드라이브 쪽 문제로 실패하면 운영진에게 메일이 오고(<S n="15" />), 자료는 임시 저장소 링크로 계속 다운로드돼요. <S n="7" />의 <K>드라이브로</K> 버튼으로 다시 옮길 수 있어요.</li>
        </Step>
        <Note>
          드라이브 폴더는 맥비님 계정 소유예요. 파일은 &ldquo;링크가 있는 사람은 보기&rdquo;로만 공유되고, 폴더 전체가 공개되진 않아요.
          연결 구성은 <S n="18" />에 있어요. (2026-08-30 기준 연결 진행 중 — 완료 전까지는 사이트 저장소에 그대로 있어요.)
        </Note>
        <Shot src="/guide-assets/15-drive-folder.png" alt="맥비님 드라이브의 자료실 업로드 폴더" caption="드라이브 폴더 — 승인된 파일이 정리된 제목으로 쌓임" />

        <SubHeading>기존 시트 변경 히스토리</SubHeading>
        <p>2026년 상반기까지는 구글 시트로 자료실을 운영했어요. 시트에서 하던 일이 지금 어디로 갔는지, 시트가 지금 어떤 역할인지 정리해요.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse min-w-[440px]">
            <thead>
              <tr className="text-left text-[var(--muted-2)] border-b border-[var(--border)]">
                <th className="py-1.5 pr-3 font-semibold w-1/2">시트에서 하던 일</th>
                <th className="py-1.5 pr-3 font-semibold">지금 하는 곳</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['시트에 줄을 추가해 자료 등록', <><K>자료 등록</K> 폼으로 제안 → 승인되면 게시 (<S n="6" />)</>],
                ['셀을 고쳐 자료 수정', <>자료 관리에서 수정 (<S n="7" />)</>],
                ['행 삭제', <>자료 관리에서 삭제 — 되살리기 가능 (<S n="7" />)</>],
                ['시트 공유 링크로 접근', <>구글 로그인 + 운영진 권한 (<S n="4" />)</>],
                ['(없던 일)', <>방문자가 직접 제안 → 운영진 2명 승인 (<S n="3" />)</>],
                ['(없던 기능)', <>대시보드 · 의견(VOC) · 백로그 (<S n="12" /> · <S n="8" /> · <S n="9" />)</>],
              ] as [string, React.ReactNode][]).map(([before, after]) => (
                <tr key={before} className="border-b border-[var(--border)] last:border-0 align-top">
                  <td className="py-1.5 pr-3 text-[var(--muted)]">{before}</td>
                  <td className="py-1.5 pr-3">{after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1"><b>시트 두 개가 지금 어떤 역할인지</b></p>
        <Ul>
          <li>
            <b>맥비톡방 자료실 원본 시트</b> — <Ext href="https://docs.google.com/spreadsheets/d/1Bqq6sSvJXhigUkUTwtl9BBoQ_jIySNqpryjiwexb-t4/edit">열기</Ext><br />
            톡방에서 모으던 원래 시트예요. 사이트를 만들 때 여기 자료를 전부 가져왔고(2026-06), 그 뒤로는 <b>손대지 않아요</b>. 기록 보관용.
          </li>
          <li>
            <b>맥비기획_자료실_DB (운영 시트)</b> — <Ext href="https://docs.google.com/spreadsheets/d/1vAn3ufrdf2qDjiRGf82S5096cZ7v1cIUnrTAkZBeqWM/edit">열기</Ext><br />
            사이트 초기에 운영 작업을 하던 시트예요. 지금은 <b>&lsquo;자료 DB (Supabase 미러)&rsquo; 탭</b>만 의미가 있어요 — 사이트 데이터베이스를 <b>매일 새벽 5시에 자동으로 복사</b>해 넣는 <b>읽기 전용 사본</b>이에요.
            엑셀처럼 훑어보거나 대조할 때 쓰고, 여기 셀을 고쳐도 사이트엔 반영되지 않아요(다음날 덮어써짐). 나머지 탭(자료 DB·검토중·_staging_ 등)은 이관 당시 작업 흔적이라 더는 쓰지 않아요.
          </li>
        </Ul>
        <Note>
          <b>삭제한 자료가 되살아나지 않게</b> — 운영 시트의 &lsquo;삭제 시트 모음&rsquo; 탭은 예전에 지운 자료 링크 목록이에요. 시트에서 자료를 다시 가져올 일이 생기면 이 목록과 대조해 걸러야 해요(2026-07에 97건이 다시 올라온 적이 있어요). 평소 운영에선 신경 쓸 일 없어요.
        </Note>
      </Section>

      <Section n="3" title="등록 원리 — 자료가 게시되기까지">
        <p>
          자료 한 건이 사이트에 오르기까지의 흐름이에요. 핵심은 <b>제안 → 검수 → 2명 승인 → 게시</b>이고, 모든 과정이 사이트 안에서 끝나요.
        </p>
        <pre className="text-[12px] leading-relaxed bg-[var(--card)] border border-[var(--border)] rounded-[var(--r-md)] p-3 overflow-x-auto">{`누가 자료를 제안  (방문자 또는 운영진이 [자료 등록] 폼으로)
   │  제출할 때 중복 자동 확인
   ▼
대기 목록에 쌓임  ──▶ 운영진에게 "새 제안" 알림 메일
   │  운영진이 내용을 확인하고 다듬음(제목·설명·분류·태그)
   ▼
운영진 2명이 승인  (관리자는 사유를 적고 단독 승인 가능)
   │  파일이 붙은 자료는 이때 드라이브로 이동
   ▼
사이트에 게시  ──▶ 제안한 사람에게 "승인" 메일`}</pre>
        <SubHeading>왜 2명이 승인하나요?</SubHeading>
        <p>
          한 사람만 보면 놓치기 쉬운 걸 <b>서로 다른 두 사람이 한 번씩 확인</b>해, 자료실 성격에 맞는지·중복은 아닌지·설명이 적절한지를 걸러내려는 거예요.
          그래서 자기가 올린 자료도 다른 운영진 한 명의 승인이 더 필요해요.
        </p>
        <p>
          <b>관리자의 단독 승인</b>은 예외예요. 급한 자료거나 운영진이 부족할 때 관리자가 사유를 적고 혼자 게시할 수 있고, 사유는 자료 기록에 남아요.
        </p>
        <Note>제안은 <b>방문자</b>가 할 수도, <b>운영진이 직접</b> 할 수도 있어요. 둘 다 같은 대기 목록으로 들어와 같은 방식으로 승인돼요(<S n="6" />).</Note>
      </Section>

      {/* ─────────── 시작하기 ─────────── */}
      <GroupTitle id="g-start">시작하기</GroupTitle>

      <Section n="4" title="로그인과 권한">
        <p>
          운영과 관련된 모든 일은 관리자 페이지 <K>macbe-archive.com/admin-mb26</K> 에서 해요.
          이 주소는 검색이나 사이트 메뉴에는 안 나오니, 즐겨찾기에 담아두면 편해요.
        </p>
        <Step>
          <li>위 주소로 들어가 <b>구글 계정으로 로그인</b>해요.</li>
          <li>이미 운영진 권한이 있으면 왼쪽에 메뉴가 있는 관리 화면으로 바로 들어가져요.</li>
          <li>아직 권한이 없으면 <b>운영진 신청 화면</b>이 보여요. 신청하면 기존 관리자가 확인하고 권한을 줘요(<S n="11" />).</li>
        </Step>
        <Shot src="/guide-assets/01-login.png" alt="운영진 진입 로그인 화면" caption="운영진 진입 화면 — 구글 로그인" />
        <SubHeading>권한 두 단계</SubHeading>
        <Ul>
          <li><b>운영진(reviewer)</b> — 자료 제안을 검토·승인·반려하고, 자료·의견·카테고리를 관리해요. 평소 운영 업무는 여기서 다 돼요.</li>
          <li><b>관리자(admin)</b> — 위의 모든 것에 더해, 사유를 남기고 하는 <b>단독 승인</b>(<S n="3" />)과 <b>새 운영진 권한 부여</b>(<S n="11" />)를 할 수 있어요.</li>
        </Ul>
        <Note>로그인만 하고 권한을 안 받은 사람은 자료를 <b>제안</b>만 할 수 있고, 관리 화면은 못 봐요.</Note>
      </Section>

      <Section n="5" title="화면 둘러보기">
        <p>왼쪽 메뉴에서 모든 기능으로 갈 수 있어요. 각 메뉴가 무슨 일을 하는지 먼저 감을 잡아두면 좋아요.</p>
        <Ul>
          <li><b>홈</b> — 지금 처리할 일(대기 중인 제안·미답변 의견 등)을 한눈에 보여주는 시작 화면</li>
          <li><b>대시보드</b> — 방문 추이, 인기 자료, 사람들이 검색한 말 같은 지표 (<S n="12" />)</li>
          <li><b>자료등록요청</b> — 제안된 자료를 검토·승인·반려. 옆 숫자 = 대기 건수 (<S n="6" />)</li>
          <li><b>자료 관리</b> — 이미 올라간 자료를 고치거나 숨기고 지우고 되살리기 (<S n="7" />)</li>
          <li><b>카테고리</b> — 자료를 분류하는 대분류·소분류 관리 (<S n="10" />)</li>
          <li><b>VOC</b> — 방문자가 남긴 의견·문의·버그·칭찬 (<S n="8" />)</li>
          <li><b>백로그</b> — 운영진이 함께 쓰는 할 일 보드 (<S n="9" />)</li>
          <li><b>운영진 초대</b> — 새 운영진을 들이고 권한 주기 (<S n="11" />)</li>
          <li><b>업데이트 내역</b> — 사이트가 어떻게 바뀌어 왔는지 기록 (<S n="13" />)</li>
          <li><b>운영 가이드</b> — 지금 보고 있는 이 문서</li>
        </Ul>
        <Shot src="/guide-assets/02-panel-home.png" alt="관리자 홈 화면과 좌측 메뉴" caption="관리자 홈 — 왼쪽 메뉴로 모든 기능에 접근" />
      </Section>

      {/* ─────────── 자주 하는 일 ─────────── */}
      <GroupTitle id="g-daily">자주 하는 일</GroupTitle>

      <Section n="6" title="자료 등록요청 처리">
        <p>
          제안된 자료가 <b>자료등록요청</b> 화면에 <b>대기</b> 상태로 쌓여요. 운영진이 확인하고 승인해야 사이트에 올라가요(원리는 <S n="3" />). 이렇게 처리해요.
        </p>
        <Step>
          <li><b>내용을 확인해요.</b> 링크가 잘 열리는지, 이미 올라온 자료와 겹치지 않는지(제출할 때 자동으로 한 번 걸러지긴 해요), 자료실 성격에 맞는지 봐요.</li>
          <li><b>다듬어요.</b> 제목·한 줄 설명·분류·태그를 <S n="14" /> 규칙대로 손봐요. 승인 전에 바로 고칠 수 있어요. 파일 자료는 이 제목이 드라이브 파일명이 돼요.</li>
          <li><b>승인해요.</b> 서로 다른 <b>운영진 2명</b>이 승인하면 자동으로 게시돼요. 관리자에게는 <K>단독 승인</K> 버튼도 보이는데, 급한 자료나 운영진이 부족할 때만 사유를 적고 쓰는 예외예요.</li>
          <li><b>반려해요.</b> 자료실에 맞지 않으면 사유를 적고 반려해요. 사유는 제안한 사람에게 안내 메일로 전달돼요.</li>
        </Step>
        <Shot src="/guide-assets/03-requests.png" alt="자료 등록요청 목록 화면" caption="자료등록요청 — 대기 중인 제안을 검토·승인·반려" />
        <SubHeading>운영진이 직접 자료를 올리고 싶을 때</SubHeading>
        <p>
          관리 화면에 따로 &lsquo;자료 추가&rsquo; 버튼은 없어요. 운영진도 방문자와 똑같이 사이트 상단 <K>자료 등록</K> 폼에 URL이나 파일을 넣으면 돼요.
          그러면 위 대기 목록으로 들어오고, 거기서 승인하면 게시돼요.
        </p>
        <Note>승인·반려하면 제안한 사람에게 결과 메일이 자동으로 나가요(<S n="15" />). 승인된 자료는 곧바로 반영되지만 화면에 보이기까지 몇 분 걸릴 수 있어요.</Note>
      </Section>

      <Section n="7" title="자료 관리">
        <p>
          이미 올라간 자료를 손보는 곳이에요(상태 개념은 <S n="2" />). 가장 안심되는 점은 <b>지워도 바로 사라지지 않는다</b>는 거예요 — 휴지통처럼 언제든 되살릴 수 있어요.
        </p>
        <p>
          위쪽 탭(공개 · 숨김 · 삭제됨 · 거절됨 · 중복)으로 상태별로 골라보고, 검색으로 특정 자료를 바로 찾아요.
          자료를 여러 개 골라 한 번에 숨기거나 분류를 옮기는 것도 돼요. 제목·설명·링크·분류·태그는 <b>수정</b>으로 그 자리에서 고쳐요.
        </p>
        <Shot src="/guide-assets/07-archive.png" alt="자료 관리 화면" caption="자료 관리 — 상태별 탭, 검색, 자료별 수정·숨김·삭제" />
        <SubHeading>자료별 버튼</SubHeading>
        <Ul>
          <li><b>수정</b> — 제목·설명·분류·태그·형식·링크를 고쳐요.</li>
          <li><b>숨김 / 공개</b> — 잠깐 내리거나 다시 올려요.</li>
          <li><b>삭제 / 복구</b> — 삭제해도 &lsquo;삭제됨&rsquo; 탭에 남고, 복구하면 그대로 돌아와요.</li>
          <li><b>드라이브로</b> — 파일이 아직 사이트 저장소에 남아 있는 자료에만 보여요(승인 때 못 옮겼거나 드라이브 연결 전 자료). 누르면 맥비님 드라이브로 옮기고 링크를 바꿔요(<S n="2" />).</li>
        </Ul>
        <Note>실수로 지웠더라도 걱정 마세요. <b>삭제됨 탭 → 복구</b>면 그대로 돌아와요.</Note>
      </Section>

      <Section n="8" title="의견(VOC) 답변">
        <p>
          사이트 오른쪽 아래 <b>의견 보내기</b> 버튼으로 방문자가 남긴 의견·문의·버그·칭찬이 여기 모여요.
          카드를 눌러 상태(신규·처리중·보류·답변완료·종료)를 바꾸고 담당자를 지정할 수 있어요. 답이 필요한 의견은 남겨준 이메일로 회신하면 돼요.
        </p>
        <Shot src="/guide-assets/04-feedback.png" alt="VOC 의견 목록 화면" caption="VOC — 방문자 의견을 상태별로 관리" />
      </Section>

      <Section n="9" title="백로그">
        <p>
          운영하다 생기는 할 일·아이디어를 카드로 적어두고 함께 처리하는 보드예요.
          할 일 → 진행중 → 완료로 옮기며 관리하고, 담당자와 우선순위를 정할 수 있어요. 머릿속에만 있던 일을 여기 적어두면 다른 운영진도 알 수 있어요.
        </p>
        <Shot src="/guide-assets/05-backlog.png" alt="백로그 보드 화면" caption="백로그 — 운영 할 일을 카드로 함께 관리" />
      </Section>

      {/* ─────────── 가끔 하는 일 ─────────── */}
      <GroupTitle id="g-occasional">가끔 하는 일</GroupTitle>

      <Section n="10" title="카테고리">
        <p>
          자료를 분류하는 대분류·소분류를 추가하거나 이름을 바꾸는 곳이에요.
          <b>이름을 바꾸면 그 분류에 속한 모든 자료가 함께 바뀌어요</b> — 하나하나 고칠 필요 없어요.
        </p>
        <Shot src="/guide-assets/06-categories.png" alt="카테고리 관리 화면" caption="카테고리 — 대분류·소분류 추가·이름변경" />
        <Note>자료가 남아 있는 분류를 지우려 하면, 실수를 막기 위해 먼저 안내가 떠요.</Note>
      </Section>

      <Section n="11" title="운영진 초대">
        <p>운영진을 새로 들일 때는 이렇게 해요. 권한을 주는 마지막 단계는 관리자만 할 수 있어요.</p>
        <Step>
          <li><b>초대해요.</b> 운영진 초대 화면에서 상대 이메일을 넣고 <b>초대 메일 보내기</b>를 누르면 초대 링크가 담긴 메일이 가요. 링크를 직접 복사해 전달해도 돼요.</li>
          <li><b>상대가 신청해요.</b> 받은 사람이 링크로 들어와 구글 로그인 → 운영진 신청을 해요.</li>
          <li><b>승인해요.</b> 같은 화면 아래 <b>운영진 신청 목록</b>에 그 사람이 뜨면 관리자가 승인해요. 그러면 바로 운영진으로 일할 수 있어요.</li>
        </Step>
        <Shot src="/guide-assets/09-invite.png" alt="운영진 초대 화면" caption="운영진 초대 — 이메일로 초대하고, 신청을 승인" />
        <Note>보안을 위해 자기 권한을 스스로 올리는 건 막혀 있어요. 권한을 바꾸는 건 관리자만 할 수 있어요.</Note>
      </Section>

      <Section n="12" title="대시보드 보는 법">
        <p>운영이 잘 되고 있는지 숫자로 보는 곳이에요. 특히 눈여겨보면 좋은 것:</p>
        <Ul>
          <li><b>인기 자료</b> — 많이 찾는 자료. 비슷한 자료를 더 모으면 좋다는 신호예요.</li>
          <li><b>검색어</b> — 방문자가 실제로 검색한 말. 그중 <b>결과가 0건인 검색어</b>는 &ldquo;찾는데 없는 자료&rdquo;라, 다음에 무엇을 채우면 좋을지 알려줘요.</li>
          <li><b>방문·유입</b> — 언제 얼마나 오는지, 어디서 들어오는지.</li>
        </Ul>
        <Shot src="/guide-assets/10-dashboard.png" alt="대시보드 화면" caption="대시보드 — 방문·인기 자료·검색어 지표" />
      </Section>

      <Section n="13" title="업데이트 내역 남기기">
        <p>
          사이트가 어떻게 바뀌어 왔는지 최신순으로 모아둔 기록이에요.
          기능이 바뀌거나 운영 방식이 달라지면 여기에 남겨두면, 다음 운영진이 &ldquo;언제 왜 이렇게 됐는지&rdquo;를 알 수 있어요.
          내용은 배포하는 사람이 코드에 적고, 운영진은 읽기만 하면 돼요.
        </p>
        <Shot src="/guide-assets/08-changelog.png" alt="업데이트 내역 화면" caption="업데이트 내역 — 변경 이력을 최신순으로" />
      </Section>

      {/* ─────────── 참고 자료 ─────────── */}
      <GroupTitle id="g-reference">참고 자료</GroupTitle>

      <Section n="14" title="콘텐츠 작성 규칙">
        <p>제안을 승인하기 전에 아래를 맞춰주면, 자료실 전체가 깔끔하고 검색도 잘 돼요.</p>
        <SubHeading>한 줄 설명</SubHeading>
        <p>
          한 줄 설명은 완성된 문장이 아니라 이름표처럼 써요. <b>명사로 끝맺고 마침표는 붙이지 않아요.</b> 길이는 20~55자 정도.
          홍보 문구나 페이지 소개를 그대로 붙이지 말고, 실제 내용이 뭔지 한 줄로 요약해요.
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
        <SubHeading>태그 · 형식 · 링크</SubHeading>
        <Ul>
          <li><b>태그</b> — 5~6개 정도. 한글 위주로, 이미 쓰고 있는 태그가 있으면 새로 만들기보다 그걸 재사용해요.</li>
          <li><b>형식</b> — 아티클 · 가이드 · 템플릿 · 영상 · 홈페이지 · 강의 중에서 골라요. 템플릿·양식만 <K>양식·템플릿</K> 메뉴로 가고, 나머지는 <K>콘텐츠</K>로 가요.</li>
          <li><b>링크</b> — 단축주소(bit.ly 등)나 구글이 감싼 주소(<K>?sa=D&amp;ust=</K> 가 붙은 것)는 <b>원래 주소로 풀어서</b> 저장해요.</li>
          <li><b>발행일</b> — 알 수 있으면 <K>YYYY-MM-DD</K> 형태로.</li>
        </Ul>
      </Section>

      <Section n="15" title="알림 메일">
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
              <tr className="border-b border-[var(--border)]"><td className="py-1.5 pr-3">운영진이 반려하면</td><td className="py-1.5 pr-3">제안한 사람 (사유 포함)</td></tr>
              <tr className="border-b border-[var(--border)]"><td className="py-1.5 pr-3">방문자가 의견을 보내면</td><td className="py-1.5 pr-3">운영진</td></tr>
              <tr><td className="py-1.5 pr-3">승인된 자료의 파일을 드라이브로 못 옮기면</td><td className="py-1.5 pr-3">운영진 (<S n="7" />의 &lsquo;드라이브로&rsquo;로 재시도)</td></tr>
            </tbody>
          </table>
        </div>
        <Note>메일이 안 왔다면 — 하루 발송 한도(100통)를 넘었거나 스팸함에 들어갔을 수 있어요. 메일이 안 나가도 제안 자체는 정상 저장되니 안심하세요.</Note>
      </Section>

      <Section n="16" title="지금 운영진">
        <p>현재 이 자료실을 함께 운영하는 사람들이에요. 권한이 바뀌면 여기도 자동으로 갱신돼요.</p>
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

      <Section n="17" title="담당 나눔">
        <p>
          누가 어떤 일을 주로 맡을지 정해두면 빠뜨리는 일 없이 굴러가요.
          아직 공식으로 나누진 않았어요 — <b>운영 회의에서 정해 아래 표를 채우기</b>로 해요.
          (표를 바꾸려면 코드의 <K>guide/page.tsx</K> 17번 항목을 고치면 돼요.)
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

      <Section n="18" title="시스템·계정 구성">
        <p>
          <b>평소 운영에는 이 부분을 몰라도 지장 없어요.</b> 자료실이 어떤 서비스들 위에서 돌아가는지, 문제가 생기거나 설정을 바꿔야 할 때 어디를 봐야 하는지를 알아두는 참고용이에요.
          비밀번호·키 값은 여기 적지 않아요.
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
                ['사이트 주소', 'macbe-archive.com — Vercel에서 구입·관리', 'asa067714 (개인, pmgomdol Vercel)'],
                ['코드 저장소', 'GitHub · PMgomdol/macbee-insight (main 자동 배포)', 'asa067714 (개인, 핸들 PMgomdol)'],
                ['배포·호스팅', 'Vercel · pmgomdols-projects/macbe-archive (서울 리전)', 'asa067714 (개인)'],
                ['데이터·로그인', 'Supabase · bmsoolrfostbxepzkesy (서울 리전)', 'asa067714 (개인)'],
                ['구글 로그인', 'Google Cloud · OAuth "macbe-archive-web"', 'asa067714 (개인 구글)'],
                ['방문 분석', 'Google Analytics 4 · G-LT2K006JPF (속성 549238948)', 'asa067714 (개인)'],
                ['행동 분석', 'PostHog · 프로젝트 498450', 'asa067714 (개인)'],
                ['AI 분석', 'Google Gemini API', 'asa067714 (개인)'],
                ['알림 메일', 'Google Apps Script · MailApp', 'asa067714 (개인 구글)'],
                ['파일 저장', 'Google Drive · 맥비님 드라이브 "맥비기획 자료실 (자료실 업로드)" 폴더', '맥비님 (개인 구글)'],
                ['드라이브 연결', 'Google Apps Script · 맥비님 계정의 웹앱(배포) + asa067714 계정의 라이브러리(코드)', '맥비님 · asa067714'],
                ['시트 미러', 'GitHub Actions · 매일 05:00 Supabase → 운영 시트 "자료 DB (Supabase 미러)" 탭', 'asa067714 (서비스 계정)'],
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
          <br />Vercel은 <b>pmgomdols-projects</b>가 진짜 운영 프로젝트예요. 이름이 같은 빈 중복 프로젝트가 따로 있어서,
          환경변수(env)를 거기 넣으면 조용히 안 먹어요 — 설정은 반드시 <b>pmgomdol 계정 대시보드</b>에서 해요.
        </Note>
      </Section>

      {/* ─────────── 도움말 ─────────── */}
      <GroupTitle id="g-help">도움말</GroupTitle>

      <Section n="19" title="자주 묻는 것">
        <div className="flex flex-col gap-2.5">
          <div><b>Q. 승인했는데 사이트에 자료가 안 보여요</b><br/>몇 분 기다린 뒤 새로고침해보고, <S n="7" />에서 그 자료 상태가 <K>공개</K>인지 확인해요.</div>
          <div><b>Q. 실수로 자료를 지웠어요</b><br/>괜찮아요. <S n="7" />의 <K>삭제됨</K> 탭에서 <b>복구</b>하면 그대로 돌아와요.</div>
          <div><b>Q. 제안·승인 메일이 안 와요</b><br/><S n="15" />를 보세요 — 하루 100통 한도나 스팸함을 확인. 메일과 무관하게 자료 처리 자체는 정상이에요.</div>
          <div><b>Q. 검색 결과가 이상해요</b><br/>딱 맞는 자료가 없을 때만 비슷한 자료를 대신 보여주는 정상 동작이에요.</div>
          <div><b>Q. 나 혼자 승인할 수 없나요?</b><br/>기본은 서로 다른 운영진 2명이 승인해야 해요. 관리자는 사유를 적고 단독 승인할 수 있는데, 급한 자료나 운영진이 부족할 때만 쓰는 예외예요(<S n="3" />).</div>
          <div><b>Q. 올린 파일은 어디에 저장되나요?</b><br/>승인되면 맥비님 구글 드라이브 폴더로 가요. 자세한 흐름은 <S n="2" />의 &lsquo;업로드 파일은 이렇게 관리돼요&rsquo;.</div>
          <div><b>Q. 구글 시트를 고치면 반영되나요?</b><br/>아니요. 시트는 읽기 전용 사본이에요. 고칠 건 <S n="7" />에서 해요(<S n="2" />의 &lsquo;기존 시트 변경 히스토리&rsquo;).</div>
        </div>
      </Section>

      <p className="text-[12px] text-[var(--muted-2)] border-t border-[var(--border)] pt-3">
        이 가이드는 운영진 전용이에요. 안내가 실제와 달라졌거나 새 기능이 생겼으면, 코드의 <K>guide/page.tsx</K>를 고치고
        <Link href="/admin-mb26/panel/changelog" className="text-[var(--accent)] hover:underline ml-1">업데이트 내역</Link>에도 한 줄 남겨주세요.
      </p>
    </div>
  );
}
