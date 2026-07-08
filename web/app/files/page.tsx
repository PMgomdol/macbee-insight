import { ListPage } from '@/components/ListPage';

export default async function FilesPage() {
  return (
    <ListPage
      kind="files"
      title="양식·템플릿"
      desc="바로 받아 쓸 수 있는 양식·템플릿·샘플 모음이에요."
    />
  );
}
