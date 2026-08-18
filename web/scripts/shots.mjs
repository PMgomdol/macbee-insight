// 체인지로그용 화면 캡처 도구 — 스크린샷(JPEG) + 화면 녹화(webm) + 날짜별 아카이브.
// 새 브라우저 다운로드 없음: 설치된 Google Chrome(channel:'chrome')을 구동.
//
// 사용법 (web/ 에서, dev 서버 :3000 띄운 상태):
//   node scripts/shots.mjs                 # 공개 화면 전부 + 영상
//   node scripts/shots.mjs home search     # 지정한 뷰만
//   node scripts/shots.mjs admin           # 관리자 게이트 화면 (로그인 세션 필요, 아래)
//
// 관리자 화면(auth:true)은 로그인 뒤라 세션이 필요함. 인증 우회는 쓰지 않음:
//   1) 한 번만:  node scripts/shots.mjs --login   → 창이 열리면 평소처럼 구글 로그인
//      → 세션이 scripts/.shot-session.json 에 저장됨(gitignore, 민감정보라 커밋 금지)
//   2) 이후:     node scripts/shots.mjs admin     → 저장된 세션으로 캡처
//   세션이 없으면 관리자 뷰는 건너뜀(안내 출력).
//
// 결과물:
//   public/changelog/<name>.jpg           # 최신본 (체인지로그가 참조)
//   public/changelog/_archive/<날짜>/…    # 그날의 스냅샷 (before/after 아카이빙용, git 제외)
import { chromium } from 'playwright-core';
import { mkdirSync, copyFileSync, readdirSync, renameSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'public', 'changelog');
const SESSION = join(HERE, '.shot-session.json');
const DATE = new Date().toISOString().slice(0, 10);
const ARCHIVE = join(OUT, '_archive', DATE);
const BASE = process.env.BASE ?? 'http://localhost:3000';
const VW = 1280;

const HIDE = '[data-feedback-fab],[aria-label="의견 보내기"],nextjs-portal,[data-nextjs-dev-tools-button]{display:none!important}';

// --login: 창을 띄워 직접 로그인 → 세션 저장 후 종료
if (process.argv.includes('--login')) {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE + '/admin-mb26');
  console.log('열린 창에서 로그인하세요. 운영진 패널이 보이면 이 터미널에서 Enter…');
  await new Promise((r) => process.stdin.once('data', r));
  await ctx.storageState({ path: SESSION });
  await b.close();
  console.log('세션 저장:', SESSION);
  process.exit(0);
}

// 뷰 정의. clipH=상단 잘라내기 높이, el=요소 선택자, auth=로그인 필요, video=녹화+act
const VIEWS = [
  { name: 'home', url: '/', clipH: 720 },
  { name: 'search', url: '/search?q=기획', clipH: 720 },
  { name: 'cards', url: '/files', clipH: 760 },
  { name: 'faq', url: '/faq', clipH: 720 },
  { name: 'footer', url: '/faq', el: 'footer' },
  // 관리자 (로그인 세션 필요)
  { name: 'admin-backlog', url: '/admin-mb26/panel/backlog', auth: true, clipH: 860 },
  { name: 'admin-voc', url: '/admin-mb26/panel/feedback', auth: true, clipH: 860 },
  { name: 'admin-requests', url: '/admin-mb26/panel/requests', auth: true, clipH: 860 },
  // 영상 데모 (검색 타이핑 → 결과)
  {
    name: 'search-flow',
    url: '/search',
    video: true,
    act: async (page) => {
      const box = page.locator('input').first();
      await box.click();
      await box.pressSequentially('기획서', { delay: 160 });
      await page.waitForTimeout(1800);
    },
  },
];

const pick = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const want = (v) =>
  pick.length === 0
    ? !v.auth // 인자 없으면 공개 뷰만 (관리자는 명시적으로)
    : pick.some((a) => a === v.name || (a === 'admin' && v.auth) || (a === 'public' && !v.auth));

const hasSession = existsSync(SESSION);
mkdirSync(ARCHIVE, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function save(page, v) {
  const tmp = join(OUT, `${v.name}.jpg`);
  if (v.el) {
    const loc = page.locator(v.el).last();
    await loc.scrollIntoViewIfNeeded();
    await loc.screenshot({ path: tmp, type: 'jpeg', quality: 82 });
  } else {
    await page.screenshot({ path: tmp, type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: VW, height: v.clipH ?? 720 } });
  }
  copyFileSync(tmp, join(ARCHIVE, `${v.name}.jpg`)); // 날짜 아카이브에도 복사
  console.log('shot', v.name);
}

for (const v of VIEWS.filter(want)) {
  if (v.auth && !hasSession) {
    console.log('skip', v.name, '— 로그인 세션 없음 (먼저 `node scripts/shots.mjs --login`)');
    continue;
  }
  const storageState = v.auth ? SESSION : undefined;

  if (v.video) {
    // 녹화는 전용 컨텍스트 필요 (recordVideo는 컨텍스트 생성 시 지정)
    const ctx = await browser.newContext({ viewport: { width: VW, height: 720 }, recordVideo: { dir: OUT, size: { width: VW, height: 720 } } });
    const page = await ctx.newPage();
    await page.goto(BASE + v.url, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: HIDE }).catch(() => {});
    await v.act(page);
    await ctx.close(); // webm 파일 확정
    const webm = readdirSync(OUT).find((f) => f.endsWith('.webm') && f !== `${v.name}.webm`);
    if (webm) {
      rmSync(join(OUT, `${v.name}.webm`), { force: true });
      renameSync(join(OUT, webm), join(OUT, `${v.name}.webm`));
      copyFileSync(join(OUT, `${v.name}.webm`), join(ARCHIVE, `${v.name}.webm`));
    }
    console.log('video', v.name);
    continue;
  }

  const ctx = await browser.newContext({ viewport: { width: VW, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', storageState });
  const page = await ctx.newPage();
  await page.goto(BASE + v.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.addStyleTag({ content: HIDE }).catch(() => {});
  await save(page, v);
  await ctx.close();
}

await browser.close();
console.log(`\n완료 → public/changelog/  (아카이브: _archive/${DATE}/)`);
