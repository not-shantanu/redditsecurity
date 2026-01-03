import { SelectHTMLAttributes, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export function Select({ label, error, className, children, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-normal mb-1 text-ms-neutralSecondary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={cn(
            'w-full h-10 px-3 bg-white border border-ms-border rounded-ms',
            'text-sm text-ms-neutral appearance-none pr-10',
            'focus:outline-none focus:border-ms-primary focus:ring-1 focus:ring-ms-primary',
            'hover:border-ms-borderHover',
            'disabled:bg-ms-neutralLight disabled:cursor-not-allowed disabled:text-ms-neutralTertiary',
            'transition-colors duration-200',
            error && 'border-ms-error focus:border-ms-error focus:ring-ms-error',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ms-neutralTertiary pointer-events-none" />
      </div>
      {error && (
        <p className="mt-1 text-xs text-ms-error">{error}</p>
      )}
    </div>
  );
}

