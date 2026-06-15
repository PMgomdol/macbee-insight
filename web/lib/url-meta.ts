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
