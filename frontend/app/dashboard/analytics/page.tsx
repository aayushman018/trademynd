'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/lib/api';

type Trade = {
  id: string;
  instrument: string;
  result: string | null;
  r_multiple: number | null;
  trade_timestamp: string | null;
};

type Summary = {
  total_trades: number;
  win_rate: number;
  total_r: number;
  avg_r: number;
  best_trade: { r_multiple: number; instrument: string | null };
  worst_trade: { r_multiple: number; instrument: string | null };
  current_streak: { type: string; count: number };
};

type HourRow = { hour: number; win_rate: number; trade_count: number };
type DayRow = { day: string; net_r: number; trade_count: number };
type EmotionRow = { emotion: string; result: string; count: number };
type InstrumentRow = { instrument: string; net_r: number; trade_count: number };
type DrawdownRow = { trade_number: number; drawdown: number };
type CalendarRow = { date: string; net_r: number; trade_count: number };

const cardClass = 'rounded-lg border border-[#2A2A2A] bg-[#141414] p-5';
const labelClass = 'mb-3 text-xs uppercase tracking-[0.1em] text-[#555555]';
const tooltipStyle = {
  backgroundColor: '#1C1C1C',
  border: '1px solid #2A2A2A',
  borderRadius: 8,
  color: '#F0F0F0',
};

const EMOTION_ROWS = ['CONFIDENT', 'NEUTRAL', 'ANXIOUS', 'REVENGE', 'FOMO', 'BORED'];
const OUTCOME_COLS = ['WIN', 'LOSS', 'BREAKEVEN'];

function parseTimestamp(value: string | null): number {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatSigned(value: number, suffix = ''): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}${suffix}`;
}

function toNumeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function blendGoldScale(value: number, max: number): string {
  if (max <= 0) return '#1C1C1C';
  const ratio = Math.max(0, Math.min(1, value / max));
  const r = Math.round(28 + (201 - 28) * ratio);
  const g = Math.round(28 + (168 - 28) * ratio);
  const b = Math.round(28 + (76 - 28) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

function colorForCalendar(netR: number): string {
  if (netR === 0) return '#1C1C1C';
  if (netR > 0) {
    const alpha = Math.min(0.85, 0.2 + Math.abs(netR) * 0.16);
    return `rgba(201, 168, 76, ${alpha})`;
  }
  const alpha = Math.min(0.85, 0.2 + Math.abs(netR) * 0.16);
  return `rgba(192, 80, 74, ${alpha})`;
}

function streakStats(results: string[]): { bestWin: number; worstLoss: number } {
  let bestWin = 0;
  let worstLoss = 0;
  let currentWin = 0;
  let currentLoss = 0;

  for (const result of results) {
    if (result === 'WIN') {
      currentWin += 1;
      currentLoss = 0;
      bestWin = Math.max(bestWin, currentWin);
      continue;
    }

    if (result === 'LOSS') {
      currentLoss += 1;
      currentWin = 0;
      worstLoss = Math.max(worstLoss, currentLoss);
      continue;
    }

    currentWin = 0;
    currentLoss = 0;
  }

  return { bestWin, worstLoss };
}

function ChartNote({ text }: { text: string }) {
  return <p className="-mt-1 mb-3 text-xs text-[#888888]">{text}</p>;
}

export default function DashboardAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byHour, setByHour] = useState<HourRow[]>([]);
  const [byDay, setByDay] = useState<DayRow[]>([]);
  const [byEmotion, setByEmotion] = useState<EmotionRow[]>([]);
  const [byInstrument, setByInstrument] = useState<InstrumentRow[]>([]);
  const [drawdown, setDrawdown] = useState<DrawdownRow[]>([]);
  const [calendar, setCalendar] = useState<CalendarRow[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    let mounted = true;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      const responses = await Promise.allSettled([
        api.get('/analytics/summary'),
        api.get('/analytics/by-hour'),
        api.get('/analytics/by-day'),
        api.get('/analytics/by-emotion'),
        api.get('/analytics/by-instrument'),
        api.get('/analytics/drawdown'),
        api.get('/analytics/calendar'),
        api.get('/trades?limit=2000'),
      ]);

      if (!mounted) return;

      const hasAnySuccess = responses.some((row) => row.status === 'fulfilled');
      if (!hasAnySuccess) {
        setError('Failed to load analytics. Please refresh.');
        setLoading(false);
        return;
      }

      if (responses[0].status === 'fulfilled') setSummary(responses[0].value.data);
      if (responses[1].status === 'fulfilled') setByHour(responses[1].value.data || []);
      if (responses[2].status === 'fulfilled') setByDay(responses[2].value.data || []);
      if (responses[3].status === 'fulfilled') setByEmotion(responses[3].value.data || []);
      if (responses[4].status === 'fulfilled') setByInstrument(responses[4].value.data || []);
      if (responses[5].status === 'fulfilled') setDrawdown(responses[5].value.data || []);
      if (responses[6].status === 'fulfilled') setCalendar(responses[6].value.data || []);
      if (responses[7].status === 'fulfilled') setTrades(responses[7].value.data || []);

      setLoading(false);
    };

    fetchAnalytics();
    return () => {
      mounted = false;
    };
  }, []);

  const sortedTradesAsc = useMemo(
    () => [...trades].sort((a, b) => parseTimestamp(a.trade_timestamp) - parseTimestamp(b.trade_timestamp)),
    [trades]
  );

  const cumulativeCurve = useMemo(() => {
    let cumulative = 0;
    return sortedTradesAsc.map((trade, index) => {
      cumulative += Number(trade.r_multiple || 0);
      return {
        trade_number: index + 1,
        cumulative_r: Number(cumulative.toFixed(4)),
        above_zero: cumulative > 0 ? Number(cumulative.toFixed(4)) : 0,
        below_zero: cumulative < 0 ? Number(cumulative.toFixed(4)) : 0,
      };
    });
  }, [sortedTradesAsc]);

  const byHourPercent = useMemo(
    () =>
      byHour.map((row) => {
        const percent = row.win_rate <= 1 ? row.win_rate * 100 : row.win_rate;
        return {
          ...row,
          win_rate_percent: Number(percent.toFixed(1)),
        };
      }),
    [byHour]
  );

  const emotionMatrix = useMemo(() => {
    const map = new Map<string, number>();
    byEmotion.forEach((row) => {
      map.set(`${row.emotion}_${row.result}`, row.count);
    });
    return map;
  }, [byEmotion]);

  const emotionMaxCount = useMemo(() => {
    if (byEmotion.length === 0) return 0;
    return Math.max(...byEmotion.map((row) => row.count));
  }, [byEmotion]);

  const distribution = useMemo(() => {
    const buckets = [
      { label: '<-2', min: Number.NEGATIVE_INFINITY, max: -2, color: '#C0504A' },
      { label: '-2 to -1', min: -2, max: -1, color: '#C0504A' },
      { label: '-1 to 0', min: -1, max: 0, color: '#C0504A' },
      { label: '0 to 1', min: 0, max: 1, color: '#C9A84C' },
      { label: '1 to 2', min: 1, max: 2, color: '#C9A84C' },
      { label: '2 to 3', min: 2, max: 3, color: '#C9A84C' },
      { label: '>3', min: 3, max: Number.POSITIVE_INFINITY, color: '#C9A84C' },
    ];

    return buckets.map((bucket) => {
      const count = trades.filter((trade) => {
        const value = Number(trade.r_multiple ?? 0);
        if (bucket.label === '<-2') return value < -2;
        if (bucket.label === '>3') return value > 3;
        return value >= bucket.min && value < bucket.max;
      }).length;

      return { ...bucket, count };
    });
  }, [trades]);

  const streakData = useMemo(
    () =>
      sortedTradesAsc.map((trade) => ({
        id: trade.id,
        result: trade.result || 'BREAKEVEN',
      })),
    [sortedTradesAsc]
  );

  const streakSummary = useMemo(() => {
    const results = streakData.map((row) => row.result);
    return streakStats(results);
  }, [streakData]);

  const maxDrawdownPoint = useMemo(() => {
    if (drawdown.length === 0) return null;
    return drawdown.reduce((min, row) => (row.drawdown < min.drawdown ? row : min), drawdown[0]);
  }, [drawdown]);

  const donutData = useMemo(() => {
    if (byInstrument.length === 0) return [];
    const best = byInstrument[0]?.instrument;
    const grayPalette = ['#2F2F2F', '#3A3A3A', '#444444', '#4D4D4D', '#565656', '#616161', '#6A6A6A', '#737373'];
    return byInstrument.map((row, index) => ({
      ...row,
      fill: row.instrument === best ? '#C9A84C' : grayPalette[index % grayPalette.length],
    }));
  }, [byInstrument]);

  const calendarGrid = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    const byDate = new Map<string, CalendarRow>();
    calendar.forEach((row) => byDate.set(row.date, row));

    const cells: Array<{ date: string | null; netR: number; tradeCount: number }> = [];
    for (let i = 0; i < startOffset; i += 1) {
      cells.push({ date: null, netR: 0, tradeCount: 0 });
    }
    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(year, month, day).toISOString().slice(0, 10);
      const row = byDate.get(date);
      cells.push({
        date,
        netR: Number(row?.net_r || 0),
        tradeCount: Number(row?.trade_count || 0),
      });
    }
    return cells;
  }, [calendar]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#F0F0F0]">Analytics</h1>
        <p className="mt-1 text-sm text-[#888888]">
          Deep performance insights to sharpen decision quality.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'TOTAL TRADES', value: summary ? summary.total_trades.toLocaleString() : '0' },
          {
            label: 'WIN RATE',
            value: summary ? `${((summary.win_rate <= 1 ? summary.win_rate * 100 : summary.win_rate) as number).toFixed(1)}%` : '0%',
          },
          { label: 'TOTAL R', value: summary ? formatSigned(summary.total_r, 'R') : '0.00R' },
          { label: 'AVG R', value: summary ? formatSigned(summary.avg_r, 'R') : '0.00R' },
        ].map((metric) => (
          <div key={metric.label} className={cardClass}>
            <p className="text-3xl font-semibold text-[#C9A84C]">{metric.value}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.1em] text-[#555555]">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section className={`${cardClass} xl:col-span-12`}>
          <p className={labelClass}>CUMULATIVE R-MULTIPLE CURVE</p>
          <ChartNote text="Use this like an equity curve: rising means your edge is compounding, flat or falling means review recent execution mistakes." />
          <div className="h-[320px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-[#888888]">Loading chart...</div>
            ) : cumulativeCurve.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#888888]">No trades yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeCurve}>
                  <defs>
                    <linearGradient id="aboveCurve" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="belowCurve" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.06} />
                      <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#2A2A2A" />
                  <XAxis dataKey="trade_number" stroke="#555555" tick={{ fill: '#888888', fontSize: 11 }} />
                  <YAxis stroke="#555555" tick={{ fill: '#888888', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <ReferenceLine y={0} stroke="#3A3A3A" />
                  <Area type="monotone" dataKey="above_zero" stroke="none" fill="url(#aboveCurve)" />
                  <Area type="monotone" dataKey="below_zero" stroke="none" fill="url(#belowCurve)" />
                  <Area type="monotone" dataKey="cumulative_r" stroke="#C9A84C" strokeWidth={2.2} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className={`${cardClass} xl:col-span-6`}>
          <p className={labelClass}>WIN RATE BY HOUR OF DAY</p>
          <ChartNote text="Trade heavier in hours above 50% and reduce risk in hours that stay below 50% over time." />
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byHourPercent}>
                <CartesianGrid stroke="#2A2A2A" />
                <XAxis dataKey="hour" stroke="#555555" tick={{ fill: '#888888', fontSize: 10 }} />
                <YAxis stroke="#555555" tick={{ fill: '#888888', fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${toNumeric(value)}%`} />
                <ReferenceLine y={50} stroke="#3A3A3A" strokeDasharray="4 4" />
                <Bar dataKey="win_rate_percent" radius={[4, 4, 0, 0]}>
                  {byHourPercent.map((entry) => {
                    const distance = Math.min(1, Math.abs(entry.win_rate_percent - 50) / 50);
                    const alpha = 0.3 + distance * 0.7;
                    const fill =
                      entry.win_rate_percent >= 50
                        ? `rgba(76, 175, 122, ${alpha.toFixed(2)})`
                        : `rgba(192, 80, 74, ${alpha.toFixed(2)})`;
                    return <Cell key={`hour-${entry.hour}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={`${cardClass} xl:col-span-6`}>
          <p className={labelClass}>PERFORMANCE BY DAY OF WEEK</p>
          <ChartNote text="Shows which weekdays pay you; prioritize top days and tighten rules on weak days." />
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDay} layout="vertical" margin={{ right: 24 }}>
                <CartesianGrid stroke="#2A2A2A" />
                <XAxis type="number" stroke="#555555" tick={{ fill: '#888888', fontSize: 11 }} />
                <YAxis dataKey="day" type="category" stroke="#555555" tick={{ fill: '#888888', fontSize: 11 }} width={72} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${formatSigned(toNumeric(value), 'R')}`} />
                <Bar dataKey="net_r" radius={[0, 4, 4, 0]}>
                  {byDay.map((row) => (
                    <Cell key={`day-${row.day}`} fill={row.net_r >= 0 ? '#C9A84C' : '#C0504A'} />
                  ))}
                  <LabelList
                    dataKey="net_r"
                    position="right"
                    fill="#F0F0F0"
                    formatter={(value) => formatSigned(toNumeric(value), 'R')}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={`${cardClass} xl:col-span-6`}>
          <p className={labelClass}>EMOTION VS OUTCOME HEATMAP</p>
          <ChartNote text="Find emotions that cluster with losses, then apply a checklist or cooldown before entering trades in those states." />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="pb-2 text-left text-xs uppercase tracking-[0.1em] text-[#555555]">Emotion</th>
                  {OUTCOME_COLS.map((col) => (
                    <th key={col} className="pb-2 text-center text-xs uppercase tracking-[0.1em] text-[#555555]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EMOTION_ROWS.map((emotion) => (
                  <tr key={emotion}>
                    <td className="py-2 text-xs text-[#888888]">{emotion}</td>
                    {OUTCOME_COLS.map((result) => {
                      const count = emotionMatrix.get(`${emotion}_${result}`) || 0;
                      return (
                        <td key={`${emotion}-${result}`} className="px-1 py-1">
                          <div
                            className="flex h-10 items-center justify-center rounded border border-[#2A2A2A] text-xs text-[#F0F0F0]"
                            style={{ backgroundColor: blendGoldScale(count, emotionMaxCount) }}
                          >
                            {count}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${cardClass} xl:col-span-6`}>
          <p className={labelClass}>DRAWDOWN CHART</p>
          <ChartNote text="This shows pain from your peak; use max drawdown to set daily/weekly stop-loss limits." />
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdown}>
                <CartesianGrid stroke="#2A2A2A" />
                <XAxis dataKey="trade_number" stroke="#555555" tick={{ fill: '#888888', fontSize: 11 }} />
                <YAxis stroke="#555555" tick={{ fill: '#888888', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatSigned(toNumeric(value), 'R')} />
                <Area type="monotone" dataKey="drawdown" stroke="#C0504A" fill="rgba(192,80,74,0.15)" strokeWidth={2} />
                {maxDrawdownPoint ? (
                  <ReferenceLine
                    x={maxDrawdownPoint.trade_number}
                    stroke="#C0504A"
                    strokeDasharray="4 4"
                    label={{
                      value: `Max ${formatSigned(maxDrawdownPoint.drawdown, 'R')}`,
                      position: 'insideTopRight',
                      fill: '#C0504A',
                      fontSize: 10,
                    }}
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={`${cardClass} xl:col-span-6`}>
          <p className={labelClass}>R-MULTIPLE DISTRIBUTION</p>
          <ChartNote text="You want more trades on the right side (>0R); left-heavy results mean exits, entries, or risk/reward need adjustment." />
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution}>
                <CartesianGrid stroke="#2A2A2A" />
                <XAxis dataKey="label" stroke="#555555" tick={{ fill: '#888888', fontSize: 10 }} />
                <YAxis stroke="#555555" tick={{ fill: '#888888', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distribution.map((bucket) => (
                    <Cell key={`bucket-${bucket.label}`} fill={bucket.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={`${cardClass} xl:col-span-12`}>
          <p className={labelClass}>INSTRUMENT BREAKDOWN</p>
          <ChartNote text="Keep focus on instruments with positive net R and cut exposure to symbols that consistently drag performance." />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-[320px] rounded-md border border-[#2A2A2A] bg-[#141414] p-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Pie data={donutData} dataKey="trade_count" nameKey="instrument" innerRadius={64} outerRadius={104}>
                    {donutData.map((entry) => (
                      <Cell key={`pie-${entry.instrument}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[320px] rounded-md border border-[#2A2A2A] bg-[#141414] p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byInstrument} layout="vertical" margin={{ right: 26 }}>
                  <CartesianGrid stroke="#2A2A2A" />
                  <XAxis type="number" stroke="#555555" tick={{ fill: '#888888', fontSize: 10 }} />
                  <YAxis dataKey="instrument" type="category" width={76} stroke="#555555" tick={{ fill: '#888888', fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${formatSigned(toNumeric(value), 'R')}`} />
                  <Bar dataKey="net_r" radius={[0, 4, 4, 0]}>
                    {byInstrument.map((row) => (
                      <Cell key={`instrument-${row.instrument}`} fill={row.net_r >= 0 ? '#C9A84C' : '#C0504A'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className={`${cardClass} xl:col-span-12`}>
          <p className={labelClass}>STREAK TRACKER</p>
          <ChartNote text="Use streak behavior to enforce discipline rules, like cooldowns after loss streaks and size control after win streaks." />
          <div className="rounded-md border border-[#2A2A2A] bg-[#0C0C0C] p-3">
            <div className="flex flex-wrap gap-1">
              {streakData.length === 0 ? (
                <p className="text-sm text-[#888888]">No trades yet.</p>
              ) : (
                streakData.map((row) => {
                  const color = row.result === 'WIN' ? '#4CAF7A' : row.result === 'LOSS' ? '#C0504A' : '#555555';
                  return (
                    <span
                      key={row.id}
                      className="inline-block h-3.5 w-3.5 rounded-[2px] border border-[#2A2A2A]"
                      style={{ backgroundColor: color }}
                      title={row.result}
                    />
                  );
                })
              )}
            </div>
            <div className="mt-3 text-xs text-[#888888]">
              Best Win Streak: {streakSummary.bestWin} 🔥 | Worst Loss Streak: {streakSummary.worstLoss}
            </div>
          </div>
        </section>

        <section className={`${cardClass} xl:col-span-12`}>
          <p className={labelClass}>MONTHLY P&L CALENDAR</p>
          <ChartNote text="Review good and bad days to identify repeatable habits by day/session and avoid low-quality trading days." />
          <div className="grid grid-cols-7 gap-2">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
              <p key={day} className="text-center text-[10px] uppercase tracking-[0.1em] text-[#555555]">
                {day}
              </p>
            ))}
            {calendarGrid.map((cell, index) => (
              <div
                key={`${cell.date || 'blank'}-${index}`}
                className="min-h-[64px] rounded-md border border-[#2A2A2A] p-2 text-xs"
                style={{ backgroundColor: cell.date ? colorForCalendar(cell.netR) : '#141414' }}
                title={
                  cell.date
                    ? `${cell.date} | Net R ${formatSigned(cell.netR, 'R')} | Trades ${cell.tradeCount}`
                    : undefined
                }
              >
                {cell.date ? (
                  <>
                    <p className="text-[#F0F0F0]">{new Date(cell.date).getDate()}</p>
                    <p className="mt-1 text-[10px] text-[#F0F0F0]">{cell.tradeCount > 0 ? formatSigned(cell.netR, 'R') : '-'}</p>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>

      {error ? <p className="text-sm text-[#C0504A]">{error}</p> : null}
    </div>
  );
}
