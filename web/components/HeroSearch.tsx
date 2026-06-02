import { SearchAutocomplete } from './SearchAutocomplete';

export function HeroSearch() {
  return (
    <section className="flex flex-col gap-3 pt-2 sm:pt-4">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
        원하는 자료를 찾아보세요
      </h1>
      <p className="text-sm text-[var(--muted)]">
        기획자를 위한 자료 모음
      </p>
      <div className="mt-2">
        <SearchAutocomplete variant="hero" placeholder="제목·태그·설명으로 검색... (예: 화면설계서, 피그마, 면접)" />
      </div>
    </section>
  );
}
