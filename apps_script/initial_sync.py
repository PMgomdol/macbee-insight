"""
시트 → Supabase 초기 풀싱크. supabase_sync.gs의 mapping 로직과 동일.

apps_script/supabase_sync.gs의 onEdit·cron 트리거가 등록되기 전 한 번 실행해서
Supabase archive_item / faq를 시트와 일치시킨다.

사용:
  python3 apps_script/initial_sync.py

전제:
  /tmp/.macbe_supabase           SUPABASE_URL / SUPABASE_SECRET
  /tmp/macbe_sheets_sa.json      Sheets 서비스 계정
"""
from __future__ import annotations
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import gspread
from supabase import create_client

SHEET_ID = "1vAn3ufrdf2qDjiRGf82S5096cZ7v1cIUnrTAkZBeqWM"
SSOT_TAB = "자료 DB"
FAQ_TAB = "FAQ"
BATCH = 200


def load_env() -> dict[str, str]:
    raw = Path("/tmp/.macbe_supabase").read_text().strip()
    return {l.split("=", 1)[0]: l.split("=", 1)[1].strip() for l in raw.splitlines() if "=" in l}


def to_iso_date(v) -> str | None:
    if not v:
        return None
    s = str(v).strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        return s
    m = re.match(r"^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?", s)
    if m:
        return f"{m.group(1)}-{m.group(2) or '01'}-{m.group(3) or '01'}"
    return None


def to_iso_ts(v) -> str | None:
    if not v:
        return None
    s = str(v).strip()
    if not s:
        return None
    for fmt in (
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y. %m. %d %H:%M:%S",
        "%Y. %m. %d",
        "%Y-%m-%d",
    ):
        try:
            dt = datetime.strptime(s, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.isoformat()
        except ValueError:
            continue
    return None


def map_sheet_status(s) -> str:
    if not s:
        return "public"
    v = str(s).strip()
    if v in ("점검필요", "broken"):
        return "hidden"
    if v in ("hidden", "public", "pending"):
        return v
    return "public"


def infer_kind(ext: str, file_link: str, fmt: str | None) -> str:
    if file_link:
        return "files"
    if fmt in ("템플릿", "기획서"):
        return "files"
    return "insights"


def map_ssot_row(row: list) -> dict | None:
    # 컬럼: No, 대분류, 소분류, 태그, 자료 제목, 보조설명, 외부 링크, 파일 링크,
    # 자료 형식, 발행일, 등록일, 등록자, 상태, 마지막 점검일, 카테고리 담당,
    # 노출 등급, 비고, 조회수, 다운로드수
    if len(row) < 19:
        row = row + [""] * (19 - len(row))
    no, main, sub, tags, title, summary, ext_url, file_link, fmt, pub_at, reg_at, proposer, status, last_chk, owner, grade, notes, views, downloads = row[:19]
    if not no or not title:
        return None
    try:
        no_int = int(str(no).strip())
    except (ValueError, TypeError):
        return None
    ext_url = str(ext_url).strip() if ext_url else ""
    file_link = str(file_link).strip() if file_link else ""
    tags_list = [t.strip() for t in str(tags).split(",") if t.strip()] if tags else []
    return {
        "id": no_int,
        "main_category": str(main or "미분류"),
        "sub_category": str(sub) if sub else None,
        "tags": tags_list,
        "title": str(title),
        "summary": str(summary) if summary else None,
        "external_url": ext_url or None,
        "file_url": file_link or None,
        "format": str(fmt) if fmt else None,
        "published_at": to_iso_date(pub_at),
        "registered_at": to_iso_ts(reg_at) or datetime.now(timezone.utc).isoformat(),
        "proposer": str(proposer) if proposer else None,
        "status": map_sheet_status(status),
        "last_checked_at": to_iso_ts(last_chk),
        "category_owner": str(owner) if owner else None,
        "exposure_grade": str(grade) if grade else "free",
        "notes": str(notes) if notes else None,
        "views": int(views) if str(views).strip().isdigit() else 0,
        "downloads": int(downloads) if str(downloads).strip().isdigit() else 0,
        # kind는 Supabase 측 generated column
    }


def map_faq_row(row: list) -> dict | None:
    if len(row) < 8:
        row = row + [""] * (8 - len(row))
    no, main, sub, q, a, reg_at, views, notes = row[:8]
    if not no or not q:
        return None
    try:
        no_int = int(str(no).strip())
    except (ValueError, TypeError):
        return None
    return {
        "id": no_int,
        "main_category": str(main or "미분류"),
        "sub_category": str(sub) if sub else None,
        "question": str(q),
        "answer": str(a or ""),
        "registered_at": to_iso_ts(reg_at) or datetime.now(timezone.utc).isoformat(),
        "views": int(views) if str(views).strip().isdigit() else 0,
        "notes": str(notes) if notes else None,
    }


def upsert_chunked(sb, table: str, items: list[dict]) -> tuple[int, list[str]]:
    if not items:
        return 0, []
    ok = 0
    errs: list[str] = []
    for i in range(0, len(items), BATCH):
        chunk = items[i : i + BATCH]
        try:
            sb.table(table).upsert(chunk, on_conflict="id").execute()
            ok += len(chunk)
        except Exception as e:
            errs.append(f"{table} @{i}: {e}")
    return ok, errs


def main() -> int:
    env = load_env()
    sb = create_client(env["SUPABASE_URL"], env["SUPABASE_SECRET"])
    gc = gspread.service_account(filename="/tmp/macbe_sheets_sa.json")
    sh = gc.open_by_key(SHEET_ID)

    # SSOT
    ssot = sh.worksheet(SSOT_TAB)
    raw = ssot.get_all_values()
    rows = raw[1:]
    items = [m for m in (map_ssot_row(r) for r in rows) if m]
    print(f"[archive_item] mapped {len(items)} / sheet rows {len(rows)}")
    ok, errs = upsert_chunked(sb, "archive_item", items)
    print(f"[archive_item] upserted {ok}; errors {len(errs)}")
    for e in errs:
        print("  !", e)

    # FAQ
    try:
        faq = sh.worksheet(FAQ_TAB)
        raw = faq.get_all_values()
        rows = raw[1:]
        items = [m for m in (map_faq_row(r) for r in rows) if m]
        print(f"[faq] mapped {len(items)} / sheet rows {len(rows)}")
        ok, errs = upsert_chunked(sb, "faq", items)
        print(f"[faq] upserted {ok}; errors {len(errs)}")
        for e in errs:
            print("  !", e)
    except gspread.WorksheetNotFound:
        print("[faq] tab not found, skip")

    # Sanity
    n_arch = sb.table("archive_item").select("id", count="exact").execute().count
    n_faq = sb.table("faq").select("id", count="exact").execute().count
    print(f"[after] Supabase archive_item={n_arch}, faq={n_faq}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
