import type { ArchiveItem } from '@/types/db';
import { ExternalLink, Download, Eye, FileText, Video, BookOpen, FileBox } from 'lucide-react';

function formatIcon(format: string | null, size = 13) {
  switch (format) {
    case '영상': return <Video size={size} aria-hidden />;
    case '템플릿':
    case '기획서':
      return <FileBox size={size} aria-hidden />;
    case '가이드': return <BookOpen size={size} aria-hidden />;
    default: return <FileText size={size} aria-hidden />;
  }
}

/** 컴팩트 카드 — 그리드/캐러셀에서 공통 사용 */
export function ItemCard({ item }: { item: ArchiveItem }) {
  const url = item.file_url || item.external_url || '#';
  const isFile = item.kind === 'files';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-1.5 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)] hover:bg-[var(--card)] transition min-h-[120px]"
      aria-label={`${item.title} - ${item.main_category}`}
    >
      <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--muted-2)]">
        <div className="flex items-center gap-1.5 min-w-0">
          {formatIcon(item.format)}
          <span className="truncate">{item.main_category}{item.sub_category ? ` · ${item.sub_category}` : ''}</span>
        </div>
        {isFile ? <Download size={11} aria-hidden /> : <ExternalLink size={11} aria-hidden />}
      </div>
      <h3 className="font-semibold text-[13px] leading-tight line-clamp-2 group-hover:text-[var(--accent)] transition">
        {item.title}
      </h3>
      {item.summary && (
        <p className="text-[11px] text-[var(--muted)] line-clamp-2 leading-relaxed">{item.summary}</p>
      )}
      {item.views > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-[var(--muted-2)] mt-auto">
          <Eye size={10} aria-hidden /> {item.views}
        </div>
      )}
    </a>
  );
}

/** 리스트(라인) 형태 — 더 컴팩트 */
export function ItemRow({ item }: { item: ArchiveItem }) {
  const url = item.file_url || item.external_url || '#';
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[var(--card)] transition"
    >
      <div className="text-[var(--muted-2)] shrink-0">{formatIcon(item.format, 14)}</div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate group-hover:text-[var(--accent)]">{item.title}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted-2)]">
          <span className="truncate">{item.main_category}{item.sub_category ? ` · ${item.sub_category}` : ''}</span>
          {item.format && <span>· {item.format}</span>}
          {item.views > 0 && <span>· 조회 {item.views}</span>}
        </div>
      </div>
    </a>
  );
}
