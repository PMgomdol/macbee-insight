/**
 * URL → og:title, og:description, og:image, article:published_time 등 추출.
 * Apps Script url_metadata.gs 포트.
 */

export type UrlMeta = {
  url: string;
  finalUrl: string;
  title: string;
  description: string;
  image: string | null;
  publishedAt: string | null; // ISO date
  siteName: string | null;
  ok: boolean;
  status: number;
  error?: string;
};

function matchMeta(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i');
  return html.match(re)?.[1] || html.match(re2)?.[1] || null;
}

function matchMetaName(html: string, name: string): string | null {
  const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i');
  return html.match(re)?.[1] || html.match(re2)?.[1] || null;
}

function matchTitleTag(html: string): string | null {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
}

function decode(s: string | null): string {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

const UA_CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const UA_GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

async function tryFetch(url: string, ua: string): Promise<{ ok: boolean; status: number; finalUrl: string; html?: string; error?: string }> {
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) {
      return { ok: false, status: resp.status, finalUrl: resp.url, error: `HTTP ${resp.status}` };
    }
    const html = (await resp.text()).slice(0, 200_000);
    return { ok: true, status: resp.status, finalUrl: resp.url, html };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const cause = e instanceof Error ? (e as Error & { cause?: { message?: string } }).cause?.message : undefined;
    return { ok: false, status: 0, finalUrl: url, error: cause ? `${msg} (${cause})` : msg };
  }
}

export async function fetchUrlMeta(url: string): Promise<UrlMeta> {
  const result: UrlMeta = {
    url,
    finalUrl: url,
    title: '',
    description: '',
    image: null,
    publishedAt: null,
    siteName: null,
    ok: false,
    status: 0,
  };

  // 1차: Chrome UA. 2차: 봇 차단·로그인 강제 사이트(브런치·Medium·노션 등)는 Googlebot UA fallback
  let r = await tryFetch(url, UA_CHROME);
  if (!r.ok && (r.error?.includes('redirect count') || r.status === 401 || r.status === 403)) {
    r = await tryFetch(url, UA_GOOGLEBOT);
  }
  result.status = r.status;
  result.finalUrl = r.finalUrl;
  if (!r.ok || !r.html) {
    result.error = r.error;
    return result;
  }
  const html = r.html;
  try {

    const ogTitle = matchMeta(html, 'og:title');
    const tag = matchTitleTag(html);
    const ogDesc = matchMeta(html, 'og:description') || matchMetaName(html, 'description');
    const ogImage = matchMeta(html, 'og:image');
    const siteName = matchMeta(html, 'og:site_name');
    const pub = matchMeta(html, 'article:published_time')
      || matchMetaName(html, 'date')
      || matchMetaName(html, 'pubdate');

    result.title = decode(ogTitle || tag);
    result.description = decode(ogDesc);
    result.image = ogImage ? decode(ogImage) : null;
    result.siteName = siteName ? decode(siteName) : null;
    result.publishedAt = pub ? decode(pub).split('T')[0] : null;
    result.ok = true;
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : String(e);
  }
  return result;
}

/** 도메인 기반 형식 추정 */
export function guessFormat(url: string): string {
  const u = url.toLowerCase();
  if (/youtube\.com|youtu\.be|vimeo\.com/.test(u)) return '영상';
  if (/figma\.com\/community|figma\.com\/file/.test(u)) return '템플릿';
  if (/\.pdf($|\?)/.test(u)) return '가이드';
  return '아티클';
}

/** 파일 자료 자동 판별 (file URL 또는 google docs/drive) */
export function isFileUrl(url: string): boolean {
  return /https?:\/\/(?:m\.|www\.)?(docs|drive|sheets|slides)\.google\.com/.test(url);
}

/**
 * URL 정규화 — 중복 검사용 키. 동일 자료가 다른 변형으로 다시 등록되는 것 방지.
 * - 스킴 https로 통일, 호스트 lowercase, 'm.' / 'www.' 접두어 제거
 * - 트래킹 파라미터(utm_*, gclid, fbclid, ref, ref_) 제거
 * - 끝의 '/' 제거, fragment(#...) 제거
 * - 쿼리 파라미터 정렬 (순서 무관)
 * - YouTube watch?v= 는 영상 ID만 키로 유지 (youtu.be 단축형과 통합)
 */
export function normalizeUrl(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();
  try {
    const u = new URL(s);
    u.protocol = 'https:';
    u.hostname = u.hostname.toLowerCase().replace(/^(m|www)\./, '');
    u.hash = '';

    // YouTube 통합 — youtu.be/X ↔ youtube.com/watch?v=X ↔ /shorts/X
    if (/(^|\.)youtube\.com$/.test(u.hostname) || u.hostname === 'youtu.be') {
      let vid: string | null = null;
      if (u.hostname === 'youtu.be') vid = u.pathname.slice(1).split('/')[0] || null;
      else if (u.pathname === '/watch') vid = u.searchParams.get('v');
      else if (u.pathname.startsWith('/shorts/')) vid = u.pathname.split('/')[2] || null;
      if (vid) return `https://youtube.com/watch?v=${vid}`;
    }

    const trackingParams = /^(utm_|gclid|fbclid|mc_|igshid|_hsenc|_hsmi|ref|ref_|source)$/i;
    const keep: [string, string][] = [];
    u.searchParams.forEach((v, k) => { if (!trackingParams.test(k)) keep.push([k, v]); });
    keep.sort(([a], [b]) => a.localeCompare(b));
    u.search = '';
    keep.forEach(([k, v]) => u.searchParams.append(k, v));

    // 끝 슬래시 제거 (단, path가 '/'만 있을 때는 유지)
    let pathname = u.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
    u.pathname = pathname;

    return u.toString();
  } catch {
    return s.toLowerCase().replace(/\/+$/, '');
  }
}
