'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { LayoutDashboard, History, MessageSquare, Settings, LogOut, LineChart, MessageCircle, FileText, PieChart } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';

export const Sidebar = () => {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Trades', href: '/trades', icon: History },
    { name: 'Insights', href: '/insights', icon: PieChart }, // Added Insights
    { name: 'Journal', href: '/journal', icon: FileText }, // Added Journal
    { name: 'AI Chat', href: '/chat', icon: MessageCircle },
    { name: 'Connect Bot', href: '/connect-bot', icon: MessageSquare },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col w-64 bg-secondary/30 border-r border-border min-h-screen">
      <div className="flex items-center justify-between h-16 px-6 border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="flex items-center">
          <LineChart className="w-6 h-6 text-primary mr-2" />
          <span className="text-lg font-bold text-foreground tracking-tight">Ledgerly</span>
        </div>
        <ThemeToggle />
      </div>
      
      <div className="flex flex-col flex-1 px-3 py-6">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-white dark:bg-card text-primary shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:bg-white/50 dark:hover:bg-card/50 hover:text-foreground"
                )}
              >
                <Icon className={cn(
                  "mr-3 h-4 w-4 flex-shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-border">
        <div className="bg-gradient-to-br from-white to-secondary dark:from-card dark:to-card/50 rounded-xl p-4 border border-border/50 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-background">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-foreground truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground h-8 px-2" 
            onClick={logout}
          >
            <LogOut className="mr-2 h-3 w-3" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
};
