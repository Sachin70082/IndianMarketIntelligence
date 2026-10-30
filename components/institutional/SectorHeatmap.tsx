"use client";

import React from "react";
import { SectorScreeningSummary, SectorSentimentColor } from "@/lib/institutional/types";
import { Layers, TrendingUp, TrendingDown, Flame, AlertTriangle, ArrowRight } from "lucide-react";

interface SectorHeatmapProps {
  sectors: SectorScreeningSummary[];
  selectedSector: string;
  onSelectSector: (sector: string) => void;
  onSelectStockSymbol?: (symbol: string) => void;
}

export function SectorHeatmap({
  sectors,
  selectedSector,
  onSelectSector,
  onSelectStockSymbol,
}: SectorHeatmapProps) {
  if (!sectors || sectors.length === 0) {
    return (
      <div className="w-full p-8 text-center text-xs text-slate-500 font-mono">
        Loading sector heatmap...
      </div>
    );
  }

  // Get color styling based on sentiment color
  const getSectorStyle = (color: SectorSentimentColor) => {
    switch (color) {
      case "DARK_GREEN":
        return {
          bg: "bg-emerald-950/80 border-emerald-500 shadow-emerald-950/60",
          badge: "bg-emerald-500 text-slate-950 font-black",
          text: "text-emerald-300",
          border: "border-emerald-500/80",
          label: "Exceptional Bullish",
        };
      case "GREEN":
        return {
          bg: "bg-emerald-950/40 border-emerald-700/60",
          badge: "bg-emerald-900/80 text-emerald-300 font-bold border border-emerald-700",
          text: "text-emerald-400",
          border: "border-emerald-700/60",
          label: "Bullish Inflow",
        };
      case "DARK_RED":
        return {
          bg: "bg-rose-950/80 border-rose-500 shadow-rose-950/60",
          badge: "bg-rose-500 text-white font-black",
          text: "text-rose-300",
          border: "border-rose-500/80",
          label: "Exceptional Bearish",
        };
      case "RED":
        return {
          bg: "bg-rose-950/40 border-rose-700/60",
          badge: "bg-rose-900/80 text-rose-300 font-bold border border-rose-700",
          text: "text-rose-400",
          border: "border-rose-700/60",
          label: "Bearish Outflow",
        };
      case "YELLOW":
        return {
          bg: "bg-amber-950/40 border-amber-600/70",
          badge: "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/50",
          text: "text-amber-300",
          border: "border-amber-600/60",
          label: "Liquidity Trap / Churn",
        };
      case "GREY":
      default:
        return {
          bg: "bg-slate-900/70 border-slate-800",
          badge: "bg-slate-800 text-slate-400 font-bold",
          text: "text-slate-400",
          border: "border-slate-800",
          label: "Neutral",
        };
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Sector Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
            Sector-Wise Institutional Heatmap
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            ({sectors.length} Sectors Scanned)
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] font-mono flex-wrap">
          <span className="flex items-center gap-1 text-emerald-300">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span>Bullish</span>
          </span>
          <span className="flex items-center gap-1 text-rose-300">
            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
            <span>Bearish</span>
          </span>
          <span className="flex items-center gap-1 text-amber-300">
            <span className="w-2.5 h-2.5 rounded bg-amber-500" />
            <span>Trap / Churn</span>
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2.5 h-2.5 rounded bg-slate-700" />
            <span>Neutral</span>
          </span>
        </div>
      </div>

      {/* Responsive Grid of Sector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {sectors.map((sec) => {
          const style = getSectorStyle(sec.sentimentColor);
          const isSelected = selectedSector === sec.sectorName;

          return (
            <div
              key={sec.sectorName}
              onClick={() => onSelectSector(sec.sectorName)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-lg flex flex-col justify-between group ${style.bg} ${
                isSelected ? "ring-2 ring-emerald-400 shadow-emerald-950/60 scale-[1.02]" : "hover:border-slate-600"
              }`}
            >
              <div>
                {/* Sector Name & Sentiment Badge */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-black text-white group-hover:text-emerald-300 transition-colors tracking-tight line-clamp-1">
                    {sec.sectorName}
                  </h4>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0 ${style.badge}`}>
                    {sec.sectorTrendPct >= 0 ? `+${sec.sectorTrendPct}%` : `${sec.sectorTrendPct}%`}
                  </span>
                </div>

                {/* Score & Breadth Metrics */}
                <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Inst. Score:</span>
                  <span className={`font-bold ${style.text}`}>
                    {sec.avgInstitutionalScore}/100
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Breadth:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">{sec.bullishCount} ↑</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-rose-400 font-bold">{sec.bearishCount} ↓</span>
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Avg RVOL:</span>
                  <span className="text-slate-200 font-bold">{sec.avgRvol}x</span>
                </div>
              </div>

              {/* Top Bullish & Bearish Stock Leaders */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] font-mono flex flex-col gap-1">
                {sec.topBullishStock.symbol !== "-" && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectStockSymbol) onSelectStockSymbol(sec.topBullishStock.symbol);
                    }}
                    className="flex items-center justify-between text-emerald-300 hover:underline cursor-pointer"
                    title={`Click to view ${sec.topBullishStock.symbol} live chart`}
                  >
                    <span>Leader: <b>{sec.topBullishStock.symbol}</b></span>
                    <span>+{sec.topBullishStock.changePct}%</span>
                  </div>
                )}
                {sec.topBearishStock.symbol !== "-" && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectStockSymbol) onSelectStockSymbol(sec.topBearishStock.symbol);
                    }}
                    className="flex items-center justify-between text-rose-300 hover:underline cursor-pointer"
                    title={`Click to view ${sec.topBearishStock.symbol} live chart`}
                  >
                    <span>Laggard: <b>{sec.topBearishStock.symbol}</b></span>
                    <span>{sec.topBearishStock.changePct}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

