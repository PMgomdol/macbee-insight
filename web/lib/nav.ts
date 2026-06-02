export type NavItem = { href: string; label: string; reviewerOnly?: boolean };

export const NAV: NavItem[] = [
  { href: '/', label: '홈' },
  { href: '/files', label: '양식·템플릿' },
  { href: '/insights', label: '아티클·영상' },
  { href: '/faq', label: 'FAQ' },
  { href: '/submit', label: '자료 등록' },
  { href: '/admin', label: '운영진 검토', reviewerOnly: true },
];

export function visibleNav(isReviewer: boolean): NavItem[] {
  return NAV.filter((n) => !n.reviewerOnly || isReviewer);
}
