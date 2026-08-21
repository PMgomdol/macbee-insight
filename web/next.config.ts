import type { NextConfig } from "next";

// 전 경로 공통 보안 헤더. CSP는 GA·PostHog·인라인(JSON-LD) 때문에 nonce 셋업이 필요해
// 오픈 후 별도 처리(백로그) — 지금은 깨질 위험 없는 헤더만 건다.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },          // 클릭재킹 — 외부 사이트가 iframe으로 못 감쌈(어드민 보호)
  { key: 'X-Content-Type-Options', value: 'nosniff' },      // MIME 스니핑 차단
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
    serverActions: {
      // 서버액션은 텍스트 폼만 받는다(파일 바이트는 signed URL로 Supabase 직행, 액션 우회).
      // 50mb는 근거 없이 컸음 — 비인증 액션 본문 DoS 완충 위해 축소.
      bodySizeLimit: '1mb',
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
