# 어드민 지표 대시보드 재설계

- 작성일: 2026-08-19
- 대상: `web/app/admin-mb26/panel/dashboard/`
- 상태: 설계 승인 대기 → 구현 계획(writing-plans)

## 배경 / 문제

현재 대시보드는 PostHog 공유 대시보드 3개를 iframe으로 임베드한 것뿐이다
([DashboardTabs.tsx](../../../web/app/admin-mb26/panel/dashboard/DashboardTabs.tsx)).
문제:

- iframe은 **보는 사람의 PostHog 로그인**으로 인증됨 → 우리 서버가 데이터를 소유·가공하지 못함.
- 보기 불편하고(전체화면 임베드), 운영에 필요한 지표만 골라 볼 수 없음.
- 홈·다른 어드민 화면이 이미 보여주는 현재 상태 카운트와 관점이 다른, **유입·전환·추이** 지표가 부재.

목표: 운영에 필요한 지표만 **서버가 직접 데이터를 꺼내** 커스텀 대시보드로 보여준다.
실시간이 어려운 외부 소스는 1시간 주기 캐시.

**스코프 확장(2026-08-19):** 이 사이트를 PM 포트폴리오로 활용한다. 지표를
운영용으로 보는 것에 더해, **구축(0→1)→성장의 반복(가설→실험→측정→학습)** 과정을
서사로 담는 **케이스 스터디 페이지**를 별도 화면으로 만든다. 두 화면(어드민 대시보드 ·
케이스 스터디)은 **동일한 메트릭 레이어를 공유**한다. 아래 §"PM 성과 지표",
§"PM 성과·실험 레이어" 참조.

## 중복 제거 원칙 (이미 노출 중인 것 = 대시보드에서 제외)

아래는 이미 다른 화면이 보여주므로 대시보드에서 **반복하지 않는다**:

- 홈: 대기 제안 수 · 미처리 VOC · 진행 백로그 · 운영진 신청 · 운영진 수
- requests: 대기 건수 · 승인 X/2
- archive: 공개/숨김/삭제/전체 건수
- feedback: 미처리/높음/전체 + 컬럼별 건수
- backlog: 진행/높음/전체 + 컬럼별 건수
- categories: 카테고리별 자료 건수

대시보드는 **추이·유입·전환**(스냅샷이 아닌 흐름/행동)만 담당한다.

## 소스별 역할 분담

layout.tsx 주석에 이미 명시된 분담("GA4 = 유입 채널, PostHog = 행동 이벤트")을 그대로 따른다.

| 소스 | 담당 지표 | 접근 방식 | 갱신 |
|---|---|---|---|
| **Supabase** | 조회수·다운로드 추이, 인기/다운로드 Top, 신규 등록 추이, 제안·VOC 처리량/소요시간 | 기존 admin client 직접 쿼리 | 실시간(페이지 로드마다) |
| **PostHog** | 사이트 검색어·무결과 검색어, 필터 사용, 전환 퍼널, 카드 클릭 Top | HogQL Query API (`POST /api/projects/:id/query`) | 1시간 캐시 |
| **GA4** | 방문자·세션 추이, 채널 그룹, 신규vs재방문, 디바이스, 지역, 평균 참여시간 | GA Data API (`runReport`) | 1시간 캐시 |

### 수집(연결됨) vs 읽기(신규 자격 필요)

두 도구 모두 **수집 방향**은 이미 연결돼 데이터가 쌓이고 있으나, 서버가 **읽어오는** 자격은 없다.

- PostHog: 수집 `NEXT_PUBLIC_POSTHOG_KEY`(있음) ↔ 읽기 **Personal API Key**(신규 필요)
- GA4: 수집 gtag `G-LT2K006JPF`(있음) ↔ 읽기 **서비스 계정 + 속성 ID**(신규 필요)

## 아키텍처 (Approach A — 섹션별 서버 컴포넌트 + Next 캐시)

각 지표 블록 = 자기 소스를 fetch 하는 async Server Component, 개별 `<Suspense>`로 감싼다.

- 외부 소스(PostHog/GA) fetch는 `unstable_cache`(tag+revalidate 3600)로 감싸 1시간 캐시.
  → 이 1시간이 곧 요구된 "주기 갱신". Next 16 `cacheComponents` 환경에서
  동적 데이터가 프리렌더를 깨지 않도록 반드시 `<Suspense>` 안에 둔다
  (홈 `PopularCarousel` 선례, [phase-2 메모] 참고).
- Supabase 블록은 캐시 없이 실시간(admin client, `cookies()` 불필요하므로 문제 없음).
- **새 테이블·크론·스토리지 없음.** GA/PostHog가 이미 이력을 보관하므로 스냅샷 적재 불필요.

대안 B(크론→Supabase 스냅샷 테이블)와 C(클라이언트 프록시)는 저트래픽 내부 페이지에
과하여 기각. 근거는 위 "새 실패지점 추가 회피".

### 그레이스풀 디그레이데이션

PostHog/GA 자격이 아직 없으면 해당 탭/블록은 **"연동 필요" 빈 상태**를 렌더(에러 아님).
자격이 env에 채워지면 자동으로 데이터가 뜬다. → 0단계는 자격 없이 출시 가능.

## 탭 구성 (iframe 3개 → 커스텀 3탭)

기존 `@atlaskit/tabs` 유지. 탭 라벨/순서만 재정의.

### 탭 1. 콘텐츠 성과 (Supabase · 실시간) — **0단계, 자격 불필요**

- 조회수 추이: `view_event.viewed_at` 일별 집계 (최근 7/30일 토글)
- 인기 자료 Top 10: 기간 내 `view_event` count by `item_id` (제목 join)
- 다운로드 Top / 총 다운로드: `archive_item.downloads`
- 신규 자료 등록 추이: `archive_item.registered_at` 일별
- 제안 처리량 & 승인 소요시간: `staging_proposal` proposed_at/reviewed_at (일별 승인/거절/중복, 평균 승인 소요)
- VOC 유입 추이 & 해결 소요시간: `feedback` submitted_at/answered_at, kind별

### 탭 2. 행동·전환 (PostHog · 1h 캐시) — **1단계**

- 검색어 Top: `search_submit` 이벤트 query 프로퍼티 집계
- **무결과 검색어**: `search_results` where results=0 → 수급 우선순위 리스트
- 필터 사용 분포: `filter_change` 이벤트 (카테고리/형식별)
- 전환 퍼널: 방문 → `search_submit` → 카드 클릭 / 방문 → 제안(submit) 도달
- 카드 클릭 Top: 클릭 이벤트 상위 자료

### 탭 3. 유입 (GA4 · 1h 캐시) — **2단계**

- 방문자·세션 추이 (일별)
- 채널 그룹: `sessionDefaultChannelGroup` (Organic/Direct/Referral/Social)
- 신규 vs 재방문: `newVsReturning`
- 디바이스: `deviceCategory`
- 지역: `country` / `city` 상위
- 평균 참여시간: `averageSessionDuration` / `engagementRate`

## 발급 필요 자격 (사용자 작업, 각 ~5분)

구현 계획 착수 전/1·2단계 진입 전에 사용자가 발급 → env 등록.

### PostHog Personal API Key (1단계)

1. PostHog → 우측 상단 계정 → Settings → **Personal API keys** → New key.
2. Scope: `query:read` (또는 project read) 최소 권한.
3. 프로젝트 ID는 임베드 URL에서 이미 확인됨: **498450**.
4. env 추가: `POSTHOG_PROJECT_ID=498450`, `POSTHOG_PERSONAL_API_KEY=phx_...`
   (수집 호스트는 `us.posthog.com`).

### GA4 서비스 계정 (2단계)

1. Google Cloud Console → 서비스 계정 생성 → JSON 키 발급.
2. GA4 관리 → 속성 → 속성 액세스 관리 → 서비스 계정 이메일을 **뷰어**로 추가.
3. **속성 ID(숫자)** 확인: GA4 관리 → 속성 세부정보 (측정 ID `G-...`와 다름).
4. env 추가: `GA_PROPERTY_ID=xxxxxxxxx`,
   `GA_SERVICE_ACCOUNT_JSON=<JSON 문자열 또는 base64>`.
5. 의존성: `@google-analytics/data` (GA Data API 클라이언트).

> 계정 규칙: 모든 자격은 asa067714@gmail.com 계정 기준으로 발급.

## 단계 계획

- **0단계 (지금, 자격 0):** 대시보드 셸을 iframe에서 커스텀으로 교체 + 탭1(콘텐츠 성과) 완성.
  탭2·3은 "연동 필요" 빈 상태. iframe 최소 1개 제거로 즉시 체감 개선.
  **+ `download_event` 계측 즉시 심기**(소급 불가라 최우선).
- **1단계 (PostHog 키 후):** 탭2(행동·전환) + PostHog 성과 지표(리텐션·활성화·검색성공).
- **2단계 (GA 서비스 계정 후):** 탭3(유입) 구현 + `@google-analytics/data` 추가.
- **3단계 (케이스 스터디):** `lib/experiments.ts` + `/story` 페이지. 공유 메트릭 레이어와
  릴리즈 오버레이 재사용. 초안은 git·changelog에서 재구성, 가설·학습은 PM 확정.
  (1·2단계 지표가 있을수록 풍부해지므로 그 뒤 또는 병행.)

## PM 성과 지표 (North Star + 지표 트리)

운영 지표와 별개로, 제품 성과를 증명하는 지표군. 어드민 대시보드 탭2/탭3의
"성과" 하위 섹션 + 케이스 스터디에서 함께 소비한다. `[SB]`Supabase `[PH]`PostHog
`[GA]`GA4 `[신규]`계측 추가.

- **North Star: 주간 "자료를 찾아 실제로 연 기획자 수"** `[PH]` — WAU 중 검색/클릭으로
  자료에 도달한 사용자. 단순 방문이 아닌 가치 획득을 측정.
- **Activation**: 신규 방문 첫 세션 검색/클릭 활성화율, first value 도달 시간 `[PH]`
- **Retention**: WAU/MAU 스티키니스, **코호트 리텐션 곡선** `[PH 네이티브]`, 재방문 비중 `[GA]`
- **검색 성공률**: 검색→세션 내 클릭 전환율 `[PH 퍼널]` · 무결과 검색률 추이 `[PH]` ·
  검색 재시도 횟수 `[PH]`
- **기여**: 멤버 제안율(활성 사용자 대비), 제안 승인율/품질 `[SB+PH]`
- **콘텐츠·품질**: 공급 성장 곡선 `[SB]`, 자료당 조회/클릭/다운로드 `[SB]`,
  깨진 링크율 추이 `[SB]`, 롱테일 소비율 `[SB]`
- **임팩트 서사**: 인프라 비용 $0 유지, Before/After(시트→아카이브)

### 계측 공백 (지금 안 심으면 소급 불가 → 우선 처리)

- **다운로드 시점 로그 없음**: `archive_item.downloads`는 누적 카운터뿐 →
  `view_event`처럼 **`download_event` 테이블 신규** `[신규]`. 추이·성과 증명에 필요하고
  지금부터 심어야 데이터가 쌓임.
- **`filter_change` 로컬 싱크 없음**: PostHog 클라우드 발화 여부 검증 필요 `[확인]`.
- **명시적 "검색 성공" 이벤트 없음**: 세션 시퀀스로 파생(PostHog 퍼널)하거나 클릭에
  `from_search` 속성 추가 `[선택 계측]`.
- `view_event`에 세션/유저 id 없음 → 사람 단위 리텐션은 PostHog/GA에 의존(설계상 이미 그러함).

## PM 성과·실험 레이어 — 케이스 스터디 페이지

포폴 딥다이브 1장. 어드민이 아닌 **noindex 공유 링크 단일 페이지**(가칭 `/story`).
라이브 지표를 끌어다 쓰되 **서사로 프레이밍**한다. 라이브 제품은 그대로 두고,
이력서에 붙일 공유 가능한 케이스 스터디를 확보.

### 실험 로그 데이터 모델 (`lib/experiments.ts` — changelog 패턴)

사용자(PM)가 큐레이션하는 **정적 파일**. 사용자 생성 데이터가 아니라 저자 서사이므로
DB 불필요 — [lib/changelog.ts](../../../web/lib/changelog.ts)와 동일한 정적 배열 패턴.

```
Experiment {
  date, title, stage: 'build' | 'growth',
  observation,   // 트리거 지표: "무결과 검색 32%"
  hypothesis,    // "동의어 사전 추가하면 무결과율↓"
  changeRef,     // changelog 릴리즈 연결 (무엇을 배포했나)
  metric: { name, before, after, window },  // 예측 vs 실제
  result: 'confirmed' | 'refuted' | 'mixed' | 'ongoing',
  learning,      // "…, 다음 가설"
}
```

초안은 git 히스토리 + [changelog](../../../web/lib/changelog.ts)에서 "무엇을 배포했나"를
재구성해 채우고, **가설·학습·before/after 수치는 PM이 확정**한다.

### 페이지 구조

1. **문제/맥락**: 지저분한 공유 시트, 8천명 커뮤니티. 리서치([설문 응답 xlsx], 톡방 마이닝).
2. **솔루션 & 런칭**: 아키텍처 한 컷, 런칭 시점 = 베이스라인.
3. **실험 타임라인**: `experiments.ts`를 build→growth 순으로 렌더 —
   각 카드에 관측/가설/변경/예측vs실제/결과/학습.
4. **라이브 지표**: NSM·리텐션·검색성공 추이 차트(대시보드와 공유 컴포넌트), **릴리즈 오버레이**
   (배포 시점 세로선)로 인과 시각화.
5. **임팩트 요약**: 비용 $0, 공급 성장, 검색성공 개선 등 핵심 수치.

### 공유 메트릭 레이어 재사용

`lib/metrics/*`(Supabase/PostHog/GA fetcher)와 차트 컴포넌트를 대시보드와 **공유**.
릴리즈 오버레이도 공통 차트 옵션으로 구현해 양쪽에서 재사용.

### 접근/공유

- `robots: { index: false }` (noindex), 추측 불가 경로.
- 로그인 게이트 없이 링크 아는 사람만(포폴 공유용). 민감 운영 데이터는 노출 안 함
  (집계 지표만, 원시 사용자 데이터·이메일 등 제외).

## 차트 / 디자인

- 구현 시 **dataviz 스킬**을 먼저 로드해 차트 색·형식을 맞춘다.
- 색은 디자인 토큰만: `--accent`(#3182F6) 단색 계열, 상태는 semantic 토큰.
  하드코딩·이모지 금지, 아이콘은 lucide, 라운드는 `--r-*` 토큰.
- 지표 타일/카드는 [/design](../../../web/app/design/page.tsx) 레시피(app-card, 알림 박스 등) 재사용.
- 차트 라이브러리: 이미 있는 의존성 우선 검토(없으면 경량 SVG 직접 or 최소 의존성 1개).
  구현 계획 단계에서 확정.

## 파일 (예상)

- 수정: `dashboard/page.tsx`, `dashboard/DashboardTabs.tsx`(→ 커스텀 탭)
- 신규(0단계): `lib/metrics/supabase.ts`(집계 쿼리), 탭1 서버/차트 컴포넌트,
  `download_event` 마이그레이션 + 다운로드 클릭 계측 훅
- 신규(1단계): `lib/metrics/posthog.ts`(HogQL 클라이언트), 탭2 + 성과 섹션
- 신규(2단계): `lib/metrics/ga.ts`(GA Data API 클라이언트), 탭3
- 신규(3단계): `lib/experiments.ts`(실험 로그 정적 데이터), `app/story/page.tsx`(케이스 스터디),
  공유 차트 컴포넌트(릴리즈 오버레이 포함)
- env: `.env.local` + Vercel 환경변수(위 자격들)

## 테스트

- Supabase 집계 함수: 날짜 경계·빈 결과에 대한 단위 검증(assert 기반 self-check 1개).
- PostHog/GA 클라이언트: 자격 미설정 시 빈 상태 반환(throw 아님) 검증.
- 시각 확인: `run` 스킬로 로컬 구동 후 탭1 렌더 확인.

## Non-goals

- 스냅샷 이력 테이블/크론(대안 B) — 미채택.
- 세션 리코딩·개별 사용자 추적 — 범위 밖.
- 대시보드 데이터 export/알림 — 이번 범위 아님(추후 요청 시).
