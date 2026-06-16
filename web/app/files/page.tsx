import { ListPage } from '@/components/ListPage';

export default async function FilesPage() {
  return (
    <ListPage
      kind="files"
      title="양식·템플릿"
      desc="바로 받아 쓸 수 있는 PDF·PPT·구글 드라이브 자료 모음이에요."
    />
  );
}
