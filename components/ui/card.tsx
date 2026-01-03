import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
}

export function Card({ children, variant = 'default', className, ...props }: CardProps) {
  // Microsoft Fluent Design System Card Styles
  // Reference: https://fluent2.microsoft.design/components/web/react/core/card/usage
  // Padding: 16px (p-4) - Microsoft standard card padding
  // Border radius: 2px (rounded-ms) - Microsoft standard
  // Border: 1px solid #EDEBE9 - Microsoft border color
  // Cards can have CardHeader, CardBody, CardFooter anatomy
  const variants = {
    default: 'bg-white border border-ms-border',
    outlined: 'bg-white border border-ms-border',
    elevated: 'bg-white border border-ms-border shadow-ms-md',
  };

  return (
    <div
      className={cn('rounded-ms p-4', variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}

