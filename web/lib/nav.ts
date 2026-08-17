export type NavItem = { href: string; label: string; reviewerOnly?: boolean };

export const NAV: NavItem[] = [
  { href: '/files', label: '양식·템플릿' },
  { href: '/insights', label: '콘텐츠' },
  { href: '/faq', label: '실무 Q&A' },
  { href: '/submit', label: '자료 등록' },
  { href: '/admin-mb26/panel', label: '운영진', reviewerOnly: true },
];

export function visibleNav(isReviewer: boolean): NavItem[] {
  return NAV.filter((n) => !n.reviewerOnly || isReviewer);
}
