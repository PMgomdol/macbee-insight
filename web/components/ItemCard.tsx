import type { ArchiveItem } from '@/types/db';
import { ExternalLink, Download, Eye } from 'lucide-react';

export function ItemCard({ item }: { item: ArchiveItem }) {
  const url = item.file_url || item.external_url || '#';
  const isFile = item.kind === 'files';
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 p-4 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)] transition"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-2 items-center text-xs text-[var(--muted)]">
          <span className="font-medium">{item.main_category}</span>
          {item.sub_category && <span>· {item.sub_category}</span>}
          {item.format && <span className="px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)]">{item.format}</span>}
        </div>
        {isFile ? <Download size={14} className="text-[var(--muted)]" /> : <ExternalLink size={14} className="text-[var(--muted)]" />}
      </div>
      <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition">
        {item.title}
      </h3>
      {item.summary && (
        <p className="text-xs text-[var(--muted)] line-clamp-3 leading-relaxed">{item.summary}</p>
      )}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {item.tags.slice(0, 5).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)]">
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-3 text-[10px] text-[var(--muted)] mt-auto pt-1">
        <span className="flex items-center gap-1"><Eye size={10} /> {item.views}</span>
        {item.downloads > 0 && <span className="flex items-center gap-1"><Download size={10} /> {item.downloads}</span>}
      </div>
    </a>
  );
}
