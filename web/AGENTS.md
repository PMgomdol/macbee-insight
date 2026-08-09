<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# UI 일관성 규칙

**같은 모양 = 같은 역할.** 같은 스타일의 컴포넌트는 사이트 전체에서 같은 동작을 해야 한다.

- **칩(테두리 pill + 건수, 선택 시 accent 배경)** = 필터. 누르면 목록이 그 조건으로 좁혀진다. 페이지 이동·앵커 점프에 이 스타일 금지. (files/insights `ListFilterClient`, faq `FaqList` 기준)
- **네비게이션**은 링크답게: 밑줄 텍스트 링크, 탭, 또는 헤더 GNB 스타일. 필터 칩 모양으로 만들지 않는다.
- **검색창**: 라운드 풀 pill + 좌측 돋보기 아이콘, focus 시 색만 변경 (두께·높이 고정).
- 새 인터랙션 요소를 만들 땐 기존 컴포넌트에서 같은 모양이 어떤 동작을 하는지 먼저 확인하고 맞추거나, 다르게 동작해야 하면 모양도 다르게.
- 필터 상태는 URL(`?cat=` 등)에 반영해 공유 가능하게 하고, `filter_change` 이벤트로 트래킹한다.
- **컴포넌트 레시피의 단일 기준 = `/design` 페이지** (`app/design/page.tsx`). 버튼·칩·탭·인풋·카드·알림 박스의 클래스를 거기서 복사해 쓴다. 라운드는 토큰(`--r-sm` 6 / `--r-md` 8 / `--r-lg` 12 / full)만 사용, 임의 px·rounded-lg 등 하드코딩 금지.
