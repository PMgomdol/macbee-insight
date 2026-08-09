import type { MetadataRoute } from 'next';

// 자료는 외부 링크라 개별 페이지가 없음 — 주요 라우트만
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://macbee-insight.vercel.app';
  return ['', '/files', '/insights', '/faq', '/search', '/submit'].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: 'daily',
    priority: p === '' ? 1 : 0.7,
  }));
}
