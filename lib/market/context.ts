import { MarketQuoteData, MarketContextMetrics } from "@/lib/types/market";
import { getMarketSessionStatus } from "./sessions";

export interface ContextScanInput {
  vixQuote?: MarketQuoteData | null;
  spotQuote?: MarketQuoteData | null;
  futureQuote?: MarketQuoteData | null;
  constituentQuotes?: MarketQuoteData[];
  expiryDateStr?: string;
}

/**
 * Market Context & Breadth Engine
 * Computes India VIX regime, Implied Daily Move, Futures Basis, and Breadth.
 * Strictly checks for genuine availability and never hallucinates missing data.
 */
export function evaluateMarketContext(input: ContextScanInput): MarketContextMetrics {
  const { vixQuote, spotQuote, futureQuote, constituentQuotes, expiryDateStr } = input;
  const session = getMarketSessionStatus();

  // 1. India VIX Regime
  let vixLtp: number | null = null;
  let vixChangePct: number | null = null;
  let vixRegime: "LOW" | "NORMAL" | "ELEVATED" | "HIGH" = "NORMAL";
  let impliedDailyMovePct: number | null = null;

  if (vixQuote && vixQuote.last_price > 0) {
    vixLtp = vixQuote.last_price;
    vixChangePct = vixQuote.percentage_change;

    if (vixLtp < 12.0) {
      vixRegime = "LOW";
    } else if (vixLtp <= 18.0) {
      vixRegime = "NORMAL";
    } else if (vixLtp <= 24.0) {
      vixRegime = "ELEVATED";
    } else {
      vixRegime = "HIGH";
    }

    // Rule of 16 (1 year has ~252 trading days or 365 calendar days): Daily Implied Range % = VIX / sqrt(365)
    impliedDailyMovePct = Number((vixLtp / Math.sqrt(365)).toFixed(2));
  }

  // 2. Futures Basis (Futures Price - Spot Price)
  let futuresBasis: number | null = null;
  let futuresBasisType: "PREMIUM" | "DISCOUNT" | "PAR" | "UNAVAILABLE" = "UNAVAILABLE";

  if (spotQuote && spotQuote.last_price > 0 && futureQuote && futureQuote.last_price > 0) {
    futuresBasis = Number((futureQuote.last_price - spotQuote.last_price).toFixed(2));
    if (futuresBasis > 5) {
      futuresBasisType = "PREMIUM";
    } else if (futuresBasis < -5) {
      futuresBasisType = "DISCOUNT";
    } else {
      futuresBasisType = "PAR";
    }
  }

  // 3. Market Breadth across Top Index Constituents
  let breadthRatio: number | null = null;
  let breadthBias: "STRONG_ADVANCE" | "ADVANCE" | "NEUTRAL" | "DECLINE" | "STRONG_DECLINE" = "NEUTRAL";

  if (constituentQuotes && constituentQuotes.length >= 3) {
    let advances = 0;
    let declines = 0;

    for (const q of constituentQuotes) {
      if (q.net_change > 0) advances++;
      else if (q.net_change < 0) declines++;
    }

    const totalActive = advances + declines;
    if (totalActive > 0) {
      breadthRatio = Number((advances / totalActive).toFixed(2));
      if (breadthRatio >= 0.8) breadthBias = "STRONG_ADVANCE";
      else if (breadthRatio >= 0.6) breadthBias = "ADVANCE";
      else if (breadthRatio <= 0.2) breadthBias = "STRONG_DECLINE";
      else if (breadthRatio <= 0.4) breadthBias = "DECLINE";
      else breadthBias = "NEUTRAL";
    }
  }

  // 4. Session Phase
  let sessionPhase: "OPENING_RANGE" | "MID_SESSION" | "CLOSING_HOUR" | "CLOSED" = "CLOSED";
  const nowIst = new Date();
  const istMinutes = nowIst.getUTCHours() * 60 + nowIst.getUTCMinutes() + 330; // convert to IST minutes
  const marketOpenMinutes = 9 * 60 + 15;  // 09:15 IST = 555
  const marketCloseMinutes = 15 * 60 + 30; // 15:30 IST = 930

  if (!session.is_trading_active) {
    sessionPhase = "CLOSED";
  } else if (istMinutes <= marketOpenMinutes + 30) {
    sessionPhase = "OPENING_RANGE"; // 09:15 - 09:45
  } else if (istMinutes >= marketCloseMinutes - 45) {
    sessionPhase = "CLOSING_HOUR";  // 14:45 - 15:30
  } else {
    sessionPhase = "MID_SESSION";
  }

  // 5. Expiry Proximity
  let expiryProximityDays: number | null = null;
  let isZeroDte = false;
  let eventRiskWarning: string | null = null;

  if (expiryDateStr) {
    const expDate = new Date(expiryDateStr);
    const diffMs = expDate.getTime() - nowIst.getTime();
    expiryProximityDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    if (expiryProximityDays === 0) {
      isZeroDte = true;
      eventRiskWarning = "0-DTE Expiry Day: Rapid Theta decay and gamma swings expected.";
    } else if (expiryProximityDays <= 1) {
      eventRiskWarning = "Near-expiry contract: Elevated gamma risk.";
    }
  }

  if (vixRegime === "HIGH") {
    eventRiskWarning = "High Volatility Warning: India VIX > 24 indicates market regime stress.";
  }

  return {
    vixLtp,
    vixChangePct,
    vixRegime,
    impliedDailyMovePct,
    futuresBasis,
    futuresBasisType,
    breadthRatio,
    breadthBias,
    sessionPhase,
    expiryProximityDays,
    isZeroDte,
    eventRiskWarning,
  };
}
