'use client';

import React from 'react';
import { InstitutionalStockSignal } from '@/lib/institutional/types';

interface FlowStockCardProps {
  signal: InstitutionalStockSignal;
  rank: number;
  isBullish: boolean;
  isFeatured?: boolean;
  isSelected?: boolean;
  onSelect: (signal: InstitutionalStockSignal) => void;
}

export function FlowStockCard({
  signal,
  rank,
  isBullish,
  isFeatured = false,
  isSelected = false,
  onSelect,
}: FlowStockCardProps) {
  const stock = signal?.stock;
  const symbol = stock?.symbol || 'STOCK';
  const companyName = stock?.companyName || symbol;
  const exchange = stock?.exchange || 'NSE';
  const sector = stock?.sector || 'Equities';
  const ltp = typeof signal?.ltp === 'number' ? signal.ltp : 0;
  const changePct = typeof signal?.changePct === 'number' ? signal.changePct : 0;
  const compositeScore = typeof signal?.compositeScore === 'number' ? signal.compositeScore : 70;
  const relativeVolume = typeof signal?.relativeVolume === 'number' ? signal.relativeVolume : 1.2;
  const orderBlockScore = typeof signal?.orderBlockScore === 'number' ? signal.orderBlockScore : 65;
  const deliveryPct = typeof signal?.deliveryPct === 'number' ? signal.deliveryPct : 45;

  const rankStr = rank < 10 ? `0${rank}` : `${rank}`;

  // Deterministic pseudo-random order-flow profile distribution for the stock
  const bars = React.useMemo(() => {
    const list: number[] = [];
    const seed = (symbol.charCodeAt(0) * 17 + rank * 23) % 100;
    const count = isFeatured ? 18 : 8;
    for (let i = 0; i < count; i++) {
      const val = Math.sin((i + seed) * 0.7) * 40 + 55 + (i === 6 || i === 12 ? 35 : 0);
      list.push(Math.max(15, Math.min(98, Math.round(val))));
    }
    return list;
  }, [symbol, rank, isFeatured]);

  // ================= FEATURED LARGE STOCK CARD (Top 3 Ranks: 01, 02, 03) =================
  if (isFeatured) {
    return (
      <div
        onClick={() => onSelect(signal)}
        className={`relative group cursor-pointer rounded-lg p-2.5 transition-all select-none border ${
          isBullish
            ? isSelected
              ? 'bg-[#081812] border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.4)]'
              : 'bg-[#06120d]/90 border-emerald-500/40 hover:border-emerald-400 hover:shadow-[0_0_18px_rgba(16,185,129,0.3)]'
            : isSelected
            ? 'bg-[#18080c] border-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.4)]'
            : 'bg-[#120608]/90 border-rose-500/40 hover:border-rose-400 hover:shadow-[0_0_18px_rgba(244,63,94,0.3)]'
        }`}
      >
        {/* Futuristic Corner Brackets */}
        <div
          className={`absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 ${
            isBullish ? 'border-emerald-400' : 'border-rose-400'
          }`}
        />
        <div
          className={`absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 ${
            isBullish ? 'border-emerald-400' : 'border-rose-400'
          }`}
        />
        <div
          className={`absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 ${
            isBullish ? 'border-emerald-400' : 'border-rose-400'
          }`}
        />
        <div
          className={`absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 ${
            isBullish ? 'border-emerald-400' : 'border-rose-400'
          }`}
        />

        {/* Top Header Row: Stock Symbol, Change % and Rank */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded ${
                isBullish
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {symbol.slice(0, 2)}
            </span>
            <span className="font-bold text-white text-xs tracking-wider group-hover:text-cyan-300 transition-colors">
              {symbol}
            </span>
            <span
              className={`font-mono text-xs font-black ${
                isBullish ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {changePct >= 0 ? `+${changePct.toFixed(2)}%` : `${changePct.toFixed(2)}%`}
            </span>
          </div>

          {/* Ranking Badge */}
          <div
            className={`font-mono text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${
              isBullish
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50'
                : 'bg-rose-950/80 text-rose-400 border-rose-500/50'
            }`}
          >
            {rankStr}
          </div>
        </div>

        {/* Stock Sector & Exchange Info */}
        <div className="text-[10px] text-slate-400 truncate mb-1">
          <span className="text-slate-300 font-semibold">{exchange}</span> • {companyName}
        </div>

        {/* Order Flow Volume Profile Bars */}
        <div className="relative py-1.5 space-y-0.5 my-1">
          {bars.map((w, idx) => (
            <div key={idx} className="flex items-center gap-1 h-1">
              <div
                style={{ width: `${w}%` }}
                className={`h-full rounded-xs transition-all ${
                  isBullish
                    ? idx % 4 === 0
                      ? 'bg-emerald-300 shadow-[0_0_6px_#6ee7b7]'
                      : 'bg-emerald-500/70'
                    : idx % 4 === 0
                    ? 'bg-rose-300 shadow-[0_0_6px_#fda4af]'
                    : 'bg-rose-500/70'
                }`}
              />
              <span className="w-1 h-1 rounded-full bg-slate-700/60" />
            </div>
          ))}

          {/* Floating Pure Cash Stock LTP Tag */}
          <div className="absolute right-1 top-1/2 -translate-y-1/2 bg-[#040810]/95 border border-slate-700 px-2 py-0.5 rounded shadow-lg">
            <span className="font-mono text-xs font-black text-white tracking-wide">
              ₹{ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Footer Stock Metrics: Order Block, RVOL, Delivery % and SMC Score */}
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1.5 border-t border-slate-800/60">
          <span>
            OB: <span className="text-white font-bold">{orderBlockScore}</span>
          </span>
          <span>
            RVOL: <span className="text-cyan-400 font-bold">{relativeVolume.toFixed(1)}x</span>
          </span>
          <span>
            Deliv: <span className="text-emerald-400 font-bold">{deliveryPct}%</span>
          </span>
          <span>
            SMC: <span className={isBullish ? 'text-emerald-400' : 'text-rose-400'}>{compositeScore}</span>
          </span>
        </div>
      </div>
    );
  }

  // ================= COMPACT RECTANGULAR STOCK CARD (#04 to #20) =================
  return (
    <div
      onClick={() => onSelect(signal)}
      className={`group cursor-pointer rounded-md p-1.5 transition-all select-none border ${
        isBullish
          ? isSelected
            ? 'bg-emerald-950/80 border-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.35)]'
            : 'bg-[#06120d]/80 border-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_0_10px_rgba(16,185,129,0.25)]'
          : isSelected
          ? 'bg-rose-950/80 border-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.35)]'
          : 'bg-[#120608]/80 border-rose-500/30 hover:border-rose-400 hover:shadow-[0_0_10px_rgba(244,63,94,0.25)]'
      }`}
    >
      {/* Top Row: Stock Symbol, Change % and Rank */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-bold text-white text-[11px] truncate group-hover:text-cyan-300 transition-colors">
            {symbol}
          </span>
          <span
            className={`font-mono text-[10px] font-bold ${
              isBullish ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {changePct >= 0 ? `+${changePct.toFixed(2)}%` : `${changePct.toFixed(2)}%`}
          </span>
        </div>

        <span
          className={`font-mono text-[9px] px-1 rounded font-bold ${
            isBullish
              ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/40'
              : 'bg-rose-950/90 text-rose-400 border border-rose-500/40'
          }`}
        >
          {rankStr}
        </span>
      </div>

      {/* Mini Volume Profile Lines & Cash Stock Price */}
      <div className="flex items-center justify-between gap-1 my-1">
        <div className="flex-1 flex flex-col gap-0.5">
          {bars.slice(0, 3).map((w, idx) => (
            <div
              key={idx}
              style={{ width: `${w}%` }}
              className={`h-0.5 rounded-xs ${
                isBullish ? 'bg-emerald-400/80' : 'bg-rose-500/80'
              }`}
            />
          ))}
        </div>

        <span className="font-mono text-[10px] font-extrabold text-white shrink-0">
          ₹{ltp.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
        </span>
      </div>

      {/* Stock Sub-metrics: RVOL and OB */}
      <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 pt-0.5 border-t border-slate-800/40">
        <span className="truncate">{exchange} • {sector.slice(0, 10)}</span>
        <span className="text-cyan-400 font-bold">{relativeVolume.toFixed(1)}x RVOL</span>
      </div>
    </div>
  );
}
