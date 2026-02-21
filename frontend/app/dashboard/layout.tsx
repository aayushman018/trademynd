'use client';

import React, { useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
  fullWidth = false,
}: {
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0C0C0C]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#C9A84C]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user.name?.split(' ')[0] || 'Trader';

  return (
    <div className="flex min-h-screen bg-[#0C0C0C] text-[#F0F0F0]">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-[#2A2A2A] bg-[#141414] px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#555555]">Trading Panel</p>
            <p className="text-sm font-medium text-[#F0F0F0]">
              {greeting}, {firstName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#2A2A2A] bg-[#0C0C0C] text-[#888888] transition-colors duration-200 hover:text-[#F0F0F0]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#C9A84C]" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2A2A2A] bg-[#0C0C0C] text-sm font-semibold text-[#F0F0F0]">
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className={cn(
          'flex-1 bg-[#0C0C0C] p-6 md:p-8',
          fullWidth ? 'overflow-hidden' : 'overflow-y-auto',
        )}>
          <div
            className={cn(
              'animate-fade-in',
              fullWidth ? 'h-full w-full' : 'mx-auto w-full max-w-7xl',
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
