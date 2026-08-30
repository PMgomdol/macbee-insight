/**
 * 맥비 자료실 — 드라이브 저장 라이브러리 (asa067714 소유)
 *
 * 맥비님 계정의 껍데기 스크립트가 이 라이브러리를 개발 모드로 참조한다.
 * 실행 주체는 껍데기를 배포한 사람(맥비님)이므로 파일은 맥비님 드라이브에 저장된다.
 * 이 파일을 저장하면 재배포 없이 바로 반영된다 — 수정 전 반드시 복사본에서 테스트할 것.
 *
 * 스코프: drive.file — 이 스크립트가 만든 폴더·파일만 접근 가능.
 *
 * 설정(스크립트 속성):
 *   DRIVE_SECRET  자료실 서버와 맞출 시크릿 (필수, 24자 이상)
 *   FOLDER_NAME   저장 폴더 이름 (기본: 맥비기획 자료실 (자료실 업로드))
 *   MAX_BYTES     허용 용량 (기본 10485760 = 10MB)
 */

var DEFAULT_FOLDER_NAME = '맥비기획 자료실 (자료실 업로드)';
var DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
var BLOCKED_EXT = ['svg', 'html', 'htm', 'xhtml', 'xml', 'js', 'mjs'];

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 저장 폴더 — 없으면 실행 주체(맥비님) 드라이브 루트에 만든다. */
function folder_() {
  var name = prop_('FOLDER_NAME') || DEFAULT_FOLDER_NAME;
  var it = DriveApp.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(name);
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

  if (body.action === 'ping') {
    var f = folder_();
    return json_({ ok: true, folder: f.getName(), folderId: f.getId() });
  }
  if (body.action === 'upload') return json_(upload_(body));
  return json_({ ok: false, error: 'unknown action' });
}

/** 입력 { name, mimeType, base64 } → 출력 { ok, id, name, size, viewUrl, downloadUrl } */
function upload_(body) {
  try {
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

    var file = folder_().createFile(Utilities.newBlob(bytes, mime, name));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var id = file.getId();
    return {
      ok: true,
      id: id,
      name: file.getName(),
      size: bytes.length,
      viewUrl: 'https://drive.google.com/file/d/' + id + '/view',
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + id,
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/** 껍데기의 testDriveWebapp에서 호출 — 권한 승인 + 폴더 생성 확인 */
function setup() {
  var f = folder_();
  Logger.log('폴더 준비됨: ' + f.getName() + ' (' + f.getUrl() + ')');
  return f.getUrl();
}
