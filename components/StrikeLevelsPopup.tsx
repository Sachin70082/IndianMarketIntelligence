"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, ShieldAlert, Copy, Check } from "lucide-react";
import {
  computeLevels,
  StrikeLevelsResult,
  MinimalChainRow,
} from "@/lib/options/optionChainLevels";
import { OptionChainSummary } from "@/lib/types/market";

interface StrikeLevelsPopupProps {
  isOpen: boolean;
  clickedStrike: number | null;
  anchorRect: DOMRect | null;
  optionChain: OptionChainSummary | null;
  underlyingKey: string;
  onClose: () => void;
}

export function StrikeLevelsPopup({
  isOpen,
  clickedStrike,
  anchorRect,
  optionChain,
  underlyingKey,
  onClose,
}: StrikeLevelsPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const prevAtmStraddleRef = useRef<number | null>(null);
  const [copiedField, setCopiedField] = useState<"resistance" | "support" | null>(null);

  // Directly copy value to clipboard with fallback and visual feedback
  const handleCopy = (val: number | null | undefined, field: "resistance" | "support", e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (val === null || val === undefined || isNaN(val)) return;

    const cleanNum = String(val);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(cleanNum);
    } else if (typeof document !== "undefined") {
      const ta = document.createElement("textarea");
      ta.value = cleanNum;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    setCopiedField(field);
    setTimeout(() => {
      setCopiedField((prev) => (prev === field ? null : prev));
    }, 1600);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close on Outside Click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest("[data-strike-cell]")) {
          return;
        }
        onClose();
      }
    };
    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleOutsideClick);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleOutsideClick);
      };
    }
  }, [isOpen, onClose]);

  // Recompute levels on every live refresh while open
  const levelsResult: StrikeLevelsResult | null = useMemo(() => {
    if (!isOpen || clickedStrike === null || !optionChain?.strikes || optionChain.strikes.length === 0) {
      return null;
    }

    const mappedChain: MinimalChainRow[] = optionChain.strikes.map((s) => ({
      strike: s.strike_price,
      call: {
        ltp: s.call?.ltp || 0,
        iv: s.call?.greeks?.iv ?? (s.call as any)?.iv ?? null,
        oi: s.call?.oi || 0,
        chgOi: s.call?.change_oi || 0,
        vol: s.call?.volume || 0,
        gamma: s.call?.greeks?.gamma ?? null,
        delta: s.call?.greeks?.delta ?? null,
        theta: s.call?.greeks?.theta ?? null,
        vega: s.call?.greeks?.vega ?? null,
      },
      put: {
        ltp: s.put?.ltp || 0,
        iv: s.put?.greeks?.iv ?? (s.put as any)?.iv ?? null,
        oi: s.put?.oi || 0,
        chgOi: s.put?.change_oi || 0,
        vol: s.put?.volume || 0,
        gamma: s.put?.greeks?.gamma ?? null,
        delta: s.put?.greeks?.delta ?? null,
        theta: s.put?.greeks?.theta ?? null,
        vega: s.put?.greeks?.vega ?? null,
      },
    }));

    try {
      const res = computeLevels(mappedChain, clickedStrike, {
        spot: optionChain.underlying_spot_price,
        expiry: optionChain.expiry,
        prevAtmStraddle: prevAtmStraddleRef.current,
      });

      if (res.atmStraddle !== null) {
        prevAtmStraddleRef.current = res.atmStraddle;
      }

      return res;
    } catch {
      return null;
    }
  }, [isOpen, clickedStrike, optionChain]);

  if (!isOpen || clickedStrike === null) return null;

  // Read index name dynamically from the page's option chain state
  const indexName = optionChain?.underlying_symbol || underlyingKey.split("|")[1] || "INDEX";

  // Desktop positioning: calculate anchored position without shifting layout
  let desktopStyle: React.CSSProperties = {};
  if (anchorRect && typeof window !== "undefined") {
    const popupWidth = 280;
    const padding = 16;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let left = anchorRect.right + 12;
    if (left + popupWidth > windowWidth - padding) {
      left = Math.max(padding, anchorRect.left - popupWidth - 12);
    }

    let top = anchorRect.top - 10;
    const estimatedHeight = 140;
    if (top + estimatedHeight > windowHeight - padding) {
      top = Math.max(padding, windowHeight - estimatedHeight - padding);
    }
    if (top < padding) top = padding;

    desktopStyle = {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 60,
    };
  }

  const formatPrice = (val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return `₹${val.toLocaleString("en-IN")}`;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs md:hidden z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Compact Popup Window */}
      <div
        ref={popupRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="strike-popup-title"
        style={desktopStyle}
        className="fixed bottom-0 inset-x-0 md:inset-x-auto md:bottom-auto w-full md:w-[280px] bg-[#0b0f19] text-slate-100 rounded-t-2xl md:rounded-2xl border border-slate-700/80 shadow-2xl z-50 font-mono text-xs select-none shadow-black/80 ring-1 ring-white/10 overflow-hidden"
      >
        {/* Heading: Strike */}
        <div className="px-3.5 py-2 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2">
          <h3
            id="strike-popup-title"
            className="text-sm font-black text-white tracking-wide flex items-center gap-1.5"
          >
            <span className="text-blue-400">{indexName}</span>
            <span className="text-white">{clickedStrike}</span>
          </h3>

          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:bg-rose-950/80 hover:border-rose-700 transition shrink-0"
            title="Close (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body: RESISTANCE (Left - GREEN) & SUPPORT (Right - RED) with Instant One-Click Copy */}
        {levelsResult ? (
          <div className="p-3">
            <div className="grid grid-cols-2 gap-2.5">
              {/* RESISTANCE - Left Side (GREEN) */}
              <div
                onClick={(e) => handleCopy(levelsResult.resistance, "resistance", e)}
                className="group relative p-2.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-700/50 hover:border-emerald-500/80 transition-all cursor-pointer shadow flex flex-col justify-between items-center select-none active:scale-[0.98]"
                title="Click or tap icon to copy Resistance value"
              >
                <div className="w-full flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    RESISTANCE
                  </span>
                  <button
                    onClick={(e) => handleCopy(levelsResult.resistance, "resistance", e)}
                    className="p-1 rounded-md bg-emerald-900/40 hover:bg-emerald-800/70 text-emerald-300 transition shrink-0"
                    title="Copy Resistance value"
                  >
                    {copiedField === "resistance" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300 animate-in zoom-in-50" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-emerald-400/80 group-hover:text-emerald-200" />
                    )}
                  </button>
                </div>

                <div className="text-lg font-black font-mono text-emerald-300 my-1">
                  {levelsResult.resistance !== null ? formatPrice(levelsResult.resistance) : "—"}
                </div>

                <div className="h-4 flex items-center justify-center">
                  {copiedField === "resistance" ? (
                    <span className="text-[9px] font-bold text-emerald-300 bg-emerald-900/80 px-1.5 py-0.2 rounded font-mono border border-emerald-700/60 shadow-xs animate-in fade-in">
                      ✓ Copied {levelsResult.resistance}
                    </span>
                  ) : (
                    <span className="text-[9px] text-emerald-500/60 group-hover:text-emerald-300 transition-colors font-mono flex items-center gap-1">
                      <Copy className="w-2.5 h-2.5 opacity-60" /> Copy level
                    </span>
                  )}
                </div>
              </div>

              {/* SUPPORT - Right Side (RED) */}
              <div
                onClick={(e) => handleCopy(levelsResult.support, "support", e)}
                className="group relative p-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 border border-rose-700/50 hover:border-rose-500/80 transition-all cursor-pointer shadow flex flex-col justify-between items-center select-none active:scale-[0.98]"
                title="Click or tap icon to copy Support value"
              >
                <div className="w-full flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                    SUPPORT
                  </span>
                  <button
                    onClick={(e) => handleCopy(levelsResult.support, "support", e)}
                    className="p-1 rounded-md bg-rose-900/40 hover:bg-rose-800/70 text-rose-300 transition shrink-0"
                    title="Copy Support value"
                  >
                    {copiedField === "support" ? (
                      <Check className="w-3.5 h-3.5 text-rose-300 animate-in zoom-in-50" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-rose-400/80 group-hover:text-rose-200" />
                    )}
                  </button>
                </div>

                <div className="text-lg font-black font-mono text-rose-300 my-1">
                  {levelsResult.support !== null ? formatPrice(levelsResult.support) : "—"}
                </div>

                <div className="h-4 flex items-center justify-center">
                  {copiedField === "support" ? (
                    <span className="text-[9px] font-bold text-rose-300 bg-rose-900/80 px-1.5 py-0.2 rounded font-mono border border-rose-700/60 shadow-xs animate-in fade-in">
                      ✓ Copied {levelsResult.support}
                    </span>
                  ) : (
                    <span className="text-[9px] text-rose-500/60 group-hover:text-rose-300 transition-colors font-mono flex items-center gap-1">
                      <Copy className="w-2.5 h-2.5 opacity-60" /> Copy level
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-slate-400 space-y-1.5">
            <ShieldAlert className="w-5 h-5 mx-auto text-amber-400" />
            <p className="text-[11px]">Waiting for live data...</p>
          </div>
        )}
      </div>
    </>
  );
}
