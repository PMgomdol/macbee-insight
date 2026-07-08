import type { ArchiveItem } from '@/types/db';
import { ExternalLink, Download, PlayCircle, FileText } from 'lucide-react';

// 카드 배지 라벨 — 페이지 타이틀/필터의 "양식·템플릿"·"아티클·영상"과 별도.
// 카드에선 심플하게: files=파일, insights=아티클 (영상은 별도 분기)
function kindLabel(kind: 'files' | 'insights') {
  return kind === 'files' ? '파일' : '아티클';
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

/** 파일 확장자 배지 — PDF / 워드 / PPT / 엑셀 / 한글 등 */
function fileExtBadge(item: ArchiveItem): string | null {
  const u = (item.file_url || item.external_url || '').toLowerCase();
  if (!u) return null;
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
  const isFile = item.kind === 'files';
  const video = isVideo(item);
  const fileExt = fileExtBadge(item);
  const tags = (item.tags ?? []).slice(0, 2);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-card-id={item.id}
      data-card-kind={item.kind}
      data-card-category={item.main_category}
      className="app-card group flex flex-col gap-2.5 p-4 min-h-[180px] overflow-hidden"
      aria-label={`${video ? '영상' : kindLabel(item.kind)}: ${item.title} (새 탭에서 열어요)`}
    >
      {/* ① 자료 종류 (Lozenge) — 메타 배지 */}
      <div className="flex items-center gap-1.5 flex-wrap min-h-[20px]">
        <span
          className={`slds-badge ${
            video ? 'app-badge-video' : isFile ? 'app-badge-file' : 'app-badge-insight'
          }`}
        >
          {video ? (
            <PlayCircle size={11} aria-hidden />
          ) : isFile ? (
            <Download size={11} aria-hidden />
          ) : (
            <ExternalLink size={11} aria-hidden />
          )}
          {video ? '영상' : kindLabel(item.kind)}
        </span>
        {fileExt && !video && <span className="slds-badge">{fileExt}</span>}
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

      {/* ⑤ 푸터 메타 */}
      <div className="flex items-center justify-between gap-3 text-[11px] text-[var(--muted-2)] mt-auto pt-1">
        <div className="flex items-center gap-3">
          {formatDate(item.published_at) && <span>{formatDate(item.published_at)}</span>}
          {item.views > 0 && <span>조회 {item.views.toLocaleString()}</span>}
        </div>
        <span className="opacity-0 group-hover:opacity-100 transition" aria-hidden>
          {isFile ? <Download size={13} /> : <ExternalLink size={13} />}
        </span>
      </div>
    </a>
  );
}

export function ItemRow({ item }: { item: ArchiveItem }) {
  const url = item.file_url || item.external_url || '#';
  const isFile = item.kind === 'files';
  const video = isVideo(item);
  const fileExt = fileExtBadge(item);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-card-id={item.id}
      data-card-kind={item.kind}
      data-card-category={item.main_category}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-sm)] hover:bg-[var(--card)] transition"
    >
      <span className={video ? 'text-[var(--danger)] shrink-0' : 'text-[var(--muted-2)] shrink-0'}>
        {video ? <PlayCircle size={18} /> : <FileText size={16} />}
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="font-semibold text-[14px] truncate group-hover:text-[var(--accent)]">
          {item.title}
        </span>
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted-2)]">
          <span
            className={`slds-badge ${
              video ? 'app-badge-video' : isFile ? 'app-badge-file' : 'app-badge-insight'
            }`}
          >
            {video ? '영상' : kindLabel(item.kind)}
          </span>
          {fileExt && !video && <span className="slds-badge">{fileExt}</span>}
        </div>
      </div>
    </a>
  );
}
