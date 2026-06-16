import { ListFilterClient } from './ListFilterClient';
import { getItemsByKind } from '@/lib/queries';

type Props = {
  kind: 'files' | 'insights';
  title: string;
  desc: string;
};

/**
 * /files·/insights 페이지 — 한 번에 전체 자료를 받아 client-side 필터.
 * 카테고리/소분류/정렬/검색 모두 client state로 처리해 서버 round-trip 제거.
 * 데이터 규모: insights 700↓, files 100↓ — 카드만 보여주므로 페이로드 영향 미미.
 */
export async function ListPage({ kind, title, desc }: Props) {
  const { items, total } = await getItemsByKind(kind, { page: 1, pageSize: 2000 });
  return (
    <ListFilterClient
      kind={kind}
      title={title}
      desc={desc}
      items={items}
      total={total}
    />
  );
}
