import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ children, variant = 'default', className, ...props }: BadgeProps) {
  // Microsoft Fluent Design System Badge Styles
  const variants = {
    default: 'bg-ms-neutralLight text-ms-neutralSecondary',
    success: 'bg-green-50 text-ms-success border border-green-200',
    warning: 'bg-yellow-50 text-ms-warning border border-yellow-200',
    danger: 'bg-red-50 text-ms-error border border-red-200',
    info: 'bg-blue-50 text-ms-primary border border-blue-200',
  };

  return (
    <span
      className={cn('px-2 py-0.5 rounded-ms text-xs font-normal border', variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}

