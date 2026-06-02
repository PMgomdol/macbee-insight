/**
 * 시트(SSOT) → Supabase archive_item / faq 단방향 동기화.
 *
 * 트리거:
 *   - onEditSyncToSupabase: 시트 셀 편집 시 해당 행만 upsert (실시간)
 *   - dailySyncCron: 매일 03:00 전체 풀싱크 (onEdit 누락 대비)
 *   - weeklyLinkCheck (triggers.gs): 점검 결과를 Supabase에도 PATCH
 *
 * 일회성:
 *   - fullSyncToSupabase: 시트 전체를 한 번에 upsert (초기화·복구)
 *
 * 필요한 Script Properties:
 *   SUPABASE_URL          - https://<project>.supabase.co
 *   SUPABASE_SERVICE_KEY  - service_role 키 (sb_secret_*)
 *
 * 알려진 제약:
 *   - /admin (Vercel)에서 staging_proposal → archive_item 승인 시 생성된 행은
 *     sheet에 없음. 시트 SSOT와 불일치. 시트로 역동기화는 별도 작업 필요.
 */

function SUPABASE_URL_() {
  return PropertiesService.getScriptProperties().getProperty('SUPABASE_URL');
}
function SUPABASE_KEY_() {
  return PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');
}

function supabaseConfigured_() {
  return !!(SUPABASE_URL_() && SUPABASE_KEY_());
}

// ---------------- HTTP ----------------

function supabaseRequest_(method, path, body, extraHeaders) {
  const url = SUPABASE_URL_() + '/rest/v1' + path;
  const headers = {
    'apikey': SUPABASE_KEY_(),
    'Authorization': 'Bearer ' + SUPABASE_KEY_(),
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };
  if (extraHeaders) {
    Object.keys(extraHeaders).forEach(k => { headers[k] = extraHeaders[k]; });
  }
  const opts = { method: method, muteHttpExceptions: true, headers: headers };
  if (body !== undefined) opts.payload = JSON.stringify(body);
  const resp = UrlFetchApp.fetch(url, opts);
  const code = resp.getResponseCode();
  if (code >= 200 && code < 300) return { ok: true, code: code };
  return { ok: false, code: code, body: resp.getContentText() };
}

function supabaseUpsert_(table, items) {
  if (!items.length) return { ok: true, count: 0 };
  const BATCH = 200;
  let total = 0;
  for (let i = 0; i < items.length; i += BATCH) {
    const chunk = items.slice(i, i + BATCH);
    const r = supabaseRequest_(
      'POST',
      '/' + table + '?on_conflict=id',
      chunk,
      { 'Prefer': 'resolution=merge-duplicates,return=minimal' }
    );
    if (!r.ok) {
      Logger.log('Upsert ' + table + ' fail @' + i + ': ' + r.code + ' ' + r.body);
      return { ok: false, count: total, error: r.body, code: r.code };
    }
    total += chunk.length;
  }
  return { ok: true, count: total };
}

function supabaseDelete_(table, id) {
  return supabaseRequest_('DELETE', '/' + table + '?id=eq.' + encodeURIComponent(id));
}

function supabasePatch_(table, id, patch) {
  return supabaseRequest_('PATCH', '/' + table + '?id=eq.' + encodeURIComponent(id), patch);
}

// ---------------- Mapping ----------------

function mapSsotRowToArchiveItem_(row) {
  // 시트 컬럼: No, 대분류, 소분류, 태그, 자료 제목, 보조설명, 외부 링크, 파일 링크,
  // 자료 형식, 발행일, 등록일, 등록자, 상태, 마지막 점검일, 카테고리 담당,
  // 노출 등급, 비고, 조회수, 다운로드수
  const no = row[0];
  const title = row[4];
  if (!no || !title) return null;
  const ext = row[6] ? String(row[6]).trim() : '';
  const fileLink = row[7] ? String(row[7]).trim() : '';
  return {
    id: Number(no),
    main_category: String(row[1] || '미분류'),
    sub_category: row[2] ? String(row[2]) : null,
    tags: row[3]
      ? String(row[3]).split(',').map(s => s.trim()).filter(Boolean)
      : [],
    title: String(title),
    summary: row[5] ? String(row[5]) : null,
    external_url: ext || null,
    file_url: fileLink || null,
    format: row[8] ? String(row[8]) : null,
    published_at: toIsoDate_(row[9]),
    registered_at: toIsoTs_(row[10]) || new Date().toISOString(),
    proposer: row[11] ? String(row[11]) : null,
    status: mapSheetStatusToDb_(row[12]),
    last_checked_at: toIsoTs_(row[13]),
    category_owner: row[14] ? String(row[14]) : null,
    exposure_grade: row[15] ? String(row[15]) : 'free',
    notes: row[16] ? String(row[16]) : null,
    views: Number(row[17]) || 0,
    downloads: Number(row[18]) || 0,
    // kind는 Supabase 측 generated column
  };
}

function mapFaqRowToDb_(row) {
  // 시트: No, 대분류, 소분류, 질문, 답변, 등록일, 조회수, 비고
  const no = row[0];
  const q = row[3];
  if (!no || !q) return null;
  return {
    id: Number(no),
    main_category: String(row[1] || '미분류'),
    sub_category: row[2] ? String(row[2]) : null,
    question: String(q),
    answer: String(row[4] || ''),
    registered_at: toIsoTs_(row[5]) || new Date().toISOString(),
    views: Number(row[6]) || 0,
    notes: row[7] ? String(row[7]) : null,
  };
}

function mapSheetStatusToDb_(s) {
  if (!s) return 'public';
  const v = String(s).trim();
  // 시트 점검 결과는 한글. Supabase는 영문 enum.
  if (v === '점검필요' || v === 'broken') return 'hidden';
  if (v === 'hidden' || v === 'public' || v === 'pending') return v;
  return 'public';
}

function toIsoDate_(v) {
  if (!v) return null;
  if (v instanceof Date) return Utilities.formatDate(v, 'UTC', 'yyyy-MM-dd');
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // yyyy-mm or yyyy 만 있는 경우 처리
  const m = s.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (m) {
    return m[1] + '-' + (m[2] || '01') + '-' + (m[3] || '01');
  }
  return null;
}

function toIsoTs_(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ---------------- Sync ----------------

/** 시트 onEdit 트리거 진입점. 편집된 시트·행을 감지해서 Supabase에 푸시. */
function onEditSyncToSupabase(e) {
  if (!supabaseConfigured_()) return;
  if (!e || !e.range) return;
  try {
    const sheet = e.range.getSheet();
    const name = sheet.getName();
    const rowIdx = e.range.getRow();
    if (rowIdx < 2) return;  // 헤더
    if (name === CONFIG.SHEETS.SSOT) {
      syncSsotRow_(sheet, rowIdx);
    } else if (name === 'FAQ') {
      syncFaqRow_(sheet, rowIdx);
    }
  } catch (err) {
    Logger.log('onEditSyncToSupabase error: ' + err);
  }
}

function syncSsotRow_(sheet, rowIdx) {
  const row = sheet.getRange(rowIdx, 1, 1, 19).getValues()[0];
  const no = row[0];
  const title = row[4];
  if (!no) return;  // No 비어있으면 무시
  if (!title) {
    // 제목 비웠으면 삭제로 간주
    supabaseDelete_('archive_item', no);
    return;
  }
  const item = mapSsotRowToArchiveItem_(row);
  if (!item) return;
  supabaseUpsert_('archive_item', [item]);
}

function syncFaqRow_(sheet, rowIdx) {
  const row = sheet.getRange(rowIdx, 1, 1, 8).getValues()[0];
  const no = row[0];
  if (!no) return;
  if (!row[3]) {
    supabaseDelete_('faq', no);
    return;
  }
  const item = mapFaqRowToDb_(row);
  if (!item) return;
  supabaseUpsert_('faq', [item]);
}

/** 일회성 풀싱크. SSOT + FAQ 전체를 Supabase에 upsert. */
function fullSyncToSupabase() {
  if (!supabaseConfigured_()) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY가 Script Properties에 없음.');
  }
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const result = {};

  const ssot = ss.getSheetByName(CONFIG.SHEETS.SSOT);
  if (ssot && ssot.getLastRow() >= 2) {
    const rows = ssot.getRange(2, 1, ssot.getLastRow() - 1, 19).getValues();
    const items = rows.map(mapSsotRowToArchiveItem_).filter(Boolean);
    const r = supabaseUpsert_('archive_item', items);
    Logger.log('archive_item: ' + r.count + (r.ok ? ' upserted' : ' / FAIL ' + r.error));
    result.archive = { count: r.count, ok: r.ok };
  }

  const faqSheet = ss.getSheetByName('FAQ');
  if (faqSheet && faqSheet.getLastRow() >= 2) {
    const rows = faqSheet.getRange(2, 1, faqSheet.getLastRow() - 1, 8).getValues();
    const items = rows.map(mapFaqRowToDb_).filter(Boolean);
    const r = supabaseUpsert_('faq', items);
    Logger.log('faq: ' + r.count + (r.ok ? ' upserted' : ' / FAIL ' + r.error));
    result.faq = { count: r.count, ok: r.ok };
  }

  return result;
}

/** 매일 03:00 안전망 풀싱크. installTriggers에서 등록. */
function dailySyncCron() {
  if (!supabaseConfigured_()) return;
  fullSyncToSupabase();
}

// ---------------- 외부 호출 (link check 등) ----------------

/**
 * weeklyLinkCheck에서 호출.
 * @param {number} no - 시트 No (= archive_item.id)
 * @param {string} dbStatus - 'public' | 'hidden' | 'pending'
 * @param {Date|string} when - 점검 시각
 */
function pushLinkCheckStatusToSupabase_(no, dbStatus, when) {
  if (!supabaseConfigured_()) return;
  if (!no) return;
  const patch = { last_checked_at: toIsoTs_(when) };
  if (dbStatus) patch.status = dbStatus;
  supabasePatch_('archive_item', no, patch);
}

/** Supabase 연결 자가진단. */
function supabasePing() {
  if (!supabaseConfigured_()) return { ok: false, error: 'props 미설정' };
  const r = supabaseRequest_('GET', '/archive_item?select=id&limit=1');
  return r;
}
