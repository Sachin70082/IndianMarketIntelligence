"use client";

import React from "react";
import { MarketQuoteData } from "@/lib/types/market";
import { FreshnessBadge } from "./StatusBadge";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";

interface MarketOverviewCardsProps {
  quotes: Record<string, MarketQuoteData>;
  selectedKey: string;
  onSelectInstrument: (key: string) => void;
  isLoading: boolean;
}

export function MarketOverviewCards({
  quotes,
  selectedKey,
  onSelectInstrument,
  isLoading,
}: MarketOverviewCardsProps) {
  // Key NSE F&O benchmarks we track
  const cardsToDisplay = [
    { key: "NSE_INDEX|Nifty 50", label: "NIFTY 50", subtitle: "NSE F&O Benchmark" },
    { key: "NSE_INDEX|Nifty Bank", label: "BANKNIFTY", subtitle: "Banking F&O Index" },
    { key: "NSE_INDEX|Nifty Fin Service", label: "FINNIFTY", subtitle: "Financial F&O Index" },
    { key: "NSE_INDEX|NIFTY MID SELECT", label: "MIDCPNIFTY", subtitle: "Midcap Select F&O" },
    { key: "NSE_INDEX|India VIX", label: "INDIA VIX", subtitle: "Volatility Index" },
  ];

  // If a selected stock is not one of the 5 F&O benchmarks, also display it
  const isSelectedBenchmark = cardsToDisplay.some((c) => c.key === selectedKey);
  if (!isSelectedBenchmark && selectedKey) {
    const quote = quotes[selectedKey];
    const [exchange, symbol] = selectedKey.split("|");
    cardsToDisplay.push({
      key: selectedKey,
      label: quote?.symbol || symbol || "Selected F&O",
      subtitle: `${exchange} F&O Underlying`,
    });
  }

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {cardsToDisplay.map((item) => {
        const quote = quotes[item.key];
        const isSelected = selectedKey === item.key;
        const hasData = !!quote && quote.last_price > 0;
        const isPositive = quote ? quote.net_change >= 0 : true;

        return (
          <div
            key={item.key}
            onClick={() => onSelectInstrument(item.key)}
            className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer select-none overflow-hidden ${
              isSelected
                ? "bg-slate-900/90 border-blue-500/80 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30"
                : "bg-slate-900/40 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700/80"
            }`}
          >
            {/* Background subtle gradient */}
            <div
              className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none transition-opacity ${
                hasData
                  ? isPositive
                    ? "bg-emerald-500/5 group-hover:bg-emerald-500/10"
                    : "bg-rose-500/5 group-hover:bg-rose-500/10"
                  : "bg-slate-500/5"
              }`}
            />

            {/* Top row: Symbol and Freshness */}
            <div className="flex items-start justify-between gap-1 mb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white tracking-tight group-hover:text-blue-400 transition-colors">
                    {item.label}
                  </span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[120px]">
                  {item.subtitle}
                </div>
              </div>

              {hasData ? (
                <FreshnessBadge
                  freshness={quote.freshness}
                  quoteAgeSeconds={quote.quote_age_seconds}
                  showAge={false}
                />
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {isLoading ? "Fetching..." : "No Data"}
                </span>
              )}
            </div>

            {/* Price Row */}
            <div className="my-1.5">
              {hasData ? (
                <div className="flex items-baseline justify-between gap-1.5 flex-wrap">
                  <div className="text-xl sm:text-2xl font-black font-mono text-white tabular-nums tracking-tight">
                    ₹{quote.last_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>

                  <div
                    className={`flex items-center gap-1 text-xs sm:text-sm font-black px-2 py-0.5 rounded-md font-mono ${
                      isPositive
                        ? "text-emerald-300 bg-emerald-950/80 border border-emerald-800/60 shadow-sm"
                        : "text-rose-300 bg-rose-950/80 border border-rose-800/60 shadow-sm"
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 stroke-[3]" />
                    )}
                    <span>{isPositive ? "+" : ""}{quote.percentage_change.toFixed(2)}%</span>
                  </div>
                </div>
              ) : (
                <div className="text-xl font-mono text-slate-600">
                  {isLoading ? "---.--" : "Offline"}
                </div>
              )}
            </div>

            {/* High/Low and Absolute Change */}
            {hasData ? (
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-500 font-semibold">Chg:</span>
                  <span className={`font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                    {isPositive ? "+" : ""}{quote.net_change.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>H: <b className="text-slate-300">{quote.high.toFixed(0)}</b></span>
                  <span>•</span>
                  <span>L: <b className="text-slate-300">{quote.low.toFixed(0)}</b></span>
                </div>
              </div>
            ) : (
              <div className="mt-2 pt-2 border-t border-slate-800/40 text-[10px] text-slate-500 flex items-center gap-1">
                <Activity className="w-3 h-3 text-slate-600" />
                <span>Verify token to populate live price</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
