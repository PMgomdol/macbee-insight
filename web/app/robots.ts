import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    // 운영진 경로(/admin-mb26)는 robots에 적지 않는다 — 여기 적으면 비공개 경로가 노출됨. 인증으로 보호.
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/design'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
