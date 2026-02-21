'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';

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

type TradeFormState = {
  instrument: string;
  direction: 'LONG' | 'SHORT';
  entry_price: string;
  exit_price: string;
  result: 'WIN' | 'LOSS' | 'BREAK_EVEN';
  r_multiple: string;
  emotion: string;
  trade_timestamp: string;
};

const PAGE_SIZE = 12;

function fmtDate(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function fmtNumber(value: number | null): string {
  if (value === null || Number.isNaN(Number(value))) return '-';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function fmtPrice(value: number | null): string {
  if (value === null || Number.isNaN(Number(value))) return '-';
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export default function DashboardTradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [instrumentFilter, setInstrumentFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [resultFilter, setResultFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [savingTrade, setSavingTrade] = useState(false);
  const [tradeForm, setTradeForm] = useState<TradeFormState>({
    instrument: '',
    direction: 'LONG',
    entry_price: '',
    exit_price: '',
    result: 'WIN',
    r_multiple: '',
    emotion: '',
    trade_timestamp: '',
  });

  const fetchTrades = async () => {
    try {
      const response = await api.get('/trades?limit=500');
      setTrades(response.data || []);
      setError(null);
    } catch {
      setError('Failed to load trades.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const instrumentMatch = trade.instrument
        ?.toLowerCase()
        .includes(instrumentFilter.trim().toLowerCase());

      const directionMatch = directionFilter === 'ALL' || trade.direction === directionFilter;
      const resultMatch = resultFilter === 'ALL' || trade.result === resultFilter;

      const dateValue = trade.trade_timestamp ? new Date(trade.trade_timestamp) : null;
      const fromMatch = !fromDate || (dateValue ? dateValue >= new Date(fromDate) : false);
      const toMatch = !toDate || (dateValue ? dateValue <= new Date(`${toDate}T23:59:59`) : false);

      return Boolean(instrumentMatch && directionMatch && resultMatch && fromMatch && toMatch);
    });
  }, [directionFilter, fromDate, instrumentFilter, resultFilter, toDate, trades]);

  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageTrades = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTrades.slice(start, start + PAGE_SIZE);
  }, [filteredTrades, page]);

  const handleSaveTrade = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tradeForm.instrument.trim()) {
      setError('Instrument is required.');
      return;
    }

    setSavingTrade(true);
    setError(null);

    try {
      await api.post('/trades', {
        instrument: tradeForm.instrument.trim().toUpperCase(),
        direction: tradeForm.direction,
        entry_price: tradeForm.entry_price ? Number(tradeForm.entry_price) : null,
        exit_price: tradeForm.exit_price ? Number(tradeForm.exit_price) : null,
        result: tradeForm.result,
        r_multiple: tradeForm.r_multiple ? Number(tradeForm.r_multiple) : null,
        emotion: tradeForm.emotion.trim() || null,
        trade_timestamp: tradeForm.trade_timestamp || null,
      });

      setShowModal(false);
      setTradeForm({
        instrument: '',
        direction: 'LONG',
        entry_price: '',
        exit_price: '',
        result: 'WIN',
        r_multiple: '',
        emotion: '',
        trade_timestamp: '',
      });
      setLoading(true);
      await fetchTrades();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to add trade. Please review your input and try again.');
    } finally {
      setSavingTrade(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#F0F0F0]">Trade History</h1>
          <p className="mt-1 text-sm text-[#888888]">Review and filter every logged trade.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-black transition-colors duration-200 hover:bg-[#E8C97A] active:bg-[#8A6D2F]"
          onClick={() => setShowModal(true)}
        >
          <Plus className="h-4 w-4" />
          Add Trade
        </button>
      </div>

      <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <input
            value={instrumentFilter}
            onChange={(event) => {
              setInstrumentFilter(event.target.value);
              setPage(1);
            }}
            placeholder="Instrument"
            className="h-10 rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 text-sm text-[#F0F0F0] outline-none transition-colors duration-200 placeholder:text-[#555555] focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/25"
          />

          <select
            value={directionFilter}
            onChange={(event) => {
              setDirectionFilter(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 text-sm text-[#F0F0F0] outline-none transition-colors duration-200 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/25"
          >
            <option value="ALL">Direction: All</option>
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>

          <select
            value={resultFilter}
            onChange={(event) => {
              setResultFilter(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 text-sm text-[#F0F0F0] outline-none transition-colors duration-200 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/25"
          >
            <option value="ALL">Result: All</option>
            <option value="WIN">WIN</option>
            <option value="LOSS">LOSS</option>
            <option value="BREAK_EVEN">BREAK_EVEN</option>
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 text-sm text-[#F0F0F0] outline-none transition-colors duration-200 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/25"
          />
          <input
            type="date"
            value={toDate}
            onChange={(event) => {
              setToDate(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 text-sm text-[#F0F0F0] outline-none transition-colors duration-200 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/25"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#2A2A2A]">
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
              ) : pageTrades.length === 0 ? (
                <tr className="bg-[#0C0C0C]">
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#888888]">
                    No trades match your filters.
                  </td>
                </tr>
              ) : (
                pageTrades.map((trade, index) => (
                  <tr key={trade.id} className={index % 2 === 0 ? 'bg-[#0C0C0C]' : 'bg-[#141414]'}>
                    <td className="px-4 py-3 text-sm text-[#F0F0F0]">{fmtDate(trade.trade_timestamp)}</td>
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
                    <td className="px-4 py-3 text-sm text-[#F0F0F0]">{fmtPrice(trade.entry_price)}</td>
                    <td className="px-4 py-3 text-sm text-[#F0F0F0]">{fmtPrice(trade.exit_price)}</td>
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
                      {fmtNumber(trade.r_multiple)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#F0F0F0]">{trade.emotion || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#888888]">
          Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filteredTrades.length)} of {filteredTrades.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-md border border-[#2A2A2A] bg-[#141414] px-3 py-1.5 text-sm text-[#F0F0F0] transition-colors duration-200 hover:border-[#3A3A3A] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-[#888888]">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="rounded-md border border-[#2A2A2A] bg-[#141414] px-3 py-1.5 text-sm text-[#F0F0F0] transition-colors duration-200 hover:border-[#3A3A3A] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-[#C0504A]">{error}</p> : null}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xl rounded-lg border border-[#2A2A2A] bg-[#1C1C1C] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#F0F0F0]">Add Trade</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-sm text-[#888888] transition-colors duration-200 hover:text-[#F0F0F0]"
              >
                Close
              </button>
            </div>

            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSaveTrade}>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-[#555555]">Instrument</label>
                <input
                  value={tradeForm.instrument}
                  onChange={(event) => setTradeForm((prev) => ({ ...prev, instrument: event.target.value }))}
                  placeholder="XAUUSD"
                  className="h-10 w-full rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 text-sm text-[#F0F0F0] outline-none transition-colors duration-200 placeholder:text-[#555555] focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/25"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-[#555555]">Direction</label>
                <select
                  value={tradeForm.direction}
                  onChange={(event) =>
                    setTradeForm((prev) => ({ ...prev, direction: event.target.value as 'LONG' | 'SHORT' }))
                  }
                  className="h-10 w-full rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 text-sm text-[#F0F0F0] outline-none transition-colors duration-200 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/25"
                >
                  <option value="LONG">LONG</option>
                  <option value="SHORT">SHORT</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-[#555555]">Result</label>
                <select
                  value={tradeForm.result}
                  onChange={(event) =>
                    setTradeForm((prev) => ({
                      ...prev,
                      result: event.target.value as 'WIN' | 'LOSS' | 'BREAK_EVEN',
                    }))
                  }
                  className="h-10 w-full rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 text-sm text-[#F0F0F0] outline-none transition-colors duration-200 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/25"
                >
                  <option value="WIN">WIN</option>
                  <option value="LOSS">LOSS</option>
                  <option value="BREAK_EVEN">BREAK_EVEN</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-[#555555]">Entry Price</label>
                <input
                  type="number"
                  step="0.0001"
                  value={tradeForm.entry_price}
                  onChange={(event) => setTradeForm((prev) => ({ ...prev, entry_price: event.target.value }))}
                  className="h-10 w-full rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 text-sm text-[#F0F0F0] outline-none transition-colors duration-200 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/25"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-[#555555]">Exit Price</label>
                <input
                  type="number"
                  step="0.0001"
                  value={tradeForm.exit_price}
                  onChange={(event) => setTradeForm((prev) => ({ ...prev, exit_price: event.target.value }))}
                  className="h-10 w-full rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 text-sm text-[#F0F0F0] outline-none transition-colors duration-200 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/25"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-[#555555]">R-Multiple</label>
                <input
                  type="number"
                  step="0.01"
                  value={tradeForm.r_multiple}
                  onChange={(event) => setTradeForm((prev) => ({ ...prev, r_multiple: event.target.value }))}
                  className="h-10 w-full rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 text-sm text-[#F0F0F0] outline-none transition-colors duration-200 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/25"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-[#555555]">Emotion</label>
                <input
                  value={tradeForm.emotion}
                  onChange={(event) => setTradeForm((prev) => ({ ...prev, emotion: event.target.value }))}
                  placeholder="Calm"
                  className="h-10 w-full rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 text-sm text-[#F0F0F0] outline-none transition-colors duration-200 placeholder:text-[#555555] focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/25"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-[#555555]">Trade Time</label>
                <input
                  type="datetime-local"
                  value={tradeForm.trade_timestamp}
                  onChange={(event) => setTradeForm((prev) => ({ ...prev, trade_timestamp: event.target.value }))}
                  className="h-10 w-full rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 text-sm text-[#F0F0F0] outline-none transition-colors duration-200 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/25"
                />
              </div>

              <div className="md:col-span-2 mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-4 py-2 text-sm text-[#F0F0F0] transition-colors duration-200 hover:border-[#3A3A3A]"
                  onClick={() => setShowModal(false)}
                  disabled={savingTrade}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-black transition-colors duration-200 hover:bg-[#E8C97A] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={savingTrade}
                >
                  {savingTrade ? 'Saving...' : 'Save Trade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
