import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  action,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn('flex justify-between items-start mb-6', className)} {...props}>
      <div>
        <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2 text-ms-neutral">
          {Icon && <Icon className="w-6 h-6 text-ms-primary" />}
          {title}
        </h1>
        {description && (
          <p className="text-sm text-ms-neutralSecondary">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

