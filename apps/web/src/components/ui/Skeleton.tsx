import { cn } from '@/lib/format';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-tile bg-surface-sunken', className)} />;
}
