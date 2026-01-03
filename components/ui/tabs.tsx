import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabsProps {
  children: ReactNode;
  className?: string;
}

interface TabListProps {
  children: ReactNode;
  className?: string;
}

interface TabProps {
  children: ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

interface TabPanelsProps {
  children: ReactNode;
  className?: string;
}

interface TabPanelProps {
  children: ReactNode;
  className?: string;
}

export function Tabs({ children, className }: TabsProps) {
  return <div className={cn('w-full', className)}>{children}</div>;
}

export function TabList({ children, className }: TabListProps) {
  return (
    <div className={cn('flex gap-0 border-b border-ms-border', className)}>
      {children}
    </div>
  );
}

export function Tab({ children, isSelected = false, onClick, className }: TabProps) {
  // Microsoft Fluent Design System Tab Styles
  // Reference: https://fluent2.microsoft.design/components/web/react/core/tablist/usage
  // Selected tab: Blue underline (2px height), blue text, semibold
  // Unselected: Gray text, hover to neutral
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-sm font-normal relative',
        'text-ms-neutralSecondary hover:text-ms-neutral',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-1 focus:ring-ms-primary focus:ring-offset-[-1px]',
        isSelected && 'text-ms-primary font-semibold',
        className
      )}
    >
      {children}
      {isSelected && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-ms-primary" />
      )}
    </button>
  );
}

export function TabPanels({ children, className }: TabPanelsProps) {
  return <div className={cn('mt-4', className)}>{children}</div>;
}

export function TabPanel({ children, className }: TabPanelProps) {
  return <div className={cn('', className)}>{children}</div>;
}

