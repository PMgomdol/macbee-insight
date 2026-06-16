import { ListPage } from '@/components/ListPage';

export default async function InsightsPage() {
  return (
    <ListPage
      kind="insights"
      title="아티클·영상"
      desc="운영진이 골라 모은 아티클·영상·노션·블로그예요."
    />
  );
}
