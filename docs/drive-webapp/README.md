# 드라이브 저장 웹앱 — 운영 메모 (내부용)

구조 (2026-08-30 확정): **맥비님 계정의 단일 스크립트**(`shell/`) → 웹앱 배포(실행=맥비님, 익명 허용) → 맥비님 드라이브.
- 프로젝트: https://script.google.com/d/1UImom_BchPnFAoPlrFdLh-VT-dMcGy1uDQiHlIpDb4yzJQIjj5t1jg9z/edit (asa067714 편집자)
- 코드 수정: `shell/`에서 `npx @google/clasp push -f` (편집자 권한으로 push 가능)
- **반영은 맥비님이 "배포 → 배포 관리 → 연필 → 버전: 새 버전 → 배포"** — 배포자 = 실행 주체라 이건 대신 못 함. 웹앱 URL은 그대로 유지됨
- 스크립트 속성(프로젝트 설정): `DRIVE_SECRET`(필수) · `FOLDER_ID`(자동) · `FOLDER_NAME` · `MAX_BYTES`. 편집자도 설정 가능
- 스코프 `drive.file` — 폴더는 ID로 열고(FOLDER_ID), 이름 검색은 불가

라이브러리 방식(`library/`)은 **폐기**: 익명 웹앱에서는 개발 모드가 적용되지 않고, 맥비님이 붙여넣을 때 `developmentMode`가 자동으로 false로 저장됨. `library/`는 참고용으로만 남김(라이브러리 프로젝트는 삭제 가능).

자료실 쪽: `web/lib/drive-webapp.ts`, Vercel env `DRIVE_WEBAPP_URL` / `DRIVE_WEBAPP_SECRET`, 이관 스크립트 `web/scripts/drive_migrate_existing.mjs`.

결정 사항
- 전송 시점 = 승인 시점. 파일명 = 정리된 제목.확장자. 반려 파일은 드라이브에 안 감
- 이중 저장 없음. 성공 후 Supabase 임시 파일 삭제. 실패 시 Supabase 링크 유지 + 운영진 알림 + 자료 관리 "드라이브로" 재시도
