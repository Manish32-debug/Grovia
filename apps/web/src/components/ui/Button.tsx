import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/format';

type Variant = 'primary' | 'dark' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-grove-500 text-white hover:bg-grove-600 active:bg-grove-600',
  dark: 'bg-ink text-white hover:bg-ink-soft active:bg-ink-soft',
  ghost: 'bg-surface text-ink border border-line hover:bg-surface-sunken',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-12 px-6 text-[15px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold',
        'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  );
}
