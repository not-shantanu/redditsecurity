import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export function PageContainer({
  children,
  maxWidth = 'xl',
  className,
  ...props
}: PageContainerProps) {
  const maxWidths = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
  };

  // Microsoft Fluent Design System Page Container
  // Padding: 16px horizontal (px-4), 24px vertical (py-6)
  // Reference: https://fluent2.microsoft.design/layout
  return (
    <div className={cn('mx-auto px-4 py-6', maxWidths[maxWidth], className)} {...props}>
      {children}
    </div>
  );
}

