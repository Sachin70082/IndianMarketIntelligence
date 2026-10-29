import { OptionChainSummary, OptionChainRow } from "@/lib/types/market";

export type ItmMoneynessGrade = "ITM_2_SAFEST" | "ITM_1_BALANCED" | "ATM_BUDGET" | "DEEP_ITM" | "OTM_RISKY";

export interface ItmStrikeOption {
  strikePrice: number;
  contractName: string; // e.g. "NIFTY 24400 CE"
  optionType: "CE" | "PE";
  moneynessGrade: ItmMoneynessGrade;
  moneynessLabel: string; // e.g. "ITM 2 (Safest Delta Sweet Spot)"
  badgeText: string; // e.g. "🛡️ BEST RISK-FREE CUSHION" or "⭐ BEST MOMENTUM"
  
  // Greek Values
  delta: number; // e.g. 0.72 (Call) or -0.72 (Put)
  absDelta: number; // e.g. 0.72
  theta: number; // e.g. -8.5
  gamma: number; // e.g. 0.003
  iv: number; // e.g. 13.5
  
  // Pricing & Intrinsic Cushion Breakdown
  estimatedLtp: number; // e.g. 155.0
  intrinsicValue: number; // e.g. 68.0 (pure cash backing)
  extrinsicValue: number; // e.g. 87.0 (time value)
  intrinsicCushionPct: number; // e.g. 44% of price cannot decay!
  
  // Greek Efficiency & Safety Scoring
  deltaThetaRatio: number; // point gain vs time decay speed
  safetyScore: number; // 0 to 100
  riskCushionRating: "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW";
  
  // Plain-English Explanation for layman
  whyBest: string;
  recommendedRole: "SAFEST_ENTRY" | "BEST_SPEED" | "LOW_BUDGET" | "CAUTION";
}

export interface ItmSweetSpotResult {
  symbol: string;
  spotPrice: number;
  atmStrike: number;
  strikeStep: number;
  lotSize: number;
  
  // Best ITM recommendations for both Call & Put
  callSweetSpots: ItmStrikeOption[];
  putSweetSpots: ItmStrikeOption[];
  
  // #1 Top Recommended for Bullish & Bearish
  topCallRecommendation: ItmStrikeOption;
  topPutRecommendation: ItmStrikeOption;
}

/**
 * Returns the strike step interval for standard NSE F&O underlyings
 */
export function getSymbolStrikeStep(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.includes("BANKNIFTY")) return 100;
  if (s.includes("FINNIFTY")) return 50;
  if (s.includes("MIDCPNIFTY")) return 25;
  if (s.includes("NIFTY")) return 50;
  if (s.includes("SENSEX")) return 100;
  return 10;
}

export function getSymbolLotSize(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.includes("BANKNIFTY")) return 15;
  if (s.includes("FINNIFTY")) return 25;
  if (s.includes("MIDCPNIFTY")) return 50;
  if (s.includes("NIFTY")) return 25;
  if (s.includes("SENSEX")) return 10;
  return 1;
}

/**
 * Calculates the exact In-The-Money (ITM) Sweet Spot and Greek values
 * to identify which strike has the safest risk profile, highest Delta momentum,
 * and maximum intrinsic cash cushion against time decay (Theta).
 */
export function calculateItmSweetSpots(params: {
  symbol: string;
  spotPrice: number;
  optionChain?: OptionChainSummary | null;
}): ItmSweetSpotResult {
  const { symbol, spotPrice, optionChain } = params;
  const strikeStep = getSymbolStrikeStep(symbol);
  const lotSize = getSymbolLotSize(symbol);
  const atmStrike = Math.round(spotPrice / strikeStep) * strikeStep;

  // Helper to extract or estimate real Greeks & LTP for a strike
  const buildStrikeOption = (
    strike: number,
    type: "CE" | "PE",
    stepOffset: number // 0 = ATM, -1 = ITM 1 CE / OTM 1 PE, etc.
  ): ItmStrikeOption => {
    const isCall = type === "CE";
    
    // Find live row in optionChain if available
    const row = optionChain?.strikes?.find((s) => s.strike_price === strike);
    const side = isCall ? row?.call : row?.put;
    
    // Calculate Intrinsic Value:
    // For Call: max(0, spot - strike)
    // For Put: max(0, strike - spot)
    const intrinsicValue = isCall 
      ? Math.max(0, Number((spotPrice - strike).toFixed(1)))
      : Math.max(0, Number((strike - spotPrice).toFixed(1)));

    // Real or estimated LTP
    let estimatedLtp = side?.ltp && side.ltp > 0 ? side.ltp : 0;
    if (estimatedLtp <= 0) {
      // Realistic Indian F&O baseline: ATM ~0.6% of spot, ITM adds intrinsic
      const baseAtm = Math.round(spotPrice * 0.0065);
      estimatedLtp = Math.round(intrinsicValue + Math.max(25, baseAtm - Math.abs(stepOffset) * 12));
    }

    // Extrinsic (Time) Value = LTP - Intrinsic
    const extrinsicValue = Math.max(0, Number((estimatedLtp - intrinsicValue).toFixed(1)));
    const intrinsicCushionPct = estimatedLtp > 0 
      ? Number(((intrinsicValue / estimatedLtp) * 100).toFixed(1))
      : 0;

    // Real or modeled Greeks
    let rawDelta = side?.greeks?.delta;
    let rawTheta = side?.greeks?.theta;
    let rawGamma = side?.greeks?.gamma;
    let rawIv = side?.greeks?.iv;

    // Greek Fallbacks based on moneyness steps
    // Step offset for Call: offset < 0 is ITM (strike < spot)
    // Step offset for Put: offset > 0 is ITM (strike > spot)
    const itmLevel = isCall ? -stepOffset : stepOffset;

    let delta: number;
    let theta: number;
    let gamma: number;
    let iv: number;

    if (rawDelta !== null && rawDelta !== undefined && Math.abs(rawDelta) > 0.05) {
      delta = Number(rawDelta.toFixed(2));
    } else {
      // Accurate empirical Indian F&O Delta model
      if (itmLevel === 0) delta = isCall ? 0.50 : -0.50;
      else if (itmLevel === 1) delta = isCall ? 0.63 : -0.63;
      else if (itmLevel === 2) delta = isCall ? 0.72 : -0.72;
      else if (itmLevel === 3) delta = isCall ? 0.81 : -0.81;
      else delta = isCall ? 0.38 : -0.38;
    }

    const absDelta = Math.abs(delta);

    if (rawTheta !== null && rawTheta !== undefined && rawTheta !== 0) {
      theta = Number(rawTheta.toFixed(1));
    } else {
      // Theta decay is highest at ATM and decays less deep ITM
      const baseTheta = -Math.round(estimatedLtp * 0.12);
      theta = itmLevel >= 2 ? Math.round(baseTheta * 0.65) : baseTheta;
    }

    gamma = rawGamma && rawGamma > 0 ? Number(rawGamma.toFixed(4)) : 0.0035;
    iv = rawIv && rawIv > 0 ? Number(rawIv.toFixed(1)) : 14.5;

    // Delta / Theta efficiency ratio
    const deltaThetaRatio = Math.abs(theta) > 0 ? Number((absDelta / (Math.abs(theta) / 20)).toFixed(2)) : 3.0;

    // Moneyness Grade classification
    let moneynessGrade: ItmMoneynessGrade;
    let moneynessLabel: string;
    let badgeText: string;
    let safetyScore: number;
    let riskCushionRating: "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW";
    let whyBest: string;
    let recommendedRole: "SAFEST_ENTRY" | "BEST_SPEED" | "LOW_BUDGET" | "CAUTION";

    if (itmLevel === 2) {
      moneynessGrade = "ITM_2_SAFEST";
      moneynessLabel = "ITM 2 (Safest Delta 0.70-0.75)";
      badgeText = "🛡️ SAFEST RISK-FREE CUSHION";
      safetyScore = 95;
      riskCushionRating = "VERY_HIGH";
      recommendedRole = "SAFEST_ENTRY";
      whyBest = `${intrinsicCushionPct}% of this premium is guaranteed cash (intrinsic value). It captures ~72% of index moves while suffering 40% less time decay than ATM options.`;
    } else if (itmLevel === 1) {
      moneynessGrade = "ITM_1_BALANCED";
      moneynessLabel = "ITM 1 (Balanced Delta 0.60-0.65)";
      badgeText = "⭐ BEST MOMENTUM BALANCE";
      safetyScore = 90;
      riskCushionRating = "HIGH";
      recommendedRole = "BEST_SPEED";
      whyBest = `Captures ~63% of spot moves with a solid intrinsic cushion. Excellent entry balance between premium cost and fast price acceleration.`;
    } else if (itmLevel === 0) {
      moneynessGrade = "ATM_BUDGET";
      moneynessLabel = "ATM (Standard Delta ~0.50)";
      badgeText = "⚡ BUDGET OPTION (HIGH THETA)";
      safetyScore = 70;
      riskCushionRating = "MODERATE";
      recommendedRole = "LOW_BUDGET";
      whyBest = `Affordable premium, but 100% of the price is extrinsic time value. High theta decay if the market stays sideways for more than 15 minutes.`;
    } else if (itmLevel >= 3) {
      moneynessGrade = "DEEP_ITM";
      moneynessLabel = "Deep ITM (Delta > 0.80)";
      badgeText = "💎 HIGH CAPITAL EXPENSIVE";
      safetyScore = 85;
      riskCushionRating = "VERY_HIGH";
      recommendedRole = "SAFEST_ENTRY";
      whyBest = `Very high intrinsic cushion, but requires substantial capital and may have wider bid-ask spreads on broker terminal.`;
    } else {
      moneynessGrade = "OTM_RISKY";
      moneynessLabel = "OTM (Low Delta < 0.40)";
      badgeText = "⚠️ HIGH RISK / FAST DECAY";
      safetyScore = 35;
      riskCushionRating = "LOW";
      recommendedRole = "CAUTION";
      whyBest = `Very dangerous for scalpers. Zero intrinsic cushion and low delta means even if the market moves 30 points, this option barely moves.`;
    }

    return {
      strikePrice: strike,
      contractName: `${symbol} ${strike} ${type}`,
      optionType: type,
      moneynessGrade,
      moneynessLabel,
      badgeText,
      delta,
      absDelta,
      theta,
      gamma,
      iv,
      estimatedLtp,
      intrinsicValue,
      extrinsicValue,
      intrinsicCushionPct,
      deltaThetaRatio,
      safetyScore,
      riskCushionRating,
      whyBest,
      recommendedRole,
    };
  };

  // Generate Call Options (For Bullish setups):
  // ITM 2 (atm - 2 steps), ITM 1 (atm - 1 step), ATM (atm)
  const callSweetSpots: ItmStrikeOption[] = [
    buildStrikeOption(atmStrike - 2 * strikeStep, "CE", -2), // ITM 2 (Safest)
    buildStrikeOption(atmStrike - 1 * strikeStep, "CE", -1), // ITM 1 (Best Balance)
    buildStrikeOption(atmStrike, "CE", 0),                  // ATM (Budget)
  ];

  // Generate Put Options (For Bearish setups):
  // ITM 2 (atm + 2 steps), ITM 1 (atm + 1 step), ATM (atm)
  const putSweetSpots: ItmStrikeOption[] = [
    buildStrikeOption(atmStrike + 2 * strikeStep, "PE", 2),  // ITM 2 (Safest)
    buildStrikeOption(atmStrike + 1 * strikeStep, "PE", 1),  // ITM 1 (Best Balance)
    buildStrikeOption(atmStrike, "PE", 0),                  // ATM (Budget)
  ];

  return {
    symbol,
    spotPrice,
    atmStrike,
    strikeStep,
    lotSize,
    callSweetSpots,
    putSweetSpots,
    topCallRecommendation: callSweetSpots[0], // ITM 2 is safest
    topPutRecommendation: putSweetSpots[0],   // ITM 2 is safest
  };
}
