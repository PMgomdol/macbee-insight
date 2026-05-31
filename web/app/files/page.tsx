import { ListPage } from '@/components/ListPage';

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ main?: string; sub?: string; format?: string; sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  return (
    <ListPage
      kind="files"
      title="자료실"
      desc="다운로드 가능한 파일 자료. PDF·PPT·구글 드라이브 자료 모음."
      searchParams={sp}
    />
  );
}
