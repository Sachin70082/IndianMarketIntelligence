"use client";

import React from "react";
import { ScannerMarketSummary } from "@/lib/institutional/scannerService";
import { TrendingUp, TrendingDown, Activity, Shield, Building2, Flame, Layers } from "lucide-react";

export function LiveMarketDashboard({
  summary,
}: {
  summary: ScannerMarketSummary | null;
}) {
  if (!summary) {
    return (
      <div className="w-full bg-[#080d1a] border-b border-slate-800 p-4 animate-pulse">
        <div className="h-10 bg-slate-800/40 rounded-lg max-w-[1680px] mx-auto" />
      </div>
    );
  }

  const {
    fiiDii,
    totalStocksScanned,
    advancingStocks,
    decliningStocks,
    strongBullishSetups,
    strongBearishSetups,
    nifty50,
    bankNifty,
    sensex,
    marketStatus,
  } = summary;

  return (
    <div className="w-full bg-[#070c18] border-b border-slate-800/80 px-4 sm:px-6 py-3 shadow-inner">
      <div className="max-w-[1680px] mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
        {/* Market Status & Core Index */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-sans font-semibold">MARKET STATUS</span>
            <span className="flex items-center gap-1 font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {marketStatus}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm font-black text-white">NIFTY 50</span>
            <span className="text-xs font-bold text-emerald-400">
              ₹{nifty50.ltp.toLocaleString("en-IN")} (+{nifty50.changePct}%)
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            BANKNIFTY: ₹{bankNifty.ltp.toLocaleString("en-IN")} (+{bankNifty.changePct}%)
          </div>
        </div>

        {/* FII Net Activity */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-sans font-semibold">FII / FPI NET FLOW</span>
            <span className="text-[10px] text-slate-500" title="Foreign Institutional Investors Daily Net Cash">NSE/BSE</span>
          </div>
          <div className={`mt-1 text-sm sm:text-base font-black ${fiiDii.fiiNetCr >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fiiDii.fiiNetCr >= 0 ? `+₹${fiiDii.fiiNetCr} Cr` : `-₹${Math.abs(fiiDii.fiiNetCr)} Cr`}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Buy: ₹{fiiDii.fiiGrossBuyCr} Cr • Sell: ₹{fiiDii.fiiGrossSellCr} Cr
          </div>
        </div>

        {/* DII Net Activity */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-sans font-semibold">DII NET FLOW</span>
            <span className="text-[10px] text-slate-500" title="Domestic Institutional Investors (Mutual Funds & Insurance)">NSE/BSE</span>
          </div>
          <div className={`mt-1 text-sm sm:text-base font-black ${fiiDii.diiNetCr >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fiiDii.diiNetCr >= 0 ? `+₹${fiiDii.diiNetCr} Cr` : `-₹${Math.abs(fiiDii.diiNetCr)} Cr`}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Net Inst: <b className="text-cyan-300">+₹{fiiDii.netInstitutionalCr} Cr</b>
          </div>
        </div>

        {/* Total Stocks Scanned */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-sans font-semibold">SCANNER UNIVERSE</span>
            <span className="px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 text-[9px] font-bold border border-blue-800/60">LIVE</span>
          </div>
          <div className="mt-1 text-sm sm:text-base font-black text-cyan-300">
            {totalStocksScanned.toLocaleString("en-IN")}+ Stocks
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            NSE &amp; BSE Listed Equities Full Master
          </div>
        </div>

        {/* Market Breadth (Adv / Dec) */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-sans font-semibold">MARKET BREADTH</span>
            <Activity className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{advancingStocks} Adv</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>{decliningStocks} Dec</span>
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Ratio: {(advancingStocks / (decliningStocks || 1)).toFixed(2)}x (Bullish Bias)
          </div>
        </div>

        {/* High-Conviction Institutional Setups */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-sans font-semibold">HIGH CONVICTION OB</span>
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800 text-xs">
              {strongBullishSetups} Bullish
            </span>
            <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-800 text-xs">
              {strongBearishSetups} Bearish
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            Ranked &gt;80 Composite Score
          </div>
        </div>
      </div>
    </div>
  );
}

