import { LargeOrderEvent } from "./types";
import { StockMasterItem } from "@/lib/stocks/stockMaster";

/**
 * Large Order Activity & Institutional Block Flow Scanner
 * Identifies abnormal traded turnover, volume acceleration, delivery surges,
 * and order pressure imbalance without speculative claims.
 */
export function evaluateLargeOrderActivity(params: {
  stock: StockMasterItem;
  ltp: number;
  changePct: number;
  volume: number;
  avgVolume20: number;
  deliveryPct: number;
  bidAskImbalance?: number; // ratio of bid/ask volume if available
}): {
  largeOrderScore: number;
  event: LargeOrderEvent | null;
  rvol: number;
  pressure: LargeOrderEvent["pressure"];
} {
  const { stock, ltp, changePct, volume, avgVolume20, deliveryPct } = params;

  // 1. Calculate Relative Volume (RVOL)
  const rvol = Number((volume / (avgVolume20 || 1)).toFixed(2));

  // 2. Approximate Traded Value in Crores (Volume * LTP / 10,000,000)
  const tradedValueCr = Number(((volume * ltp) / 10000000).toFixed(2));

  // 3. Compute Large Order Activity Score (0 - 100)
  let score = 20;

  // RVOL contribution (up to 35 pts)
  if (rvol >= 4.0) score += 35;
  else if (rvol >= 2.5) score += 25;
  else if (rvol >= 1.5) score += 15;
  else if (rvol >= 1.0) score += 5;

  // Turnover size contribution (up to 25 pts)
  if (tradedValueCr >= 250) score += 25;
  else if (tradedValueCr >= 100) score += 20;
  else if (tradedValueCr >= 30) score += 12;
  else if (tradedValueCr >= 10) score += 5;

  // Delivery percentage contribution (up to 20 pts)
  if (deliveryPct >= 65) score += 20;
  else if (deliveryPct >= 50) score += 12;
  else if (deliveryPct >= 40) score += 6;

  // Price directional confirmation with volume (up to 20 pts)
  if (Math.abs(changePct) >= 2.5 && rvol >= 1.5) score += 20;
  else if (Math.abs(changePct) >= 1.2 && rvol >= 1.2) score += 10;

  score = Math.min(100, Math.round(score));

  // Determine buying or selling pressure
  let pressure: LargeOrderEvent["pressure"] = "NEUTRAL";
  if (changePct > 0.8 && rvol >= 1.4) {
    pressure = rvol >= 2.5 ? "HEAVY_BUYING" : "MODERATE_BUYING";
  } else if (changePct < -0.8 && rvol >= 1.4) {
    pressure = rvol >= 2.5 ? "HEAVY_SELLING" : "MODERATE_SELLING";
  }

  // Generate event if activity exceeds threshold
  let event: LargeOrderEvent | null = null;
  const isSignificant = score >= 65 || rvol >= 2.0 || tradedValueCr >= 50;

  if (isSignificant) {
    const now = new Date();
    const timeIst = now.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    event = {
      id: `LO_${stock.symbol}_${Date.now()}`,
      symbol: stock.symbol,
      companyName: stock.companyName,
      exchange: stock.exchange === "BSE" ? "BSE" : "NSE",
      ltp,
      changePct,
      volume,
      rvol,
      deliveryPct,
      largeOrderScore: score,
      pressure,
      orderValueCrores: tradedValueCr,
      timestamp: Date.now(),
      timeIst,
      isConfirmedBlock: tradedValueCr >= 25 && deliveryPct >= 55,
    };
  }

  return {
    largeOrderScore: score,
    event,
    rvol,
    pressure,
  };
}

