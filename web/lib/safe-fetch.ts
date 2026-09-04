import { lookup } from 'node:dns/promises';
import net from 'node:net';

/**
 * SSRF 가드가 붙은 fetch — 사용자가 넣은 URL을 서버가 대신 가져올 때 쓴다.
 * (analyzeUrl/analyzeFile 등 비인증 경로가 임의 URL을 fetch하므로 필수)
 *
 * 막는 것:
 *  - http/https 이외 스킴 (file:, gopher: 등)
 *  - 사설·루프백·링크로컬·예약 IP (10/8, 127/8, 169.254/16=클라우드 메타데이터, 172.16/12,
 *    192.168/16, 100.64/10 CGNAT, ::1, fc00::/7 ULA, fe80::/10 등)
 *  - 리다이렉트로 우회하는 것 — redirect를 수동으로 따라가며 매 홉 host를 다시 검사
 *
 * ponytail: DNS 리바인딩 TOCTOU(여기서 resolve한 IP ≠ 실제 connect 시 IP)는 남는다.
 *   내부 타깃이 실제 위협이 되면 undici dispatcher의 connect lookup 훅으로 닫는다.
 */

function isBlockedV4(a: number, b: number): boolean {
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;          // 링크로컬 + 클라우드 메타데이터
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true;                          // 멀티캐스트·예약
  return false;
}

/**
 * IPv6 문자열 → 16바이트. '::' 축약과 끝의 점표기 IPv4(::ffff:1.2.3.4)까지 전개.
 * 파싱 실패 시 null.
 */
function ipv6Bytes(ip: string): Uint8Array | null {
  let s = ip.toLowerCase().split('%')[0]; // zone id 제거
  // 끝에 점표기 IPv4가 붙은 형태(::ffff:1.2.3.4)를 두 hextet으로 치환
  const dq = s.match(/^(.*:)((?:\d{1,3}\.){3}\d{1,3})$/);
  if (dq) {
    const q = dq[2].split('.').map(Number);
    if (q.some((n) => n > 255)) return null;
    s = dq[1] + ((q[0] << 8) | q[1]).toString(16) + ':' + ((q[2] << 8) | q[3]).toString(16);
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 ? (halves[1] ? halves[1].split(':') : []) : null;
  let hextets: string[];
  if (tail === null) {
    if (head.length !== 8) return null;
    hextets = head;
  } else {
    const fill = 8 - head.length - tail.length;
    if (fill < 0) return null;
    hextets = [...head, ...Array(fill).fill('0'), ...tail];
  }
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    const h = hextets[i];
    if (!/^[0-9a-f]{1,4}$/.test(h)) return null;
    const n = parseInt(h, 16);
    bytes[i * 2] = n >> 8;
    bytes[i * 2 + 1] = n & 0xff;
  }
  return bytes;
}

export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return isBlockedV4(a, b);
  }
  const bytes = ipv6Bytes(ip);
  if (!bytes) return true; // 파싱 못 하면 안전하게 차단
  const first10Zero = bytes.slice(0, 10).every((x) => x === 0);
  // IPv4-mapped ::ffff:a.b.c.d  → 임베디드 IPv4로 판정 (URL은 이걸 hex로 정규화한다)
  if (first10Zero && bytes[10] === 0xff && bytes[11] === 0xff) return isBlockedV4(bytes[12], bytes[13]);
  // IPv4-compatible ::a.b.c.d / ::1(루프백) / ::(unspecified) — 전부 차단
  if (bytes.slice(0, 12).every((x) => x === 0)) return true;
  // NAT64 64:ff9b::/96 → 임베디드 IPv4로 판정
  if (bytes[0] === 0x00 && bytes[1] === 0x64 && bytes[2] === 0xff && bytes[3] === 0x9b &&
      bytes.slice(4, 12).every((x) => x === 0)) return isBlockedV4(bytes[12], bytes[13]);
  if ((bytes[0] & 0xfe) === 0xfc) return true;                     // ULA fc00::/7
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // 링크로컬 fe80::/10
  return false;
}

async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, ''); // IPv6 리터럴 대괄호 제거
  if (net.isIP(host)) {
    if (isBlockedIp(host)) throw new Error(`blocked host: ${hostname}`);
    return;
  }
  const results = await lookup(host, { all: true });
  if (!results.length) throw new Error(`unresolvable host: ${hostname}`);
  for (const r of results) {
    if (isBlockedIp(r.address)) throw new Error(`blocked host: ${hostname} -> ${r.address}`);
  }
}

/**
 * 반환된 Response의 `.url`은 최종(리다이렉트 다 따라간) URL이다 — 호출부에서 finalUrl로 쓸 수 있다.
 */
// maxRedirects=8: http→https→www→로케일→트레일링슬래시 등 정상 사이트가 4를 흔히 초과.
// 매 홉 host를 재검사하므로 상향해도 SSRF 안전성은 유지된다. (브런치식 무한루프는 폴백 UA로 해결)
export async function safeFetch(rawUrl: string, init: RequestInit = {}, maxRedirects = 8): Promise<Response> {
  let url = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error(`blocked scheme: ${u.protocol}`);
    await assertPublicHost(u.hostname);
    const resp = await fetch(url, { ...init, redirect: 'manual' });
    const loc = resp.status >= 300 && resp.status < 400 ? resp.headers.get('location') : null;
    if (!loc) return resp;
    url = new URL(loc, url).toString(); // 상대 Location 해석
  }
  throw new Error('too many redirects');
}
