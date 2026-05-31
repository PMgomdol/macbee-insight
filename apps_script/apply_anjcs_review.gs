/**
 * 안재찬 분담 36건 메타 보강 — 자료 DB (검토중) 시트
 *
 * 처리 대상: 검토자='안재찬' AND 검토 완료 여부='TRUE'
 * 업데이트 컬럼: 태그, 자료 제목, 보조설명
 *
 * 사용법:
 *   1) Apps Script 에디터에서 applyAnjcsReview_dryRun() 먼저 실행 → 로그로 확인
 *   2) 문제 없으면 applyAnjcsReview() 실행
 *
 * 안전장치:
 *   - 검토자 일치 + No 일치 둘 다 확인 후 업데이트
 *   - 검토 완료 여부=TRUE만 (삭제는 건너뜀)
 *   - 기존 태그/제목/요약이 비어있는 경우만 덮어씀 (덮어쓰기 옵션은 OVERWRITE 변수)
 */

const SHEET_ID = '1vAn3ufrdf2qDjiRGf82S5096cZ7v1cIUnrTAkZBeqWM';
const TAB_NAME = '자료 DB (검토중)';
const REVIEWER = '안재찬';
const OVERWRITE = false; // true면 기존 값 덮어씀

const REVIEW_DATA = [
  {no: 91,  title_ko: '머터리얼 디자인 가이드라인',                summary: '확인 불가',                                                                                                                            tags: ['머터리얼디자인','Material Design','Google','디자인시스템','공식문서','안드로이드']},
  {no: 92,  title_ko: 'iOS 휴먼 인터페이스 가이드라인',           summary: 'Apple이 iOS·macOS·watchOS·tvOS 등 자사 플랫폼용 UI 설계 원칙과 컴포넌트 지침을 제공하는 공식 디자인 가이드라인 문서.',                  tags: ['iOS HIG','Human Interface Guidelines','Apple','디자인시스템','공식문서','디자인원칙']},
  {no: 93,  title_ko: 'IT 회사의 온라인 브랜드 가이드라인 사례',   summary: '인하우스 브랜드 디자이너가 인스타그램·우버·스포티파이·넷플릭스 등 IT 기업 7곳의 웹 기반 브랜드 가이드라인을 소개하고, 수정·배포가 쉬운 온라인 방식의 실용성을 설명하는 브런치 글.', tags: ['브랜드가이드라인','브랜딩','사례','인하우스','리뷰']},
  {no: 95,  title_ko: '채널톡 공식 사용 가이드',                 summary: '채널톡을 도입한 비즈니스 운영자·상담 매니저를 대상으로 상담 자동화, 팀 협업, 고객 관리, 분석·마케팅, 음성·영상 통화 등 전 기능을 18개 카테고리·100여 개 아티클로 안내하는 공식 도움말.', tags: ['채널톡','Channel Talk','고객상담','공식문서','운영자가이드']},
  {no: 98,  title_ko: '배민사장님 이용 가이드',                  summary: '확인 불가',                                                                                                                            tags: ['배달의민족','배민사장님','셀러가이드','공식문서']},
  {no: 102, title_ko: '스케치 클라우드 사용자 매뉴얼 한글 번역',  summary: '스케치(Sketch) 디자인 툴의 클라우드 기능에 대한 비공식 번역 매뉴얼로, 계정 생성, 문서 업로드·공유, 댓글 피드백, 라이브러리 활용 등 협업 워크플로를 설명하는 브런치 글.', tags: ['스케치','Sketch','Sketch Cloud','매뉴얼','협업','한글번역']},
  {no: 103, title_ko: '스케치 핵심 강좌 모음 (디자인베이스)',     summary: '디자인베이스에서 제공하는 스케치(Sketch) 디자인 도구 동영상 강좌 시리즈로, 심볼·프로토타입·플러그인·리사이징·레이어 스타일·에셋 내보내기 등 초급부터 고급까지 29개 강좌를 제공한다.', tags: ['스케치','Sketch','강의','디자인베이스','튜토리얼']},
  {no: 104, title_ko: '액슈어 사용법 01 - 기본 환경',            summary: 'Axure RP 프로토타이핑 도구의 기본 인터페이스(툴바·캔버스·페이지·라이브러리·마스터·속성·노트·스타일 패널)를 처음 입문자 시점에서 설명하는 튜토리얼 글이다.', tags: ['액슈어','Axure','프로토타이핑','튜토리얼','와이어프레임']},
  {no: 106, title_ko: '액슈어 공식 포럼',                       summary: 'Axure RP의 공식 커뮤니티 포럼으로, 버전별(8·9·10·11 베타) 다운로드 정보, Axure Cloud 안내, Team Projects 논의 등 사용자 질문과 답변이 오가는 Discourse 기반 포럼이다.', tags: ['액슈어','Axure','커뮤니티','공식문서','프로토타이핑']},
  {no: 108, title_ko: '스케치를 피그마로 변환 (Magicul)',        summary: 'Magicul(구 xd2sketch)의 Sketch→Figma 자동 변환 서비스로, 심볼·컴포넌트·프로토타이핑 전환·텍스트/컬러 스타일을 픽셀 퍼펙트 수준으로 옮겨주며 파일당 $94부터 과금된다.', tags: ['스케치','피그마','Sketch','Figma','파일변환','Magicul']},
  {no: 109, title_ko: '피그마를 스케치로 변환 (Magicul)',        summary: 'Magicul의 Figma→Sketch 자동 변환 서비스로, 컴포넌트·프로토타이핑 전환·텍스트/컬러 스타일을 보존하며 파일당 $94 종량제 또는 연 $499 무제한 플랜으로 제공된다.', tags: ['피그마','스케치','Figma','Sketch','파일변환','Magicul']},
  {no: 110, title_ko: 'XD를 스케치로 변환 (Magicul)',            summary: 'Magicul의 디자인 파일 변환 엔진 메인 페이지로, Adobe XD·Figma·Sketch 등 40여 가지 포맷 간 자동 변환과 Figma 백업·Magicul Inspector 뷰어를 함께 제공한다.', tags: ['XD','스케치','Sketch','Adobe XD','파일변환','Magicul']},
  {no: 112, title_ko: 'UI 디자인 툴 사용률 비교 (UX Tools)',     summary: 'UX Tools가 매년 집계하는 디자인 툴 데이터베이스로, Figma(82.3%)·Sketch·Adobe XD·Illustrator·Framer 등 11개 UI 디자인 도구의 사용률과 사용자 평점을 순위로 비교한다.', tags: ['피그마','스케치','Adobe XD','비교','UX Tools','사용률통계']},
  {no: 113, title_ko: '프로토타이핑 툴 사용률 비교 (UX Tools)',  summary: 'UX Tools의 프로토타이핑 도구 비교 페이지로, Figma(71.4%)·ProtoPie·Adobe XD·HTML/CSS/JS·Sketch·Framer 등 주요 도구의 사용률과 평점을 데이터로 정리한다.', tags: ['피그마','ProtoPie','Framer','프로토타이핑','비교','UX Tools']},
  {no: 114, title_ko: '포트폴리오 빌더 도구 비교 데이터',        summary: 'UX Tools가 운영하는 도구 데이터베이스로, Framer·Webflow·Adobe Portfolio·Notion 등 포트폴리오 제작 도구들의 실제 사용률과 만족도 평점을 비교해 보여준다.', tags: ['UX Tools','포트폴리오','Framer','Webflow','비교','도구통계']},
  {no: 115, title_ko: '디자인시스템 도구 비교 데이터',           summary: 'UX Tools 데이터베이스에서 Figma·Storybook·zeroheight·Zeplin 등 디자인시스템 구축·관리 도구들의 사용률과 사용자 평점을 정리해 비교한 페이지다.', tags: ['UX Tools','디자인시스템','Figma','Storybook','zeroheight','비교']},
  {no: 117, title_ko: '피그마란? 주요 기능 소개',                summary: '디자이너 이상효가 피그마의 UI 드로잉·실시간 공유·컴포넌트/라이브러리/플러그인 등 시스템적 활용을 버즈빌·우버 사례와 함께 정리한 입문 가이드다.', tags: ['Figma','피그마','가이드','협업','플러그인']},
  {no: 118, title_ko: '피그마는 왜 이기는가 (한국어판)',         summary: 'Relate 블로그 번역글로, 피그마가 브라우저 기반 실시간 협업과 디자이너-비디자이너 간 크로스 네트워크 효과, 플러그인 생태계로 승리한 구조를 분석한다.', tags: ['Figma','피그마','성장전략','네트워크효과','리뷰']},
  {no: 119, title_ko: '피그마 코리아 페이스북 그룹',             summary: '확인 불가',                                                                                                                            tags: ['Figma','피그마','커뮤니티','페이스북']},
  {no: 122, title_ko: '기획자의 피그마 유튜브 채널',             summary: '확인 불가',                                                                                                                            tags: ['Figma','피그마','유튜브','기획자']},
  {no: 123, title_ko: "연정's 피그마 강의 유튜브 채널",          summary: '확인 불가',                                                                                                                            tags: ['Figma','피그마','유튜브','강의']},
  {no: 124, title_ko: '연정의 피그마 블로그',                    summary: 'Figma 가이드·팁·소식을 다루는 한국어 교육 블로그로, 초급자용 기초 강좌부터 디자인 시스템, 플러그인, 오토레이아웃 등 실무 팁까지 제공한다.', tags: ['피그마','Figma','디자인시스템','튜토리얼','플러그인','한국어블로그']},
  {no: 128, title_ko: '스케치보다 피그마가 좋은 이유',           summary: 'Sketch·Abstract·Zeplin을 Figma 하나로 대체할 수 있다는 점, 실시간 협업, 컴포넌트·오토레이아웃 기반 디자인 시스템 구축 등 피그마의 강점을 스케치와 비교해 설명한다.', tags: ['피그마','Figma','스케치','Sketch','비교','실시간협업']},
  {no: 129, title_ko: '어도비 XD·스케치·피그마 비교',            summary: 'Adobe XD, Sketch, Figma 세 UI 디자인 툴을 도구 특성·가격·기능·선택 기준 4가지 관점에서 비교하며, 국내 환경 호환성을 이유로 XD를, 순수 디자인 측면에서는 피그마를 추천하는 글이다.', tags: ['피그마','Figma','스케치','Sketch','Adobe XD','비교']},
  {no: 132, title_ko: '워크플로우를 빠르게 만드는 피그마 플러그인 15선', summary: 'Autoflow·Remove BG·Content Reel·Unsplash·Iconscout 등 디자이너 워크플로우를 가속화하는 Figma 플러그인 15가지를 기능별로 정리해 소개한다.', tags: ['피그마','Figma','플러그인','워크플로우','추천목록']},
  {no: 133, title_ko: 'UX 디자이너가 추천하는 피그마 플러그인',  summary: 'Product Planner, HTML to Figma, Wireframe, Autoflow, Content Reel 등 실무에서 자주 쓰이는 피그마 플러그인을 기능과 활용법 중심으로 추천하는 글이다.', tags: ['피그마','Figma','플러그인','추천목록','UX실무']},
  {no: 135, title_ko: '피그마 무료 리소스 사이트 모음',         summary: 'FigmaCrush, Figma Resources, FreebiesUI, Setproduct, Figma 공식 페이지 등 템플릿·UI키트·아이콘·목업을 무료로 제공하는 사이트 10곳을 카테고리별로 정리했다.', tags: ['피그마','Figma','무료리소스','템플릿','UI키트','아이콘']},
  {no: 137, title_ko: '알고 계셨나요? 피그마 숨은 기능 23가지',  summary: '디자이너 김범용이 정리한 피그마 활용 팁 23가지로, 오브젝트 정렬·레이어 관리·자간조정·오토레이아웃·이미지 크롭 등 초·중급자 생산성을 높이는 단축키와 숨은 기능을 모았다.', tags: ['피그마','Figma','단축키','생산성팁','오토레이아웃']},
  {no: 148, title_ko: '피그마의 모든 것: 프레임 편 1',          summary: '피그마에서 프레임의 개념과 그룹/사각형과의 차이, Preset·Resize to fit·Clip content·오토레이아웃·레이아웃 그리드 등 프레임의 고유 기능을 설명하는 교육용 아티클.', tags: ['피그마','Figma','프레임','오토레이아웃','튜토리얼']},
  {no: 149, title_ko: '피그마의 모든 것: 프레임 편 2',          summary: '피그마 프레임의 중첩 구조, Constraints(좌·우·상·하·Center·Scale) 동작, 레이아웃 그리드(Columns·Rows) 세부 설정, 프로토타입 단위로서의 프레임을 다루는 후속 아티클.', tags: ['피그마','Figma','프레임','Constraints','레이아웃그리드','튜토리얼']},
  {no: 150, title_ko: '피그마 프레임과 그룹의 차이',            summary: '피그마 초보자를 위해 프레임(경계와 자체 좌표계를 가진 컨테이너)과 그룹(레이어 묶음)의 구조적 차이, 프리셋 프레임 활용, 속성 패널·Constraints·둥근 모서리 처리 차이를 비교 설명하는 글.', tags: ['피그마','Figma','프레임','그룹','튜토리얼']},
  {no: 151, title_ko: '피그마와 웹폰트, 개발 관점에서 보기',    summary: '피그마가 구글폰트를 기본 제공해 폰트 선택이 쉬워진 점을 짚고, 웹폰트의 렌더링 지연·한글 용량 문제와 FOIT/FOUT·woff2 최적화·IE 호환 같은 개발 측면 이슈를 설명한 아티클.', tags: ['피그마','Figma','웹폰트','폰트','FOIT/FOUT','가이드']},
  {no: 152, title_ko: '피그마로 보는 스크롤뷰의 진실',         summary: '피그마 프로토타입으로 실기기 시뮬레이션을 하면서 모바일(스크롤뷰 컴포넌트 제어)과 웹(CSS overflow·flex 제어)의 스크롤 구현 방식 차이를 비교한 글.', tags: ['피그마','Figma','스크롤뷰','프로토타이핑','가이드']},
  {no: 153, title_ko: '피그마 한글 자음모음 분리 해결법',       summary: '확인 불가',                                                                                                                            tags: ['피그마','Figma','한글입력','자음분리','트러블슈팅']},
  {no: 154, title_ko: '반응형 PSD·피그마 그리드 템플릿',        summary: '확인 불가',                                                                                                                            tags: ['피그마','Figma','반응형그리드','무료리소스','Dribbble']},
  {no: 155, title_ko: 'AWS, 피그마 연동 노코드 플랫폼 공개',    summary: 'AWS가 re:Invent 2021에서 발표한 Amplify Studio 소개 기사. 피그마 컴포넌트를 UI 라이브러리로 동기화해 디자이너는 피그마로 UI를, 개발자는 백엔드·로직을 연결하는 로우코드 워크플로를 제공한다는 내용.', tags: ['피그마','Figma','AWS Amplify Studio','노코드','AWS연동','뉴스']}
];

function applyAnjcsReview_dryRun() {
  _applyAnjcsReview(true);
}

function applyAnjcsReview() {
  _applyAnjcsReview(false);
}

function _applyAnjcsReview(dryRun) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(TAB_NAME);
  if (!sheet) throw new Error('탭 못 찾음: ' + TAB_NAME);

  const values = sheet.getDataRange().getValues();
  const header = values[0];
  const colReviewer = header.indexOf('검토자');
  const colDone     = header.indexOf('검토 완료 여부');
  const colNo       = header.indexOf('No');
  const colTags     = header.indexOf('태그');
  const colTitle    = header.indexOf('자료 제목');
  const colSummary  = header.indexOf('보조설명');

  if ([colReviewer, colDone, colNo, colTags, colTitle, colSummary].some(i => i < 0)) {
    throw new Error('컬럼 인덱스 못 찾음. 헤더 확인: ' + JSON.stringify(header));
  }

  const dataMap = {};
  REVIEW_DATA.forEach(d => { dataMap[String(d.no)] = d; });

  let matched = 0, updated = 0, skipped = 0;
  const log = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (String(row[colReviewer]).trim() !== REVIEWER) continue;
    if (String(row[colDone]).trim().toUpperCase() !== 'TRUE') continue;
    const noKey = String(row[colNo]).trim();
    const d = dataMap[noKey];
    if (!d) continue;
    matched++;

    const curTags    = String(row[colTags] || '').trim();
    const curTitle   = String(row[colTitle] || '').trim();
    const curSummary = String(row[colSummary] || '').trim();

    const writeTags    = OVERWRITE || !curTags;
    const writeTitle   = OVERWRITE || !curTitle || curTitle !== d.title_ko;
    const writeSummary = OVERWRITE || !curSummary;

    const newTags    = d.tags.join(',');
    const newTitle   = d.title_ko;
    const newSummary = d.summary;

    if (!writeTags && !writeTitle && !writeSummary) {
      skipped++;
      continue;
    }

    log.push(`No ${noKey}: ${writeTitle ? `제목 [${curTitle}] → [${newTitle}]` : '제목 유지'}`);

    if (!dryRun) {
      if (writeTags)    sheet.getRange(r + 1, colTags    + 1).setValue(newTags);
      if (writeTitle)   sheet.getRange(r + 1, colTitle   + 1).setValue(newTitle);
      if (writeSummary) sheet.getRange(r + 1, colSummary + 1).setValue(newSummary);
    }
    updated++;
  }

  const mode = dryRun ? '[DRY-RUN]' : '[APPLIED]';
  Logger.log(`${mode} 매칭 ${matched}건 / 업데이트 ${updated}건 / 스킵 ${skipped}건`);
  log.slice(0, 50).forEach(l => Logger.log(l));
  if (log.length > 50) Logger.log(`... 외 ${log.length - 50}건`);
}
