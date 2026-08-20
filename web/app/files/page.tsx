import type { Metadata } from 'next';
import { ListPage } from '@/components/ListPage';

export const metadata: Metadata = {
  title: '기획 양식·템플릿 — 화면설계서·기획서·IA',
  description:
    '바로 받아 쓰는 기획 실무 양식·템플릿 모음. 화면설계서·기능정의서·PRD·IA·와이어프레임 등 서비스 기획 문서 양식을 카테고리별로 내려받으세요.',
};

export default async function FilesPage() {
  return (
    <ListPage
      kind="files"
      title="양식·템플릿"
      desc="바로 받아 쓸 수 있는 양식·템플릿·샘플 모음이에요."
    />
  );
}
