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

export function isBlockedIp(ip: string): boolean {
  const v = ip.startsWith('::ffff:') ? ip.slice(7) : ip; // IPv4-mapped IPv6 정규화
  if (net.isIPv4(v)) {
    const [a, b] = v.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;          // 링크로컬 + 클라우드 메타데이터
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true;                          // 멀티캐스트·예약
    return false;
  }
  const low = ip.toLowerCase().split('%')[0]; // zone id 제거
  if (low === '::1' || low === '::') return true;
  if (low.startsWith('fc') || low.startsWith('fd')) return true; // ULA
  if (low.startsWith('fe8') || low.startsWith('fe9') || low.startsWith('fea') || low.startsWith('feb')) return true; // fe80::/10
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
export async function safeFetch(rawUrl: string, init: RequestInit = {}, maxRedirects = 4): Promise<Response> {
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
