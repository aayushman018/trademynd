'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Link from 'next/link';
import { TrendingUp, Award, AlertCircle, ArrowUpRight, ArrowDownRight, MessageSquare, PieChart, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Trade {
  id: string;
  instrument: string;
  direction: string;
  result: string;
  r_multiple: number;
  trade_timestamp: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await api.get('/trades?limit=5');
        setRecentTrades(response.data);
      } catch (error) {
        console.error('Failed to fetch trades', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, []);

  const winRate = recentTrades.length > 0
    ? (recentTrades.filter(t => t.result === 'WIN').length / recentTrades.length) * 100
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">Welcome back, {user?.name}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/journal">
            <Button variant="outline" className="hidden sm:flex">
              View Journal
            </Button>
          </Link>
          <Link href="/connect-bot">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
              <MessageSquare className="w-4 h-4 mr-2" />
              Connect Telegram
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Trades</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-semibold text-foreground">{recentTrades.length}</h3>
                  <span className="text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">+2 this week</span>
                </div>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <Activity className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Win Rate</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-semibold text-foreground">{winRate.toFixed(0)}%</h3>
                  <span className="text-xs text-muted-foreground font-medium">Last 20 trades</span>
                </div>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <Award className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Active Plan</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-semibold text-foreground capitalize">{user?.plan || 'Free'}</h3>
                  <Link href="/settings" className="text-xs text-primary hover:underline font-medium">Manage</Link>
                </div>
              </div>
              <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                <PieChart className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/40 bg-muted/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                <Link href="/trades" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                  View all
                </Link>
              </div>
            </CardHeader>
            
            {recentTrades.length === 0 ? (
               <div className="px-6 py-16 text-center">
                 <div className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3 bg-muted/50 rounded-full flex items-center justify-center">
                   <TrendingUp className="h-6 w-6" />
                 </div>
                 <h3 className="text-sm font-medium text-foreground">No trades yet</h3>
                 <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">Connect the Telegram bot to start logging your trades automatically.</p>
                 <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link href="/connect-bot">Connect Bot</Link>
                 </Button>
               </div>
            ) : (
              <div className="divide-y divide-border/40">
                {recentTrades.map((trade) => (
                  <div key={trade.id} className="px-6 py-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`p-2.5 rounded-lg mr-4 ${
                          trade.direction === 'LONG' 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' 
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                        }`}>
                          {trade.direction === 'LONG' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{trade.instrument}</p>
                          <p className="text-xs text-muted-foreground">{new Date(trade.trade_timestamp).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          trade.result === 'WIN' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                            : trade.result === 'LOSS'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {trade.result === 'WIN' ? '+' : trade.result === 'LOSS' ? '-' : ''}{Math.abs(trade.r_multiple)}R
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="border-border/60 shadow-sm h-full">
            <CardHeader className="border-b border-border/40 bg-muted/20 px-6 py-4">
              <CardTitle className="text-base font-semibold">Weekly Insights</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/20">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-900 dark:text-amber-400">Pattern Detected</h4>
                      <p className="text-xs text-amber-700 dark:text-amber-500/80 mt-1 leading-relaxed">
                        You tend to hesitate on entries during the NY session open. Consider setting limit orders.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Performance by Session</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">London</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-[70%]"></div>
                        </div>
                        <span className="text-xs font-medium">70%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">New York</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-[45%]"></div>
                        </div>
                        <span className="text-xs font-medium">45%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">Asian</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-[30%]"></div>
                        </div>
                        <span className="text-xs font-medium">30%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
