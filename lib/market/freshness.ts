import { MarketFreshness } from "@/lib/types/market";
import { getMarketSessionStatus } from "./sessions";

export interface FreshnessCalculation {
  freshness: MarketFreshness;
  quote_age_seconds: number;
  is_stale: boolean;
  clock_skew_detected: boolean;
  label: string;
}

/**
 * Calculates true data freshness based on source exchange timestamp vs current receipt time
 */
export function calculateFreshness(
  apiTimestampMs?: number | null,
  isApiConnected: boolean = true
): FreshnessCalculation {
  if (!isApiConnected || !apiTimestampMs) {
    return {
      freshness: isApiConnected ? "UNKNOWN" : "DISCONNECTED",
      quote_age_seconds: 999999,
      is_stale: true,
      clock_skew_detected: false,
      label: isApiConnected ? "Data Unavailable" : "Disconnected",
    };
  }

  const nowMs = Date.now();
  const ageSeconds = Math.max(0, Math.round((nowMs - apiTimestampMs) / 1000));
  const { is_trading_active } = getMarketSessionStatus();

  // Clock skew detection: if api timestamp is more than 60s in the future
  const clock_skew_detected = apiTimestampMs - nowMs > 60000;

  if (clock_skew_detected) {
    return {
      freshness: "UNKNOWN",
      quote_age_seconds: 0,
      is_stale: true,
      clock_skew_detected: true,
      label: "Clock Skew Detected",
    };
  }

  // If market is closed, data is an end-of-day or post-close snapshot
  if (!is_trading_active) {
    return {
      freshness: ageSeconds < 60 ? "RECENT" : "STALE",
      quote_age_seconds: ageSeconds,
      is_stale: false, // Closed session snapshot is valid historical/last close
      clock_skew_detected: false,
      label: "Session Closed Snapshot",
    };
  }

  // During active market hours:
  if (ageSeconds <= 5) {
    return {
      freshness: "LIVE",
      quote_age_seconds: ageSeconds,
      is_stale: false,
      clock_skew_detected: false,
      label: "Live Tick Stream",
    };
  } else if (ageSeconds <= 30) {
    return {
      freshness: "RECENT",
      quote_age_seconds: ageSeconds,
      is_stale: false,
      clock_skew_detected: false,
      label: "Recent Snapshot",
    };
  } else {
    return {
      freshness: "STALE",
      quote_age_seconds: ageSeconds,
      is_stale: true,
      clock_skew_detected: false,
      label: "Stale Feed (>30s)",
    };
  }
}
