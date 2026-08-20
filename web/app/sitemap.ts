import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// 자료는 외부 링크라 개별 페이지가 없음 — 주요 라우트만.
// /submit은 noindex라 제외. /search·정책 페이지는 우선순위 낮게.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;
  const priority: Record<string, number> = {
    '': 1,
    '/files': 0.8,
    '/insights': 0.8,
    '/faq': 0.8,
    '/search': 0.4,
    '/privacy': 0.2,
    '/terms': 0.2,
  };
  return Object.entries(priority).map(([p, pr]) => ({
    url: `${base}${p}`,
    changeFrequency: p === '' || pr >= 0.8 ? 'daily' : 'monthly',
    priority: pr,
  }));
}
