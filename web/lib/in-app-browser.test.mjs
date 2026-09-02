// node web/lib/in-app-browser.test.mjs — isInAppBrowser 오탐/미탐 검증
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

// .ts 소스에서 정규식만 뽑아 동일 로직 검증(빌드 없이 실행)
const src = readFileSync(new URL('./in-app-browser.ts', import.meta.url), 'utf8');
const m = src.match(/return (\/.*\/i)\.test\(ua\);/);
assert(m, '정규식을 소스에서 찾지 못함 — in-app-browser.ts 구조 변경?');
const re = new RegExp(m[1].slice(1, -2), 'i');
const isInAppBrowser = (ua) => re.test(ua);

// 인앱 브라우저 = true (뒤로가기 버그 대상)
const kakao = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116 Mobile Safari/537.36 KAKAOTALK 10.4.3';
const kakaoIos = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 KAKAOTALK 10.4.3';
const insta = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Instagram 300.0';
const fb = 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/440.0]';
const line = 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Line/13.0.0';
for (const ua of [kakao, kakaoIos, insta, fb, line]) assert.equal(isInAppBrowser(ua), true, `인앱인데 미탐: ${ua.slice(0, 40)}`);

// 일반 브라우저 = false (새 탭 유지 대상 — 오탐하면 데스크톱 새 탭이 깨짐)
const chrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const safariMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15';
const mobileSafari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
const androidChrome = 'Mozilla/5.0 (Linux; Android 13; SM-S911N) AppleWebKit/537.36 Chrome/116 Mobile Safari/537.36';
for (const ua of [chrome, safariMac, mobileSafari, androidChrome]) assert.equal(isInAppBrowser(ua), false, `일반인데 오탐: ${ua.slice(0, 40)}`);

console.log('✅ in-app-browser: 인앱 5종 탐지 + 일반 4종 통과');
