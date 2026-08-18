// 체인지로그용 스크린샷 생성 — 현재 라이브(로컬 dev) 공개 화면을 캡처.
// 사용: dev 서버(:3000) 띄운 상태에서  node scripts/shots.mjs
// 새 브라우저 다운로드 없음 — 설치된 Google Chrome(channel:'chrome')을 구동.
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'changelog');
const BASE = process.env.BASE ?? 'http://localhost:3000';

// [파일명, 경로, {선택자 또는 clip높이, 스크롤}]
const SHOTS = [
  ['home.png', '/', { clipH: 720 }],
  ['search.png', '/search?q=기획', { clipH: 720 }],
  ['cards.png', '/files', { clipH: 760 }],
  ['faq.png', '/faq', { clipH: 720 }],
  ['footer.png', '/faq', { footer: true }],
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
});
const page = await ctx.newPage();

for (const [name, path, opt] of SHOTS) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600); // 폰트·이미지 안정화
  // 떠있는 요소 숨기기: 의견 FAB + Next.js dev 뱃지(배포엔 없지만 개발 캡처에 낌)
  await page
    .addStyleTag({
      content:
        '[data-feedback-fab],[aria-label="의견 보내기"],nextjs-portal,#__next-build-watcher,[data-nextjs-dev-tools-button]{display:none!important}',
    })
    .catch(() => {});

  const file = join(OUT, name);
  if (opt.footer) {
    const footer = page.locator('footer').last();
    await footer.scrollIntoViewIfNeeded();
    await footer.screenshot({ path: file });
  } else {
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1280, height: opt.clipH } });
  }
  console.log('saved', name);
}

await browser.close();
