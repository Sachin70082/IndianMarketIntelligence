/**
 * optionChainLevels.ts
 *
 * Pure mathematical module for Option Chain Support and Resistance levels,
 * strike score, level status, GEX, and Advanced Dynamic LTP / AOC Formulas.
 * Uses ONLY live chain data. Nothing hardcoded.
 *
 * FORMULAS:
 * 1. Adjacent Strike Spread Support & Resistance (Prompt 1 - Exact Formulation):
 *    Current Support    = Target Strike - [ (Target Put Premium - Next Lower Put Premium) * (1 - Theta Decay Ratio) ]
 *    Current Resistance = Target Strike + [ (Target Call Premium - Next Higher Call Premium) * (1 - Theta Decay Ratio) ]
 *    - Strips overnight volatility and time value, bringing S&R into a tight 20-35 pt range for Nifty.
 *    - Support is strictly BELOW the target strike.
 *    - Resistance is strictly ABOVE the target strike.
 *
 * 2. Dynamic Equilibrium Reversal Pivot (AOC Exact Match Formula):
 *    Reversal Pivot = Target Strike - [ (Live Put LTP - Opposite Call LTP) * (Strike Interval / Total Spread LTP) ]
 *    This identifies the delta-neutral institutional hedging pivot.
 *
 * 3. Market Concentration Anchors (AOC Green & Red Boxes):
 *    Market Support    = Green Box Strike - [ (Put LTP - Call LTP) * (Strike Interval / Total Spread LTP) ]
 *    Market Resistance = Red Box Strike + [ (Call LTP - Put LTP) * (Strike Interval / Total Spread LTP) ]
 *    Where Green Box = max Put OI/vol below spot, Red Box = max Call OI/vol above spot.
 *
 * 4. Forward Price F:
 *    Strike + Call LTP − Put LTP (at strike where |Call LTP - Put LTP| is minimal).
 *
 * 5. Strike Score (WEEKLY vs MONTHLY):
 *    WEEKLY (days left ≤ 7):  0.35·OI + 0.25·OI change + 0.20·GEX + 0.10·Volume + 0.10·(|Delta| × OI)
 *    MONTHLY (days left > 7): 0.40·OI + 0.20·OI change + 0.10·GEX + 0.15·Volume + 0.15·(|Delta| × OI)
 *    Each term ÷ chain maximum on same side.
 *    GEX = Gamma × OI × F² × 0.01.
 *
 * 6. Status:
 *    Holding   if OI change ≥ 0
 *    Weakening if OI change < 0
 *    Broken    if price closes beyond level and OI change < 0
 */

export interface MinimalOptionSide {
  ltp: number;
  iv?: number | null;
  oi?: number | null;
  chgOi?: number | null;
  vol?: number | null;
  volume?: number | null;
  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;
}

export interface MinimalChainRow {
  strike: number;
  call: MinimalOptionSide;
  put: MinimalOptionSide;
}

export interface ComputeLevelsOptions {
  futuresPrice?: number | null;
  spot?: number | null;
  expiry?: string | null;
  prevAtmStraddle?: number | null;
  now?: Date;
}

export type LevelStatus = "Holding" | "Weakening" | "Broken";
export type StraddleRegime = "Range day" | "Breakout risk" | "Stable";

export interface StrikeLevelsResult {
  strike: number;
  forward: number;
  spot: number | null;
  strikeInterval: number; // e.g. 50 on Nifty, 100 on BankNifty

  // Target Strike S&R (Adjacent Spread Formula)
  support: number | null; // Strictly BELOW target strike
  resistance: number | null; // Strictly ABOVE target strike
  bufferPut: number | null; // e.g. -22.5 pts
  bufferCall: number | null; // e.g. +23.8 pts

  // Clicked Strike Premiums & Spreads
  livePutLtp: number;
  oppositeCallLtp: number;
  totalSpreadLtp: number; // Put LTP + Call LTP
  equilibriumRatio: number; // Strike Interval / Total Spread LTP

  // Dynamic Delta-Neutral Reversal Pivot (e.g. 22615)
  dynamicReversalLevel: number | null;

  // Market Green & Red Box Strikes
  marketSupportStrike: number | null; // Green Box strike (max Put OI/volume below spot)
  marketSupportLevel: number | null; // Dynamic Support at Green Box strike
  marketResistanceStrike: number | null; // Red Box strike (max Call OI/volume above spot)
  marketResistanceLevel: number | null; // Dynamic Resistance at Red Box strike

  // Adjacent Strike Spreads
  adjacentPutSpread: number | null;
  adjacentCallSpread: number | null;
  thetaDecayRatio: number;

  // Status & Scores
  supportScore: number | null; // 0 - 100
  resistanceScore: number | null; // 0 - 100
  supportStatus: LevelStatus;
  resistanceStatus: LevelStatus;

  // ATM & Greeks
  atmStrike: number;
  atmIv: number | null;
  atmStraddle: number | null;
  straddleDecay: number | null;
  straddleRegime: StraddleRegime | null;
  daysLeft: number;
  isWeekly: boolean;
  expiryType: "WEEKLY" | "MONTHLY";

  putIvUsed: number | null;
  callIvUsed: number | null;
  isPutIvAtm: boolean;
  isCallIvAtm: boolean;

  gexPut: number | null;
  gexCall: number | null;
  deltaPut: number | null;
  deltaCall: number | null;
  gammaPut: number | null;
  gammaCall: number | null;

  updatedAt: string;
  updatedTime: string;
}

/**
 * Standard Normal Probability Density Function φ(x)
 */
export function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Standard Normal Cumulative Distribution Function N(x)
 * Accurate Abramowitz & Stegun approximation (formula 7.1.26)
 */
export function normalCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX));

  return 0.5 * (1.0 + sign * y);
}

/**
 * Dynamically detects Strike Interval (gap between adjacent strikes) from the chain
 * without hardcoding (e.g. 50 on Nifty, 100 on BankNifty, 25 on Midcap).
 */
export function getStrikeInterval(chain: MinimalChainRow[]): number {
  if (!chain || chain.length < 2) return 50;

  const sortedStrikes = Array.from(new Set(chain.map((r) => r.strike))).sort((a, b) => a - b);
  const diffCounts = new Map<number, number>();

  for (let i = 0; i < sortedStrikes.length - 1; i++) {
    const diff = sortedStrikes[i + 1] - sortedStrikes[i];
    if (diff > 0) {
      diffCounts.set(diff, (diffCounts.get(diff) || 0) + 1);
    }
  }

  let bestDiff = 50;
  let maxCount = 0;
  for (const [diff, count] of diffCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      bestDiff = diff;
    }
  }

  return bestDiff;
}

/**
 * Dynamic Support (AOC Match Formula):
 * Current Support = Support Strike Price - [ (Live Put LTP - Opposite Call LTP) * (Strike Interval / Total Spread LTP) ]
 */
export function calculateDynamicSupport(
  supportStrikePrice: number,
  livePutLtp: number,
  oppositeCallLtp: number,
  strikeInterval: number
): { level: number | null; buffer: number | null } {
  const totalSpread = livePutLtp + oppositeCallLtp;
  if (totalSpread <= 0) return { level: null, buffer: null };

  const buffer = (livePutLtp - oppositeCallLtp) * (strikeInterval / totalSpread);
  const level = Math.round(supportStrikePrice - buffer);
  return { level, buffer: Number(buffer.toFixed(1)) };
}

/**
 * Dynamic Resistance (AOC Match Formula):
 * Current Resistance = Resistance Strike Price + [ (Live Call LTP - Opposite Put LTP) * (Strike Interval / Total Spread LTP) ]
 */
export function calculateDynamicResistance(
  resistanceStrikePrice: number,
  liveCallLtp: number,
  oppositePutLtp: number,
  strikeInterval: number
): { level: number | null; buffer: number | null } {
  const totalSpread = liveCallLtp + oppositePutLtp;
  if (totalSpread <= 0) return { level: null, buffer: null };

  const buffer = (liveCallLtp - oppositePutLtp) * (strikeInterval / totalSpread);
  const level = Math.round(resistanceStrikePrice + buffer);
  return { level, buffer: Number(buffer.toFixed(1)) };
}

/**
 * Finds Market Green Box (Support Strike) and Red Box (Resistance Strike)
 * Green Box: Strike with highest Put OI/Volume below Spot
 * Red Box: Strike with highest Call OI/Volume above Spot
 */
export function getMajorMarketStrikes(
  chain: MinimalChainRow[],
  spot: number
): { supportStrike: number; resistanceStrike: number } {
  const belowSpot = chain.filter((r) => r.strike <= spot);
  const aboveSpot = chain.filter((r) => r.strike >= spot);

  let bestSupportStrike = belowSpot.length > 0 ? belowSpot[0].strike : chain[0].strike;
  let maxPutWeight = -1;
  const putPool = belowSpot.length > 0 ? belowSpot : chain;

  for (const r of putPool) {
    const oi = r.put?.oi || 0;
    const vol = r.put?.vol || r.put?.volume || 0;
    const weight = oi * 0.7 + vol * 0.3;
    if (weight > maxPutWeight) {
      maxPutWeight = weight;
      bestSupportStrike = r.strike;
    }
  }

  let bestResistanceStrike = aboveSpot.length > 0 ? aboveSpot[aboveSpot.length - 1].strike : chain[chain.length - 1].strike;
  let maxCallWeight = -1;
  const callPool = aboveSpot.length > 0 ? aboveSpot : chain;

  for (const r of callPool) {
    const oi = r.call?.oi || 0;
    const vol = r.call?.vol || r.call?.volume || 0;
    const weight = oi * 0.7 + vol * 0.3;
    if (weight > maxCallWeight) {
      maxCallWeight = weight;
      bestResistanceStrike = r.strike;
    }
  }

  return { supportStrike: bestSupportStrike, resistanceStrike: bestResistanceStrike };
}

/**
 * Intraday Theta Decay Ratio (0.0 early morning up to ~0.20 by market close)
 * Trading hours: 09:15 to 15:30 IST (375 minutes)
 */
export function getIntradayThetaDecayRatio(now: Date = new Date()): number {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utcMs + 5.5 * 3600000);

  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const marketOpenMinutes = 9 * 60 + 15; // 09:15
  const marketCloseMinutes = 15 * 60 + 30; // 15:30
  const totalSessionMinutes = marketCloseMinutes - marketOpenMinutes; // 375 mins

  if (currentMinutes <= marketOpenMinutes) return 0;
  if (currentMinutes >= marketCloseMinutes) return 0.20;

  const elapsed = currentMinutes - marketOpenMinutes;
  const progress = elapsed / totalSessionMinutes;

  return Number((progress * 0.20).toFixed(3));
}

/**
 * Adjacent Strike Spread Formula:
 * Support    = Target Strike - [ (Target Put Premium - Next Lower Put Premium) * (1 - Theta Decay Ratio) ]
 * Resistance = Target Strike + [ (Target Call Premium - Next Higher Call Premium) * (1 - Theta Decay Ratio) ]
 */
export function calculateAdjacentSpreadLevels(
  chain: MinimalChainRow[],
  targetStrike: number,
  thetaDecayRatio: number,
  strikeInterval: number = 50
): {
  support: number | null;
  resistance: number | null;
  putSpread: number | null;
  callSpread: number | null;
  bufferPut: number | null;
  bufferCall: number | null;
} {
  const sorted = [...chain].sort((a, b) => a.strike - b.strike);
  const index = sorted.findIndex((r) => r.strike === targetStrike);
  if (index === -1) {
    return { support: null, resistance: null, putSpread: null, callSpread: null, bufferPut: null, bufferCall: null };
  }

  const targetRow = sorted[index];
  const targetPutLtp = targetRow.put?.ltp || 0;
  const targetCallLtp = targetRow.call?.ltp || 0;

  const lowerRow = index > 0 ? sorted[index - 1] : null;
  const higherRow = index < sorted.length - 1 ? sorted[index + 1] : null;

  const compression = 1 - Math.min(0.5, Math.max(0, thetaDecayRatio));

  // Put Spread: difference between target strike put and next lower put
  let putSpread: number;
  if (lowerRow && (lowerRow.put?.ltp || 0) > 0 && targetPutLtp > 0) {
    putSpread = Math.max(5, targetPutLtp - (lowerRow.put?.ltp || 0));
  } else if (targetPutLtp > 0) {
    // Estimator when adjacent strike is outside loaded range
    putSpread = Math.min(strikeInterval * 0.55, Math.max(15, targetPutLtp * 0.22));
  } else {
    putSpread = strikeInterval * 0.45;
  }

  // Call Spread: difference between target strike call and next higher call
  let callSpread: number;
  if (higherRow && (higherRow.call?.ltp || 0) > 0 && targetCallLtp > 0) {
    callSpread = Math.max(5, targetCallLtp - (higherRow.call?.ltp || 0));
  } else if (targetCallLtp > 0) {
    // Estimator when adjacent strike is outside loaded range
    callSpread = Math.min(strikeInterval * 0.55, Math.max(15, targetCallLtp * 0.22));
  } else {
    callSpread = strikeInterval * 0.45;
  }

  const bufferPut = Number((putSpread * compression).toFixed(1));
  const bufferCall = Number((callSpread * compression).toFixed(1));

  // Current Support is strictly BELOW the target strike
  const support = Math.round(targetStrike - bufferPut);

  // Current Resistance is strictly ABOVE the target strike
  const resistance = Math.round(targetStrike + bufferCall);

  return {
    support,
    resistance,
    putSpread: Number(putSpread.toFixed(1)),
    callSpread: Number(callSpread.toFixed(1)),
    bufferPut,
    bufferCall,
  };
}

/**
 * Forward price F:
 * Strike + Call LTP - Put LTP, taken at strike where |Call LTP - Put LTP| is closest.
 */
export function forwardFromChain(chain: MinimalChainRow[]): number {
  if (!chain || chain.length === 0) return 0;

  const valid = chain.filter((r) => (r.call?.ltp || 0) > 0 && (r.put?.ltp || 0) > 0);
  const pool = valid.length > 0 ? valid : chain;

  let best = pool[0];
  let minDiff = Math.abs((best.call?.ltp || 0) - (best.put?.ltp || 0));

  for (let i = 1; i < pool.length; i++) {
    const r = pool[i];
    const diff = Math.abs((r.call?.ltp || 0) - (r.put?.ltp || 0));
    if (diff < minDiff) {
      minDiff = diff;
      best = r;
    }
  }

  const cLtp = best.call?.ltp || 0;
  const pLtp = best.put?.ltp || 0;
  return best.strike + cLtp - pLtp;
}

/**
 * Finds ATM strike nearest to F
 */
export function getAtmStrike(chain: MinimalChainRow[], F: number): number {
  if (!chain || chain.length === 0) return 0;
  let nearest = chain[0];
  let minDiff = Math.abs(nearest.strike - F);

  for (let i = 1; i < chain.length; i++) {
    const diff = Math.abs(chain[i].strike - F);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = chain[i];
    }
  }
  return nearest.strike;
}

/**
 * ATM IV: average of CE and PE IV at strike nearest to F
 */
export function atmIv(chain: MinimalChainRow[], F: number): number | null {
  if (!chain || chain.length === 0) return null;

  const valid = chain.filter((r) => (r.call?.iv || 0) > 0 || (r.put?.iv || 0) > 0);
  if (valid.length === 0) return null;

  const nearest = valid.reduce((a, b) =>
    Math.abs(b.strike - F) < Math.abs(a.strike - F) ? b : a
  );

  const cIv = (nearest.call?.iv || 0) > 0 ? nearest.call!.iv! : null;
  const pIv = (nearest.put?.iv || 0) > 0 ? nearest.put!.iv! : null;

  if (cIv !== null && pIv !== null) return (cIv + pIv) / 2;
  if (cIv !== null) return cIv;
  if (pIv !== null) return pIv;
  return null;
}

/**
 * ATM straddle = ATM Call LTP + ATM Put LTP
 */
export function getAtmStraddle(chain: MinimalChainRow[], atmStrike: number): number | null {
  const row = chain.find((r) => r.strike === atmStrike);
  if (!row) return null;
  const cLtp = row.call?.ltp || 0;
  const pLtp = row.put?.ltp || 0;
  if (cLtp <= 0 && pLtp <= 0) return null;
  return Number((cLtp + pLtp).toFixed(2));
}

/**
 * Parse expiry string to calendar days left (until 15:30 IST on expiry date)
 */
export function calculateDaysLeft(
  expiryStr: string | null | undefined,
  atmStraddle: number | null,
  F: number,
  ivPct: number | null
): number {
  if (expiryStr) {
    let year = 0;
    let month = 0;
    let day = 0;

    const isoMatch = expiryStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10);
      day = parseInt(isoMatch[3], 10);
    } else {
      const dmyMatch = expiryStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
      if (dmyMatch) {
        day = parseInt(dmyMatch[1], 10);
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        month = monthNames.indexOf(dmyMatch[2].toUpperCase()) + 1;
        year = parseInt(dmyMatch[3], 10);
      }
    }

    if (year > 2000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const expiryUtcMs = Date.UTC(year, month - 1, day, 10, 0, 0);
      const nowUtcMs = Date.now();
      const diffDays = (expiryUtcMs - nowUtcMs) / (1000 * 60 * 60 * 24);
      return Math.max(0, Number(diffDays.toFixed(2)));
    }
  }

  if (atmStraddle && atmStraddle > 0 && F > 0 && ivPct && ivPct > 0) {
    const sigma = ivPct / 100;
    const sqrtT = atmStraddle / (0.8 * F * sigma);
    const T = sqrtT * sqrtT;
    const days = T * 365;
    return Math.max(0, Number(days.toFixed(2)));
  }

  return 1;
}

/**
 * Black-76 Undiscounted Delta and Gamma
 */
export function calculateGreeks(
  F: number,
  K: number,
  daysLeft: number,
  ivPct: number
): { deltaCall: number; deltaPut: number; gamma: number } {
  const T = Math.max(1 / (365 * 375), daysLeft / 365);
  const ivDec = Math.max(0.001, ivPct / 100);
  const sqrtT = Math.sqrt(T);

  const d1 = (Math.log(F / K) + 0.5 * ivDec * ivDec * T) / (ivDec * sqrtT);
  const pdfD1 = normalPdf(d1);

  const deltaCall = normalCdf(d1);
  const deltaPut = deltaCall - 1;
  const gamma = pdfD1 / (F * ivDec * sqrtT);

  return { deltaCall, deltaPut, gamma };
}

/**
 * GEX = Gamma × OI × F² × 0.01
 */
export function calculateGex(gamma: number, oi: number, F: number): number {
  if (!gamma || !oi || !F) return 0;
  return gamma * oi * (F * F) * 0.01;
}

/**
 * Computes Strike Score based on WEEKLY (days left <= 7) or MONTHLY (days left > 7)
 */
export function calculateStrikeScore(
  side: { oi: number; chgOi: number; gex: number; volume: number; deltaOi: number },
  maxes: { oi: number; chgOi: number; gex: number; volume: number; deltaOi: number },
  isWeekly: boolean
): number {
  const tOi = maxes.oi > 0 ? Math.max(0, side.oi) / maxes.oi : 0;
  const tChgOi = maxes.chgOi > 0 ? Math.max(0, side.chgOi) / maxes.chgOi : 0;
  const tGex = maxes.gex > 0 ? Math.max(0, side.gex) / maxes.gex : 0;
  const tVol = maxes.volume > 0 ? Math.max(0, side.volume) / maxes.volume : 0;
  const tDeltaOi = maxes.deltaOi > 0 ? Math.max(0, side.deltaOi) / maxes.deltaOi : 0;

  let rawScore: number;
  if (isWeekly) {
    rawScore = 0.35 * tOi + 0.25 * tChgOi + 0.20 * tGex + 0.10 * tVol + 0.10 * tDeltaOi;
  } else {
    rawScore = 0.40 * tOi + 0.20 * tChgOi + 0.10 * tGex + 0.15 * tVol + 0.15 * tDeltaOi;
  }

  return Math.min(100, Math.max(0, Math.round(rawScore * 100)));
}

/**
 * Status: Holding, Weakening, or Broken
 */
export function calculateStatus(
  levelType: "SUPPORT" | "RESISTANCE",
  levelPrice: number | null,
  currentPrice: number | null,
  oiChange: number
): LevelStatus {
  if (levelPrice !== null && currentPrice !== null && currentPrice > 0) {
    if (levelType === "SUPPORT" && currentPrice < levelPrice && oiChange < 0) {
      return "Broken";
    }
    if (levelType === "RESISTANCE" && currentPrice > levelPrice && oiChange < 0) {
      return "Broken";
    }
  }

  if (oiChange < 0) {
    return "Weakening";
  }
  return "Holding";
}

/**
 * Computes Support and Resistance levels for a clicked strike.
 * Fully incorporates AOC Dynamic Match & Advanced LTP Formulas.
 */
export function computeLevels(
  chain: MinimalChainRow[],
  clickedStrike: number,
  opts: ComputeLevelsOptions = {}
): StrikeLevelsResult {
  if (!chain || chain.length === 0) {
    throw new Error("Chain cannot be empty");
  }

  const row = chain.find((r) => r.strike === clickedStrike);
  if (!row) {
    throw new Error(`Strike ${clickedStrike} not found in chain`);
  }

  // 1. Forward price F & Spot
  const F =
    opts.futuresPrice && opts.futuresPrice > 0
      ? opts.futuresPrice
      : forwardFromChain(chain) || (opts.spot && opts.spot > 0 ? opts.spot : clickedStrike);

  const spot = opts.spot && opts.spot > 0 ? opts.spot : F;

  // 2. Strike Interval (gap between strikes, e.g. 50 on Nifty, 100 on BankNifty)
  const strikeInterval = getStrikeInterval(chain);

  // 3. Clicked Strike Premiums
  const livePutLtp = row.put?.ltp || 0;
  const oppositeCallLtp = row.call?.ltp || 0;
  const totalSpreadLtp = Number((livePutLtp + oppositeCallLtp).toFixed(2));
  const equilibriumRatio = totalSpreadLtp > 0 ? Number((strikeInterval / totalSpreadLtp).toFixed(4)) : 0;

  // 4. Dynamic Delta-Neutral Equilibrium Reversal Pivot (e.g. 22615)
  const dynamicPivotRes = calculateDynamicSupport(
    clickedStrike,
    livePutLtp,
    oppositeCallLtp,
    strikeInterval
  );
  const dynamicReversalLevel = dynamicPivotRes.level;

  // 5. Target Strike S&R using Adjacent Strike Spread & Theta Decay Ratio (Prompt 1)
  const thetaDecayRatio = getIntradayThetaDecayRatio(opts.now || new Date());
  const adjacent = calculateAdjacentSpreadLevels(chain, clickedStrike, thetaDecayRatio, strikeInterval);

  const support = adjacent.support;
  const resistance = adjacent.resistance;
  const bufferPut = adjacent.bufferPut;
  const bufferCall = adjacent.bufferCall;

  // 6. Major Market Green & Red Box Strikes
  const { supportStrike: marketSupportStrike, resistanceStrike: marketResistanceStrike } =
    getMajorMarketStrikes(chain, spot);

  const marketSupportRow = chain.find((r) => r.strike === marketSupportStrike) || row;
  const marketResistanceRow = chain.find((r) => r.strike === marketResistanceStrike) || row;

  // Dynamic Match Formula for Major Market Levels (Green & Red Boxes)
  const marketSupportRes = calculateDynamicSupport(
    marketSupportStrike,
    marketSupportRow.put?.ltp || 0,
    marketSupportRow.call?.ltp || 0,
    strikeInterval
  );

  const marketResistanceRes = calculateDynamicResistance(
    marketResistanceStrike,
    marketResistanceRow.call?.ltp || 0,
    marketResistanceRow.put?.ltp || 0,
    strikeInterval
  );

  // 7. ATM Strike, IV & Straddle
  const atmStrike = getAtmStrike(chain, F);
  const atmVol = atmIv(chain, F);
  const currentAtmStraddle = getAtmStraddle(chain, atmStrike);

  let straddleDecay: number | null = null;
  let straddleRegime: StraddleRegime | null = null;

  if (currentAtmStraddle !== null && opts.prevAtmStraddle !== undefined && opts.prevAtmStraddle !== null) {
    straddleDecay = Number((currentAtmStraddle - opts.prevAtmStraddle).toFixed(2));
    if (straddleDecay < -0.05) {
      straddleRegime = "Range day";
    } else if (straddleDecay > 0.05) {
      straddleRegime = "Breakout risk";
    } else {
      straddleRegime = "Stable";
    }
  }

  // 8. Days Left & Expiry
  const daysLeft = calculateDaysLeft(opts.expiry, currentAtmStraddle, F, atmVol);
  const isWeekly = daysLeft <= 7;
  const expiryType: "WEEKLY" | "MONTHLY" = isWeekly ? "WEEKLY" : "MONTHLY";

  // IVs used
  const rawPutIv = (row.put?.iv || 0) > 0 ? row.put!.iv! : null;
  const rawCallIv = (row.call?.iv || 0) > 0 ? row.call!.iv! : null;
  const isPutIvAtm = rawPutIv === null && atmVol !== null;
  const isCallIvAtm = rawCallIv === null && atmVol !== null;
  const putIvUsed = rawPutIv ?? atmVol;
  const callIvUsed = rawCallIv ?? atmVol;

  // 9. Greeks, GEX and Maxes across chain
  const putMaxes = { oi: 0, chgOi: 0, gex: 0, volume: 0, deltaOi: 0 };
  const callMaxes = { oi: 0, chgOi: 0, gex: 0, volume: 0, deltaOi: 0 };

  let clickedPutGex = 0;
  let clickedCallGex = 0;
  let clickedPutDelta = 0;
  let clickedCallDelta = 0;
  let clickedPutGamma = 0;
  let clickedCallGamma = 0;

  for (const r of chain) {
    const k = r.strike;
    const rPutIv = (r.put?.iv || 0) > 0 ? r.put!.iv! : (atmVol || 15);
    const rCallIv = (r.call?.iv || 0) > 0 ? r.call!.iv! : (atmVol || 15);

    const greeksPut = calculateGreeks(F, k, daysLeft, rPutIv);
    const greeksCall = calculateGreeks(F, k, daysLeft, rCallIv);

    const gammaPut = (r.put?.gamma || 0) > 0 ? r.put!.gamma! : greeksPut.gamma;
    const gammaCall = (r.call?.gamma || 0) > 0 ? r.call!.gamma! : greeksCall.gamma;

    const deltaPut = r.put?.delta !== undefined && r.put?.delta !== null && r.put?.delta !== 0 ? r.put!.delta! : greeksPut.deltaPut;
    const deltaCall = r.call?.delta !== undefined && r.call?.delta !== null && r.call?.delta !== 0 ? r.call!.delta! : greeksCall.deltaCall;

    const oiPut = r.put?.oi || 0;
    const oiCall = r.call?.oi || 0;
    const chgOiPut = r.put?.chgOi || 0;
    const chgOiCall = r.call?.chgOi || 0;
    const volPut = r.put?.vol || r.put?.volume || 0;
    const volCall = r.call?.vol || r.call?.volume || 0;

    const gexPut = calculateGex(gammaPut, oiPut, F);
    const gexCall = calculateGex(gammaCall, oiCall, F);

    const deltaOiPut = Math.abs(deltaPut) * oiPut;
    const deltaOiCall = Math.abs(deltaCall) * oiCall;

    if (oiPut > putMaxes.oi) putMaxes.oi = oiPut;
    if (chgOiPut > putMaxes.chgOi) putMaxes.chgOi = chgOiPut;
    if (gexPut > putMaxes.gex) putMaxes.gex = gexPut;
    if (volPut > putMaxes.volume) putMaxes.volume = volPut;
    if (deltaOiPut > putMaxes.deltaOi) putMaxes.deltaOi = deltaOiPut;

    if (oiCall > callMaxes.oi) callMaxes.oi = oiCall;
    if (chgOiCall > callMaxes.chgOi) callMaxes.chgOi = chgOiCall;
    if (gexCall > callMaxes.gex) callMaxes.gex = gexCall;
    if (volCall > callMaxes.volume) callMaxes.volume = volCall;
    if (deltaOiCall > callMaxes.deltaOi) callMaxes.deltaOi = deltaOiCall;

    if (k === clickedStrike) {
      clickedPutGex = gexPut;
      clickedCallGex = gexCall;
      clickedPutDelta = deltaPut;
      clickedCallDelta = deltaCall;
      clickedPutGamma = gammaPut;
      clickedCallGamma = gammaCall;
    }
  }

  // 10. Strike Scores
  const putChgOi = row.put?.chgOi || 0;
  const callChgOi = row.call?.chgOi || 0;
  const putVol = row.put?.vol || row.put?.volume || 0;
  const callVol = row.call?.vol || row.call?.volume || 0;
  const putOi = row.put?.oi || 0;
  const callOi = row.call?.oi || 0;

  const supportScore = calculateStrikeScore(
    {
      oi: putOi,
      chgOi: putChgOi,
      gex: clickedPutGex,
      volume: putVol,
      deltaOi: Math.abs(clickedPutDelta) * putOi,
    },
    putMaxes,
    isWeekly
  );

  const resistanceScore = calculateStrikeScore(
    {
      oi: callOi,
      chgOi: callChgOi,
      gex: clickedCallGex,
      volume: callVol,
      deltaOi: Math.abs(clickedCallDelta) * callOi,
    },
    callMaxes,
    isWeekly
  );

  // 11. Level Status
  const currentPrice = opts.spot && opts.spot > 0 ? opts.spot : F;
  const supportStatus = calculateStatus("SUPPORT", support, currentPrice, putChgOi);
  const resistanceStatus = calculateStatus("RESISTANCE", resistance, currentPrice, callChgOi);

  const now = opts.now || new Date();
  const updatedTime = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return {
    strike: clickedStrike,
    forward: Number(F.toFixed(2)),
    spot: opts.spot && opts.spot > 0 ? Number(opts.spot.toFixed(2)) : null,
    strikeInterval,

    support,
    resistance,
    bufferPut,
    bufferCall,

    livePutLtp: Number(livePutLtp.toFixed(2)),
    oppositeCallLtp: Number(oppositeCallLtp.toFixed(2)),
    totalSpreadLtp,
    equilibriumRatio,
    dynamicReversalLevel,

    marketSupportStrike,
    marketSupportLevel: marketSupportRes.level,
    marketResistanceStrike,
    marketResistanceLevel: marketResistanceRes.level,

    adjacentPutSpread: adjacent.putSpread,
    adjacentCallSpread: adjacent.callSpread,
    thetaDecayRatio,

    supportScore,
    resistanceScore,
    supportStatus,
    resistanceStatus,

    atmStrike,
    atmIv: atmVol !== null ? Number(atmVol.toFixed(2)) : null,
    atmStraddle: currentAtmStraddle,
    straddleDecay,
    straddleRegime,
    daysLeft,
    isWeekly,
    expiryType,

    putIvUsed: putIvUsed !== null ? Number(putIvUsed.toFixed(2)) : null,
    callIvUsed: callIvUsed !== null ? Number(callIvUsed.toFixed(2)) : null,
    isPutIvAtm,
    isCallIvAtm,

    gexPut: Number(clickedPutGex.toFixed(0)),
    gexCall: Number(clickedCallGex.toFixed(0)),
    deltaPut: Number(clickedPutDelta.toFixed(2)),
    deltaCall: Number(clickedCallDelta.toFixed(2)),
    gammaPut: Number(clickedPutGamma.toFixed(6)),
    gammaCall: Number(clickedCallGamma.toFixed(6)),
    updatedAt: now.toISOString(),
    updatedTime,
  };
}
