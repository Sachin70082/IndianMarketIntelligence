"use client";

import React, { useState, useMemo } from "react";
import { ALL_PRESET_INSTRUMENTS } from "@/lib/upstox/constants";
import { InstrumentMetadata } from "@/lib/types/market";
import { Search, Plus, Check, ChevronDown, Layers, Sparkles } from "lucide-react";

interface InstrumentSelectorProps {
  selectedKey: string;
  onSelectKey: (key: string) => void;
}

export function InstrumentSelector({ selectedKey, onSelectKey }: InstrumentSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "INDEX" | "EQ" | "CUSTOM">("ALL");
  const [customKeyInput, setCustomKeyInput] = useState("");
  const [customKeyError, setCustomKeyError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Filter instruments
  const filteredInstruments = useMemo(() => {
    return ALL_PRESET_INSTRUMENTS.filter((inst) => {
      const matchesTab =
        activeTab === "ALL" || (activeTab === "INDEX" && inst.segment === "INDEX") || (activeTab === "EQ" && inst.segment === "EQ");

      const term = searchTerm.toLowerCase();
      const matchesSearch =
        inst.symbol.toLowerCase().includes(term) ||
        inst.name.toLowerCase().includes(term) ||
        inst.instrument_key.toLowerCase().includes(term);

      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchTerm]);

  // Current selected instrument details
  const currentInstrument = useMemo(() => {
    const found = ALL_PRESET_INSTRUMENTS.find((i) => i.instrument_key === selectedKey);
    if (found) return found;

    // Custom key fallback
    const [exchange = "NSE", symbol = selectedKey] = selectedKey.split("|");
    return {
      instrument_key: selectedKey,
      symbol,
      name: `Custom Instrument (${selectedKey})`,
      exchange: exchange as "NSE" | "BSE",
      segment: (selectedKey.includes("INDEX") ? "INDEX" : "EQ") as "INDEX" | "EQ",
      tick_size: 0.05,
      lot_size: 1,
    } as InstrumentMetadata;
  }, [selectedKey]);

  const handleCustomKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customKeyInput.trim();
    if (!clean) {
      setCustomKeyError("Please enter an instrument key");
      return;
    }
    if (!clean.includes("|")) {
      setCustomKeyError("Format must be EXCHANGE|IDENTIFIER (e.g., 'NSE_INDEX|Nifty 50' or 'NSE_EQ|INE002A01018')");
      return;
    }
    setCustomKeyError("");
    onSelectKey(clean);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      {/* Current Selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0a0e1a]/90 border border-slate-800/80 rounded-2xl shadow-md shadow-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700/80 transition-all shadow-sm active:scale-95"
          >
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-sm tracking-tight">{currentInstrument.symbol}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
              {currentInstrument.exchange}
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 font-medium border border-blue-800/40">
              {currentInstrument.segment}
            </span>
            <span className="text-slate-400 truncate max-w-xs">{currentInstrument.name}</span>
          </div>
        </div>

        {/* Quick Benchmark Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
          <span className="text-slate-500 text-[11px] font-medium mr-1 hidden md:inline">Quick Jump:</span>
          {ALL_PRESET_INSTRUMENTS.slice(0, 5).map((inst) => {
            const isSelected = selectedKey === inst.instrument_key;
            return (
              <button
                key={inst.instrument_key}
                onClick={() => onSelectKey(inst.instrument_key)}
                className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] whitespace-nowrap ${
                  isSelected
                    ? "bg-blue-600 text-white font-bold shadow-sm"
                    : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-750"
                }`}
              >
                {inst.symbol}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expandable Dropdown / Modal Selector */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-4 max-w-2xl animate-fadeIn">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950/60 rounded-xl border border-slate-800 mb-3 text-xs">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                activeTab === "ALL" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              All Presets
            </button>
            <button
              onClick={() => setActiveTab("INDEX")}
              className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                activeTab === "INDEX" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Indices
            </button>
            <button
              onClick={() => setActiveTab("EQ")}
              className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                activeTab === "EQ" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Equities
            </button>
            <button
              onClick={() => setActiveTab("CUSTOM")}
              className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                activeTab === "CUSTOM" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Custom Key
            </button>
          </div>

          {activeTab !== "CUSTOM" ? (
            <>
              {/* Search Bar */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by symbol, company, or key..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Instrument List */}
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {filteredInstruments.map((inst) => {
                  const isSelected = selectedKey === inst.instrument_key;
                  return (
                    <div
                      key={inst.instrument_key}
                      onClick={() => {
                        onSelectKey(inst.instrument_key);
                        setIsOpen(false);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                        isSelected
                          ? "bg-blue-900/40 border border-blue-500/40 text-white"
                          : "hover:bg-slate-800/60 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm">{inst.symbol}</span>
                        <span className="text-xs text-slate-400 truncate max-w-xs">{inst.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {inst.exchange} • {inst.segment}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Custom Key Input Form */
            <form onSubmit={handleCustomKeySubmit} className="space-y-3">
              <div className="text-xs text-slate-300">
                Enter an official Upstox Instrument Key format:
              </div>
              <input
                type="text"
                placeholder="e.g. NSE_EQ|INE002A01018 or NSE_INDEX|Nifty 50"
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
              {customKeyError && (
                <div className="text-xs text-rose-400 font-medium">{customKeyError}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Load Key
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
