/**
 * 맥비 자료실 — 드라이브 저장 웹앱 (맥비님 계정에서 실행)
 *
 * 자료실 서버가 보낸 파일을 맥비님 드라이브의 "맥비기획 자료실 (자료실 업로드)" 폴더에 저장하고 링크를 돌려준다.
 * 실행 주체 = 웹앱을 배포한 맥비님 → 파일은 맥비님 소유·용량.
 *
 * 권한: drive.file — 이 스크립트가 만든 폴더·파일만 접근 가능.
 *   DriveApp은 이 권한과 맞지 않아(전체 drive 요구) Drive API v3 고급 서비스를 쓴다.
 *
 * 코드 수정: asa067714(편집자)가 하고, 반영은 맥비님이 "배포 → 배포 관리 → 새 버전"으로 재배포.
 *
 * 설정(프로젝트 설정 → 스크립트 속성):
 *   DRIVE_SECRET  자료실 서버와 맞출 시크릿 (필수, 24자 이상)
 *   FOLDER_NAME   저장 폴더 이름 (기본: 맥비기획 자료실 (자료실 업로드)) — 처음 생성 때만 사용
 *   FOLDER_ID     생성된 폴더 ID (자동 저장)
 *   MAX_BYTES     허용 용량 (기본 10485760 = 10MB)
 */

var DEFAULT_FOLDER_NAME = '맥비기획 자료실 (자료실 업로드)';
var DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
var BLOCKED_EXT = ['svg', 'html', 'htm', 'xhtml', 'xml', 'js', 'mjs'];
var FOLDER_MIME = 'application/vnd.google-apps.folder';

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 저장 폴더 ID — 처음엔 만들고 FOLDER_ID에 기억. 지워졌으면 다시 만든다. */
function folderId_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('FOLDER_ID');
  if (id) {
    try {
      var f = Drive.Files.get(id, { fields: 'id,trashed' });
      if (f && !f.trashed) return id;
    } catch (err) { /* 삭제됐거나 접근 불가 → 새로 생성 */ }
  }
  var name = props.getProperty('FOLDER_NAME') || DEFAULT_FOLDER_NAME;
  var created = Drive.Files.create({ name: name, mimeType: FOLDER_MIME }, null, { fields: 'id' });
  props.setProperty('FOLDER_ID', created.id);
  return created.id;
}

function doGet() {
  return HtmlService.createHtmlOutput(
    '<meta http-equiv="refresh" content="0;url=https://macbe-archive.com">'
  );
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'invalid json' });
  }

  var secret = prop_('DRIVE_SECRET');
  if (!secret || body.secret !== secret) return json_({ ok: false, error: 'unauthorized' });

  try {
    if (body.action === 'ping') {
      var fid = folderId_();
      var f = Drive.Files.get(fid, { fields: 'id,name,webViewLink' });
      return json_({ ok: true, folder: f.name, folderId: f.id, folderUrl: f.webViewLink });
    }
    if (body.action === 'upload') return json_(upload_(body));
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** 입력 { name, mimeType, base64 } → 출력 { ok, id, name, size, viewUrl, downloadUrl } */
function upload_(body) {
  // 파일명은 자료실 서버가 "정리된 제목.확장자"로 보낸다. 경로·제어문자만 제거.
  var name = String(body.name || '').replace(/[\/\\\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
  var mime = String(body.mimeType || 'application/octet-stream');
  if (!name) return { ok: false, error: 'name required' };
  if (!body.base64) return { ok: false, error: 'base64 required' };

  var maxBytes = Number(prop_('MAX_BYTES')) || DEFAULT_MAX_BYTES;
  var bytes = Utilities.base64Decode(String(body.base64));
  if (bytes.length === 0) return { ok: false, error: 'empty file' };
  if (bytes.length > maxBytes) return { ok: false, error: 'too large' };

  var ext = (name.split('.').pop() || '').toLowerCase();
  if (BLOCKED_EXT.indexOf(ext) >= 0) return { ok: false, error: 'blocked extension' };

  var blob = Utilities.newBlob(bytes, mime, name);
  var file = Drive.Files.create({ name: name, parents: [folderId_()] }, blob, { fields: 'id,name,size' });

  // 링크 있는 사람만 보기 (폴더 전체 공개 아님)
  try {
    Drive.Permissions.create({ type: 'anyone', role: 'reader' }, file.id);
  } catch (shareErr) {
    return { ok: false, error: 'sharing failed: ' + String(shareErr), id: file.id };
  }

  return {
    ok: true,
    id: file.id,
    name: file.name,
    size: bytes.length,
    viewUrl: 'https://drive.google.com/file/d/' + file.id + '/view',
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.id,
  };
}

/** 편집기에서 1회 실행 — 권한 승인 + 폴더 생성 확인 */
function setup() {
  var fid = folderId_();
  var f = Drive.Files.get(fid, { fields: 'name,webViewLink' });
  Logger.log('폴더 준비됨: ' + f.name + ' (' + f.webViewLink + ')');
  return f.webViewLink;
}

/** 안내문의 이름 유지용 — setup과 동일 */
function testDriveWebapp() { Logger.log(setup()); }
