import { StockMasterItem } from "@/lib/stocks/stockMaster";
import {
  InstitutionalStockSignal,
  InstitutionalSignalTier,
  OneClearZoneData,
  OrderBlockZone,
  LiquidityLevel,
} from "./types";
import { detectOrderBlocks } from "./orderBlocks";
import { detectLiquidityPools } from "./liquidity";
import { evaluateLargeOrderActivity } from "./largeOrders";
import { CandleDataPoint } from "@/lib/types/market";

/**
 * Computes a weighted Composite Institutional Order Block Score (0 - 100)
 */
export function computeCompositeInstitutionalScore(params: {
  obScore: number;
  liqScore: number;
  rvolScore: number;
  structScore: number;
  largeOrderScore: number;
  pvScore: number;
  deliveryScore: number;
}): { score: number; tier: InstitutionalSignalTier } {
  const {
    obScore,
    liqScore,
    rvolScore,
    structScore,
    largeOrderScore,
    pvScore,
    deliveryScore,
  } = params;

  // Weighted model according to institutional specifications
  const composite =
    obScore * 0.25 +
    liqScore * 0.20 +
    rvolScore * 0.15 +
    structScore * 0.15 +
    largeOrderScore * 0.10 +
    pvScore * 0.10 +
    deliveryScore * 0.05;

  const score = Math.min(100, Math.max(10, Math.round(composite)));

  let tier: InstitutionalSignalTier = "WEAK";
  if (score >= 90) tier = "EXCEPTIONAL";
  else if (score >= 80) tier = "VERY_STRONG";
  else if (score >= 70) tier = "STRONG";
  else if (score >= 60) tier = "DEVELOPING";

  return { score, tier };
}

/**
 * Synthesizes the simplified "One Clear Zone" card
 */
export function synthesizeOneClearZone(params: {
  stock: StockMasterItem;
  ltp: number;
  bullishOB: OrderBlockZone | null;
  bearishOB: OrderBlockZone | null;
  nearestLiquidity: LiquidityLevel | null;
  rvol: number;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  compositeScore: number;
}): OneClearZoneData {
  const { stock, ltp, bullishOB, bearishOB, nearestLiquidity, rvol, direction, compositeScore } = params;

  // If score is weak or no clear OB, state no clear zone
  if (compositeScore < 60 || (!bullishOB && !bearishOB)) {
    return {
      hasClearZone: false,
      direction: "NONE",
      demandSupplyZoneText: "NO CLEAR INSTITUTIONAL ZONE",
      liquidityTargetText: "Range Bound / Indecision",
      zoneRange: [0, 0],
      targetPrice: 0,
      strengthScore: compositeScore,
      rvol,
      structure: "Consolidation / Low Volume",
      status: "Awaiting Institutional Setup",
      explanation: "Current price action lacks aggressive institutional displacement or clean liquidity mitigation. Stand aside until smart money commits.",
    };
  }

  // Prioritize based on direction
  const isBull = direction === "BULLISH" || (bullishOB && (!bearishOB || bullishOB.strengthScore >= (bearishOB?.strengthScore || 0)));

  if (isBull && bullishOB) {
    const targetPrice = nearestLiquidity && nearestLiquidity.priceLevel > ltp
      ? nearestLiquidity.priceLevel
      : Number((ltp * 1.035).toFixed(2));

    return {
      hasClearZone: true,
      direction: "BULLISH",
      demandSupplyZoneText: `₹${bullishOB.lowPrice.toFixed(1)} – ₹${bullishOB.highPrice.toFixed(1)}`,
      liquidityTargetText: `₹${targetPrice.toFixed(1)} (${nearestLiquidity?.type || "BSL"})`,
      zoneRange: [bullishOB.lowPrice, bullishOB.highPrice],
      targetPrice,
      strengthScore: bullishOB.strengthScore,
      rvol,
      structure: `Bullish ${bullishOB.breakType} (Displacement Confirmed)`,
      status: bullishOB.status === "FRESH" ? "Fresh Demand Zone" : `Tested (${bullishOB.retestCount}x)`,
      explanation: `Price has formed a high-conviction Bullish Order Block following upward structural displacement. Buy-side liquidity pool targeted at ₹${targetPrice.toFixed(1)}.`,
    };
  }

  if (!isBull && bearishOB) {
    const targetPrice = nearestLiquidity && nearestLiquidity.priceLevel < ltp
      ? nearestLiquidity.priceLevel
      : Number((ltp * 0.965).toFixed(2));

    return {
      hasClearZone: true,
      direction: "BEARISH",
      demandSupplyZoneText: `₹${bearishOB.lowPrice.toFixed(1)} – ₹${bearishOB.highPrice.toFixed(1)}`,
      liquidityTargetText: `₹${targetPrice.toFixed(1)} (${nearestLiquidity?.type || "SSL"})`,
      zoneRange: [bearishOB.lowPrice, bearishOB.highPrice],
      targetPrice,
      strengthScore: bearishOB.strengthScore,
      rvol,
      structure: `Bearish ${bearishOB.breakType} (Supply Rejection)`,
      status: bearishOB.status === "FRESH" ? "Fresh Supply Zone" : `Tested (${bearishOB.retestCount}x)`,
      explanation: `Price formed a Bearish Order Block following structural breakdown. Downside sell-side liquidity pool targeted at ₹${targetPrice.toFixed(1)}.`,
    };
  }

  return {
    hasClearZone: false,
    direction: "NONE",
    demandSupplyZoneText: "NO CLEAR INSTITUTIONAL ZONE",
    liquidityTargetText: "Neutral",
    zoneRange: [0, 0],
    targetPrice: 0,
    strengthScore: compositeScore,
    rvol,
    structure: "Neutral Equilibrium",
    status: "Unconfirmed",
    explanation: "Institutional participation is balanced. Wait for clear expansion away from equilibrium.",
  };
}

/**
 * Analyzes and ranks a given stock with real-time candles & quote data
 */
export function analyzeStockInstitutionalSignals(params: {
  stock: StockMasterItem;
  candles: CandleDataPoint[];
  liveQuote?: {
    ltp: number;
    changePct: number;
    volume: number;
    prevClose: number;
  };
  timeframe?: string;
}): InstitutionalStockSignal {
  const { stock, candles, liveQuote, timeframe = "15m" } = params;

  const n = candles.length;
  const ltp = liveQuote?.ltp || (n > 0 ? candles[n - 1].close : 100);
  const changePct = liveQuote?.changePct || (n > 1 ? Number((((ltp - candles[0].open) / candles[0].open) * 100).toFixed(2)) : 0);
  const volume = liveQuote?.volume || (n > 0 ? candles[n - 1].volume : 50000);

  // 1. Order Blocks Detection
  const { orderBlocks, activeBullishOB, activeBearishOB } = detectOrderBlocks(candles, stock.symbol, timeframe);

  // 2. Liquidity Detection
  const { liquidityLevels, nearestPool, activeTrapScore } = detectLiquidityPools(candles, stock.symbol);

  // 3. Average 20-period volume
  const avgVol = candles.slice(-20).reduce((sum, c) => sum + (c.volume || 1), 0) / Math.min(20, candles.length || 1);
  const rvol = Number((volume / (avgVol || 1)).toFixed(2));

  // 4. Delivery Estimation
  const deliveryPct = Math.min(85, Math.max(30, Math.round(45 + (changePct > 0 ? changePct * 3 : changePct * 1.5))));

  // 5. Large Order Scanner
  const { largeOrderScore, pressure } = evaluateLargeOrderActivity({
    stock,
    ltp,
    changePct,
    volume,
    avgVolume20: avgVol,
    deliveryPct,
  });

  // Calculate component scores
  const obStrength = activeBullishOB
    ? activeBullishOB.strengthScore
    : activeBearishOB
    ? activeBearishOB.strengthScore
    : 45;

  const rvolScore = Math.min(100, Math.round(rvol * 35));
  const structScore = (activeBullishOB?.breakType === "BOS" || activeBearishOB?.breakType === "BOS") ? 88 : 65;
  const pvScore = Math.abs(changePct) >= 1.5 && rvol >= 1.2 ? 85 : 55;
  const deliveryScore = Math.min(100, Math.round(deliveryPct * 1.2));

  // Determine Overall Direction
  let direction: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  if (changePct > 0.4 && (activeBullishOB || pressure.includes("BUYING"))) {
    direction = "BULLISH";
  } else if (changePct < -0.4 && (activeBearishOB || pressure.includes("SELLING"))) {
    direction = "BEARISH";
  }

  // Composite Score
  const { score: compositeScore, tier } = computeCompositeInstitutionalScore({
    obScore: obStrength,
    liqScore: activeTrapScore,
    rvolScore,
    structScore,
    largeOrderScore,
    pvScore,
    deliveryScore,
  });

  // Distance to nearest active OB zone
  let distanceToZonePct = 0;
  if (direction === "BULLISH" && activeBullishOB) {
    distanceToZonePct = Number((((ltp - activeBullishOB.highPrice) / ltp) * 100).toFixed(2));
  } else if (direction === "BEARISH" && activeBearishOB) {
    distanceToZonePct = Number((((activeBearishOB.lowPrice - ltp) / ltp) * 100).toFixed(2));
  }

  // One Clear Zone Synthesis
  const oneClearZone = synthesizeOneClearZone({
    stock,
    ltp,
    bullishOB: activeBullishOB,
    bearishOB: activeBearishOB,
    nearestLiquidity: nearestPool,
    rvol,
    direction,
    compositeScore,
  });

  return {
    stock,
    ltp,
    changePct,
    volume,
    relativeVolume: rvol,
    deliveryPct,
    orderBlockScore: obStrength,
    liquidityScore: activeTrapScore,
    rvolScore,
    marketStructureScore: structScore,
    largeOrderScore,
    priceVolumeScore: pvScore,
    deliveryScore,
    compositeScore,
    direction,
    tier,
    nearestBullishOB: activeBullishOB,
    nearestBearishOB: activeBearishOB,
    nearestLiquidity: nearestPool,
    distanceToZonePct: Math.abs(distanceToZonePct),
    timeframe,
    oneClearZone,
    lastUpdated: Date.now(),
  };
}

