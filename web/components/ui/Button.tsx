import Link from 'next/link';

/**
 * /design 버튼 레시피의 단일 구현. @atlaskit Button 대체 (ADS 고유 색·라운드가
 * 사이트 토큰과 어긋나는 문제). 새 버튼은 반드시 이 컴포넌트 사용.
 */
const VARIANTS = {
  primary:
    'bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] active:bg-[var(--accent-pressed)] disabled:opacity-50 disabled:pointer-events-none',
  secondary:
    'border border-[var(--border)] hover:bg-[var(--card)] disabled:opacity-50 disabled:pointer-events-none',
  tertiary:
    'text-[var(--accent)] font-medium hover:bg-[var(--accent-bg)] disabled:opacity-50 disabled:pointer-events-none',
} as const;

const SIZES = {
  md: 'px-4 py-2 rounded-[var(--r-md)] text-sm',
  sm: 'px-3 py-1.5 rounded-[var(--r-md)] text-xs',
} as const;

type Variant = keyof typeof VARIANTS;
type Size = keyof typeof SIZES;

function cls(variant: Variant, size: Size, extra?: string) {
  return `inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${SIZES[size]} ${VARIANTS[variant]} ${extra ?? ''}`;
}

export function UIButton({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={cls(variant, size, className)} {...rest} />;
}

export function UILinkButton({
  variant = 'primary',
  size = 'md',
  className,
  href,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size; href: string }) {
  return <Link href={href} className={cls(variant, size, className)} {...rest} />;
}
