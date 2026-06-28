import { SearchAutocomplete } from './SearchAutocomplete';

export function HeroSearch() {
  return (
    <section className="flex flex-col gap-4 pt-2 sm:pt-4">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
        필요한 자료를 검색해 보세요.
      </h1>
      <SearchAutocomplete variant="hero" placeholder="제목·태그·설명으로 찾아보세요 (예: 화면설계서, 피그마, 면접)" />
    </section>
  );
}
