/**
 * 1회성 셋업 함수들. Apps Script 에디터에서 직접 실행.
 *
 * 실행 순서:
 *   1) setProperties()  - SHEET_ID, DRIVE_ROOT_ID, GEMINI_API_KEY 설정
 *   2) initSheets()     - 자료 DB / _staging_ / 카테고리 / _점검로그 시트 생성
 *   3) initDriveFolders() - 카테고리별 폴더 생성
 *   4) installTriggers()  - 주간 점검·백업 트리거 등록
 */

function setProperties() {
  const required = ['SHEET_ID', 'DRIVE_ROOT_ID', 'GEMINI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
  const cur = PropertiesService.getScriptProperties().getProperties();
  const missing = required.filter(k => !cur[k]);
  if (missing.length === 0) {
    Logger.log('Properties already set. Skipping. (편집은 Project Settings > Script Properties)');
    return;
  }
  // 첫 셋업이거나 누락된 항목이 있을 때만 placeholder 검사
  const props = {
    SHEET_ID: 'PASTE_SPREADSHEET_ID_HERE',
    DRIVE_ROOT_ID: 'PASTE_DRIVE_FOLDER_ID_HERE',
    GEMINI_API_KEY: 'PASTE_GEMINI_KEY_HERE',
    SUPABASE_URL: 'PASTE_SUPABASE_URL_HERE',           // https://<project>.supabase.co
    SUPABASE_SERVICE_KEY: 'PASTE_SUPABASE_SERVICE_KEY_HERE',  // sb_secret_*
  };
  if (Object.values(props).some(v => String(v).startsWith('PASTE_'))) {
    throw new Error('Properties placeholders. setup.gs를 채운 뒤 다시 실행하세요.');
  }
  PropertiesService.getScriptProperties().setProperties(props);
  Logger.log('Properties saved: ' + Object.keys(props).join(', '));
}

/**
 * 한 번에 모든 셋업을 실행하는 함수.
 * 사용자는 이 함수만 한 번 실행하면 됩니다.
 */
function bootstrap() {
  setProperties();
  initSheets();
  initDriveFolders();
  installTriggers();
  Logger.log('✅ Bootstrap complete. Web App을 배포하세요.');
}

function initSheets() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);

  ensureSheet_(ss, CONFIG.SHEETS.SSOT, [
    'No', '대분류', '소분류', '태그', '자료 제목', '보조설명',
    '외부 링크', '파일 링크', '자료 형식', '발행일', '등록일', '등록자',
    '상태', '마지막 점검일', '카테고리 담당', '노출 등급', '비고',
    '조회수', '다운로드수',
  ]);

  ensureSheet_(ss, CONFIG.SHEETS.STAGING, [
    'id', '제출일시', '제안자', 'URL', '파일 링크', '제목', '한줄설명',
    '대분류', '소분류', '태그', '자료 형식', '발행일',
    '상태', '승인자목록', '검토메모',
  ]);

  ensureSheet_(ss, CONFIG.SHEETS.CATEGORY, [
    '대분류', '소분류', '설명', '', '담당자', '채널 1', '채널 2', '모니터링 요일',
  ]);
  // 카테고리 시드
  const catSheet = ss.getSheetByName(CONFIG.SHEETS.CATEGORY);
  if (catSheet.getLastRow() <= 1) {
    catSheet.getRange(2, 1, 14, 8).setValues([
      ['면접/채용/이직', '경력직 채용', '경력직 채용 관련 자료', '', '임종헌', '1번방', 'PM/PO방', '화·목·토'],
      ['면접/채용/이직', '면접 준비', '면접 질문/팁', '', '김다슬', '1번방', 'UX 방법론', '월·수·금·일'],
      ['면접/채용/이직', 'AI 면접', 'AI 기반 면접 서비스/후기', '', '안재찬', '2번방', 'PM/PO방', '화·목·토'],
      ['면접/채용/이직', '디자인 에이전시', '에이전시 입사/커리어', '', '서지연', '2번방', 'PM/PO방', '월·수·금·일'],
      ['면접/채용/이직', '자기소개서', '자소서 작성 팁 및 예시', '', '박사랑', '3번방', 'UX 방법론', '월·수·금'],
      ['기획/PM', '포트폴리오', 'PM/기획 포트폴리오 자료', '', '정라현', '3번방', 'UX 방법론', '화·목·토·일'],
      ['기획/PM', '문서 작성', '기획서, 스펙 문서 작성', '', '정지용', '4번방', '', '월~일'],
      ['기획/PM', '프로세스', '기획 프로세스 및 방법론', '', '', '', '', ''],
      ['UX/디자인', 'UI 패턴', 'UI 컴포넌트 및 패턴', '', '', '', '', ''],
      ['UX/디자인', '리서치', '사용자 리서치 방법론', '', '', '', '', ''],
      ['개발/기술', '협업 도구', '개발팀 협업 관련 자료', '', '', '', '', ''],
      ['커리어', '이직', '이직 전략 및 타이밍', '', '', '', '', ''],
      ['커리어', '성장', '커리어 성장, 자기계발', '', '', '', '', ''],
      ['비즈니스/마케팅', '마케팅 전략', '캠페인·연간플랜·콘텐츠 전략', '', '', '', '', ''],
      ['비즈니스/마케팅', '예산/계획', '예산 산정·KPI·재무 계획', '', '', '', '', ''],
      ['비즈니스/마케팅', '데이터 분석', '데이터 분석·통계·리포트', '', '', '', '', ''],
      ['UX/디자인', 'UX 라이팅', 'UX Writing·마이크로카피', '', '', '', '', ''],
      ['UX/디자인', '디자인 툴', '피그마·XD·스케치 등 툴 사용 자료', '', '', '', '', ''],
      ['UX/디자인', '브랜딩', '브랜드 전략·아이덴티티', '', '', '', '', ''],
      ['개발/기술', '정책·법규', '개인정보보호·약관·법적 이슈', '', '', '', '', ''],
      ['개발/기술', '트렌드', 'IT·기술 트렌드 자료', '', '', '', '', ''],
      ['미분류', '', 'AI가 분류 실패한 자료의 임시 위치', '', '', '', '', ''],
    ]);
  }

  // _review_queue_ 시트: 시의성 보류·검토 대기
  ensureSheet_(ss, '_review_queue_', [
    'id', '대분류', '소분류', '제목', '링크', '자료 형식', '발행일',
    '원본 카테고리', '보류 사유', '검토 결과', '검토자', '검토일',
  ]);

  // FAQ 시트: 질문/답변
  ensureSheet_(ss, 'FAQ', [
    'No', '대분류', '소분류', '질문', '답변', '등록일', '조회수', '비고',
  ]);

  ensureSheet_(ss, CONFIG.SHEETS.LOG, [
    '점검일시', '대상', 'URL', '결과', '비고',
  ]);

  Logger.log('Sheets initialized.');
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  // 헤더가 비어있거나 다르면 모두 기록
  const lastCol = Math.max(sheet.getLastColumn(), headers.length);
  const cur = sheet.getLastRow() === 0 ? [] : sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const same = headers.every((h, i) => cur[i] === h);
  if (!same) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function createStagingSheet_(ss) {
  initSheets();
  return ss.getSheetByName(CONFIG.SHEETS.STAGING);
}

function initDriveFolders() {
  const root = DriveApp.getFolderById(CONFIG.DRIVE_ROOT_ID);
  const folders = [
    '00_운영',
    '01_면접·채용·이직',
    '02_기획·PM',
    '03_UX·디자인',
    '04_개발·기술',
    '05_커리어',
    '99_미분류',
    '_staging_uploads',
    '_백업',
  ];
  folders.forEach(name => {
    if (!root.getFoldersByName(name).hasNext()) {
      root.createFolder(name);
      Logger.log('Created folder: ' + name);
    }
  });
}

function installTriggers() {
  // 기존 트리거 정리
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // 매주 월요일 06:00 - 링크 점검
  ScriptApp.newTrigger('weeklyLinkCheck').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(6).create();
  // 매주 일요일 03:00 - 백업 스냅샷
  ScriptApp.newTrigger('weeklyBackup').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(3).create();

  // 시트 편집 시 Supabase 실시간 동기화
  ScriptApp.newTrigger('onEditSyncToSupabase')
    .forSpreadsheet(CONFIG.SHEET_ID)
    .onEdit()
    .create();
  // 매일 03:00 - 안전망 풀싱크 (onEdit 누락 대비)
  ScriptApp.newTrigger('dailySyncCron').timeBased().everyDays(1).atHour(3).create();

  Logger.log('Triggers installed.');
}

/**
 * 자가진단. Apps Script 에디터에서 실행하면 Logger.log로 결과 출력.
 */
function doctor() {
  const lines = [];
  const ok = (m) => lines.push('✅ ' + m);
  const warn = (m) => lines.push('⚠️  ' + m);
  const err = (m) => lines.push('❌ ' + m);

  const props = PropertiesService.getScriptProperties().getProperties();
  ['SHEET_ID', 'DRIVE_ROOT_ID', 'GEMINI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'].forEach(k => {
    const isSecret = k === 'GEMINI_API_KEY' || k === 'SUPABASE_SERVICE_KEY';
    if (props[k]) ok('Property ' + k + ' set (' + (isSecret ? '***' : props[k].substring(0, 30) + '...') + ')');
    else err('Property ' + k + ' MISSING');
  });

  // Supabase ping
  try {
    if (typeof supabasePing === 'function' && props.SUPABASE_URL && props.SUPABASE_SERVICE_KEY) {
      const p = supabasePing();
      if (p.ok) ok('Supabase ping OK (HTTP ' + p.code + ')');
      else err('Supabase ping FAIL: ' + (p.code || '') + ' ' + (p.body || p.error || ''));
    }
  } catch (e) { warn('Supabase ping 호출 실패: ' + e); }

  try {
    const ss = SpreadsheetApp.openById(props.SHEET_ID);
    ok('시트 열림: ' + ss.getName());
    Object.values(CONFIG.SHEETS).forEach(name => {
      const s = ss.getSheetByName(name);
      if (!s) err('탭 없음: ' + name);
      else ok('탭 OK: ' + name + ' (rows=' + s.getLastRow() + ')');
    });

    const staging = ss.getSheetByName(CONFIG.SHEETS.STAGING);
    if (staging) {
      const headers = staging.getLastRow() > 0
        ? staging.getRange(1, 1, 1, staging.getLastColumn()).getValues()[0]
        : [];
      const has = (h) => headers.indexOf(h) >= 0;
      if (has('승인자목록')) ok('staging 헤더 v2 확인 (승인자목록)');
      else warn('staging 헤더가 v1입니다. initSheets 다시 실행 필요.');
    }

    const ssot = ss.getSheetByName(CONFIG.SHEETS.SSOT);
    if (ssot) {
      const sh = ssot.getRange(1, 1, 1, ssot.getLastColumn()).getValues()[0];
      if (sh.indexOf('조회수') >= 0) ok('SSOT 헤더 v2 확인 (조회수/다운로드수)');
      else warn('SSOT 헤더가 v1입니다. initSheets 다시 실행 필요.');
    }
  } catch (e) {
    err('시트 접근 실패: ' + e);
  }

  try {
    const root = DriveApp.getFolderById(props.DRIVE_ROOT_ID);
    ok('Drive 폴더 열림: ' + root.getName());
    ['01_면접·채용·이직', '02_기획·PM', '_staging_uploads', '_백업', '99_미분류'].forEach(n => {
      if (root.getFoldersByName(n).hasNext()) ok('하위폴더 OK: ' + n);
      else warn('하위폴더 없음: ' + n + ' (initDriveFolders 필요)');
    });
  } catch (e) {
    err('Drive 접근 실패: ' + e);
  }

  const triggers = ScriptApp.getProjectTriggers();
  if (triggers.length === 0) warn('등록된 트리거 없음 (installTriggers 필요)');
  else ok('트리거 ' + triggers.length + '개 등록됨: ' + triggers.map(t => t.getHandlerFunction()).join(', '));

  // staging 최근 5건 미리보기 (등록 디버깅용)
  try {
    const ss = SpreadsheetApp.openById(props.SHEET_ID);
    const stg = ss.getSheetByName(CONFIG.SHEETS.STAGING);
    if (stg && stg.getLastRow() > 1) {
      lines.push('--- 최근 staging 항목 (마지막 5건) ---');
      const lastN = Math.min(5, stg.getLastRow() - 1);
      const rows = stg.getRange(stg.getLastRow() - lastN + 1, 1, lastN, 15).getValues();
      rows.forEach(r => {
        lines.push('   [' + r[12] + '] ' + (r[5] || '(no title)') + ' / 승인: ' + (r[13] || '0명') + ' / 제안: ' + r[2]);
      });
    } else {
      lines.push('--- staging 비어있음 (제출 시도가 없거나 시트 권한 문제) ---');
    }

    const ssot = ss.getSheetByName(CONFIG.SHEETS.SSOT);
    if (ssot) {
      const rowCount = Math.max(0, ssot.getLastRow() - 1);
      lines.push('--- 자료 DB(SSOT) ' + rowCount + '건 등록됨 ---');
    }
  } catch (e) { warn('진단 보조 정보 읽기 실패: ' + e); }

  Logger.log('========= doctor 결과 =========');
  lines.forEach(l => Logger.log(l));
  return lines.join('\n');
}

/**
 * macbee-document 14개 파일을 SSOT에 등록.
 * 사전: 사용자가 14개 파일을 Drive 루트 폴더의 _staging_uploads/ 폴더에 업로드.
 * 동작: 파일명 매칭 → 매핑된 메타데이터로 SSOT 등록 + 카테고리 폴더로 이동.
 * 매핑되지 않은 파일은 스킵 + 로그.
 */
function importMacbeDocs() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const ssot = ss.getSheetByName(CONFIG.SHEETS.SSOT);
  if (!ssot) throw new Error('SSOT 시트가 없습니다.');

  const root = DriveApp.getFolderById(CONFIG.DRIVE_ROOT_ID);
  const staging = root.getFoldersByName('_staging_uploads').hasNext()
    ? root.getFoldersByName('_staging_uploads').next() : null;
  if (!staging) throw new Error('_staging_uploads 폴더가 없습니다. initDriveFolders 먼저 실행.');

  // 매핑 테이블 (파일명 정규화 후 매칭)
  const MAP = MACBE_DOC_MAPPING_();

  let imported = 0, skipped = 0;
  const log = [];
  const it = staging.getFiles();

  while (it.hasNext()) {
    const file = it.next();
    const fname = file.getName();
    const key = normalizeFileName_(fname);
    let entry = null;
    for (const k of Object.keys(MAP)) {
      if (key.indexOf(normalizeFileName_(k)) >= 0 || normalizeFileName_(k).indexOf(key) >= 0) {
        entry = MAP[k]; break;
      }
    }
    if (!entry) { skipped++; log.push('SKIP: ' + fname + ' (매핑 없음)'); continue; }

    // 표준 네이밍 규칙으로 rename
    const ext = (fname.match(/\.([^.]+)$/) || [, 'bin'])[1];
    const newName = buildStandardFileName_(entry, ext);
    if (newName !== fname) file.setName(newName);

    // 카테고리 폴더로 이동
    const folderName = mapCategoryToFolder_(entry.mainCategory);
    const target = getOrCreateChildFolder_(root, folderName);
    file.moveTo(target);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const lastNo = ssot.getLastRow() > 1
      ? Number(ssot.getRange(ssot.getLastRow(), 1).getValue()) || (ssot.getLastRow() - 1)
      : 0;

    ssot.appendRow([
      lastNo + 1,
      entry.mainCategory,
      entry.subCategory,
      (entry.tags || []).join(','),
      entry.title,
      entry.summary,
      '',                   // 외부 링크 없음
      file.getUrl(),        // 파일 링크
      entry.format,
      entry.publishedAt || '',
      new Date(),
      'macbee-document',    // 등록자
      'public',
      '',
      lookupCategoryOwner_(entry.mainCategory, entry.subCategory),
      'free',
      '내부 자료 일괄 import',
      0, 0,                 // 조회수, 다운로드수
    ]);

    imported++;
    log.push('OK : ' + fname + ' → ' + entry.title);
  }

  Logger.log('=== importMacbeDocs 결과: imported=' + imported + ', skipped=' + skipped + ' ===');
  log.forEach(l => Logger.log(l));
  if (imported > 0) invalidateSsotCache_();
  return { imported: imported, skipped: skipped, log: log };
}

function normalizeFileName_(s) {
  return String(s).toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')      // 확장자 제거
    .replace(/[\s\-_().]+/g, '')       // 공백·기호 제거
    .replace(/^\d+\.?\d*_?/, '');      // 앞쪽 번호 제거
}

/**
 * 기존 자료실(V2.1 / V2.2 / V3.1)에 흩어져 있던 자료들을 직접 분류해 SSOT에 import.
 * Apps Script 에디터에서 한 번 실행. 중복 import 방지를 위해 비고에 표시.
 */
function importExistingArchive() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const ssot = ss.getSheetByName(CONFIG.SHEETS.SSOT);
  if (!ssot) throw new Error('SSOT 시트가 없습니다.');

  const existingUrls = buildExistingUrlSet_(ssot);
  const data = EXISTING_ARCHIVE_DATA_();
  let imported = 0, skipped = 0;
  const log = [];

  data.forEach(d => {
    const key = normalizeUrl_(d.link);
    if (key && existingUrls.has(key)) { skipped++; log.push('SKIP(중복): ' + d.title); return; }
    if (key) existingUrls.add(key);

    const lastNo = ssot.getLastRow() > 1
      ? Number(ssot.getRange(ssot.getLastRow(), 1).getValue()) || (ssot.getLastRow() - 1)
      : 0;

    ssot.appendRow([
      lastNo + 1,
      d.main, d.sub,
      (d.tags || []).join(','),
      d.title, d.summary || '',
      d.link, '',
      d.format || '아티클',
      d.publishedAt || '',
      new Date(),
      d.proposer || '맥비기획',
      'public',
      '',
      lookupCategoryOwner_(d.main, d.sub),
      'free',
      '기존 자료실 일괄 import',
      0, 0,
    ]);
    imported++;
    log.push('OK: ' + d.title);
  });

  Logger.log('=== importExistingArchive: imported=' + imported + ', skipped=' + skipped + ' ===');
  log.forEach(l => Logger.log(l));
  if (imported > 0) invalidateSsotCache_();
  return { imported: imported, skipped: skipped };
}

/**
 * 기존 23건을 직접 분류한 데이터.
 * 발행일 미상(빈값)인 항목은 archive 페이지에서 "발행일 미상"으로 표시됨.
 */
function EXISTING_ARCHIVE_DATA_() {
  return [
    {
      title: '경력직 채용 시 반드시 확인해야 될 5가지!',
      link: 'https://www.youtube.com/watch?v=QSQedXT_EH8',
      main: '면접/채용/이직', sub: '경력직 채용', format: '영상',
      tags: ['경력직', '면접', '체크리스트'],
      summary: '채용 담당자 시점에서 경력직을 보는 기준 정리',
      publishedAt: '',
    },
    {
      title: '디자인 에이전시에서 경력을 시작하고 싶다면',
      link: 'https://www.notion.so/7f0f383e7a28494ebe0ba497d295e841',
      main: '면접/채용/이직', sub: '디자인 에이전시', format: '가이드',
      tags: ['에이전시', '경력시작', '디자인'],
      summary: '에이전시 입사·커리어 시작 가이드',
      publishedAt: '',
    },
    {
      title: '잡코리아 AI면접 서비스 분석',
      link: 'https://blog.naver.com/jun95990/222040783701',
      main: '면접/채용/이직', sub: 'AI 면접', format: '아티클',
      tags: ['AI면접', '자동화', '채용플랫폼'],
      summary: 'AI 기반 면접 서비스 작동 방식과 후기',
      publishedAt: '2020-07-24',
    },
    {
      title: 'Product 매니저 질문 리스트',
      link: 'https://dis.qa/cjy2UJS',
      main: '면접/채용/이직', sub: '면접 준비', format: '가이드',
      tags: ['PM면접', '질문리스트', '실무'],
      summary: 'Product 직무 면접 대비 질문 모음',
      publishedAt: '2023-09-23',
    },
    {
      title: 'Project 매니저 질문 리스트',
      link: 'https://www.ciokorea.com/news/29024',
      main: '면접/채용/이직', sub: '면접 준비', format: '가이드',
      tags: ['PM면접', '질문리스트', 'CIOkorea'],
      summary: 'Project 매니저 지원자 대비 질문 12선',
      publishedAt: '',
    },
    {
      title: '월요일에 푸시 알람 보내면 끝? 새 출발 효과 UX 제대로 이해하기',
      link: 'https://ditoday.com/%ec%9b%94%ec%9a%94%ec%9d%bc%ec%97%90-%ed%91%b8%ec%8b%9c-%ec%95%8c%eb%9d%bc%eb%a7%88-%eb%b3%b4%eb%82%b4%eb%a9%b4-%eb%9d%bc%ea%b3%a0/',
      main: 'UX/디자인', sub: '리서치', format: '아티클',
      tags: ['UX심리학', '새출발효과', '푸시알람'],
      summary: '새 출발 효과 심리 이론을 UX에 적용하는 법',
      publishedAt: '',
    },
    {
      title: '기획자/PM/PO의 커뮤니케이션',
      link: 'https://www.youtube.com/playlist?list=PLCJvYkQtqtgY6yM5_ToHZdr0Mc9Ag5wNh',
      main: '기획/PM', sub: '프로세스', format: '영상',
      tags: ['커뮤니케이션', 'PM', '플레이리스트'],
      summary: '기획자/PM/PO의 커뮤니케이션 영상 모음',
      publishedAt: '',
    },
    {
      title: '모던 UI는 정말 깔끔할까요, 아니면 더 헷갈리게 만들까요',
      link: 'https://billionnapkin.com/%eb%aa%a8%eb%8d%98-ui%eb%8a%94-%ec%a0%95%eb%a7%90-%ea%b9%94%eb%81%94%ed%95%a0%ea%b9%8c%ec%9a%94/',
      main: 'UX/디자인', sub: 'UI 패턴', format: '아티클',
      tags: ['모던UI', '미니멀', '가독성'],
      summary: '모던 UI의 미니멀리즘이 사용성에 미치는 영향',
      publishedAt: '',
    },
    {
      title: 'AI가 만든 위기 — 라는 착각',
      link: 'https://www.kakao.vc/blog/ai-crisis-illusion',
      main: '커리어', sub: '성장', format: '아티클',
      tags: ['AI', '커리어', '관점'],
      summary: 'AI 시대를 위기로만 볼 것인가에 대한 관점',
      publishedAt: '',
    },
    {
      title: '클로드를 위한 스킬 구축 완전 가이드',
      link: 'https://m.cafe.naver.com/ca-fe/web/cafes/31191837/articles/5',
      main: '개발/기술', sub: '협업 도구', format: '가이드',
      tags: ['Claude', 'AI도구', '스킬'],
      summary: 'Anthropic Claude 활용 스킬을 구축하는 가이드',
      publishedAt: '',
    },
    {
      title: '덕질하다 만든 웹사이트에 49만 명이 방문했다',
      link: 'https://yozm.wishket.com/magazine/detail/3628/',
      main: '기획/PM', sub: '프로세스', format: '아티클',
      tags: ['사이드프로젝트', '기획', '실행'],
      summary: '개인 프로젝트가 49만 트래픽으로 성장한 과정',
      publishedAt: '',
    },
    {
      title: '투자자가 YES라고 말하기 쉽게 만드는 법',
      link: 'https://blog.leanx.kr/%ED%88%AC%EC%9E%90%EC%9E%90%EA%B0%80-yes%EB%9D%BC%EA%B3%A0/',
      main: '비즈니스/마케팅', sub: '마케팅 전략', format: '아티클',
      tags: ['투자유치', '피치', '스타트업'],
      summary: '투자자가 의사결정하기 쉬운 피치 구조 만들기',
      publishedAt: '',
    },
    {
      title: 'PMF를 찾기 위한 5가지 교훈',
      link: 'https://blog.leanx.kr/pmf%EB%A5%BC-%EC%B0%BE%EA%B8%B0-%EC%9C%84%ED%95%9C-5%EA%B0%80%EC%A7%80-%EA%B5%90%ED%9B%88/',
      main: '기획/PM', sub: '프로세스', format: '아티클',
      tags: ['PMF', '스타트업', '제품전략'],
      summary: 'Product-Market Fit 탐색 시 자주 빠지는 함정과 교훈',
      publishedAt: '',
    },
    {
      title: '업데이트 전쟁 중인 AI 디자인 툴 (Stitch, Figma)',
      link: 'https://www.youtube.com/watch?si=Ho1HJtM45GheizdL&v=gKsRyd1fXc8',
      main: 'UX/디자인', sub: 'UI 패턴', format: '영상',
      tags: ['AI디자인', 'Figma', 'Stitch'],
      summary: 'AI 디자인 툴들의 최신 업데이트 비교',
      publishedAt: '',
    },
    {
      title: '커서 AI를 무료로 사용하는 4가지 방법',
      link: 'https://apidog.com/kr/blog/free-cursor-ai-kr/',
      main: '개발/기술', sub: '협업 도구', format: '가이드',
      tags: ['Cursor', 'AI코딩', '무료'],
      summary: 'Cursor AI를 무료로 활용하는 4가지 우회 방법',
      publishedAt: '',
    },
    {
      title: 'AI를 도구가 아니라 실험 시스템으로 쓰는 방법 (Anthropic 사례)',
      link: 'https://x.com/itsolelehmann/status/2031308486815133905',
      main: '커리어', sub: '성장', format: '아티클',
      tags: ['AI활용', '실험', 'Anthropic'],
      summary: 'AI를 단순 도구가 아닌 실험 시스템으로 활용하는 방법',
      publishedAt: '',
    },
    {
      title: "경쟁력 있는 'AI PM'이 되기 위한 2026 로드맵",
      link: 'https://yozm.wishket.com/magazine/detail/3575/',
      main: '커리어', sub: '성장', format: '아티클',
      tags: ['AI PM', '커리어', '로드맵'],
      summary: 'AI 시대 PM이 갖춰야 할 역량 로드맵',
      publishedAt: '2026-01-09',
    },
    {
      title: '기획자가 직접 99개의 서비스를 만들며 배운 것들',
      link: 'https://yozm.wishket.com/magazine/detail/3648/',
      main: '기획/PM', sub: '프로세스', format: '아티클',
      tags: ['기획자', '실행', '제품제작'],
      summary: '99개 서비스 제작 경험에서 얻은 기획 인사이트',
      publishedAt: '2026-03-11',
    },
    {
      title: 'PM 지원자가 대비해야 할 면접 질문 12선',
      link: 'https://www.cio.com/article/3531711/pm-%EC%A7%80%EC%9B%90%EC%9E%90%EA%B0%80-%EB%8C%80%EB%B9%84%ED%95%B4%EC%95%BC-%ED%95%A0-%EB%A9%B4%EC%A0%91-%EC%A7%88%EB%AC%B8-12%EC%84%A0.html',
      main: '면접/채용/이직', sub: '면접 준비', format: '아티클',
      tags: ['PM면접', '질문12선', 'CIO'],
      summary: 'PM 면접 단골 질문 12개와 대비 포인트',
      publishedAt: '2016-03-24',
    },
    {
      title: 'AI 시대, 기획자로 살아남기',
      link: 'https://fficial.naver.com/contentDetail/165',
      main: '커리어', sub: '성장', format: '아티클',
      tags: ['AI시대', '기획자', '생존전략'],
      summary: 'AI 시대 기획자의 역할 재정의',
      publishedAt: '2026-03-10',
    },
    {
      title: '왜 우리는 아직도 AI에게 일을 제대로 못 시킬까?',
      link: 'https://yozm.wishket.com/magazine/detail/3687/',
      main: '기획/PM', sub: '프로세스', format: '아티클',
      tags: ['AI협업', '프롬프트', '업무자동화'],
      summary: 'AI에게 제대로 일을 시키지 못하는 이유 분석',
      publishedAt: '2026-04-01',
    },
  ];
}

/**
 * 맥비톡방 자료실 시트의 정제된 자료 822건을 SSOT에 일괄 import.
 * 데이터는 imports_chat.gs의 GET_CHAT_AUTO_IMPORT_() 가 제공.
 * 중복 URL은 자동 skip. setValues로 일괄 처리해서 timeout 회피.
 */
function importChatArchive() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const ssot = ss.getSheetByName(CONFIG.SHEETS.SSOT);
  if (!ssot) throw new Error('SSOT 시트 없음. bootstrap 먼저.');

  const ownerMap = buildCategoryOwnerMap_(ss);
  const getOwner = (main, sub) => ownerMap[main + '|' + sub] || '';

  const existingUrls = buildExistingUrlSet_(ssot);
  const data = GET_CHAT_AUTO_IMPORT_();
  const now = new Date();
  let lastNo = ssot.getLastRow() > 1
    ? Number(ssot.getRange(ssot.getLastRow(), 1).getValue()) || (ssot.getLastRow() - 1)
    : 0;

  const rows = [];
  let skipped = 0;
  data.forEach(d => {
    const key = normalizeUrl_(d.link);
    if (key && existingUrls.has(key)) { skipped++; return; }
    if (key) existingUrls.add(key);
    lastNo++;
    rows.push([
      lastNo, d.main, d.sub, (d.tags || []).join(','),
      d.title, d.summary || '',
      d.link, '',
      d.format || '아티클',
      d.publishedAt || '',
      now, '맥비톡방',
      'public', '',
      getOwner(d.main, d.sub),
      'free', '톡방 자료실 정제 import (' + (d.origCat || '') + ')',
      0, 0,
    ]);
  });

  if (rows.length > 0) {
    const startRow = ssot.getLastRow() + 1;
    ssot.getRange(startRow, 1, rows.length, 19).setValues(rows);
  }
  Logger.log('importChatArchive: 신규 ' + rows.length + '건, 중복 skip ' + skipped + '건');
  if (rows.length > 0) invalidateSsotCache_();
  return { imported: rows.length, skipped: skipped };
}

/** SSOT의 외부 링크(col 7) + 파일 링크(col 8) 모두 정규화해서 Set 생성 */
function buildExistingUrlSet_(ssot) {
  const set = new Set();
  if (ssot.getLastRow() < 2) return set;
  const data = ssot.getRange(2, 7, ssot.getLastRow() - 1, 2).getValues();
  data.forEach(r => {
    const u1 = normalizeUrl_(r[0]);
    const u2 = normalizeUrl_(r[1]);
    if (u1) set.add(u1);
    if (u2) set.add(u2);
  });
  return set;
}

function buildCategoryOwnerMap_(ss) {
  const map = {};
  const sheet = ss.getSheetByName(CONFIG.SHEETS.CATEGORY);
  if (!sheet || sheet.getLastRow() < 3) return map;
  const data = sheet.getRange(3, 1, sheet.getLastRow() - 2, 5).getValues();
  data.forEach(r => {
    if (r[0]) map[r[0] + '|' + (r[1] || '')] = r[4] || '';
  });
  return map;
}

/**
 * 보류 큐 74건을 _review_queue_ 시트에 import. 운영진이 시트에서 직접 검토.
 */
function importChatReviewQueue() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName('_review_queue_');
  if (!sheet) throw new Error('_review_queue_ 시트 없음. bootstrap 먼저.');

  const data = GET_CHAT_REVIEW_QUEUE_();
  const rows = data.map(d => [
    Utilities.getUuid(),
    d.main, d.sub, d.title, d.link, d.format,
    d.publishedAt || '',
    d.origCat || '',
    '발행일 미상 + 시의성 키워드 (제목에 연도/트렌드)',
    '',  // 검토 결과 (pending|keep|drop)
    '',  // 검토자
    '',  // 검토일
  ]);
  if (rows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, 12).setValues(rows);
  }
  Logger.log('importChatReviewQueue: ' + rows.length + '건 검토 큐 등록');
  return { count: rows.length };
}

/**
 * 검토 큐에서 keep으로 마킹된 항목을 SSOT로 이관, drop은 그대로 두기.
 */
function processReviewQueue() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName('_review_queue_');
  const ssot = ss.getSheetByName(CONFIG.SHEETS.SSOT);
  if (!sheet || sheet.getLastRow() < 2) return { moved: 0 };
  const existingUrls = buildExistingUrlSet_(ssot);
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();
  const now = new Date();
  let lastNo = ssot.getLastRow() > 1
    ? Number(ssot.getRange(ssot.getLastRow(), 1).getValue()) || (ssot.getLastRow() - 1)
    : 0;
  let moved = 0, skipped = 0;
  data.forEach((r, i) => {
    if (String(r[9]).toLowerCase() !== 'keep') return;
    const key = normalizeUrl_(r[4]);
    if (key && existingUrls.has(key)) {
      skipped++;
      sheet.getRange(i + 2, 10).setValue('duplicate');
      sheet.getRange(i + 2, 12).setValue(now);
      return;
    }
    if (key) existingUrls.add(key);
    lastNo++;
    ssot.appendRow([
      lastNo, r[1], r[2], '', r[3], '',
      r[4], '', r[5], r[6],
      now, '맥비톡방-검토',
      'public', '',
      lookupCategoryOwner_(r[1], r[2]),
      'free', '검토 큐 통과 (' + r[7] + ')',
      0, 0,
    ]);
    sheet.getRange(i + 2, 10).setValue('moved');
    sheet.getRange(i + 2, 12).setValue(now);
    moved++;
  });
  Logger.log('processReviewQueue: ' + moved + '건 SSOT 이관, ' + skipped + '건 중복 skip');
  if (moved > 0) invalidateSsotCache_();
  return { moved: moved, skipped: skipped };
}

// ---- macbee-document 파일 자동 rename ----

const NAMING_CATEGORY_PREFIX = {
  '면접/채용/이직': '01-면접',
  '기획/PM': '02-기획PM',
  'UX/디자인': '03-UX디자인',
  '개발/기술': '04-개발기술',
  '커리어': '05-커리어',
  '비즈니스/마케팅': '06-비즈마케팅',
};

function buildStandardFileName_(entry, ext) {
  const prefix = NAMING_CATEGORY_PREFIX[entry.mainCategory] || '99-기타';
  // 제목 정제: 공백→_, 특수문자 제거
  const cleanTitle = entry.title
    .replace(/[()/\\.,·\-\s]+/g, '_')
    .replace(/[^\w가-힣_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 60);
  const ver = entry.version || 'v1';
  const date = entry.publishedAt ? '_' + entry.publishedAt.replace(/-/g, '').substring(2, 6) : '';
  return prefix + '_' + cleanTitle + '_' + ver + date + '.' + ext.replace(/^\./, '').toLowerCase();
}

/**
 * FAQ 70건을 FAQ 시트에 일괄 import.
 * 중복은 질문 텍스트로 판단.
 */
function importFaq() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName('FAQ');
  if (!sheet) throw new Error('FAQ 시트 없음. bootstrap 먼저.');

  const existing = new Set();
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).getValues().forEach(r => {
      if (r[0]) existing.add(String(r[0]).trim());
    });
  }

  const data = GET_FAQ_DATA_();
  const now = new Date();
  let lastNo = sheet.getLastRow() > 1
    ? Number(sheet.getRange(sheet.getLastRow(), 1).getValue()) || (sheet.getLastRow() - 1)
    : 0;

  const rows = [];
  let skipped = 0;
  data.forEach(d => {
    const q = String(d.q || '').trim();
    if (!q || existing.has(q)) { skipped++; return; }
    lastNo++;
    rows.push([lastNo, d.main, d.sub, q, d.a, now, 0, '톡방 Q&A 정제 import']);
    existing.add(q);
  });

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 8).setValues(rows);
  }
  Logger.log('importFaq: ' + rows.length + '건 신규, ' + skipped + '건 skip');
  if (rows.length > 0) invalidateFaqCache_();
  return { imported: rows.length, skipped: skipped };
}

function MACBE_DOC_MAPPING_() {
  return {
    '01. 프로젝트이해_2022': {
      mainCategory: '기획/PM', subCategory: '프로세스',
      title: '프로젝트 이해 (2022)',
      summary: '기획자가 프로젝트를 시작할 때 이해해야 할 핵심 개념',
      tags: ['프로젝트관리', 'PM', '기획기초'],
      format: '기획서',
    },
    '01.Project Profile': {
      mainCategory: '기획/PM', subCategory: '문서 작성',
      title: 'Project Profile 양식',
      summary: '프로젝트 개요·목적·이해관계자 정리 템플릿',
      tags: ['템플릿', '프로젝트관리', '산출물'],
      format: '템플릿',
    },
    '01.RFP': {
      mainCategory: '기획/PM', subCategory: '문서 작성',
      title: '제안요청서(RFP) 양식',
      summary: '고객사 RFP 작성 표준 양식',
      tags: ['RFP', '제안요청서', '템플릿'],
      format: '템플릿',
    },
    '02. PM의 프로젝트 관리방법_맥비': {
      mainCategory: '기획/PM', subCategory: '프로세스',
      title: 'PM 프로젝트 관리방법 (맥비 A3 프린트판)',
      summary: '맥비님이 정리한 프로젝트 관리 한눈에 보기',
      tags: ['PM', '프로젝트관리', '체크리스트'],
      format: '가이드',
    },
    '02.(운영)요구사항분석': {
      mainCategory: '기획/PM', subCategory: '문서 작성',
      title: '요구사항분석 명세서 샘플 (운영)',
      summary: '운영 단계 요구사항 분석 샘플',
      tags: ['요구사항분석', '명세서', '템플릿'],
      format: '템플릿',
    },
    '02.900_1_운영매뉴얼': {
      mainCategory: '기획/PM', subCategory: '문서 작성',
      title: '운영매뉴얼 양식',
      summary: '서비스 운영 매뉴얼 작성 양식',
      tags: ['운영매뉴얼', '운영', '템플릿'],
      format: '템플릿',
    },
    '16.요구사항분석서_샘플': {
      mainCategory: '기획/PM', subCategory: '문서 작성',
      title: '요구사항분석서 정석 샘플',
      summary: '요구사항분석서 정석 작성 예시',
      tags: ['요구사항분석', '명세서', '템플릿'],
      format: '템플릿',
    },
    '17.WBS_샘플': {
      mainCategory: '기획/PM', subCategory: '프로세스',
      title: 'WBS 샘플',
      summary: 'Work Breakdown Structure 작성 예시',
      tags: ['WBS', '일정관리', '템플릿'],
      format: '템플릿',
    },
    '18.수행범위정의서(WBS활용)_맥비': {
      mainCategory: '기획/PM', subCategory: '문서 작성',
      title: '수행범위정의서 (WBS 활용·맥비 스타일)',
      summary: 'WBS를 활용한 수행범위 정의서 작성',
      tags: ['수행범위정의서', 'WBS', '템플릿'],
      format: '템플릿',
    },
    '18.수행범위정의서(요구사항분석서': {
      mainCategory: '기획/PM', subCategory: '문서 작성',
      title: '수행범위정의서 (요구사항분석서 활용)',
      summary: '요구사항분석서 기반 수행범위 정의서',
      tags: ['수행범위정의서', '요구사항분석', '템플릿'],
      format: '템플릿',
    },
    '마케팅 연간플랜': {
      mainCategory: '비즈니스/마케팅', subCategory: '마케팅 전략',
      title: '마케팅 연간플랜 참고',
      summary: '마케팅 연간 계획 수립 참고 자료',
      tags: ['마케팅', '연간플랜', '템플릿'],
      format: '템플릿',
    },
    '마케팅 예산안': {
      mainCategory: '비즈니스/마케팅', subCategory: '예산/계획',
      title: '마케팅 예산안 참고',
      summary: '마케팅 예산 산정 참고 자료',
      tags: ['마케팅', '예산', '템플릿'],
      format: '템플릿',
    },
    '제안요청서(신규,재개발)': {
      mainCategory: '기획/PM', subCategory: '문서 작성',
      title: '제안요청서 (신규/재개발)',
      summary: '신규/재개발 프로젝트 RFP 한글 양식',
      tags: ['RFP', '제안요청서', '한글'],
      format: '템플릿',
    },
  };
}
