import { calculateEMA } from "./ema";

export interface MACDCalculationResult {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
}

/**
 * Moving Average Convergence Divergence (MACD)
 * Standard parameters: Fast = 12, Slow = 26, Signal = 9.
 * Strictly chronological calculation without lookahead bias.
 * 
 * @param prices Array of close prices (chronological: oldest to newest)
 * @param fastPeriod Fast EMA period (default 12)
 * @param slowPeriod Slow EMA period (default 26)
 * @param signalPeriod Signal EMA period (default 9)
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDCalculationResult {
  const len = prices.length;
  const macdLine: (number | null)[] = new Array(len).fill(null);
  const signalLine: (number | null)[] = new Array(len).fill(null);
  const histogram: (number | null)[] = new Array(len).fill(null);

  if (!prices || len < slowPeriod + signalPeriod) {
    return { macdLine, signalLine, histogram };
  }

  // 1. Calculate Fast EMA (12) and Slow EMA (26)
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  // 2. MACD Line = Fast EMA - Slow EMA
  const validMacdValues: number[] = [];
  const validMacdIndices: number[] = [];

  for (let i = 0; i < len; i++) {
    const f = fastEMA[i];
    const s = slowEMA[i];
    if (f !== null && s !== null) {
      const macdVal = Number((f - s).toFixed(2));
      macdLine[i] = macdVal;
      validMacdValues.push(macdVal);
      validMacdIndices.push(i);
    }
  }

  // 3. Signal Line = 9-period EMA of MACD Line
  if (validMacdValues.length >= signalPeriod) {
    const signalValues = calculateEMA(validMacdValues, signalPeriod);
    for (let j = 0; j < validMacdValues.length; j++) {
      const origIndex = validMacdIndices[j];
      const sig = signalValues[j];
      signalLine[origIndex] = sig;

      // 4. Histogram = MACD Line - Signal Line
      if (sig !== null && macdLine[origIndex] !== null) {
        histogram[origIndex] = Number(((macdLine[origIndex] as number) - sig).toFixed(2));
      }
    }
  }

  return { macdLine, signalLine, histogram };
}
