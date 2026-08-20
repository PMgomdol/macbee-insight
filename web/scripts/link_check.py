#!/usr/bin/env python3
"""
공개 archive_item 링크 상태 점검 → check_log 테이블에 스냅샷 저장.

보수적 판정(오탐 방지):
- dead : 도메인 소멸(DNS NXDOMAIN) · HTTP 404/410 · soft-404 본문 마커
- ok   : HTTP 200 + 마커 없음, 또는 업로드 파일(file_url)
- unknown : 403·타임아웃·5xx·봇차단 등 애매 (죽음으로 단정 안 함)

check_log 컬럼(고정, DDL 불가): checked_at·target_title(제목)·url·result·note(=archive_item id)
매 실행마다 기존 스냅샷을 지우고 새로 씀(=현재 상태 미러).

실행:  cd web && python3 scripts/link_check.py [--dry] [--limit N]
CI:    GitHub Action에서 env(SUPABASE 키)로 실행 — 샌드박스 DNS 한계 회피
"""
import os, sys, json, re, urllib.request, urllib.parse, ssl, concurrent.futures as cf

DRY = '--dry' in sys.argv
LIMIT = None
if '--limit' in sys.argv:
    LIMIT = int(sys.argv[sys.argv.index('--limit') + 1])

# ---- env: CI(환경변수) 우선, 로컬(.env.local) 폴백 ----
env = {}
p = os.path.join(os.path.dirname(__file__), '..', '.env.local')
if os.path.exists(p):
    for line in open(p, encoding='utf-8'):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1); env[k.strip()] = v.strip().strip('"').strip("'")
URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or env.get('NEXT_PUBLIC_SUPABASE_URL')
KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('SUPABASE_SERVICE_ROLE_KEY')
if not URL or not KEY:
    sys.exit('SUPABASE URL/KEY 없음')
H = {'apikey': KEY, 'Authorization': 'Bearer ' + KEY}
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'
SOFT404 = re.compile(r'(페이지를?\s*찾을\s*수\s*없|삭제된\s*(게시물|글|페이지)|존재하지\s*않는|없는\s*페이지|삭제되었|권한이\s*없거나|잘못된\s*주소|서비스\s*종료|종료된\s*서비스|404\s*(not\s*found|error)|page\s*not\s*found|deleted\s*by\s*author)', re.I)


def unwrap(u):
    u = (u or '').strip()
    try:
        pp = urllib.parse.urlparse(u if u.startswith('http') else 'http://' + u)
        if pp.netloc in ('www.google.com', 'google.com') and pp.path == '/url':
            q = urllib.parse.parse_qs(pp.query).get('q')
            if q: u = q[0]
    except Exception:
        pass
    if '&sa=D' in u: u = u.split('&sa=D')[0]
    return u


def check(item):
    ext = item.get('external_url'); fu = item.get('file_url')
    if not ext and fu:
        return {**item, 'result': 'ok', 'url': fu, 'note_extra': '업로드 파일'}
    url = unwrap(ext or fu or '')
    r = {**item, 'url': url}
    if not url:
        r['result'] = 'unknown'; return r
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'ko,en;q=0.9'}, method='GET')
        with urllib.request.urlopen(req, timeout=15, context=CTX) as resp:
            code = resp.getcode()
            body = resp.read(60000)
            enc = 'utf-8'
            m = re.search(r'charset=([\w-]+)', resp.headers.get('Content-Type', '') or '', re.I)
            if m: enc = m.group(1)
            text = body.decode(enc, 'ignore') if enc else body.decode('utf-8', 'ignore')
            if SOFT404.search(text[:8000]):
                r['result'] = 'dead'; r['note_extra'] = 'soft-404 마커'
            else:
                r['result'] = 'ok'
    except urllib.error.HTTPError as e:
        r['result'] = 'dead' if e.code in (404, 410) else 'unknown'
        r['note_extra'] = f'HTTP {e.code}'
    except urllib.error.URLError as e:
        reason = str(e.reason)
        # DNS NXDOMAIN 계열 → 도메인 소멸(dead), 그 외 네트워크 오류 → unknown(보수적)
        if 'Name or service not known' in reason or 'nodename nor servname' in reason or 'getaddrinfo' in reason:
            r['result'] = 'dead'; r['note_extra'] = 'DNS 소멸'
        else:
            r['result'] = 'unknown'; r['note_extra'] = reason[:30]
    except Exception as e:
        r['result'] = 'unknown'; r['note_extra'] = type(e).__name__
    return r


def main():
    q = 'archive_item?status=eq.public&select=id,title,external_url,file_url&order=id.asc'
    items = json.load(urllib.request.urlopen(urllib.request.Request(URL + '/rest/v1/' + q, headers=H), timeout=60))
    if LIMIT: items = items[:LIMIT]
    print(f'점검 대상 공개 자료: {len(items)}건')

    results = []
    with cf.ThreadPoolExecutor(max_workers=12) as ex:
        for i, r in enumerate(ex.map(check, items), 1):
            results.append(r)
            if i % 50 == 0: print(f'  {i}/{len(items)}')
    from collections import Counter
    dist = Counter(r['result'] for r in results)
    print('판정:', dict(dist))

    if DRY:
        for r in results:
            if r['result'] == 'dead':
                print(f"  DEAD id={r['id']} {r['title'][:30]} | {r.get('note_extra','')} | {r['url'][:50]}")
        return

    hdr = {**H, 'Content-Type': 'application/json'}
    # 기존 스냅샷 삭제(전량) 후 재기록
    d = urllib.request.Request(URL + '/rest/v1/check_log?id=gte.0', headers={**hdr, 'Prefer': 'return=minimal'}, method='DELETE')
    urllib.request.urlopen(d, timeout=60)
    rows = [{'target_title': (r['title'] or '')[:200], 'url': (r['url'] or '')[:500], 'result': r['result'],
             'note': str(r['id'])} for r in results]
    # 배치 삽입 (500개씩)
    for i in range(0, len(rows), 500):
        chunk = rows[i:i + 500]
        ins = urllib.request.Request(URL + '/rest/v1/check_log', headers={**hdr, 'Prefer': 'return=minimal'},
                                     data=json.dumps(chunk).encode(), method='POST')
        urllib.request.urlopen(ins, timeout=60)
    print(f'check_log 스냅샷 기록: {len(rows)}건')


if __name__ == '__main__':
    main()
