#!/usr/bin/env python3
"""
자료 등록 이벤트(2026-10) 대시보드 — 구글 시트 생성/갱신.

- SSOT는 Supabase. 이 스크립트는 읽기 전용으로 승인(공개)된 이벤트 기간 자료를 떠서 시트에 반영.
- '자료 상세' 탭: 승인 자료 1건 = 1행. 기본점수(링크1/문서2)·유형·중복의심은 자동, 가산점(희소성/실무형)은 운영진이 수동 입력.
  → 재실행 시 '새 id만 추가'라 수동 입력 가산점이 보존된다(idempotent-append).
- '참가자 순위' 탭: '자료 상세'를 QUERY로 자동 집계(등록자별 승인수·총점, 총점 내림차순). 가산점 바꾸면 순위 자동 갱신.
- 첫 실행: 시트를 새로 만들고 asa067714@gmail.com 에게 편집 공유 후 URL/ID 출력. ID는 ~/.macbe/event_sheet_id.txt 에 저장해 재사용.

실행:  cd web && python3 scripts/event_leaderboard.py [--dry]
필요:  web/.env.local (SUPABASE URL/KEY) + gspread 서비스계정 키(SHEETS_SA)

집계 규칙(초안 기준):
  - 승인(status=public) & registered_at ∈ [2026-10-01, 2026-11-01) KST 만 집계 → 반려/중복반려는 자동 제외(0점).
  - 링크 자료=1점, 문서/파일 자료=2점(파일 첨부·파일확장자·드라이브/구글문서 링크).
  - 가산점: 희소성 +1, 실무형 +2 → 운영진이 시트에서 수동. 행점수=기본+가산(시트 수식).
"""
import os, sys, json, re, urllib.request
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from datetime import datetime, timezone, timedelta

DRY = '--dry' in sys.argv
KST = timezone(timedelta(hours=9))
EVENT_START = datetime(2026, 10, 1, 0, 0, tzinfo=KST)
EVENT_END = datetime(2026, 11, 1, 0, 0, tzinfo=KST)  # 상한 미포함
SHEETS_SA = os.environ.get('SHEETS_SA', '/Users/duotne/.macbe/sheets_sa.json')
# 운영 미러 시트(사용자 소유·SA 편집공유)에 이벤트 전용 탭만 추가한다. supabase_to_sheet.py 와 동일 시트.
SHEET_ID = os.environ.get('EVENT_SHEET_ID', '1vAn3ufrdf2qDjiRGf82S5096cZ7v1cIUnrTAkZBeqWM')
DETAIL_TAB = '이벤트 자료 상세'
RANK_TAB = '이벤트 참가자 순위'


def _load_env_local():
    p = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    e = {}
    if os.path.exists(p):
        with open(p, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                k, v = line.split('=', 1)
                e[k.strip()] = v.strip().strip('"').strip("'")
    return e


_local = _load_env_local()
SB_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or _local.get('NEXT_PUBLIC_SUPABASE_URL')
SB_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or _local.get('SUPABASE_SERVICE_ROLE_KEY')
if not SB_URL or not SB_KEY:
    sys.exit('환경변수/.env.local 에서 SUPABASE URL/KEY 를 찾지 못했습니다.')
H = {'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY}

DOC_EXT = re.compile(r'\.(pdf|docx?|pptx?|xlsx?|hwpx?|csv|zip|key|odt|ods|odp)($|[?#])', re.I)
DOC_URL = re.compile(r'drive\.google\.com|docs\.google\.com', re.I)


_TRACK = {'fbclid', 'gclid', 'igshid', 'spm', 'ref'}


def norm_url(u):
    """중복 판정용 URL 정규화 — 추적 파라미터 제거 + 소문자 + 뒤 슬래시 정리. (파라미터 순서 무관 일관성)"""
    if not u:
        return ''
    u = u.strip().lower()
    try:
        s = urlsplit(u)
        q = [(k, v) for k, v in parse_qsl(s.query, keep_blank_values=True)
             if not (k.startswith('utm_') or k in _TRACK)]
        return urlunsplit((s.scheme, s.netloc, s.path.rstrip('/'), urlencode(q), ''))
    except Exception:
        return u.rstrip('/')


def is_doc(it):
    if it.get('file_url') or it.get('file_ext'):
        return True
    u = (it.get('external_url') or '')
    return bool(DOC_URL.search(u) or DOC_EXT.search(u))


def fetch_event_items():
    lo = EVENT_START.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    hi = EVENT_END.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    cols = 'id,title,proposer,external_url,file_url,file_ext,kind,registered_at'
    rows, off = [], 0
    while True:
        url = (f'{SB_URL}/rest/v1/archive_item?select={cols}&status=eq.public'
               f'&registered_at=gte.{lo}&registered_at=lt.{hi}&order=registered_at.asc&limit=1000&offset={off}')
        d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=60))
        rows += d
        if len(d) < 1000:
            break
        off += 1000
    # staging_proposal 에서 이메일 매핑(승인 시 아카이브로 넘어오며 email 컬럼은 없어서 별도 조인)
    email_by = {}
    try:
        purl = f'{SB_URL}/rest/v1/staging_proposal?select=title,proposer,proposer_email&limit=5000'
        for p in json.load(urllib.request.urlopen(urllib.request.Request(purl, headers=H), timeout=60)):
            key = (p.get('title') or '').strip()
            if key and p.get('proposer_email'):
                email_by[key] = p['proposer_email']
    except Exception:
        pass
    return rows, email_by


def build_rows(items, email_by):
    norm_counts = {}
    for it in items:
        n = norm_url(it.get('file_url') or it.get('external_url'))
        if n:
            norm_counts[n] = norm_counts.get(n, 0) + 1
    out = []
    for it in items:
        raw = it.get('file_url') or it.get('external_url') or ''
        n = norm_url(raw)
        doc = is_doc(it)
        d = it.get('registered_at', '')[:10]
        out.append({
            'id': it['id'],
            'date': d,
            'name': (it.get('proposer') or '').strip() or '(미기재)',
            'email': email_by.get((it.get('title') or '').strip(), ''),
            'title': it.get('title') or '',
            'type': '문서' if doc else '링크',
            'base': 2 if doc else 1,
            'url': raw,
            'dup': (norm_counts.get(n, 0) > 1),
        })
    return out


def gs_client():
    import gspread
    saj = os.environ.get('SHEETS_SA_JSON')
    if saj:
        return gspread.service_account_from_dict(json.loads(saj))
    return gspread.service_account(filename=SHEETS_SA)


DETAIL_HEADER = ['id', '등록일', '등록자', '이메일', '제목', '유형', '기본점수', '희소성(+1)', '실무형(+2)', '행점수', 'URL', '중복의심']
RANK_QUERY = (
    "=IFERROR(QUERY('" + DETAIL_TAB + "'!A2:L, "
    "\"select C, count(A), sum(J) where A is not null group by C order by sum(J) desc "
    "label C '등록자', count(A) '승인 자료수', sum(J) '총점'\", 0), "
    "\"아직 등록된 자료가 없어요 (10월 시작 후 자동 집계)\")"
)


def ensure_structure(sh):
    """이벤트 전용 탭/헤더/집계수식 보장 (idempotent). 운영 시트의 기존 탭은 절대 건드리지 않고 이벤트 탭만 추가/보정."""
    titles = [w.title for w in sh.worksheets()]
    if DETAIL_TAB not in titles:
        sh.add_worksheet(title=DETAIL_TAB, rows=1000, cols=12)
    ws = sh.worksheet(DETAIL_TAB)
    if (ws.acell('A1').value or '') != 'id':
        ws.update([DETAIL_HEADER], 'A1')
        ws.format('A1:L1', {'textFormat': {'bold': True}})
        ws.freeze(rows=1)
    if RANK_TAB not in [w.title for w in sh.worksheets()]:
        rk = sh.add_worksheet(title=RANK_TAB, rows=200, cols=6)
        rk.update_acell('A1', RANK_QUERY)
        rk.format('A1:C1', {'textFormat': {'bold': True}})
    return sh


def get_sheet(gc):
    sh = gc.open_by_key(SHEET_ID)
    ensure_structure(sh)
    return sh


def main():
    items, email_by = fetch_event_items()
    rows = build_rows(items, email_by)
    print(f'이벤트 기간 승인 자료: {len(rows)}건 (등록자 {len({r["name"] for r in rows})}명)')
    if DRY:
        for r in rows[:20]:
            print(f'  #{r["id"]} [{r["type"]}{r["base"]}] {r["name"]} · {r["title"][:30]}{" ⚠중복" if r["dup"] else ""}')
        print('--dry: 시트 기록 생략')
        return

    gc = gs_client()
    sh = get_sheet(gc)
    ws = sh.worksheet(DETAIL_TAB)
    existing = set()
    for v in ws.col_values(1)[1:]:  # A열, 헤더 제외
        if v.strip().isdigit():
            existing.add(int(v))
    new = [r for r in rows if r['id'] not in existing]
    if new:
        start = len(ws.col_values(1)) + 1  # 다음 빈 행
        matrix = []
        for i, r in enumerate(new):
            rr = start + i
            matrix.append([
                r['id'], r['date'], r['name'], r['email'], r['title'], r['type'], r['base'],
                '', '',  # 희소성/실무형 = 수동
                f'=IF($A{rr}="","",N($G{rr})+N($H{rr})+N($I{rr}))',
                r['url'], 'TRUE' if r['dup'] else 'FALSE',
            ])
        ws.update(matrix, f'A{start}', value_input_option='USER_ENTERED')
    print(f'새로 추가된 자료: {len(new)}건 / 기존 {len(existing)}건')
    print(f'탭: [{DETAIL_TAB}] [{RANK_TAB}]')
    print(f'시트: https://docs.google.com/spreadsheets/d/{sh.id}/edit')


def _selftest():
    assert is_doc({'file_url': 'https://x/y.pdf'}) is True
    assert is_doc({'file_ext': 'PDF'}) is True
    assert is_doc({'external_url': 'https://drive.google.com/file/d/abc/view'}) is True
    assert is_doc({'external_url': 'https://a.com/report.pptx'}) is True
    assert is_doc({'external_url': 'https://brunch.co.kr/@x/1'}) is False  # 아티클=링크
    assert norm_url('https://A.com/p/?utm_source=k&x=1') == 'https://a.com/p?x=1'
    assert norm_url('https://a.com/p') == norm_url('https://a.com/p/')
    assert norm_url('https://a.com/p?a=1&utm_medium=x') == norm_url('https://a.com/p?a=1')
    print('selftest OK')


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        _selftest()
    else:
        main()
