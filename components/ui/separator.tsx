import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ 
  orientation = 'horizontal', 
  className, 
  ...props 
}: SeparatorProps) {
  // Microsoft Fluent Design System Separator
  // Reference: https://fluent2.microsoft.design/components/web/react/core/divider
  return (
    <div
      className={cn(
        'bg-ms-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        className
      )}
      {...props}
    />
  );
}

