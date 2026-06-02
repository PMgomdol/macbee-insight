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
      desc="외부 아티클·영상·노션·블로그 등 큐레이션된 외부 콘텐츠."
      searchParams={sp}
    />
  );
}
