'use client';

import React, { useState } from 'react';
import { LargeOrderEvent } from '@/lib/institutional/types';

interface LargeOrdersFeedProps {
  orders: LargeOrderEvent[];
  onSelectStock?: (symbol: string) => void;
}

export default function LargeOrdersFeed({
  orders,
  onSelectStock,
}: LargeOrdersFeedProps) {
  const [filterType, setFilterType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [minCr, setMinCr] = useState<number>(0);

  const filteredOrders = orders.filter((o) => {
    const isBuy = o.pressure.includes('BUY');
    const isSell = o.pressure.includes('SELL');
    if (filterType === 'BUY' && !isBuy) return false;
    if (filterType === 'SELL' && !isSell) return false;
    if (minCr > 0 && o.orderValueCrores < minCr) return false;
    return true;
  });

  return (
    <div className="bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              Institutional Large Order & Block Scanner
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              LIVE RADAR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Detects institutional block clips, abnormal ₹ value turnover, and high-delivery accumulation sweeps
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 text-xs">
          {/* Pressure filter */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                filterType === 'ALL'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('BUY')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                filterType === 'BUY'
                  ? 'bg-emerald-600/80 text-white'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              Buy Pressure
            </button>
            <button
              onClick={() => setFilterType('SELL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                filterType === 'SELL'
                  ? 'bg-rose-600/80 text-white'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              Sell Pressure
            </button>
          </div>

          {/* Min Cr Selector */}
          <select
            value={minCr}
            onChange={(e) => setMinCr(Number(e.target.value))}
            aria-label="Filter by minimum order value in Crores"
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-mono text-xs"
          >
            <option value={0}>All Sizes</option>
            <option value={10}>&gt; ₹10 Cr</option>
            <option value={25}>&gt; ₹25 Cr</option>
            <option value={50}>&gt; ₹50 Cr</option>
            <option value={100}>&gt; ₹100 Cr</option>
          </select>
        </div>
      </div>

      {/* Disclaimers & Transparency Notice */}
      <div className="my-3 px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-semibold">ℹ️ Data Attribution:</span>
          <span>
            Identifies confirmed exchange trades with abnormal tick volume &gt;2.5x 20-period average. Block deals verified via exchange feed.
          </span>
        </div>
        <span className="font-mono text-slate-500 hidden md:inline">Showing {filteredOrders.length} events</span>
      </div>

      {/* Orders List / Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 text-slate-400 text-[11px] font-medium uppercase tracking-wider">
              <th className="py-2.5 px-3">Time</th>
              <th className="py-2.5 px-3">Stock / Exch</th>
              <th className="py-2.5 px-3 text-right">LTP</th>
              <th className="py-2.5 px-3 text-right">Traded Value</th>
              <th className="py-2.5 px-3 text-right">Volume (Qty)</th>
              <th className="py-2.5 px-3 text-right">RVOL</th>
              <th className="py-2.5 px-3 text-right">Est Delivery %</th>
              <th className="py-2.5 px-3 text-center">Pressure</th>
              <th className="py-2.5 px-3 text-center">Inst. Score</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500 font-mono">
                  No large institutional orders matching current filter criteria.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const isBuy = order.pressure.includes('BUY');
                return (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectStock?.(order.symbol)}
                  >
                    {/* Time */}
                    <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                      {order.timeIst}
                    </td>

                    {/* Stock Symbol & Exchange */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                          {order.symbol}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700/60">
                          {order.exchange}
                        </span>
                      </div>
                    </td>

                    {/* LTP & Change */}
                    <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                      <div className="font-bold text-white">₹{order.ltp.toFixed(2)}</div>
                      <div
                        className={`text-[10px] font-bold ${
                          order.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {order.changePct >= 0 ? '+' : ''}
                        {order.changePct.toFixed(2)}%
                      </div>
                    </td>

                    {/* Traded Value in Cr */}
                    <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap text-cyan-300">
                      ₹{order.orderValueCrores.toFixed(2)} Cr
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-3 text-right font-mono text-slate-300 whitespace-nowrap">
                      {order.volume.toLocaleString('en-IN')}
                    </td>

                    {/* RVOL */}
                    <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          order.rvol >= 4
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : order.rvol >= 2.5
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'text-slate-400'
                        }`}
                      >
                        {order.rvol.toFixed(1)}x
                      </span>
                    </td>

                    {/* Delivery % */}
                    <td className="py-3 px-3 text-right font-mono whitespace-nowrap text-slate-300">
                      <span className="font-bold text-emerald-400">{order.deliveryPct}%</span>
                    </td>

                    {/* Pressure */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                          isBuy
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isBuy ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        {order.pressure.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="py-3 px-3 text-center font-mono whitespace-nowrap">
                      <span className="font-extrabold text-amber-300">{order.largeOrderScore}</span>
                      <span className="text-[10px] text-slate-500">/100</span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStock?.(order.symbol);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 font-mono text-[11px] border border-slate-700 transition-all"
                      >
                        Chart ↗
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
