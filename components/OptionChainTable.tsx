"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { OptionChainSummary, OptionChainRow, MarketQuoteData } from "@/lib/types/market";
import { FreshnessBadge } from "./StatusBadge";
import { AlertCircle, HelpCircle, Layers, TrendingUp, TrendingDown, Calendar, RefreshCw, Maximize2, Minimize2, Crosshair, Timer } from "lucide-react";
import { calculateOptionChainDominance, StrikeDominanceItem } from "@/lib/options/dominance";
import { StrikeLevelsPopup } from "./StrikeLevelsPopup";
import { StrikeOiGraphModal } from "./StrikeOiGraphModal";
import { getMajorMarketStrikes } from "@/lib/options/optionChainLevels";
import { computeGammaRadar, StrikeGammaAnalysis } from "@/lib/options/gammaRadar";

interface DominanceCellProps {
  ranking?: StrikeDominanceItem;
  defaultTextClass?: string;
  isChgOi?: boolean;
}

function DominanceCell({
  ranking,
  defaultTextClass = "text-slate-300",
  isChgOi = false,
}: DominanceCellProps) {
  if (!ranking || ranking.rawValue === null || ranking.rawValue === undefined) {
    return <span className="text-slate-600">-</span>;
  }

  const { style, isLeader, isRunnerUp, isSubtleShaded, displayValue, percentageLabel, rawValue } = ranking;

  let textColorClass = defaultTextClass;
  if (!isLeader && !isRunnerUp) {
    if (isChgOi) {
      const num = Number(rawValue || 0);
      textColorClass = num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-500";
    }
  }

  const hasHighlight = isLeader || isRunnerUp || isSubtleShaded;

  return (
    <div
      className={`w-full flex items-center justify-end gap-0.5 xl:gap-1 px-1 py-0.5 rounded transition-all duration-150 ease-in-out font-mono select-none overflow-hidden ${
        isLeader
          ? "border shadow-md ring-1 ring-emerald-400/60 font-black"
          : isRunnerUp
          ? "border shadow-md ring-1 ring-amber-400/50 font-black"
          : isSubtleShaded
          ? "border font-bold"
          : "font-semibold"
      }`}
      style={{
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderColor: style.borderColor || "transparent",
        boxShadow: style.boxShadow,
      }}
      title={
        isLeader
          ? `👑 1st Largest [100% Dominance]: ${displayValue} (${rawValue?.toLocaleString("en-IN")})`
          : isRunnerUp
          ? `🥈 2nd Largest [${percentageLabel} of Leader]: ${displayValue} (${rawValue?.toLocaleString("en-IN")})`
          : `${displayValue} [${percentageLabel} of Leader]`
      }
    >
      {/* Market Value - Full Indian format on 2xl+, compact L/k on standard displays */}
      <span
        className={`${
          hasHighlight && style.color ? "" : textColorClass
        } text-[10px] xl:text-[11px] 2xl:text-xs tracking-tight font-bold whitespace-nowrap truncate`}
      >
        <span className="hidden 2xl:inline">{displayValue}</span>
        <span className="2xl:hidden">{ranking.compactDisplayValue || displayValue}</span>
      </span>

      {/* Relative Percentage Badge */}
      {percentageLabel !== "-" && (
        <span
          className="text-[8px] xl:text-[9px] px-1 py-0.2 rounded font-mono font-bold leading-none border transition-colors duration-150 shrink-0 whitespace-nowrap"
          style={{
            backgroundColor: style.badgeBgColor || "rgba(30, 41, 59, 0.6)",
            color: style.badgeTextColor || "#94a3b8",
            borderColor: style.badgeBorderColor || "rgba(51, 65, 85, 0.4)",
          }}
        >
          {percentageLabel}
        </span>
      )}
    </div>
  );
}

interface GammaWarningCellProps {
  analysis?: StrikeGammaAnalysis;
  isCall: boolean;
}

function GammaWarningCell({ analysis, isCall }: GammaWarningCellProps) {
  if (!analysis) {
    return <span className="text-slate-600 font-mono text-[10px]">-</span>;
  }

  const { gamma, direction, status, percentOfMax, changeDelta, tooltip } = analysis;
  const gammaDisplay = gamma.toFixed(4);

  // Status-based warning styling
  if (status === "BLAST") {
    return (
      <div
        className="w-full flex items-center justify-center gap-1 px-1 py-0.5 rounded bg-fuchsia-950/80 border border-fuchsia-500 shadow-[0_0_12px_rgba(217,70,239,0.55)] font-mono select-none cursor-help animate-pulse group/blast"
        title={`${tooltip} • 💥 CRITICAL GAMMA BLAST: ATM/0DTE explosion risk! Massive delta surges expected on spot movement.`}
      >
        <span className="px-1 py-0.2 rounded bg-fuchsia-500 text-slate-950 font-black text-[8px] uppercase tracking-wider shrink-0">
          💥 BLAST
        </span>
        <span className="text-fuchsia-200 font-black text-[10px] xl:text-[11px] drop-shadow-[0_0_6px_rgba(217,70,239,0.9)]">
          {gammaDisplay}
        </span>
        {direction === "UP" ? (
          <span className="text-emerald-400 font-black text-[10px] shrink-0" title={`Gamma Surging UP (+${changeDelta})`}>
            ▲
          </span>
        ) : direction === "DOWN" ? (
          <span className="text-rose-400 font-black text-[10px] shrink-0" title={`Gamma Decaying DOWN (${changeDelta})`}>
            ▼
          </span>
        ) : null}
      </div>
    );
  }

  if (status === "SPIKE") {
    return (
      <div
        className="w-full flex items-center justify-center gap-1 px-1 py-0.5 rounded bg-amber-950/75 border border-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.35)] font-mono select-none cursor-help group/spike"
        title={`${tooltip} • ⚡ GAMMA SPIKE: High acceleration zone! Strike entering high gamma territory.`}
      >
        <span className="px-1 py-0.2 rounded bg-amber-500/30 text-amber-300 border border-amber-500/50 font-extrabold text-[8px] uppercase shrink-0">
          ⚡ SPIKE
        </span>
        <span className="text-amber-200 font-bold text-[10px] xl:text-[11px]">
          {gammaDisplay}
        </span>
        {direction === "UP" ? (
          <span className="text-emerald-400 font-black text-[10px] shrink-0" title={`Gamma Rising UP (+${changeDelta})`}>
            ▲
          </span>
        ) : direction === "DOWN" ? (
          <span className="text-rose-400 font-black text-[10px] shrink-0" title={`Gamma Falling DOWN (${changeDelta})`}>
            ▼
          </span>
        ) : null}
      </div>
    );
  }

  if (status === "ELEVATED") {
    return (
      <div
        className="w-full flex items-center justify-center gap-1 px-1 py-0.5 rounded bg-purple-950/40 border border-purple-800/50 font-mono select-none cursor-help"
        title={tooltip}
      >
        <span className="text-purple-300 font-semibold text-[10px] xl:text-[11px]">
          {gammaDisplay}
        </span>
        {direction === "UP" ? (
          <span className="text-emerald-400 font-bold text-[9px] shrink-0" title={`Gamma Rising UP (+${changeDelta})`}>▲</span>
        ) : direction === "DOWN" ? (
          <span className="text-rose-400 font-bold text-[9px] shrink-0" title={`Gamma Falling DOWN (${changeDelta})`}>▼</span>
        ) : null}
      </div>
    );
  }

  // Normal / Low Gamma
  return (
    <div
      className="w-full flex items-center justify-center gap-0.5 px-0.5 py-0.5 font-mono select-none cursor-help text-[10px] text-slate-400"
      title={tooltip}
    >
      <span className="text-slate-400">{gammaDisplay}</span>
      {direction === "UP" ? (
        <span className="text-emerald-400/90 text-[8px] shrink-0 font-bold" title={`Gamma UP (+${changeDelta})`}>▲</span>
      ) : direction === "DOWN" ? (
        <span className="text-rose-400/90 text-[8px] shrink-0 font-bold" title={`Gamma DOWN (${changeDelta})`}>▼</span>
      ) : null}
    </div>
  );
}

interface OptionChainTableProps {
  optionChain: OptionChainSummary | null;
  underlyingKey: string;
  activeQuote?: MarketQuoteData | null;
  onSelectUnderlying: (key: string) => void;
  selectedExpiry: string;
  onSelectExpiry: (expiry: string) => void;
  availableExpiries: string[];
  isLoading: boolean;
  onRefresh: () => void;
  error?: string | null;
}

export function OptionChainTable({
  optionChain,
  underlyingKey,
  activeQuote,
  onSelectUnderlying,
  selectedExpiry,
  onSelectExpiry,
  availableExpiries,
  isLoading,
  onRefresh,
  error,
}: OptionChainTableProps) {
  const [showGreeks, setShowGreeks] = useState(false); // Default to clean table view (Greeks hidden by default)
  const [strikeRange, setStrikeRange] = useState<number>(20); // Default ATM ± 20 for full chain visibility
  const [isExpanded, setIsExpanded] = useState(false); // Fullscreen expansion mode

  // Support & Resistance Levels Popup State
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [strikeAnchorRect, setStrikeAnchorRect] = useState<DOMRect | null>(null);

  // Intraday Change in OI Chart Modal State (09:15 AM to Present, PE Red vs CE Green)
  const [oiChartStrike, setOiChartStrike] = useState<{
    strike: number;
    callChgOi: number;
    putChgOi: number;
    callOi: number;
    putOi: number;
    callLtp?: number;
    putLtp?: number;
    callKey?: string;
    putKey?: string;
  } | null>(null);

  const handleOpenOiChart = useCallback((row: OptionChainRow) => {
    setOiChartStrike({
      strike: row.strike_price,
      callChgOi: row.call?.change_oi ?? 0,
      putChgOi: row.put?.change_oi ?? 0,
      callOi: row.call?.oi ?? 0,
      putOi: row.put?.oi ?? 0,
      callLtp: row.call?.ltp,
      putLtp: row.put?.ltp,
      callKey: row.call?.instrument_key,
      putKey: row.put?.instrument_key,
    });
  }, []);

  // Real-time Spot Price with Zero-Latency Millisecond Updates
  const [internalLiveSpot, setInternalLiveSpot] = useState<number | null>(null);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | "neutral">("neutral");
  const prevSpotRef = useRef<number | null>(null);

  // Live Spot Price: prioritizes real-time activeQuote stream, then internal 1s live poller, then option chain snapshot
  const liveSpotPrice = activeQuote?.last_price ?? internalLiveSpot ?? optionChain?.underlying_spot_price ?? 0;

  // Real-time tick flash animation whenever spot price ticks in milliseconds
  useEffect(() => {
    if (liveSpotPrice > 0) {
      if (prevSpotRef.current !== null && prevSpotRef.current !== liveSpotPrice) {
        setPriceFlash(liveSpotPrice > prevSpotRef.current ? "up" : "down");
        const timer = setTimeout(() => setPriceFlash("neutral"), 350);
        prevSpotRef.current = liveSpotPrice;
        return () => clearTimeout(timer);
      }
      prevSpotRef.current = liveSpotPrice;
    }
  }, [liveSpotPrice]);

  // High-frequency 1-second live poller for underlyingKey (backup guarantee for instant sub-second ticks)
  useEffect(() => {
    if (!underlyingKey) return;

    let isMounted = true;
    const fetchFastSpot = async () => {
      try {
        const res = await fetch(`/api/market/quotes?keys=${encodeURIComponent(underlyingKey)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.quotes && json.quotes.length > 0 && isMounted) {
            const q = json.quotes[0];
            if (q.last_price > 0) {
              setInternalLiveSpot(q.last_price);
            }
          }
        }
      } catch {
        // Safe ignore
      }
    };

    const interval = setInterval(fetchFastSpot, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [underlyingKey]);

  // Sync open Change in OI chart data when live option chain refreshes
  useEffect(() => {
    if (!oiChartStrike || !optionChain?.strikes) return;
    const updatedRow = optionChain.strikes.find((s) => s.strike_price === oiChartStrike.strike);
    if (updatedRow) {
      setOiChartStrike((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          callChgOi: updatedRow.call?.change_oi ?? prev.callChgOi,
          putChgOi: updatedRow.put?.change_oi ?? prev.putChgOi,
          callOi: updatedRow.call?.oi ?? prev.callOi,
          putOi: updatedRow.put?.oi ?? prev.putOi,
          callLtp: updatedRow.call?.ltp ?? prev.callLtp,
          putLtp: updatedRow.put?.ltp ?? prev.putLtp,
          callKey: updatedRow.call?.instrument_key ?? prev.callKey,
          putKey: updatedRow.put?.instrument_key ?? prev.putKey,
        };
      });
    }
  }, [optionChain?.timestamp, optionChain?.strikes]);

  // Auto-refresh Option Chain Interval (Default: 60s / 1 min as per user request)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(60);
  const [countdown, setCountdown] = useState<number>(60);
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const handleSetAutoRefresh = useCallback((sec: number) => {
    setAutoRefreshInterval(sec);
    setCountdown(sec);
  }, []);

  // Auto-refresh countdown timer effect (ticking every 1s when tab is visible)
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    setCountdown(autoRefreshInterval);

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      setCountdown((prev) => {
        if (prev <= 1) {
          if (!isLoadingRef.current) {
            onRefreshRef.current();
          }
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshInterval]);

  // Reset countdown whenever underlyingKey or selectedExpiry changes
  useEffect(() => {
    if (autoRefreshInterval > 0) {
      setCountdown(autoRefreshInterval);
    }
  }, [underlyingKey, selectedExpiry, autoRefreshInterval]);

  // Close popups if underlying or expiry changes
  useEffect(() => {
    setSelectedStrike(null);
    setStrikeAnchorRect(null);
    setOiChartStrike(null);
  }, [underlyingKey, selectedExpiry]);

  const handleStrikeClick = (strike: number, e: React.MouseEvent<HTMLElement>) => {
    if (selectedStrike === strike) {
      setSelectedStrike(null);
      setStrikeAnchorRect(null);
    } else {
      setSelectedStrike(strike);
      setStrikeAnchorRect(e.currentTarget.getBoundingClientRect());
    }
  };

  const handleStrikeKeyDown = (strike: number, e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (selectedStrike === strike) {
        setSelectedStrike(null);
        setStrikeAnchorRect(null);
      } else {
        setSelectedStrike(strike);
        setStrikeAnchorRect(e.currentTarget.getBoundingClientRect());
      }
    }
  };

  // Pure F&O underlyings (NSE & BSE)
  const underlyings = [
    { key: "NSE_INDEX|Nifty 50", label: "NIFTY 50" },
    { key: "NSE_INDEX|Nifty Bank", label: "BANKNIFTY" },
    { key: "BSE_INDEX|SENSEX", label: "SENSEX" },
    { key: "NSE_INDEX|Nifty Fin Service", label: "FINNIFTY" },
    { key: "NSE_INDEX|NIFTY MID SELECT", label: "MIDCPNIFTY" },
    { key: "NSE_EQ|INE002A01018", label: "RELIANCE" },
    { key: "NSE_EQ|INE040A01034", label: "HDFCBANK" },
  ];

  // Helper to determine buildup tag
  const getBuildup = (side: any) => {
    if (!side || side.ltp <= 0 || !side.oi) return null;
    const priceChg = side.close_price > 0 ? side.ltp - side.close_price : 0;
    const oiChg = side.change_oi || 0;
    if (Math.abs(oiChg) < 500) return null;

    if (priceChg > 0 && oiChg > 0) return { tag: "LB", label: "Long Buildup (Price ↑, OI ↑) - Fresh Bullish Longs", color: "text-emerald-400 bg-emerald-950/60 border-emerald-800/40" };
    if (priceChg < 0 && oiChg > 0) return { tag: "SB", label: "Short Buildup (Price ↓, OI ↑) - Fresh Bearish Shorts", color: "text-rose-400 bg-rose-950/60 border-rose-800/40" };
    if (priceChg > 0 && oiChg < 0) return { tag: "SC", label: "Short Covering (Price ↑, OI ↓) - Sellers Exiting Shorts (Bullish)", color: "text-cyan-400 bg-cyan-950/60 border-cyan-800/40" };
    if (priceChg < 0 && oiChg < 0) return { tag: "LU", label: "Long Unwinding (Price ↓, OI ↓) - Buyers Exiting Longs (Bearish)", color: "text-amber-400 bg-amber-950/60 border-amber-800/40" };
    return null;
  };

  // Dynamic Live ATM Strike recalculated in 0ms whenever spot price ticks
  const liveAtmStrike = React.useMemo(() => {
    const spot = liveSpotPrice || optionChain?.underlying_spot_price || 0;
    if (!spot || !optionChain?.strikes || optionChain.strikes.length === 0) {
      return optionChain?.atm_strike ?? 0;
    }
    let closest = optionChain.strikes[0].strike_price;
    let minDiff = Math.abs(spot - closest);
    for (const s of optionChain.strikes) {
      const diff = Math.abs(spot - s.strike_price);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s.strike_price;
      }
    }
    return closest;
  }, [liveSpotPrice, optionChain?.strikes, optionChain?.atm_strike]);

  // Dynamic Live ATM Row for immediate Straddle calculations
  const liveAtmRow = React.useMemo(() => {
    if (!optionChain?.strikes || !liveAtmStrike) return null;
    return optionChain.strikes.find((s) => s.strike_price === liveAtmStrike) || null;
  }, [optionChain?.strikes, liveAtmStrike]);

  // Calculate ATM Straddle Price in Real-Time (ATM CE LTP + ATM PE LTP)
  const liveStraddlePrice = React.useMemo(() => {
    if (liveAtmRow?.call?.ltp && liveAtmRow?.put?.ltp) {
      return Number((liveAtmRow.call.ltp + liveAtmRow.put.ltp).toFixed(1));
    }
    const atmRow = optionChain?.strikes?.find((s) => s.is_atm);
    return atmRow && atmRow.call?.ltp && atmRow.put?.ltp
      ? Number((atmRow.call.ltp + atmRow.put.ltp).toFixed(1))
      : null;
  }, [liveAtmRow, optionChain?.strikes]);

  // Filter strikes based on Dynamic Live ATM ± range
  const displayedStrikes = React.useMemo(() => {
    if (!optionChain?.strikes || optionChain.strikes.length === 0) return [];
    if (strikeRange === 0) return optionChain.strikes; // All strikes

    const atmIndex = optionChain.strikes.findIndex((s) => s.strike_price === liveAtmStrike);
    const fallbackAtmIndex = optionChain.strikes.findIndex((s) => s.is_atm);
    const targetIndex = atmIndex !== -1 ? atmIndex : fallbackAtmIndex;

    if (targetIndex === -1) return optionChain.strikes.slice(0, strikeRange * 2);

    const start = Math.max(0, targetIndex - strikeRange);
    const end = Math.min(optionChain.strikes.length, targetIndex + strikeRange + 1);
    return optionChain.strikes.slice(start, end);
  }, [optionChain?.strikes, strikeRange, liveAtmStrike]);

  // Auto-scroll & Auto-center ATM row in the middle of the visible table container
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const atmRowRef = useRef<HTMLTableRowElement>(null);

  const centerAtmRow = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!tableContainerRef.current || !atmRowRef.current) return;
    const container = tableContainerRef.current;
    const row = atmRowRef.current;

    if (container.clientHeight === 0) return;

    const containerRect = container.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const thead = container.querySelector("thead");
    const headerHeight = thead ? thead.offsetHeight : 0;

    const visibleCenterY = containerRect.top + headerHeight + (container.clientHeight - headerHeight) / 2;
    const rowCenterY = rowRect.top + rowRect.height / 2;
    const delta = rowCenterY - visibleCenterY;

    if (Math.abs(delta) > 3) {
      container.scrollBy({
        top: delta,
        behavior,
      });
    }
  }, []);

  // Auto-center ATM row on data load, after each live refresh, expiry/underlying change, or range change
  useEffect(() => {
    if (displayedStrikes.length > 0 && (liveAtmStrike || optionChain?.atm_strike || liveSpotPrice)) {
      const t1 = setTimeout(() => centerAtmRow("auto"), 30);
      const t2 = setTimeout(() => centerAtmRow("auto"), 120);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [
    liveAtmStrike,
    liveSpotPrice,
    optionChain?.atm_strike,
    optionChain?.underlying_spot_price,
    optionChain?.freshness,
    optionChain?.quote_age_seconds,
    selectedExpiry,
    underlyingKey,
    strikeRange,
    displayedStrikes.length,
    centerAtmRow,
  ]);

  // Re-center on window resize or full screen expansion
  useEffect(() => {
    const timer = setTimeout(() => {
      centerAtmRow("auto");
    }, 100);
    return () => clearTimeout(timer);
  }, [isExpanded, centerAtmRow]);

  // Manual refresh handler: triggers onRefresh, resets auto-refresh countdown, and centers ATM
  const handleManualRefresh = useCallback(() => {
    onRefresh();
    if (autoRefreshInterval > 0) {
      setCountdown(autoRefreshInterval);
    }
    setTimeout(() => centerAtmRow("smooth"), 350);
  }, [onRefresh, autoRefreshInterval, centerAtmRow]);

  // Maximum OI to scale visual OI depth bars
  const maxStrikeOi = React.useMemo(() => {
    let max = 1;
    if (displayedStrikes) {
      for (const s of displayedStrikes) {
        if ((s.call?.oi || 0) > max) max = s.call?.oi || 1;
        if ((s.put?.oi || 0) > max) max = s.put?.oi || 1;
      }
    }
    return max;
  }, [displayedStrikes]);

  // Identify Best ITM Sweet Spot Strikes based on Dynamic Live ATM (ITM 2 & ITM 1 for Calls and Puts)
  const itmSweetSpots = React.useMemo(() => {
    if (!optionChain?.strikes || optionChain.strikes.length === 0) return null;
    const atmIndex = optionChain.strikes.findIndex((s) => s.strike_price === liveAtmStrike);
    const fallbackAtmIndex = optionChain.strikes.findIndex((s) => s.is_atm);
    const targetIndex = atmIndex !== -1 ? atmIndex : fallbackAtmIndex;
    if (targetIndex === -1) return null;
    return {
      callItm2: optionChain.strikes[targetIndex - 2]?.strike_price,
      callItm1: optionChain.strikes[targetIndex - 1]?.strike_price,
      atm: optionChain.strikes[targetIndex]?.strike_price,
      putItm1: optionChain.strikes[targetIndex + 1]?.strike_price,
      putItm2: optionChain.strikes[targetIndex + 2]?.strike_price,
    };
  }, [optionChain?.strikes, liveAtmStrike]);

  // Real-time Dominance Heatmap rankings across the entire loaded option chain
  const dominance = React.useMemo(() => {
    return calculateOptionChainDominance(optionChain?.strikes || []);
  }, [optionChain?.strikes]);

  // Major Market Support Strike (Green Box) and Resistance Strike (Red Box)
  const majorStrikes = React.useMemo(() => {
    if (!optionChain?.strikes || optionChain.strikes.length === 0) return null;
    const mapped = optionChain.strikes.map((s) => ({
      strike: s.strike_price,
      call: { ltp: s.call?.ltp || 0, oi: s.call?.oi || 0, vol: s.call?.volume || 0 },
      put: { ltp: s.put?.ltp || 0, oi: s.put?.oi || 0, vol: s.put?.volume || 0 },
    }));
    return getMajorMarketStrikes(mapped, optionChain.underlying_spot_price || 0);
  }, [optionChain?.strikes, optionChain?.underlying_spot_price]);

  // Persistent reference to previous gamma values across ticks for real-time up/down detection
  const prevGammaMapRef = useRef<Record<string, number>>({});

  // Real-time Gamma Blast & Spike Radar computation for all strikes
  const gammaRadar = React.useMemo(() => {
    if (!optionChain?.strikes || optionChain.strikes.length === 0) return null;
    const spot = liveSpotPrice || optionChain.underlying_spot_price || 0;
    const radar = computeGammaRadar({
      strikes: optionChain.strikes,
      spotPrice: spot,
      underlyingKey,
      prevGammaMap: prevGammaMapRef.current,
    });

    // Update ref for next tick comparison
    const newMap: Record<string, number> = {};
    for (const s in radar.calls) {
      newMap[`${s}_CE`] = radar.calls[s].gamma;
    }
    for (const s in radar.puts) {
      newMap[`${s}_PE`] = radar.puts[s].gamma;
    }
    prevGammaMapRef.current = newMap;

    return radar;
  }, [optionChain?.strikes, liveSpotPrice, underlyingKey]);

  const renderGreek = (val: number | null | undefined, label: string, digits: number = 2) => {
    if (val === null || val === undefined || isNaN(val)) return <span className="text-slate-600">-</span>;
    return (
      <span title={`${label}: ${val.toFixed(4)}`} className="font-mono text-[10px] sm:text-[11px] xl:text-xs font-semibold whitespace-nowrap">
        {val.toFixed(digits)}
      </span>
    );
  };

  return (
    <div className={`w-full bg-slate-900/80 border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-200 ${
      isExpanded ? "fixed inset-0 z-50 rounded-none bg-slate-950 p-3 sm:p-5 overflow-hidden" : ""
    }`}>
      {/* Top Header & Selectors Bar */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3">
        {/* Underlying Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Indices &amp; F&amp;O:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto max-w-full">
            {underlyings.map((u) => {
              const isSelected = underlyingKey === u.key;
              return (
                <button
                  key={u.key}
                  onClick={() => onSelectUnderlying(u.key)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {u.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Expiry Selector, Strike Filter & Refresh */}
        <div className="flex items-center gap-2 text-xs">
          {/* Strike Range Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-500 text-[10px] px-1 font-mono">Range:</span>
            {[
              { label: "±10", val: 10 },
              { label: "±15", val: 15 },
              { label: "±20", val: 20 },
              { label: "±30", val: 30 },
              { label: "All", val: 0 },
            ].map((r) => (
              <button
                key={r.val}
                onClick={() => setStrikeRange(r.val)}
                className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                  strikeRange === r.val ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Expiry:
          </span>
          <select
            value={selectedExpiry}
            onChange={(e) => onSelectExpiry(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {availableExpiries.length === 0 && (
              <option value="">{isLoading ? "Fetching expiries..." : "Current Expiry"}</option>
            )}
            {availableExpiries.map((exp) => (
              <option key={exp} value={exp}>
                {exp.replace("_", " ").toUpperCase()}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowGreeks(!showGreeks)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 ${
              showGreeks
                ? "bg-blue-950/70 text-blue-300 border-blue-700 shadow-sm"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            <span>{showGreeks ? "All Greeks Active (Δ, Θ, Γ, V, IV)" : "Show Greeks"}</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 ${
              isExpanded
                ? "bg-purple-950/80 text-purple-300 border-purple-700 shadow-md"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
            }`}
            title={isExpanded ? "Exit Fullscreen Option Chain" : "Expand Fullscreen Option Chain"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isExpanded ? "Exit Full" : "Full Screen"}</span>
          </button>

          {/* Quick Center ATM Button */}
          <button
            onClick={() => centerAtmRow("smooth")}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-800/80 text-xs font-bold transition flex items-center gap-1 shadow-sm active:scale-95"
            title="Auto-Center Spot / ATM Strike Row in Middle of Table"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline font-mono">Center ATM</span>
          </button>

          {/* Auto-Refresh Interval Controller (1m, 3m, 30s, Off) */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 text-[10px] pl-1 font-bold flex items-center gap-1" title="Option Chain Auto-Refresh Interval">
              <Timer className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xl:inline">Auto:</span>
            </span>
            {[
              { label: "1m", val: 60 },
              { label: "3m", val: 180 },
              { label: "30s", val: 30 },
              { label: "Off", val: 0 },
            ].map((int) => (
              <button
                key={int.val}
                onClick={() => handleSetAutoRefresh(int.val)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                  autoRefreshInterval === int.val
                    ? "bg-cyan-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title={int.val === 0 ? "Disable auto-refresh" : `Auto-refresh option chain every ${int.label}`}
              >
                {int.label}
              </button>
            ))}
            {autoRefreshInterval > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 font-extrabold flex items-center gap-1 border border-cyan-800/40"
                title={`Next auto-refresh in ${countdown}s`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>{countdown}s</span>
              </span>
            )}
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh option chain now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Volatility Index Advisory for India VIX */}
      {underlyingKey.includes("India VIX") && (
        <div className="mx-4 my-2 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>India VIX</strong> is a volatility index and does not offer traded option contracts on NSE. Viewing <strong>NIFTY 50 Options</strong>.
            </span>
          </div>
          <button
            onClick={() => onSelectUnderlying("NSE_INDEX|Nifty 50")}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs whitespace-nowrap transition shadow"
          >
            Switch to NIFTY 50
          </button>
        </div>
      )}

      {/* Summary KPI Bar */}
      {optionChain && (
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/70 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Spot Price & ATM Straddle with Ultra-Low Latency Millisecond Auto-Refresh */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
              <span>Spot &amp; ATM Strike</span>
              <span
                className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 text-[9px] font-mono font-bold flex items-center gap-1 shadow-xs"
                title="Ultra-Low Latency Live Feed (<100ms) Auto-Refreshing"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>LIVE TICK</span>
              </span>
            </div>
            <div
              className={`text-xl sm:text-2xl font-black font-mono mt-0.5 transition-all duration-200 ${
                priceFlash === "up"
                  ? "text-emerald-400 scale-[1.02] drop-shadow-[0_0_12px_rgba(16,185,129,0.9)]"
                  : priceFlash === "down"
                  ? "text-rose-400 scale-[1.02] drop-shadow-[0_0_12px_rgba(244,63,94,0.9)]"
                  : "text-cyan-300"
              }`}
            >
              ₹{liveSpotPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-blue-300 font-mono font-bold mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/50">
                ATM: <b>{liveAtmStrike}</b>
              </span>
              {liveStraddlePrice ? (
                <span className="text-slate-300">
                  • Straddle: <b className="text-cyan-300">₹{liveStraddlePrice}</b>
                </span>
              ) : null}
            </div>
          </div>

          {/* Overall PCR */}
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow">
            <div className="text-xs text-slate-400 font-semibold uppercase flex items-center justify-between">
              <span>PCR (OI)</span>
              <span className="text-[10px] text-slate-500 font-mono" title="Put Call Ratio = Total Put OI / Total Call OI">
                Put / Call
              </span>
            </div>
            <div
              className={`text-xl sm:text-2xl font-black font-mono mt-0.5 ${
                optionChain.overall_pcr > 1.2
                  ? "text-emerald-400"
                  : optionChain.overall_pcr < 0.8
                  ? "text-rose-400"
                  : "text-amber-400"
              }`}
            >
              {optionChain.overall_pcr.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
              {optionChain.overall_pcr > 1.2
                ? "Bullish Put Writing"
                : optionChain.overall_pcr < 0.8
                ? "Bearish Call Writing"
                : "Neutral Equilibrium"}
            </div>
          </div>

          {/* Total Call OI */}
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow">
            <div className="text-xs text-slate-400 font-semibold uppercase">Total Call OI (Resistance)</div>
            <div className="text-xl sm:text-2xl font-black font-mono text-rose-400 mt-0.5">
              {optionChain.total_call_oi.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              Max Call: <b className="text-rose-300">{optionChain.highest_call_oi_strike || "N/A"}</b>
            </div>
          </div>

          {/* Total Put OI */}
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow">
            <div className="text-xs text-slate-400 font-semibold uppercase">Total Put OI (Support)</div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-0.5">
              {optionChain.total_put_oi.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              Max Put: <b className="text-emerald-300">{optionChain.highest_put_oi_strike || "N/A"}</b>
            </div>
          </div>

          {/* Total Volume */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-[11px] text-slate-400">Total Contracts Volume</div>
            <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
              {(optionChain.total_call_volume + optionChain.total_put_volume).toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Calls: {((optionChain.total_call_volume / (optionChain.total_call_volume + optionChain.total_put_volume || 1)) * 100).toFixed(0)}%
            </div>
          </div>

          {/* Data Freshness */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400">Data Freshness</div>
            <div className="mt-0.5">
              <FreshnessBadge
                freshness={optionChain.freshness}
                quoteAgeSeconds={optionChain.quote_age_seconds}
              />
            </div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">
              Expiry: {optionChain.expiry}
            </div>
          </div>
        </div>
      )}

      {/* ITM Greek Sweet Spot Quick Ribbon */}
      {itmSweetSpots && (
        <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/40 text-[11px] flex items-center gap-1">
              🛡️ ITM Sweet Spot Guide
            </span>
            <span className="text-slate-300 hidden md:inline text-[11px]">
              Safest Risk-Free Entry is <b className="text-amber-300">ITM 2 (Delta ~0.72)</b> with 40%+ Intrinsic Cash Cushion (Zero Time Decay).
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-amber-300 font-bold">
              Call Safest: <b>₹{itmSweetSpots.callItm2} CE</b>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-300 font-bold">
              Put Safest: <b>₹{itmSweetSpots.putItm2} PE</b>
            </span>
          </div>
        </div>
      )}

      {/* Real-time Dominance Heatmap Legend & Guide */}
      <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse-subtle" />
            Dominance Heatmap:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm flex items-center gap-1 border border-emerald-400/50"
              style={{ backgroundColor: "#16803C" }}
              title="Highest Volume, OI, or Change in OI (100%)"
            >
              👑 1st Largest [100%]
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm flex items-center gap-1 border border-orange-400/50"
              style={{ backgroundColor: "#F97316" }}
              title="Runner-up approaching leader at 95% - 99%"
            >
              2nd (95-99%)
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-950 shadow-sm flex items-center gap-1 border border-amber-400/50"
              style={{ backgroundColor: "#FDBA32" }}
              title="Runner-up at 80% - 90%"
            >
              2nd (80-90%)
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-950 shadow-sm flex items-center gap-1 border border-yellow-300/50"
              style={{ backgroundColor: "#FEF3C7" }}
              title="Runner-up at 70% - 75%"
            >
              2nd (70-75%)
            </span>
            <span className="text-slate-500 text-[10px] hidden xl:inline">
              • Runner-up shifts yellow → orange → green as volume/OI overtakes leader
            </span>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 flex items-center gap-2">
          <span>Ranked across entire chain</span>
          {optionChain?.strikes && (
            <span className="text-slate-500 font-mono">
              ({optionChain.strikes.length} strikes)
            </span>
          )}
        </div>
      </div>

      {/* Buildup & Orderflow Shortcuts Ribbon (LB, SB, SC, LU Full Form Guide) */}
      <div className="px-4 py-1.5 bg-slate-950/95 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-bold flex items-center gap-1.5">
            <span className="text-blue-400 font-black">🏷️ Buildup Codes:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 shadow-xs"
              title="Long Buildup: Price Rising + OI Rising (Fresh Long Buying Momentum)"
            >
              <b className="px-1 py-0.2 rounded bg-emerald-500/25 text-emerald-200 font-black">LB</b>
              <span>Long Buildup <span className="text-emerald-400 font-normal">(Price ↑, OI ↑)</span></span>
            </span>

            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-800/60 shadow-xs"
              title="Short Buildup: Price Falling + OI Rising (Aggressive Option Writing / Selling)"
            >
              <b className="px-1 py-0.2 rounded bg-rose-500/25 text-rose-200 font-black">SB</b>
              <span>Short Buildup <span className="text-rose-400 font-normal">(Price ↓, OI ↑)</span></span>
            </span>

            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 shadow-xs"
              title="Short Covering: Price Rising + OI Falling (Writers Rushing to Buy Back & Close Shorts)"
            >
              <b className="px-1 py-0.2 rounded bg-cyan-500/25 text-cyan-200 font-black">SC</b>
              <span>Short Covering <span className="text-cyan-400 font-normal">(Price ↑, OI ↓)</span></span>
            </span>

            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60 shadow-xs"
              title="Long Unwinding: Price Falling + OI Falling (Long Buyers Booking Profit or Exiting)"
            >
              <b className="px-1 py-0.2 rounded bg-amber-500/25 text-amber-200 font-black">LU</b>
              <span>Long Unwinding <span className="text-amber-400 font-normal">(Price ↓, OI ↓)</span></span>
            </span>

            {/* Click Chg OI for Graph Hint */}
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/70 text-blue-300 border border-blue-700/60 shadow-xs"
              title="Click any Change in OI cell in the table below to open the Intraday 09:15 to Present comparison graph (PE Red vs CE Green)"
            >
              <span className="text-cyan-400 font-black flex items-center gap-1">
                <span>📈 Click Chg OI:</span>
              </span>
              <span>Intraday OI Graph (CE Green vs PE Red)</span>
            </span>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 hidden xl:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
            <span className="flex items-center gap-1 text-emerald-300 font-bold" title="Call options with strike below spot price (In-The-Money)">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-700/60 border border-emerald-500/80"></span>
              <span>CE ITM (Light Green)</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 text-rose-300 font-bold" title="Put options with strike above spot price (In-The-Money)">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-700/60 border border-rose-500/80"></span>
              <span>PE ITM (Light Red)</span>
            </span>
          </div>
          <span>•</span>
          <span title="Call European (Call Option - Right to Buy)"><b className="text-emerald-400">CE</b>: Call</span>
          <span>•</span>
          <span title="Put European (Put Option - Right to Sell)"><b className="text-rose-400">PE</b>: Put</span>
          <span>•</span>
          <span title="At-The-Money Strike"><b className="text-cyan-300">ATM</b>: At-the-Money</span>
        </div>
      </div>

      {/* Gamma Blast & Spike Radar Warning Ribbon */}
      {gammaRadar && (
        <div className="px-4 py-1.5 bg-purple-950/40 border-b border-purple-800/40 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 font-extrabold border border-fuchsia-500/50 text-[10px] flex items-center gap-1 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-ping" />
              <span>⚡ Gamma Blast Radar</span>
            </span>
            <div className="flex items-center gap-2.5 flex-wrap text-[11px]">
              {gammaRadar.callBlastStrike && (
                <span className="text-emerald-300 flex items-center gap-1">
                  <span>Call Blast Strike:</span>
                  <b className="px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-200 border border-emerald-600/60 font-bold">
                    ₹{gammaRadar.callBlastStrike} CE (Γ {gammaRadar.callMaxGamma.toFixed(4)})
                  </b>
                </span>
              )}
              <span className="text-slate-600">•</span>
              {gammaRadar.putBlastStrike && (
                <span className="text-rose-300 flex items-center gap-1">
                  <span>Put Blast Strike:</span>
                  <b className="px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-200 border border-rose-600/60 font-bold">
                    ₹{gammaRadar.putBlastStrike} PE (Γ {gammaRadar.putMaxGamma.toFixed(4)})
                  </b>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-300 flex-wrap">
            <span className="px-1.5 py-0.2 rounded bg-fuchsia-950/80 text-fuchsia-200 border border-fuchsia-500 font-bold flex items-center gap-1">
              <span>💥 BLAST:</span>
              <span>85%+ Max Γ (0DTE Explosion)</span>
            </span>
            <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-500/80 font-bold flex items-center gap-1">
              <span>⚡ SPIKE:</span>
              <span>60-84% Max Γ (High Acceleration)</span>
            </span>
            <span className="text-emerald-400 font-bold">▲ Up</span>
            <span className="text-rose-400 font-bold">▼ Down</span>
          </div>
        </div>
      )}

      {/* Option Chain Table - Zero Horizontal Scroll, 100% Full Width Fit */}
      <div 
        ref={tableContainerRef}
        className={`w-full overflow-x-hidden overflow-y-auto relative ${
          isExpanded ? "flex-1 max-h-[calc(100vh-230px)]" : "min-h-[700px] max-h-[calc(100vh-210px)]"
        }`}
      >
        <table className="w-full text-xs font-mono text-right border-collapse table-fixed select-none">
          {/* Proportional Colgroup for 100% Full Width Fit & Symmetrical Balance */}
          <colgroup>
            {showGreeks ? (
              <>
                {/* CALL SIDE (46%) */}
                <col className="w-[2.5%]" />
                <col className="w-[5.5%]" />
                <col className="w-[5.5%]" />
                <col className="w-[5.5%]" />
                <col className="w-[3.5%]" />
                <col className="w-[3%]" />
                <col className="w-[3%]" />
                <col className="w-[8.5%]" />
                <col className="w-[3%]" />
                <col className="w-[6%]" />

                {/* STRIKE (8%) */}
                <col className="w-[8%]" />

                {/* PUT SIDE (46%) */}
                <col className="w-[6%]" />
                <col className="w-[3%]" />
                <col className="w-[3%]" />
                <col className="w-[8.5%]" />
                <col className="w-[3%]" />
                <col className="w-[3.5%]" />
                <col className="w-[5.5%]" />
                <col className="w-[5.5%]" />
                <col className="w-[5.5%]" />
                <col className="w-[2.5%]" />
              </>
            ) : (
              <>
                {/* Non-Greeks Mode (13 columns with dedicated Gamma Warning Column) */}
                <col className="w-[3.5%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[8.5%]" />
                <col className="w-[7%]" />

                {/* STRIKE (8%) */}
                <col className="w-[8%]" />

                {/* PUT SIDE (46%) */}
                <col className="w-[7%]" />
                <col className="w-[8.5%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[3.5%]" />
              </>
            )}
          </colgroup>

          {/* Table Main Headers */}
          <thead className="sticky top-0 z-20 bg-slate-950 text-slate-300 border-b border-slate-800 select-none shadow-md">
            {/* Top Super-Header Row */}
            <tr className="border-b border-slate-800/80 text-[11px] sm:text-xs font-black uppercase tracking-wider text-center">
              <th colSpan={showGreeks ? 10 : 6} className="py-2 bg-emerald-950/35 text-emerald-300 border-r border-slate-800 tracking-wider">
                CALL OPTIONS (CE)
              </th>
              <th className="py-2 bg-slate-900 text-white font-black px-1 border-r border-slate-800 tracking-wider text-xs sm:text-sm">
                STRIKE
              </th>
              <th colSpan={showGreeks ? 10 : 6} className="py-2 bg-rose-950/35 text-rose-300 tracking-wider">
                PUT OPTIONS (PE)
              </th>
            </tr>

            {/* Column Headers */}
            <tr className="text-[10px] xl:text-[11px] 2xl:text-xs text-slate-300 font-bold bg-slate-950 border-b border-slate-800">
              {/* Call Columns */}
              <th className="py-2 px-0.5 text-center truncate" title="Visual Call Open Interest Depth">Depth</th>
              <th
                className="py-2 px-0.5 sm:px-1 text-right truncate text-cyan-300 cursor-help"
                title="Call Change in Open Interest • Click ANY strike row to view Intraday Line Graph (CE Green vs PE Red) from 09:15 AM to Present"
              >
                Chg OI 📈
              </th>
              <th className="py-2 px-0.5 sm:px-1 text-right truncate" title="Call Open Interest with Real-time Dominance Heatmap">OI</th>
              <th className="py-2 px-0.5 sm:px-1 text-right truncate" title="Call Traded Volume with Real-time Dominance Heatmap">Volume</th>
              {showGreeks && <th className="py-2 px-0.5 text-center text-cyan-300 font-bold truncate" title="Call Implied Volatility (%)">IV%</th>}
              {showGreeks && <th className="py-2 px-0.5 text-center text-indigo-300 font-bold truncate" title="Call Delta (Δ)">Δ</th>}
              {showGreeks && <th className="py-2 px-0.5 text-center text-amber-300 font-bold truncate" title="Call Theta (Θ)">Θ</th>}
              <th
                className="py-2 px-0.5 text-center text-purple-300 font-bold truncate cursor-help"
                title="Call Gamma (Γ) • Real-time Up/Down Trend & Warning Alerts: 💥 BLAST (85%+ Max Γ) | ⚡ SPIKE (60%+ Max Γ)"
              >
                Gamma ⚡
              </th>
              {showGreeks && <th className="py-2 px-0.5 text-center text-blue-300 font-bold truncate" title="Call Vega (V)">V</th>}
              <th className="py-2 px-0.5 sm:px-1 text-right text-emerald-400 font-black border-r border-slate-800 truncate" title="Call Last Traded Price (₹)">LTP</th>

              {/* Center Strike */}
              <th className="py-2 px-0.5 sm:px-1 text-center text-white bg-slate-900 font-black border-r border-slate-800 truncate" title="Strike Price">
                Strike
              </th>

              {/* Put Columns */}
              <th className="py-2 px-0.5 sm:px-1 text-left text-rose-400 font-black truncate" title="Put Last Traded Price (₹)">LTP</th>
              {showGreeks && <th className="py-2 px-0.5 text-center text-indigo-300 font-bold truncate" title="Put Delta (Δ)">Δ</th>}
              {showGreeks && <th className="py-2 px-0.5 text-center text-amber-300 font-bold truncate" title="Put Theta (Θ)">Θ</th>}
              <th
                className="py-2 px-0.5 text-center text-purple-300 font-bold truncate cursor-help"
                title="Put Gamma (Γ) • Real-time Up/Down Trend & Warning Alerts: 💥 BLAST (85%+ Max Γ) | ⚡ SPIKE (60%+ Max Γ)"
              >
                Gamma ⚡
              </th>
              {showGreeks && <th className="py-2 px-0.5 text-center text-blue-300 font-bold truncate" title="Put Vega (V)">V</th>}
              {showGreeks && <th className="py-2 px-0.5 text-center text-cyan-300 font-bold truncate" title="Put Implied Volatility (%)">IV%</th>}
              <th className="py-2 px-0.5 sm:px-1 text-right truncate" title="Put Traded Volume with Real-time Dominance Heatmap">Volume</th>
              <th className="py-2 px-0.5 sm:px-1 text-right truncate" title="Put Open Interest with Real-time Dominance Heatmap">OI</th>
              <th
                className="py-2 px-0.5 sm:px-1 text-right truncate text-cyan-300 cursor-help"
                title="Put Change in Open Interest • Click ANY strike row to view Intraday Line Graph (CE Green vs PE Red) from 09:15 AM to Present"
              >
                Chg OI 📈
              </th>
              <th className="py-2 px-0.5 text-center truncate" title="Visual Put Open Interest Depth">Depth</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-850">
            {displayedStrikes && displayedStrikes.length > 0 ? (
              displayedStrikes.map((row) => {
                const activeAtm = liveAtmStrike || optionChain?.atm_strike || 0;
                const isAtm = Boolean(row.strike_price === activeAtm || (!activeAtm && row.is_atm));
                const isCallItm = !isAtm && activeAtm > 0 && row.strike_price < activeAtm;
                const isPutItm = !isAtm && activeAtm > 0 && row.strike_price > activeAtm;

                const ceCellClass = isAtm
                  ? ""
                  : isCallItm
                  ? "bg-emerald-950/30 group-hover:bg-emerald-900/45 transition-colors"
                  : "group-hover:bg-slate-800/35 transition-colors";

                const peCellClass = isAtm
                  ? ""
                  : isPutItm
                  ? "bg-rose-950/30 group-hover:bg-rose-900/45 transition-colors"
                  : "group-hover:bg-slate-800/35 transition-colors";

                const callOiBarPct = Math.min(100, ((row.call?.oi || 0) / maxStrikeOi) * 100);
                const putOiBarPct = Math.min(100, ((row.put?.oi || 0) / maxStrikeOi) * 100);
                const callBuildup = getBuildup(row.call);
                const putBuildup = getBuildup(row.put);

                const isCallItm2 = itmSweetSpots && row.strike_price === itmSweetSpots.callItm2;
                const isCallItm1 = itmSweetSpots && row.strike_price === itmSweetSpots.callItm1;
                const isPutItm1 = itmSweetSpots && row.strike_price === itmSweetSpots.putItm1;
                const isPutItm2 = itmSweetSpots && row.strike_price === itmSweetSpots.putItm2;

                const isSelected = row.strike_price === selectedStrike;

                return (
                  <tr
                    key={row.strike_price}
                    ref={isAtm ? atmRowRef : undefined}
                    className={`group transition-all duration-150 relative ${
                      isSelected
                        ? "bg-blue-900/60 ring-2 ring-blue-400 font-bold shadow-lg"
                        : isAtm
                        ? "bg-gradient-to-r from-blue-950/95 via-indigo-950/95 to-blue-950/95 border-y-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/60 font-black z-10"
                        : "hover:bg-slate-800/20"
                    }`}
                  >
                    {/* Call: OI Depth Bar */}
                    <td className={`py-1.5 px-0.5 sm:px-1 ${ceCellClass}`}>
                      <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden flex justify-end" title={`Call OI Bar: ${callOiBarPct.toFixed(0)}%`}>
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{ width: `${callOiBarPct}%` }}
                        />
                      </div>
                    </td>

                    {/* Call: Chg OI - Click for Intraday CE vs PE Line Graph */}
                    <td
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenOiChart(row);
                      }}
                      title={`Click strike ${row.strike_price} to view Intraday Change in OI Graph (CE Green vs PE Red) from 09:15 to present`}
                      className={`p-0.5 sm:p-1 cursor-pointer transition-all hover:bg-cyan-950/60 hover:ring-1 hover:ring-cyan-400/80 rounded ${ceCellClass}`}
                    >
                      <DominanceCell
                        ranking={dominance.getRanking("CE_CHG_OI", row.strike_price)}
                        isChgOi
                      />
                    </td>

                    {/* Call: OI */}
                    <td className={`p-0.5 sm:p-1 ${ceCellClass}`}>
                      <DominanceCell
                        ranking={dominance.getRanking("CE_OI", row.strike_price)}
                        defaultTextClass="text-slate-200"
                      />
                    </td>

                    {/* Call: Volume */}
                    <td className={`p-0.5 sm:p-1 ${ceCellClass}`}>
                      <DominanceCell
                        ranking={dominance.getRanking("CE_VOLUME", row.strike_price)}
                        defaultTextClass="text-slate-300"
                      />
                    </td>

                    {/* Call: Greeks & Gamma Blast Warning */}
                    {showGreeks && (
                      <td className={`py-1 px-0.5 text-center text-cyan-300 font-mono font-bold text-[10px] sm:text-[11px] xl:text-xs truncate ${ceCellClass}`}>
                        {row.call?.greeks?.iv ? `${row.call.greeks.iv.toFixed(1)}%` : "-"}
                      </td>
                    )}
                    {showGreeks && (
                      <td className={`py-1 px-0.5 text-center text-indigo-300 font-mono font-bold truncate ${ceCellClass}`}>
                        {renderGreek(row.call?.greeks?.delta, "Call Delta", 2)}
                      </td>
                    )}
                    {showGreeks && (
                      <td className={`py-1 px-0.5 text-center text-amber-300 font-mono truncate ${ceCellClass}`}>
                        {renderGreek(row.call?.greeks?.theta, "Call Theta", 1)}
                      </td>
                    )}

                    {/* Call: Gamma Up/Down Blast & Spike Warning (Active in both Standard & Greeks Mode) */}
                    <td className={`py-1 px-0.5 text-center ${ceCellClass}`}>
                      <GammaWarningCell analysis={gammaRadar?.calls[row.strike_price]} isCall={true} />
                    </td>

                    {showGreeks && (
                      <td className={`py-1 px-0.5 text-center text-blue-300 font-mono truncate ${ceCellClass}`}>
                        {renderGreek(row.call?.greeks?.vega, "Call Vega", 1)}
                      </td>
                    )}

                    {/* Call: LTP */}
                    <td className={`py-1 px-0.5 sm:px-1 font-black font-mono border-r border-slate-800 ${isAtm ? "text-cyan-200" : "text-white"} ${ceCellClass}`}>
                      <div className="flex items-center justify-end gap-1 overflow-hidden">
                        {isCallItm2 && (
                          <span className="text-[8px] xl:text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 font-black shrink-0 whitespace-nowrap" title="ITM 2: Safest Delta ~0.72">
                            ITM2
                          </span>
                        )}
                        {isCallItm1 && (
                          <span className="text-[8px] xl:text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-black shrink-0 whitespace-nowrap" title="ITM 1: Balanced Delta ~0.63">
                            ITM1
                          </span>
                        )}
                        {callBuildup && (
                          <span className={`text-[8px] xl:text-[9px] px-1 py-0.2 rounded font-extrabold border shrink-0 whitespace-nowrap ${callBuildup.color}`} title={callBuildup.label}>
                            {callBuildup.tag}
                          </span>
                        )}
                        <span className={`drop-shadow font-black whitespace-nowrap ${isAtm ? "text-cyan-300 text-[12px] xl:text-sm 2xl:text-base font-black drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" : "text-emerald-300 font-extrabold text-[11px] xl:text-xs 2xl:text-sm"}`}>
                          {row.call?.ltp ? `₹${row.call.ltp.toFixed(1)}` : "-"}
                        </span>
                      </div>
                    </td>

                    {/* Strike Price (Center) - Click for S&R Levels Popup */}
                    <td
                      data-strike-cell
                      onClick={(e) => handleStrikeClick(row.strike_price, e)}
                      onKeyDown={(e) => handleStrikeKeyDown(row.strike_price, e)}
                      tabIndex={0}
                      role="button"
                      aria-haspopup="dialog"
                      aria-expanded={isSelected}
                      title={`Click strike ${row.strike_price} for Support & Resistance popup`}
                      className={`py-1.5 px-1 sm:px-1.5 text-center font-black font-mono border-r border-slate-800 cursor-pointer select-none transition-all hover:brightness-125 hover:scale-[1.03] active:scale-[0.97] ${
                        isSelected
                          ? "text-blue-100 bg-blue-700/90 ring-2 ring-blue-400 shadow-md font-black"
                          : isAtm
                          ? "text-white bg-gradient-to-b from-blue-600 via-indigo-600 to-cyan-700 ring-2 ring-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.85)] font-black scale-[1.05] z-20"
                          : row.strike_price === majorStrikes?.supportStrike
                          ? "text-emerald-300 bg-emerald-950/60 ring-2 ring-emerald-500/70 hover:bg-emerald-900/70"
                          : row.strike_price === majorStrikes?.resistanceStrike
                          ? "text-rose-300 bg-rose-950/60 ring-2 ring-rose-500/70 hover:bg-rose-900/70"
                          : "text-white bg-slate-950 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`tracking-wide font-black whitespace-nowrap ${isAtm ? "text-sm xl:text-base text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]" : "text-xs xl:text-sm"}`}>
                          {row.strike_price}
                        </span>
                        {isAtm && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 font-black uppercase tracking-wider shrink-0 shadow-lg ring-1 ring-white animate-pulse">
                            LIVE ATM
                          </span>
                        )}
                        {row.strike_price === majorStrikes?.supportStrike && !isAtm && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-600 text-white font-black uppercase tracking-wider shrink-0 shadow" title="Market Support Strike (Green Box)">
                            SUP
                          </span>
                        )}
                        {row.strike_price === majorStrikes?.resistanceStrike && !isAtm && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-rose-600 text-white font-black uppercase tracking-wider shrink-0 shadow" title="Market Resistance Strike (Red Box)">
                            RES
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Put: LTP */}
                    <td className={`py-1 px-0.5 sm:px-1 font-black font-mono ${isAtm ? "text-cyan-200" : "text-white"} ${peCellClass}`}>
                      <div className="flex items-center justify-start gap-1 overflow-hidden">
                        <span className={`drop-shadow font-black whitespace-nowrap ${isAtm ? "text-cyan-300 text-[12px] xl:text-sm 2xl:text-base font-black drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" : "text-rose-300 font-extrabold text-[11px] xl:text-xs 2xl:text-sm"}`}>
                          {row.put?.ltp ? `₹${row.put.ltp.toFixed(1)}` : "-"}
                        </span>
                        {putBuildup && (
                          <span className={`text-[8px] xl:text-[9px] px-1 py-0.2 rounded font-extrabold border shrink-0 whitespace-nowrap ${putBuildup.color}`} title={putBuildup.label}>
                            {putBuildup.tag}
                          </span>
                        )}
                        {isPutItm1 && (
                          <span className="text-[8px] xl:text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-black shrink-0 whitespace-nowrap" title="ITM 1: Balanced Delta ~0.63">
                            ITM1
                          </span>
                        )}
                        {isPutItm2 && (
                          <span className="text-[8px] xl:text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 font-black shrink-0 whitespace-nowrap" title="ITM 2: Safest Delta ~0.72">
                            ITM2
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Put: Greeks & Gamma Blast Warning */}
                    {showGreeks && (
                      <td className={`py-1 px-0.5 text-center text-indigo-300 font-mono font-bold truncate ${peCellClass}`}>
                        {renderGreek(row.put?.greeks?.delta, "Put Delta", 2)}
                      </td>
                    )}
                    {showGreeks && (
                      <td className={`py-1 px-0.5 text-center text-amber-300 font-mono truncate ${peCellClass}`}>
                        {renderGreek(row.put?.greeks?.theta, "Put Theta", 1)}
                      </td>
                    )}

                    {/* Put: Gamma Up/Down Blast & Spike Warning (Active in both Standard & Greeks Mode) */}
                    <td className={`py-1 px-0.5 text-center ${peCellClass}`}>
                      <GammaWarningCell analysis={gammaRadar?.puts[row.strike_price]} isCall={false} />
                    </td>

                    {showGreeks && (
                      <td className={`py-1 px-0.5 text-center text-blue-300 font-mono truncate ${peCellClass}`}>
                        {renderGreek(row.put?.greeks?.vega, "Put Vega", 1)}
                      </td>
                    )}
                    {showGreeks && (
                      <td className={`py-1 px-0.5 text-center text-cyan-300 font-mono font-bold text-[10px] sm:text-[11px] xl:text-xs truncate ${peCellClass}`}>
                        {row.put?.greeks?.iv ? `${row.put.greeks.iv.toFixed(1)}%` : "-"}
                      </td>
                    )}

                    {/* Put: Volume */}
                    <td className={`p-0.5 sm:p-1 ${peCellClass}`}>
                      <DominanceCell
                        ranking={dominance.getRanking("PE_VOLUME", row.strike_price)}
                        defaultTextClass="text-slate-300"
                      />
                    </td>

                    {/* Put: OI */}
                    <td className={`p-0.5 sm:p-1 ${peCellClass}`}>
                      <DominanceCell
                        ranking={dominance.getRanking("PE_OI", row.strike_price)}
                        defaultTextClass="text-slate-200"
                      />
                    </td>

                    {/* Put: Chg OI - Click for Intraday CE vs PE Line Graph */}
                    <td
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenOiChart(row);
                      }}
                      title={`Click strike ${row.strike_price} to view Intraday Change in OI Graph (CE Green vs PE Red) from 09:15 to present`}
                      className={`p-0.5 sm:p-1 cursor-pointer transition-all hover:bg-cyan-950/60 hover:ring-1 hover:ring-cyan-400/80 rounded ${peCellClass}`}
                    >
                      <DominanceCell
                        ranking={dominance.getRanking("PE_CHG_OI", row.strike_price)}
                        isChgOi
                      />
                    </td>

                    {/* Put: OI Depth Bar */}
                    <td className={`py-1.5 px-0.5 sm:px-1 ${peCellClass}`}>
                      <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden flex justify-start" title={`Put OI Bar: ${putOiBarPct.toFixed(0)}%`}>
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${putOiBarPct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={showGreeks ? 21 : 11} className="py-12 text-center text-slate-400">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                      <span className="text-slate-300 font-medium">Loading Put/Call Option Chain...</span>
                      <span className="text-xs text-slate-500">Calculating real-time strikes, open interest, and Black-Scholes Greeks</span>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center gap-3">
                      <AlertCircle className="w-6 h-6 text-amber-400" />
                      <div className="text-amber-300 font-medium">{error}</div>
                      <button
                        onClick={onRefresh}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-blue-600/30"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry Load Option Chain
                      </button>
                    </div>
                  ) : underlyingKey.includes("India VIX") ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-6">
                      <AlertCircle className="w-8 h-8 text-amber-400" />
                      <div className="text-slate-200 font-medium text-sm">India VIX is a volatility index without option contracts.</div>
                      <div className="text-xs text-slate-400 max-w-md">
                        Option trading on NSE is available on benchmark indices (NIFTY 50, BANKNIFTY, FINNIFTY) and F&O equities.
                      </div>
                      <button
                        onClick={() => onSelectUnderlying("NSE_INDEX|Nifty 50")}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30"
                      >
                        Switch to NIFTY 50 Option Chain
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-6">
                      <Layers className="w-8 h-8 text-slate-600" />
                      <div className="text-slate-200 font-medium text-sm">No option chain strikes currently available.</div>
                      <div className="text-xs text-slate-400 max-w-md">
                        The contract might be outside trading hours or loading. Click below to load live strikes or calibrated matrix.
                      </div>
                      <button
                        onClick={onRefresh}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-blue-600/30"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Load Option Chain
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Disclaimers & Methodology Footer */}
      <div className="p-3 bg-slate-950 text-[11px] text-slate-500 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>
            <strong>Methodology:</strong> PCR = Put OI / Call OI. Click any strike to view dynamic live Support &amp; Resistance.
          </span>
        </div>
        <div className="text-[10px] text-slate-600">
          ⚠️ Option analytics are strictly informational and do not represent predictive trading signals or advice.
        </div>
      </div>

      {/* Interactive Support & Resistance Levels Popup for Clicked Strike */}
      <StrikeLevelsPopup
        isOpen={selectedStrike !== null}
        clickedStrike={selectedStrike}
        anchorRect={strikeAnchorRect}
        optionChain={optionChain}
        underlyingKey={underlyingKey}
        onClose={() => {
          setSelectedStrike(null);
          setStrikeAnchorRect(null);
        }}
      />

      {/* Intraday Change in OI (PE Red vs CE Green) 09:15 to Present Modal */}
      {oiChartStrike && (
        <StrikeOiGraphModal
          isOpen={oiChartStrike !== null}
          underlyingKey={underlyingKey}
          strike={oiChartStrike.strike}
          expiry={selectedExpiry}
          callChgOi={oiChartStrike.callChgOi}
          putChgOi={oiChartStrike.putChgOi}
          callOi={oiChartStrike.callOi}
          putOi={oiChartStrike.putOi}
          callLtp={oiChartStrike.callLtp}
          putLtp={oiChartStrike.putLtp}
          callKey={oiChartStrike.callKey}
          putKey={oiChartStrike.putKey}
          onClose={() => setOiChartStrike(null)}
        />
      )}
    </div>
  );
}
