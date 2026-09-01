/**
 * URL → og:title, og:description, og:image, article:published_time 등 추출.
 * Apps Script url_metadata.gs 포트.
 */
import { safeFetch } from './safe-fetch';

export type UrlMeta = {
  url: string;
  finalUrl: string;
  title: string;
  description: string;
  bodyText: string; // 본문 평문 발췌 (og가 부실할 때 AI 분류 근거)
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

function matchMetaItemprop(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+itemprop=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']${prop}["']`, 'i');
  return html.match(re)?.[1] || html.match(re2)?.[1] || null;
}

function matchTitleTag(html: string): string | null {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
}

/** <time datetime="..."> 첫 매치. */
function matchTimeTag(html: string): string | null {
  return html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1] ?? null;
}

/**
 * <script type="application/ld+json">…</script> 안에서 datePublished / dateCreated 추출.
 * NewsArticle / Article / BlogPosting 등 schema.org 표준.
 */
function matchJsonLdDate(html: string): string | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const obj = JSON.parse(m[1].trim());
      const found = findDateInLdObject(obj);
      if (found) return found;
    } catch {
      // 부분 매치 — 정규식 폴백
      const k = m[1].match(/"date[A-Za-z]*":\s*"([^"]+)"/);
      if (k) return k[1];
    }
  }
  return null;
}

function findDateInLdObject(obj: unknown): string | null {
  if (!obj) return null;
  if (Array.isArray(obj)) {
    for (const v of obj) {
      const r = findDateInLdObject(v);
      if (r) return r;
    }
    return null;
  }
  if (typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  for (const k of ['datePublished', 'dateCreated', 'uploadDate', 'dateModified']) {
    if (typeof o[k] === 'string') return o[k] as string;
  }
  // @graph 등 중첩 처리
  for (const v of Object.values(o)) {
    if (v && typeof v === 'object') {
      const r = findDateInLdObject(v);
      if (r) return r;
    }
  }
  return null;
}

/**
 * 본문 평문에서 발행일 추출. og·time·json-ld가 모두 없는 한국 블로그·매거진
 * (eopla, 노션 임베드 일부, 자체 CMS) 대비.
 * URL·이미지 src·script·style을 먼저 제거해서 S3 파일명 등의 노이즈 차단.
 */
function extractDateFromText(html: string): string | null {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/(href|src|srcset|style|content|action|data-[\w-]+)\s*=\s*"[^"]*"/gi, ' ')
    .replace(/(href|src|srcset|style|content|action|data-[\w-]+)\s*=\s*'[^']*'/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const patterns: RegExp[] = [
    /(20\d{2})\.\s*(\d{1,2})\.\s*(\d{1,2})/,        // 2026. 06. 24
    /(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일/,       // 2026년 6월 24일
    /(20\d{2})-(\d{1,2})-(\d{1,2})/,                  // 2026-06-24
    /(20\d{2})\/(\d{1,2})\/(\d{1,2})/,                // 2026/06/24
  ];
  for (const re of patterns) {
    const m = cleaned.match(re);
    if (!m) continue;
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
    if (y < 2000 || y > 2099) continue;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

/**
 * 본문 평문 추출 — og 설명이 사이트 기본값/광고문구인 글(브런치·요즘IT 등) 대비.
 * <article>/<main> 범위에서 블록 프로즈(<p>/<h1-3>/<li>/<blockquote>) 텍스트만 추출.
 * 전체 태그제거(<[^>]+>)는 속성값 안의 '>' 나 data-* 트래킹 속성이 새어나와 깨지므로
 * 블록 태그 내부 텍스트만 뽑는다. 프로즈가 빈약한 페이지만 전체 스트립으로 폴백.
 */
function extractMainText(html: string): string {
  const scope = (
    html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ??
    html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ??
    html
  )
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  const blocks = scope.match(/<(p|h[1-3]|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi) ?? [];
  let text = blocks
    .map((b) => b.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((t) => t.length > 1)
    .join('\n');

  // 블록 태그 없는 페이지 — 전체 스트립 폴백
  if (text.length < 150) {
    text = scope.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return decode(text).slice(0, 4000);
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
    const resp = await safeFetch(url, {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
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
    bodyText: '',
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
      || matchMeta(html, 'article:published')
      || matchMeta(html, 'og:published_time')
      || matchMeta(html, 'og:updated_time')
      || matchMetaName(html, 'article:published_time')
      || matchMetaName(html, 'date')
      || matchMetaName(html, 'pubdate')
      || matchMetaName(html, 'parsely-pub-date')
      || matchMetaName(html, 'sailthru.date')
      || matchMetaName(html, 'publication_date')
      || matchMetaName(html, 'DC.date.issued')
      || matchMetaName(html, 'dc.date.issued')
      || matchMetaItemprop(html, 'datePublished')
      || matchMetaItemprop(html, 'dateCreated')
      || matchTimeTag(html)
      || matchJsonLdDate(html);

    result.title = decode(ogTitle || tag);
    result.description = decode(ogDesc);
    result.bodyText = extractMainText(html);
    result.image = ogImage ? decode(ogImage) : null;
    result.siteName = siteName ? decode(siteName) : null;
    result.publishedAt = normalizePublishedDate(pub) || extractDateFromText(html);
    result.ok = true;
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : String(e);
  }
  return result;
}

/**
 * 다양한 날짜 입력을 yyyy-MM-dd로 정규화. ISO·yyyy/mm/dd·yyyy.mm.dd·yyyy년 mm월 dd일 지원.
 * 실패 시 null.
 */
function normalizePublishedDate(raw: string | null): string | null {
  if (!raw) return null;
  const s = decode(raw).trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dot = s.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (dot) return `${dot[1]}-${String(+dot[2]).padStart(2, '0')}-${String(+dot[3]).padStart(2, '0')}`;
  const slash = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (slash) return `${slash[1]}-${String(+slash[2]).padStart(2, '0')}-${String(+slash[3]).padStart(2, '0')}`;
  const ko = s.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (ko) return `${ko[1]}-${String(+ko[2]).padStart(2, '0')}-${String(+ko[3]).padStart(2, '0')}`;
  return null;
}

/** 도메인 기반 형식 추정 */
export function guessFormat(url: string): string {
  const u = url.toLowerCase();
  if (/youtube\.com|youtu\.be|vimeo\.com/.test(u)) return '영상';
  if (/\.pdf($|\?)/.test(u)) return '가이드';
  // 디자인·협업 툴 + 스프레드시트 = 거의 항상 활용 자료(보드·양식·시트) → 템플릿.
  // 구글 Docs/Slides·Drive·Notion은 글·가이드·양식이 섞여 도메인만으론 못 정함 → 제목·내용(프롬프트)으로 판단.
  if (/figma\.com|miro\.com|canva\.com|whimsical\.com|dovetail\.com|docs\.google\.com\/spreadsheets/.test(u)) return '템플릿';
  return '아티클';
}

/** YouTube 영상 URL 판별 (watch / youtu.be / shorts). 채널·홈 등 비영상은 false */
export function isYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase().replace(/^(m|www)\./, '');
    if (h === 'youtu.be') return u.pathname.length > 1;
    if (h === 'youtube.com' || h.endsWith('.youtube.com')) {
      return (u.pathname === '/watch' && !!u.searchParams.get('v')) || u.pathname.startsWith('/shorts/');
    }
    return false;
  } catch {
    return false;
  }
}

/** 파일 자료 자동 판별 (file URL 또는 google docs/drive) */
export function isFileUrl(url: string): boolean {
  return /https?:\/\/(?:m\.|www\.)?(docs|drive|sheets|slides)\.google\.com/.test(url);
}

/**
 * 드라이브 "파일" 링크를 바로 다운로드되는 형태로 변환 (2026-09-01 결정 — 앞으로 등록분은 직다운).
 * file/d/ID·open?id=ID 형태만 변환하고, 구글 문서(docs/sheets/slides 네이티브)·폴더는 그대로 둔다.
 */
export function toDriveDownloadUrl(url: string): string {
  const m = url.match(/drive\.google\.com\/(?:file\/d\/([\w-]{20,})|open\?id=([\w-]{20,})|uc\?[^#]*\bid=([\w-]{20,}))/);
  const id = m && (m[1] || m[2] || m[3]);
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : url;
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

    // utm_/mc_/_hs 는 접두 매치 — 종전 정규식은 $ 앵커 때문에 utm_source 등이 매치되지 않아
    // 트래킹 파라미터가 사실상 한 번도 제거되지 않았음 (2026-09-01 중복 미탐 원인).
    const isTracking = (k: string) => /^(utm_|mc_|_hs)/i.test(k) || /^(gclid|fbclid|igshid|ref|ref_|source)$/i.test(k);
    const keep: [string, string][] = [];
    u.searchParams.forEach((v, k) => { if (!isTracking(k)) keep.push([k, v]); });
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
