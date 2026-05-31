/**
 * URL 메타데이터 추출
 * og:title, og:description, title, description, body 일부를 발췌.
 * 외부 의존성 없이 정규식만 사용 (Apps Script는 DOM 파서 없음).
 */

function fetchUrlMetadata(url) {
  let resp;
  try {
    resp = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MacbePlanningArchiveBot/1.0)',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
    });
  } catch (e) {
    return { title: '', description: '', bodyText: '', error: String(e) };
  }
  if (resp.getResponseCode() >= 400) {
    return { title: '', description: '', bodyText: '', error: 'HTTP ' + resp.getResponseCode() };
  }
  const html = resp.getContentText();

  const ogTitle = matchMeta_(html, 'og:title') || matchTag_(html, 'title');
  const ogDesc = matchMeta_(html, 'og:description') || matchMetaName_(html, 'description');
  const publishedTime = matchMeta_(html, 'article:published_time')
    || matchMetaName_(html, 'date')
    || matchMetaName_(html, 'pubdate');

  // 본문 추출: <script>, <style> 제거 후 태그 제거 + 압축
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 2000);

  return {
    title: decodeEntities_(ogTitle || ''),
    description: decodeEntities_(ogDesc || ''),
    publishedAt: publishedTime || '',
    bodyText: bodyText,
  };
}

function matchMeta_(html, prop) {
  const re = new RegExp(
    '<meta[^>]+property=["\']' + escapeRegExp_(prop) + '["\'][^>]+content=["\']([^"\']+)["\']',
    'i'
  );
  const m = html.match(re);
  if (m) return m[1];
  // 순서 반대도 시도
  const re2 = new RegExp(
    '<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']' + escapeRegExp_(prop) + '["\']',
    'i'
  );
  const m2 = html.match(re2);
  return m2 ? m2[1] : '';
}

function matchMetaName_(html, name) {
  const re = new RegExp(
    '<meta[^>]+name=["\']' + escapeRegExp_(name) + '["\'][^>]+content=["\']([^"\']+)["\']',
    'i'
  );
  const m = html.match(re);
  return m ? m[1] : '';
}

function matchTag_(html, tag) {
  const re = new RegExp('<' + tag + '[^>]*>([^<]+)</' + tag + '>', 'i');
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function escapeRegExp_(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function decodeEntities_(s) {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
