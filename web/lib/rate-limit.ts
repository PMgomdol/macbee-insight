import { headers } from 'next/headers';

/**
 * 비인증 고비용 액션(AI 분석·업로드 티켓 발급) 남용 방지용 IP 슬로틀.
 * 슬라이딩 윈도우, in-memory.
 *
 * ponytail: 인스턴스 로컬 메모리라 서버리스 콜드스타트/팬아웃이면 리셋된다.
 *   순진한 스크립트 남용은 막지만, 다중 인스턴스로 흩뿌리는 공격엔 약하다.
 *   실제 남용이 관측되면 Upstash Redis 등 공유 저장소로 교체.
 */
const hits = new Map<string, number[]>();

function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return true;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  // Vercel이 주입하는 값 우선 — 클라이언트가 위조 못 함. x-forwarded-for 맨 앞값은
  // 클라이언트가 임의로 넣을 수 있어(슬로틀 우회) 마지막 폴백으로만 쓴다.
  return h.get('x-vercel-forwarded-for')
    || h.get('x-real-ip')
    || h.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
}

/** true면 한도 초과 — 호출부는 사용자용 에러를 반환한다. bucket으로 액션군을 구분. */
export async function tooMany(bucket: string, limit: number, windowMs = 60_000): Promise<boolean> {
  const ip = await clientIp();
  return !allow(`${bucket}:${ip}`, limit, windowMs);
}
