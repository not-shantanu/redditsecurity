import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  // Microsoft Fluent Design System Button Styles
  const baseStyles = 'rounded-ms font-normal transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 border focus:outline-none focus:ring-2 focus:ring-offset-1';
  
  const variants = {
    primary: 'bg-ms-primary hover:bg-ms-primaryHover active:bg-ms-primaryPressed text-white border-transparent focus:ring-ms-primary shadow-ms-sm',
    secondary: 'bg-ms-secondary hover:bg-ms-secondaryHover active:bg-ms-secondaryPressed text-ms-neutral border-ms-border focus:ring-ms-primary',
    success: 'bg-ms-success hover:opacity-90 active:opacity-80 text-white border-transparent focus:ring-ms-success shadow-ms-sm',
    danger: 'bg-ms-error hover:bg-ms-errorHover active:opacity-90 text-white border-transparent focus:ring-ms-error shadow-ms-sm',
    ghost: 'bg-transparent hover:bg-ms-backgroundHover active:bg-ms-secondaryPressed text-ms-primary border-transparent focus:ring-ms-primary',
  };

  // Microsoft Fluent Design System Button Heights:
  // Small: 32px (8 * 4px), Medium: 40px (10 * 4px), Large: 48px (12 * 4px)
  const sizes = {
    sm: 'px-3 py-1 h-8 text-sm', // 32px height
    md: 'px-4 py-2 h-10 text-sm font-medium', // 40px height
    lg: 'px-6 py-3 h-12 text-base font-medium', // 48px height
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

