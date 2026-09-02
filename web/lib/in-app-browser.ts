/**
 * 카카오톡 등 '인앱 브라우저'(앱 안에 내장된 웹뷰) 판별.
 *
 * 왜 필요한가: 인앱 브라우저는 `target="_blank"` 링크를 새 탭으로 못 열고 같은 웹뷰를
 * 새 페이지로 '교체'한다. 그래서 카드(목록) → 상세(드라이브 뷰어 등)로 이동한 뒤
 * 좌상단 뒤로가기를 누르면 원래 카드 페이지가 아니라 앱(채팅)으로 빠져나간다.
 * 이들에선 same-tab으로 이동시켜 웹뷰 히스토리에 목록→상세가 쌓이게 해야 뒤로가기가 정상 복귀한다.
 *
 * 주의: 새 in-app 토큰을 추가할 때는 일반 모바일 브라우저(Chrome/Safari)를 오탐하지 않게.
 */
export function isInAppBrowser(ua: string): boolean {
  return /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|Line\//i.test(ua);
}
