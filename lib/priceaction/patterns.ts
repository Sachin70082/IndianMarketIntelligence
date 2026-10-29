import { CandleDataPoint, DetectedCandlePattern, CandlePatternType } from "@/lib/types/market";

export interface PatternScanOptions {
  currentVwap?: number | null;
  supportLevel?: number | null;
  resistanceLevel?: number | null;
  recentAtr?: number | null;
}

/**
 * Advanced Price-Action Candle Pattern Engine
 * Strictly chronological analysis. Rejects lookahead bias.
 * Prioritizes pattern location, rejection wicks, and confirmation requirements over pattern names alone.
 */
export function detectCandlePatterns(
  candles: CandleDataPoint[],
  options: PatternScanOptions = {}
): DetectedCandlePattern[] {
  if (!candles || candles.length < 3) {
    return [];
  }

  const patterns: DetectedCandlePattern[] = [];
  const len = candles.length;
  const { currentVwap, supportLevel, resistanceLevel, recentAtr } = options;

  // We scan the most recent 10 completed/active candles for actionable patterns
  const startIndex = Math.max(2, len - 10);

  for (let i = startIndex; i < len; i++) {
    const c0 = candles[i];     // current candle
    const c1 = candles[i - 1]; // 1 candle ago
    const c2 = candles[i - 2]; // 2 candles ago

    const range0 = c0.high - c0.low;
    if (range0 <= 0) continue;

    const body0 = Math.abs(c0.close - c0.open);
    const upperWick0 = c0.high - Math.max(c0.open, c0.close);
    const lowerWick0 = Math.min(c0.open, c0.close) - c0.low;
    const isBull0 = c0.close > c0.open;
    const isBear0 = c0.close < c0.open;

    const range1 = c1.high - c1.low;
    const body1 = Math.abs(c1.close - c1.open);

    // Determine location context
    let location: "AT_SUPPORT" | "AT_RESISTANCE" | "AT_VWAP" | "IN_TREND" | "CONGESTION" = "IN_TREND";
    const atrBuffer = recentAtr ? recentAtr * 0.75 : range0 * 0.5;

    if (supportLevel && Math.abs(c0.low - supportLevel) <= atrBuffer) {
      location = "AT_SUPPORT";
    } else if (resistanceLevel && Math.abs(c0.high - resistanceLevel) <= atrBuffer) {
      location = "AT_RESISTANCE";
    } else if (currentVwap && Math.abs(c0.close - currentVwap) <= atrBuffer) {
      location = "AT_VWAP";
    }

    // 1. HAMMER / BULLISH PIN BAR (Long lower wick >= 2x body, tiny upper wick)
    if (lowerWick0 >= 2 * body0 && upperWick0 <= range0 * 0.15 && body0 > 0) {
      const isHammer = location === "AT_SUPPORT" || location === "AT_VWAP";
      const patType: CandlePatternType = isHammer ? "HAMMER" : "PIN_BAR_BULL";
      const qScore = Math.min(100, Math.round(
        (lowerWick0 / range0) * 50 + (location === "AT_SUPPORT" ? 35 : location === "AT_VWAP" ? 25 : 10) + (isBull0 ? 15 : 5)
      ));

      patterns.push({
        id: `pat_${patType}_${c0.time}`,
        pattern: patType,
        direction: "BULLISH",
        candleTime: c0.time,
        candleDate: c0.date,
        location,
        confirmationRequirement: `Next candle must close above hammer high ₹${c0.high.toFixed(2)} with expanding volume`,
        invalidationPrice: Number((c0.low - 0.05).toFixed(2)),
        qualityScore: qScore,
        description: `Bullish ${patType.replace("_", " ")} showing sharp demand rejection wick of ${(lowerWick0 / range0 * 100).toFixed(0)}% at ${location.replace("_", " ")}.`,
      });
      continue;
    }

    // 2. SHOOTING STAR / BEARISH PIN BAR (Long upper wick >= 2x body, tiny lower wick)
    if (upperWick0 >= 2 * body0 && lowerWick0 <= range0 * 0.15 && body0 > 0) {
      const isShootingStar = location === "AT_RESISTANCE" || location === "AT_VWAP";
      const patType: CandlePatternType = isShootingStar ? "SHOOTING_STAR" : "PIN_BAR_BEAR";
      const qScore = Math.min(100, Math.round(
        (upperWick0 / range0) * 50 + (location === "AT_RESISTANCE" ? 35 : location === "AT_VWAP" ? 25 : 10) + (isBear0 ? 15 : 5)
      ));

      patterns.push({
        id: `pat_${patType}_${c0.time}`,
        pattern: patType,
        direction: "BEARISH",
        candleTime: c0.time,
        candleDate: c0.date,
        location,
        confirmationRequirement: `Next candle must close below shooting star low ₹${c0.low.toFixed(2)} with expanding volume`,
        invalidationPrice: Number((c0.high + 0.05).toFixed(2)),
        qualityScore: qScore,
        description: `Bearish ${patType.replace("_", " ")} showing supply rejection wick of ${(upperWick0 / range0 * 100).toFixed(0)}% at ${location.replace("_", " ")}.`,
      });
      continue;
    }

    // 3. BULLISH ENGULFING (Bearish previous candle fully swallowed by large bullish candle)
    if (
      c1.close < c1.open && // prev was bearish
      c0.close > c0.open && // curr is bullish
      c0.open <= c1.close && // opens at or below prev close
      c0.close > c1.open &&  // closes above prev open
      body0 > body1 * 1.1    // larger body
    ) {
      const qScore = Math.min(100, Math.round(
        (body0 / range0) * 45 + (location === "AT_SUPPORT" ? 35 : 15) + (c0.volume > c1.volume ? 20 : 0)
      ));

      patterns.push({
        id: `pat_BULL_ENGULF_${c0.time}`,
        pattern: "BULLISH_ENGULFING",
        direction: "BULLISH",
        candleTime: c0.time,
        candleDate: c0.date,
        location,
        confirmationRequirement: `Follow-through tick or close above ₹${c0.close.toFixed(2)}`,
        invalidationPrice: Number((Math.min(c0.low, c1.low) - 0.05).toFixed(2)),
        qualityScore: qScore,
        description: `Bullish Engulfing pattern completely engulfing previous seller candle body at ${location.replace("_", " ")}.`,
      });
      continue;
    }

    // 4. BEARISH ENGULFING (Bullish previous candle fully swallowed by large bearish candle)
    if (
      c1.close > c1.open && // prev was bullish
      c0.close < c0.open && // curr is bearish
      c0.open >= c1.close && // opens at or above prev close
      c0.close < c1.open &&  // closes below prev open
      body0 > body1 * 1.1    // larger body
    ) {
      const qScore = Math.min(100, Math.round(
        (body0 / range0) * 45 + (location === "AT_RESISTANCE" ? 35 : 15) + (c0.volume > c1.volume ? 20 : 0)
      ));

      patterns.push({
        id: `pat_BEAR_ENGULF_${c0.time}`,
        pattern: "BEARISH_ENGULFING",
        direction: "BEARISH",
        candleTime: c0.time,
        candleDate: c0.date,
        location,
        confirmationRequirement: `Follow-through tick or close below ₹${c0.close.toFixed(2)}`,
        invalidationPrice: Number((Math.max(c0.high, c1.high) + 0.05).toFixed(2)),
        qualityScore: qScore,
        description: `Bearish Engulfing pattern overwhelming buyers at ${location.replace("_", " ")}.`,
      });
      continue;
    }

    // 5. INSIDE BAR (Volatility contraction: current candle entirely inside previous candle's range)
    if (c0.high <= c1.high && c0.low >= c1.low) {
      const qScore = Math.min(100, Math.round(50 + (c1.volume > c0.volume ? 25 : 10)));
      patterns.push({
        id: `pat_INSIDE_BAR_${c0.time}`,
        pattern: "INSIDE_BAR",
        direction: "NEUTRAL",
        candleTime: c0.time,
        candleDate: c0.date,
        location,
        confirmationRequirement: `Breakout beyond mother candle bounds: Long above ₹${c1.high.toFixed(2)} or Short below ₹${c1.low.toFixed(2)}`,
        invalidationPrice: c1.low,
        qualityScore: qScore,
        description: `Inside Bar contraction pattern indicating energy buildup before directional expansion.`,
      });
      continue;
    }

    // 6. MORNING STAR (3-Candle Reversal: Bearish -> Small star/doji gap -> Strong Bullish)
    if (
      c2.close < c2.open && Math.abs(c2.close - c2.open) > (c2.high - c2.low) * 0.5 && // strong red
      Math.abs(c1.close - c1.open) <= (c1.high - c1.low) * 0.35 &&                     // small star body
      c0.close > c0.open && c0.close > (c2.open + c2.close) / 2                         // strong green > 50% midpoint
    ) {
      patterns.push({
        id: `pat_MORNING_STAR_${c0.time}`,
        pattern: "MORNING_STAR",
        direction: "BULLISH",
        candleTime: c0.time,
        candleDate: c0.date,
        location,
        confirmationRequirement: `Close above ₹${c2.open.toFixed(2)}`,
        invalidationPrice: Number((Math.min(c0.low, c1.low, c2.low) - 0.05).toFixed(2)),
        qualityScore: 85,
        description: `Morning Star 3-candle bottom reversal structure with high historical reliability.`,
      });
      continue;
    }

    // 7. EVENING STAR (3-Candle Reversal: Bullish -> Small star/doji gap -> Strong Bearish)
    if (
      c2.close > c2.open && Math.abs(c2.close - c2.open) > (c2.high - c2.low) * 0.5 && // strong green
      Math.abs(c1.close - c1.open) <= (c1.high - c1.low) * 0.35 &&                     // small star body
      c0.close < c0.open && c0.close < (c2.open + c2.close) / 2                         // strong red < 50% midpoint
    ) {
      patterns.push({
        id: `pat_EVENING_STAR_${c0.time}`,
        pattern: "EVENING_STAR",
        direction: "BEARISH",
        candleTime: c0.time,
        candleDate: c0.date,
        location,
        confirmationRequirement: `Close below ₹${c2.open.toFixed(2)}`,
        invalidationPrice: Number((Math.max(c0.high, c1.high, c2.high) + 0.05).toFixed(2)),
        qualityScore: 85,
        description: `Evening Star 3-candle top reversal structure signaling exhausted buying power.`,
      });
      continue;
    }

    // 8. BULLISH MARUBOZU (Strong body >= 85% of total candle range, expansion)
    if (isBull0 && body0 / range0 >= 0.85 && body0 > (recentAtr || range0) * 0.8) {
      patterns.push({
        id: `pat_MARUBOZU_BULL_${c0.time}`,
        pattern: "MARUBOZU_BULL",
        direction: "BULLISH",
        candleTime: c0.time,
        candleDate: c0.date,
        location,
        confirmationRequirement: `Sustain above candle midpoint ₹${((c0.open + c0.close) / 2).toFixed(2)}`,
        invalidationPrice: Number((c0.open - 0.05).toFixed(2)),
        qualityScore: 78,
        description: `Bullish Marubozu momentum expansion bar demonstrating decisive institutional accumulation.`,
      });
      continue;
    }

    // 9. BEARISH MARUBOZU (Strong body >= 85% of total candle range, distribution)
    if (isBear0 && body0 / range0 >= 0.85 && body0 > (recentAtr || range0) * 0.8) {
      patterns.push({
        id: `pat_MARUBOZU_BEAR_${c0.time}`,
        pattern: "MARUBOZU_BEAR",
        direction: "BEARISH",
        candleTime: c0.time,
        candleDate: c0.date,
        location,
        confirmationRequirement: `Sustain below candle midpoint ₹${((c0.open + c0.close) / 2).toFixed(2)}`,
        invalidationPrice: Number((c0.open + 0.05).toFixed(2)),
        qualityScore: 78,
        description: `Bearish Marubozu distribution bar showing aggressive selling pressure.`,
      });
      continue;
    }

    // 10. DOJI (Indecision: body <= 10% of total range)
    if (body0 / range0 <= 0.10 && range0 > 0) {
      patterns.push({
        id: `pat_DOJI_${c0.time}`,
        pattern: "DOJI",
        direction: "NEUTRAL",
        candleTime: c0.time,
        candleDate: c0.date,
        location,
        confirmationRequirement: `Requires breakout candle closing beyond range ₹${c0.low.toFixed(2)} - ₹${c0.high.toFixed(2)}`,
        invalidationPrice: c0.low,
        qualityScore: 50,
        description: `Doji indecision candle reflecting equilibrium between buyers and sellers.`,
      });
    }
  }

  return patterns;
}
