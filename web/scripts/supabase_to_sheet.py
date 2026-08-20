#!/usr/bin/env python3
"""
Supabase archive_item → 구글 시트 "자료 DB (Supabase 미러)" 단방향 미러.

- SSOT는 Supabase. 이 스크립트는 읽기 전용으로 DB를 떠서 시트 미러 탭을 통째로 덮어쓴다.
- 기존 사람이 쓰는 시트 탭들은 건드리지 않는다(전용 미러 탭만 rewrite).
- 재실행 안전(idempotent): 매번 전체 clear 후 새로 씀 → 항상 최신 스냅샷.

실행:  cd web && python3 scripts/supabase_to_sheet.py [--dry]
필요:  web/.env.local (SUPABASE URL/KEY) + gspread 서비스계정 키(SHEETS_SA)
"""
import os, sys, json, urllib.request
from datetime import datetime, timezone, timedelta

DRY = '--dry' in sys.argv
SHEET_ID = '1vAn3ufrdf2qDjiRGf82S5096cZ7v1cIUnrTAkZBeqWM'
MIRROR_TAB = '자료 DB (Supabase 미러)'
SHEETS_SA = os.environ.get('SHEETS_SA', '/Users/duotne/.macbe/sheets_sa.json')


def _load_env_local():
    """로컬 실행 시 web/.env.local 을 읽어 dict로. CI에선 파일이 없어 빈 dict."""
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


# 자격/URL: 환경변수(CI) 우선, 없으면 .env.local(로컬)
_local = _load_env_local()
SB_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or _local.get('NEXT_PUBLIC_SUPABASE_URL')
SB_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or _local.get('SUPABASE_SERVICE_ROLE_KEY')
if not SB_URL or not SB_KEY:
    sys.exit('환경변수 또는 .env.local에서 SUPABASE URL/KEY를 찾지 못했습니다.')
H = {'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY}


def gspread_client():
    """CI: SHEETS_SA_JSON 환경변수(JSON 문자열). 로컬: SHEETS_SA 파일 경로."""
    import gspread
    saj = os.environ.get('SHEETS_SA_JSON')
    if saj:
        return gspread.service_account_from_dict(json.loads(saj))
    return gspread.service_account(filename=SHEETS_SA)


def fetch_all():
    """archive_item 전량(페이지네이션)."""
    rows, off = [], 0
    cols = 'id,status,main_category,sub_category,title,summary,tags,format,kind,external_url,file_url,views,downloads,published_at,registered_at'
    while True:
        url = f'{SB_URL}/rest/v1/archive_item?select={cols}&order=id.asc&limit=1000&offset={off}'
        d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=60))
        rows += d
        if len(d) < 1000:
            break
        off += 1000
    return rows


STATUS_KO = {'public': '공개', 'hidden': '숨김', 'deleted': '삭제됨'}
KIND_KO = {'files': '양식·템플릿', 'insights': '콘텐츠'}
HEADER = ['No', '상태', '대분류', '소분류', '제목', '한줄설명', '태그', '형식', '메뉴',
          '외부 링크', '파일 링크', '조회수', '다운로드', '발행일', '등록일']


def to_row(r):
    d = lambda v: (v or '')[:10]  # 날짜 앞 10자
    return [
        r.get('id', ''),
        STATUS_KO.get(r.get('status'), r.get('status') or ''),
        r.get('main_category') or '', r.get('sub_category') or '',
        r.get('title') or '', r.get('summary') or '',
        ', '.join(r.get('tags') or []),
        r.get('format') or '', KIND_KO.get(r.get('kind'), r.get('kind') or ''),
        r.get('external_url') or '', r.get('file_url') or '',
        r.get('views', 0) or 0, r.get('downloads', 0) or 0,
        d(r.get('published_at')), d(r.get('registered_at')),
    ]


def main():
    rows = fetch_all()
    kst = timezone(timedelta(hours=9))
    stamp = datetime.now(kst).strftime('%Y-%m-%d %H:%M KST')
    note = [f'⚠️ 이 탭은 Supabase archive_item의 읽기 전용 미러입니다. 직접 수정 금지(다음 동기화 때 덮어써짐). 원본 수정은 어드민 자료 관리에서. · 마지막 동기화: {stamp} · {len(rows)}건']
    values = [note, HEADER] + [to_row(r) for r in rows]

    print(f'archive_item {len(rows)}건 → "{MIRROR_TAB}"')
    if DRY:
        print('[--dry] 시트 미기록. 샘플:', values[2] if len(values) > 2 else None)
        return

    import gspread
    gc = gspread_client()
    sh = gc.open_by_key(SHEET_ID)
    try:
        ws = sh.worksheet(MIRROR_TAB)
    except gspread.WorksheetNotFound:
        ws = sh.add_worksheet(title=MIRROR_TAB, rows=len(values) + 50, cols=len(HEADER))
    ws.clear()
    ws.update(range_name='A1', values=values, value_input_option='RAW')
    print(f'동기화 완료: {len(rows)}건 · {stamp}')


if __name__ == '__main__':
    main()
