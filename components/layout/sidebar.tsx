'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Search, Target, Settings, LogOut, Building2, FileText, Zap, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const navigation = [
  { name: 'Brand Setup', href: '/dashboard/brand-setup', icon: Building2 },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Define Market', href: '/dashboard/discovery', icon: Search },
  { name: 'Subreddit Intelligence', href: '/dashboard/subreddit-intelligence', icon: Target },
  { name: 'AI Prompts', href: '/dashboard/ai-prompts', icon: FileText },
  { name: 'Automate', href: '/dashboard/automate', icon: Zap },
  { name: 'Command Center', href: '/dashboard/command-center', icon: Settings },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast.error('Failed to logout');
    } else {
      toast.success('Logged out successfully');
      router.push('/auth/login');
    }
  };

  // Microsoft Fluent Design System Navigation Sidebar
  // Reference: https://fluent2.microsoft.design/components/web/react/core/nav
  // Selected state: Background hover, blue text, 2px left border indicator
  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-ms-border">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-ms-border">
        <h1 className="text-base font-semibold text-ms-neutral">RedditFrost</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {navigation.map((item) => {
          // For dashboard, only match exact path. For others, match exact or sub-paths
          const isActive = item.href === '/dashboard'
            ? pathname === item.href
            : pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-ms px-2 py-1.5 text-sm font-normal transition-colors relative',
                'hover:bg-ms-backgroundHover',
                isActive
                  ? 'bg-ms-backgroundHover text-ms-primary font-semibold'
                  : 'text-ms-neutralSecondary hover:text-ms-neutral'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-ms-primary" />
              )}
              <item.icon className={cn('h-4 w-4', isActive ? 'text-ms-primary' : 'text-ms-neutralTertiary')} />
              <span className="flex-1">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-ms-border p-2">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-ms-neutralSecondary hover:text-ms-neutral"
          size="sm"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

