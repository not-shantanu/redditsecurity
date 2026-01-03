import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GridProps {
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  className?: string;
}

export function Grid({ cols = 1, gap = 'md', children, className }: GridProps) {
  // Microsoft Fluent Design System uses 4px base unit
  // Official spacing tokens: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px
  // Reference: https://fluent2.microsoft.design/layout
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    6: 'grid-cols-6',
    12: 'grid-cols-12',
  }[cols];

  const gapClass = {
    xs: 'gap-1', // 4px - Microsoft spacing token
    sm: 'gap-2', // 8px - Microsoft spacing token
    md: 'gap-3', // 12px - Microsoft spacing token
    lg: 'gap-4', // 16px - Microsoft spacing token (standard card padding)
    xl: 'gap-5', // 20px - Microsoft spacing token
  }[gap];

  return (
    <div className={cn('grid', colsClass, gapClass, className)}>
      {children}
    </div>
  );
}

