/**
 * Relative Strength Index (RSI)
 * Standard Wilder's smoothing method.
 * 
 * @param prices Array of close prices (chronological: oldest to newest)
 * @param period Lookback period (default 14)
 * @returns Array of RSI values between 0 and 100 (null for warm-up period)
 */
export function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);

  if (!prices || prices.length <= period || period <= 0) {
    return result;
  }

  let gains = 0;
  let losses = 0;

  // First period changes
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // First RSI value
  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = Number((100 - 100 / (1 + rs)).toFixed(2));
  }

  // Subsequent values using Wilder's smoothing
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = Number((100 - 100 / (1 + rs)).toFixed(2));
    }
  }

  return result;
}
