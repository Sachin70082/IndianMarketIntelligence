import { 
  CandleDataPoint, 
  ComprehensiveSignal, 
  TradeSetupPlan, 
  MarketQuoteData,
  OptionChainSummary 
} from "@/lib/types/market";
import { DEFAULT_RISK_SETTINGS, INDIAN_MARKET_CHARGES } from "@/lib/upstox/constants";
import { calculateATR } from "@/lib/indicators/atr";
import { analyzeMarketStructure } from "@/lib/priceaction/structure";

export interface RiskEngineInput {
  signal: ComprehensiveSignal;
  candles: CandleDataPoint[];
  quote: MarketQuoteData | null;
  optionChain?: OptionChainSummary | null;
  capitalBase?: number;
  riskPerTradePct?: number;
  lotSize?: number;
}

/**
 * Trade Setup & Position Sizing Risk Engine
 * Computes exact entries, ATR- and structure-based stop losses, targets,
 * position sizes tailored to capital & risk %, and statutory Indian charges.
 * Strictly read-only advisory calculator.
 */
export function generateTradeSetupPlan(input: RiskEngineInput): TradeSetupPlan {
  const {
    signal,
    candles,
    quote,
    optionChain,
    capitalBase = DEFAULT_RISK_SETTINGS.defaultCapital,
    riskPerTradePct = DEFAULT_RISK_SETTINGS.riskPerTradePct,
    lotSize = 1,
  } = input;

  const currentPrice = quote?.last_price || (candles.length > 0 ? candles[candles.length - 1].close : 0);
  const maxRiskAmount = Number(((capitalBase * riskPerTradePct) / 100).toFixed(2));
  const warnings: string[] = [];

  // Default No-Setup Plan
  if (
    signal.state === "NO_SIGNAL" ||
    signal.state === "DATA_UNAVAILABLE" ||
    signal.state === "CONFLICTING_EVIDENCE" ||
    currentPrice <= 0
  ) {
    return {
      id: `setup_none_${Date.now()}`,
      instrumentKey: signal.instrumentKey,
      symbol: signal.symbol,
      setupType: "NO_SETUP",
      direction: "NEUTRAL",
      entryZone: { min: currentPrice, max: currentPrice },
      triggerCondition: signal.confirmationStatus,
      invalidationPrice: currentPrice,
      stopLossPrice: currentPrice,
      stopReferenceType: "STRUCTURE_SWING",
      target1: currentPrice,
      target2: currentPrice,
      riskRewardRatio: 0,
      capitalBase,
      maxRiskAmount,
      recommendedQuantity: 0,
      recommendedLots: 0,
      lotSize,
      estimatedCharges: { stt: 0, exchangeTurnover: 0, gst: 0, stampDuty: 0, totalCharges: 0 },
      slippageEstimate: 0,
      liquidityWarning: "No setup qualified under current market conditions.",
    };
  }

  // Calculate ATR for stop buffering
  const atrValues = calculateATR(candles, 14);
  const currentAtr = atrValues[atrValues.length - 1] || currentPrice * 0.005;
  const structure = analyzeMarketStructure(candles);

  const isBull = signal.netBias === "BULLISH";
  const direction: "LONG" | "SHORT" = isBull ? "LONG" : "SHORT";

  // Determine Stop Loss Price:
  // For Long: Below swing low or 1.5 * ATR below current price
  // For Short: Above swing high or 1.5 * ATR above current price
  let stopLossPrice = 0;
  let stopReferenceType: "STRUCTURE_SWING" | "ATR_MULTIPLIER" | "VWAP_LEVEL" = "STRUCTURE_SWING";

  if (isBull) {
    if (structure.swingLow && structure.swingLow < currentPrice && (currentPrice - structure.swingLow) <= currentAtr * 3) {
      stopLossPrice = Number((structure.swingLow - 0.05).toFixed(2));
      stopReferenceType = "STRUCTURE_SWING";
    } else {
      stopLossPrice = Number((currentPrice - currentAtr * 1.5).toFixed(2));
      stopReferenceType = "ATR_MULTIPLIER";
    }
  } else {
    if (structure.swingHigh && structure.swingHigh > currentPrice && (structure.swingHigh - currentPrice) <= currentAtr * 3) {
      stopLossPrice = Number((structure.swingHigh + 0.05).toFixed(2));
      stopReferenceType = "STRUCTURE_SWING";
    } else {
      stopLossPrice = Number((currentPrice + currentAtr * 1.5).toFixed(2));
      stopReferenceType = "ATR_MULTIPLIER";
    }
  }

  const riskPerShare = Math.abs(currentPrice - stopLossPrice);
  if (riskPerShare <= 0) {
    warnings.push("Calculated risk distance is zero; setup invalidated.");
  }

  // Calculate Targets based on 1:1.5 and 1:2.5 Risk/Reward
  const target1 = isBull
    ? Number((currentPrice + riskPerShare * 1.5).toFixed(2))
    : Number((currentPrice - riskPerShare * 1.5).toFixed(2));

  const target2 = isBull
    ? Number((currentPrice + riskPerShare * 2.5).toFixed(2))
    : Number((currentPrice - riskPerShare * 2.5).toFixed(2));

  const riskRewardRatio = 1.5;

  // Position Sizing: Max Risk / Risk per share
  let recommendedQuantity = riskPerShare > 0 ? Math.floor(maxRiskAmount / riskPerShare) : 0;

  // If F&O lot size applies, round to whole lots
  let recommendedLots = 1;
  if (lotSize > 1) {
    recommendedLots = Math.max(1, Math.floor(recommendedQuantity / lotSize));
    recommendedQuantity = recommendedLots * lotSize;
  } else {
    recommendedQuantity = Math.max(1, recommendedQuantity);
  }

  // Calculate Statutory Charges (NSE Intraday Rates)
  const isFo = lotSize > 1 || signal.instrumentKey.includes("INDEX") || signal.instrumentKey.includes("FO");
  const turnover = currentPrice * recommendedQuantity;
  const rates = isFo ? INDIAN_MARKET_CHARGES.futures : INDIAN_MARKET_CHARGES.equityIntraday;

  const brokerage = rates.brokerageFlat * 2; // entry + exit
  const stt = turnover * rates.sttPctSell;
  const exchangeTurnover = turnover * rates.exchangeTurnoverPct * 2;
  const gst = (brokerage + exchangeTurnover) * rates.gstPct;
  const stampDuty = turnover * rates.stampDutyPctBuy;
  const totalCharges = Number((brokerage + stt + exchangeTurnover + gst + stampDuty).toFixed(2));

  // Slippage Estimate (0.05% of turnover)
  const slippageEstimate = Number((turnover * DEFAULT_RISK_SETTINGS.defaultSlippagePct * 0.01).toFixed(2));

  // Determine Setup Type (Cash vs Option vs Futures)
  let setupType: "EQUITY_CASH" | "INDEX_FUTURE" | "CALL_BUY" | "PUT_BUY" | "NO_SETUP" = "EQUITY_CASH";
  if (isFo) {
    setupType = isBull ? "CALL_BUY" : "PUT_BUY";
  }

  // Option Greeks Consideration
  let optionGreeksConsideration: TradeSetupPlan["optionGreeksConsideration"] = undefined;
  if (isFo && optionChain) {
    const atmRow = optionChain.strikes.find((s) => s.is_atm) || optionChain.strikes[0];
    const targetSide = isBull ? atmRow?.call : atmRow?.put;

    if (targetSide && targetSide.greeks) {
      const delta = targetSide.greeks.delta;
      const theta = targetSide.greeks.theta;
      const iv = targetSide.greeks.iv;

      optionGreeksConsideration = {
        delta,
        thetaDecayPerDay: theta ? Number(theta.toFixed(2)) : null,
        ivCrushRisk: (iv || 0) > 25 ? "HIGH" : (iv || 0) > 18 ? "MEDIUM" : "LOW",
        commentary: theta !== null
          ? `ATM option carries ₹${Math.abs(theta).toFixed(1)}/day time decay. Hold duration should be restricted to intraday.`
          : "Greeks not provided by broker feed.",
      };
    }
  }

  const entryZone = {
    min: isBull ? Number((currentPrice - currentAtr * 0.25).toFixed(2)) : currentPrice,
    max: isBull ? currentPrice : Number((currentPrice + currentAtr * 0.25).toFixed(2)),
  };

  const triggerCondition = isBull
    ? `Completed candle close above ₹${currentPrice.toFixed(2)} with RVol > 1.2x. Invalidation on close below ₹${stopLossPrice.toFixed(2)}.`
    : `Completed candle close below ₹${currentPrice.toFixed(2)} with RVol > 1.2x. Invalidation on close above ₹${stopLossPrice.toFixed(2)}.`;

  return {
    id: `setup_${signal.symbol}_${Date.now()}`,
    instrumentKey: signal.instrumentKey,
    symbol: signal.symbol,
    setupType,
    direction,
    entryZone,
    triggerCondition,
    invalidationPrice: stopLossPrice,
    stopLossPrice,
    stopReferenceType,
    target1,
    target2,
    riskRewardRatio,
    capitalBase,
    maxRiskAmount,
    recommendedQuantity,
    recommendedLots,
    lotSize,
    estimatedCharges: {
      stt: Number(stt.toFixed(2)),
      exchangeTurnover: Number(exchangeTurnover.toFixed(2)),
      gst: Number(gst.toFixed(2)),
      stampDuty: Number(stampDuty.toFixed(2)),
      totalCharges,
    },
    slippageEstimate,
    liquidityWarning: isFo && lotSize > 1 ? `Standard lot size ${lotSize} shares per contract applies.` : null,
    optionGreeksConsideration,
  };
}
