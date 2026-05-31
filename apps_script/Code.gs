/**
 * 맥비기획 자료실 - Web App
 *
 * 라우트:
 *   /exec               → 자료실 뷰어 (멤버 공개)
 *   /exec?page=submit   → 자료 등록 (멤버)
 *   /exec?page=admin    → 검토 (운영팀)
 *
 * 운영 정책:
 *   - 자료 제안은 누구나 가능
 *   - 운영진 N명 이상 승인 시 SSOT 이관 (기본 2명)
 *   - 같은 운영자는 중복 승인 불가
 */

const CONFIG = {
  get SHEET_ID() { return PropertiesService.getScriptProperties().getProperty('SHEET_ID'); },
  get DRIVE_ROOT_ID() { return PropertiesService.getScriptProperties().getProperty('DRIVE_ROOT_ID'); },
  get GEMINI_API_KEY() { return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'); },
  get MIN_APPROVALS() {
    const v = PropertiesService.getScriptProperties().getProperty('MIN_APPROVALS');
    return v ? Number(v) : 2;
  },
  SHEETS: {
    SSOT: '자료 DB',
    STAGING: '_staging_',
    CATEGORY: '카테고리',
    LOG: '_점검로그',
  },
  PAGE_SIZE: 50,
};

function doGet(e) {
  const page = e && e.parameter && e.parameter.page;
  const ROUTES = {
    submit: { tmpl: 'webapp', active: 'submit', kind: '' },
    admin: { tmpl: 'admin', active: 'admin', kind: '' },
    files: { tmpl: 'archive_list', active: 'files', kind: 'files' },
    insights: { tmpl: 'archive_list', active: 'insights', kind: 'insights' },
    faq: { tmpl: 'faq', active: 'faq', kind: '' },
    home: { tmpl: 'home', active: 'home', kind: '' },
  };
  const route = ROUTES[page] || ROUTES.home;
  const appUrl = ScriptApp.getService().getUrl();

  // nav를 server-side에서 미리 렌더 (include는 scriptlet 평가 안 함)
  const navTmpl = HtmlService.createTemplateFromFile('nav');
  navTmpl.appUrl = appUrl;
  navTmpl.activePage = route.active;
  const navHtml = navTmpl.evaluate().getContent();

  // icons sprite (plain SVG, scriptlet 없어 include 그대로 사용 가능)
  const iconsHtml = HtmlService.createHtmlOutputFromFile('icons').getContent();

  const tmpl = HtmlService.createTemplateFromFile(route.tmpl);
  tmpl.activePage = route.active;
  tmpl.kind = route.kind;
  tmpl.initialQuery = (e && e.parameter && e.parameter.q) || '';
  tmpl.appUrl = appUrl;
  tmpl.navHtml = navHtml;
  tmpl.iconsHtml = iconsHtml;

  // 페이지별 데이터 inline 주입 (RPC 1회 절약 → 첫 렌더 즉시)
  if (route.active === 'faq') {
    try { tmpl.faqInitial = JSON.stringify(getFaqItems({})); }
    catch (e) { tmpl.faqInitial = JSON.stringify({ ok: false, items: [], categories: {} }); }
  } else {
    tmpl.faqInitial = '';
  }
  if (route.active === 'home') {
    try { tmpl.homeInitial = JSON.stringify(getHomeOverview()); }
    catch (e) { tmpl.homeInitial = JSON.stringify({ ok: false, files: [], insights: [], popular: [], totalFiles: 0, totalInsights: 0 }); }
  } else {
    tmpl.homeInitial = '';
  }
  if (route.active === 'files' || route.active === 'insights') {
    try { tmpl.categoryTreeInitial = JSON.stringify(getCategoryTree()); }
    catch (e) { tmpl.categoryTreeInitial = JSON.stringify({ ok: false, tree: {} }); }
  } else {
    tmpl.categoryTreeInitial = '';
  }
  return tmpl.evaluate()
    .setTitle('맥비기획 자료실')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ---------------- 등록 ----------------

function analyzeUrl(url) {
  if (!url || !/^https?:\/\//i.test(url)) {
    return { ok: false, error: 'URL 형식이 올바르지 않습니다.' };
  }
  try {
    const meta = fetchUrlMetadata(url);
    const classified = classifyWithAI(url, meta);
    return { ok: true, data: Object.assign({ url: url }, meta, classified) };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function submitProposal(payload) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEETS.STAGING);
  if (!sheet) sheet = createStagingSheet_(ss);

  const id = Utilities.getUuid();
  sheet.appendRow([
    id,
    new Date(),
    payload.proposer || '',
    payload.url || '',
    payload.fileLink || '',
    payload.title || '',
    payload.summary || '',
    payload.mainCategory || '',
    payload.subCategory || '',
    (payload.tags || []).join(','),
    payload.format || '',
    payload.publishedAt || '',
    'pending',
    '',  // 승인자목록
    '',  // 검토메모
  ]);
  return { ok: true, id: id };
}

function uploadFile(meta, base64Data) {
  const root = DriveApp.getFolderById(CONFIG.DRIVE_ROOT_ID);
  const stagingFolder = getOrCreateChildFolder_(root, '_staging_uploads');
  const blob = Utilities.newBlob(
    Utilities.base64Decode(base64Data),
    meta.mimeType || 'application/octet-stream',
    meta.fileName || 'unnamed'
  );
  const file = stagingFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { ok: true, fileLink: file.getUrl(), fileId: file.getId() };
}

// ---------------- 검토 (2인 승인) ----------------

function listStaging() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STAGING);
  if (!sheet || sheet.getLastRow() < 2) return { ok: true, items: [], minApprovals: CONFIG.MIN_APPROVALS };
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 15).getValues();
  const items = values
    .map(r => ({
      id: r[0],
      createdAt: r[1] instanceof Date ? r[1].toISOString() : String(r[1] || ''),
      proposer: r[2], url: r[3], fileLink: r[4],
      title: r[5], summary: r[6], mainCategory: r[7], subCategory: r[8],
      tags: String(r[9] || '').split(',').filter(Boolean),
      format: r[10],
      publishedAt: r[11] instanceof Date ? r[11].toISOString().slice(0, 10) : String(r[11] || ''),
      status: r[12],
      approvers: String(r[13] || '').split(',').map(s => s.trim()).filter(Boolean),
      reviewNote: r[14],
    }))
    .filter(x => x.status === 'pending');
  return { ok: true, items: items, minApprovals: CONFIG.MIN_APPROVALS };
}

/**
 * 승인. 2명 이상이 승인하면 자동으로 SSOT로 이관.
 * @param {string} id - staging 행 id
 * @param {string} reviewerName - 승인자 이름 (운영팀 멤버 식별)
 * @param {object} edits - 편집된 필드 (선택)
 */
function approveStaging(id, reviewerName, edits) {
  if (!reviewerName) throw new Error('승인자 이름이 필요합니다.');
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const stagingSheet = ss.getSheetByName(CONFIG.SHEETS.STAGING);
  if (!stagingSheet) throw new Error('_staging_ 시트가 없습니다.');

  const rowIndex = findRowByIdInSheet_(stagingSheet, id, 1);
  if (rowIndex < 0) throw new Error('staging 항목을 찾을 수 없습니다: ' + id);

  // 현재 승인자 목록
  const curApprovers = String(stagingSheet.getRange(rowIndex, 14).getValue() || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (curApprovers.indexOf(reviewerName) >= 0) {
    return { ok: true, alreadyApproved: true, approvers: curApprovers, minApprovals: CONFIG.MIN_APPROVALS };
  }
  curApprovers.push(reviewerName);

  // 편집 사항을 staging 시트에 미리 반영 (다음 승인자가 같은 내용을 보도록)
  if (edits) {
    const map = {
      title: 6, summary: 7, mainCategory: 8, subCategory: 9,
      tags: 10, format: 11,
    };
    Object.keys(edits).forEach(k => {
      if (k === 'tags' && Array.isArray(edits.tags)) {
        stagingSheet.getRange(rowIndex, map.tags).setValue(edits.tags.join(','));
      } else if (map[k]) {
        stagingSheet.getRange(rowIndex, map[k]).setValue(edits[k]);
      }
    });
  }

  // 승인자목록 갱신
  stagingSheet.getRange(rowIndex, 14).setValue(curApprovers.join(','));

  if (curApprovers.length < CONFIG.MIN_APPROVALS) {
    return { ok: true, promoted: false, approvers: curApprovers, minApprovals: CONFIG.MIN_APPROVALS };
  }

  // 충분한 승인 → SSOT 이관
  promoteToSsot_(ss, stagingSheet, rowIndex);
  stagingSheet.getRange(rowIndex, 13).setValue('approved');
  invalidateSsotCache_();
  return { ok: true, promoted: true, approvers: curApprovers, minApprovals: CONFIG.MIN_APPROVALS };
}

function rejectStaging(id, reviewerName, reason) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STAGING);
  const rowIndex = findRowByIdInSheet_(sheet, id, 1);
  if (rowIndex < 0) throw new Error('항목 없음');
  sheet.getRange(rowIndex, 13).setValue('rejected');
  sheet.getRange(rowIndex, 14).setValue(reviewerName || '');
  sheet.getRange(rowIndex, 15).setValue(reason || '');
  return { ok: true };
}

function promoteToSsot_(ss, stagingSheet, stagingRowIndex) {
  const ssotSheet = ss.getSheetByName(CONFIG.SHEETS.SSOT);
  if (!ssotSheet) throw new Error('SSOT 시트가 없습니다. setup을 먼저 실행하세요.');
  const r = stagingSheet.getRange(stagingRowIndex, 1, 1, 15).getValues()[0];

  const lastNo = ssotSheet.getLastRow() > 1
    ? Number(ssotSheet.getRange(ssotSheet.getLastRow(), 1).getValue()) || (ssotSheet.getLastRow() - 1)
    : 0;

  let finalFileLink = r[4];
  if (finalFileLink && /drive\.google\.com/.test(finalFileLink)) {
    finalFileLink = moveStagingFileToCategory_(finalFileLink, r[7]);
  }

  ssotSheet.appendRow([
    lastNo + 1,
    r[7],   // 대분류
    r[8],   // 소분류
    r[9],   // 태그
    r[5],   // 자료 제목
    r[6],   // 보조설명
    r[3],   // 외부 링크
    finalFileLink,
    r[10],  // 자료 형식
    r[11],  // 발행일
    new Date(),
    r[2],   // 등록자(제안자)
    'public',
    '',
    lookupCategoryOwner_(r[7], r[8]),
    'free',
    '',
  ]);
}

// ---------------- 자료실 뷰어 (공개) ----------------

function getCategoryTree() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.CATEGORY);
  if (!sheet) return { ok: true, tree: {}, owners: {} };
  const data = sheet.getDataRange().getValues();
  const tree = {};
  const owners = {};
  for (let i = 2; i < data.length; i++) {
    const main = data[i][0];
    const sub = data[i][1];
    const owner = data[i][4];
    if (!main || String(main).indexOf('*') === 0) continue;
    if (!tree[main]) tree[main] = [];
    if (sub && tree[main].indexOf(sub) < 0) tree[main].push(sub);
    if (sub) owners[main + '|' + sub] = owner || '';
  }
  return { ok: true, tree: tree, owners: owners };
}

/**
 * 자료실 항목 조회. 검색·카테고리 필터·페이지네이션 지원.
 * @param {object} filter - { query, mainCategory, subCategory, page, format }
 */
function getArchiveItems(filter) {
  filter = filter || {};
  const values = getSsotRows_();
  if (values.length === 0) {
    return { ok: true, items: [], total: 0, page: 1, pageSize: CONFIG.PAGE_SIZE };
  }
  const q = (filter.query || '').toLowerCase().trim();
  const mainF = filter.mainCategory || '';
  const subF = filter.subCategory || '';
  const fmtF = filter.format || '';

  const kindF = filter.kind || '';  // 'files' | 'insights' | ''
  const filtered = values
    .filter(r => r[0])  // No 있음 = 유효 행
    .filter(r => r[12] === 'public' || r[12] === '' || r[12] == null)
    .filter(r => {
      if (!kindF) return true;
      const isFile = isFilesKind_(r[6], r[7]);
      return kindF === 'files' ? isFile : !isFile;
    })
    .filter(r => !mainF || r[1] === mainF)
    .filter(r => !subF || r[2] === subF)
    .filter(r => !fmtF || r[8] === fmtF)
    .filter(r => {
      if (!q) return true;
      const hay = (r[4] + ' ' + (r[5] || '') + ' ' + (r[3] || '')).toLowerCase();
      return hay.indexOf(q) >= 0;
    })
    .map(r => ({
      no: r[0],
      mainCategory: r[1],
      subCategory: r[2],
      tags: String(r[3] || '').split(',').map(s => s.trim()).filter(Boolean),
      title: r[4],
      summary: r[5],
      url: r[6],
      fileLink: r[7],
      format: r[8],
      publishedAt: r[9] instanceof Date ? Utilities.formatDate(r[9], 'Asia/Seoul', 'yyyy-MM-dd') : String(r[9] || ''),
      registeredAt: r[10] instanceof Date ? Utilities.formatDate(r[10], 'Asia/Seoul', 'yyyy-MM-dd') : String(r[10] || ''),
      proposer: r[11],
      views: Number(r[17]) || 0,
      downloads: Number(r[18]) || 0,
    }))
    .sort((a, b) => {
      const sort = (filter && filter.sort) || 'recent';
      if (sort === 'popular') return (b.views + b.downloads * 2) - (a.views + a.downloads * 2);
      if (sort === 'views') return b.views - a.views;
      return (b.registeredAt || '').localeCompare(a.registeredAt || '');
    });

  const page = Math.max(1, Number(filter.page) || 1);
  const pageSize = CONFIG.PAGE_SIZE;
  const start = (page - 1) * pageSize;
  return {
    ok: true,
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page: page,
    pageSize: pageSize,
  };
}

/**
 * 클릭/다운로드 카운트 증가.
 * @param {number} no - SSOT 시트의 No 컬럼 값
 * @param {string} kind - 'view' | 'download'
 */
function incrementCount(no, kind) {
  if (!no) return { ok: false };
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SSOT);
  if (!sheet || sheet.getLastRow() < 2) return { ok: false };
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (Number(ids[i][0]) === Number(no)) {
      const col = (kind === 'download') ? 19 : 18;
      const cur = Number(sheet.getRange(i + 2, col).getValue()) || 0;
      sheet.getRange(i + 2, col).setValue(cur + 1);
      return { ok: true, count: cur + 1 };
    }
  }
  return { ok: false };
}

/**
 * 인기 자료 상위 N개 (조회수 + 다운로드수*2 가중)
 */
function getPopularItems(limit) {
  const res = getArchiveItems({ sort: 'popular', page: 1 });
  return { ok: true, items: (res.items || []).slice(0, limit || 8) };
}

// ---------------- FAQ ----------------

function getFaqItems(filter) {
  filter = filter || {};
  const cache = CacheService.getScriptCache();

  // 필터 없는 기본 호출은 캐시
  const isDefault = !filter.query && !filter.mainCategory;
  if (isDefault) {
    const cached = cache.get('faq_all');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { /* fall through */ }
    }
  }

  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName('FAQ');
  if (!sheet || sheet.getLastRow() < 2) return { ok: true, items: [], categories: {} };

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  const q = (filter.query || '').toLowerCase().trim();
  const mainF = filter.mainCategory || '';

  const items = values
    .filter(r => r[0] && r[3])
    .filter(r => !mainF || r[1] === mainF)
    .filter(r => {
      if (!q) return true;
      return ((r[3] || '') + ' ' + (r[4] || '')).toLowerCase().indexOf(q) >= 0;
    })
    .map(r => ({
      no: r[0], main: r[1], sub: r[2],
      q: r[3], a: r[4],
      registeredAt: r[5] instanceof Date ? Utilities.formatDate(r[5], 'Asia/Seoul', 'yyyy-MM-dd') : '',
      views: Number(r[6]) || 0,
    }));

  // 대분류별 카운트
  const categories = {};
  values.filter(r => r[0] && r[3]).forEach(r => {
    categories[r[1]] = (categories[r[1]] || 0) + 1;
  });

  const result = { ok: true, items: items, categories: categories, total: items.length };
  if (isDefault) {
    try { cache.put('faq_all', JSON.stringify(result), 300); } catch (e) { }
  }
  return result;
}

function invalidateFaqCache_() {
  CacheService.getScriptCache().remove('faq_all');
}

function incrementFaqView(no) {
  if (!no) return { ok: false };
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName('FAQ');
  if (!sheet || sheet.getLastRow() < 2) return { ok: false };
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (Number(ids[i][0]) === Number(no)) {
      const cur = Number(sheet.getRange(i + 2, 7).getValue()) || 0;
      sheet.getRange(i + 2, 7).setValue(cur + 1);
      return { ok: true, count: cur + 1 };
    }
  }
  return { ok: false };
}

// ---------------- helpers ----------------

function findRowByIdInSheet_(sheet, id, idCol) {
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const ids = sheet.getRange(2, idCol, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) return i + 2;
  }
  return -1;
}

function getOrCreateChildFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

function moveStagingFileToCategory_(fileLink, mainCategory) {
  const m = fileLink.match(/[-\w]{25,}/);
  if (!m) return fileLink;
  try {
    const file = DriveApp.getFileById(m[0]);
    const root = DriveApp.getFolderById(CONFIG.DRIVE_ROOT_ID);
    const target = getOrCreateChildFolder_(root, mapCategoryToFolder_(mainCategory));
    file.moveTo(target);
    return file.getUrl();
  } catch (e) {
    return fileLink;
  }
}

function mapCategoryToFolder_(mainCategory) {
  const map = {
    '면접/채용/이직': '01_면접·채용·이직',
    '기획/PM': '02_기획·PM',
    'UX/디자인': '03_UX·디자인',
    '개발/기술': '04_개발·기술',
    '커리어': '05_커리어',
  };
  return map[mainCategory] || '99_미분류';
}

// ---------------- SSOT cache (5분) ----------------

const SSOT_DATE_COLS = [9, 10, 13];  // 0-based: 발행일·등록일·마지막 점검일
const SSOT_CACHE_TTL_SEC = 300;
const SSOT_CHUNK_SIZE = 100;

function _serializeRow(r) {
  return r.map((v, i) => SSOT_DATE_COLS.indexOf(i) >= 0 && v instanceof Date ? { __d: v.getTime() } : v);
}
function _deserializeRow(r) {
  return r.map(v => (v && typeof v === 'object' && '__d' in v) ? new Date(v.__d) : v);
}

/** SSOT 행을 가져옴. 5분 캐시 hit 시 그대로 사용. */
function getSsotRows_() {
  const cache = CacheService.getScriptCache();
  const metaStr = cache.get('ssot_meta');
  if (metaStr) {
    try {
      const meta = JSON.parse(metaStr);
      const keys = [];
      for (let i = 0; i < meta.chunks; i++) keys.push('ssot_chunk_' + i);
      const all = cache.getAll(keys);
      if (Object.keys(all).length === meta.chunks) {
        const rows = [];
        for (let i = 0; i < meta.chunks; i++) {
          const part = JSON.parse(all['ssot_chunk_' + i]);
          for (const r of part) rows.push(_deserializeRow(r));
        }
        return rows;
      }
    } catch (e) { /* fall through */ }
  }

  // miss → 시트에서 fetch
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SSOT);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const lastCol = Math.max(19, sheet.getLastColumn());
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();

  // 캐시에 저장
  const chunks = Math.ceil(rows.length / SSOT_CHUNK_SIZE);
  const toSet = {};
  for (let i = 0; i < chunks; i++) {
    const slice = rows.slice(i * SSOT_CHUNK_SIZE, (i + 1) * SSOT_CHUNK_SIZE).map(_serializeRow);
    toSet['ssot_chunk_' + i] = JSON.stringify(slice);
  }
  toSet['ssot_meta'] = JSON.stringify({ chunks: chunks, count: rows.length, ts: Date.now() });
  try { cache.putAll(toSet, SSOT_CACHE_TTL_SEC); } catch (e) { /* 한도 초과 등 - 캐시 skip */ }
  return rows;
}

/** SSOT 캐시 무효화 — 시트 변경 함수 끝에서 호출 */
function invalidateSsotCache_() {
  const cache = CacheService.getScriptCache();
  const metaStr = cache.get('ssot_meta');
  const keys = ['ssot_meta', 'home_overview'];
  if (metaStr) {
    try {
      const meta = JSON.parse(metaStr);
      for (let i = 0; i < meta.chunks; i++) keys.push('ssot_chunk_' + i);
    } catch (e) { }
  }
  for (let i = 0; i < 30; i++) keys.push('ssot_chunk_' + i);
  cache.removeAll(keys);
}

/** 제목 정규화 — 중복 비교 보조용 */
function normalizeTitle_(t) {
  if (!t) return '';
  return String(t).toLowerCase()
    .replace(/[\s\-_·.,()/\\!?'"]+/g, '')
    .replace(/[​-‏]/g, '')
    .substring(0, 80);
}

/** 파일 다운로드형 자료 판별: 파일 링크가 있거나 외부 URL이 google docs/drive 도메인 */
function isFilesKind_(externalUrl, fileLink) {
  if (fileLink) return true;
  if (!externalUrl) return false;
  const u = String(externalUrl).toLowerCase();
  return /https?:\/\/(?:docs|drive|sheets|slides)\.google\.com/.test(u);
}

/** URL 정규화 — 중복 비교용 */
function normalizeUrl_(url) {
  if (!url) return '';
  let s = String(url).trim().toLowerCase();
  // protocol 통일
  s = s.replace(/^http:\/\//, 'https://');
  // m. / www. prefix 제거
  s = s.replace(/^https:\/\/(?:m|www|mobile)\./, 'https://');
  // fragment 제거
  s = s.replace(/#.*$/, '');
  // 추적 query 제거
  try {
    const m = s.match(/^(https?:\/\/[^?]+)(\?.*)?$/);
    if (m && m[2]) {
      const params = m[2].substring(1).split('&').filter(p => {
        const k = p.split('=')[0];
        return !/^utm_|^fbclid$|^gclid$|^mc_cid$|^mc_eid$|^_ga$|^ref$|^source$/.test(k);
      });
      s = m[1] + (params.length ? '?' + params.sort().join('&') : '');
    }
  } catch (e) { }
  // trailing slash 제거
  s = s.replace(/\/+$/, '');
  return s;
}

/**
 * 홈 화면 overview: 자료실 6 + 인사이트 6 + 인기 8 + 카운트
 */
function getHomeOverview() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('home_overview');
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { /* fall through */ }
  }

  const values = getSsotRows_();
  if (values.length === 0) {
    const empty = { ok: true, files: [], insights: [], popular: [], totalFiles: 0, totalInsights: 0 };
    return empty;
  }
  const valid = values.filter(r => r[0] && (r[12] === 'public' || !r[12]));

  const toItem = r => ({
    no: r[0], mainCategory: r[1], subCategory: r[2],
    tags: String(r[3] || '').split(',').map(s => s.trim()).filter(Boolean),
    title: r[4], summary: r[5], url: r[6], fileLink: r[7], format: r[8],
    publishedAt: r[9] instanceof Date ? Utilities.formatDate(r[9], 'Asia/Seoul', 'yyyy-MM-dd') : String(r[9] || ''),
    registeredAt: r[10] instanceof Date ? Utilities.formatDate(r[10], 'Asia/Seoul', 'yyyy-MM-dd') : String(r[10] || ''),
    proposer: r[11],
    views: Number(r[17]) || 0,
    downloads: Number(r[18]) || 0,
  });

  const files = valid.filter(r => isFilesKind_(r[6], r[7])).map(toItem)
    .sort((a, b) => (b.registeredAt || '').localeCompare(a.registeredAt || ''));
  const insights = valid.filter(r => !isFilesKind_(r[6], r[7])).map(toItem)
    .sort((a, b) => (b.registeredAt || '').localeCompare(a.registeredAt || ''));
  const popular = valid.map(toItem)
    .sort((a, b) => (b.views + b.downloads * 2) - (a.views + a.downloads * 2))
    .slice(0, 8);

  const result = {
    ok: true,
    files: files.slice(0, 6),
    insights: insights.slice(0, 6),
    popular: popular,
    totalFiles: files.length,
    totalInsights: insights.length,
  };
  try { cache.put('home_overview', JSON.stringify(result), 60); } catch (e) { /* skip */ }
  return result;
}

/**
 * SSOT 중복 제거 — 정규화 URL 기준으로 그룹핑.
 * 그룹 내 우선순위: (요약+태그 풍부도) → 조회수+다운로드. 카운트는 합산.
 * 실행 전 자동 백업.
 */
function dedupeSsot() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SSOT);
  if (!sheet || sheet.getLastRow() < 2) {
    Logger.log('SSOT 비어있음. 작업 없음.');
    return { removed: 0 };
  }

  // 백업
  const root = DriveApp.getFolderById(CONFIG.DRIVE_ROOT_ID);
  const backup = root.getFoldersByName('_백업').hasNext()
    ? root.getFoldersByName('_백업').next() : root.createFolder('_백업');
  const stamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd_HHmm');
  DriveApp.getFileById(ss.getId()).makeCopy('자료실_DB_dedupe_' + stamp, backup);

  const lastCol = Math.max(19, sheet.getLastColumn());
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();
  const groups = {};

  data.forEach((row, idx) => {
    if (!row[0]) return;
    const urlKey = normalizeUrl_(row[6]) || normalizeUrl_(row[7]);
    const titleKey = '__t__:' + normalizeTitle_(row[4]);
    // URL 키가 있으면 우선, 없으면 제목 키
    const key = urlKey || titleKey;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ idx: idx, row: row, urlKey: urlKey, titleKey: titleKey });
  });

  // 2차 패스: 제목이 같은 URL-다른 그룹들을 합침
  const titleIndex = {};
  Object.keys(groups).forEach(k => {
    if (k.indexOf('__t__:') === 0) return;
    const arr = groups[k];
    const tKey = arr[0].titleKey;
    if (!tKey || tKey === '__t__:') return;
    if (titleIndex[tKey]) {
      // 이미 다른 URL 그룹이 같은 제목 → 합침
      groups[titleIndex[tKey]].push(...arr);
      delete groups[k];
    } else {
      titleIndex[tKey] = k;
    }
  });

  const score = (r) => {
    const summary = String(r[5] || '').length;
    const tags = String(r[3] || '').length;
    const views = Number(r[17]) || 0;
    const downloads = Number(r[18]) || 0;
    return summary + tags + views + downloads * 2;
  };

  const kept = [];
  let removed = 0;
  Object.keys(groups).forEach(k => {
    const arr = groups[k];
    if (arr.length === 1) {
      kept.push(arr[0].row);
      return;
    }
    arr.sort((a, b) => score(b.row) - score(a.row));
    const winner = arr[0].row.slice();
    // 카운트 합산
    let totalViews = 0, totalDownloads = 0;
    arr.forEach(x => { totalViews += Number(x.row[17]) || 0; totalDownloads += Number(x.row[18]) || 0; });
    winner[17] = totalViews;
    winner[18] = totalDownloads;
    kept.push(winner);
    removed += arr.length - 1;
  });

  // 등록일 기준 재정렬
  kept.sort((a, b) => {
    const ta = a[10] instanceof Date ? a[10].getTime() : 0;
    const tb = b[10] instanceof Date ? b[10].getTime() : 0;
    return ta - tb;
  });
  // No 컬럼 재할당
  kept.forEach((r, i) => { r[0] = i + 1; });

  // 시트 재작성
  sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).clearContent();
  if (kept.length > 0) {
    sheet.getRange(2, 1, kept.length, kept[0].length).setValues(kept);
  }
  Logger.log('dedupeSsot: kept=' + kept.length + ', removed=' + removed + ', backup=자료실_DB_dedupe_' + stamp);
  invalidateSsotCache_();
  return { kept: kept.length, removed: removed };
}

/**
 * 깨진 외부 링크 일괄 정리.
 * - SSOT의 모든 외부 링크에 fetchAll(병렬) 요청
 * - 4xx/5xx 응답이면 _broken_ 시트로 백업 후 SSOT에서 삭제
 * - 백업 시트로 옮겨서 안전 (원할 때 복구 가능)
 */
function cleanupBrokenLinks() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SSOT);
  if (!sheet || sheet.getLastRow() < 2) return { removed: 0 };

  const lastCol = Math.max(19, sheet.getLastColumn());
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();

  const targets = [];
  data.forEach((r, i) => {
    if (r[6] && /^https?:\/\//i.test(r[6])) {
      targets.push({ idx: i, row: r, url: r[6] });
    }
  });

  const BATCH = 50;
  const broken = [];
  const blocked = [];
  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    const reqs = batch.map(t => ({
      url: t.url, method: 'get', muteHttpExceptions: true, followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
    }));
    let resps;
    try { resps = UrlFetchApp.fetchAll(reqs); }
    catch (e) { continue; }
    resps.forEach((resp, j) => {
      const code = resp.getResponseCode();
      if (code >= 200 && code < 400) return;
      if (code === 403 || code === 429) {
        // 봇 차단·rate limit — SSOT 유지, _blocked_에만 기록
        blocked.push({ ...batch[j], code: code });
      } else {
        // 404/410/500 등 → broken 확정
        broken.push({ ...batch[j], code: code });
      }
    });
  }

  // blocked 처리 — SSOT 안 건드림, _blocked_ 시트에만 누적
  if (blocked.length > 0) {
    let blockedSheet = ss.getSheetByName('_blocked_');
    if (!blockedSheet) {
      blockedSheet = ss.insertSheet('_blocked_');
      blockedSheet.getRange(1, 1, 1, 5).setValues([['점검일시', 'No', '제목', 'URL', 'HTTP']]);
    }
    const newRows = blocked.map(b => [new Date(), b.row[0], b.row[4], b.url, b.code]);
    blockedSheet.getRange(blockedSheet.getLastRow() + 1, 1, newRows.length, 5).setValues(newRows);
    Logger.log('cleanupBrokenLinks: blocked ' + blocked.length + '건 (_blocked_ 시트 누적, SSOT 유지)');
  }

  if (broken.length === 0) {
    Logger.log('cleanupBrokenLinks: 깨진 링크 없음');
    return { removed: 0, blocked: blocked.length };
  }

  // 백업 시트로 이동
  let brokenSheet = ss.getSheetByName('_broken_');
  if (!brokenSheet) {
    brokenSheet = ss.insertSheet('_broken_');
    // 헤더를 원본 SSOT 그대로 사용 (col1~col19 placeholder 대신)
    const ssotHeader = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    brokenSheet.getRange(1, 1, 1, lastCol + 2).setValues([
      ssotHeader.concat(['HTTP', '제거일'])
    ]);
  }
  const backupRows = broken.map(b => b.row.concat([b.code, new Date()]));
  brokenSheet.getRange(brokenSheet.getLastRow() + 1, 1, backupRows.length, lastCol + 2).setValues(backupRows);

  // 역순으로 SSOT에서 삭제
  broken.sort((a, b) => b.idx - a.idx);
  broken.forEach(b => sheet.deleteRow(b.idx + 2));

  invalidateSsotCache_();
  Logger.log('cleanupBrokenLinks: broken ' + broken.length + '건 제거 / blocked ' + blocked.length + '건 보존');
  return { removed: broken.length, blocked: blocked.length };
}

/**
 * 알려진 모호한 제목들을 일괄 변경.
 * 사용자 요청에 따라 매핑 추가.
 */
const TITLE_FIXES_ = {
  '정보구조도 샘플이 있을까요?': 'IA 양식',
  // 추가 매핑 여기에
};

function fixTitles() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SSOT);
  if (!sheet || sheet.getLastRow() < 2) return { changed: 0 };
  const titles = sheet.getRange(2, 5, sheet.getLastRow() - 1, 1).getValues();
  let changed = 0;
  titles.forEach((r, i) => {
    const t = String(r[0] || '').trim();
    if (TITLE_FIXES_[t]) {
      sheet.getRange(i + 2, 5).setValue(TITLE_FIXES_[t]);
      changed++;
      Logger.log('rename: "' + t + '" → "' + TITLE_FIXES_[t] + '"');
    }
  });
  if (changed > 0) invalidateSsotCache_();
  Logger.log('fixTitles: ' + changed + '건 변경');
  return { changed: changed };
}

/**
 * 모호한 제목(짧음·일반명사 단일)을 _title_review_ 시트로 추출.
 * 운영진이 직접 시트에서 제목을 수정하고 다시 SSOT로 반영.
 */
function flagAmbiguousTitles() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SSOT);
  if (!sheet || sheet.getLastRow() < 2) return { flagged: 0 };

  let review = ss.getSheetByName('_title_review_');
  if (!review) {
    review = ss.insertSheet('_title_review_');
    review.getRange(1, 1, 1, 6).setValues([['No', '현재 제목', '카테고리', '외부 링크', '새 제목 (수정)', '비고']]).setFontWeight('bold');
    review.setFrozenRows(1);
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();
  const candidates = data.filter(r => {
    const t = String(r[4] || '').trim();
    if (!t) return false;
    if (t.length <= 4) return true;
    // 한 단어 + 짧음
    if (t.length <= 8 && !/\s/.test(t)) return true;
    return false;
  });

  if (candidates.length === 0) return { flagged: 0 };
  const rows = candidates.map(r => [r[0], r[4], r[1] + (r[2] ? ' › ' + r[2] : ''), r[6], '', '']);
  const start = review.getLastRow() + 1;
  review.getRange(start, 1, rows.length, 6).setValues(rows);
  Logger.log('flagAmbiguousTitles: ' + rows.length + '건 _title_review_ 시트로 추출');
  return { flagged: rows.length };
}

/** _title_review_ 시트의 "새 제목" 컬럼이 채워진 항목을 SSOT에 반영 */
function applyTitleReview() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const review = ss.getSheetByName('_title_review_');
  const ssot = ss.getSheetByName(CONFIG.SHEETS.SSOT);
  if (!review || review.getLastRow() < 2) return { applied: 0 };
  const data = review.getRange(2, 1, review.getLastRow() - 1, 6).getValues();
  let applied = 0;
  data.forEach((r, i) => {
    const no = r[0]; const newTitle = String(r[4] || '').trim();
    if (!no || !newTitle) return;
    // SSOT에서 No로 row 찾기
    const ssotData = ssot.getRange(2, 1, ssot.getLastRow() - 1, 1).getValues();
    for (let j = 0; j < ssotData.length; j++) {
      if (Number(ssotData[j][0]) === Number(no)) {
        ssot.getRange(j + 2, 5).setValue(newTitle);
        review.getRange(i + 2, 6).setValue('적용됨 ' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'));
        applied++;
        break;
      }
    }
  });
  if (applied > 0) invalidateSsotCache_();
  Logger.log('applyTitleReview: ' + applied + '건 SSOT 반영');
  return { applied: applied };
}

function lookupCategoryOwner_(main, sub) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.CATEGORY);
    if (!sheet) return '';
    const data = sheet.getDataRange().getValues();
    for (let i = 2; i < data.length; i++) {
      if (data[i][0] === main && data[i][1] === sub) return data[i][4] || '';
    }
  } catch (e) { }
  return '';
}
