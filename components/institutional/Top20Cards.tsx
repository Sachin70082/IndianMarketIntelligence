"use client";

import React, { useState } from "react";
import { InstitutionalStockSignal } from "@/lib/institutional/types";
import { Award, TrendingUp, TrendingDown, Shield, Zap, ArrowRight, CheckCircle2 } from "lucide-react";

interface Top20CardsProps {
  bullishStocks: InstitutionalStockSignal[];
  bearishStocks: InstitutionalStockSignal[];
  selectedSymbol: string;
  onSelectStock: (stock: InstitutionalStockSignal) => void;
}

export function Top20Cards({
  bullishStocks,
  bearishStocks,
  selectedSymbol,
  onSelectStock,
}: Top20CardsProps) {
  const [tab, setTab] = useState<"BULLISH" | "BEARISH">("BULLISH");

  const stocks = tab === "BULLISH" ? bullishStocks : bearishStocks;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Top Header with Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
            Top 20 Institutional Order Block Opportunities
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Strongest Ranked First
          </span>
        </div>

        {/* Direction Toggle Tabs */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setTab("BULLISH")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
              tab === "BULLISH"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Top Bullish Demand ({bullishStocks.length})</span>
          </button>

          <button
            onClick={() => setTab("BEARISH")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
              tab === "BEARISH"
                ? "bg-rose-600 text-white shadow-md shadow-rose-950/60"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Top Bearish Supply ({bearishStocks.length})</span>
          </button>
        </div>
      </div>

      {/* Table Container - Mobile friendly horizontal scroll */}
      <div className="w-full overflow-x-auto rounded-2xl border border-slate-800 bg-[#090e1c] shadow-2xl">
        <table className="w-full text-xs font-mono text-left border-collapse select-none min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 bg-slate-950/90 uppercase tracking-wider">
              <th className="py-3 px-3 text-center w-12">#</th>
              <th className="py-3 px-3">Stock &amp; Exchange</th>
              <th className="py-3 px-3 text-right">LTP (₹)</th>
              <th className="py-3 px-3 text-right">Change %</th>
              <th className="py-3 px-3 text-center">Inst. Score</th>
              <th className="py-3 px-3 text-center">Liquidity Score</th>
              <th className="py-3 px-3 text-center">RVOL</th>
              <th className="py-3 px-3 text-center">Order Block Zone</th>
              <th className="py-3 px-3 text-center">Dist. to Zone</th>
              <th className="py-3 px-3">Latest SMC Setup</th>
              <th className="py-3 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {stocks.map((s, idx) => {
              const isSelected = s.stock.symbol === selectedSymbol;
              const isBull = s.direction === "BULLISH";
              const rank = idx + 1;

              return (
                <tr
                  key={s.stock.id}
                  onClick={() => onSelectStock(s)}
                  className={`group cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-emerald-950/40 ring-1 ring-emerald-500 font-semibold"
                      : "hover:bg-slate-850/60"
                  }`}
                >
                  {/* Rank */}
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                      rank <= 3
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-slate-800 text-slate-400"
                    }`}>
                      {rank}
                    </span>
                  </td>

                  {/* Stock Symbol & Company */}
                  <td className="py-3 px-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white group-hover:text-emerald-300 transition-colors text-sm">
                          {s.stock.symbol}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-300">
                          {s.stock.exchange}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 truncate max-w-[170px]">
                        {s.stock.companyName}
                      </span>
                    </div>
                  </td>

                  {/* LTP */}
                  <td className="py-3 px-3 text-right font-bold text-white">
                    ₹{s.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>

                  {/* Change % */}
                  <td className={`py-3 px-3 text-right font-bold ${
                    s.changePct >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {s.changePct >= 0 ? `+${s.changePct}%` : `${s.changePct}%`}
                  </td>

                  {/* Institutional Composite Score */}
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${
                      s.compositeScore >= 90
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
                        : s.compositeScore >= 80
                        ? "bg-emerald-950 text-emerald-300 border-emerald-600"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}>
                      {s.compositeScore}/100
                    </span>
                  </td>

                  {/* Liquidity Trap Score */}
                  <td className="py-3 px-3 text-center">
                    <span className="text-cyan-300 font-bold text-xs">
                      {s.liquidityScore}/100
                    </span>
                  </td>

                  {/* RVOL */}
                  <td className="py-3 px-3 text-center">
                    <span className={`font-bold ${s.relativeVolume >= 2.0 ? "text-amber-400" : "text-slate-300"}`}>
                      {s.relativeVolume}x
                    </span>
                  </td>

                  {/* Order Block Zone */}
                  <td className="py-3 px-3 text-center font-bold">
                    <span className={`px-2 py-0.5 rounded text-[11px] ${
                      isBull ? "text-emerald-300 bg-emerald-950/60" : "text-rose-300 bg-rose-950/60"
                    }`}>
                      {s.oneClearZone.demandSupplyZoneText}
                    </span>
                  </td>

                  {/* Distance to Zone */}
                  <td className="py-3 px-3 text-center text-slate-400 text-[11px]">
                    {s.distanceToZonePct}% away
                  </td>

                  {/* Latest SMC Setup */}
                  <td className="py-3 px-3 text-[11px] text-slate-300">
                    <div className="flex items-center gap-1.5 truncate max-w-[200px]" title={s.oneClearZone.explanation}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isBull ? "bg-emerald-400" : "bg-rose-400"}`} />
                      <span>{s.oneClearZone.structure}</span>
                    </div>
                  </td>

                  {/* Action / View Chart */}
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStock(s);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-[10px] font-bold transition flex items-center gap-1 mx-auto"
                    >
                      <span>Chart</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

