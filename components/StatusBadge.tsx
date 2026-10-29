import React from "react";
import { MarketFreshness, MarketSessionStatus } from "@/lib/types/market";

interface FreshnessBadgeProps {
  freshness: MarketFreshness;
  quoteAgeSeconds?: number;
  showAge?: boolean;
}

export function FreshnessBadge({ freshness, quoteAgeSeconds, showAge = true }: FreshnessBadgeProps) {
  let bgClass = "bg-slate-800 text-slate-300 border-slate-700";
  let dotClass = "bg-slate-400";
  let label = "UNKNOWN";

  switch (freshness) {
    case "LIVE":
      bgClass = "bg-emerald-950/80 text-emerald-400 border-emerald-800/60";
      dotClass = "bg-emerald-400 animate-ping";
      label = "LIVE STREAM";
      break;
    case "RECENT":
      bgClass = "bg-blue-950/80 text-blue-400 border-blue-800/60";
      dotClass = "bg-blue-400";
      label = "RECENT (SNAPSHOT)";
      break;
    case "SNAPSHOT":
      bgClass = "bg-amber-950/80 text-amber-300 border-amber-800/60";
      dotClass = "bg-amber-400";
      label = "HISTORICAL SNAPSHOT";
      break;
    case "STALE":
      bgClass = "bg-amber-950/80 text-amber-400 border-amber-800/60";
      dotClass = "bg-amber-400";
      label = "STALE FEED";
      break;
    case "DISCONNECTED":
      bgClass = "bg-rose-950/80 text-rose-400 border-rose-800/60";
      dotClass = "bg-rose-400";
      label = "DISCONNECTED";
      break;
    default:
      bgClass = "bg-slate-900 text-slate-400 border-slate-800";
      dotClass = "bg-slate-500";
      label = "UNKNOWN";
  }

  const ageText =
    showAge && quoteAgeSeconds !== undefined && quoteAgeSeconds < 86400
      ? ` • ${quoteAgeSeconds}s`
      : "";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bgClass}`}
      title={`Freshness status: ${label}${ageText}`}
    >
      <span className="relative flex h-2 w-2">
        {freshness === "LIVE" && (
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`} />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            freshness === "LIVE"
              ? "bg-emerald-400"
              : freshness === "RECENT"
              ? "bg-blue-400"
              : freshness === "STALE"
              ? "bg-amber-400"
              : "bg-rose-400"
          }`}
        />
      </span>
      <span>
        {label}
        {ageText}
      </span>
    </span>
  );
}

interface SessionBadgeProps {
  status: MarketSessionStatus;
  description?: string;
}

export function SessionBadge({ status, description }: SessionBadgeProps) {
  let colorClass = "bg-slate-800 text-slate-300 border-slate-700";
  let dotColor = "bg-slate-500";

  switch (status) {
    case "NORMAL_OPEN":
      colorClass = "bg-emerald-950/70 text-emerald-400 border-emerald-800/50";
      dotColor = "bg-emerald-400";
      break;
    case "PRE_OPEN":
      colorClass = "bg-cyan-950/70 text-cyan-400 border-cyan-800/50";
      dotColor = "bg-cyan-400";
      break;
    case "CLOSING":
      colorClass = "bg-amber-950/70 text-amber-400 border-amber-800/50";
      dotColor = "bg-amber-400";
      break;
    case "NORMAL_CLOSE":
      colorClass = "bg-slate-900/90 text-slate-400 border-slate-800";
      dotColor = "bg-slate-500";
      break;
    case "WEEKEND":
    case "HOLIDAY":
      colorClass = "bg-indigo-950/70 text-indigo-300 border-indigo-800/50";
      dotColor = "bg-indigo-400";
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}
      title={description || status}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span>{status.replace("_", " ")}</span>
    </span>
  );
}
