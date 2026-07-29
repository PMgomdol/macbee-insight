'use client';
import { useRouter } from 'next/navigation';

/**
 * 카드 태그 → 태그 검색 이동. 카드 전체가 <a>라 중첩 앵커 불가 —
 * span[role=link]로 클릭을 가로채 카드 링크 이동을 막고 검색으로 보낸다.
 */
export function TagLink({ tag }: { tag: string }) {
  const router = useRouter();
  function go(e: React.SyntheticEvent) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/search?q=${encodeURIComponent(tag)}`);
  }
  return (
    <span
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') go(e); }}
      className="cursor-pointer hover:text-[var(--accent)] hover:underline"
      aria-label={`태그 ${tag}(으)로 검색`}
    >
      #{tag}
    </span>
  );
}
