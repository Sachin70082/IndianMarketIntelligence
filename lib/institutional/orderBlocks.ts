import { CandleDataPoint } from "@/lib/types/market";
import { OrderBlockZone, OrderBlockDirection, OrderBlockStatus } from "./types";

/**
 * Calculates Average True Range (ATR) over a given period
 */
function calculateAtr(candles: CandleDataPoint[], period: number = 14): number {
  if (candles.length < 2) return 1.0;
  let trSum = 0;
  const count = Math.min(candles.length - 1, period);

  for (let i = candles.length - count; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];
    const hl = curr.high - curr.low;
    const hc = Math.abs(curr.high - prev.close);
    const lc = Math.abs(curr.low - prev.close);
    trSum += Math.max(hl, hc, lc);
  }
  return trSum / count || 1.0;
}

/**
 * Advanced SMC Institutional Order Block Detection Algorithm
 * Identifies high-conviction Bullish and Bearish Order Blocks with
 * structural displacement, FVG validation, and real-time mitigation tracking.
 */
export function detectOrderBlocks(
  candles: CandleDataPoint[],
  symbol: string,
  timeframe: string = "15m"
): {
  orderBlocks: OrderBlockZone[];
  activeBullishOB: OrderBlockZone | null;
  activeBearishOB: OrderBlockZone | null;
} {
  if (!candles || candles.length < 10) {
    return { orderBlocks: [], activeBullishOB: null, activeBearishOB: null };
  }

  const atr = calculateAtr(candles, 14);
  const n = candles.length;

  // Calculate 20-period moving average volume
  const avgVolume20: number[] = new Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - 19);
    let sum = 0;
    for (let j = start; j <= i; j++) sum += candles[j].volume || 1;
    avgVolume20[i] = sum / (i - start + 1);
  }

  const detectedBlocks: OrderBlockZone[] = [];

  // Swing Highs and Lows for BOS/CHoCH identification
  const swingHighs: { idx: number; price: number }[] = [];
  const swingLows: { idx: number; price: number }[] = [];

  for (let i = 2; i < n - 2; i++) {
    const c = candles[i];
    if (
      c.high > candles[i - 1].high &&
      c.high > candles[i - 2].high &&
      c.high >= candles[i + 1].high &&
      c.high >= candles[i + 2].high
    ) {
      swingHighs.push({ idx: i, price: c.high });
    }
    if (
      c.low < candles[i - 1].low &&
      c.low < candles[i - 2].low &&
      c.low <= candles[i + 1].low &&
      c.low <= candles[i + 2].low
    ) {
      swingLows.push({ idx: i, price: c.low });
    }
  }

  // Scan for institutional displacement moves (3-candle sequence)
  for (let i = 3; i < n - 1; i++) {
    const obCandle = candles[i - 1]; // The potential Order Block
    const dispCandle1 = candles[i];  // Aggressive expansion candle
    const dispCandle2 = candles[i + 1];

    const obBody = Math.abs(obCandle.close - obCandle.open);
    const disp1Body = Math.abs(dispCandle1.close - dispCandle1.open);
    const disp1Range = dispCandle1.high - dispCandle1.low;

    // Displacement criteria: Body must be substantial (> 1.2x ATR) and volume expanding
    const isSignificantDisp = disp1Body > atr * 1.1 && disp1Range > 0;
    const volMultiplier = Number((dispCandle1.volume / (avgVolume20[i] || 1)).toFixed(2));
    const isVolConfirmed = volMultiplier >= 1.35;

    // 1. BULLISH ORDER BLOCK: Last down candle before strong upward displacement breaking structure
    if (obCandle.close <= obCandle.open && dispCandle1.close > dispCandle1.open && isSignificantDisp) {
      // Check for Fair Value Gap (low of candle after displacement > high of obCandle)
      const hasFvg = dispCandle2 && dispCandle2.low > obCandle.high;

      // Check if displacement breaks a recent swing high (BOS)
      const brokeSwingHigh = swingHighs.some(
        (sh) => sh.idx < i && sh.idx >= i - 25 && dispCandle1.close > sh.price
      );

      const highPrice = Math.max(obCandle.open, obCandle.high);
      const lowPrice = obCandle.low;
      const midPrice = Number(((highPrice + lowPrice) / 2).toFixed(2));

      // Calculate strength score
      let score = 55;
      if (isVolConfirmed) score += 15;
      if (hasFvg) score += 15;
      if (brokeSwingHigh) score += 15;
      score = Math.min(98, score);

      detectedBlocks.push({
        id: `OB_BULL_${symbol}_${obCandle.time}`,
        symbol,
        timeframe,
        direction: "BULLISH",
        highPrice,
        lowPrice,
        midPrice,
        status: "FRESH",
        retestCount: 0,
        strengthScore: score,
        candleTime: obCandle.time,
        candleDate: obCandle.date,
        hasFvg,
        volumeMultiplier: volMultiplier,
        breakType: brokeSwingHigh ? "BOS" : "DISPLACEMENT",
      });
    }

    // 2. BEARISH ORDER BLOCK: Last up candle before strong downward displacement breaking structure
    if (obCandle.close >= obCandle.open && dispCandle1.close < dispCandle1.open && isSignificantDisp) {
      const hasFvg = dispCandle2 && dispCandle2.high < obCandle.low;

      // Check if displacement breaks a recent swing low (BOS)
      const brokeSwingLow = swingLows.some(
        (sl) => sl.idx < i && sl.idx >= i - 25 && dispCandle1.close < sl.price
      );

      const highPrice = obCandle.high;
      const lowPrice = Math.min(obCandle.open, obCandle.low);
      const midPrice = Number(((highPrice + lowPrice) / 2).toFixed(2));

      let score = 55;
      if (isVolConfirmed) score += 15;
      if (hasFvg) score += 15;
      if (brokeSwingLow) score += 15;
      score = Math.min(98, score);

      detectedBlocks.push({
        id: `OB_BEAR_${symbol}_${obCandle.time}`,
        symbol,
        timeframe,
        direction: "BEARISH",
        highPrice,
        lowPrice,
        midPrice,
        status: "FRESH",
        retestCount: 0,
        strengthScore: score,
        candleTime: obCandle.time,
        candleDate: obCandle.date,
        hasFvg,
        volumeMultiplier: volMultiplier,
        breakType: brokeSwingLow ? "BOS" : "DISPLACEMENT",
      });
    }
  }

  // Determine mitigation status by checking subsequent price action for each OB
  const currentPrice = candles[n - 1].close;

  for (const ob of detectedBlocks) {
    const obIndex = candles.findIndex((c) => c.time === ob.candleTime);
    if (obIndex === -1) continue;

    let retests = 0;
    let fullyMitigated = false;

    for (let j = obIndex + 2; j < n; j++) {
      const c = candles[j];

      if (ob.direction === "BULLISH") {
        // Price penetrates below low = invalidated
        if (c.low < ob.lowPrice) {
          fullyMitigated = true;
          break;
        }
        // Price taps into zone
        if (c.low <= ob.highPrice && c.high >= ob.lowPrice) {
          retests++;
        }
      } else {
        // Price penetrates above high = invalidated
        if (c.high > ob.highPrice) {
          fullyMitigated = true;
          break;
        }
        // Price taps into zone
        if (c.high >= ob.lowPrice && c.low <= ob.highPrice) {
          retests++;
        }
      }
    }

    if (fullyMitigated) {
      ob.status = "MITIGATED";
      ob.strengthScore = Math.max(20, ob.strengthScore - 40);
    } else if (retests > 0) {
      ob.status = "TESTED";
      ob.retestCount = retests;
      ob.strengthScore = Math.max(40, ob.strengthScore - (retests * 10));
    } else {
      ob.status = "FRESH";
    }
  }

  // Filter for unmitigated or fresh actionable zones close to current price
  const validBullish = detectedBlocks
    .filter((ob) => ob.direction === "BULLISH" && ob.status !== "MITIGATED" && ob.highPrice <= currentPrice * 1.04)
    .sort((a, b) => b.highPrice - a.highPrice); // Nearest below current price first

  const validBearish = detectedBlocks
    .filter((ob) => ob.direction === "BEARISH" && ob.status !== "MITIGATED" && ob.lowPrice >= currentPrice * 0.96)
    .sort((a, b) => a.lowPrice - b.lowPrice); // Nearest above current price first

  return {
    orderBlocks: detectedBlocks.slice(-15),
    activeBullishOB: validBullish[0] || null,
    activeBearishOB: validBearish[0] || null,
  };
}

