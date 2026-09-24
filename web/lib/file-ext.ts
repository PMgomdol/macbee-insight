// 파일 형식 판별 공용 로직 — ItemCard(배지 렌더)와 updateArchiveItem(편집 시 재계산)에서 함께 씀.
// 서버·클라 양쪽에서 import 되므로 순수 함수만 둔다.

/** 구글 리다이렉트 URL(www.google.com/url?q=...) → 실제 URL로 풀기.
 *  카톡 공유 시 자주 감싸져 오는 형태라 URL 그대로면 substring 검사가 오탐남. */
export function unwrapRedirect(u: string): string {
  try {
    const p = new URL(u);
    if (p.hostname === 'www.google.com' && p.pathname === '/url') {
      const q = p.searchParams.get('q');
      if (q) return q;
    }
  } catch {}
  return u;
}

/** DB의 file_ext가 한글로 저장된 과거 값도 영문 표준 약어로 정규화. */
const EXT_LABEL: Record<string, string> = {
  '구글 문서': 'Google Docs',
  '구글 시트': 'Google Sheets',
  '구글 슬라이드': 'Google Slides',
  '구글 드라이브': 'Google Drive',
  '워드': 'Word',
  '엑셀': 'Excel',
  '한글': 'hwp',
};
export function normalizeExt(v: string): string {
  return EXT_LABEL[v] ?? v;
}

/** URL 패턴으로 파일 형식 라벨 추정 — file_ext가 없을 때/URL이 바뀌었을 때 fallback. */
export function fileExtFromUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  const u = unwrapRedirect(rawUrl).toLowerCase();
  if (/docs\.google\.com\/document/.test(u)) return 'Google Docs';
  if (/docs\.google\.com\/spreadsheets/.test(u)) return 'Google Sheets';
  if (/docs\.google\.com\/presentation/.test(u)) return 'Google Slides';
  if (/drive\.google\.com/.test(u)) return 'Google Drive';
  if (/\.pdf($|[?#])/.test(u)) return 'PDF';
  if (/\.(docx?|odt)($|[?#])/.test(u)) return 'Word';
  if (/\.(pptx?|key|odp)($|[?#])/.test(u)) return 'PPT';
  if (/\.(xlsx?|csv|ods)($|[?#])/.test(u)) return 'Excel';
  if (/\.hwpx?($|[?#])/.test(u)) return 'hwp';
  if (/\.zip($|[?#])/.test(u)) return 'ZIP';
  return null;
}
