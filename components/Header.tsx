"use client";

import React from "react";
import { MarketFreshness, MarketSessionStatus, ApiConnectionStatus } from "@/lib/types/market";
import { FreshnessBadge, SessionBadge } from "./StatusBadge";
import { RefreshCw, Radio, Shield, KeyRound, Clock, Sparkles, History } from "lucide-react";

interface HeaderProps {
  lastUpdatedIst: string;
  freshness: MarketFreshness;
  quoteAgeSeconds: number;
  sessionStatus: MarketSessionStatus;
  sessionDescription: string;
  connectionStatus: ApiConnectionStatus | null;
  feedMode: "STREAM" | "POLL";
  onToggleFeedMode: (mode: "STREAM" | "POLL") => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenConfigModal: () => void;
}

export function Header({
  lastUpdatedIst,
  freshness,
  quoteAgeSeconds,
  sessionStatus,
  sessionDescription,
  connectionStatus,
  feedMode,
  onToggleFeedMode,
  onRefresh,
  isRefreshing,
  onOpenConfigModal,
}: HeaderProps) {
  const isConnected = connectionStatus?.status === "CONNECTED";
  const isConfigured = connectionStatus?.is_configured;

  return (
    <header className="w-full bg-[#080d1a]/95 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-2.5 sm:py-3 shadow-lg shadow-black/25">
      <div className="max-w-[1680px] w-full mx-auto flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 xl:gap-6">
        
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300" />
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-blue-500 p-0.5 flex items-center justify-center shadow-md shadow-blue-500/10">
              <div className="h-full w-full bg-[#090e1c] rounded-[10px] flex items-center justify-center">
                <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-white to-emerald-400 text-sm tracking-wider">
                  IN
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                Indian Market Intelligence
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                NSE F&O Scalper
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span className="text-slate-300 font-medium">Options Scalping & Intraday Terminal</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400/90 font-mono text-[10px] bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                1m • 3m • 5m • 15m Precision
              </span>
            </p>
          </div>
        </div>

        {/* Center: Market Session, Live IST Clock & Freshness Badge */}
        <div className="flex flex-wrap items-center justify-start xl:justify-center gap-2 text-xs py-0.5">
          <SessionBadge status={sessionStatus} description={sessionDescription} />
          
          <div 
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/70 text-slate-200 shadow-inner"
            title="Current Indian Standard Time (IST) - Synced"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Clock className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            <span suppressHydrationWarning className="tabular-nums font-mono text-xs font-semibold text-slate-200">
              {lastUpdatedIst || "Connecting..."}
            </span>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider">IST</span>
          </div>

          <FreshnessBadge freshness={freshness} quoteAgeSeconds={quoteAgeSeconds} />
        </div>

        {/* Right: Controls (Feed Toggle, Refresh & Token Status) */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
          {/* Feed Mode Switcher (V3 Live Stream vs Snapshot Historical Replay) */}
          <div className="flex items-center bg-slate-950/90 p-0.5 rounded-lg border border-slate-800/90 text-[11px] shadow-inner">
            <button
              onClick={() => onToggleFeedMode("STREAM")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium ${
                feedMode === "STREAM"
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm shadow-blue-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
              title="Stream live tick updates via Server-Sent Events from Upstox WebSocket Feed V3"
            >
              <Radio className={`w-3 h-3 ${feedMode === "STREAM" ? "animate-pulse text-emerald-300" : ""}`} />
              <span>V3 Stream</span>
            </button>
            <button
              onClick={() => onToggleFeedMode("POLL")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium ${
                feedMode === "POLL"
                  ? "bg-amber-500 text-slate-950 shadow-sm font-black border border-amber-400 shadow-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
              title="Open Historical Option Chain Replay & Simulator Bar"
            >
              <History className={`w-3 h-3 ${feedMode === "POLL" ? "text-slate-950" : "text-amber-400"}`} />
              <span>Snapshot</span>
            </button>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-white border border-slate-700/70 transition-all shadow-sm disabled:opacity-50"
            title="Force immediate market quotes & candle refresh"
          >
            <RefreshCw className={`w-4 h-4 transition-transform ${isRefreshing ? "animate-spin text-blue-400" : "text-slate-400 hover:text-slate-200"}`} />
          </button>

          {/* Token Security Status & Config Button */}
          <button
            onClick={onOpenConfigModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-sm active:scale-95 ${
              isConnected
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/70 hover:bg-emerald-900/50 hover:border-emerald-700 shadow-emerald-950/30"
                : isConfigured
                ? "bg-amber-950/40 text-amber-300 border-amber-800/70 hover:bg-amber-900/50 hover:border-amber-700 shadow-amber-950/30"
                : "bg-rose-950/40 text-rose-300 border-rose-800/70 hover:bg-rose-900/50 hover:border-rose-700 shadow-rose-950/30 animate-pulse"
            }`}
            title="Inspect & Configure Upstox Analytics Token"
          >
            {isConnected ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            ) : isConfigured ? (
              <span className="h-2 w-2 rounded-full bg-amber-400" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            )}
            {isConnected ? (
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{isConnected ? "Token Live" : isConfigured ? "Token Error" : "Add Token"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
