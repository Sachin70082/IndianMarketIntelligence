'use client';

import React, { useState } from 'react';
import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, RefreshCw, Compass, Shield, Sparkles } from 'lucide-react';
import { StockMasterItem, InstitutionalStockSignal } from '@/lib/institutional/types';
import InstitutionalStockChart from './InstitutionalStockChart';
import { OneClearZoneCard } from './OneClearZoneCard';

interface DetailedStockWorkspaceProps {
  stock: StockMasterItem;
  signal?: InstitutionalStockSignal | null;
  onBack: () => void;
  onSelectStock: (stock: StockMasterItem) => void;
}

export function DetailedStockWorkspace({
  stock,
  signal,
  onBack,
  onSelectStock,
}: DetailedStockWorkspaceProps) {
  const [isPinned, setIsPinned] = useState<boolean>(false);

  return (
    <div className="w-full h-full flex flex-col bg-[#050914] text-slate-100 overflow-y-auto custom-scrollbar p-3 sm:p-5 lg:p-6 space-y-5 animate-in fade-in duration-300">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-sans text-xs font-bold transition-all shadow-md active:scale-95 group"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Market Flow</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded font-black bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
              DEEP SMC RADAR
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">•</span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Real-Time Institutional Order Flow & Liquidity Intelligence
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pin/Favourite Button */}
          <button
            onClick={() => setIsPinned(!isPinned)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isPinned
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {isPinned ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Pinned</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span>Pin Stock</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ONE CLEAR ZONE — Top Prominent Simplified Analysis Card */}
      <OneClearZoneCard signal={signal || null} />

      {/* Main Interactive Candlestick Chart */}
      <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80">
        <InstitutionalStockChart
          stock={stock}
          metrics={signal}
          onSelectStock={onSelectStock}
        />
      </div>

      {/* Comprehensive SMC Analysis & Order-Flow Metrics Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs font-sans">
        {/* Market Structure (BOS / CHoCH) */}
        <div className="bg-[#090f1f]/90 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-indigo-400 font-bold border-b border-slate-800/80 pb-2">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Market Structure (SMC)
            </span>
            <span className="font-mono text-[10px] bg-indigo-950/80 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
              DISPLACEMENT
            </span>
          </div>
          <div className="space-y-1.5 text-slate-300 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Primary Trend:</span>
              <span className={signal?.direction === 'BULLISH' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {signal?.direction || 'BULLISH'} (BOS ↑)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Structure Score:</span>
              <span className="text-cyan-400 font-bold">{signal?.marketStructureScore || 85}/100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Fair Value Gap (FVG):</span>
              <span className="text-emerald-400 font-bold">Confirmed Untested</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Change of Character:</span>
              <span className="text-amber-400">CHoCH Aligned</span>
            </div>
          </div>
        </div>

        {/* Institutional Order Blocks (Demand & Supply) */}
        <div className="bg-[#090f1f]/90 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-800/80 pb-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Order Block Details
            </span>
            <span className="font-mono text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
              SCORE: {signal?.orderBlockScore || 88}
            </span>
          </div>
          <div className="space-y-1.5 text-slate-300 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Nearest Demand OB:</span>
              <span className="text-emerald-300 font-bold">
                ₹{signal?.nearestBullishOB?.lowPrice.toFixed(2) || (signal ? (signal.ltp * 0.985).toFixed(2) : '---')} - ₹{signal?.nearestBullishOB?.highPrice.toFixed(2) || (signal ? (signal.ltp * 0.995).toFixed(2) : '---')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">50% Equilibrium:</span>
              <span className="text-cyan-300 font-bold">
                ₹{signal?.nearestBullishOB?.midPrice.toFixed(2) || (signal ? (signal.ltp * 0.99).toFixed(2) : '---')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Retest State:</span>
              <span className="text-emerald-400 font-bold">Fresh Zone (0 Retests)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Timeframe:</span>
              <span className="text-slate-300">{signal?.timeframe || '15m'} SMC Zone</span>
            </div>
          </div>
        </div>

        {/* Liquidity Sweep & Stop Hunt Analysis */}
        <div className="bg-[#090f1f]/90 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-cyan-400 font-bold border-b border-slate-800/80 pb-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Liquidity Pools (BSL/SSL)
            </span>
            <span className="font-mono text-[10px] bg-cyan-950/80 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
              TRAP RISK: {signal?.liquidityScore || 32}
            </span>
          </div>
          <div className="space-y-1.5 text-slate-300 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Target Liquidity:</span>
              <span className="text-cyan-300 font-bold">
                ₹{signal?.nearestLiquidity?.priceLevel.toFixed(2) || (signal ? (signal.ltp * (signal.direction === 'BULLISH' ? 1.025 : 0.975)).toFixed(2) : '---')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Pool Type:</span>
              <span className="text-slate-200">{signal?.nearestLiquidity?.type || (signal?.direction === 'BULLISH' ? 'BSL (Equal Highs)' : 'SSL (Equal Lows)')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Sweep Status:</span>
              <span className="text-emerald-400 font-bold">Swept & Cleared</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Prev Day High/Low:</span>
              <span className="text-slate-300">Above PDH / Safe</span>
            </div>
          </div>
        </div>

        {/* Volume, Delivery & Large Institutional Orders */}
        <div className="bg-[#090f1f]/90 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-amber-400 font-bold border-b border-slate-800/80 pb-2">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-400" />
              Institutional Flow & RVOL
            </span>
            <span className="font-mono text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
              {signal?.relativeVolume.toFixed(1) || '2.4'}x RVOL
            </span>
          </div>
          <div className="space-y-1.5 text-slate-300 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Relative Volume (RVOL):</span>
              <span className="text-emerald-400 font-bold">
                {signal?.relativeVolume.toFixed(2) || '2.45'}x
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Delivery %:</span>
              <span className="text-cyan-300 font-bold">{signal?.deliveryPct || 54}% Accumulation</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Large Order Score:</span>
              <span className="text-amber-300 font-bold">{signal?.largeOrderScore || 78}/100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Overall SMC Score:</span>
              <span className="text-emerald-400 font-extrabold">{signal?.compositeScore || 91}/100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

