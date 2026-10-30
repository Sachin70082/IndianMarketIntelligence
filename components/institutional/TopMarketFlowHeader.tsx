'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Compass, Search, Filter } from 'lucide-react';
import { SectorScreeningSummary } from '@/lib/institutional/types';

interface TopMarketFlowHeaderProps {
  leadingSector?: SectorScreeningSummary | null;
  laggingSector?: SectorScreeningSummary | null;
  bullishCount: number;
  bearishCount: number;
  totalScanned: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedExchange: 'ALL' | 'NSE' | 'BSE';
  onExchangeChange: (ex: 'ALL' | 'NSE' | 'BSE') => void;
  onOpenSearchModal?: () => void;
}

export function TopMarketFlowHeader({
  leadingSector,
  laggingSector,
  bullishCount,
  bearishCount,
  totalScanned,
  searchQuery,
  onSearchChange,
  selectedExchange,
  onExchangeChange,
}: TopMarketFlowHeaderProps) {
  // Generate sample distribution dots for the visual timeline meter
  const meterDots = [
    { pos: 10, val: -3.8, active: false },
    { pos: 18, val: -2.5, active: true },
    { pos: 25, val: -1.8, active: true },
    { pos: 35, val: -0.9, active: true },
    { pos: 42, val: -0.3, active: false },
    { pos: 48, val: -0.1, active: true },
    { pos: 50, val: 0.0, center: true },
    { pos: 53, val: 0.2, active: true },
    { pos: 60, val: 0.8, active: true },
    { pos: 68, val: 1.4, active: true },
    { pos: 76, val: 2.2, active: true },
    { pos: 85, val: 3.1, active: true },
    { pos: 92, val: 3.9, active: false },
  ];

  const leadName = leadingSector?.sectorName || 'REALTY';
  const leadPct = leadingSector ? `+${leadingSector.sectorTrendPct.toFixed(2)}%` : '+1.12%';
  const lagName = laggingSector?.sectorName || 'PHARMA';
  const lagPct = laggingSector ? `${laggingSector.sectorTrendPct.toFixed(2)}%` : '-0.68%';

  return (
    <div className="w-full bg-[#04070e] border-b border-slate-800/90 px-3 sm:px-6 py-2.5 flex flex-col xl:flex-row items-center justify-between gap-3 text-xs font-mono select-none">
      {/* Left: Lagging & Leading Sector Pills */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 shrink-0 w-full xl:w-auto justify-between xl:justify-start">
        {/* Lagging Sector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-sans font-semibold tracking-wider text-slate-400 uppercase">
            LAGGING SECTOR
          </span>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-950/40 border border-rose-500/30 text-rose-400 font-bold shadow-[0_0_12px_rgba(244,63,94,0.15)]">
            <span>{lagName.toUpperCase()}</span>
            <span>{lagPct}</span>
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
          </div>
        </div>

        {/* Center Meter: Glowing Particle Distribution Bar */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-950/80 rounded-full border border-slate-800/80 w-64 lg:w-80 relative overflow-hidden">
          <span className="text-[9px] text-rose-400 font-bold shrink-0">-4%</span>
          <div className="relative flex-1 h-3 flex items-center">
            {/* Center Axis */}
            <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-rose-500/40 via-slate-600 to-emerald-500/40" />
            <div className="absolute left-1/2 -top-1 bottom-0 w-[1px] bg-slate-400 z-10" />
            
            {/* Dots */}
            {meterDots.map((dot, idx) => (
              <span
                key={idx}
                style={{ left: `${dot.pos}%` }}
                className={`absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 ${
                  dot.center
                    ? 'w-2 h-2 bg-white shadow-[0_0_8px_#ffffff]'
                    : dot.val > 0
                    ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                    : 'bg-rose-400 shadow-[0_0_6px_#f43f5e]'
                } ${dot.active ? 'opacity-90' : 'opacity-30'}`}
              />
            ))}
          </div>
          <span className="text-[9px] text-emerald-400 font-bold shrink-0">+4%</span>
        </div>

        {/* Leading Sector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-sans font-semibold tracking-wider text-slate-400 uppercase">
            LEADING SECTOR
          </span>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-bold shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <span>{leadName.toUpperCase()}</span>
            <span>{leadPct}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Center/Right: Stock Search & Exchange Switcher */}
      <div className="flex items-center gap-2 w-full xl:w-auto justify-between xl:justify-end">
        {/* Search Input */}
        <div className="relative flex-1 sm:w-64 xl:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search 5,700+ NSE/BSE stocks..."
            className="w-full bg-[#0a0f1c] border border-slate-800 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-cyan-500 font-sans transition-all placeholder:text-slate-500"
          />
        </div>

        {/* Exchange Filter */}
        <div className="flex items-center bg-[#0a0f1c] border border-slate-800 rounded-lg p-0.5">
          {(['ALL', 'NSE', 'BSE'] as const).map((ex) => (
            <button
              key={ex}
              onClick={() => onExchangeChange(ex)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                selectedExchange === ex
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Bullish / Bearish Market Totals */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800 shrink-0">
          <div className="flex items-center gap-1 text-emerald-400 font-extrabold text-sm">
            <span className="text-[10px] text-emerald-500/80">▲ BULLISH</span>
            <span className="text-base tracking-tight">{bullishCount}</span>
          </div>
          <div className="flex items-center gap-1 text-rose-400 font-extrabold text-sm">
            <span className="text-[10px] text-rose-500/80">▼ BEARISH</span>
            <span className="text-base tracking-tight">{bearishCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

