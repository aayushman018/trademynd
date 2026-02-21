'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Trade = {
  id: string;
  instrument: string;
  direction: string;
  entry_price: number | null;
  exit_price: number | null;
  result: string;
  r_multiple: number | null;
  trade_timestamp: string | null;
  emotion: string | null;
};

type NewsEvent = {
  time_utc: string | null;
  currency: string;
  event: string;
  forecast: string;
  previous: string;
};

type NewsPayload = {
  events: NewsEvent[];
  scraper_healthy: boolean;
  error: string | null;
  from_cache: boolean;
  last_fetched_utc: string | null;
};

const CURRENCY_EMOJI: Record<string, string> = {
  USD: '\u{1F1FA}\u{1F1F8}',
  EUR: '\u{1F1EA}\u{1F1FA}',
  GBP: '\u{1F1EC}\u{1F1E7}',
  JPY: '\u{1F1EF}\u{1F1F5}',
  AUD: '\u{1F1E6}\u{1F1FA}',
  NZD: '\u{1F1F3}\u{1F1FF}',
  CAD: '\u{1F1E8}\u{1F1E6}',
  CHF: '\u{1F1E8}\u{1F1ED}',
  CNY: '\u{1F1E8}\u{1F1F3}',
  CNH: '\u{1F1E8}\u{1F1F3}',
  SEK: '\u{1F1F8}\u{1F1EA}',
  NOK: '\u{1F1F3}\u{1F1F4}',
  DKK: '\u{1F1E9}\u{1F1F0}',
  SGD: '\u{1F1F8}\u{1F1EC}',
  HKD: '\u{1F1ED}\u{1F1F0}',
  XAU: '\u{1F947}',
  XAG: '\u{1F948}',
  BTC: '\u20BF',
  ETH: '\u039E',
};

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function formatPrice(value: number | null): string {
  if (value === null || Number.isNaN(Number(value))) return '-';
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function formatR(value: number | null): string {
  if (value === null || Number.isNaN(Number(value))) return '-';
  const numeric = Number(value);
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(2)}R`;
}

function formatUtcTime(value: string | null): string {
  if (!value) return 'TBD';
  return `${value} UTC`;
}

function formatLastFetched(value: string | null): string {
  if (!value) return 'Not fetched yet';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not fetched yet';
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function currencyEmoji(value: string): string {
  const normalized = (value || '').toUpperCase().replace('/', '');
  if (CURRENCY_EMOJI[normalized]) return CURRENCY_EMOJI[normalized];

  if (normalized.length === 6) {
    const left = CURRENCY_EMOJI[normalized.slice(0, 3)] || '\u{1F4C8}';
    const right = CURRENCY_EMOJI[normalized.slice(3)] || '\u{1F4B1}';
    return `${left}${right}`;
  }

  return '\u{1F310}';
}

function toTimestamp(value: string | null): number {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getTime();
}

function getCurrentStreak(trades: Trade[]): string {
  if (trades.length === 0) return '0';
  const sorted = [...trades].sort((a, b) => toTimestamp(b.trade_timestamp) - toTimestamp(a.trade_timestamp));

  let currentType = '';
  let count = 0;

  for (const trade of sorted) {
    if (trade.result !== 'WIN' && trade.result !== 'LOSS') {
      continue;
    }

    if (!currentType) {
      currentType = trade.result;
      count = 1;
      continue;
    }

    if (trade.result === currentType) {
      count += 1;
    } else {
      break;
    }
  }

  if (!currentType || count === 0) return '0';
  return `${count}${currentType === 'WIN' ? 'W' : 'L'}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsPayload, setNewsPayload] = useState<NewsPayload | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [sendingNews, setSendingNews] = useState(false);
  const [sendNewsFeedback, setSendNewsFeedback] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await api.get('/trades?limit=500');
        setTrades(response.data || []);
      } catch {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      setNewsLoading(true);
      setNewsError(null);
      try {
        const response = await api.get('/news/today');
        setNewsPayload(response.data);
      } catch {
        setNewsError('News temporarily unavailable - Forex Factory may be blocking requests. Try again later.');
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
  }, []);

  const sortedTrades = useMemo(
    () => [...trades].sort((a, b) => toTimestamp(b.trade_timestamp) - toTimestamp(a.trade_timestamp)),
    [trades]
  );

  const totalTrades = trades.length;
  const winCount = trades.filter((trade) => trade.result === 'WIN').length;
  const winRate = totalTrades ? (winCount / totalTrades) * 100 : 0;
  const avgR =
    trades.filter((trade) => trade.r_multiple !== null).reduce((sum, trade) => sum + Number(trade.r_multiple || 0), 0) /
    Math.max(1, trades.filter((trade) => trade.r_multiple !== null).length);
  const currentStreak = getCurrentStreak(trades);

  const chartData = useMemo(() => {
    const ascending = [...trades].sort((a, b) => toTimestamp(a.trade_timestamp) - toTimestamp(b.trade_timestamp));
    let cumulative = 0;
    return ascending.slice(-24).map((trade, index) => {
      cumulative += Number(trade.r_multiple || 0);
      const date = trade.trade_timestamp ? new Date(trade.trade_timestamp) : null;
      return {
        key: `${trade.id}-${index}`,
        label: date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : `T${index + 1}`,
        cumulativeR: Number(cumulative.toFixed(2)),
      };
    });
  }, [trades]);

  const recentTrades = sortedTrades.slice(0, 8);
  const telegramConnected = Boolean(user?.telegram_connected);

  const handleSendNewsToTelegram = async () => {
    if (!telegramConnected) return;
    setSendingNews(true);
    setSendNewsFeedback(null);
    try {
      await api.post('/news/send-to-telegram');
      setSendNewsFeedback('Delivered to Telegram \u2713');
    } catch {
      setSendNewsFeedback('Failed to send news to Telegram.');
    } finally {
      setSendingNews(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#F0F0F0]">Dashboard</h1>
          <p className="mt-1 text-sm text-[#888888]">Account: {user?.name || 'Trader'}</p>
        </div>
        <Link
          href="/dashboard/trades"
          className="rounded-md border border-[#2A2A2A] bg-[#141414] px-4 py-2 text-sm font-medium text-[#F0F0F0] transition-colors duration-200 hover:border-[#3A3A3A]"
        >
          Open Trade History
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Trades', value: totalTrades.toLocaleString() },
          { label: 'Win Rate', value: `${winRate.toFixed(1)}%` },
          { label: 'Avg R-Multiple', value: `${avgR > 0 ? '+' : ''}${avgR.toFixed(2)}R` },
          { label: 'Current Streak', value: currentStreak },
        ].map((metric) => (
          <div key={metric.label} className="rounded-lg border border-[#2A2A2A] bg-[#141414] p-5">
            <p className="text-3xl font-semibold text-[#C9A84C]">{metric.value}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.1em] text-[#555555]">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.1em] text-[#555555]">{'\u{1F4C5}'} Today&apos;s Red Folder News</p>
          <div className="flex items-center gap-3">
            <p className="text-xs text-[#555555]">Last fetched: {formatLastFetched(newsPayload?.last_fetched_utc || null)}</p>
            <button
              type="button"
              onClick={handleSendNewsToTelegram}
              disabled={!telegramConnected || sendingNews}
              title={telegramConnected ? '' : 'Connect Telegram in Settings to enable delivery'}
              className={[
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors duration-200',
                telegramConnected
                  ? 'border-[#C9A84C] text-[#C9A84C] hover:bg-[#1C1C1C]'
                  : 'cursor-not-allowed border-[#2A2A2A] text-[#555555]',
              ].join(' ')}
            >
              {sendingNews ? 'Sending...' : 'Send to Telegram'}
            </button>
          </div>
        </div>

        {newsLoading ? (
          <p className="text-sm text-[#888888]">Fetching latest red folder events...</p>
        ) : newsError ? (
          <p className="text-sm text-[#555555]">
            News temporarily unavailable - Forex Factory may be blocking requests. Try again later.
          </p>
        ) : newsPayload && !newsPayload.scraper_healthy && newsPayload.error ? (
          <p className="text-sm text-[#555555]">{newsPayload.error}</p>
        ) : newsPayload && newsPayload.events.length > 0 ? (
          <div className="space-y-2">
            {newsPayload.events.map((event, index) => (
              <div
                key={`${event.currency}-${event.event}-${index}`}
                className="rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-[#C9A84C]">{formatUtcTime(event.time_utc)}</span>
                  <span className="rounded-full border border-[#2A2A2A] bg-[#1C1C1C] px-2 py-0.5 text-[#888888]">
                    {currencyEmoji(event.currency)} {event.currency}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#F0F0F0]">{event.event}</p>
                <p className="mt-1 text-xs text-[#888888]">
                  Forecast: {event.forecast || 'N/A'} | Previous: {event.previous || 'N/A'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#555555]">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#4CAF7A]" />
            No red folder events today. Safe to trade.
          </p>
        )}

        {sendNewsFeedback ? (
          <p className={`mt-3 text-sm ${sendNewsFeedback.includes('\u2713') ? 'text-[#4CAF7A]' : 'text-[#C0504A]'}`}>
            {sendNewsFeedback}
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#F0F0F0]">R-Multiple Curve</h2>
          <span className="text-xs uppercase tracking-[0.1em] text-[#555555]">Last {chartData.length} Trades</span>
        </div>

        <div className="h-[320px] w-full rounded-md border border-[#2A2A2A] bg-[#141414] p-3">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-[#888888]">Loading chart...</div>
          ) : chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[#888888]">
              No chart data yet. Add trades to visualize performance.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#2A2A2A" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#555555" tick={{ fill: '#888888', fontSize: 11 }} />
                <YAxis stroke="#555555" tick={{ fill: '#888888', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#141414',
                    border: '1px solid #2A2A2A',
                    borderRadius: 8,
                    color: '#F0F0F0',
                  }}
                  labelStyle={{ color: '#F0F0F0' }}
                />
                <Line type="monotone" dataKey="cumulativeR" stroke="#C9A84C" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#2A2A2A]">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] bg-[#141414] px-4 py-3">
          <h2 className="text-base font-semibold text-[#F0F0F0]">Recent Trades</h2>
          <Link href="/dashboard/trades" className="text-sm text-[#888888] transition-colors duration-200 hover:text-[#F0F0F0]">
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#141414]">
              <tr>
                {['Date', 'Instrument', 'Direction', 'Entry', 'Exit', 'Result', 'R-Multiple', 'Emotion'].map((column) => (
                  <th
                    key={column}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.1em] text-[#555555]"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="bg-[#0C0C0C]">
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#888888]">
                    Loading trades...
                  </td>
                </tr>
              ) : recentTrades.length === 0 ? (
                <tr className="bg-[#0C0C0C]">
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#888888]">
                    No trades yet.
                  </td>
                </tr>
              ) : (
                recentTrades.map((trade, index) => (
                  <tr key={trade.id} className={index % 2 === 0 ? 'bg-[#0C0C0C]' : 'bg-[#141414]'}>
                    <td className="px-4 py-3 text-sm text-[#F0F0F0]">{formatDate(trade.trade_timestamp)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[#F0F0F0]">{trade.instrument || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={[
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                          trade.direction === 'LONG'
                            ? 'bg-[#1C1C1C] text-[#4CAF7A]'
                            : 'bg-[#1C1C1C] text-[#C0504A]',
                        ].join(' ')}
                      >
                        {trade.direction || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#F0F0F0]">{formatPrice(trade.entry_price)}</td>
                    <td className="px-4 py-3 text-sm text-[#F0F0F0]">{formatPrice(trade.exit_price)}</td>
                    <td
                      className={[
                        'px-4 py-3 text-sm font-medium',
                        trade.result === 'WIN'
                          ? 'text-[#4CAF7A]'
                          : trade.result === 'LOSS'
                            ? 'text-[#C0504A]'
                            : 'text-[#F0F0F0]',
                      ].join(' ')}
                    >
                      {trade.result || '-'}
                    </td>
                    <td
                      className={[
                        'px-4 py-3 text-sm font-medium',
                        (trade.r_multiple || 0) > 0
                          ? 'text-[#4CAF7A]'
                          : (trade.r_multiple || 0) < 0
                            ? 'text-[#C0504A]'
                            : 'text-[#F0F0F0]',
                      ].join(' ')}
                    >
                      {formatR(trade.r_multiple)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#F0F0F0]">{trade.emotion || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {error ? <p className="text-sm text-[#C0504A]">{error}</p> : null}
    </div>
  );
}

