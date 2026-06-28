import type { ArchiveItem } from '@/types/db';
import { ExternalLink, Download, PlayCircle, FileText } from 'lucide-react';

function kindLabel(kind: 'files' | 'insights') {
  return kind === 'files' ? '양식·템플릿' : '아티클·영상';
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

/** 파일 확장자 배지 — PDF / 워드 / PPT / 엑셀 / 한글 등. file_url 또는 external_url 기준 */
function fileExtBadge(item: ArchiveItem): string | null {
  const u = (item.file_url || item.external_url || '').toLowerCase();
  if (!u) return null;
  // 구글 docs/drive — 형식 추정 불가, 일반 라벨
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

export function ItemCard({ item }: { item: ArchiveItem }) {
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
      className="app-card group relative flex flex-col gap-2 p-3.5 pl-4 min-h-[140px] overflow-hidden"
      aria-label={`${video ? '영상' : kindLabel(item.kind)}: ${item.title} (새 탭에서 열어요)`}
    >
      {/* 좌측 액센트 바 */}
      <span
        aria-hidden
        className={`absolute left-0 top-2 bottom-2 w-1 rounded-r ${
          video ? 'bg-[var(--danger)]' : isFile ? 'bg-[var(--accent)]' : 'bg-[var(--muted-2)]'
        }`}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span
            className={`slds-badge ${
              video
                ? 'app-badge-video'
                : isFile
                ? 'app-badge-file'
                : 'app-badge-insight'
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
        <span className="text-[var(--muted-2)] opacity-0 group-hover:opacity-100 transition" aria-hidden>
          {isFile ? <Download size={14} /> : <ExternalLink size={14} />}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-[12px] text-[var(--muted-2)]">
        <FileText size={13} className="text-[var(--muted)]" aria-hidden />
        <span className="truncate">{item.main_category}{item.sub_category ? ` · ${item.sub_category}` : ''}</span>
      </div>

      <h3 className="font-semibold text-[14px] leading-snug line-clamp-2 text-[var(--fg)]">
        {item.title}
      </h3>
      <p className="text-[12px] text-[var(--muted)] line-clamp-2 leading-relaxed min-h-[34px]">
        {item.summary || ''}
      </p>

      <div className="flex items-center gap-3 text-[11px] text-[var(--muted-2)] mt-auto pt-1">
        {formatDate(item.published_at) && <span>{formatDate(item.published_at)}</span>}
        {item.views > 0 && <span>조회 {item.views.toLocaleString()}</span>}
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
      className="group flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-sm)] hover:bg-[var(--card)] transition"
    >
      <span className={video ? 'text-[var(--danger)] shrink-0' : 'text-[var(--muted-2)] shrink-0'}>
        {video ? <PlayCircle size={18} /> : <FileText size={16} />}
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="font-medium text-sm truncate group-hover:text-[var(--accent)]">{item.title}</span>
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted-2)]">
          <span
            className={`slds-badge ${
              video ? 'app-badge-video' : isFile ? 'app-badge-file' : 'app-badge-insight'
            }`}
          >
            {video ? '영상' : kindLabel(item.kind)}
          </span>
          {fileExt && !video && <span className="slds-badge">{fileExt}</span>}
          <span className="truncate">{item.main_category}{item.sub_category ? ` · ${item.sub_category}` : ''}</span>
        </div>
      </div>
    </a>
  );
}
