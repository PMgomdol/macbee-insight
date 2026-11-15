// 맥비기획 자료 등록 챌린지 — 기간·안내 링크의 단일 출처 (맥비님 안내 페이지 기준).
// 다음 회차는 여기 날짜만 바꾸면 홈 배너·등록 버튼·등록 화면 안내·운영진 집계가 함께 바뀐다.
export const EVENT = {
  url: 'https://macbe.dothome.co.kr/macbe_archive-challenge.html',
  start: '2026-11-16', // KST, 포함
  end: '2026-12-16', // KST, 미포함 → 12/15 23:59까지
  label: '11/16~12/15',
};

const kst = (d: string) => Date.parse(`${d}T00:00:00+09:00`);

/** 이벤트 진행 중 (등록 화면 이메일 안내 기준) */
export const eventLive = (now = Date.now()) => now >= kst(EVENT.start) && now < kst(EVENT.end);

/** 홈 배너·등록 버튼 노출 — 시작 전 배포분부터 미리 보이고 종료 후 자동으로 사라짐 */
export const eventPromoVisible = (now = Date.now()) => now < kst(EVENT.end);
