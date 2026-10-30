'use client';

import React from 'react';
import { SectorScreeningSummary } from '@/lib/institutional/types';

interface SectorFlowListProps {
  sectors: SectorScreeningSummary[];
  selectedSector: string;
  onSelectSector: (sector: string) => void;
}

export function SectorFlowList({
  sectors,
  selectedSector,
  onSelectSector,
}: SectorFlowListProps) {
  // Split into positive (green) and negative (red) sectors sorted by trend percentage
  const positiveSectors = sectors
    .filter((s) => s.sectorTrendPct >= 0)
    .sort((a, b) => b.sectorTrendPct - a.sectorTrendPct);

  const negativeSectors = sectors
    .filter((s) => s.sectorTrendPct < 0)
    .sort((a, b) => a.sectorTrendPct - b.sectorTrendPct);

  return (
    <div className="relative flex h-full select-none bg-[#050811] border-r border-slate-800/80 w-full sm:w-[220px] lg:w-[240px] shrink-0 overflow-y-auto custom-scrollbar">
      {/* Far Left: Y-Axis Scale Bar & Visual Ratio Indicator */}
      <div className="w-8 shrink-0 flex flex-col justify-between items-center py-2 border-r border-slate-800/60 font-mono text-[9px] text-slate-500">
        <div className="flex flex-col items-center gap-2 text-emerald-400 font-bold">
          <span>+5</span>
          <span>+3</span>
          <span>+2</span>
          <span>+1</span>
          <span>+0.5</span>
          <span>+0.2</span>
        </div>

        {/* Center Zero Level */}
        <div className="my-1 py-1 w-full flex items-center justify-center">
          <div className="h-4 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
        </div>

        <div className="flex flex-col items-center gap-2 text-rose-400 font-bold">
          <span>-0.2</span>
          <span>-0.5</span>
          <span>-0.75</span>
          <span>-1</span>
          <span>-1.25</span>
          <span>-1.5</span>
          <span>-2</span>
          <span>-3</span>
        </div>
      </div>

      {/* Main Sector Rows */}
      <div className="flex-1 flex flex-col py-1 overflow-x-hidden">
        {/* All Sectors Button */}
        <button
          onClick={() => onSelectSector('All Sectors')}
          className={`px-3 py-1.5 mx-1 mb-1 rounded-md text-[11px] font-sans font-bold flex items-center justify-between border transition-all ${
            selectedSector === 'All Sectors'
              ? 'bg-cyan-950/50 border-cyan-500/80 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <span>ALL SECTORS</span>
          <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/50">
            {sectors.length}
          </span>
        </button>

        {/* Positive (Bullish) Sectors */}
        <div className="space-y-0.5 px-1">
          {positiveSectors.map((sec) => {
            const isSelected = selectedSector.toLowerCase() === sec.sectorName.toLowerCase();
            const segments = Math.min(8, Math.max(1, Math.round(sec.sectorTrendPct * 4)));

            return (
              <button
                key={sec.sectorName}
                onClick={() => onSelectSector(sec.sectorName)}
                className={`w-full text-left px-2 py-1 rounded transition-all flex flex-col justify-center border group ${
                  isSelected
                    ? 'bg-emerald-950/60 border-emerald-500/80 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'border-transparent hover:border-emerald-500/30 hover:bg-emerald-950/20 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-sans font-bold uppercase truncate max-w-[110px] group-hover:text-emerald-300 transition-colors">
                    {sec.sectorName.replace(' & Construction', '').replace(' & Healthcare', '').replace(', Oil & Gas', '')}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-emerald-400">
                    +{sec.sectorTrendPct.toFixed(2)}%
                  </span>
                </div>

                {/* Mini Segmented Bar + Stock Count */}
                <div className="flex items-center justify-between mt-0.5">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <span
                        key={i}
                        className={`inline-block w-1.5 h-1 rounded-xs transition-opacity ${
                          i < segments
                            ? 'bg-emerald-400 shadow-[0_0_4px_#10b981]'
                            : 'bg-emerald-950/60'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[9px] text-slate-500">
                    <span className="text-emerald-400">{sec.bullishCount}</span>/
                    <span className="text-rose-400">{sec.bearishCount}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Center Zero Reference Divider */}
        <div className="my-2 px-2 flex items-center gap-2">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-cyan-500/40 via-cyan-500 to-transparent" />
          <span className="font-mono text-[9px] text-cyan-400 font-bold tracking-wider">0.00%</span>
        </div>

        {/* Negative (Bearish) Sectors */}
        <div className="space-y-0.5 px-1">
          {negativeSectors.map((sec) => {
            const isSelected = selectedSector.toLowerCase() === sec.sectorName.toLowerCase();
            const segments = Math.min(8, Math.max(1, Math.round(Math.abs(sec.sectorTrendPct) * 4)));

            return (
              <button
                key={sec.sectorName}
                onClick={() => onSelectSector(sec.sectorName)}
                className={`w-full text-left px-2 py-1 rounded transition-all flex flex-col justify-center border group ${
                  isSelected
                    ? 'bg-rose-950/60 border-rose-500/80 text-white shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                    : 'border-transparent hover:border-rose-500/30 hover:bg-rose-950/20 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-sans font-bold uppercase truncate max-w-[110px] group-hover:text-rose-300 transition-colors">
                    {sec.sectorName.replace(' & Construction', '').replace(' & Healthcare', '').replace(', Oil & Gas', '')}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-rose-400">
                    {sec.sectorTrendPct.toFixed(2)}%
                  </span>
                </div>

                {/* Mini Segmented Bar + Stock Count */}
                <div className="flex items-center justify-between mt-0.5">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <span
                        key={i}
                        className={`inline-block w-1.5 h-1 rounded-xs transition-opacity ${
                          i < segments
                            ? 'bg-rose-500 shadow-[0_0_4px_#f43f5e]'
                            : 'bg-rose-950/60'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[9px] text-slate-500">
                    <span className="text-emerald-400">{sec.bullishCount}</span>/
                    <span className="text-rose-400">{sec.bearishCount}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

