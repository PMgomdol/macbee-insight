import { redirect } from 'next/navigation';

// 이벤트 안내는 맥비님 공식 페이지를 단일 출처로 사용 — 우리 /event 는 그쪽으로 넘긴다.
// (이전 안내 페이지 전체 내용은 git 이력에 남아 있음)
export default function EventPage() {
  redirect('https://macbe.dothome.co.kr/macbe_archive-challenge.html');
}
