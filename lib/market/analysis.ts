import { MarketAnalysisResult } from "@/lib/types/market";
import { calculatePivotLevels } from "@/lib/indicators/pivots";
import { formatISTDateTime, getMarketSessionStatus } from "./sessions";
import { generateComprehensiveSignal } from "@/lib/signal/engine";
import { generateTradeSetupPlan } from "@/lib/risk/engine";

export interface AnalysisInput {
  currentPrice: number;
  candles: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    date?: string;
  }[];
  ema20: (number | null)[];
  ema50: (number | null)[];
  rsi14: (number | null)[];
  atr14: (number | null)[];
  vwap: (number | null)[];
  isFeedLiveOrRecent: boolean;
  quoteAgeSeconds: number;
  instrumentKey?: string;
  symbol?: string;
  quote?: any;
  advancedOptions?: any;
  vixQuote?: any;
  constituentQuotes?: any[];
  optionChain?: any;
}

/**
 * Rules-based analytical assessment engine.
 * Never issues speculative advice. Emphasizes risk management and condition sufficiency.
 */
export function generateMarketAnalysis(input: AnalysisInput): MarketAnalysisResult {
  const {
    currentPrice,
    candles,
    ema20,
    ema50,
    rsi14,
    atr14,
    vwap,
    isFeedLiveOrRecent,
    quoteAgeSeconds,
  } = input;

  const nowIst = formatISTDateTime(new Date());
  const session = getMarketSessionStatus();

  // Insufficient data gate
  const minRequiredCandles = 25;
  const hasEnoughCandles = candles && candles.length >= minRequiredCandles;

  const lastIdx = candles.length - 1;
  const currentEma20 = lastIdx >= 0 ? ema20[lastIdx] : null;
  const currentEma50 = lastIdx >= 0 ? ema50[lastIdx] : null;
  const currentRsi = lastIdx >= 0 ? rsi14[lastIdx] : null;
  const currentAtr = lastIdx >= 0 ? atr14[lastIdx] : null;
  const currentVwap = lastIdx >= 0 ? vwap[lastIdx] : null;

  const hasAllIndicators =
    currentEma20 !== null &&
    currentEma50 !== null &&
    currentRsi !== null &&
    currentAtr !== null &&
    currentVwap !== null;

  // Stale or disconnected conditions
  if (
    !isFeedLiveOrRecent ||
    quoteAgeSeconds > 60 ||
    !hasEnoughCandles ||
    !hasAllIndicators ||
    currentPrice <= 0
  ) {
    const reasons: string[] = [];
    if (!isFeedLiveOrRecent) reasons.push("Data feed is STALE or DISCONNECTED (>60s age).");
    if (!hasEnoughCandles) reasons.push(`Insufficient historical candles (${candles?.length || 0}/${minRequiredCandles} minimum required).`);
    if (!hasAllIndicators) reasons.push("Technical indicators are still initializing/warming up.");
    if (currentPrice <= 0) reasons.push("Valid current market price unavailable.");

    return {
      bias: "INSUFFICIENT_DATA",
      confidence_label: "NO TRADE — DATA OR CONDITIONS INSUFFICIENT",
      vwap_status: "UNAVAILABLE",
      ema_trend: "FLAT",
      rsi_state: "NEUTRAL",
      atr_volatility: "INSUFFICIENT",
      support_level: null,
      resistance_level: null,
      entry_trigger: null,
      invalidation_level: null,
      target_1: null,
      target_2: null,
      risk_reward_ratio: "N/A",
      reasons,
      data_sufficient: false,
      warning_message: "Market intelligence paused: real-time data integrity requirements not met.",
      calculated_at_ist: nowIst,
    };
  }

  // Calculate Pivot levels from actual candles
  const pivots = calculatePivotLevels(candles, currentPrice);

  // 1. VWAP Assessment
  const vwapDiff = currentPrice - currentVwap!;
  const vwapPct = (vwapDiff / currentVwap!) * 100;
  let vwap_status: MarketAnalysisResult["vwap_status"] = "NEAR_VWAP";
  if (vwapPct > 0.15) vwap_status = "ABOVE_VWAP";
  else if (vwapPct < -0.15) vwap_status = "BELOW_VWAP";

  // 2. EMA Trend Alignment
  let ema_trend: MarketAnalysisResult["ema_trend"] = "FLAT";
  if (currentEma20! > currentEma50! && currentPrice >= currentEma20!) {
    ema_trend = "BULLISH_STACK";
  } else if (currentEma20! < currentEma50! && currentPrice <= currentEma20!) {
    ema_trend = "BEARISH_STACK";
  } else if (Math.abs(currentEma20! - currentEma50!) / currentPrice < 0.001) {
    ema_trend = "CROSSOVER_WATCH";
  }

  // 3. RSI Momentum State
  let rsi_state: MarketAnalysisResult["rsi_state"] = "NEUTRAL";
  if (currentRsi! >= 70) rsi_state = "OVERBOUGHT";
  else if (currentRsi! <= 30) rsi_state = "OVERSOLD";
  else if (currentRsi! >= 55) rsi_state = "BULLISH_MOMENTUM";
  else if (currentRsi! <= 45) rsi_state = "BEARISH_MOMENTUM";

  // 4. ATR Volatility Context
  const atrPct = (currentAtr! / currentPrice) * 100;
  let atr_volatility: MarketAnalysisResult["atr_volatility"] = "NORMAL";
  if (atrPct > 0.8) atr_volatility = "HIGH";
  else if (atrPct < 0.25) atr_volatility = "LOW";

  // Scoring rule-based bias
  let bullishPoints = 0;
  let bearishPoints = 0;
  const reasons: string[] = [];

  if (vwap_status === "ABOVE_VWAP") {
    bullishPoints += 2;
    reasons.push(`Price is trading above session VWAP (${currentVwap!.toFixed(2)}), indicating intraday buyer control.`);
  } else if (vwap_status === "BELOW_VWAP") {
    bearishPoints += 2;
    reasons.push(`Price is trading below session VWAP (${currentVwap!.toFixed(2)}), indicating intraday seller pressure.`);
  } else {
    reasons.push(`Price is oscillating directly around VWAP (${currentVwap!.toFixed(2)}), reflecting equilibrium.`);
  }

  if (ema_trend === "BULLISH_STACK") {
    bullishPoints += 2;
    reasons.push(`EMA 20 (${currentEma20!.toFixed(2)}) is stacked above EMA 50 (${currentEma50!.toFixed(2)}) with price holding above both.`);
  } else if (ema_trend === "BEARISH_STACK") {
    bearishPoints += 2;
    reasons.push(`EMA 20 (${currentEma20!.toFixed(2)}) is stacked below EMA 50 (${currentEma50!.toFixed(2)}) with price capped below both.`);
  } else if (ema_trend === "CROSSOVER_WATCH") {
    reasons.push(`EMA 20 and EMA 50 are compressing closely; watchful for trend crossover.`);
  }

  if (rsi_state === "BULLISH_MOMENTUM") {
    bullishPoints += 1;
    reasons.push(`RSI(14) at ${currentRsi!.toFixed(1)} confirms constructive upside momentum without reaching exhaustion.`);
  } else if (rsi_state === "BEARISH_MOMENTUM") {
    bearishPoints += 1;
    reasons.push(`RSI(14) at ${currentRsi!.toFixed(1)} confirms negative downward momentum.`);
  } else if (rsi_state === "OVERBOUGHT") {
    bearishPoints += 1;
    reasons.push(`RSI(14) at ${currentRsi!.toFixed(1)} is overbought; high risk of mean-reversion pullbacks.`);
  } else if (rsi_state === "OVERSOLD") {
    bullishPoints += 1;
    reasons.push(`RSI(14) at ${currentRsi!.toFixed(1)} is oversold; high probability of technical short-covering bounces.`);
  }

  reasons.push(`ATR(14) is ${currentAtr!.toFixed(2)} (${atrPct.toFixed(2)}% of price), denoting ${atr_volatility.toLowerCase()} volatility environment.`);

  let bias: MarketAnalysisResult["bias"] = "NEUTRAL";
  let confidence_label = "NEUTRAL CONSOLIDATION";

  if (bullishPoints >= 4 && bearishPoints <= 1) {
    bias = "BULLISH";
    confidence_label = "RULE-BASED BULLISH SETUP";
  } else if (bearishPoints >= 4 && bullishPoints <= 1) {
    bias = "BEARISH";
    confidence_label = "RULE-BASED BEARISH SETUP";
  } else {
    bias = "NEUTRAL";
    confidence_label = "RANGE-BOUND / BALANCED MARKET";
  }

  // Scenarios and Risk-to-Reward calculation
  let entry_trigger: number | null = null;
  let invalidation_level: number | null = null;
  let target_1: number | null = null;
  let target_2: number | null = null;
  let risk_reward_ratio = "1:2.0";

  const buffer = currentAtr! * 1.0;

  if (bias === "BULLISH") {
    entry_trigger = Number((currentPrice + currentAtr! * 0.1).toFixed(2));
    invalidation_level = Number(
      Math.min(currentPrice - buffer, pivots?.nearest_support || currentPrice - buffer).toFixed(2)
    );
    const risk = entry_trigger - invalidation_level;
    target_1 = Number((entry_trigger + risk * 1.5).toFixed(2));
    target_2 = Number((entry_trigger + risk * 2.0).toFixed(2));
    risk_reward_ratio = "1:1.5 to 1:2.0";
  } else if (bias === "BEARISH") {
    entry_trigger = Number((currentPrice - currentAtr! * 0.1).toFixed(2));
    invalidation_level = Number(
      Math.max(currentPrice + buffer, pivots?.nearest_resistance || currentPrice + buffer).toFixed(2)
    );
    const risk = invalidation_level - entry_trigger;
    target_1 = Number((entry_trigger - risk * 1.5).toFixed(2));
    target_2 = Number((entry_trigger - risk * 2.0).toFixed(2));
    risk_reward_ratio = "1:1.5 to 1:2.0";
  }

  let warning_message: string | undefined = undefined;
  if (!session.is_trading_active) {
    warning_message = `Markets currently in ${session.status} state. Levels represent static session close references.`;
  }

  const comprehensiveSignal = generateComprehensiveSignal({
    instrumentKey: input.instrumentKey || "NSE_INDEX|Nifty 50",
    symbol: input.symbol || "NIFTY 50",
    candles: candles as any,
    quote: input.quote || null,
    advancedOptions: input.advancedOptions || null,
    vixQuote: input.vixQuote || null,
    constituentQuotes: input.constituentQuotes || [],
  });

  const tradePlan = generateTradeSetupPlan({
    signal: comprehensiveSignal,
    candles: candles as any,
    quote: input.quote || null,
    optionChain: input.optionChain || null,
  });

  return {
    bias,
    confidence_label,
    vwap_status,
    ema_trend,
    rsi_state,
    atr_volatility,
    support_level: pivots?.nearest_support || null,
    resistance_level: pivots?.nearest_resistance || null,
    entry_trigger,
    invalidation_level,
    target_1,
    target_2,
    risk_reward_ratio,
    reasons,
    data_sufficient: true,
    warning_message,
    calculated_at_ist: nowIst,
    comprehensiveSignal,
    tradePlan,
  };
}
