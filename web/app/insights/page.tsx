import { ListPage } from '@/components/ListPage';

export default async function InsightsPage() {
  return (
    <ListPage
      kind="insights"
      title="콘텐츠"
      desc="운영진이 골라 모은 아티클·영상·가이드·세미나 자료예요."
    />
  );
}
