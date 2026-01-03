import { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-normal mb-1 text-ms-neutralSecondary">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full h-10 px-3 bg-white border border-ms-border rounded-ms',
          'text-sm text-ms-neutral placeholder:text-ms-neutralTertiary',
          'focus:outline-none focus:border-ms-primary focus:ring-1 focus:ring-ms-primary',
          'hover:border-ms-borderHover',
          'disabled:bg-ms-neutralLight disabled:cursor-not-allowed disabled:text-ms-neutralTertiary',
          'transition-colors duration-200',
          error && 'border-ms-error focus:border-ms-error focus:ring-ms-error',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-ms-error">{error}</p>
      )}
    </div>
  );
}

