---
name: 자료감사
description: 자료실 전체 자료의 접근 권한을 감사한다. 드라이브·문서·Figma·Notion·네이버카페 링크를 미인증(일반 사용자)으로 접근 테스트해 권한 제한된 자료를 찾는다. "권한요청" VOC나 접근 불가 자료 점검 시 사용.
user-invocable: true
---

# 자료 접근 권한 감사

미인증(로그아웃) 상태 = 일반 사용자 최악 케이스로 접근 테스트. "링크 있는 모든 사용자" 공유가 아닌 자료를 잡는다.

## 절차

1. **전체 URL 수집** — web/.env.local의 SERVICE_ROLE 키로(출력 금지):
   `GET {SUPABASE_URL}/rest/v1/archive_item?select=id,title,kind,file_url,external_url&status=eq.public&limit=1000`
2. **권한제한 위험 도메인만 필터**: drive.google.com · docs.google.com · figma.com · notion.so · cafe.naver.com. (브런치·유튜브·블로그·티스토리 등 공개 플랫폼은 게이트 없음 → 제외. 끊긴 링크는 link-check 크론 담당.)
3. **구글 드라이브·문서** (신뢰도 높음): 로그아웃 fetch 후 `<title>` 판독 —
   - 실제 파일명("○○.pdf - Google Drive") = **접근 가능** ✅
   - 파일명 없이 "액세스 요청"/"Google Drive"/로그인 리다이렉트 = **제한됨** ⚠️ (드라이브는 제한 파일의 이름을 미인증자에게 노출 안 함)
4. **SPA(Figma/Notion/네이버카페)** — 서버 fetch로는 불안정. **헤드리스 WebKit으로 렌더 + 7초 대기** 후 본문 vs 로그인/가입 벽 판별:
   - Figma `community/file/` = 공개 안전. 일반 `/file/`만 확인.
   - Notion: 7초 기다리면 본문 렌더됨('로그인/가입'은 댓글 프롬프트일 뿐). 빈 화면이면 더 대기.
   - 네이버카페: **짧은 모바일 URL `m.cafe.naver.com/{카페명}/{글번호}`**로 접속 → 본문 렌더되면 공개, `nid.naver.com/nidlogin`으로 튕기면 로그인 필요.
5. **보고**: 제한/깨진 자료를 `#id · 제목 · URL · 사유`로. **성급히 단정 금지**(과거 오탐 많았음 — 모바일 URL 형식 오류 등). 애매하면 재확인. [[feedback_link_liveness]]

## 처리
- 남의 드라이브/카페 권한은 우리가 못 바꿈 → 삭제 / 공개 대체자료로 교체 / 유지+안내 중 **운영진 결정**. 승인 없이 자료 삭제 금지.
- VOC 연계면 feedback 테이블에 히스토리·조치 기록 후 status='closed'.

배경: 2026-09-03 감사(673건 중 권한제한위험 124건 검사 → 실제 제한은 극소수). 도구·경로는 uxui-qa 헤드리스 방식 재사용.
