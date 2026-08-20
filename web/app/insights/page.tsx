import type { Metadata } from 'next';
import { ListPage } from '@/components/ListPage';

export const metadata: Metadata = {
  title: '기획 아티클·영상·가이드 콘텐츠',
  description:
    '현직 기획자·PM이 골라 모은 UX·서비스 기획 아티클, 영상, 세미나, 가이드 콘텐츠. 실무에 참고할 자료를 카테고리별로 찾아보세요.',
};

export default async function InsightsPage() {
  return (
    <ListPage
      kind="insights"
      title="콘텐츠"
      desc="운영진이 골라 모은 아티클·영상·가이드·세미나 자료예요."
    />
  );
}
