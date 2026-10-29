import { 
  CandleDataPoint, 
  BacktestReport, 
  BacktestTrade, 
  SignalFactorBreakdown 
} from "@/lib/types/market";
import { DEFAULT_FACTOR_WEIGHTS, INDIAN_MARKET_CHARGES } from "@/lib/upstox/constants";
import { calculateEMA } from "@/lib/indicators/ema";
import { calculateRSI } from "@/lib/indicators/rsi";
import { calculateATR } from "@/lib/indicators/atr";
import { calculateVWAP } from "@/lib/indicators/vwap";
import { calculateRVol } from "@/lib/indicators/rvol";
import { detectCandlePatterns } from "@/lib/priceaction/patterns";
import { analyzeMarketStructure } from "@/lib/priceaction/structure";

export interface BacktestOptions {
  instrumentKey: string;
  symbol: string;
  timeframe: string;
  capitalBase?: number;
  riskPerTradePct?: number;
  lotSize?: number;
  slippagePct?: number;
  strategyWeights?: SignalFactorBreakdown;
  maxHoldingCandles?: number;
}

/**
 * Historical Backtesting & Accuracy Measurement Engine
 * Strictly avoids look-ahead bias: Signal generated at candle `i` close;
 * entry executed at candle `i+1` open price with slippage applied.
 */
export function runHistoricalBacktest(
  candles: CandleDataPoint[],
  options: BacktestOptions
): BacktestReport {
  const {
    instrumentKey,
    symbol,
    timeframe,
    capitalBase = 500000,
    riskPerTradePct = 1.0,
    lotSize = 1,
    slippagePct = 0.05,
    maxHoldingCandles = 24, // intraday timeout
  } = options;

  const emptyReport: BacktestReport = {
    instrumentKey,
    timeframe,
    totalCandlesTested: candles?.length || 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRatePct: 0,
    avgWinR: 0,
    avgLossR: 0,
    profitFactor: 0,
    netExpectancyR: 0,
    netProfitPoints: 0,
    maxDrawdownPct: 0,
    equityCurve: [],
    trades: [],
    strategyWeights: {
      priceActionScore: DEFAULT_FACTOR_WEIGHTS.priceAction,
      optionChainScore: DEFAULT_FACTOR_WEIGHTS.optionChain,
      multiTimeframeScore: DEFAULT_FACTOR_WEIGHTS.multiTimeframe,
      volumeBreakoutScore: DEFAULT_FACTOR_WEIGHTS.volumeBreakout,
      marketContextScore: DEFAULT_FACTOR_WEIGHTS.marketContext,
      momentumVolatilityScore: DEFAULT_FACTOR_WEIGHTS.momentumVolatility,
    },
  };

  if (!candles || candles.length < 50) {
    return emptyReport;
  }

  const closePrices = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  // Pre-calculate chronological indicators
  const ema9 = calculateEMA(closePrices, 9);
  const ema21 = calculateEMA(closePrices, 21);
  const ema50 = calculateEMA(closePrices, 50);
  const rsi = calculateRSI(closePrices, 14);
  const atr = calculateATR(candles, 14);
  const vwapRes = calculateVWAP(candles);
  const rvol = calculateRVol(volumes, 20);

  const trades: BacktestTrade[] = [];
  let currentEquity = capitalBase;
  let peakEquity = capitalBase;
  let maxDrawdownPct = 0;
  const equityCurve: { time: number; equity: number; drawdown: number }[] = [];

  // Active position tracker
  let inTrade = false;
  let activeTrade: Partial<BacktestTrade> = {};
  let entryIndex = 0;

  // Walk forward candle by candle starting after warm-up period (candle 50)
  for (let i = 50; i < candles.length - 1; i++) {
    const cCurr = candles[i];
    const cNext = candles[i + 1];

    // 1. MANAGE OPEN TRADE (Check Target 1, Target 2, Stop Loss, or Timeout)
    if (inTrade && activeTrade.entryPrice && activeTrade.stopLossPrice && activeTrade.target1Price && activeTrade.target2Price) {
      const holding = i - entryIndex;
      const isLong = activeTrade.direction === "LONG";

      let exitPrice: number | null = null;
      let outcome: BacktestTrade["outcome"] | null = null;

      if (isLong) {
        // Check Stop Loss touch on current candle low
        if (cCurr.low <= activeTrade.stopLossPrice) {
          exitPrice = activeTrade.stopLossPrice;
          outcome = "STOP_LOSS";
        } else if (cCurr.high >= activeTrade.target2Price) {
          exitPrice = activeTrade.target2Price;
          outcome = "TARGET_2";
        } else if (cCurr.high >= activeTrade.target1Price) {
          exitPrice = activeTrade.target1Price;
          outcome = "TARGET_1";
        } else if (holding >= maxHoldingCandles) {
          exitPrice = cCurr.close;
          outcome = "TIME_EXIT";
        }
      } else {
        // Short trade checks
        if (cCurr.high >= activeTrade.stopLossPrice) {
          exitPrice = activeTrade.stopLossPrice;
          outcome = "STOP_LOSS";
        } else if (cCurr.low <= activeTrade.target2Price) {
          exitPrice = activeTrade.target2Price;
          outcome = "TARGET_2";
        } else if (cCurr.low <= activeTrade.target1Price) {
          exitPrice = activeTrade.target1Price;
          outcome = "TARGET_1";
        } else if (holding >= maxHoldingCandles) {
          exitPrice = cCurr.close;
          outcome = "TIME_EXIT";
        }
      }

      if (exitPrice !== null && outcome !== null) {
        // Apply exit slippage (0.05%)
        const slip = exitPrice * slippagePct * 0.01;
        const actualExitPrice = isLong ? exitPrice - slip : exitPrice + slip;

        const pnlPoints = isLong
          ? actualExitPrice - activeTrade.entryPrice
          : activeTrade.entryPrice - actualExitPrice;

        const riskPerShare = Math.abs(activeTrade.entryPrice - activeTrade.stopLossPrice);
        const rMultiple = riskPerShare > 0 ? Number((pnlPoints / riskPerShare).toFixed(2)) : 0;
        const pnlPct = Number(((pnlPoints / activeTrade.entryPrice) * 100).toFixed(2));

        // Position sizing based on capital
        const maxRiskAmount = (currentEquity * riskPerTradePct) / 100;
        let qty = riskPerShare > 0 ? Math.floor(maxRiskAmount / riskPerShare) : 1;
        if (lotSize > 1) {
          qty = Math.max(1, Math.floor(qty / lotSize)) * lotSize;
        }

        const tradeProfit = pnlPoints * qty;
        currentEquity += tradeProfit;
        if (currentEquity > peakEquity) peakEquity = currentEquity;
        const dd = ((peakEquity - currentEquity) / peakEquity) * 100;
        if (dd > maxDrawdownPct) maxDrawdownPct = dd;

        equityCurve.push({
          time: cCurr.time,
          equity: Number(currentEquity.toFixed(2)),
          drawdown: Number(dd.toFixed(2)),
        });

        trades.push({
          id: `bt_${trades.length + 1}`,
          entryTime: activeTrade.entryTime!,
          entryDate: activeTrade.entryDate!,
          exitTime: cCurr.time,
          exitDate: cCurr.date,
          direction: activeTrade.direction!,
          entryPrice: Number(activeTrade.entryPrice.toFixed(2)),
          exitPrice: Number(actualExitPrice.toFixed(2)),
          stopLossPrice: Number(activeTrade.stopLossPrice.toFixed(2)),
          target1Price: Number(activeTrade.target1Price.toFixed(2)),
          target2Price: Number(activeTrade.target2Price.toFixed(2)),
          outcome,
          pnlPoints: Number(pnlPoints.toFixed(2)),
          pnlPercentage: pnlPct,
          rMultiple,
          holdingCandles: holding,
          reason: outcome === "TARGET_2" ? "Target 2 (1:2.5 R:R) reached" : outcome === "TARGET_1" ? "Target 1 (1:1.5 R:R) reached" : outcome === "STOP_LOSS" ? "Stop loss hit" : "Intraday time exit",
        });

        inTrade = false;
        activeTrade = {};
      }
      continue;
    }

    // 2. EVALUATE ENTRY SIGNAL AT CANDLE `i` (WITHOUT LOOKAHEAD)
    const currE9 = ema9[i];
    const currE21 = ema21[i];
    const currE50 = ema50[i];
    const currRsi = rsi[i];
    const currAtr = atr[i];
    const currVwap = vwapRes.values[i];
    const currRvol = rvol[i] || 1.0;

    if (!currE9 || !currE21 || !currE50 || !currRsi || !currAtr || !currVwap) {
      continue;
    }

    // Bullish Confluence Condition:
    // EMA 9 > EMA 21 > EMA 50, Price > VWAP, RSI between 52 and 68, RVol > 1.1x
    const isBullSignal =
      currE9 > currE21 &&
      currE21 > currE50 &&
      cCurr.close > currVwap &&
      currRsi >= 52 &&
      currRsi <= 68 &&
      currRvol >= 1.1;

    // Bearish Confluence Condition:
    // EMA 9 < EMA 21 < EMA 50, Price < VWAP, RSI between 32 and 48, RVol > 1.1x
    const isBearSignal =
      currE9 < currE21 &&
      currE21 < currE50 &&
      cCurr.close < currVwap &&
      currRsi >= 32 &&
      currRsi <= 48 &&
      currRvol >= 1.1;

    if (!inTrade && (isBullSignal || isBearSignal)) {
      const dir: "LONG" | "SHORT" = isBullSignal ? "LONG" : "SHORT";

      // Entry executed at NEXT candle's open price (NO LOOKAHEAD BIAS) + slippage
      const rawEntryPrice = cNext.open;
      const slip = rawEntryPrice * slippagePct * 0.01;
      const entryPrice = dir === "LONG" ? rawEntryPrice + slip : rawEntryPrice - slip;

      const stopDist = currAtr * 1.5;
      const stopLossPrice = dir === "LONG" ? entryPrice - stopDist : entryPrice + stopDist;
      const target1Price = dir === "LONG" ? entryPrice + stopDist * 1.5 : entryPrice - stopDist * 1.5;
      const target2Price = dir === "LONG" ? entryPrice + stopDist * 2.5 : entryPrice - stopDist * 2.5;

      inTrade = true;
      entryIndex = i + 1;
      activeTrade = {
        direction: dir,
        entryPrice,
        entryTime: cNext.time,
        entryDate: cNext.date,
        stopLossPrice,
        target1Price,
        target2Price,
      };
    }
  }

  // 3. AGGREGATE PERFORMANCE METRICS
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.pnlPoints > 0).length;
  const losingTrades = trades.filter((t) => t.pnlPoints < 0).length;
  const winRatePct = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(1)) : 0;

  const totalWinPoints = trades.filter((t) => t.pnlPoints > 0).reduce((acc, t) => acc + t.pnlPoints, 0);
  const totalLossPoints = Math.abs(trades.filter((t) => t.pnlPoints < 0).reduce((acc, t) => acc + t.pnlPoints, 0));

  const avgWinPoints = winningTrades > 0 ? totalWinPoints / winningTrades : 0;
  const avgLossPoints = losingTrades > 0 ? totalLossPoints / losingTrades : 0;
  const profitFactor = totalLossPoints > 0 ? Number((totalWinPoints / totalLossPoints).toFixed(2)) : totalWinPoints > 0 ? 99 : 0;

  const totalR = trades.reduce((acc, t) => acc + t.rMultiple, 0);
  const netExpectancyR = totalTrades > 0 ? Number((totalR / totalTrades).toFixed(2)) : 0;
  const netProfitPoints = Number((totalWinPoints - totalLossPoints).toFixed(2));

  return {
    instrumentKey,
    timeframe,
    totalCandlesTested: candles.length,
    totalTrades,
    winningTrades,
    losingTrades,
    winRatePct,
    avgWinR: Number(avgWinPoints.toFixed(2)),
    avgLossR: Number(avgLossPoints.toFixed(2)),
    profitFactor,
    netExpectancyR,
    netProfitPoints,
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    equityCurve,
    trades: trades.slice(-50), // keep latest 50 for display
    strategyWeights: {
      priceActionScore: DEFAULT_FACTOR_WEIGHTS.priceAction,
      optionChainScore: DEFAULT_FACTOR_WEIGHTS.optionChain,
      multiTimeframeScore: DEFAULT_FACTOR_WEIGHTS.multiTimeframe,
      volumeBreakoutScore: DEFAULT_FACTOR_WEIGHTS.volumeBreakout,
      marketContextScore: DEFAULT_FACTOR_WEIGHTS.marketContext,
      momentumVolatilityScore: DEFAULT_FACTOR_WEIGHTS.momentumVolatility,
    },
  };
}
