/**
 * Relative Volume (RVol) Indicator
 * Compares candle volume against a 20-period rolling simple moving average of volume.
 * 
 * @param volumes Array of candle volumes (chronological)
 * @param period Lookback period (default 20)
 * @returns Array of RVol multipliers (e.g. 1.5 = 150% of average volume)
 */
export function calculateRVol(volumes: number[], period: number = 20): (number | null)[] {
  const len = volumes.length;
  const result: (number | null)[] = new Array(len).fill(null);

  if (!volumes || len < period) {
    return result;
  }

  let rollingSum = 0;
  for (let i = 0; i < period; i++) {
    rollingSum += volumes[i];
  }

  for (let i = period - 1; i < len; i++) {
    if (i >= period) {
      rollingSum += volumes[i] - volumes[i - period];
    }
    const avgVol = rollingSum / period;
    if (avgVol > 0) {
      result[i] = Number((volumes[i] / avgVol).toFixed(2));
    } else {
      result[i] = 1.0;
    }
  }

  return result;
}
