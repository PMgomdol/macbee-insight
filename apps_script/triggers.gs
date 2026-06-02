/**
 * 정기 자동화: 링크 유효성 점검, 주간 백업.
 */

function weeklyLinkCheck() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SSOT);
  const log = ss.getSheetByName(CONFIG.SHEETS.LOG);
  if (!sheet || sheet.getLastRow() < 2) return;

  // 컬럼: 1 No, 7 외부링크, 13 상태, 14 마지막점검일
  const last = sheet.getLastRow();
  const range = sheet.getRange(2, 1, last - 1, 17).getValues();
  const broken = [];
  const blocked = [];
  const now = new Date();

  for (let i = 0; i < range.length; i++) {
    const row = range[i];
    const url = row[6];
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const status = checkUrlAlive_(url);
    sheet.getRange(i + 2, 14).setValue(now);

    if (status.reason === 'broken') {
      sheet.getRange(i + 2, 13).setValue('점검필요');
      broken.push({ no: row[0], title: row[4], url: url, owner: row[14], code: status.code });
      log.appendRow([now, row[4], url, 'broken (' + status.code + ')', '']);
      try { pushLinkCheckStatusToSupabase_(row[0], 'hidden', now); } catch (e) { Logger.log('supabase push fail: ' + e); }
    } else if (status.reason === 'blocked') {
      // 봇 차단 의심 — SSOT 상태 변경 안 함, 로그+_blocked_ 시트에만 누적
      blocked.push({ no: row[0], title: row[4], url: url, code: status.code });
      log.appendRow([now, row[4], url, 'blocked (' + status.code + ')', '봇 차단 의심, 자동 점검 제외']);
      // last_checked_at만 갱신, status는 그대로
      try { pushLinkCheckStatusToSupabase_(row[0], null, now); } catch (e) { Logger.log('supabase push fail: ' + e); }
    } else {
      // alive → last_checked_at 갱신, broken에서 회복된 경우 status=public 복원
      try { pushLinkCheckStatusToSupabase_(row[0], 'public', now); } catch (e) { Logger.log('supabase push fail: ' + e); }
    }
  }

  if (broken.length > 0) {
    const summary = '🔧 [자료실 점검] 깨진 링크 ' + broken.length + '건\n\n'
      + broken.slice(0, 10).map(b => '- [' + (b.owner || '미배정') + '] ' + b.title + ' (' + b.code + ')').join('\n');
    log.appendRow([now, '_summary_', '', 'broken=' + broken.length, summary]);
  }

  if (blocked.length > 0) {
    let blockedSheet = ss.getSheetByName('_blocked_');
    if (!blockedSheet) {
      blockedSheet = ss.insertSheet('_blocked_');
      blockedSheet.getRange(1, 1, 1, 5).setValues([['점검일시', 'No', '제목', 'URL', 'HTTP']]);
    }
    const newRows = blocked.map(b => [now, b.no, b.title, b.url, b.code]);
    blockedSheet.getRange(blockedSheet.getLastRow() + 1, 1, newRows.length, 5).setValues(newRows);
    log.appendRow([now, '_summary_', '', 'blocked=' + blocked.length, '봇 차단(403/429) ' + blocked.length + '건 — 사람 검증 필요']);
  }
  invalidateSsotCache_();
}

/** 사용자가 강제로 SSOT 캐시 비우는 admin 함수 */
function refreshSsotCache() {
  invalidateSsotCache_();
  Logger.log('SSOT 캐시 비웠습니다. 다음 페이지 호출 시 시트에서 다시 읽어옵니다.');
  return { ok: true };
}

// 봇 차단으로 false positive 잦은 도메인 — 403/429 받아도 broken 처리 안 함
const BLOCKED_PRONE_DOMAINS_ = [
  'medium.com', 'facebook.com', 'instagram.com', 'youtube.com', 'youtu.be',
  'figma.com', 'm.blog.naver.com', 'm.cafe.naver.com', 'dribbble.com',
  'chosun.com', 'donga.com', 'joins.com', 'maily.so', 'brunch.co.kr',
];

function checkUrlAlive_(url) {
  try {
    const resp = UrlFetchApp.fetch(url, {
      method: 'get', muteHttpExceptions: true, followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
    });
    const code = resp.getResponseCode();
    if (code >= 200 && code < 400) return { alive: true, code: code, reason: 'ok' };

    // 403/429 → 봇 차단·rate limit 가능성. 일단 blocked로 분류 (broken 아님)
    if (code === 403 || code === 429) return { alive: false, code: code, reason: 'blocked' };

    // 404/410/500 등 → broken 확정
    return { alive: false, code: code, reason: 'broken' };
  } catch (e) {
    return { alive: false, code: 'ERR', reason: 'broken' };
  }
}

function weeklyBackup() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const root = DriveApp.getFolderById(CONFIG.DRIVE_ROOT_ID);
  const backupFolder = root.getFoldersByName('_백업').hasNext()
    ? root.getFoldersByName('_백업').next()
    : root.createFolder('_백업');
  const stamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd_HHmm');
  const copy = DriveApp.getFileById(ss.getId()).makeCopy('자료실_DB_' + stamp, backupFolder);
  Logger.log('Backup created: ' + copy.getName());
}
