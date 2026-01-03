import { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-normal mb-1 text-ms-neutralSecondary">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          'w-full min-h-[80px] px-3 py-2 bg-white border border-ms-border rounded-ms',
          'text-sm text-ms-neutral placeholder:text-ms-neutralTertiary',
          'focus:outline-none focus:border-ms-primary focus:ring-1 focus:ring-ms-primary',
          'hover:border-ms-borderHover',
          'disabled:bg-ms-neutralLight disabled:cursor-not-allowed disabled:text-ms-neutralTertiary',
          'resize-none transition-colors duration-200',
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

