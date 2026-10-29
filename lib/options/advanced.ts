import { OptionChainSummary, OptionChainRow, OptionSideQuote } from "@/lib/types/market";

export interface EnrichedOptionStrike extends OptionChainRow {
  callMoneyness: "ITM" | "ATM" | "OTM";
  putMoneyness: "ITM" | "ATM" | "OTM";
  callBuildup: "LONG_BUILDUP" | "SHORT_BUILDUP" | "SHORT_COVERING" | "LONG_UNWINDING" | "UNCERTAIN";
  putBuildup: "LONG_BUILDUP" | "SHORT_BUILDUP" | "SHORT_COVERING" | "LONG_UNWINDING" | "UNCERTAIN";
  callBidAskSpreadPct: number | null;
  putBidAskSpreadPct: number | null;
  isIlliquid: boolean;
}

export interface AdvancedOptionMetrics {
  underlyingKey: string;
  underlyingSpot: number;
  expiry: string;
  atmStrike: number;
  totalCallOi: number;
  totalPutOi: number;
  overallOiPcr: number;
  overallVolumePcr: number;
  highestCallOiStrike: number;
  highestPutOiStrike: number;
  secondHighestCallOiStrike: number;
  secondHighestPutOiStrike: number;
  maxPainStrike: number;
  atmStraddlePrice: number;
  impliedUpperRange: number;
  impliedLowerRange: number;
  netOiSentiment: "BULLISH_PUT_DOMINANT" | "BEARISH_CALL_DOMINANT" | "NEUTRAL_BALANCED";
  sentimentScore: number; // 0 - 100 bullish scale
  strikes: EnrichedOptionStrike[];
  keySupportZone: { min: number; max: number };
  keyResistanceZone: { min: number; max: number };
  warnings: string[];
}

/**
 * Classifies Option Buildup using Price Change and OI Change
 * Label ambiguous or tiny changes as UNCERTAIN to prevent misinterpretation.
 */
export function classifyOptionBuildup(
  side: OptionSideQuote | undefined
): "LONG_BUILDUP" | "SHORT_BUILDUP" | "SHORT_COVERING" | "LONG_UNWINDING" | "UNCERTAIN" {
  if (!side || side.ltp <= 0 || side.oi <= 0) return "UNCERTAIN";

  const priceChange = side.close_price > 0 ? side.ltp - side.close_price : 0;
  const oiChange = side.change_oi;

  // If OI change is negligible (< 3% of total OI), label as UNCERTAIN
  const oiChangePct = Math.abs(oiChange) / Math.max(1, side.oi);
  if (oiChangePct < 0.03 || Math.abs(priceChange) < 0.05) {
    return "UNCERTAIN";
  }

  if (priceChange > 0 && oiChange > 0) return "LONG_BUILDUP";
  if (priceChange < 0 && oiChange > 0) return "SHORT_BUILDUP";
  if (priceChange > 0 && oiChange < 0) return "SHORT_COVERING";
  if (priceChange < 0 && oiChange < 0) return "LONG_UNWINDING";

  return "UNCERTAIN";
}

/**
 * Advanced Option Chain Processing Engine
 * Analyzes PCR, OI distribution, Max Pain, ATM Straddle, and dynamic support/resistance zones.
 */
export function processAdvancedOptionChain(
  summary: OptionChainSummary | null
): AdvancedOptionMetrics | null {
  if (!summary || !summary.strikes || summary.strikes.length === 0) {
    return null;
  }

  const {
    underlying_key,
    underlying_spot_price: spot,
    expiry,
    atm_strike,
    total_call_oi,
    total_put_oi,
    total_call_volume,
    total_put_volume,
    strikes,
  } = summary;

  const warnings: string[] = [];

  // Calculate PCRs
  const overallOiPcr = total_call_oi > 0 ? Number((total_put_oi / total_call_oi).toFixed(3)) : 0;
  const overallVolumePcr = total_call_volume > 0 ? Number((total_put_volume / total_call_volume).toFixed(3)) : 0;

  // Sort strikes by strike_price ascending
  const sortedStrikes = [...strikes].sort((a, b) => a.strike_price - b.strike_price);

  // Identify Call & Put OI concentration
  const callOiRanked = [...sortedStrikes]
    .map((s) => ({ strike: s.strike_price, oi: s.call?.oi || 0 }))
    .sort((a, b) => b.oi - a.oi);

  const putOiRanked = [...sortedStrikes]
    .map((s) => ({ strike: s.strike_price, oi: s.put?.oi || 0 }))
    .sort((a, b) => b.oi - a.oi);

  const highestCallOiStrike = callOiRanked[0]?.strike || atm_strike;
  const secondHighestCallOiStrike = callOiRanked[1]?.strike || highestCallOiStrike;

  const highestPutOiStrike = putOiRanked[0]?.strike || atm_strike;
  const secondHighestPutOiStrike = putOiRanked[1]?.strike || highestPutOiStrike;

  // Max Pain Calculation (Optimized to active OI strikes)
  let minTotalLoss = Infinity;
  let maxPainStrike = atm_strike;

  const candidateStrikes = sortedStrikes.filter((s) => {
    return Math.abs(s.strike_price - spot) / Math.max(1, spot) < 0.20 || (s.call && s.call.oi > 0) || (s.put && s.put.oi > 0);
  });

  const activeStrikesWithOi = sortedStrikes.filter(
    (s) => (s.call && s.call.oi > 0) || (s.put && s.put.oi > 0)
  );

  for (const s of candidateStrikes) {
    const settlement = s.strike_price;
    let totalLoss = 0;

    for (const other of activeStrikesWithOi) {
      if (other.call && other.call.oi > 0 && settlement > other.strike_price) {
        totalLoss += (settlement - other.strike_price) * other.call.oi;
      }
      if (other.put && other.put.oi > 0 && settlement < other.strike_price) {
        totalLoss += (other.strike_price - settlement) * other.put.oi;
      }
    }

    if (totalLoss < minTotalLoss) {
      minTotalLoss = totalLoss;
      maxPainStrike = settlement;
    }
  }

  // ATM Straddle Calculation
  const atmRow = sortedStrikes.find((s) => s.strike_price === atm_strike) || sortedStrikes[Math.floor(sortedStrikes.length / 2)];
  const callLtp = atmRow?.call?.ltp || 0;
  const putLtp = atmRow?.put?.ltp || 0;
  const atmStraddlePrice = Number((callLtp + putLtp).toFixed(2));
  const impliedUpperRange = Number((spot + atmStraddlePrice).toFixed(2));
  const impliedLowerRange = Number((spot - atmStraddlePrice).toFixed(2));

  // Determine Net Sentiment from PCR and OI concentration
  let netOiSentiment: "BULLISH_PUT_DOMINANT" | "BEARISH_CALL_DOMINANT" | "NEUTRAL_BALANCED" = "NEUTRAL_BALANCED";
  let sentimentScore = 50; // default neutral 50/100

  if (overallOiPcr > 1.25) {
    netOiSentiment = "BULLISH_PUT_DOMINANT";
    sentimentScore = Math.min(95, Math.round(50 + (overallOiPcr - 1.0) * 35));
  } else if (overallOiPcr < 0.80) {
    netOiSentiment = "BEARISH_CALL_DOMINANT";
    sentimentScore = Math.max(5, Math.round(50 - (1.0 - overallOiPcr) * 45));
  } else {
    sentimentScore = Math.round(45 + (overallOiPcr - 0.8) * 25);
  }

  // Enrich strikes with moneyness, buildup and liquidity spread
  const enrichedStrikes: EnrichedOptionStrike[] = sortedStrikes.map((s) => {
    const isAtm = s.strike_price === atm_strike;
    const callMoneyness: "ITM" | "ATM" | "OTM" = isAtm
      ? "ATM"
      : s.strike_price < spot
      ? "ITM"
      : "OTM";
    const putMoneyness: "ITM" | "ATM" | "OTM" = isAtm
      ? "ATM"
      : s.strike_price > spot
      ? "ITM"
      : "OTM";

    const callBuildup = classifyOptionBuildup(s.call);
    const putBuildup = classifyOptionBuildup(s.put);

    let callBidAskSpreadPct: number | null = null;
    if (s.call && s.call.ask_price > 0 && s.call.bid_price > 0) {
      callBidAskSpreadPct = Number((((s.call.ask_price - s.call.bid_price) / s.call.ask_price) * 100).toFixed(1));
    }

    let putBidAskSpreadPct: number | null = null;
    if (s.put && s.put.ask_price > 0 && s.put.bid_price > 0) {
      putBidAskSpreadPct = Number((((s.put.ask_price - s.put.bid_price) / s.put.ask_price) * 100).toFixed(1));
    }

    const isIlliquid = (s.call?.volume || 0) < 50 && (s.put?.volume || 0) < 50;

    return {
      ...s,
      callMoneyness,
      putMoneyness,
      callBuildup,
      putBuildup,
      callBidAskSpreadPct,
      putBidAskSpreadPct,
      isIlliquid,
    };
  });

  if (atmStraddlePrice === 0) {
    warnings.push("ATM Option LTPs unavailable or zero; implied move cannot be calculated.");
  }
  if (total_call_oi === 0 && total_put_oi === 0) {
    warnings.push("Option Open Interest not yet updated or session snapshot is fresh.");
  }

  const keySupportZone = {
    min: Math.min(highestPutOiStrike, secondHighestPutOiStrike),
    max: Math.max(highestPutOiStrike, secondHighestPutOiStrike),
  };

  const keyResistanceZone = {
    min: Math.min(highestCallOiStrike, secondHighestCallOiStrike),
    max: Math.max(highestCallOiStrike, secondHighestCallOiStrike),
  };

  return {
    underlyingKey: underlying_key,
    underlyingSpot: spot,
    expiry,
    atmStrike: atm_strike,
    totalCallOi: total_call_oi,
    totalPutOi: total_put_oi,
    overallOiPcr,
    overallVolumePcr,
    highestCallOiStrike,
    highestPutOiStrike,
    secondHighestCallOiStrike,
    secondHighestPutOiStrike,
    maxPainStrike,
    atmStraddlePrice,
    impliedUpperRange,
    impliedLowerRange,
    netOiSentiment,
    sentimentScore,
    strikes: enrichedStrikes,
    keySupportZone,
    keyResistanceZone,
    warnings,
  };
}
