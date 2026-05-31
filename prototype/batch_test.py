"""sample_urls.txt 의 URL 들을 일괄 분류해서 결과를 보여줍니다."""
import json
from classify import classify

with open("sample_urls.txt") as f:
    urls = [u.strip() for u in f if u.strip() and not u.startswith("#")]

print(f"=== 일괄 자동 분류 ({len(urls)}건) ===\n")
for i, url in enumerate(urls, 1):
    print(f"[{i}] {url}")
    try:
        r = classify(url)
        if "_error" in r:
            print(f"  ERROR: {r['_error']}\n")
            continue
        print(f"  제목  : {r.get('title', '')[:80]}")
        print(f"  요약  : {r.get('summary', '')[:80]}")
        print(f"  분류  : {r.get('mainCategory', '')} > {r.get('subCategory', '')}")
        print(f"  태그  : {', '.join(r.get('tags', []))}")
        print(f"  형식  : {r.get('format', '')}")
        print(f"  AI?   : {'✓' if r.get('_aiUsed') else '✗ (heuristic)'}")
        print()
    except Exception as e:
        print(f"  ERROR: {e}\n")
