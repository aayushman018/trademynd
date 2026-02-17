'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DashboardLayout from '../dashboard/layout';

interface Trade {
  id: string;
  instrument: string;
  direction: string;
  entry_price: number;
  exit_price: number;
  result: string;
  r_multiple: number;
  trade_timestamp: string;
  emotion: string;
}

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await api.get('/trades?limit=100');
        setTrades(response.data);
      } catch (error) {
        console.error('Failed to fetch trades', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Trade History</h1>

        <div className="flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Instrument
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Direction
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entry / Exit
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Result
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        R
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trades.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                No trades found. Start logging via Telegram!
                            </td>
                        </tr>
                    ) : (
                        trades.map((trade) => (
                        <tr key={trade.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {trade.trade_timestamp ? new Date(trade.trade_timestamp).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {trade.instrument}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                trade.direction === 'LONG' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {trade.direction}
                            </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {trade.entry_price} / {trade.exit_price}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                trade.result === 'WIN' ? 'bg-green-100 text-green-800' : 
                                trade.result === 'LOSS' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                                {trade.result}
                            </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {trade.r_multiple}
                            </td>
                        </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
