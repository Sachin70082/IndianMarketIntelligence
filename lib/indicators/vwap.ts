export interface CandleVWAPPartial {
  time: number; // unix timestamp in seconds or ms
  date?: string; // date string or IST date
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface VWAPCalculationResult {
  values: (number | null)[];
  is_approximation: boolean;
  label: string;
}

/**
 * Calculates Intraday Session Volume Weighted Average Price (VWAP)
 * Resets at the start of each trading day (00:00 UTC or 09:15 IST day boundary).
 * Uses Candle aggregate approximation: Typical Price = (High + Low + Close) / 3.
 */
export function calculateVWAP(candles: CandleVWAPPartial[]): VWAPCalculationResult {
  const values: (number | null)[] = new Array(candles.length).fill(null);

  if (!candles || candles.length === 0) {
    return { values, is_approximation: true, label: "Session VWAP (Approximation)" };
  }

  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  let currentDayKey = "";

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    
    // Determine session day in IST (UTC+5:30)
    const timestampMs = c.time > 1e11 ? c.time : c.time * 1000;
    const dateObj = new Date(timestampMs);
    const dayKey = dateObj.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });

    // Session reset on new trading day
    if (dayKey !== currentDayKey) {
      currentDayKey = dayKey;
      cumulativeTPV = 0;
      cumulativeVolume = 0;
    }

    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = c.volume > 0 ? c.volume : 1; // avoid divide by zero if zero volume

    cumulativeTPV += typicalPrice * vol;
    cumulativeVolume += vol;

    if (cumulativeVolume > 0) {
      values[i] = Number((cumulativeTPV / cumulativeVolume).toFixed(2));
    } else {
      values[i] = typicalPrice;
    }
  }

  return {
    values,
    is_approximation: true,
    label: "Session VWAP (Candle Aggregate Approximation)",
  };
}

/**
 * Calculates VWAP slope over recent lookback candles to detect institutional trending bias.
 */
export function calculateVWAPSlope(
  vwapValues: (number | null)[],
  lookback: number = 5
): { slope: number; direction: "RISING" | "FALLING" | "FLAT" } {
  const valid = vwapValues.filter((v): v is number => v !== null);
  if (valid.length < lookback || lookback <= 1) {
    return { slope: 0, direction: "FLAT" };
  }

  const recent = valid.slice(-lookback);
  const delta = recent[recent.length - 1] - recent[0];
  const slope = Number((delta / (lookback - 1)).toFixed(2));

  // Threshold: slope > 0.05% of price or standard tick
  const basePrice = recent[0] || 1;
  const pctChange = (delta / basePrice) * 100;

  if (pctChange > 0.04) {
    return { slope, direction: "RISING" };
  } else if (pctChange < -0.04) {
    return { slope, direction: "FALLING" };
  }
  return { slope, direction: "FLAT" };
}
