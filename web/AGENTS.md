<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 데이터 작업 규칙

**DB를 바꾸는 작업은 코드가 아니라서 git에 안 남는다.** 초기화·시드·대량 수정/삭제·복원은 반드시:

- `scripts/data-ops/YYYY-MM-DD_이름.mjs` 파일로 저장하고 **커밋**한다. 인라인 `node -e "..."`로 실행하지 않는다 — 9/1 조회수 초기화·인기 시드가 인라인으로 실행돼 기록이 세션 로그에만 남았고, 9/10에 "실행된 적 없다"는 오판으로 이어졌다.
- 파일 머리에 날짜·목적·승인자·백업 경로를 적고, 실행 후엔 `이미 실행됨` 표시 + 재실행 가드(`--really-run` 없으면 종료)를 둔다.
- 실행 전 스냅샷을 `~/.macbe/backup_*.json`으로 남긴다.
- "이 작업이 실행된 적 있나"는 git 외에 세션 로그(`~/.claude/projects/-Users-duotne-Desktop-AI-chan-macbee/*.jsonl`)와 DB 형태(id 갭·타임스탬프)까지 본 뒤에 답한다.

# UI 일관성 규칙

**같은 모양 = 같은 역할.** 같은 스타일의 컴포넌트는 사이트 전체에서 같은 동작을 해야 한다.

- **칩(테두리 pill + 건수, 선택 시 accent 배경)** = 필터. 누르면 목록이 그 조건으로 좁혀진다. 페이지 이동·앵커 점프에 이 스타일 금지. (files/insights `ListFilterClient`, faq `FaqList` 기준)
- **네비게이션**은 링크답게: 밑줄 텍스트 링크, 탭, 또는 헤더 GNB 스타일. 필터 칩 모양으로 만들지 않는다.
- **검색창**: 라운드 풀 pill + 좌측 돋보기 아이콘, focus 시 색만 변경 (두께·높이 고정).
- 새 인터랙션 요소를 만들 땐 기존 컴포넌트에서 같은 모양이 어떤 동작을 하는지 먼저 확인하고 맞추거나, 다르게 동작해야 하면 모양도 다르게.
- 필터 상태는 URL(`?cat=` 등)에 반영해 공유 가능하게 하고, `filter_change` 이벤트로 트래킹한다.
- **컴포넌트 레시피의 단일 기준 = `/design` 페이지** (`app/design/page.tsx`). 버튼·칩·탭·인풋·카드·알림 박스의 클래스를 거기서 복사해 쓴다. 라운드는 토큰(`--r-sm` 6 / `--r-md` 8 / `--r-lg` 12 / full)만 사용, 임의 px·rounded-lg 등 하드코딩 금지.
