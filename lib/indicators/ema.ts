/**
 * Exponential Moving Average (EMA)
 * Strictly chronological calculation without look-ahead bias.
 * 
 * @param prices Array of close prices in chronological order (oldest to newest)
 * @param period Lookback period (e.g., 20 or 50)
 * @returns Array of EMA values (same length as prices, null for warm-up period)
 */
export function calculateEMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);

  if (!prices || prices.length < period || period <= 0) {
    return result;
  }

  // Calculate initial SMA for the first period
  let initialSum = 0;
  for (let i = 0; i < period; i++) {
    initialSum += prices[i];
  }
  let prevEma = initialSum / period;
  result[period - 1] = Number(prevEma.toFixed(2));

  // Multiplier: 2 / (period + 1)
  const multiplier = 2 / (period + 1);

  // Calculate subsequent EMAs
  for (let i = period; i < prices.length; i++) {
    const currentPrice = prices[i];
    const currentEma = (currentPrice - prevEma) * multiplier + prevEma;
    result[i] = Number(currentEma.toFixed(2));
    prevEma = currentEma;
  }

  return result;
}
