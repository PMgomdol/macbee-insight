/**
 * 메일 노티 — Vercel 자료실이 POST로 호출하는 알림 엔드포인트
 *
 * 이벤트:
 *   proposal_submitted → 운영진에게 "새 자료 제안" 알림
 *   proposal_result    → 제안자에게 승인/반려 결과 알림
 *
 * 보안:
 *   Script Property MAIL_SECRET과 일치해야 발송.
 *   시크릿은 최초 1회 {action:'init_secret'}으로 설정 (이미 있으면 거부) —
 *   공개 저장소라 코드에 시크릿을 두지 않는다.
 *
 * 준비 (1회):
 *   1) 편집기에서 testMailNotify 실행 → 메일 권한(send_mail) 승인
 *   2) clasp push -f && clasp deploy (전용 배포 — 멤버용 웹앱 배포와 분리)
 *   3) init_secret POST → Vercel env(MAIL_WEBAPP_URL/SECRET)와 짝 맞춤
 *
 * 쿼터: consumer 계정 MailApp 100통/일 — 등록·승인 빈도 대비 충분
 */

var MAIL_NOTIFY = {
  SITE_URL: 'https://macbe-archive.com',
  SENDER_NAME: '맥비기획 자료실',
  // Vercel이 운영진 목록(data.admins)을 넘기지 못한 경우의 폴백만.
  DEFAULT_ADMINS: ['asa067714@gmail.com'],
  // 개인 계정 — 어떤 경로로도 알림 발송 금지.
  EXCLUDE: ['openpath@duotone.io'],
};

function mailSecret_() {
  return PropertiesService.getScriptProperties().getProperty('MAIL_SECRET');
}

function mailAdminEmails_() {
  var v = PropertiesService.getScriptProperties().getProperty('ADMIN_NOTIFY_EMAILS');
  if (!v) return MAIL_NOTIFY.DEFAULT_ADMINS;
  return v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

function mailJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return mailJson_({ ok: false, error: 'invalid json' });
  }

  // 최초 1회 시크릿 설정 — 이미 설정돼 있으면 거부
  if (body.action === 'init_secret') {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('MAIL_SECRET')) return mailJson_({ ok: false, error: 'already set' });
    if (!body.secret || String(body.secret).length < 16) return mailJson_({ ok: false, error: 'secret too short' });
    props.setProperty('MAIL_SECRET', String(body.secret));
    return mailJson_({ ok: true, initialized: true });
  }

  var secret = mailSecret_();
  if (!secret || body.secret !== secret) {
    return mailJson_({ ok: false, error: 'unauthorized' });
  }

  var data = body.data || {};
  try {
    if (body.event === 'proposal_submitted') return mailJson_(sendProposalSubmitted_(data));
    if (body.event === 'proposal_result') return mailJson_(sendProposalResult_(data));
    return mailJson_({ ok: false, error: 'unknown event: ' + body.event });
  } catch (err) {
    return mailJson_({ ok: false, error: String(err) });
  }
}

/** 제외 목록을 걸러낸 최종 수신자. Vercel이 넘긴 목록 우선, 없으면 폴백. */
function resolveRecipients_(admins) {
  var list = (admins && admins.length) ? admins : mailAdminEmails_();
  var excl = MAIL_NOTIFY.EXCLUDE || [];
  return list
    .map(function (s) { return String(s).trim(); })
    .filter(function (e) { return e && excl.indexOf(e) < 0; });
}

/** 운영진에게 새 자료 제안 알림 */
function sendProposalSubmitted_(d) {
  var title = String(d.title || '(제목 없음)');
  var recipients = resolveRecipients_(d.admins);
  if (!recipients.length) return { ok: false, error: 'no recipients' };

  var lines = [
    '새 자료가 검토를 기다리고 있어요.',
    '',
    '제목: ' + title,
  ];
  if (d.summary) lines.push('한 줄 설명: ' + d.summary);
  if (d.url) lines.push('링크: ' + d.url);
  var who = d.proposer || '';
  if (d.proposerEmail) who += (who ? ' ' : '') + '(' + d.proposerEmail + ')';
  if (who) lines.push('제안자: ' + who);
  lines.push('');
  // 딥링크 — 해당 제안 카드로 바로 이동 (admin 페이지가 #p-<id> 앵커 지원)
  var reviewUrl = MAIL_NOTIFY.SITE_URL + '/admin' + (d.id ? '#p-' + d.id : '');
  lines.push('바로 검토하기: ' + reviewUrl);
  lines.push('');
  lines.push('— 맥비기획 자료실 자동 알림');

  MailApp.sendEmail({
    to: recipients.join(','),
    subject: '[맥비 자료실] 새 자료 제안: ' + title,
    body: lines.join('\n'),
    name: MAIL_NOTIFY.SENDER_NAME,
  });
  return { ok: true, sent: recipients.join(',') };
}

/** 제안자에게 승인/반려 결과 알림 */
function sendProposalResult_(d) {
  var to = String(d.to || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, error: 'invalid recipient' };
  var title = String(d.title || '(제목 없음)');
  var approved = !!d.approved;

  var lines;
  if (approved) {
    lines = [
      '제안해주신 자료가 자료실에 올라갔어요. 고마워요!',
      '',
      '제목: ' + title,
      '',
      '자료실에서 보기: ' + MAIL_NOTIFY.SITE_URL + '/search?q=' + encodeURIComponent(title),
    ];
  } else {
    lines = [
      '제안해주신 자료를 검토했는데, 아쉽게도 이번에는 올리지 못했어요.',
      '',
      '제목: ' + title,
    ];
    if (d.note) lines.push('사유: ' + d.note);
    lines.push('');
    lines.push('다른 좋은 자료가 있으면 언제든 다시 제안해주세요: ' + MAIL_NOTIFY.SITE_URL + '/submit');
  }
  lines.push('');
  lines.push('— 맥비기획 자료실 자동 알림');

  MailApp.sendEmail({
    to: to,
    subject: '[맥비 자료실] "' + title + '" 검토 결과 — ' + (approved ? '승인' : '반려'),
    body: lines.join('\n'),
    name: MAIL_NOTIFY.SENDER_NAME,
  });
  return { ok: true, sent: to };
}

/**
 * 편집기에서 1회 실행 — 메일 권한 승인 트리거 + 운영진 첫 주소로 테스트 메일.
 * (Session.getEffectiveUser는 별도 userinfo 권한이 필요해서 쓰지 않음)
 * 실행 후 로그에 남은 일일 발송 쿼터가 찍힌다.
 */
/** 편집기에서 실행 — 수신자 필터(openpath 제외) 검증. 실패 시 throw. */
function testResolveRecipients() {
  var r1 = resolveRecipients_(['asa067714@gmail.com', 'openpath@duotone.io', ' x@y.com ']);
  if (r1.indexOf('openpath@duotone.io') >= 0) throw new Error('openpath 누출!');
  if (r1.length !== 2 || r1[1] !== 'x@y.com') throw new Error('필터/trim 오류: ' + JSON.stringify(r1));
  var r2 = resolveRecipients_([]);  // 폴백 → DEFAULT_ADMINS, openpath 없어야
  if (r2.indexOf('openpath@duotone.io') >= 0) throw new Error('폴백에 openpath 누출!');
  Logger.log('testResolveRecipients OK: ' + JSON.stringify(r1) + ' / fallback ' + JSON.stringify(r2));
}

function testMailNotify() {
  var to = mailAdminEmails_()[0];
  MailApp.sendEmail({
    to: to,
    subject: '[맥비 자료실] 메일 노티 테스트',
    body: '메일 발송 권한이 정상적으로 승인됐어요.\n\n— 맥비기획 자료실 자동 알림',
    name: MAIL_NOTIFY.SENDER_NAME,
  });
  Logger.log('테스트 메일 발송: ' + to + ' / 남은 일일 쿼터: ' + MailApp.getRemainingDailyQuota());
}
