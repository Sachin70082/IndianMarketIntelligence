"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Clock, Activity, TrendingUp, TrendingDown, Layers, Sparkles } from "lucide-react";
import {
  generateStrikeOiHistory,
  StrikeOiHistoryResult,
  OiDataPoint,
} from "@/lib/options/strikeOiHistory";

export interface StrikeOiGraphModalProps {
  isOpen: boolean;
  underlyingKey: string;
  strike: number | null;
  expiry: string;
  callChgOi: number;
  putChgOi: number;
  callOi: number;
  putOi: number;
  callLtp?: number;
  putLtp?: number;
  callKey?: string;
  putKey?: string;
  onClose: () => void;
}

export function StrikeOiGraphModal({
  isOpen,
  underlyingKey,
  strike,
  expiry,
  callChgOi,
  putChgOi,
  callOi,
  putOi,
  callLtp,
  putLtp,
  callKey,
  putKey,
  onClose,
}: StrikeOiGraphModalProps) {
  const [stepMinutes, setStepMinutes] = useState<number>(5);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [liveHistory, setLiveHistory] = useState<StrikeOiHistoryResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const indexSymbol = underlyingKey.split("|")[1] || underlyingKey;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch or calculate intraday Change in OI history strictly from 09:15 to 15:30 starting from 0
  useEffect(() => {
    if (!isOpen || !strike) {
      setLiveHistory(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchHistory = async () => {
      try {
        const params = new URLSearchParams({
          key: underlyingKey,
          strike: String(strike),
          expiry: expiry || "CURRENT",
          ce_chg_oi: String(callChgOi),
          pe_chg_oi: String(putChgOi),
          ce_oi: String(callOi),
          pe_oi: String(putOi),
          step: String(stepMinutes),
          call_key: callKey || "",
          put_key: putKey || "",
        });

        const res = await fetch(`/api/market/strike-oi-history?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && isMounted) {
            setLiveHistory(json.data);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to client generator
      }

      if (isMounted) {
        const fallback = generateStrikeOiHistory({
          underlyingKey,
          strike,
          expiry,
          currentCeChgOi: callChgOi,
          currentPeChgOi: putChgOi,
          currentCeOi: callOi,
          currentPeOi: putOi,
          stepMinutes,
        });
        setLiveHistory(fallback);
        setIsLoading(false);
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [isOpen, strike, underlyingKey, expiry, callChgOi, putChgOi, callOi, putOi, stepMinutes, callKey, putKey]);

  // Fixed Intraday Market Session Coordinates: strictly 09:15 AM to 03:30 PM (555 to 930 mins)
  const sessionStartMin = 9 * 60 + 15; // 555
  const sessionEndMin = 15 * 60 + 30; // 930
  const totalSessionMins = sessionEndMin - sessionStartMin; // 375 minutes

  // SVG Chart Geometry
  const chartWidth = 740;
  const chartHeight = 360;
  const paddingLeft = 70;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 45;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const points = liveHistory?.points || [];

  // Y-axis scaling & X-axis mapping starting strictly from 0 value at 09:15 AM
  const { minVal, maxVal, scaleY, scaleX, zeroY } = useMemo(() => {
    if (points.length === 0) {
      return {
        minVal: 0,
        maxVal: 50000,
        scaleY: () => chartHeight - paddingBottom,
        scaleX: () => paddingLeft,
        zeroY: chartHeight - paddingBottom,
      };
    }

    let min = 0; // Baseline is strictly 0
    let max = 0;

    for (const p of points) {
      if (p.ceChgOi < min) min = p.ceChgOi;
      if (p.peChgOi < min) min = p.peChgOi;
      if (p.ceChgOi > max) max = p.ceChgOi;
      if (p.peChgOi > max) max = p.peChgOi;
    }

    // Include current live values in bound
    if (callChgOi > max) max = callChgOi;
    if (putChgOi > max) max = putChgOi;
    if (callChgOi < min) min = callChgOi;
    if (putChgOi < min) min = putChgOi;

    // Minimum visual ceiling if values are small
    max = Math.max(max, 5000);

    // Add breathing room
    const range = max - min || 1;
    const paddedMax = max + range * 0.12;
    // If min is 0 (all positive changes), give a tiny 3% margin below 0 so the baseline line is clearly visible
    const paddedMin = min < 0 ? min - range * 0.1 : -range * 0.04;
    const paddedRange = paddedMax - paddedMin || 1;

    const sy = (val: number) => {
      const normalized = (val - paddedMin) / paddedRange;
      return chartHeight - paddingBottom - normalized * innerHeight;
    };

    const sx = (minuteOfDay: number) => {
      const clampedMin = Math.max(sessionStartMin, Math.min(sessionEndMin, minuteOfDay));
      const ratio = (clampedMin - sessionStartMin) / totalSessionMins;
      return paddingLeft + ratio * innerWidth;
    };

    const zY = sy(0);

    return {
      minVal: paddedMin,
      maxVal: paddedMax,
      scaleY: sy,
      scaleX: sx,
      zeroY: zY,
    };
  }, [points, callChgOi, putChgOi, innerHeight, innerWidth, paddingBottom, paddingLeft]);

  // Clean Y-axis grid ticks with rounded nice numbers starting from 0
  const yTicks = useMemo(() => {
    const span = maxVal - minVal;
    const rawStep = span / 5;
    
    // Nice round numbers
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / magnitude;
    let niceStep = magnitude;
    if (residual >= 5) niceStep = magnitude * 5;
    else if (residual >= 2) niceStep = magnitude * 2;

    const ticks: number[] = [0];
    
    // Positive ticks above 0
    for (let v = niceStep; v <= maxVal + niceStep * 0.4; v += niceStep) {
      ticks.push(Math.round(v));
    }

    // Negative ticks below 0 if unwinding occurs
    if (minVal < 0) {
      for (let v = -niceStep; v >= minVal - niceStep * 0.4; v -= niceStep) {
        ticks.push(Math.round(v));
      }
    }

    ticks.sort((a, b) => a - b);
    return ticks;
  }, [minVal, maxVal]);

  // Fixed Intraday X-axis Ticks: strictly 9:15 to 15:30 (Matches the trading session)
  const xTicks = useMemo(() => [
    { label: "9:15", minute: 555 },
    { label: "10:15", minute: 615 },
    { label: "11:15", minute: 675 },
    { label: "12:15", minute: 735 },
    { label: "13:12", minute: 792 },
    { label: "14:11", minute: 851 },
    { label: "15:10", minute: 910 },
    { label: "15:30", minute: 930 },
  ], []);

  // Format number in Indian numbering format: e.g. +4,50,000 or -1,20,000
  const formatIndianNumber = (num: number): string => {
    const sign = num > 0 ? "+" : "";
    return `${sign}${Math.round(num).toLocaleString("en-IN")}`;
  };

  // Compact Indian format for Y-axis (e.g. 0, +10k, +50k, +1L, -20k)
  const formatYAxisTick = (val: number): string => {
    if (val === 0) return "0";
    const sign = val > 0 ? "+" : "";
    if (Math.abs(val) >= 10000000) {
      return `${sign}${(val / 10000000).toFixed(1)} Cr`;
    }
    if (Math.abs(val) >= 100000) {
      return `${sign}${(val / 100000).toFixed(1)} L`;
    }
    if (Math.abs(val) >= 1000) {
      return `${sign}${Math.round(val).toLocaleString("en-IN")}`;
    }
    return `${sign}${Math.round(val)}`;
  };

  // SVG Line Path Generators (Starting from X=9:15, Y=0)
  const cePathD = useMemo(() => {
    if (points.length === 0) return "";
    return points
      .map((p, i) => {
        const x = scaleX(p.minuteOfDay || sessionStartMin + (i / (points.length - 1)) * totalSessionMins);
        const y = scaleY(p.ceChgOi);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points, scaleX, scaleY]);

  const pePathD = useMemo(() => {
    if (points.length === 0) return "";
    return points
      .map((p, i) => {
        const x = scaleX(p.minuteOfDay || sessionStartMin + (i / (points.length - 1)) * totalSessionMins);
        const y = scaleY(p.peChgOi);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points, scaleX, scaleY]);

  // Subtle gradient area paths under the curves down to the zero baseline
  const ceAreaD = useMemo(() => {
    if (points.length === 0 || !cePathD) return "";
    const firstX = scaleX(sessionStartMin);
    const lastPoint = points[points.length - 1];
    const lastX = scaleX(lastPoint.minuteOfDay || sessionEndMin);
    return `${cePathD} L ${lastX.toFixed(1)},${zeroY.toFixed(1)} L ${firstX.toFixed(1)},${zeroY.toFixed(1)} Z`;
  }, [cePathD, points, scaleX, zeroY]);

  const peAreaD = useMemo(() => {
    if (points.length === 0 || !pePathD) return "";
    const firstX = scaleX(sessionStartMin);
    const lastPoint = points[points.length - 1];
    const lastX = scaleX(lastPoint.minuteOfDay || sessionEndMin);
    return `${pePathD} L ${lastX.toFixed(1)},${zeroY.toFixed(1)} L ${firstX.toFixed(1)},${zeroY.toFixed(1)} Z`;
  }, [pePathD, points, scaleX, zeroY]);

  // Key circular marker milestone nodes (matching the reference image's hollow circular dots)
  const nodeIndices = useMemo(() => {
    if (points.length <= 4) return points.map((_, i) => i);
    const step = Math.max(2, Math.floor(points.length / 6));
    const indices: number[] = [0]; // Always include 09:15 (0)
    for (let i = step; i < points.length; i += step) {
      indices.push(i);
    }
    if (indices[indices.length - 1] !== points.length - 1) {
      indices.push(points.length - 1);
    }
    return indices;
  }, [points]);

  // Handle Mouse Scrubber
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const viewBoxX = (x / rect.width) * chartWidth;

    const clampedX = Math.max(paddingLeft, Math.min(chartWidth - paddingRight, viewBoxX));
    const ratio = (clampedX - paddingLeft) / innerWidth;
    const minuteAtCursor = sessionStartMin + ratio * totalSessionMins;

    // Find closest point by minuteOfDay
    let closestIdx = 0;
    let minDiff = Infinity;
    points.forEach((p, idx) => {
      const pMin = p.minuteOfDay || sessionStartMin + (idx / (points.length - 1)) * totalSessionMins;
      const diff = Math.abs(pMin - minuteAtCursor);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setHoveredIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  if (!isOpen || !strike) return null;

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : points[points.length - 1];
  const activeCeVal = activePoint ? activePoint.ceChgOi : callChgOi;
  const activePeVal = activePoint ? activePoint.peChgOi : putChgOi;
  const netDiff = activePeVal - activeCeVal;

  // Active hover coordinates
  const activeHoverX = activePoint
    ? scaleX(activePoint.minuteOfDay || sessionStartMin)
    : null;
  const activeCeY = activePoint ? scaleY(activeCeVal) : null;
  const activePeY = activePoint ? scaleY(activePeVal) : null;

  // Last points for dynamic callout labels
  const lastPoint = points[points.length - 1];
  const lastCeY = lastPoint ? scaleY(lastPoint.ceChgOi) : 0;
  const lastPeY = lastPoint ? scaleY(lastPoint.peChgOi) : 0;
  const lastX = lastPoint ? scaleX(lastPoint.minuteOfDay || sessionEndMin) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md transition-opacity duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[760px] bg-[#090d16] text-slate-100 rounded-2xl border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col font-sans select-none animate-in fade-in zoom-in-95 duration-150 my-auto ring-1 ring-slate-700/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Dark Bar: Symbol, Expiry, Step Resolution & Close */}
        <div className="px-5 py-2.5 flex items-center justify-between text-xs bg-slate-950 border-b border-slate-800/90 text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-black uppercase tracking-wider text-[11px] text-cyan-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>{indexSymbol}</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] font-mono text-slate-300">
              Expiry: <b className="text-white font-bold">{expiry || "Current"}</b>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[10px] font-mono text-cyan-300 font-extrabold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 uppercase">
              Intraday Change in OI Only
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 hidden sm:inline">
              Starts 0 at 09:15 AM
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Step Minutes (5m, 15m, 30m) */}
            <div className="flex items-center p-0.5 rounded-lg border border-slate-800 bg-slate-900 font-mono text-[10px]">
              {[5, 15, 30].map((s) => (
                <button
                  key={s}
                  onClick={() => setStepMinutes(s)}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    stepMinutes === s
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {s}m
                </button>
              ))}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-rose-950 hover:border-rose-800 border border-slate-800 transition"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* HERO HEADER IN IMPRESSIVE DARK STYLE (Pure Intraday Change in OI Comparison) */}
        {/* Left: Green Call Chg OI | Center: Blue Underlined Strike | Right: Red Put Chg OI */}
        <div className="px-6 py-4 flex items-center justify-between gap-4 bg-gradient-to-b from-[#0e1628] to-[#090d16] border-b border-slate-800/80">
          {/* CALL SIDE (GREEN) - INTRADAY CHANGE IN OI */}
          <div className="flex-1 text-left">
            <div className="text-2xl sm:text-3xl xl:text-4xl font-black font-mono tracking-tight text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.35)]">
              {formatIndianNumber(activeCeVal)}
            </div>
            <div className="text-[11px] sm:text-xs font-bold mt-1 flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)] shrink-0" />
              <span className="font-extrabold uppercase tracking-wide">
                call side Chg OI
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-800/50 text-emerald-300 font-mono font-bold">
                Intraday
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              <span>CE Shift: <b className="text-emerald-300">{formatIndianNumber(callChgOi)}</b></span>
              {callLtp !== undefined && <span> • LTP: ₹{callLtp.toFixed(1)}</span>}
            </div>
          </div>

          {/* STRIKE PRICE (BLUE WITH UNDERLINE) */}
          <div className="flex-1 text-center">
            <div className="inline-block border-b-2 border-cyan-400 pb-0.5">
              <span className="text-2xl sm:text-3xl xl:text-4xl font-black font-mono tracking-wide text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                {strike.toFixed(1)}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 mt-1 uppercase tracking-wider">
              <span>Strike Price</span>
            </div>
          </div>

          {/* PUT SIDE (RED) - INTRADAY CHANGE IN OI */}
          <div className="flex-1 text-right">
            <div className="text-2xl sm:text-3xl xl:text-4xl font-black font-mono tracking-tight text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.35)]">
              {formatIndianNumber(activePeVal)}
            </div>
            <div className="text-[11px] sm:text-xs font-bold mt-1 flex items-center justify-end gap-1.5 text-rose-400">
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950/80 border border-rose-800/50 text-rose-300 font-mono font-bold">
                Intraday
              </span>
              <span className="font-extrabold uppercase tracking-wide">
                put side Chg OI
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)] shrink-0" />
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              <span>PE Shift: <b className="text-rose-300">{formatIndianNumber(putChgOi)}</b></span>
              {putLtp !== undefined && <span> • LTP: ₹{putLtp.toFixed(1)}</span>}
            </div>
          </div>
        </div>

        {/* Live Hover Status Sub-bar: Pure Intraday Change in OI Difference */}
        <div className="px-6 py-2 flex items-center justify-between text-[11px] font-mono bg-slate-950 border-b border-slate-800/80 text-slate-300">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold">
              Time: <b className="text-white">{activePoint ? activePoint.time : "09:15 - 15:30"}</b> IST
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">
              Origin: <b className="text-emerald-400">0 at 09:15 AM</b>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">
              Net Chg OI Diff (PE - CE):{" "}
              <b className={netDiff > 0 ? "text-emerald-400" : netDiff < 0 ? "text-rose-400" : "text-amber-400"}>
                {netDiff > 0 ? `+${netDiff.toLocaleString("en-IN")}` : netDiff.toLocaleString("en-IN")}
              </b>
            </span>
            <span>
              {netDiff > 500 ? (
                <span className="px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 font-bold text-[10px] border border-emerald-700/60 shadow-xs">
                  🟢 Put Writers Adding (Bullish Support)
                </span>
              ) : netDiff < -500 ? (
                <span className="px-2 py-0.5 rounded bg-rose-950/70 text-rose-300 font-bold text-[10px] border border-rose-700/60 shadow-xs">
                  🔴 Call Writers Adding (Bearish Resistance)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 font-bold text-[10px] border border-amber-700/60">
                  🟡 Neutral Equilibrium
                </span>
              )}
            </span>
          </div>
        </div>

        {/* CHART CANVAS: Strictly 09:15 AM to 03:30 PM with Both Lines Starting from 0 at 9:15 */}
        <div className="p-4 sm:p-6 relative flex flex-col items-center justify-center bg-[#060910]">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-[320px] sm:h-[350px] overflow-visible cursor-crosshair select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              {/* Green CE Gradient for Area */}
              <linearGradient id="ceDarkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>

              {/* Red PE Gradient for Area */}
              <linearGradient id="peDarkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid & Left Y-Axis Values (0, 10,000, 20,000, ...) */}
            {yTicks.map((val) => {
              const y = scaleY(val);
              const isZero = val === 0;
              return (
                <g key={val}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke={isZero ? "#475569" : "#162032"}
                    strokeWidth={isZero ? 1.5 : 1}
                    strokeDasharray={isZero ? "4 4" : "2 2"}
                  />
                  <text
                    x={paddingLeft - 10}
                    y={y + 3.5}
                    textAnchor="end"
                    className={`text-[10px] font-mono select-none ${
                      isZero ? "fill-cyan-400 font-extrabold" : "fill-slate-400 font-medium"
                    }`}
                  >
                    {formatYAxisTick(val)}
                  </text>
                </g>
              );
            })}

            {/* Vertical Grid & Fixed Intraday X-Axis Time Labels (9:15 to 15:30) */}
            {xTicks.map((tick) => {
              const x = scaleX(tick.minute);
              const isStart = tick.minute === sessionStartMin;
              return (
                <g key={tick.label}>
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={chartHeight - paddingBottom}
                    stroke="#162032"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                  <text
                    x={x}
                    y={chartHeight - paddingBottom + 16}
                    textAnchor="middle"
                    className={`text-[10px] font-mono select-none ${
                      isStart ? "fill-cyan-400 font-black" : "fill-slate-400 font-semibold"
                    }`}
                  >
                    {tick.label}
                  </text>
                </g>
              );
            })}

            {/* Solid Bottom Baseline */}
            <line
              x1={paddingLeft}
              y1={chartHeight - paddingBottom}
              x2={chartWidth - paddingRight}
              y2={chartHeight - paddingBottom}
              stroke="#334155"
              strokeWidth={1.5}
            />

            {/* Solid Left Y-Axis Baseline */}
            <line
              x1={paddingLeft}
              y1={paddingTop}
              x2={paddingLeft}
              y2={chartHeight - paddingBottom}
              stroke="#334155"
              strokeWidth={1.5}
            />

            {/* PROMINENT ZERO BASELINE (Both curves start here at 09:15 AM) */}
            <line
              x1={paddingLeft}
              y1={zeroY}
              x2={chartWidth - paddingRight}
              y2={zeroY}
              stroke="#64748b"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            {/* Zero Origin Badge */}
            <circle
              cx={paddingLeft}
              cy={zeroY}
              r={4.5}
              fill="#38bdf8"
              stroke="#090d16"
              strokeWidth={2}
            />

            {/* GRADIENT AREAS UNDER CURVES */}
            {ceAreaD && <path d={ceAreaD} fill="url(#ceDarkGradient)" />}
            {peAreaD && <path d={peAreaD} fill="url(#peDarkGradient)" />}

            {/* GREEN LINE: CALL SIDE OI (Starts from 0 at 9:15 AM) */}
            {cePathD && (
              <path
                d={cePathD}
                fill="none"
                stroke="#10b981"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* RED LINE: PUT SIDE OI (Starts from 0 at 9:15 AM) */}
            {pePathD && (
              <path
                d={pePathD}
                fill="none"
                stroke="#f43f5e"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* CIRCULAR HOLLOW NODE MARKERS (Matching Screenshot) */}
            {/* Green Nodes on Call Line */}
            {nodeIndices.map((idx) => {
              const p = points[idx];
              if (!p) return null;
              const x = scaleX(p.minuteOfDay || sessionStartMin);
              const y = scaleY(p.ceChgOi);
              return (
                <circle
                  key={`ce-node-${idx}`}
                  cx={x}
                  cy={y}
                  r={3.5}
                  fill="#090d16"
                  stroke="#10b981"
                  strokeWidth={2}
                />
              );
            })}

            {/* Red Nodes on Put Line */}
            {nodeIndices.map((idx) => {
              const p = points[idx];
              if (!p) return null;
              const x = scaleX(p.minuteOfDay || sessionStartMin);
              const y = scaleY(p.peChgOi);
              return (
                <circle
                  key={`pe-node-${idx}`}
                  cx={x}
                  cy={y}
                  r={3.5}
                  fill="#090d16"
                  stroke="#f43f5e"
                  strokeWidth={2}
                />
              );
            })}

            {/* VISUAL CALLOUT ARROWS & LABELS (Matching Screenshot Style) */}
            {lastPoint && (
              <g>
                {/* Arrow & Label for Call Side OI (Green) */}
                <g transform={`translate(${Math.min(chartWidth - 105, lastX - 10)}, ${Math.max(paddingTop + 15, Math.min(chartHeight - paddingBottom - 45, lastCeY - 12))})`}>
                  <line
                    x1={0}
                    y1={12}
                    x2={-15}
                    y2={12}
                    stroke="#10b981"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                  />
                  <polygon
                    points="-15,12 -8,8 -8,16"
                    fill="#10b981"
                  />
                  <rect
                    x={4}
                    y={0}
                    width={95}
                    height={24}
                    rx={6}
                    fill="#052e16"
                    stroke="#10b981"
                    strokeWidth={1.2}
                    className="drop-shadow-md"
                  />
                  <text
                    x={51}
                    y={16}
                    textAnchor="middle"
                    className="text-[10px] font-sans font-black select-none fill-emerald-300"
                  >
                    Call Chg OI 📈
                  </text>
                </g>

                {/* Arrow & Label for Put Side Chg in OI (Red) */}
                <g transform={`translate(${Math.min(chartWidth - 105, lastX - 10)}, ${Math.max(paddingTop + 45, Math.min(chartHeight - paddingBottom - 15, lastPeY + 12))})`}>
                  <line
                    x1={0}
                    y1={12}
                    x2={-15}
                    y2={12}
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                  />
                  <polygon
                    points="-15,12 -8,8 -8,16"
                    fill="#f43f5e"
                  />
                  <rect
                    x={4}
                    y={0}
                    width={95}
                    height={24}
                    rx={6}
                    fill="#450a0a"
                    stroke="#f43f5e"
                    strokeWidth={1.2}
                    className="drop-shadow-md"
                  />
                  <text
                    x={51}
                    y={16}
                    textAnchor="middle"
                    className="text-[10px] font-sans font-black select-none fill-rose-300"
                  >
                    Put Chg OI 📉
                  </text>
                </g>
              </g>
            )}

            {/* INTERACTIVE HOVER SCRUBBER CROSSHAIR & TOOLTIP */}
            {hoveredIndex !== null && activePoint && activeHoverX !== null && activeCeY !== null && activePeY !== null && (
              <g>
                {/* Vertical Cursor Crosshair Line */}
                <line
                  x1={activeHoverX}
                  y1={paddingTop}
                  x2={activeHoverX}
                  y2={chartHeight - paddingBottom}
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />

                {/* Active Hover Dot on Call Line */}
                <circle
                  cx={activeHoverX}
                  cy={activeCeY}
                  r={5.5}
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth={2}
                  className="drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                />

                {/* Active Hover Dot on Put Line */}
                <circle
                  cx={activeHoverX}
                  cy={activePeY}
                  r={5.5}
                  fill="#f43f5e"
                  stroke="#ffffff"
                  strokeWidth={2}
                  className="drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                />

                {/* Floating Tooltip Box */}
                <g
                  transform={`translate(${
                    activeHoverX > chartWidth - 170 ? activeHoverX - 160 : activeHoverX + 14
                  }, ${Math.min(chartHeight - 115, Math.max(paddingTop + 10, (activeCeY + activePeY) / 2 - 40))})`}
                >
                  <rect
                    x={0}
                    y={0}
                    width={150}
                    height={76}
                    rx={8}
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth={1.5}
                    className="drop-shadow-2xl"
                  />
                  {/* Tooltip Header: Time */}
                  <text
                    x={12}
                    y={18}
                    className="text-[10px] font-mono font-bold select-none fill-slate-400"
                  >
                    Time: {activePoint.time} IST
                  </text>
                  {/* Call Value in Green */}
                  <circle cx={16} cy={35} r={3.5} fill="#10b981" />
                  <text
                    x={26}
                    y={38}
                    className="text-[11px] font-mono font-black select-none fill-emerald-400"
                  >
                    CE Chg OI: {formatIndianNumber(activeCeVal)}
                  </text>
                  {/* Put Value in Red */}
                  <circle cx={16} cy={55} r={3.5} fill="#f43f5e" />
                  <text
                    x={26}
                    y={58}
                    className="text-[11px] font-mono font-black select-none fill-rose-400"
                  >
                    PE Chg OI: {formatIndianNumber(activePeVal)}
                  </text>
                </g>
              </g>
            )}
          </svg>
        </div>

        {/* Modal Footer: Quick Legend & Informational Guidance */}
        <div className="px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px] bg-slate-950 border-t border-slate-800 text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Call Chg OI (Intraday Green)</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5 font-bold text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>Put Chg OI (Intraday Red)</span>
            </span>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <span className="text-cyan-400 font-bold">Pure Intraday Chg OI</span>
            <span className="text-slate-600">•</span>
            <span>09:15 AM - 03:30 PM IST</span>
            <span className="text-slate-600">•</span>
            <span>Origin: <b className="text-emerald-400">0 at 09:15 AM</b></span>
          </div>
        </div>
      </div>
    </div>
  );
}
