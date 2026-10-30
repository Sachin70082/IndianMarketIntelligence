import { CandleDataPoint } from "@/lib/types/market";
import { LiquidityLevel, LiquidityType, LiquidityState } from "./types";

/**
 * Liquidity Detection & Stop-Hunt Trap Engine
 * Analyzes Buy-Side Liquidity (BSL), Sell-Side Liquidity (SSL),
 * Equal Highs (EQH), Equal Lows (EQL), and Liquidity Sweeps with Reversal Traps.
 */
export function detectLiquidityPools(
  candles: CandleDataPoint[],
  symbol: string
): {
  liquidityLevels: LiquidityLevel[];
  nearestPool: LiquidityLevel | null;
  activeTrapScore: number;
} {
  if (!candles || candles.length < 15) {
    return { liquidityLevels: [], nearestPool: null, activeTrapScore: 0 };
  }

  const n = candles.length;
  const currentPrice = candles[n - 1].close;
  const levels: LiquidityLevel[] = [];

  // 1. Detect Swing Highs and Swing Lows
  const swingHighs: { price: number; time: number; idx: number }[] = [];
  const swingLows: { price: number; time: number; idx: number }[] = [];

  for (let i = 2; i < n - 2; i++) {
    const c = candles[i];
    if (
      c.high > candles[i - 1].high &&
      c.high > candles[i - 2].high &&
      c.high >= candles[i + 1].high &&
      c.high >= candles[i + 2].high
    ) {
      swingHighs.push({ price: c.high, time: c.time, idx: i });
    }
    if (
      c.low < candles[i - 1].low &&
      c.low < candles[i - 2].low &&
      c.low <= candles[i + 1].low &&
      c.low <= candles[i + 2].low
    ) {
      swingLows.push({ price: c.low, time: c.time, idx: i });
    }
  }

  // 2. Detect Equal Highs (EQH - Buy-Side Liquidity BSL Pool)
  for (let i = 0; i < swingHighs.length - 1; i++) {
    for (let j = i + 1; j < swingHighs.length; j++) {
      const sh1 = swingHighs[i];
      const sh2 = swingHighs[j];
      const diffPct = Math.abs(sh1.price - sh2.price) / sh1.price;

      if (diffPct <= 0.0018 && sh2.idx - sh1.idx >= 4) {
        // Equal High detected
        const levelPrice = Math.max(sh1.price, sh2.price);
        levels.push({
          id: `EQH_${symbol}_${sh2.time}`,
          symbol,
          type: "EQH",
          priceLevel: levelPrice,
          state: "UNTESTED",
          trapScore: 82,
          description: `Equal Highs (BSL) clustered at ₹${levelPrice.toFixed(2)} - Prime retail stop-loss pool`,
        });
      }
    }
  }

  // 3. Detect Equal Lows (EQL - Sell-Side Liquidity SSL Pool)
  for (let i = 0; i < swingLows.length - 1; i++) {
    for (let j = i + 1; j < swingLows.length; j++) {
      const sl1 = swingLows[i];
      const sl2 = swingLows[j];
      const diffPct = Math.abs(sl1.price - sl2.price) / sl1.price;

      if (diffPct <= 0.0018 && sl2.idx - sl1.idx >= 4) {
        const levelPrice = Math.min(sl1.price, sl2.price);
        levels.push({
          id: `EQL_${symbol}_${sl2.time}`,
          symbol,
          type: "EQL",
          priceLevel: levelPrice,
          state: "UNTESTED",
          trapScore: 82,
          description: `Equal Lows (SSL) clustered at ₹${levelPrice.toFixed(2)} - Retail stop-loss resting liquidity`,
        });
      }
    }
  }

  // 4. Identify Previous Day High/Low (PDH / PDL)
  const dayGroups: Record<string, CandleDataPoint[]> = {};
  for (const c of candles) {
    const tsMs = c.time > 1e11 ? c.time : c.time * 1000;
    const dayKey = new Date(tsMs).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
    if (!dayGroups[dayKey]) dayGroups[dayKey] = [];
    dayGroups[dayKey].push(c);
  }
  const dayKeys = Object.keys(dayGroups);
  if (dayKeys.length >= 2) {
    const prevDay = dayGroups[dayKeys[dayKeys.length - 2]];
    const pdh = Math.max(...prevDay.map((c) => c.high));
    const pdl = Math.min(...prevDay.map((c) => c.low));

    levels.push({
      id: `PDH_${symbol}`,
      symbol,
      type: "PDH",
      priceLevel: pdh,
      state: "UNTESTED",
      trapScore: 78,
      description: `Previous Day High (PDH) at ₹${pdh.toFixed(2)} - Major BSL Target`,
    });
    levels.push({
      id: `PDL_${symbol}`,
      symbol,
      type: "PDL",
      priceLevel: pdl,
      state: "UNTESTED",
      trapScore: 78,
      description: `Previous Day Low (PDL) at ₹${pdl.toFixed(2)} - Major SSL Target`,
    });
  }

  // 5. Evaluate Sweep Status & Liquidity Trap Reversals on recent candles
  let highestTrapScore = 30;

  for (const lvl of levels) {
    const isAbove = lvl.priceLevel > currentPrice;
    const distPct = Math.abs(currentPrice - lvl.priceLevel) / currentPrice;

    // Check if any of the recent 5 candles swept the level
    for (let i = Math.max(0, n - 6); i < n; i++) {
      const c = candles[i];

      // Bullish Trap / Sweep of Lows: Price pierced low, but closed back above with long lower wick
      if (lvl.type === "SSL" || lvl.type === "EQL" || lvl.type === "PDL") {
        if (c.low < lvl.priceLevel && c.close > lvl.priceLevel) {
          lvl.state = "REJECTED_TRAP";
          lvl.trapScore = 94;
          lvl.sweepCandleTime = c.time;
          highestTrapScore = Math.max(highestTrapScore, 94);
          lvl.description = `⚠️ Liquidity Grab! Price pierced SSL ₹${lvl.priceLevel.toFixed(2)} and rejected back inside (Bullish Trap)`;
          break;
        } else if (c.low < lvl.priceLevel) {
          lvl.state = "SWEEPING";
          lvl.trapScore = 85;
          highestTrapScore = Math.max(highestTrapScore, 85);
          break;
        }
      }

      // Bearish Trap / Sweep of Highs: Price pierced high, but closed back below with long upper wick
      if (lvl.type === "BSL" || lvl.type === "EQH" || lvl.type === "PDH") {
        if (c.high > lvl.priceLevel && c.close < lvl.priceLevel) {
          lvl.state = "REJECTED_TRAP";
          lvl.trapScore = 94;
          lvl.sweepCandleTime = c.time;
          highestTrapScore = Math.max(highestTrapScore, 94);
          lvl.description = `⚠️ False Breakout! Price swept BSL ₹${lvl.priceLevel.toFixed(2)} and rejected back inside (Bearish Trap)`;
          break;
        } else if (c.high > lvl.priceLevel) {
          lvl.state = "SWEEPING";
          lvl.trapScore = 85;
          highestTrapScore = Math.max(highestTrapScore, 85);
          break;
        }
      }
    }

    if (lvl.state === "UNTESTED" && distPct <= 0.008) {
      lvl.state = "APPROACHING";
      lvl.trapScore = Math.max(lvl.trapScore, 75);
      highestTrapScore = Math.max(highestTrapScore, 75);
    }
  }

  // Find nearest active liquidity pool
  const nearest = levels
    .slice()
    .sort((a, b) => Math.abs(currentPrice - a.priceLevel) - Math.abs(currentPrice - b.priceLevel))[0] || null;

  return {
    liquidityLevels: levels.slice(-12),
    nearestPool: nearest,
    activeTrapScore: highestTrapScore,
  };
}

