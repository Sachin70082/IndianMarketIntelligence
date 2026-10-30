"use client";

import React from "react";
import { Shield, Zap, Target, Smartphone, Sparkles, TrendingUp, Compass, Award } from "lucide-react";

export function InstitutionalHero() {
  return (
    <div className="w-full bg-gradient-to-b from-[#070b16] via-[#090f1f] to-[#060a14] border-b border-slate-800/80 px-4 sm:px-6 py-6 sm:py-8 shadow-2xl relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1680px] mx-auto relative z-10 flex flex-col items-center text-center">
        {/* Top Tagline Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-950/80 via-emerald-950/80 to-blue-950/80 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-3 shadow-lg shadow-blue-950/40">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Best Order Block &amp; Liquidity • Confusion-Free Trading</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight uppercase max-w-4xl">
          See Actual{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.4)]">
            Order Block &amp; Liquidity
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl font-medium leading-relaxed">
          Spot institutional accumulation zones in seconds. Automatic real-time screening across{" "}
          <span className="text-emerald-300 font-bold">5,700+ NSE &amp; BSE stocks</span> with smart-money order blocks, liquidity trap alerts, and volume confirmation.
        </p>

        {/* 4 Feature Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 w-full max-w-4xl text-left">
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-emerald-500/50 transition-all shadow-md group">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 group-hover:scale-105 transition-transform">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Institutional Order Blocks
                </div>
                <div className="text-[11px] text-slate-400">Demand &amp; supply zones</div>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-cyan-500/50 transition-all shadow-md group">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-950/70 text-cyan-400 border border-cyan-800/60 group-hover:scale-105 transition-transform">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Find Liquidity Traps Early
                </div>
                <div className="text-[11px] text-slate-400">BSL / SSL sweeps &amp; stop hunts</div>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-amber-500/50 transition-all shadow-md group">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-950/70 text-amber-400 border border-amber-800/60 group-hover:scale-105 transition-transform">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                  Confusion-Free Trading
                </div>
                <div className="text-[11px] text-slate-400">One clear actionable zone</div>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-blue-500/50 transition-all shadow-md group">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-950/70 text-blue-400 border border-blue-800/60 group-hover:scale-105 transition-transform">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                  Any Phone or Computer
                </div>
                <div className="text-[11px] text-slate-400">Fast responsive terminal</div>
              </div>
            </div>
          </div>
        </div>

        {/* Highlighted Value Proposition Row */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-white">One Clear Zone:</span>
            <span className="text-slate-400">Spot institutional zones in seconds</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-white">Strongest Ranked First:</span>
            <span className="text-slate-400">Multi-factor institutional score weighting</span>
          </div>
        </div>
      </div>
    </div>
  );
}

