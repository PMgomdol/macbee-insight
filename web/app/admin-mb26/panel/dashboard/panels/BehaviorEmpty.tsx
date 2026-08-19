import { Info } from 'lucide-react';

export function BehaviorEmpty() {
  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-[var(--r-md)] bg-[var(--accent-bg)] max-w-lg">
      <Info size={16} className="text-[var(--accent)] shrink-0 mt-0.5" aria-hidden />
      <div className="text-sm">
        <p className="font-medium">PostHog 연동 필요</p>
        <p className="text-[var(--muted)] mt-0.5">
          검색어·필터 사용·전환 퍼널 지표는 PostHog 개인 API 키를 발급하면 표시돼요.
          (읽기용 <code className="text-xs">phx_</code> 키 + 프로젝트 498450)
        </p>
      </div>
    </div>
  );
}
