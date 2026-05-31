"""
로컬 자동 분류 검증 (배포 없이 동작 확인용)

사용법:
    pip install -r requirements.txt
    # Gemini 사용시:
    export GEMINI_API_KEY=AIza...
    python classify.py "https://example.com/article"
    # Gemini 없이 (휴리스틱만):
    python classify.py "https://example.com/article"

목적:
    - Apps Script로 가기 전에 자동 분류 품질 빠르게 검증
    - 동일한 프롬프트/카테고리 정의를 사용하므로 결과가 운영 환경과 거의 동일
"""

import os
import sys
import json
import re
import urllib.request
import urllib.error

CATEGORY_HINT = {
    "면접/채용/이직": ["경력직 채용", "면접 준비", "AI 면접", "디자인 에이전시", "자기소개서"],
    "기획/PM": ["포트폴리오", "문서 작성", "프로세스"],
    "UX/디자인": ["UI 패턴", "리서치"],
    "개발/기술": ["협업 도구"],
    "커리어": ["이직", "성장"],
}
FORMATS = ["아티클", "영상", "기획서", "가이드", "템플릿", "세미나"]


def fetch_html(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; MacbeArchiveBot/1.0)",
            "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="replace")


def extract_meta(html):
    def find(pattern):
        m = re.search(pattern, html, re.IGNORECASE)
        return m.group(1) if m else ""

    title = (
        find(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']')
        or find(r"<title[^>]*>([^<]+)</title>")
    )
    desc = (
        find(r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']')
        or find(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']')
    )
    pub = find(r'<meta[^>]+property=["\']article:published_time["\'][^>]+content=["\']([^"\']+)["\']')

    body = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    body = re.sub(r"<style[\s\S]*?</style>", " ", body, flags=re.IGNORECASE)
    body = re.sub(r"<[^>]+>", " ", body)
    body = re.sub(r"\s+", " ", body).strip()[:2000]

    def decode_entities(s):
        return (
            s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
            .replace("&quot;", '"').replace("&#39;", "'").replace("&nbsp;", " ")
        )

    return {
        "title": decode_entities(title.strip()),
        "description": decode_entities(desc.strip()),
        "publishedAt": pub.strip(),
        "bodyText": body,
    }


def build_prompt(url, meta):
    cat_lines = "\n".join(f"  - {k}: {', '.join(v)}" for k, v in CATEGORY_HINT.items())
    return f"""당신은 IT 기획·PM·UX 자료실의 큐레이터입니다.
주어진 자료를 분석해 아래 JSON 스키마로만 응답하세요. 설명 금지.

스키마:
{{
  "title": "원문 제목 (없으면 핵심을 한 줄로 요약)",
  "summary": "한 줄 설명 (40자 이내, 명사형으로 끝맺음)",
  "mainCategory": "대분류 1개",
  "subCategory": "소분류 1개",
  "tags": ["태그1", "태그2", "태그3"],
  "format": "아티클|영상|기획서|가이드|템플릿|세미나"
}}

대분류·소분류 후보 (가장 가까운 것 매칭, 매우 애매하면 mainCategory="미분류"):
{cat_lines}

태그 규칙: 3~5개. 직무/주제/대상을 섞어 검색에 도움되도록.
format 규칙: 영상 플랫폼(youtube 등)이면 "영상", PDF/PPT 다운로드형이면 "기획서" 또는 "가이드", 일반 블로그/뉴스면 "아티클".

[입력]
URL: {url}
제목: {meta['title'] or '(없음)'}
설명: {meta['description'] or '(없음)'}
본문 발췌: {meta['bodyText'][:1500]}"""


def call_gemini(api_key, prompt):
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
    }
    req = urllib.request.Request(
        endpoint,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        j = json.loads(resp.read().decode("utf-8"))
    text = j["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text)


def heuristic_classify(url, meta):
    text = (meta["title"] + " " + meta["description"] + " " + meta["bodyText"]).lower()
    u = url.lower()

    fmt = "아티클"
    if re.search(r"youtube|youtu\.be|vimeo", u):
        fmt = "영상"
    elif u.endswith(".pdf"):
        fmt = "가이드"
    elif re.search(r"\.(ppt|pptx|key)$", u):
        fmt = "기획서"

    rules = [
        (["ai 면접", "ai interview"], "면접/채용/이직", "AI 면접"),
        (["면접", "interview", "경력직"], "면접/채용/이직", "면접 준비"),
        (["이력서", "resume"], "면접/채용/이직", "자기소개서"),
        (["포트폴리오", "portfolio"], "기획/PM", "포트폴리오"),
        (["기획서", "스펙", "prd", "요구사항"], "기획/PM", "문서 작성"),
        (["프로세스", "방법론", "methodology"], "기획/PM", "프로세스"),
        (["ui ", "ui/", "ui 패턴", "design system"], "UX/디자인", "UI 패턴"),
        (["리서치", "research", "사용자 조사"], "UX/디자인", "리서치"),
        (["협업", "collaboration", "jira", "figma"], "개발/기술", "협업 도구"),
        (["이직", "커리어", "career"], "커리어", "이직"),
    ]
    main, sub = "미분류", ""
    for kws, m, s in rules:
        if any(k in text for k in kws):
            main, sub = m, s
            break

    return {
        "title": meta["title"][:200],
        "summary": meta["description"][:60],
        "mainCategory": main,
        "subCategory": sub,
        "tags": [],
        "format": fmt,
    }


def classify(url):
    try:
        html = fetch_html(url)
    except urllib.error.URLError as e:
        return {"_error": f"fetch failed: {e}", "url": url}
    meta = extract_meta(html)

    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            ai = call_gemini(api_key, build_prompt(url, meta))
            ai["_aiUsed"] = True
            ai["_meta_title"] = meta["title"]
            return ai
        except Exception as e:
            print(f"[gemini failed, fallback to heuristic] {e}", file=sys.stderr)

    h = heuristic_classify(url, meta)
    h["_aiUsed"] = False
    return h


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: python classify.py <url>")
        sys.exit(1)
    url = sys.argv[1]
    result = classify(url)
    print(json.dumps(result, ensure_ascii=False, indent=2))
