import type { ArchiveItem } from '@/types/db';
import { ExternalLink, Download, FileText, Video, BookOpen, FileBox, Presentation } from 'lucide-react';

function formatIcon(format: string | null, size = 14) {
  switch (format) {
    case '영상': return <Video size={size} aria-hidden />;
    case '템플릿': return <FileBox size={size} aria-hidden />;
    case '기획서': return <Presentation size={size} aria-hidden />;
    case '가이드': return <BookOpen size={size} aria-hidden />;
    default: return <FileText size={size} aria-hidden />;
  }
}

function kindLabel(kind: 'files' | 'insights') {
  return kind === 'files' ? '자료실' : '인사이트';
}

export function ItemCard({ item }: { item: ArchiveItem }) {
  const url = item.file_url || item.external_url || '#';
  const isFile = item.kind === 'files';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fc-card group flex flex-col gap-2 p-3.5 min-h-[132px]"
      aria-label={`${kindLabel(item.kind)}: ${item.title}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="fc-badge">{kindLabel(item.kind)}</span>
        <span className="text-[var(--muted-2)] opacity-0 group-hover:opacity-100 transition" aria-hidden>
          {isFile ? <Download size={14} /> : <ExternalLink size={14} />}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[12px] text-[var(--muted-2)]">
        <span className="text-[var(--muted)]">{formatIcon(item.format, 13)}</span>
        <span className="truncate">{item.main_category}{item.sub_category ? ` · ${item.sub_category}` : ''}</span>
      </div>
      <h3 className="font-semibold text-[14px] leading-snug line-clamp-2 text-[var(--fg)]">
        {item.title}
      </h3>
      {item.summary && (
        <p className="text-[12px] text-[var(--muted)] line-clamp-2 leading-relaxed">{item.summary}</p>
      )}
      <div className="flex items-center gap-3 text-[11px] text-[var(--muted-2)] mt-auto pt-1">
        {item.format && <span>{item.format}</span>}
        {item.views > 0 && <span>조회 {item.views.toLocaleString()}</span>}
      </div>
    </a>
  );
}

export function ItemRow({ item }: { item: ArchiveItem }) {
  const url = item.file_url || item.external_url || '#';
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-sm)] hover:bg-[var(--card)] transition"
    >
      <span className="text-[var(--muted-2)] shrink-0">{formatIcon(item.format, 16)}</span>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="font-medium text-sm truncate group-hover:text-[var(--accent)]">{item.title}</span>
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted-2)]">
          <span className="fc-badge">{kindLabel(item.kind)}</span>
          <span className="truncate">{item.main_category}{item.sub_category ? ` · ${item.sub_category}` : ''}</span>
          {item.format && <span>· {item.format}</span>}
        </div>
      </div>
    </a>
  );
}
