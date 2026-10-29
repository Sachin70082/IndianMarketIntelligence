import { CandleDataPoint, MarketStructure } from "@/lib/types/market";

export interface SwingPoint {
  index: number;
  time: number;
  price: number;
  type: "HIGH" | "LOW";
}

/**
 * Market Structure & Level Engine
 * Identifies Swing Highs/Lows, BOS (Break of Structure), ChoCh (Change of Character),
 * Previous-Day Levels (PDH, PDL, PDC, PDO), and Opening Range Breakout (ORB).
 */
export function analyzeMarketStructure(candles: CandleDataPoint[]): MarketStructure {
  const result: MarketStructure = {
    trend: "RANGING",
    swingHigh: null,
    swingLow: null,
    lastBOS: null,
    lastChoCh: null,
    pdh: null,
    pdl: null,
    pdc: null,
    pdo: null,
    orb15High: null,
    orb15Low: null,
  };

  if (!candles || candles.length < 5) {
    return result;
  }

  // 1. Calculate Previous Day Levels (PDH, PDL, PDC, PDO)
  // Group candles by calendar date in IST
  const dayGroups: Record<string, CandleDataPoint[]> = {};
  for (const c of candles) {
    const timestampMs = c.time > 1e11 ? c.time : c.time * 1000;
    const dayKey = new Date(timestampMs).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
    if (!dayGroups[dayKey]) dayGroups[dayKey] = [];
    dayGroups[dayKey].push(c);
  }

  const dayKeys = Object.keys(dayGroups);
  if (dayKeys.length >= 2) {
    // Previous day is the second to last dayKey
    const prevDayCandles = dayGroups[dayKeys[dayKeys.length - 2]];
    if (prevDayCandles && prevDayCandles.length > 0) {
      result.pdo = prevDayCandles[0].open;
      result.pdc = prevDayCandles[prevDayCandles.length - 1].close;
      result.pdh = Math.max(...prevDayCandles.map((c) => c.high));
      result.pdl = Math.min(...prevDayCandles.map((c) => c.low));
    }
  }

  // Current Day Opening Range (first 15 minutes: 09:15 - 09:30 IST)
  if (dayKeys.length > 0) {
    const currentDayCandles = dayGroups[dayKeys[dayKeys.length - 1]];
    if (currentDayCandles && currentDayCandles.length > 0) {
      // First 3 x 5m candles or first 15 x 1m candles
      const orbCandles = currentDayCandles.slice(0, 15);
      if (orbCandles.length > 0) {
        result.orb15High = Math.max(...orbCandles.map((c) => c.high));
        result.orb15Low = Math.min(...orbCandles.map((c) => c.low));
      }
    }
  }

  // 2. Identify 5-candle Fractal Swing Highs and Swing Lows
  const swingHighs: SwingPoint[] = [];
  const swingLows: SwingPoint[] = [];

  for (let i = 2; i < candles.length - 2; i++) {
    const curr = candles[i];

    // Swing High: higher than 2 candles before and 2 candles after
    if (
      curr.high > candles[i - 1].high &&
      curr.high > candles[i - 2].high &&
      curr.high >= candles[i + 1].high &&
      curr.high >= candles[i + 2].high
    ) {
      swingHighs.push({ index: i, time: curr.time, price: curr.high, type: "HIGH" });
    }

    // Swing Low: lower than 2 candles before and 2 candles after
    if (
      curr.low < candles[i - 1].low &&
      curr.low < candles[i - 2].low &&
      curr.low <= candles[i + 1].low &&
      curr.low <= candles[i + 2].low
    ) {
      swingLows.push({ index: i, time: curr.time, price: curr.low, type: "LOW" });
    }
  }

  if (swingHighs.length > 0) {
    result.swingHigh = swingHighs[swingHighs.length - 1].price;
  }
  if (swingLows.length > 0) {
    result.swingLow = swingLows[swingLows.length - 1].price;
  }

  // 3. Determine Higher Highs (HH), Higher Lows (HL) vs Lower Lows (LL), Lower Highs (LH)
  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const sh1 = swingHighs[swingHighs.length - 1].price;
    const sh2 = swingHighs[swingHighs.length - 2].price;
    const sl1 = swingLows[swingLows.length - 1].price;
    const sl2 = swingLows[swingLows.length - 2].price;

    const isHH = sh1 > sh2;
    const isHL = sl1 > sl2;
    const isLH = sh1 < sh2;
    const isLL = sl1 < sl2;

    if (isHH && isHL) {
      result.trend = "UPTREND";
    } else if (isLH && isLL) {
      result.trend = "DOWNTREND";
    } else {
      result.trend = "CONSOLIDATION";
    }

    // Check BOS & ChoCh against latest candle close
    const lastClose = candles[candles.length - 1].close;
    if (lastClose > sh1) {
      result.lastBOS = "BULLISH_BREAKOUT";
    } else if (lastClose < sl1) {
      result.lastBOS = "BEARISH_BREAKDOWN";
    }

    // Change of Character: Uptrend breaking below most recent swing low
    if (result.trend === "UPTREND" && lastClose < sl1) {
      result.lastChoCh = "BEARISH_REVERSAL";
    } else if (result.trend === "DOWNTREND" && lastClose > sh1) {
      result.lastChoCh = "BULLISH_REVERSAL";
    }
  }

  return result;
}
