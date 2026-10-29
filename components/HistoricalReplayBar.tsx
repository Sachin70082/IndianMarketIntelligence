"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Radio,
  Calendar,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  Zap,
} from "lucide-react";
import { formatTime12Hour, formatMinuteOfDay } from "@/lib/options/historicalOptionChain";

export interface HistoricalReplayBarProps {
  selectedDate: string;
  onChangeDate: (date: string) => void;
  currentMinute: number; // 555 (09:15 AM) to 930 (03:30 PM)
  onChangeMinute: (minute: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: 1 | 2 | 4 | 8;
  onChangeSpeed: (speed: 1 | 2 | 4 | 8) => void;
  onReset: () => void;
  onReturnToLive: () => void;
  underlyingSymbol: string;
}

export function HistoricalReplayBar({
  selectedDate,
  onChangeDate,
  currentMinute,
  onChangeMinute,
  isPlaying,
  onTogglePlay,
  speed,
  onChangeSpeed,
  onReset,
  onReturnToLive,
  underlyingSymbol,
}: HistoricalReplayBarProps) {
  // Session bounds: strictly 09:15 AM (555) to 03:30 PM (930)
  const sessionStartMin = 555;
  const sessionEndMin = 930;
  const totalDuration = sessionEndMin - sessionStartMin; // 375 mins
  const progressPct = Math.max(0, Math.min(100, ((currentMinute - sessionStartMin) / totalDuration) * 100));

  const currentTimeLabel = useMemo(() => formatTime12Hour(currentMinute), [currentMinute]);

  // Generate recent trading days for quick one-click date switching on client mount
  const [pastTradingDays, setPastTradingDays] = useState<Array<{ dateStr: string; label: string }>>([]);

  useEffect(() => {
    const dates: Array<{ dateStr: string; label: string }> = [];
    const now = new Date();
    let current = new Date(now.getTime());

    while (dates.length < 5) {
      const day = current.getDay();
      // Skip Saturday (6) and Sunday (0)
      if (day !== 0 && day !== 6) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, "0");
        const dd = String(current.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const isToday = dateStr === now.toISOString().split("T")[0];
        const dayName = current.toLocaleDateString("en-IN", { weekday: "short" });
        dates.push({
          dateStr,
          label: isToday ? "Today" : `${dayName} ${dd}/${mm}`,
        });
      }
      current.setDate(current.getDate() - 1);
    }
    setPastTradingDays(dates);
  }, []);

  // Key intraday milestone markers
  const milestones = [
    { label: "09:15 Open", min: 555, desc: "Market opening bell & initial strikes setup" },
    { label: "10:00 Breakout", min: 600, desc: "First 45m range break & directional OI build" },
    { label: "11:30 Mid-Day", min: 690, desc: "Range consolidation & theta decay phase" },
    { label: "13:30 Euro Open", min: 810, desc: "European market open & fresh volatility" },
    { label: "14:30 0DTE Rush", min: 870, desc: "Expiry day Hero or Zero gamma spikes" },
    { label: "15:15 Close", min: 915, desc: "Intraday square-off & positional rollover" },
  ];

  return (
    <div className="w-full bg-[#080d1a] border-y border-amber-500/40 shadow-[0_10px_30px_rgba(0,0,0,0.6)] text-slate-100 select-none animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 py-3 space-y-3">
        {/* Top Status & Live Feed Back-Toggle Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-wider shadow-sm shadow-amber-500/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: "6s" }} />
              <span>Historical Option Chain Simulator</span>
            </span>

            <span className="text-slate-600 hidden sm:inline">•</span>

            <span className="text-xs text-slate-300 font-mono flex items-center gap-1.5">
              <span>Practicing:</span>
              <b className="text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                {underlyingSymbol}
              </b>
            </span>

            <span className="text-slate-600 hidden sm:inline">•</span>

            <span className="text-xs text-slate-400 font-mono">
              Simulated: <b className="text-amber-300 font-bold">{selectedDate}</b> at{" "}
              <b className="text-white font-bold">{currentTimeLabel} IST</b>
            </span>
          </div>

          {/* Return to Live V3 Stream Button */}
          <button
            onClick={onReturnToLive}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-blue-500/25 transition-all active:scale-95 border border-blue-400/30 group"
            title="Exit snapshot simulator and resume live WebSocket V3 stream"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <Radio className="w-3.5 h-3.5 text-emerald-300 group-hover:scale-110 transition-transform" />
            <span>Return to Live V3 Stream</span>
          </button>
        </div>

        {/* Main Interactive Controls: Date, Timeline Scrubber, Play/Pause, Speeds & Reset */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          {/* Left: Date Selection & Trading Days (3 cols) */}
          <div className="lg:col-span-3 flex flex-col gap-1.5 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/90 shadow-inner">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
              <span className="flex items-center gap-1 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Select Session Date:</span>
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onChangeDate(e.target.value)}
                className="bg-slate-900 text-slate-100 border border-slate-700/80 rounded px-2 py-0.5 text-[11px] font-mono focus:outline-none focus:border-amber-400 cursor-pointer"
              />
            </div>

            {/* Quick Trading Day Pills */}
            <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono pt-0.5">
              {pastTradingDays.map((d) => (
                <button
                  key={d.dateStr}
                  onClick={() => onChangeDate(d.dateStr)}
                  className={`px-2 py-0.5 rounded font-bold transition whitespace-nowrap ${
                    selectedDate === d.dateStr
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Center: Timeline Scrubber with Time Range & Milestones (6 cols) */}
          <div className="lg:col-span-6 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/90 shadow-inner flex flex-col justify-between gap-1.5">
            {/* Header: From 09:15 AM to 03:30 PM and Current Value */}
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400 flex items-center gap-1 font-bold">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>From: 09:15 AM</span>
              </span>

              {/* Current Simulated Time Badge */}
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-700/60 font-black text-xs shadow-[0_0_12px_rgba(6,182,212,0.35)]">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>{currentTimeLabel}</span>
                <span className="text-[10px] text-cyan-400/80 font-normal">({progressPct.toFixed(0)}%)</span>
              </div>

              <span className="text-slate-400 font-bold">To: 03:30 PM</span>
            </div>

            {/* Range Slider Scrubber */}
            <div className="relative w-full flex items-center">
              <input
                type="range"
                min={sessionStartMin}
                max={sessionEndMin}
                step={1}
                value={currentMinute}
                onChange={(e) => onChangeMinute(parseInt(e.target.value, 10))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-ew-resize accent-cyan-400 focus:outline-none transition-all hover:bg-slate-700/90"
              />
            </div>

            {/* Quick Milestones Jump */}
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-0.5 overflow-x-auto gap-1">
              {milestones.map((m) => {
                const isActive = Math.abs(currentMinute - m.min) <= 5;
                return (
                  <button
                    key={m.min}
                    onClick={() => onChangeMinute(m.min)}
                    title={m.desc}
                    className={`px-1.5 py-0.2 rounded transition whitespace-nowrap ${
                      isActive
                        ? "bg-cyan-500 text-slate-950 font-black shadow-xs"
                        : "hover:text-cyan-300 hover:bg-slate-900"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Play/Pause, Speed (1x, 2x, 4x, 8x) & Reset (3 cols) */}
          <div className="lg:col-span-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/90 shadow-inner flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
              <span>Playback Controls:</span>
              <span className="text-[10px] text-amber-400 font-mono">
                {isPlaying ? `Playing at ${speed}x` : "Paused"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-1.5">
              {/* Play / Pause Toggle Button */}
              <button
                onClick={onTogglePlay}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95 shadow ${
                  isPlaying
                    ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                }`}
                title={isPlaying ? "Pause playback" : "Start real-time historical playback"}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    <span>Play</span>
                  </>
                )}
              </button>

              {/* Speed Buttons: 1x, 2x, 4x, 8x */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono">
                {([1, 2, 4, 8] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onChangeSpeed(s)}
                    className={`px-1.5 py-1 rounded font-black transition ${
                      speed === s
                        ? "bg-cyan-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title={`Playback Speed: ${s}x`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Reset to 09:15 AM Button */}
              <button
                onClick={onReset}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition active:scale-95"
                title="Reset simulation to 09:15 AM (Market Open)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-[9px] text-slate-500 font-mono text-center flex items-center justify-center gap-1">
              <Info className="w-2.5 h-2.5 text-slate-400" />
              <span>Simulates Theta decay, Greeks &amp; live Change in OI accumulation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
