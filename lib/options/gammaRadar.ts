import { OptionChainRow } from "@/lib/types/market";

export type GammaStatus = "BLAST" | "SPIKE" | "ELEVATED" | "NORMAL";
export type GammaDirection = "UP" | "DOWN" | "FLAT";

export interface StrikeGammaAnalysis {
  strike: number;
  gamma: number;
  prevGamma: number | null;
  direction: GammaDirection;
  changeDelta: number;
  status: GammaStatus;
  percentOfMax: number;
  tooltip: string;
}

export interface OptionChainGammaRadar {
  maxGamma: number;
  callBlastStrike: number | null;
  callMaxGamma: number;
  putBlastStrike: number | null;
  putMaxGamma: number;
  calls: Record<number, StrikeGammaAnalysis>;
  puts: Record<number, StrikeGammaAnalysis>;
}

/**
 * Calculates accurate fallback Gamma based on option moneyness bell curve
 * if exchange feed does not provide Greeks.
 */
function calculateFallbackGamma(strike: number, spot: number, indexType: string): number {
  if (spot <= 0) return 0.001;
  const dist = Math.abs(strike - spot);
  
  // Standard deviation scales with index price
  const isBankNifty = indexType.includes("Bank") || indexType.includes("BANKNIFTY");
  const isSensex = indexType.includes("SENSEX") || indexType.includes("Sensex");
  
  const scale = isSensex ? 0.008 : isBankNifty ? 0.010 : 0.012;
  const peakGamma = isSensex ? 0.0006 : isBankNifty ? 0.0012 : 0.0035;
  
  const sigma = spot * scale;
  const exponent = -0.5 * Math.pow(dist / sigma, 2);
  const raw = peakGamma * Math.exp(exponent);
  return Number(Math.max(0.00005, raw).toFixed(4));
}

/**
 * Computes Gamma Blast & Spike warning analysis for all strikes across the option chain
 */
export function computeGammaRadar(params: {
  strikes: OptionChainRow[];
  spotPrice: number;
  underlyingKey: string;
  prevGammaMap: Record<string, number>;
}): OptionChainGammaRadar {
  const { strikes, spotPrice, underlyingKey, prevGammaMap } = params;

  if (!strikes || strikes.length === 0) {
    return {
      maxGamma: 0,
      callBlastStrike: null,
      callMaxGamma: 0,
      putBlastStrike: null,
      putMaxGamma: 0,
      calls: {},
      puts: {},
    };
  }

  // 1. Gather all gamma values
  const callGammas: Record<number, number> = {};
  const putGammas: Record<number, number> = {};

  let globalMaxGamma = 0.0001;
  let callMax = 0;
  let putMax = 0;
  let callBlastStrike: number | null = null;
  let putBlastStrike: number | null = null;

  for (const row of strikes) {
    const s = row.strike_price;

    // Call side gamma
    let cGamma = row.call?.greeks?.gamma ?? 0;
    if (!cGamma || cGamma <= 0) {
      cGamma = calculateFallbackGamma(s, spotPrice, underlyingKey);
    }
    cGamma = Number(cGamma.toFixed(4));
    callGammas[s] = cGamma;
    if (cGamma > callMax) {
      callMax = cGamma;
      callBlastStrike = s;
    }
    if (cGamma > globalMaxGamma) {
      globalMaxGamma = cGamma;
    }

    // Put side gamma
    let pGamma = row.put?.greeks?.gamma ?? 0;
    if (!pGamma || pGamma <= 0) {
      pGamma = calculateFallbackGamma(s, spotPrice, underlyingKey);
    }
    pGamma = Number(pGamma.toFixed(4));
    putGammas[s] = pGamma;
    if (pGamma > putMax) {
      putMax = pGamma;
      putBlastStrike = s;
    }
    if (pGamma > globalMaxGamma) {
      globalMaxGamma = pGamma;
    }
  }

  // 2. Classify warning status & up/down directions
  const calls: Record<number, StrikeGammaAnalysis> = {};
  const puts: Record<number, StrikeGammaAnalysis> = {};

  for (const row of strikes) {
    const s = row.strike_price;

    // Call Side Analysis
    const cVal = callGammas[s] || 0.0001;
    const cPrev = prevGammaMap[`${s}_CE`] ?? null;
    const cDelta = cPrev !== null ? Number((cVal - cPrev).toFixed(5)) : 0;
    
    let cDir: GammaDirection = "FLAT";
    if (cPrev !== null) {
      if (cDelta > 0.00005) cDir = "UP";
      else if (cDelta < -0.00005) cDir = "DOWN";
    }

    const cRatio = globalMaxGamma > 0 ? (cVal / globalMaxGamma) * 100 : 0;
    let cStatus: GammaStatus = "NORMAL";
    if (cRatio >= 85) cStatus = "BLAST";
    else if (cRatio >= 60) cStatus = "SPIKE";
    else if (cRatio >= 35) cStatus = "ELEVATED";

    calls[s] = {
      strike: s,
      gamma: cVal,
      prevGamma: cPrev,
      direction: cDir,
      changeDelta: cDelta,
      status: cStatus,
      percentOfMax: Number(cRatio.toFixed(1)),
      tooltip: `Call Gamma: ${cVal.toFixed(4)} | Status: ${cStatus} (${cRatio.toFixed(0)}% of Max Γ) | Trend: ${
        cDir === "UP" ? "▲ Surging (+)" : cDir === "DOWN" ? "▼ Decaying (-)" : "= Stable"
      }`,
    };

    // Put Side Analysis
    const pVal = putGammas[s] || 0.0001;
    const pPrev = prevGammaMap[`${s}_PE`] ?? null;
    const pDelta = pPrev !== null ? Number((pVal - pPrev).toFixed(5)) : 0;

    let pDir: GammaDirection = "FLAT";
    if (pPrev !== null) {
      if (pDelta > 0.00005) pDir = "UP";
      else if (pDelta < -0.00005) pDir = "DOWN";
    }

    const pRatio = globalMaxGamma > 0 ? (pVal / globalMaxGamma) * 100 : 0;
    let pStatus: GammaStatus = "NORMAL";
    if (pRatio >= 85) pStatus = "BLAST";
    else if (pRatio >= 60) pStatus = "SPIKE";
    else if (pRatio >= 35) pStatus = "ELEVATED";

    puts[s] = {
      strike: s,
      gamma: pVal,
      prevGamma: pPrev,
      direction: pDir,
      changeDelta: pDelta,
      status: pStatus,
      percentOfMax: Number(pRatio.toFixed(1)),
      tooltip: `Put Gamma: ${pVal.toFixed(4)} | Status: ${pStatus} (${pRatio.toFixed(0)}% of Max Γ) | Trend: ${
        pDir === "UP" ? "▲ Surging (+)" : pDir === "DOWN" ? "▼ Decaying (-)" : "= Stable"
      }`,
    };
  }

  return {
    maxGamma: globalMaxGamma,
    callBlastStrike,
    callMaxGamma: callMax,
    putBlastStrike,
    putMaxGamma: putMax,
    calls,
    puts,
  };
}

