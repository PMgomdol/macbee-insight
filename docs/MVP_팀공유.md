# 맥비기획 자료실 MVP

발행: 2026-05-07 · 운영팀 안재찬

---

## 1. 한눈에 보기

기존 구글시트 자료실(약 1,300건)을 **Apps Script 기반 Web App**으로 정비. 비용 0원, 운영팀 공용 Google 계정 한 개에서 동작. 자료 분류·등록·검토·검색·다운로드를 한 곳에서.

| 항목 | 수치 |
|---|---|
| 정제 후 자동 등록 | 약 822건 (인사이트) |
| 운영진 검토 큐 | 74건 |
| macbee-document 실파일 | 13건 (등록 대기) |
| 자동 제거 | 노이즈·Q&A·만료 단축 URL 약 350건 |

---

## 2. 핵심 URL

| 페이지 | 용도 | URL |
|---|---|---|
| **자료실 메인** | 멤버 첫 화면 (홈 + 인기 + 미리보기) | `…/exec` |
| **기획 자료실** | 다운로드 가능한 파일 자료 | `…/exec?page=files` |
| **인사이트** | 아티클·영상·노션 등 외부 콘텐츠 | `…/exec?page=insights` |
| **자료 등록** | 멤버 누구나 제안 가능 | `…/exec?page=submit` |
| **운영팀 검토** | 운영진 전용 (2인 승인) | `…/exec?page=admin` |

전체 URL 베이스:
`https://script.google.com/macros/s/AKfycbx_X7ZhLbfXeJJllri3eqJBADelepPYoBGftsotm_64kmmU7X03y8qlSbBeiPMn_Ty1/exec`

연결 자원:
- 자료실 시트(자료 DB·staging·카테고리·점검로그·검토 큐): docs.google.com/spreadsheets/d/1vAn3ufrdf2qDjiRGf82S5096cZ7v1cIUnrTAkZBeqWM
- 실파일 Drive 폴더(카테고리별 자동 분류): drive.google.com/drive/folders/1nL-A7C4riAsZNqzq2Ati-gGZIMTJ9w29

---

## 3. 동작 방식

### 멤버 등록 흐름
1. 등록 페이지 접속 → URL 또는 파일 업로드
2. **AI(Gemini 2.5)가 제목·요약·카테고리·태그를 자동 추출**
3. 멤버는 결과 확인 후 제출 (수정 자유)
4. 자료는 `_staging_` 시트에서 운영팀 검토 대기

### 운영팀 검토 흐름 (2인 승인)
1. 검토 페이지에서 카드 형태로 대기 항목 확인
2. **서로 다른 운영자 2명**이 승인하면 자료실로 자동 이관
3. 같은 사람이 두 번 눌러도 1표만 카운트
4. 반려는 1명만 눌러도 처리

### 자료 vs 링크 분류
- **자료실(files)**: 파일 링크가 있거나 외부 URL이 `drive.google.com` / `docs.google.com` / `sheets.google.com` / `slides.google.com`
- **인사이트(insights)**: 그 외 외부 URL (브런치·유튜브·노션·블로그 등)

분류는 시트의 데이터를 매번 자동 계산. 시트 카테고리 컬럼 수정 불필요.

---

## 4. 운영 규칙

### 등록 권한
- 멤버: 제안만 가능 (편집권 미오픈)
- 운영팀: 검토·승인·반려·시트 직접 편집

### 카테고리 담당제 (회의록 합의 사항)
- 카테고리별 1명 운영진 책임 (시트의 `카테고리` 탭에서 매핑)
- 월 1회 본인 카테고리 점검: 시의성·중복·링크 오류

### 자동화 (트리거)
- **매주 월요일 06:00** — 모든 외부 링크 유효성 점검 → 깨진 링크 "점검필요" 표시
- **매주 일요일 03:00** — 시트 백업 스냅샷 → `_백업` 폴더

### 수동 정비 함수 (Apps Script 에디터 ▶ Run)
| 함수 | 용도 |
|---|---|
| `doctor` | 자가진단 (Properties / 시트 / 폴더 / 트리거 점검) |
| `cleanupBrokenLinks` | 404 외부 링크 일괄 제거 (백업 후) |
| `dedupeSsot` | 중복 자료 정리 (URL + 제목 기반) |
| `fixTitles` | 알려진 모호 제목 일괄 변경 |
| `flagAmbiguousTitles` | 모호 제목을 검토 큐로 추출 |
| `processReviewQueue` | 보류 큐의 keep 항목 SSOT 이관 |
| `refreshSsotCache` | 시트 직접 수정 후 캐시 즉시 무효화 |

---

## 5. 화면·뷰 모드

- **카드 뷰** / **리스트 뷰** 토글 — 우측 상단 segmented control
- 모드 선택은 브라우저에 저장 (다음 방문에도 유지)
- 한 페이지 50건, 페이지네이션
- 검색 / 카테고리(대·소분류) / 형식 / 정렬(최신·인기·조회) 필터
- 자료 카드 클릭·다운로드 시 자동 카운트 → **인기 자료 TOP 8** 메인 노출

### 디자인
- **Microsoft Fluent 2 Design System** (https://fluent2.microsoft.design)
- Fluent UI System Icons (이모지 미사용)
- 다크모드 자동 대응

---

## 6. 비용 / 보안

| 항목 | 상태 |
|---|---|
| 인프라 비용 | **0원** (Google Workspace 무료 + Gemini API 무료 등급) |
| AI 호출 한도 | 일 1,500건 (자료실 등록량 대비 충분) |
| API 키 | Apps Script Script Properties에만 저장 (코드·문서 노출 X) |
| 시트 접근 | 운영팀 공용 계정으로 OAuth 1회 동의 |
| 멤버 접근 | `ANYONE_ANONYMOUS` (URL 만 알면 접근, 추가 인증 없음) |

---

## 7. 다음 단계

- [ ] 운영진 카테고리 담당자 빈칸 채우기 (현 5개 미배정)
- [ ] `_review_queue_` 74건 시의성 검토 → keep/drop 결정
- [ ] `_title_review_` 모호 제목 운영팀 보강
- [ ] macbee-document 13건 Drive 업로드 → `importMacbeDocs`
- [ ] 카톡방 단축 URL 공지 (예: `bit.ly/macbe-archive`)
- [ ] 자료 ~5,000건 도달 시 Supabase + 자체 웹 마이그레이션 검토 (회의록 Phase 2)

---

## 8. 문의

- 시스템·코드: 안재찬 (운영팀)
- 검토·등록: 운영팀 5명 (서지연·임종헌·김다슬·박사랑·정라현)
- 정비팀 (전용구 팀장) ↔ 운영팀 인계 시점에 협의
- 구독서비스팀 (이종석 팀장) — 2026 상반기 유료 런칭 준비
