// node web/lib/synonyms.test.mjs (Node 23+, .ts 타입 스트리핑) — 동의어 띄어쓰기 무시·띄어쓰기 변형 검증
import assert from 'node:assert';
import { expand, spacingVariants } from './synonyms.ts';

// 띄어 써도 붙인 키에 걸린다
assert.equal(expand('화면 설계서')?.canonical, '화면설계서');
assert.equal(expand('PM 면접')?.canonical, 'PM면접');
assert.equal(expand('UX 라이팅')?.canonical, 'UX라이팅');
// 검색 로그 빈틈 — 결과 많은 말로 이어진다
assert.ok(expand('포폴')?.expanded.includes('포트폴리오'));
assert.ok(expand('백오피스')?.expanded.includes('관리자'));
assert.ok(expand('관리자페이지')?.expanded.includes('어드민'));

// 띄어쓰기 변형
assert.deepEqual(spacingVariants('문제 정의'), ['문제 정의', '문제정의']);
assert.deepEqual(spacingVariants('온보딩'), ['온보딩', '온 보딩', '온보 딩']);
assert.deepEqual(spacingVariants('결제'), ['결제']); // 2자는 그대로
assert.deepEqual(spacingVariants('figma'), ['figma']); // 한글만
assert.equal(spacingVariants('관리자페이지').length, 6);

console.log('synonyms ok');
