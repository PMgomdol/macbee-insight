#!/usr/bin/env python3
"""0건 검색어 리포트 — PostHog search_results 이벤트 기반.

검색했지만 결과가 없었던 질의를 집계한다. 동의어 사전 보강 또는
자료 수집 우선순위의 근거 데이터.

사용:
    POSTHOG_PAT=<personal api key> python3 scripts/zero_search_report.py [days]
    (또는 ~/.macbe/posthog_pat.txt 에 키 저장)
"""
import json
import os
import sys
import urllib.request

PROJECT_ID = 498450
HOST = 'https://us.posthog.com'


def get_pat() -> str:
    if os.environ.get('POSTHOG_PAT'):
        return os.environ['POSTHOG_PAT'].strip()
    p = os.path.expanduser('~/.macbe/posthog_pat.txt')
    if os.path.exists(p):
        return open(p).read().strip()
    sys.exit('POSTHOG_PAT env 또는 ~/.macbe/posthog_pat.txt 필요')


def query(pat: str, days: int):
    body = json.dumps({
        'query': {
            'kind': 'HogQLQuery',
            'query': f"""
                select properties.query as q,
                       count() as searches,
                       countIf(properties.fallback != 'none') as fallback_hits
                from events
                where event = 'search_results'
                  and toInt(coalesce(properties.count, '0')) = 0
                  and timestamp > now() - interval {days} day
                group by q
                order by searches desc
                limit 50
            """,
        }
    }).encode()
    req = urllib.request.Request(
        f'{HOST}/api/projects/{PROJECT_ID}/query/',
        data=body,
        headers={'Authorization': f'Bearer {pat}', 'Content-Type': 'application/json'},
    )
    return json.load(urllib.request.urlopen(req))


def main():
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    res = query(get_pat(), days)
    rows = res.get('results', [])
    print(f'최근 {days}일 — 결과 0건 검색어 {len(rows)}종\n')
    if not rows:
        print('없음 (수집 시작 전이거나 전부 결과 있음)')
        return
    print(f'{"검색어":<30} {"횟수":>4}')
    for q, n, _fb in rows:
        print(f'{str(q):<30} {n:>4}')
    print('\n→ 활용: 동의어 사전(web/lib/synonyms.ts) 보강 또는 자료 수집 우선순위')


if __name__ == '__main__':
    main()
