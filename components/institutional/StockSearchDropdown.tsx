"use client";

import React, { useState, useEffect, useRef } from "react";
import { StockMasterItem, SECTORS_LIST } from "@/lib/stocks/stockMaster";
import { Search, Filter, X, ChevronDown, Check, Building, Globe } from "lucide-react";

interface StockSearchDropdownProps {
  selectedStock: StockMasterItem;
  onSelectStock: (stock: StockMasterItem) => void;
  onFilterSector?: (sector: string) => void;
}

export function StockSearchDropdown({
  selectedStock,
  onSelectStock,
  onFilterSector,
}: StockSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [exchangeFilter, setExchangeFilter] = useState<"ALL" | "NSE" | "BSE">("ALL");
  const [sectorFilter, setSectorFilter] = useState<string>("All Sectors");
  const [marketCapFilter, setMarketCapFilter] = useState<string>("ALL");
  
  const [results, setResults] = useState<StockMasterItem[]>([]);
  const [totalFound, setTotalFound] = useState<number>(5720);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Search API fetch with debouncing
  useEffect(() => {
    let active = true;
    const fetchResults = async () => {
      setLoading(true);
      try {
        const qParams = new URLSearchParams();
        if (query) qParams.set("query", query);
        if (exchangeFilter !== "ALL") qParams.set("exchange", exchangeFilter);
        if (sectorFilter !== "All Sectors") qParams.set("sector", sectorFilter);
        if (marketCapFilter !== "ALL") qParams.set("marketCap", marketCapFilter);

        const res = await fetch(`/api/institutional/scanner?${qParams.toString()}`);
        const data = await res.json();
        if (active && data.success) {
          setResults(data.searchedStocks || []);
          setTotalFound(data.totalFound || 0);
        }
      } catch (e) {
        // Fallback gracefully
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 120);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, exchangeFilter, sectorFilter, marketCapFilter]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      {/* Trigger Button / Input Bar */}
      <div
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-emerald-500/80 transition-all cursor-pointer shadow-lg group"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors font-mono">
                {selectedStock.symbol}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800/60 shrink-0">
                {selectedStock.exchange}
              </span>
              <span className="text-[11px] text-slate-400 font-medium truncate hidden sm:inline">
                {selectedStock.companyName}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
              <span>{selectedStock.sector}</span>
              <span>•</span>
              <span className="font-mono">{selectedStock.isin}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
            5,700+ Equities
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180 text-emerald-400" : ""}`} />
        </div>
      </div>

      {/* Dropdown Floating Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-[#090e1c] border border-slate-700 shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[520px] animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Symbol (e.g. RELIANCE, TCS), Company Name, or ISIN..."
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-hidden font-medium"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Exchange Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 font-mono text-[11px]">
              {(["ALL", "NSE", "BSE"] as const).map((ex) => (
                <button
                  key={ex}
                  onClick={() => setExchangeFilter(ex)}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    exchangeFilter === ex
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>

            {/* Sector Selector */}
            <select
              value={sectorFilter}
              onChange={(e) => {
                setSectorFilter(e.target.value);
                if (onFilterSector) onFilterSector(e.target.value);
              }}
              className="bg-slate-950 text-slate-300 text-[11px] rounded-lg border border-slate-800 px-2 py-1 outline-hidden font-medium"
            >
              {SECTORS_LIST.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>

            {/* Market Cap Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 font-mono text-[10px]">
              {[
                { label: "ALL", val: "ALL" },
                { label: "LARGE", val: "LARGE" },
                { label: "MID", val: "MID" },
                { label: "SMALL", val: "SMALL" },
              ].map((c) => (
                <button
                  key={c.val}
                  onClick={() => setMarketCapFilter(c.val)}
                  className={`px-1.5 py-0.5 rounded transition ${
                    marketCapFilter === c.val ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-850 p-1">
            {loading && results.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono animate-pulse">
                Scanning 5,700+ stock records...
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-mono">
                No stocks match &quot;{query}&quot;. Try another symbol or remove filters.
              </div>
            ) : (
              results.map((st) => {
                const isCurrent = st.symbol === selectedStock.symbol;
                return (
                  <div
                    key={st.id}
                    onClick={() => {
                      onSelectStock(st);
                      setIsOpen(false);
                    }}
                    className={`p-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition ${
                      isCurrent
                        ? "bg-emerald-950/60 border border-emerald-600/60"
                        : "hover:bg-slate-850 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="font-mono font-black text-sm text-white shrink-0 min-w-[80px]">
                        {st.symbol}
                      </div>
                      <div className="flex flex-col overflow-hidden text-left">
                        <div className="text-xs font-semibold text-slate-300 truncate">
                          {st.companyName}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span className="text-emerald-400 font-medium">{st.sector}</span>
                          <span>•</span>
                          <span>ISIN: {st.isin}</span>
                          {st.bseCode && (
                            <>
                              <span>•</span>
                              <span>BSE: {st.bseCode}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        {st.exchange}
                      </span>
                      {st.isFnoEligible && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          F&amp;O
                        </span>
                      )}
                      {isCurrent && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span>Showing top {results.length} of {totalFound.toLocaleString("en-IN")} matching equities</span>
            <span className="text-slate-500">Press Esc to exit</span>
          </div>
        </div>
      )}
    </div>
  );
}

