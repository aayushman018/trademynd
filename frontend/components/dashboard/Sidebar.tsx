'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Activity,
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sidebar = () => {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      isActive: (path: string) => path === '/dashboard',
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: Activity,
      isActive: (path: string) => path.startsWith('/dashboard/analytics') || path === '/insights',
    },
    {
      name: 'Trade History',
      href: '/dashboard/trades',
      icon: BarChart3,
      isActive: (path: string) => path.startsWith('/dashboard/trades') || path === '/trades',
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      isActive: (path: string) => path.startsWith('/dashboard/settings') || path === '/settings' || path === '/connect-bot',
    },
    {
      name: 'AI Chat',
      href: '/chat',
      icon: MessageCircle,
      isActive: (path: string) => path.startsWith('/chat'),
    },
    {
      name: 'Pricing',
      href: '/pricing',
      icon: CreditCard,
      isActive: (path: string) => path.startsWith('/pricing'),
    },
  ];

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col border-r border-[#2A2A2A] bg-[#0C0C0C]">
      <div className="border-b border-[#2A2A2A] px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#141414] text-sm font-semibold text-[#C9A84C]">
            T
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-[0.12em] text-[#F0F0F0]">TRADEMYND</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#888888]">Stealth Terminal</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-0 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.isActive(pathname);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3 px-5 py-2.5 text-sm transition-colors duration-200',
                  isActive
                    ? 'bg-[#141414] text-[#F0F0F0]'
                    : 'text-[#888888] hover:bg-[#141414] hover:text-[#F0F0F0]'
                )}
              >
                {isActive ? <span className="absolute bottom-2 left-0 top-2 w-0.5 bg-[#C9A84C]" /> : null}
                <Icon className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-[#F0F0F0]' : 'text-[#888888] group-hover:text-[#F0F0F0]'
                )} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-[#2A2A2A] p-4">
        <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] p-3">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C1C1C] text-xs font-semibold text-[#F0F0F0]">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#F0F0F0]">{user?.name || 'User'}</p>
              <p className="truncate text-xs text-[#888888]">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-8 w-full items-center justify-start gap-2 rounded-md px-2 text-xs text-[#888888] transition-colors duration-200 hover:bg-[#1C1C1C] hover:text-[#F0F0F0]"
            onClick={logout}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
};
