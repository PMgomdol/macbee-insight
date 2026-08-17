import type { ArchiveItem } from '@/types/db';
import { ExternalLink, Download, PlayCircle } from 'lucide-react';

// 카드 배지 라벨 — 메뉴(kind)와 무관하게 실제 매체 기준.
// 콘텐츠 메뉴 안의 PDF 가이드도 '파일' 배지를 달아야 다운로드 여부를 즉시 알 수 있음.
function mediaLabel(item: ArchiveItem): '영상' | '파일' | '아티클' {
  if (isVideo(item)) return '영상';
  if (item.file_url || item.file_ext) return '파일';
  return '아티클';
}

function formatDate(s: string | null): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return `${m[1]}.${m[2]}.${m[3]}`;
}

function isVideo(item: ArchiveItem): boolean {
  if (item.format === '영상') return true;
  const url = (item.external_url || '').toLowerCase();
  return /youtube\.com|youtu\.be|vimeo\.com|tv\.naver\.com/.test(url);
}

/** 클릭 시 실제로 파일이 내려받아지는가. 구글 문서·드라이브는 뷰어로 열리므로 '바로가기'로 취급. */
function isDownload(item: ArchiveItem): boolean {
  if (isVideo(item)) return false;
  if (item.file_url) return true; // 호스팅된 파일 = 다운로드
  const u = unwrapRedirect(item.external_url || '').toLowerCase();
  if (/docs\.google\.com|drive\.google\.com/.test(u)) return false;
  return /\.(pdf|zip|docx?|pptx?|xlsx?|hwpx?|csv|key|odt|ods|odp)($|[?#])/.test(u);
}

/** 오른쪽 아래 액션 표시 — 무엇을 클릭하는지 명확히. */
function cardAction(item: ArchiveItem) {
  if (isVideo(item)) return { Icon: PlayCircle, label: '재생' };
  if (isDownload(item)) return { Icon: Download, label: '다운로드' };
  return { Icon: ExternalLink, label: '바로가기' };
}

// 구글 리다이렉트 URL(www.google.com/url?q=...) → 실제 URL로 풀기.
// 카톡 공유 시 자주 감싸져 오는 형태라 URL 그대로면 substring 검사가 오탐남.
function unwrapRedirect(u: string): string {
  try {
    const p = new URL(u);
    if (p.hostname === 'www.google.com' && p.pathname === '/url') {
      const q = p.searchParams.get('q');
      if (q) return q;
    }
  } catch {}
  return u;
}

/** 파일 확장자 배지 — DB의 file_ext 우선, 없으면 URL 패턴 fallback */
function fileExtBadge(item: ArchiveItem): string | null {
  // 1) DB에 미리 판별된 값 있으면 그대로 (Drive 파일 실제 mimeType 반영)
  if (item.file_ext) return item.file_ext;
  // 2) URL 패턴 fallback (리다이렉트 URL은 실제 URL로 풀어서 검사)
  const raw = item.file_url || item.external_url || '';
  if (!raw) return null;
  const u = unwrapRedirect(raw).toLowerCase();
  if (/docs\.google\.com\/document/.test(u)) return '구글 문서';
  if (/docs\.google\.com\/spreadsheets/.test(u)) return '구글 시트';
  if (/docs\.google\.com\/presentation/.test(u)) return '구글 슬라이드';
  if (/drive\.google\.com/.test(u)) return '구글 드라이브';
  if (/\.pdf($|[?#])/.test(u)) return 'PDF';
  if (/\.(docx?|odt)($|[?#])/.test(u)) return '워드';
  if (/\.(pptx?|key|odp)($|[?#])/.test(u)) return 'PPT';
  if (/\.(xlsx?|csv|ods)($|[?#])/.test(u)) return '엑셀';
  if (/\.hwpx?($|[?#])/.test(u)) return '한글';
  if (/\.zip($|[?#])/.test(u)) return 'ZIP';
  return null;
}

/**
 * 카드 정보 위계 — Linear/Medium 카드 참고
 *  ① 태그 (종류·형식·실태그)  — 작게
 *  ② 타이틀                  — 가장 강조 (16px 700)
 *  ③ 카테고리                — 작게 (메타)
 *  ④ 요약                    — 작게 (보조)
 *  ⑤ 날짜·조회수             — 가장 작게 (푸터)
 */
export function ItemCard({ item }: { item: ArchiveItem }) {
  const url = item.file_url || item.external_url || '#';
  const media = mediaLabel(item);
  const isFile = media === '파일';
  const video = isVideo(item);
  const fileExt = fileExtBadge(item);
  const topBadge = fileExt ?? (video ? '영상' : '아티클');
  const { Icon: ActionIcon, label: actionLabel } = cardAction(item);
  const tags = (item.tags ?? []).slice(0, 2);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-card-id={item.id}
      data-card-kind={item.kind}
      data-card-category={item.main_category}
      className="app-card group flex flex-col gap-2.5 p-4 min-h-[180px] h-full overflow-hidden"
      aria-label={`${media}: ${item.title} (새 탭에서 열어요)`}
    >
      {/* ① 형식 배지 — '무엇'인지만 (행동은 오른쪽 아래) */}
      <div className="flex items-center gap-1.5 flex-wrap min-h-[20px]">
        <span
          className={`slds-badge ${
            video ? 'app-badge-video' : isFile ? 'app-badge-file' : 'app-badge-insight'
          }`}
        >
          {topBadge}
        </span>
      </div>

      {/* ② 타이틀 — 가장 강조 */}
      <h3 className="font-bold text-[16px] leading-snug line-clamp-2 tracking-tight text-[var(--fg)] group-hover:text-[var(--accent)] transition">
        {item.title}
      </h3>

      {/* ③ 요약 */}
      {item.summary && (
        <p className="text-[12px] text-[var(--muted)] line-clamp-2 leading-relaxed">
          {item.summary}
        </p>
      )}

      {/* ④ 태그 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-[var(--muted-2)]">
          {tags.map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>
      )}

      {/* ⑤ 푸터 메타 — 왼쪽 날짜·조회, 오른쪽 액션 */}
      <div className="flex items-center justify-between gap-x-3 gap-y-1 flex-wrap text-[11px] text-[var(--muted-2)] mt-auto pt-1">
        <div className="flex items-center gap-3 min-w-0">
          {formatDate(item.published_at) && <span className="truncate">{formatDate(item.published_at)}</span>}
          {item.views > 0 && <span className="truncate">조회 {item.views.toLocaleString()}</span>}
        </div>
        <span className="inline-flex items-center gap-1 text-[var(--muted)] group-hover:text-[var(--accent)] transition shrink-0">
          <ActionIcon size={14} aria-hidden />
          {actionLabel}
        </span>
      </div>
    </a>
  );
}

export function ItemRow({ item }: { item: ArchiveItem }) {
  const url = item.file_url || item.external_url || '#';
  const media = mediaLabel(item);
  const isFile = media === '파일';
  const video = isVideo(item);
  const fileExt = fileExtBadge(item);
  const topBadge = fileExt ?? (video ? '영상' : '아티클');
  const { Icon: ActionIcon, label: actionLabel } = cardAction(item);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-card-id={item.id}
      data-card-kind={item.kind}
      data-card-category={item.main_category}
      className="group flex items-start justify-between gap-3 px-3 py-3 min-h-[44px] hover:bg-[var(--card)] transition"
    >
      <div className="min-w-0 flex flex-col gap-1">
        {/* 배지(형식) 위로 */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[var(--muted-2)]">
          <span
            className={`slds-badge ${
              video ? 'app-badge-video' : isFile ? 'app-badge-file' : 'app-badge-insight'
            }`}
          >
            {topBadge}
          </span>
          <span className="truncate">{item.main_category}{item.sub_category ? ` · ${item.sub_category}` : ''}</span>
        </div>
        <h3 className="font-semibold text-[14px] leading-snug truncate group-hover:text-[var(--accent)] transition">
          {item.title}
        </h3>
        {item.summary && (
          <p className="text-[12px] text-[var(--muted)] line-clamp-1 leading-relaxed">
            {item.summary}
          </p>
        )}
      </div>
      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted-2)] group-hover:text-[var(--accent)] transition shrink-0 pt-0.5">
        <ActionIcon size={14} aria-hidden />
        {actionLabel}
      </span>
    </a>
  );
}
