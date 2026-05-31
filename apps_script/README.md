# 자료실 등록 Web App — 배포 가이드

## 0. 사전 준비 (사용자 요청)

| 항목 | 어디서 | 결과로 받는 값 |
|---|---|---|
| Google 계정 | 운영팀 공용 권장 (없으면 신규 생성) | 로그인 가능 |
| Gemini API 키 | https://aistudio.google.com → "Get API key" | `AIza...` 문자열 |
| 자료실 스프레드시트 | 기존 시트 사용 또는 새로 생성 | 시트 ID (URL의 `/d/` 뒤 부분) |
| Drive 공유 폴더 | 운영팀 공용 계정으로 폴더 생성 후 다른 운영진에게 편집 권한 공유 | 폴더 ID (URL의 `/folders/` 뒤 부분) |

> 4가지가 다 모이지 않아도 처음에는 Gemini 키 없이 실행 가능 (휴리스틱 fallback). 다만 자동 분류 품질이 크게 떨어지므로 키 발급을 권장.

## 1. Apps Script 프로젝트 생성

**옵션 A — 웹에서 수동 (가장 빠름, 5분):**
1. https://script.google.com → "New project"
2. 좌측 파일 목록에서 기본 `Code.gs` 외 다음 파일을 추가 (`+` 버튼):
   - `Code.gs` → 본 폴더의 `Code.gs` 내용 붙여넣기
   - `url_metadata.gs`
   - `ai_classifier.gs`
   - `setup.gs`
   - `triggers.gs`
   - `webapp.html` (HTML 파일로 추가)
   - `admin.html` (HTML)
   - `styles.html` (HTML)
3. 좌측 톱니바퀴 → "Show appsscript.json" 체크 → 본 폴더의 `appsscript.json` 내용으로 교체

**옵션 B — clasp CLI (자동, 추천):**
```bash
npm install -g @google/clasp
clasp login
cd apps_script
clasp create --type webapp --title "맥비기획 자료실 등록"
clasp push
```

## 2. 1회 셋업 함수 실행

Apps Script 에디터 우측 상단 함수 선택 → 실행:

1. `setup.gs` 파일을 열고 `setProperties()` 함수 안의 3개 값을 채움:
   ```js
   SHEET_ID: '실제_스프레드시트_ID',
   DRIVE_ROOT_ID: '실제_드라이브_폴더_ID',
   GEMINI_API_KEY: 'AIza실제키',
   ```
2. `setProperties` 실행 (권한 승인 한 번 필요)
3. `initSheets` 실행 → 자료 DB / _staging_ / 카테고리 / _점검로그 시트 자동 생성 + 카테고리 시드
4. `initDriveFolders` 실행 → 카테고리별 Drive 폴더 자동 생성
5. `installTriggers` 실행 → 주간 링크 점검 + 백업 트리거 등록

## 3. Web App 배포

1. Apps Script 에디터 → "Deploy" → "New deployment"
2. Type: "Web app"
3. Description: `자료실 등록 v1`
4. Execute as: **Me** (배포자 계정)
5. Who has access: **Anyone with the link** (멤버용) 또는 **Anyone within (도메인)**
6. "Deploy" → 발급된 URL 두 개:
   - 등록 페이지: `https://script.google.com/.../exec`
   - 검토 페이지: `https://script.google.com/.../exec?page=admin`

> 검토 페이지는 운영팀에게만 공유 (실행 시 시트 권한 필요).

## 4. 단축 URL (선택)

카톡방에 뿌리기 좋게 단축 URL 생성:
- https://bit.ly 또는 https://tinyurl.com 무료
- 예: `bit.ly/macbe-archive` → 실제 Web App URL로 redirect

## 5. 동작 확인 체크리스트

- [ ] 등록 페이지 접속 → URL 입력 → "AI 분석" 버튼 → 3~5초 후 자동 채워짐
- [ ] "제출" → `_staging_` 시트에 row 추가 확인
- [ ] 파일 업로드 → `_staging_uploads` 폴더에 파일 생성 확인
- [ ] 검토 페이지(`?page=admin`) 접속 → 카드 형태로 노출
- [ ] "승인" → SSOT(자료 DB) 시트로 이동, 파일은 카테고리 폴더로 자동 분류
- [ ] 깨진 URL로 테스트 후 `weeklyLinkCheck` 수동 실행 → 상태 "점검필요" 확인

## 6. 로컬 검증 (배포 전 시뮬레이션)

배포 없이도 자동 분류가 제대로 되는지 확인하려면 [prototype/classify.py](../prototype/classify.py) 참고.

## 7. 트러블슈팅

| 증상 | 원인 / 조치 |
|---|---|
| 분석 결과가 항상 "미분류" | Gemini 키가 비었거나 잘못됨. Script properties 재확인 |
| URL fetch 실패 (HTTP 403) | 일부 사이트는 봇 차단. User-Agent 변경하거나 수동 입력 |
| 파일 업로드 50MB 초과 실패 | Apps Script 한계. 큰 파일은 직접 Drive 업로드 후 링크 등록 |
| 트리거 시간 안 맞음 | 매니페스트의 timeZone이 `Asia/Seoul`인지 확인 |
| `Authorization required` | 함수 1회 수동 실행해 OAuth 동의 |
