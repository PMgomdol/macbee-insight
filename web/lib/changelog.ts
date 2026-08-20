// 관리자용 릴리즈 노트 데이터.
// nav.ts와 같은 패턴 — 배포할 때 여기에 한 항목 추가하면 /admin-mb26/panel/changelog에 반영됨.
// 규칙: 최신이 맨 위. 사람이 읽을 임팩트 중심 한두 문장. 배포자가 작성(운영진은 읽기 전용).

export type ChangeType = 'feature' | 'improve' | 'fix' | 'remove';

// text 안에 [라벨](/경로) 를 넣으면 그 부분이 링크가 됨(내부 경로 또는 http…).
// 언급하는 페이지·기능에 실제 목적지가 있으면 걸어서 운영진이 바로 확인하게. 버그·톤 같은 건 링크 없이.
// 링크 텍스트는 목적지를 온전히 가리키는 구절로 — '의견 관리(VOC) 전용 페이지'처럼 '페이지/탭/보드'
// 까지 포함해 '어디로 가는지'가 분명하게. (짧은 명사만 걸면 페이지인지 기능명인지 헷갈림)
export type ChangeItem = { type: ChangeType; text: string };

// 스크린샷·영상·before/after 비교. src는 public/ 기준 경로(예: '/changelog/search.webp').
// - image: png/webp/gif 모두 <img>로 렌더 (gif면 자동 재생)
// - video: mp4 (녹화 데모)
// - compare: 기존/개선 두 장을 나란히
// 넣는 법: scripts/shots.mjs 로 캡처 → public/changelog/ 에 생김 → 아래 media[]에 경로 추가.
export type Media =
  | { type: 'image' | 'video'; src: string; caption?: string }
  | { type: 'compare'; before: string; after: string; caption?: string };

export type Release = {
  date: string; // ISO "2026-08-18"
  // 제목 = 그 릴리즈의 대표 변경 2~3개를 ' · '로 나열 (문장 요약 X). 옆에 "N건"이 뜨니 나머지는 생략.
  // 접힌 제목만 보고 "뭐가 있었나"가 바로 읽히는 게 목적. 오픈 같은 마일스톤은 사건명.
  title?: string;
  changes: ChangeItem[];
  media?: Media[];
};

// 카드 안에서 변경사항을 묶는 순서
export const TYPE_ORDER: ChangeType[] = ['feature', 'improve', 'fix', 'remove'];

// 타입별 라벨·색. 색은 globals.css 토큰(라이트 단일).
export const TYPE_META: Record<ChangeType, { label: string; color: string }> = {
  feature: { label: '기능', color: 'var(--accent)' }, // 새 기능 (Added)
  improve: { label: '개선', color: 'var(--success)' }, // 기존 개선 (Changed)
  fix: { label: '수정', color: 'var(--warning)' }, // 버그 수정 (Fixed)
  remove: { label: '삭제', color: 'var(--muted-2)' }, // 제거 (Removed)
};

export const CHANGELOG: Release[] = [
  {
    date: '2026-08-20',
    title: '지표 대시보드 · 거절 자료 기록 · 링크 직접 수정',
    changes: [
      { type: 'feature', text: '[지표 대시보드](/admin-mb26/panel/dashboard)를 새로 만들었어요. 임베드 화면 대신 운영에 필요한 지표를 직접 보여드려요 — 콘텐츠 성과(조회수·신규 등록·인기 자료·VOC 추이)와 유입(방문·채널·기기·지역)을 탭으로 나눠서요. (유입 지표는 순차 반영)' },
      { type: 'feature', text: '거절한 제안을 [자료 관리](/admin-mb26/panel/archive)의 "거절됨" 탭에 사유와 함께 남겨요. 같은 자료가 다시 올라와도 왜 거절했는지 확인하고, 다시 올릴 만하면 "다시 검토"로 등록요청에 되돌릴 수 있어요.' },
      { type: 'feature', text: '[자료 관리](/admin-mb26/panel/archive)에서 여러 자료를 골라 한 번에 숨김·삭제·분류 변경하고(일괄 작업), 최신·조회·이름·분류순으로 정렬할 수 있어요. 자료의 링크(URL)도 직접 고칠 수 있어요.' },
      { type: 'feature', text: '[개인정보처리방침](/privacy)·[이용약관](/terms) 페이지를 추가했어요.' },
      { type: 'improve', text: '모든 자료의 한 줄 설명을 명사형 개조식으로 통일했어요.' },
      { type: 'improve', text: '자료 카드의 형식 배지를 정리했어요 — 파일 형식은 영문(Google Docs·PDF·hwp 등)으로, 노출하지 않던 날짜는 걷어냈어요.' },
      { type: 'remove', text: '죽은 링크·중복 자료를 실제로 열어 확인한 뒤 정리했어요.' },
    ],
  },
  {
    date: '2026-08-18',
    title: '승인 전 제안 수정 · 업로드 진행률 · 메일 알림',
    changes: [
      { type: 'feature', text: '운영진이 멤버 [제안 자료](/admin-mb26/panel/requests)를 승인하기 전에 내용을 바로 수정할 수 있어요.' },
      { type: 'feature', text: '[자료 등록](/submit) 시 업로드·AI 분석 진행률을 진행 바로 보여드려요.' },
      { type: 'feature', text: '멤버가 [의견](/admin-mb26/panel/feedback)을 보내면 운영진에게 메일로 알려드려요.' },
      { type: 'improve', text: '[검색](/search) 필터와 [카드/목록](/files) 뷰 토글을 사이트 공통 컴포넌트 규칙에 맞췄어요.' },
      { type: 'fix', text: '모바일 메뉴 오버레이에 배경이 비치던 문제와, 파일 업로드·분석이 실패하면 페이지가 통째로 멈추던 문제를 고쳤어요.' },
      { type: 'fix', text: '자료 한 줄 설명이 문장 중간에 잘리거나, 못 읽는 파일 내용을 지어내던 문제를 고쳤어요.' },
    ],
    // 미디어 넣는 법: `node scripts/shots.mjs` 로 캡처 → public/changelog/ 에 생김 → 아래처럼 참조.
    // before/after: 바꾸기 전에 미리 캡처해 둔 스냅샷(_archive/<날짜>/)을 영구 파일명으로 복사해
    //   public/changelog/ 에 넣고 compare로 짝지음. (_archive/ 자체는 git 제외)
    // media: [
    //   { type: 'image', src: '/changelog/cards.jpg', caption: '개선된 화면' },
    //   { type: 'video', src: '/changelog/search-flow.webm', caption: '동작 데모' },
    //   { type: 'compare', before: '/changelog/home-before.jpg', after: '/changelog/home.jpg', caption: '홈 개편' },
    // ],
  },
  {
    date: '2026-08-17',
    title: '백로그 보드 · 의견 관리(VOC) · 카드 액션 · 도메인 이전',
    changes: [
      { type: 'feature', text: '운영진 공용 [백로그 칸반 보드](/admin-mb26/panel/backlog)를 추가해 할 일을 함께 관리해요.' },
      { type: 'feature', text: '[의견 관리(VOC) 전용 페이지](/admin-mb26/panel/feedback)와 [대시보드 피드백 탭](/admin-mb26/panel/dashboard)이 생겼어요.' },
      { type: 'feature', text: '[자료 카드](/files)에 다운로드·바로가기·재생 액션 아이콘과 목록형 보기 토글을 넣었어요.' },
      { type: 'feature', text: '[자료 등록](/submit) 시 파일을 끌어다 놓아 올릴 수 있어요(드래그앤드롭).' },
      { type: 'improve', text: '주소를 [macbe-archive.com](https://macbe-archive.com)으로 옮기고, 옛 주소로 들어와도 자동으로 넘어가게 했어요.' },
      { type: 'improve', text: '관리자 메뉴를 홈·대시보드·자료등록요청·VOC·운영진 초대로 재편하고, 안내 문구 존댓말 톤을 통일했어요.' },
      { type: 'fix', text: '운영진 수가 실제보다 적게 표시되던 집계 버그를 고쳤어요.' },
    ],
    media: [
      { type: 'image', src: '/changelog/admin-backlog.jpg', caption: '운영진 공용 백로그 칸반 보드' },
      { type: 'image', src: '/changelog/admin-voc.jpg', caption: '의견 관리(VOC) 보드' },
      { type: 'image', src: '/changelog/cards.jpg', caption: '자료 카드 액션 아이콘·목록 보기 토글' },
    ],
  },
  {
    date: '2026-08-13',
    title: '직접 업로드(10MB) · 행동 기준 태그',
    changes: [
      { type: 'improve', text: '[파일 업로드](/submit)를 브라우저에서 바로 올리는 방식으로 바꾸고 한도를 10MB로 넓혔어요.' },
      { type: 'improve', text: '[자료 태그](/files)를 행동 기준으로 정리했어요 — 다운로드/바로 보기. 파일 형식은 보조 정보로 내렸어요.' },
    ],
  },
  {
    date: '2026-08-10',
    title: '다크 푸터 · 모바일 사용성 · 버튼 통일',
    changes: [
      { type: 'feature', text: '다크 톤 푸터와 [검색 결과](/search)에서 [FAQ](/faq) 펼쳐보기를 추가했어요.' },
      { type: 'improve', text: '모바일 사용성 검수 결과를 반영하고, 검색이 걸러야 할 불용어를 넓혔어요.' },
      { type: 'improve', text: '버튼을 사이트 공용 컴포넌트로 통일했어요.' },
      { type: 'fix', text: '카카오톡 웹뷰 표시 문제, iOS에서 검색창을 누르면 화면이 확대되던 문제, 도구·파일 링크가 아티클로 잘못 분류되던 문제를 고쳤어요.' },
    ],
    media: [{ type: 'image', src: '/changelog/footer.jpg', caption: '다크 톤 푸터' }],
  },
  {
    date: '2026-08-09',
    title: '디자인 시스템 확정 · 홈 배너 · 다크모드 제거',
    changes: [
      { type: 'feature', text: '기본 색을 토스 블루로 확정하고 라운드·간격 토큰을 정비했어요([스타일 가이드](/design) 문서화).' },
      { type: 'feature', text: '[홈](/)에 슬라이드 배너(자료 제안·양식)와 전환 진행 게이지를 넣었어요.' },
      { type: 'feature', text: '방문 분석(GA4)을 연결하고, 구글 드라이브 폴더를 자료실로 동기화하는 도구를 붙였어요.' },
      { type: 'feature', text: '[자료 등록](/submit) 시 HWP·HWPX 문서의 본문도 읽어 분석해요.' },
      { type: 'improve', text: '[FAQ](/faq) 카테고리를 앵커 이동에서 진짜 필터로 바꾸고, 칩을 둥근 pill로 통일했어요.' },
      { type: 'remove', text: '다크모드를 걷어내고 라이트 단일 테마로 정리했어요.' },
    ],
  },
  {
    date: '2026-08-07',
    title: 'AI 분석 강화 — 유튜브·본문 이해',
    changes: [
      { type: 'improve', text: '[자료 등록](/submit) 시 유튜브 영상 내용을 이해하고 아티클 본문까지 분석해 요약·분류 정확도를 높였어요.' },
    ],
  },
  {
    date: '2026-07-29',
    title: '오타·초성 검색 · 전역 검색 접이식',
    changes: [
      { type: 'feature', text: '오타를 허용하고 초성·태그로도 [검색](/search)되며, 결과가 없을 때 안내 화면을 보여줘요.' },
      { type: 'improve', text: '헤더 전역 검색을 접이식으로 바꿔 목록 안 검색과 중복 노출을 없앴어요.' },
    ],
    media: [
      { type: 'video', src: '/changelog/search-flow.webm', caption: '검색 데모 — 오타·유의어까지 잡아내는 검색' },
      { type: 'image', src: '/changelog/search.jpg', caption: '유의어 확장·카테고리별 검색 결과' },
    ],
  },
  {
    date: '2026-07-09',
    title: '이메일 알림 · FAQ 마크다운',
    changes: [
      { type: 'feature', text: '[자료 제안](/submit)·승인·반려 시 운영진과 제안자에게 이메일로 알려드려요.' },
      { type: 'feature', text: '[FAQ](/faq) 답변에 마크다운 서식과 접기/펼치기를 지원해요.' },
    ],
    media: [{ type: 'image', src: '/changelog/faq.jpg', caption: '실무 Q&A — 카테고리 필터·펼치기' }],
  },
  {
    date: '2026-07-06',
    title: '디자인 개편(ADS) · 대메뉴 재편',
    changes: [
      { type: 'improve', text: '디자인을 Atlassian Design System 기준으로 토큰·컴포넌트까지 전면 교체했어요.' },
      { type: 'improve', text: "대메뉴를 자료 형식 기준으로 재편했어요 — 아티클·영상을 [콘텐츠](/insights)로 통합." },
    ],
  },
  {
    date: '2026-06-01',
    title: '맥비 자료실 정식 오픈',
    changes: [
      { type: 'feature', text: '검색 중심 [홈](/), [양식·템플릿](/files)/[콘텐츠](/insights)/[실무 Q&A](/faq) 분류, [자료 등록](/submit)·승인 흐름을 갖춘 자료실을 열었어요.' },
      { type: 'feature', text: '스프레드시트를 Supabase로 자동 동기화하고, 자동완성·동의어·관련도 정렬 [검색](/search)을 붙였어요.' },
    ],
    media: [{ type: 'image', src: '/changelog/home.jpg', caption: '검색 중심 홈 화면' }],
  },
];
