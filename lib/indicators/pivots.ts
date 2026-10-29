export interface PivotLevels {
  pivot: number;
  r1: number;
  s1: number;
  r2: number;
  s2: number;
  nearest_support: number | null;
  nearest_resistance: number | null;
  recent_swing_high: number;
  recent_swing_low: number;
}

/**
 * Calculates Classical Floor Pivot Points and Dynamic Swing S/R from validated candle data
 */
export function calculatePivotLevels(
  candles: { high: number; low: number; close: number }[],
  currentPrice: number
): PivotLevels | null {
  if (!candles || candles.length < 5) {
    return null;
  }

  // Use recent lookback (e.g. last 30 candles)
  const lookback = Math.min(candles.length, 30);
  const slice = candles.slice(-lookback);

  let high = -Infinity;
  let low = Infinity;
  let lastClose = slice[slice.length - 1].close;

  for (const c of slice) {
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
  }

  const pivot = Number(((high + low + lastClose) / 3).toFixed(2));
  const r1 = Number((2 * pivot - low).toFixed(2));
  const s1 = Number((2 * pivot - high).toFixed(2));
  const r2 = Number((pivot + (high - low)).toFixed(2));
  const s2 = Number((pivot - (high - low)).toFixed(2));

  // Find nearest support (< currentPrice) and resistance (> currentPrice)
  const allLevels = [s2, s1, pivot, r1, r2, low, high].sort((a, b) => a - b);
  const supports = allLevels.filter((l) => l < currentPrice);
  const resistances = allLevels.filter((l) => l > currentPrice);

  const nearest_support = supports.length > 0 ? supports[supports.length - 1] : s1;
  const nearest_resistance = resistances.length > 0 ? resistances[0] : r1;

  return {
    pivot,
    r1,
    s1,
    r2,
    s2,
    nearest_support: Number(nearest_support.toFixed(2)),
    nearest_resistance: Number(nearest_resistance.toFixed(2)),
    recent_swing_high: Number(high.toFixed(2)),
    recent_swing_low: Number(low.toFixed(2)),
  };
}
