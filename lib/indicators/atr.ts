export interface CandleHLCPartial {
  high: number;
  low: number;
  close: number;
}

/**
 * Average True Range (ATR)
 * Standard Wilder's smoothed ATR calculation.
 * 
 * @param candles Array of { high, low, close } chronologically ordered
 * @param period Lookback period (default 14)
 * @returns Array of ATR values (null for warm-up period)
 */
export function calculateATR(
  candles: CandleHLCPartial[],
  period: number = 14
): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);

  if (!candles || candles.length <= period || period <= 0) {
    return result;
  }

  // Calculate True Range (TR) for each candle
  const trs: number[] = new Array(candles.length);
  trs[0] = candles[0].high - candles[0].low;

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prevClose = candles[i - 1].close;

    const tr1 = current.high - current.low;
    const tr2 = Math.abs(current.high - prevClose);
    const tr3 = Math.abs(current.low - prevClose);

    trs[i] = Math.max(tr1, tr2, tr3);
  }

  // Initial ATR = SMA of initial TRs
  let trSum = 0;
  for (let i = 1; i <= period; i++) {
    trSum += trs[i];
  }
  let prevAtr = trSum / period;
  result[period] = Number(prevAtr.toFixed(2));

  // Subsequent ATR with Wilder's smoothing
  for (let i = period + 1; i < candles.length; i++) {
    const currentAtr = (prevAtr * (period - 1) + trs[i]) / period;
    result[i] = Number(currentAtr.toFixed(2));
    prevAtr = currentAtr;
  }

  return result;
}
