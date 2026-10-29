"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { 
  AlertCircle, 
  Shield, 
  Activity, 
  Layers 
} from "lucide-react";

import { Header } from "@/components/Header";
import { OptionChainTable } from "@/components/OptionChainTable";
import { TokenConfigModal } from "@/components/TokenConfigModal";
import { HistoricalReplayBar } from "@/components/HistoricalReplayBar";
import { generateHistoricalOptionChain, formatTime12Hour } from "@/lib/options/historicalOptionChain";

import { 
  MarketQuoteData, 
  OptionChainSummary, 
  MarketFreshness, 
  MarketSessionStatus, 
  ApiConnectionStatus 
} from "@/lib/types/market";

import { BENCHMARK_INSTRUMENTS, ALL_PRESET_INSTRUMENTS } from "@/lib/upstox/constants";
import { calculateFreshness } from "@/lib/market/freshness";
import { getMarketSessionStatus, formatISTDateTime } from "@/lib/market/sessions";

export default function IndianTradeDashboard() {
  // Instrument selection (Default: NIFTY 50)
  const [selectedKey, setSelectedKey] = useState<string>("NSE_INDEX|Nifty 50");

  // Quotes state (benchmark + active instrument)
  const [quotes, setQuotes] = useState<Record<string, MarketQuoteData>>({});
  const [isRefreshingQuotes, setIsRefreshingQuotes] = useState<boolean>(false);

  // Option Chain data
  const [optionChain, setOptionChain] = useState<OptionChainSummary | null>(null);
  const [availableExpiries, setAvailableExpiries] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [optionChainLoading, setOptionChainLoading] = useState<boolean>(false);
  const [optionChainError, setOptionChainError] = useState<string | null>(null);

  // Status & Connection state
  const [sessionStatus, setSessionStatus] = useState<MarketSessionStatus>("NORMAL_OPEN");
  const [sessionDescription, setSessionDescription] = useState<string>("Normal Market Hours (09:15 - 15:30 IST)");
  const [connectionStatus, setConnectionStatus] = useState<ApiConnectionStatus | null>(null);
  const [feedMode, setFeedMode] = useState<"STREAM" | "POLL">("STREAM");
  const [freshness, setFreshness] = useState<MarketFreshness>("UNKNOWN");
  const [lastUpdatedIst, setLastUpdatedIst] = useState<string>("");
  const [quoteAgeSeconds, setQuoteAgeSeconds] = useState<number>(0);
  const [clockSkewMs, setClockSkewMs] = useState<number>(0);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Historical Snapshot & Replay Simulator State (09:15 AM - 03:30 PM)
  const [replayDate, setReplayDate] = useState<string>("");
  const [replayMinute, setReplayMinute] = useState<number>(600); // 10:00 AM (range: 555 to 930)
  const [isReplayPlaying, setIsReplayPlaying] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<1 | 2 | 4 | 8>(2);

  // Modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  // EventSource reference for SSE stream
  const eventSourceRef = useRef<EventSource | null>(null);
  const pendingTicksRef = useRef<Record<string, any>>({});
  const sseBatchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active instrument metadata
  const currentMetadata = useMemo(() => {
    const found = ALL_PRESET_INSTRUMENTS.find((i) => i.instrument_key === selectedKey);
    if (found) return found;
    const [exchange = "NSE", symbol = selectedKey] = selectedKey.split("|");
    return {
      instrument_key: selectedKey,
      symbol,
      name: symbol,
      exchange: exchange as "NSE" | "BSE",
      segment: (exchange.includes("INDEX") ? "INDEX" : "EQ") as "INDEX" | "EQ" | "FO",
      tick_size: 0.05,
      lot_size: 1,
    };
  }, [selectedKey]);

  // Current active quote
  const activeQuote = quotes[selectedKey] || null;

  // 1. Initial Status Check
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/market/status");
      const data = await res.json();
      
      const conn: ApiConnectionStatus = {
        is_configured: !!data.tokenConfigured,
        status: data.tokenConfigured ? "CONNECTED" : "NOT_CONFIGURED",
        message: data.message || (data.tokenConfigured ? "API Ready" : "Token Missing"),
        can_stream: true,
      };
      setConnectionStatus(conn);

      const session = getMarketSessionStatus();
      setSessionStatus(session.status);
      setSessionDescription(session.description);

      if (data.clockSkewMs !== undefined) {
        setClockSkewMs(data.clockSkewMs);
      }
      if (!data.tokenConfigured) {
        setGlobalError(data.message || "Upstox Analytics Token is missing in .env.local");
      } else {
        setGlobalError(null);
      }
    } catch (e: any) {
      setConnectionStatus({
        is_configured: false,
        status: "NETWORK_ERROR",
        message: e.message || "Failed to query server status",
        can_stream: false,
      });
      setGlobalError(e.message || "Failed to query server status");
    }
  }, []);

  // 2. Fetch Quotes (Benchmarks + Selected)
  const fetchQuotes = useCallback(async () => {
    setIsRefreshingQuotes(true);
    try {
      const benchmarkKeys = BENCHMARK_INSTRUMENTS.map((b) => b.instrument_key);
      const allKeys = Array.from(new Set([...benchmarkKeys, selectedKey])).join(",");

      const res = await fetch(`/api/market/quotes?keys=${encodeURIComponent(allKeys)}`);
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.quotes)) {
        const quoteMap: Record<string, MarketQuoteData> = {};
        data.quotes.forEach((q: MarketQuoteData) => {
          quoteMap[q.instrument_key] = q;
        });

        setQuotes(quoteMap);
        setLastUpdatedIst(formatISTDateTime(new Date()));

        const activeQ = quoteMap[selectedKey];
        if (activeQ) {
          const fresh = calculateFreshness(activeQ.timestamp, true);
          setFreshness(fresh.freshness);
          setQuoteAgeSeconds(fresh.quote_age_seconds);
        } else {
          setFreshness("UNKNOWN");
        }
      } else {
        if (data.configured === false) {
          setConnectionStatus((prev) => prev ? { ...prev, is_configured: false, status: "NOT_CONFIGURED" } : null);
        }
      }
    } catch (e: any) {
      // Safe fallback
    } finally {
      setIsRefreshingQuotes(false);
    }
  }, [selectedKey]);

  // 3. Fetch Option Expiries & Option Chain
  const fetchOptionChain = useCallback(async (key: string, expiry?: string) => {
    const targetKey = key.includes("India VIX") ? "NSE_INDEX|Nifty 50" : key;
    setOptionChainLoading(true);
    setOptionChainError(null);
    try {
      const expParam = expiry && expiry.trim().length > 0 ? `&expiry=${encodeURIComponent(expiry.trim())}` : "";
      const res = await fetch(
        `/api/market/option-chain?key=${encodeURIComponent(targetKey)}${expParam}`
      );
      const data = await res.json();

      if (res.ok && data.success && data.chain && Array.isArray(data.chain.strikes) && data.chain.strikes.length > 0) {
        setOptionChain(data.chain);
        if (data.chain.expiry) {
          setSelectedExpiry((prev) => (prev && data.chain.expiries?.includes(prev) ? prev : data.chain.expiry));
        }
        if (Array.isArray(data.chain.expiries) && data.chain.expiries.length > 0) {
          setAvailableExpiries(data.chain.expiries);
        }
      } else {
        setOptionChain((prev) => {
          if (!prev) setOptionChainError(data.error || "Option chain unavailable for this contract/expiry.");
          return prev;
        });
      }
    } catch (e: any) {
      setOptionChain((prev) => {
        if (!prev) setOptionChainError(e.message || "Failed to load option chain.");
        return prev;
      });
    } finally {
      setOptionChainLoading(false);
    }
  }, []);

  const fetchOptionExpiries = useCallback(async (key: string) => {
    const targetKey = key.includes("India VIX") ? "NSE_INDEX|Nifty 50" : key;
    try {
      const res = await fetch(`/api/market/option-contracts?key=${encodeURIComponent(targetKey)}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.expiries) && data.expiries.length > 0) {
        setAvailableExpiries(data.expiries);
        setSelectedExpiry((prev) => (prev && data.expiries.includes(prev) ? prev : data.expiries[0]));
      } else {
        // Fallback: trigger option chain which automatically generates expiries
        fetchOptionChain(targetKey);
      }
    } catch {
      fetchOptionChain(targetKey);
    }
  }, [fetchOptionChain]);

  // Initial load
  useEffect(() => {
    checkStatus();
    fetchQuotes();

    // Initialize replay date on client mount to avoid unstable prerender
    const now = new Date();
    const day = now.getDay();
    if (day === 0) now.setDate(now.getDate() - 2);
    else if (day === 6) now.setDate(now.getDate() - 1);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    setReplayDate(`${yyyy}-${mm}-${dd}`);
  }, [checkStatus, fetchQuotes]);

  // Update when selectedKey changes
  useEffect(() => {
    fetchOptionExpiries(selectedKey);
  }, [selectedKey, fetchOptionExpiries]);

  // Update option chain when expiry changes
  useEffect(() => {
    if (selectedExpiry) {
      fetchOptionChain(selectedKey, selectedExpiry);
    }
  }, [selectedKey, selectedExpiry, fetchOptionChain]);

  // Playback advancement timer for Historical Snapshot Replay
  useEffect(() => {
    if (feedMode !== "POLL" || !isReplayPlaying) return;

    // Advance speed step: 1x -> 1m, 2x -> 2m, 4x -> 5m, 8x -> 15m
    const step = replaySpeed === 1 ? 1 : replaySpeed === 2 ? 2 : replaySpeed === 4 ? 5 : 15;

    const timer = setInterval(() => {
      setReplayMinute((prev) => {
        if (prev + step >= 930) {
          setIsReplayPlaying(false);
          return 930; // Clamp at session end: 03:30 PM
        }
        return prev + step;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [feedMode, isReplayPlaying, replaySpeed]);

  // Re-generate historical option chain and spot quote when minute, date, or underlying changes
  useEffect(() => {
    if (feedMode !== "POLL" || !replayDate) return;

    const { chain, quote } = generateHistoricalOptionChain({
      underlyingKey: selectedKey,
      date: replayDate,
      minuteOfDay: replayMinute,
      expiry: selectedExpiry,
    });

    setOptionChain(chain);
    setQuotes((prev) => ({
      ...prev,
      [selectedKey]: quote,
    }));
    setLastUpdatedIst(`${replayDate} ${formatTime12Hour(replayMinute)}`);
    setFreshness("SNAPSHOT");
    setQuoteAgeSeconds(0);
  }, [feedMode, replayDate, replayMinute, selectedKey, selectedExpiry]);

  // Real-time SSE streaming when feedMode === 'STREAM' for sub-millisecond live ticks
  useEffect(() => {
    if (feedMode !== "STREAM") {
      if (sseBatchTimerRef.current) {
        clearTimeout(sseBatchTimerRef.current);
        sseBatchTimerRef.current = null;
      }
      pendingTicksRef.current = {};
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const benchmarkKeys = BENCHMARK_INSTRUMENTS.map((b) => b.instrument_key);
    const allKeys = Array.from(new Set([...benchmarkKeys, selectedKey])).join(",");

    const sse = new EventSource(`/api/market/stream?keys=${encodeURIComponent(allKeys)}`);
    eventSourceRef.current = sse;

    sse.onopen = () => {
      setConnectionStatus((prev) => prev ? { ...prev, status: "CONNECTED" } : null);
    };

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const feeds = payload.feeds || payload.data?.feeds;
        if (feeds) {
          // Robust multi-format LTP extractor for Upstox V3 Market Data Feed
          const extractLtp = (tick: any): number | undefined => {
            if (!tick) return undefined;
            if (typeof tick.ltp === "number") return tick.ltp;
            if (typeof tick.last_price === "number") return tick.last_price;
            if (tick.fullFeed?.indexFF?.ltpc?.ltp !== undefined) return tick.fullFeed.indexFF.ltpc.ltp;
            if (tick.fullFeed?.marketFF?.ltpc?.ltp !== undefined) return tick.fullFeed.marketFF.ltpc.ltp;
            if (tick.firstLevelWithGreeks?.ltpc?.ltp !== undefined) return tick.firstLevelWithGreeks.ltpc.ltp;
            if (tick.ltpc?.ltp !== undefined) return tick.ltpc.ltp;
            return undefined;
          };

          // Immediate live update for selected key and active quote with 0ms delay
          setQuotes((prev) => {
            let hasChanges = false;
            const next = { ...prev };

            for (const [rawKey, tick] of Object.entries(feeds)) {
              const standardKey = rawKey.replace(":", "|");
              const ltp = extractLtp(tick);
              if (ltp !== undefined && (!next[standardKey] || next[standardKey].last_price !== ltp)) {
                hasChanges = true;
                const existing = next[standardKey];
                const prevClose = existing?.prev_close ?? ltp;
                const netChange = ltp - prevClose;
                const pctChange = prevClose > 0 ? (netChange / prevClose) * 100 : 0;
                const [exchange = "NSE", symbol = standardKey] = standardKey.split("|");

                next[standardKey] = {
                  instrument_key: standardKey,
                  symbol: existing?.symbol || symbol,
                  exchange,
                  segment: standardKey.includes("INDEX") ? "INDEX" : standardKey.includes("FO") ? "FO" : "EQ",
                  last_price: Number(ltp.toFixed(2)),
                  net_change: Number(netChange.toFixed(2)),
                  percentage_change: Number(pctChange.toFixed(2)),
                  open: existing?.open ?? ltp,
                  high: existing ? Math.max(existing.high, ltp) : ltp,
                  low: existing ? Math.min(existing.low, ltp) : ltp,
                  close: ltp,
                  prev_close: prevClose,
                  volume: existing?.volume ?? 0,
                  timestamp: Date.now(),
                  timestamp_ist: formatISTDateTime(new Date()),
                  local_receipt_time: Date.now(),
                  quote_age_seconds: 0,
                  freshness: "LIVE",
                  is_stale: false,
                };
              }
            }
            return hasChanges ? next : prev;
          });

          setLastUpdatedIst(formatISTDateTime(new Date()));
          setFreshness("LIVE");
          setQuoteAgeSeconds(0);
        }
      } catch {
        // Safe ignore
      }
    };

    sse.onerror = () => {
      // Auto-fallback to polling mode if SSE relay disconnects
      setFreshness("DISCONNECTED");
      setFeedMode("POLL");
    };

    return () => {
      if (sseBatchTimerRef.current) {
        clearTimeout(sseBatchTimerRef.current);
        sseBatchTimerRef.current = null;
      }
      pendingTicksRef.current = {};
      sse.close();
      eventSourceRef.current = null;
    };
  }, [feedMode, selectedKey]);

  // Return from snapshot replay back to live V3 Stream
  const handleReturnToLive = useCallback(() => {
    setIsReplayPlaying(false);
    setFeedMode("STREAM");
    fetchOptionChain(selectedKey, selectedExpiry);
    fetchQuotes();
  }, [selectedKey, selectedExpiry, fetchOptionChain, fetchQuotes]);

  // Manual refresh
  const handleManualRefresh = () => {
    if (feedMode === "POLL") {
      // Re-trigger historical generation
      const { chain, quote } = generateHistoricalOptionChain({
        underlyingKey: selectedKey,
        date: replayDate,
        minuteOfDay: replayMinute,
        expiry: selectedExpiry,
      });
      setOptionChain(chain);
      setQuotes((prev) => ({
        ...prev,
        [selectedKey]: quote,
      }));
      setLastUpdatedIst(`${replayDate} ${formatTime12Hour(replayMinute)}`);
      return;
    }
    checkStatus();
    fetchQuotes();
    if (selectedExpiry) {
      fetchOptionChain(selectedKey, selectedExpiry);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white w-full overflow-x-hidden">
      {/* Top Header */}
      <Header
        lastUpdatedIst={lastUpdatedIst}
        freshness={freshness}
        quoteAgeSeconds={quoteAgeSeconds}
        sessionStatus={sessionStatus}
        sessionDescription={sessionDescription}
        connectionStatus={connectionStatus}
        feedMode={feedMode}
        onToggleFeedMode={(mode) => {
          if (mode === "STREAM") {
            handleReturnToLive();
          } else {
            setFeedMode("POLL");
          }
        }}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshingQuotes}
        onOpenConfigModal={() => setIsConfigModalOpen(true)}
      />

      {/* Historical Option Chain Replay & Simulator Nav Bar (Shown when Snapshot mode is active) */}
      {feedMode === "POLL" && (
        <HistoricalReplayBar
          selectedDate={replayDate}
          onChangeDate={(date) => {
            setReplayDate(date);
          }}
          currentMinute={replayMinute}
          onChangeMinute={(minute) => {
            setReplayMinute(minute);
          }}
          isPlaying={isReplayPlaying}
          onTogglePlay={() => setIsReplayPlaying((prev) => !prev)}
          speed={replaySpeed}
          onChangeSpeed={(spd) => setReplaySpeed(spd)}
          onReset={() => {
            setIsReplayPlaying(false);
            setReplayMinute(555); // 09:15 AM
          }}
          onReturnToLive={handleReturnToLive}
          underlyingSymbol={currentMetadata.symbol}
        />
      )}

      {/* Main Container - Full Width Expansion */}
      <main className="flex-1 w-full mx-auto py-4 space-y-4 max-w-full px-1 sm:px-2 lg:px-3">
        {/* Token Alert Banner (if missing in .env.local) */}
        {connectionStatus && !connectionStatus.is_configured && (
          <div className="bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-950/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-amber-200">
                  Upstox Analytics Token Unconfigured
                </h4>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  Live broker requests require an official Upstox Analytics Token in <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-200 font-mono">.env.local</code>. Click below to view the setup guide.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors shadow"
              >
                Configure Token Guide
              </button>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {globalError && connectionStatus?.is_configured && (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{globalError}</span>
            </div>
            <button
              onClick={() => setGlobalError(null)}
              className="text-rose-400 hover:text-rose-300 text-[11px] underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Premier Full-Width Real-Time Option Chain */}
        <section className="w-full">
          <OptionChainTable
            optionChain={optionChain}
            underlyingKey={selectedKey}
            activeQuote={activeQuote}
            onSelectUnderlying={(key) => {
              const targetKey = key.includes("India VIX") ? "NSE_INDEX|Nifty 50" : key;
              setSelectedKey(targetKey);
              fetchOptionExpiries(targetKey);
              fetchOptionChain(targetKey);
            }}
            selectedExpiry={selectedExpiry}
            onSelectExpiry={(exp) => {
              setSelectedExpiry(exp);
              fetchOptionChain(selectedKey, exp);
            }}
            availableExpiries={availableExpiries}
            isLoading={optionChainLoading}
            onRefresh={() => fetchOptionChain(selectedKey, selectedExpiry)}
            error={optionChainError}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#1e293b] bg-[#0b0e14] py-4 px-6 text-xs text-slate-500">
        <div className="max-w-full mx-auto flex flex-col md:flex-row items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-400">Indian Trade Option Chain Terminal</span>
            <span className="text-slate-600">|</span>
            <span>Real-time NSE/BSE Analytics & Dominance Heatmap</span>
          </div>
          <div className="text-[11px] text-slate-600">
            Compliant with NSE/SEBI Guidelines • Real-time Data Feeds
          </div>
        </div>
      </footer>

      {/* Token Config Modal */}
      {isConfigModalOpen && (
        <TokenConfigModal
          isOpen={isConfigModalOpen}
          connectionStatus={connectionStatus}
          onRefreshStatus={async () => {
            await checkStatus();
            await fetchQuotes();
          }}
          onClose={() => {
            setIsConfigModalOpen(false);
            checkStatus();
            fetchQuotes();
          }}
        />
      )}
    </div>
  );
}
