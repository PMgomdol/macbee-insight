import { ListPage } from '@/components/ListPage';

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ main?: string; sub?: string; format?: string; sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  return (
    <ListPage
      kind="insights"
      title="아티클·영상"
      desc="운영진이 골라 모은 아티클·영상·노션·블로그예요."
      searchParams={sp}
    />
  );
}
