'use client';

import React from 'react';
import { InstitutionalStockSignal } from '@/lib/institutional/types';
import { FlowStockCard } from './FlowStockCard';
import { RefreshCw } from 'lucide-react';

interface TopFlowCardsGridProps {
  bullishSignals: InstitutionalStockSignal[];
  bearishSignals: InstitutionalStockSignal[];
  selectedSymbol: string;
  onSelectStock: (signal: InstitutionalStockSignal) => void;
}

export function TopFlowCardsGrid({
  bullishSignals,
  bearishSignals,
  selectedSymbol,
  onSelectStock,
}: TopFlowCardsGridProps) {
  // Take Top 20 for Bullish & Bearish
  const bulls = bullishSignals.slice(0, 20);
  const bears = bearishSignals.slice(0, 20);

  // Layout slicing for 4 columns matching the reference terminal:
  // Column 4 (Featured Ranks 01-03)
  // Column 3 (Ranks 04-07)
  // Column 2 (Ranks 08-12)
  // Column 1 (Ranks 13-20)
  const bullFeatured = bulls.slice(0, Math.min(3, bulls.length));
  const remainingBulls = bulls.slice(bullFeatured.length);
  let bullCol3: InstitutionalStockSignal[] = [];
  let bullCol2: InstitutionalStockSignal[] = [];
  let bullCol1: InstitutionalStockSignal[] = [];

  if (bulls.length >= 20) {
    bullCol3 = bulls.slice(3, 7);
    bullCol2 = bulls.slice(7, 12);
    bullCol1 = bulls.slice(12, 20);
  } else if (remainingBulls.length > 0) {
    const chunk = Math.ceil(remainingBulls.length / 3);
    bullCol3 = remainingBulls.slice(0, chunk);
    bullCol2 = remainingBulls.slice(chunk, chunk * 2);
    bullCol1 = remainingBulls.slice(chunk * 2);
  }

  const bearFeatured = bears.slice(0, Math.min(3, bears.length));
  const remainingBears = bears.slice(bearFeatured.length);
  let bearCol3: InstitutionalStockSignal[] = [];
  let bearCol2: InstitutionalStockSignal[] = [];
  let bearCol1: InstitutionalStockSignal[] = [];

  if (bears.length >= 20) {
    bearCol3 = bears.slice(3, 7);
    bearCol2 = bears.slice(7, 12);
    bearCol1 = bears.slice(12, 20);
  } else if (remainingBears.length > 0) {
    const chunk = Math.ceil(remainingBears.length / 3);
    bearCol3 = remainingBears.slice(0, chunk);
    bearCol2 = remainingBears.slice(chunk, chunk * 2);
    bearCol1 = remainingBears.slice(chunk * 2);
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-2 sm:p-3 space-y-4 select-none bg-[#03060c]">
      {/* ================= TOP SECTION: BULLISH OPPORTUNITIES ================= */}
      <div className="rounded-xl bg-[#040c08]/80 border border-emerald-500/20 p-2.5 sm:p-3 relative shadow-[0_0_30px_rgba(16,185,129,0.08)]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-500/20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="font-bold text-xs font-sans uppercase tracking-wider text-emerald-400">
              BULLISH OPPORTUNITIES (TOP 20)
            </span>
          </div>
          <span className="font-mono text-[10px] text-emerald-500/80 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
            DEMAND EXPANSION • HIGHEST SCORE FIRST
          </span>
        </div>

        {bulls.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 font-mono text-xs">
            <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
            <span>Scanning 5,720+ stocks for institutional bullish setups...</span>
          </div>
        ) : bulls.length <= 4 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
            {bulls.map((sig, idx) => (
              <FlowStockCard
                key={sig.stock.symbol}
                signal={sig}
                rank={idx + 1}
                isBullish={true}
                isFeatured={idx < 2}
                isSelected={selectedSymbol === sig.stock.symbol}
                onSelect={onSelectStock}
              />
            ))}
          </div>
        ) : (
          /* 4 Column Layout matching Reference Terminal */
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
            {/* Column 1: Ranks 13 to 20 */}
            <div className="flex flex-col gap-1.5">
              {bullCol1.map((sig, idx) => {
                const rank = bulls.findIndex((b) => b.stock.symbol === sig.stock.symbol) + 1 || (13 + idx);
                return (
                  <FlowStockCard
                    key={sig.stock.symbol}
                    signal={sig}
                    rank={rank}
                    isBullish={true}
                    isSelected={selectedSymbol === sig.stock.symbol}
                    onSelect={onSelectStock}
                  />
                );
              })}
            </div>

            {/* Column 2: Ranks 08 to 12 */}
            <div className="flex flex-col gap-1.5">
              {bullCol2.map((sig, idx) => {
                const rank = bulls.findIndex((b) => b.stock.symbol === sig.stock.symbol) + 1 || (8 + idx);
                return (
                  <FlowStockCard
                    key={sig.stock.symbol}
                    signal={sig}
                    rank={rank}
                    isBullish={true}
                    isSelected={selectedSymbol === sig.stock.symbol}
                    onSelect={onSelectStock}
                  />
                );
              })}
            </div>

            {/* Column 3: Ranks 04 to 07 */}
            <div className="flex flex-col gap-1.5">
              {bullCol3.map((sig, idx) => {
                const rank = bulls.findIndex((b) => b.stock.symbol === sig.stock.symbol) + 1 || (4 + idx);
                return (
                  <FlowStockCard
                    key={sig.stock.symbol}
                    signal={sig}
                    rank={rank}
                    isBullish={true}
                    isSelected={selectedSymbol === sig.stock.symbol}
                    onSelect={onSelectStock}
                  />
                );
              })}
            </div>

            {/* Column 4: Featured Ranks 01 to 03 (Large Cards with Brackets & Profile) */}
            <div className="flex flex-col gap-2">
              {bullFeatured.map((sig, idx) => {
                const rank = bulls.findIndex((b) => b.stock.symbol === sig.stock.symbol) + 1 || (1 + idx);
                return (
                  <FlowStockCard
                    key={sig.stock.symbol}
                    signal={sig}
                    rank={rank}
                    isBullish={true}
                    isFeatured={true}
                    isSelected={selectedSymbol === sig.stock.symbol}
                    onSelect={onSelectStock}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================= BOTTOM SECTION: BEARISH OPPORTUNITIES ================= */}
      <div className="rounded-xl bg-[#0c0406]/80 border border-rose-500/20 p-2.5 sm:p-3 relative shadow-[0_0_30px_rgba(244,63,94,0.08)]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-rose-500/20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shadow-[0_0_8px_#f43f5e]" />
            <span className="font-bold text-xs font-sans uppercase tracking-wider text-rose-400">
              BEARISH OPPORTUNITIES (TOP 20)
            </span>
          </div>
          <span className="font-mono text-[10px] text-rose-500/80 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
            SUPPLY EXPANSION • HIGHEST SCORE FIRST
          </span>
        </div>

        {bears.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 font-mono text-xs">
            <RefreshCw className="w-5 h-5 text-rose-500 animate-spin" />
            <span>Scanning 5,720+ stocks for institutional bearish setups...</span>
          </div>
        ) : bears.length <= 4 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
            {bears.map((sig, idx) => (
              <FlowStockCard
                key={sig.stock.symbol}
                signal={sig}
                rank={idx + 1}
                isBullish={false}
                isFeatured={idx < 2}
                isSelected={selectedSymbol === sig.stock.symbol}
                onSelect={onSelectStock}
              />
            ))}
          </div>
        ) : (
          /* 4 Column Layout matching Reference Terminal */
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
            {/* Column 1: Ranks 13 to 20 */}
            <div className="flex flex-col gap-1.5">
              {bearCol1.map((sig, idx) => {
                const rank = bears.findIndex((b) => b.stock.symbol === sig.stock.symbol) + 1 || (13 + idx);
                return (
                  <FlowStockCard
                    key={sig.stock.symbol}
                    signal={sig}
                    rank={rank}
                    isBullish={false}
                    isSelected={selectedSymbol === sig.stock.symbol}
                    onSelect={onSelectStock}
                  />
                );
              })}
            </div>

            {/* Column 2: Ranks 08 to 12 */}
            <div className="flex flex-col gap-1.5">
              {bearCol2.map((sig, idx) => {
                const rank = bears.findIndex((b) => b.stock.symbol === sig.stock.symbol) + 1 || (8 + idx);
                return (
                  <FlowStockCard
                    key={sig.stock.symbol}
                    signal={sig}
                    rank={rank}
                    isBullish={false}
                    isSelected={selectedSymbol === sig.stock.symbol}
                    onSelect={onSelectStock}
                  />
                );
              })}
            </div>

            {/* Column 3: Ranks 04 to 07 */}
            <div className="flex flex-col gap-1.5">
              {bearCol3.map((sig, idx) => {
                const rank = bears.findIndex((b) => b.stock.symbol === sig.stock.symbol) + 1 || (4 + idx);
                return (
                  <FlowStockCard
                    key={sig.stock.symbol}
                    signal={sig}
                    rank={rank}
                    isBullish={false}
                    isSelected={selectedSymbol === sig.stock.symbol}
                    onSelect={onSelectStock}
                  />
                );
              })}
            </div>

            {/* Column 4: Featured Ranks 01 to 03 (Large Cards with Brackets & Profile) */}
            <div className="flex flex-col gap-2">
              {bearFeatured.map((sig, idx) => {
                const rank = bears.findIndex((b) => b.stock.symbol === sig.stock.symbol) + 1 || (1 + idx);
                return (
                  <FlowStockCard
                    key={sig.stock.symbol}
                    signal={sig}
                    rank={rank}
                    isBullish={false}
                    isFeatured={true}
                    isSelected={selectedSymbol === sig.stock.symbol}
                    onSelect={onSelectStock}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
