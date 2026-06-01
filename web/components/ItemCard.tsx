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

/** kind에 따라 색 분기 — 자료실(files) 초록 / 인사이트(insights) 인디고 */
function kindStyles(kind: 'files' | 'insights') {
  if (kind === 'files') {
    return {
      badgeBg: 'bg-[var(--files-bg)]',
      badgeBorder: 'border-[var(--files-border)]',
      badgeText: 'text-[var(--files)]',
      hoverBorder: 'hover:border-[var(--files)]',
      label: '자료실',
    };
  }
  return {
    badgeBg: 'bg-[var(--insights-bg)]',
    badgeBorder: 'border-[var(--insights-border)]',
    badgeText: 'text-[var(--insights)]',
    hoverBorder: 'hover:border-[var(--insights)]',
    label: '인사이트',
  };
}

export function ItemCard({ item }: { item: ArchiveItem }) {
  const url = item.file_url || item.external_url || '#';
  const isFile = item.kind === 'files';
  const styles = kindStyles(item.kind);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex flex-col gap-1.5 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] ${styles.hoverBorder} hover:bg-[var(--card)] transition min-h-[120px]`}
      aria-label={`${styles.label}: ${item.title}`}
    >
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className={`px-1.5 py-0.5 rounded-sm border ${styles.badgeBg} ${styles.badgeBorder} ${styles.badgeText} font-medium`}>
          {styles.label}
        </span>
        {isFile ? <Download size={11} className={styles.badgeText} aria-hidden /> : <ExternalLink size={11} className={styles.badgeText} aria-hidden />}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted-2)]">
        {formatIcon(item.format)}
        <span className="truncate">{item.main_category}{item.sub_category ? ` · ${item.sub_category}` : ''}</span>
      </div>
      <h3 className="font-semibold text-[13px] leading-tight line-clamp-2 group-hover:text-[var(--fg)] transition">
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

export function ItemRow({ item }: { item: ArchiveItem }) {
  const url = item.file_url || item.external_url || '#';
  const styles = kindStyles(item.kind);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[var(--card)] transition"
    >
      <span className={`shrink-0 w-1.5 h-12 rounded ${styles.badgeBg} ${styles.badgeBorder} border`} aria-hidden />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate group-hover:text-[var(--accent)]">{item.title}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted-2)]">
          <span className={`${styles.badgeText} font-medium`}>{styles.label}</span>
          <span className="truncate">{item.main_category}{item.sub_category ? ` · ${item.sub_category}` : ''}</span>
          {item.format && <span>· {item.format}</span>}
        </div>
      </div>
    </a>
  );
}
