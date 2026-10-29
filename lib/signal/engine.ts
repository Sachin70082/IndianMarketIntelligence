import { 
  CandleDataPoint, 
  MarketQuoteData,
  ComprehensiveSignal, 
  SignalFactorBreakdown,
  SignalConfirmationState,
  MarketFreshness 
} from "@/lib/types/market";
import { DEFAULT_FACTOR_WEIGHTS } from "@/lib/upstox/constants";
import { detectCandlePatterns } from "@/lib/priceaction/patterns";
import { analyzeMarketStructure } from "@/lib/priceaction/structure";
import { processAdvancedOptionChain, AdvancedOptionMetrics } from "@/lib/options/advanced";
import { evaluateMarketContext } from "@/lib/market/context";
import { calculateEMA } from "@/lib/indicators/ema";
import { calculateRSI } from "@/lib/indicators/rsi";
import { calculateMACD } from "@/lib/indicators/macd";
import { calculateATR } from "@/lib/indicators/atr";
import { calculateVWAP, calculateVWAPSlope } from "@/lib/indicators/vwap";
import { calculateRVol } from "@/lib/indicators/rvol";
import { formatISTDateTime } from "@/lib/market/sessions";

export interface SignalEngineInput {
  instrumentKey: string;
  symbol: string;
  candles: CandleDataPoint[];
  quote: MarketQuoteData | null;
  advancedOptions?: AdvancedOptionMetrics | null;
  vixQuote?: MarketQuoteData | null;
  constituentQuotes?: MarketQuoteData[];
  weights?: typeof DEFAULT_FACTOR_WEIGHTS;
}

/**
 * Advanced Multi-Factor Trading Signal & Strength Engine
 * Combines Price Action (25%), Option Chain (25%), Multi-Timeframe Trend (15%),
 * Volume Breakout (15%), Market Context (10%), and Momentum/Volatility (10%).
 * Strictly explainable. Never fabricates probabilities.
 */
export function generateComprehensiveSignal(input: SignalEngineInput): ComprehensiveSignal {
  const {
    instrumentKey,
    symbol,
    candles,
    quote,
    advancedOptions,
    vixQuote,
    constituentQuotes,
    weights = DEFAULT_FACTOR_WEIGHTS,
  } = input;

  const supportingReasons: string[] = [];
  const contradictingReasons: string[] = [];
  const nowIst = formatISTDateTime(new Date());

  // 0. Data Sufficiency Check
  if (!candles || candles.length < 25) {
    return {
      state: "DATA_UNAVAILABLE",
      bullishScore: 0,
      bearishScore: 0,
      netBias: "NEUTRAL",
      signalStrength: 0,
      contradictionIndex: 0,
      confirmationStatus: "Insufficient historical candle history (minimum 25 bars required)",
      dataQualityGrade: "F",
      factors: {
        priceActionScore: 0,
        optionChainScore: 0,
        multiTimeframeScore: 0,
        volumeBreakoutScore: 0,
        marketContextScore: 0,
        momentumVolatilityScore: 0,
      },
      supportingReasons: [],
      contradictingReasons: ["Insufficient candle lookback to compute EMA 21, RSI 14, or Market Structure"],
      calculatedAtIst: nowIst,
      instrumentKey,
      symbol,
    };
  }

  // Determine Data Quality Grade
  let dataQualityGrade: "A" | "B" | "C" | "F" = "A";
  if (quote?.is_stale || quote?.freshness === "STALE") {
    dataQualityGrade = "C";
  } else if (!quote || quote.freshness === "UNKNOWN" || quote.freshness === "DISCONNECTED") {
    dataQualityGrade = "F";
  }

  const closePrices = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const lastClose = closePrices[closePrices.length - 1];
  const lastCandle = candles[candles.length - 1];

  // 1. Core Technical Indicators
  const ema9 = calculateEMA(closePrices, 9);
  const ema21 = calculateEMA(closePrices, 21);
  const ema50 = calculateEMA(closePrices, 50);
  const ema200 = calculateEMA(closePrices, 200);

  const lastEma9 = ema9[ema9.length - 1];
  const lastEma21 = ema21[ema21.length - 1];
  const lastEma50 = ema50[ema50.length - 1];
  const lastEma200 = ema200[ema200.length - 1];

  const rsi = calculateRSI(closePrices, 14);
  const lastRsi = rsi[rsi.length - 1];

  const macd = calculateMACD(closePrices, 12, 26, 9);
  const lastMacdHist = macd.histogram[macd.histogram.length - 1];
  const prevMacdHist = macd.histogram[macd.histogram.length - 2];

  const atr = calculateATR(candles, 14);
  const lastAtr = atr[atr.length - 1];

  const vwapRes = calculateVWAP(candles);
  const lastVwap = vwapRes.values[vwapRes.values.length - 1];
  const vwapSlope = calculateVWAPSlope(vwapRes.values, 5);

  const rvol = calculateRVol(volumes, 20);
  const lastRvol = rvol[rvol.length - 1] ?? 1.0;

  // 2. Price Action & Market Structure
  const structure = analyzeMarketStructure(candles);
  const patterns = detectCandlePatterns(candles, {
    currentVwap: lastVwap,
    supportLevel: structure.swingLow,
    resistanceLevel: structure.swingHigh,
    recentAtr: lastAtr,
  });

  // 3. Market Context
  const context = evaluateMarketContext({
    vixQuote,
    spotQuote: quote,
    constituentQuotes,
  });

  // ----------------------------------------------------
  // FACTOR 1: Price Action & Candle Structure (25%)
  // ----------------------------------------------------
  let factor1Bull = 50;
  let factor1Bear = 50;

  if (structure.trend === "UPTREND") {
    factor1Bull += 25;
    factor1Bear -= 15;
    supportingReasons.push("Market structure printing confirmed Higher Highs & Higher Lows");
  } else if (structure.trend === "DOWNTREND") {
    factor1Bear += 25;
    factor1Bull -= 15;
    contradictingReasons.push("Market structure in confirmed Downtrend with Lower Lows & Lower Highs");
  }

  // Check recent patterns
  const latestPattern = patterns[patterns.length - 1];
  if (latestPattern) {
    if (latestPattern.direction === "BULLISH") {
      factor1Bull += 20;
      supportingReasons.push(`Bullish ${latestPattern.pattern.replace("_", " ")} detected at ${latestPattern.location}`);
    } else if (latestPattern.direction === "BEARISH") {
      factor1Bear += 20;
      contradictingReasons.push(`Bearish ${latestPattern.pattern.replace("_", " ")} detected at ${latestPattern.location}`);
    }
  }

  // Previous Day Breakout / Retest
  if (structure.pdh && lastClose > structure.pdh) {
    factor1Bull += 15;
    supportingReasons.push(`Price trading above Previous Day High (₹${structure.pdh.toFixed(2)})`);
  } else if (structure.pdl && lastClose < structure.pdl) {
    factor1Bear += 15;
    contradictingReasons.push(`Price trading below Previous Day Low (₹${structure.pdl.toFixed(2)})`);
  }

  // Opening Range Breakout (ORB)
  if (structure.orb15High && lastClose > structure.orb15High) {
    factor1Bull += 10;
    supportingReasons.push(`15-minute Opening Range Breakout to the upside (₹${structure.orb15High.toFixed(2)})`);
  } else if (structure.orb15Low && lastClose < structure.orb15Low) {
    factor1Bear += 10;
    contradictingReasons.push(`15-minute Opening Range Breakdown to the downside (₹${structure.orb15Low.toFixed(2)})`);
  }

  const factor1Score = Math.max(0, Math.min(100, factor1Bull));

  // ----------------------------------------------------
  // FACTOR 2: Option Chain Positioning & Changes (25%)
  // ----------------------------------------------------
  let factor2Bull = 50;
  let factor2Bear = 50;

  if (advancedOptions) {
    // PCR evaluation
    if (advancedOptions.overallOiPcr > 1.25) {
      factor2Bull += 25;
      supportingReasons.push(`Strong Put-Call Ratio of ${advancedOptions.overallOiPcr} indicates heavy put writing support`);
    } else if (advancedOptions.overallOiPcr < 0.80) {
      factor2Bear += 25;
      contradictingReasons.push(`Low Put-Call Ratio of ${advancedOptions.overallOiPcr} indicates call writing dominance`);
    }

    // Spot vs Max Pain
    if (lastClose > advancedOptions.maxPainStrike) {
      factor2Bull += 10;
    } else if (lastClose < advancedOptions.maxPainStrike) {
      factor2Bear += 10;
    }

    // Strike Concentration S/R
    if (lastClose > advancedOptions.highestCallOiStrike) {
      factor2Bull += 20;
      supportingReasons.push(`Price breached highest call OI strike ₹${advancedOptions.highestCallOiStrike} (Short covering trigger)`);
    } else if (lastClose < advancedOptions.highestPutOiStrike) {
      factor2Bear += 20;
      contradictingReasons.push(`Price breached highest put OI strike ₹${advancedOptions.highestPutOiStrike} (Long unwinding pressure)`);
    }
  } else {
    // If option chain is not applicable (e.g. non-F&O cash stock), keep neutral
    factor2Bull = 50;
    factor2Bear = 50;
  }

  const factor2Score = Math.max(0, Math.min(100, factor2Bull));

  // ----------------------------------------------------
  // FACTOR 3: Multi-Timeframe Trend (15%)
  // ----------------------------------------------------
  let factor3Bull = 50;
  let factor3Bear = 50;

  // EMA Stack (EMA 9 > EMA 21 > EMA 50)
  if (lastEma9 && lastEma21 && lastEma50) {
    if (lastEma9 > lastEma21 && lastEma21 > lastEma50) {
      factor3Bull += 30;
      supportingReasons.push("Bullish EMA Stack alignment: EMA 9 > EMA 21 > EMA 50");
    } else if (lastEma9 < lastEma21 && lastEma21 < lastEma50) {
      factor3Bear += 30;
      contradictingReasons.push("Bearish EMA Stack alignment: EMA 9 < EMA 21 < EMA 50");
    }
  }

  // 200 EMA Macro Regime
  if (lastEma200) {
    if (lastClose > lastEma200) {
      factor3Bull += 15;
      supportingReasons.push("Price above 200 EMA (Macro Bullish Regime)");
    } else {
      factor3Bear += 15;
      contradictingReasons.push("Price below 200 EMA (Macro Bearish Regime)");
    }
  }

  const factor3Score = Math.max(0, Math.min(100, factor3Bull));

  // ----------------------------------------------------
  // FACTOR 4: Volume & Breakout Confirmation (15%)
  // ----------------------------------------------------
  let factor4Bull = 50;
  let factor4Bear = 50;

  if (lastRvol >= 1.5) {
    if (lastClose > lastCandle.open) {
      factor4Bull += 35;
      supportingReasons.push(`High institutional volume surge: RVol ${lastRvol}x with green expansion bar`);
    } else {
      factor4Bear += 35;
      contradictingReasons.push(`Heavy distribution volume surge: RVol ${lastRvol}x on red bar`);
    }
  } else if (lastRvol < 0.7) {
    factor4Bull -= 10;
    factor4Bear -= 10;
    contradictingReasons.push(`Low volume participation (RVol ${lastRvol}x) reduces breakout conviction`);
  }

  const factor4Score = Math.max(0, Math.min(100, factor4Bull));

  // ----------------------------------------------------
  // FACTOR 5: Market Context & Futures/VIX (10%)
  // ----------------------------------------------------
  let factor5Bull = 50;
  let factor5Bear = 50;

  if (context.vixRegime === "LOW" || context.vixRegime === "NORMAL") {
    factor5Bull += 15;
  } else if (context.vixRegime === "HIGH") {
    factor5Bear += 20;
    contradictingReasons.push("India VIX elevated: High volatility environment expands whipsaw probability");
  }

  if (context.breadthBias === "STRONG_ADVANCE" || context.breadthBias === "ADVANCE") {
    factor5Bull += 20;
    supportingReasons.push("Market breadth positive: Majority of key constituents advancing");
  } else if (context.breadthBias === "STRONG_DECLINE" || context.breadthBias === "DECLINE") {
    factor5Bear += 20;
    contradictingReasons.push("Market breadth negative: Key constituents declining");
  }

  const factor5Score = Math.max(0, Math.min(100, factor5Bull));

  // ----------------------------------------------------
  // FACTOR 6: Momentum & Volatility (10%)
  // ----------------------------------------------------
  let factor6Bull = 50;
  let factor6Bear = 50;

  // RSI
  if (lastRsi !== null) {
    if (lastRsi > 55 && lastRsi < 70) {
      factor6Bull += 20;
      supportingReasons.push(`RSI 14 in active bullish momentum zone (${lastRsi.toFixed(1)})`);
    } else if (lastRsi < 45 && lastRsi > 30) {
      factor6Bear += 20;
      contradictingReasons.push(`RSI 14 in active bearish momentum zone (${lastRsi.toFixed(1)})`);
    } else if (lastRsi >= 70) {
      factor6Bull += 10;
      factor6Bear += 15;
      contradictingReasons.push(`RSI overbought (${lastRsi.toFixed(1)}) — potential exhaustion near resistance`);
    } else if (lastRsi <= 30) {
      factor6Bear += 10;
      factor6Bull += 15;
      supportingReasons.push(`RSI oversold (${lastRsi.toFixed(1)}) — potential mean reversion bounce`);
    }
  }

  // MACD Histogram acceleration
  if (lastMacdHist !== null && prevMacdHist !== null) {
    if (lastMacdHist > 0 && lastMacdHist > prevMacdHist) {
      factor6Bull += 15;
      supportingReasons.push("MACD histogram expanding green above zero line");
    } else if (lastMacdHist < 0 && lastMacdHist < prevMacdHist) {
      factor6Bear += 15;
      contradictingReasons.push("MACD histogram expanding red below zero line");
    }
  }

  // VWAP & VWAP Slope
  if (lastVwap !== null) {
    if (lastClose > lastVwap && vwapSlope.direction === "RISING") {
      factor6Bull += 15;
      supportingReasons.push("Price above rising VWAP (Institutional buyers maintaining higher value)");
    } else if (lastClose < lastVwap && vwapSlope.direction === "FALLING") {
      factor6Bear += 15;
      contradictingReasons.push("Price below falling VWAP (Institutional sellers maintaining lower value)");
    }
  }

  const factor6Score = Math.max(0, Math.min(100, factor6Bull));

  // ----------------------------------------------------
  // WEIGHTED AGGREGATE CALCULATION
  // ----------------------------------------------------
  const totalWeight = weights.priceAction + weights.optionChain + weights.multiTimeframe +
                      weights.volumeBreakout + weights.marketContext + weights.momentumVolatility;

  const bullishScore = Math.round(
    (factor1Bull * weights.priceAction +
     factor2Bull * weights.optionChain +
     factor3Bull * weights.multiTimeframe +
     factor4Bull * weights.volumeBreakout +
     factor5Bull * weights.marketContext +
     factor6Bull * weights.momentumVolatility) / totalWeight
  );

  const bearishScore = Math.round(
    (factor1Bear * weights.priceAction +
     factor2Bear * weights.optionChain +
     factor3Bear * weights.multiTimeframe +
     factor4Bear * weights.volumeBreakout +
     factor5Bear * weights.marketContext +
     factor6Bear * weights.momentumVolatility) / totalWeight
  );

  // Contradiction Index: When both scores are high (e.g., bull = 65, bear = 65), conflict is high!
  const contradictionIndex = Math.round(Math.min(bullishScore, bearishScore) * 1.5);

  let netBias: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  const delta = bullishScore - bearishScore;

  if (delta >= 15 && bullishScore >= 60) {
    netBias = "BULLISH";
  } else if (delta <= -15 && bearishScore >= 60) {
    netBias = "BEARISH";
  }

  const signalStrength = Math.round(Math.abs(delta) * 1.25);

  // ----------------------------------------------------
  // SIGNAL CONFIRMATION STATE MACHINE
  // ----------------------------------------------------
  let state: SignalConfirmationState = "NO_SIGNAL";
  let confirmationStatus = "No active trade setup qualified";

  if (dataQualityGrade === "F") {
    state = "DATA_UNAVAILABLE";
    confirmationStatus = "Data stale or disconnected — analysis halted";
  } else if (contradictionIndex >= 65) {
    state = "CONFLICTING_EVIDENCE";
    confirmationStatus = "Conflicting signals detected across indicators; patience advised";
  } else if (netBias === "BULLISH") {
    if (bullishScore >= 75 && lastRvol >= 1.2) {
      state = "BULLISH_CONFIRMED";
      confirmationStatus = "Bullish confluence confirmed with price action and volume breakout";
    } else {
      state = "BULLISH_SETUP";
      confirmationStatus = "Bullish setup forming — awaiting completed candle close confirmation";
    }
  } else if (netBias === "BEARISH") {
    if (bearishScore >= 75 && lastRvol >= 1.2) {
      state = "BEARISH_CONFIRMED";
      confirmationStatus = "Bearish confluence confirmed with structural breakdown and volume";
    } else {
      state = "BEARISH_SETUP";
      confirmationStatus = "Bearish setup forming — awaiting completed candle close confirmation";
    }
  } else if (signalStrength >= 30) {
    state = "WATCH";
    confirmationStatus = "Watchlist focus: Building pressure near key levels";
  }

  return {
    state,
    bullishScore: Math.min(100, Math.max(0, bullishScore)),
    bearishScore: Math.min(100, Math.max(0, bearishScore)),
    netBias,
    signalStrength: Math.min(100, Math.max(0, signalStrength)),
    contradictionIndex: Math.min(100, Math.max(0, contradictionIndex)),
    confirmationStatus,
    dataQualityGrade,
    factors: {
      priceActionScore: Math.min(100, Math.max(0, factor1Score)),
      optionChainScore: Math.min(100, Math.max(0, factor2Score)),
      multiTimeframeScore: Math.min(100, Math.max(0, factor3Score)),
      volumeBreakoutScore: Math.min(100, Math.max(0, factor4Score)),
      marketContextScore: Math.min(100, Math.max(0, factor5Score)),
      momentumVolatilityScore: Math.min(100, Math.max(0, factor6Score)),
    },
    supportingReasons: Array.from(new Set(supportingReasons)),
    contradictingReasons: Array.from(new Set(contradictingReasons)),
    calculatedAtIst: nowIst,
    instrumentKey,
    symbol,
  };
}
