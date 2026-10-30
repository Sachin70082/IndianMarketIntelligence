"use client";

import React from "react";
import { InstitutionalStockSignal } from "@/lib/institutional/types";
import { Compass, Shield, Target, Flame, ArrowUpRight, ArrowDownRight, Sparkles, CheckCircle2 } from "lucide-react";

export function OneClearZoneCard({
  signal,
}: {
  signal: InstitutionalStockSignal | null;
}) {
  if (!signal) {
    return (
      <div className="w-full p-6 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse text-center text-xs text-slate-500 font-mono">
        Scanning institutional order blocks...
      </div>
    );
  }

  const { stock, ltp, changePct, oneClearZone, relativeVolume, compositeScore, tier } = signal;
  const isBullish = oneClearZone.direction === "BULLISH";
  const isBearish = oneClearZone.direction === "BEARISH";
  const hasZone = oneClearZone.hasClearZone;

  return (
    <div className={`w-full rounded-2xl p-5 border relative overflow-hidden shadow-2xl transition-all duration-200 ${
      !hasZone
        ? "bg-slate-900/80 border-slate-800"
        : isBullish
        ? "bg-gradient-to-br from-[#071912] via-[#091f16] to-[#06120c] border-emerald-500/50 shadow-emerald-950/40 ring-1 ring-emerald-500/30"
        : "bg-gradient-to-br from-[#1c080b] via-[#240a0f] to-[#140608] border-rose-500/50 shadow-rose-950/40 ring-1 ring-rose-500/30"
    }`}>
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <Compass className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
              One Clear Zone
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 font-mono">
              {stock.symbol}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Spot institutional zones in seconds • Confusion-free single actionable level
          </p>
        </div>

        {/* Direction Badge */}
        {hasZone && (
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md ${
              isBullish
                ? "bg-emerald-500 text-slate-950 shadow-emerald-500/30"
                : "bg-rose-500 text-white shadow-rose-500/30"
            }`}>
              {isBullish ? <ArrowUpRight className="w-4 h-4 stroke-[3]" /> : <ArrowDownRight className="w-4 h-4 stroke-[3]" />}
              <span>{oneClearZone.direction} SIGNAL</span>
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono font-bold text-amber-300">
              Score: {compositeScore}/100
            </span>
          </div>
        )}
      </div>

      {/* Main Content Body */}
      {hasZone ? (
        <div className="mt-4 flex flex-col gap-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            {/* Current Price */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90">
              <div className="text-[10px] text-slate-400 font-sans font-semibold uppercase">Current Price</div>
              <div className="text-lg sm:text-xl font-black text-white mt-0.5">
                ₹{ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className={`text-[11px] font-bold mt-0.5 ${changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {changePct >= 0 ? `+${changePct}%` : `${changePct}%`}
              </div>
            </div>

            {/* Demand / Supply Zone */}
            <div className={`p-3 rounded-xl border ${
              isBullish ? "bg-emerald-950/60 border-emerald-700/60 text-emerald-200" : "bg-rose-950/60 border-rose-700/60 text-rose-200"
            }`}>
              <div className="text-[10px] font-sans font-bold uppercase tracking-wider opacity-80">
                {isBullish ? "Demand Zone (Entry)" : "Supply Zone (Resistance)"}
              </div>
              <div className="text-base sm:text-lg font-black mt-0.5 whitespace-nowrap">
                {oneClearZone.demandSupplyZoneText}
              </div>
              <div className="text-[10px] opacity-75 mt-0.5 truncate">
                {oneClearZone.status}
              </div>
            </div>

            {/* Liquidity Target */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 text-cyan-300">
              <div className="text-[10px] text-slate-400 font-sans font-semibold uppercase">Liquidity Target</div>
              <div className="text-base sm:text-lg font-black text-cyan-300 mt-0.5 whitespace-nowrap">
                {oneClearZone.liquidityTargetText}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Resting Stop-loss Cluster
              </div>
            </div>

            {/* Order Block Strength & RVOL */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90">
              <div className="text-[10px] text-slate-400 font-sans font-semibold uppercase">OB Strength &amp; RVOL</div>
              <div className="text-base sm:text-lg font-black text-amber-300 mt-0.5">
                {oneClearZone.strengthScore}/100 • {relativeVolume}x
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                {oneClearZone.structure}
              </div>
            </div>
          </div>

          {/* Signal Explanation Banner */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-start gap-3">
            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isBullish ? "text-emerald-400" : "text-rose-400"}`} />
            <div>
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wide font-mono">
                Institutional Signal Confirmation
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {oneClearZone.explanation}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center flex flex-col items-center justify-center">
          <div className="p-3 rounded-2xl bg-slate-800 text-slate-400 mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <div className="text-sm font-black text-slate-300 font-mono uppercase tracking-wider">
            NO CLEAR INSTITUTIONAL ZONE
          </div>
          <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
            {oneClearZone.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

