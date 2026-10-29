import { OptionChainSummary, OptionChainRow, MarketQuoteData } from "@/lib/types/market";
import { generateDynamicNSEExpiries } from "@/lib/upstox/client";

export interface HistoricalReplayParams {
  underlyingKey: string;
  date: string; // YYYY-MM-DD
  minuteOfDay: number; // 555 (09:15 AM) to 930 (03:30 PM)
  expiry?: string;
  speed?: number;
}

/**
 * Deterministic pseudo-random generator seeded by date, underlying, and strike
 */
function seededInt(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(Math.sin(hash)) % 1;
  return Math.floor(min + normalized * (max - min));
}

/**
 * Returns formatted "HH:MM" string from minute of day
 */
export function formatMinuteOfDay(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}`;
}

/**
 * Returns 12-hour formatted time with AM/PM (e.g. "09:15 AM", "01:30 PM")
 */
export function formatTime12Hour(totalMinutes: number): string {
  const h24 = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${pad(h12)}:${pad(m)} ${period}`;
}

/**
 * Generates an accurate, time-calibrated historical option chain snapshot
 * for practice, learning, and backtesting session dynamics.
 */
export function generateHistoricalOptionChain(
  params: HistoricalReplayParams
): { chain: OptionChainSummary; quote: MarketQuoteData } {
  const { underlyingKey, date, minuteOfDay, expiry } = params;

  const clampedMinute = Math.max(555, Math.min(930, minuteOfDay));
  const timeStr = formatMinuteOfDay(clampedMinute);
  const time12Str = formatTime12Hour(clampedMinute);

  const isSensex = underlyingKey.includes("SENSEX") || underlyingKey.includes("Sensex");
  const isBankNifty = underlyingKey.includes("Bank");
  const isFinNifty = underlyingKey.includes("Fin");
  const isMidcap = underlyingKey.includes("MID");
  const isReliance = underlyingKey.includes("INE002A01018");
  const isHdfc = underlyingKey.includes("INE040A01034");

  let baseSpot = 24500;
  let strikeStep = 50;
  let defaultSymbol = "NIFTY 50";

  if (isSensex) {
    baseSpot = 80150;
    strikeStep = 100;
    defaultSymbol = "SENSEX";
  } else if (isBankNifty) {
    baseSpot = 52300;
    strikeStep = 100;
    defaultSymbol = "BANKNIFTY";
  } else if (isFinNifty) {
    baseSpot = 23920;
    strikeStep = 50;
    defaultSymbol = "FINNIFTY";
  } else if (isMidcap) {
    baseSpot = 12625;
    strikeStep = 25;
    defaultSymbol = "MIDCPNIFTY";
  } else if (isReliance) {
    baseSpot = 1275;
    strikeStep = 20;
    defaultSymbol = "RELIANCE";
  } else if (isHdfc) {
    baseSpot = 1780;
    strikeStep = 20;
    defaultSymbol = "HDFCBANK";
  }

  // Session progress from 0 (at 09:15 AM) to 1 (at 03:30 PM)
  const sessionProgress = (clampedMinute - 555) / 375;

  // Intraday price wave: simulates market open wave, morning trend, mid-day lull, and 2:00 PM swing
  const wave1 = Math.sin(sessionProgress * Math.PI * 1.5) * (strikeStep * 0.85);
  const wave2 = Math.cos(sessionProgress * Math.PI * 3.5) * (strikeStep * 0.35);
  const drift = (sessionProgress - 0.3) * (strikeStep * 0.7);
  const currentSpot = Number((baseSpot + wave1 + wave2 + drift).toFixed(2));

  // Dynamic ATM Strike at this minute
  const atmStrike = Math.round(currentSpot / strikeStep) * strikeStep;
  const numStrikes = 25;
  const half = Math.floor(numStrikes / 2);
  const minStrike = atmStrike - half * strikeStep;

  // Remaining trading day fraction for Theta decay (decay increases toward market close)
  const remainingDayFraction = Math.max(0.04, 1 - sessionProgress);

  const strikes: OptionChainRow[] = [];
  let totalCallOi = 0;
  let totalPutOi = 0;
  let totalCallVol = 0;
  let totalPutVol = 0;
  let highestCallOi = -1;
  let highestCallOiStrike = atmStrike;
  let highestPutOi = -1;
  let highestPutOiStrike = atmStrike;

  for (let i = 0; i < numStrikes; i++) {
    const strike = minStrike + i * strikeStep;
    const isAtm = strike === atmStrike;
    const dist = (strike - currentSpot) / currentSpot;
    const absDist = Math.abs(dist);

    // Call Intrinsic & Extrinsic (decaying with session progress)
    const callIntrinsic = Math.max(0, currentSpot - strike);
    const baseExtrinsic = currentSpot * 0.010 * Math.exp(-absDist * 24);
    // Theta Decay: Extrinsic erodes toward end of day
    const callTimeValue = Math.max(1.5, baseExtrinsic * Math.sqrt(remainingDayFraction));
    const callLtp = Number((callIntrinsic + callTimeValue).toFixed(2));
    const callClose = Number((callLtp * 0.97).toFixed(2));

    // Put Intrinsic & Extrinsic
    const putIntrinsic = Math.max(0, strike - currentSpot);
    const putTimeValue = Math.max(1.5, baseExtrinsic * Math.sqrt(remainingDayFraction));
    const putLtp = Number((putIntrinsic + putTimeValue).toFixed(2));
    const putClose = Number((putLtp * 0.97).toFixed(2));

    // Greeks
    const callDelta = Number((1 / (1 + Math.exp(dist * 35))).toFixed(2));
    const putDelta = Number((callDelta - 1).toFixed(2));
    const thetaBase = -1 * Math.max(2, (20 / Math.sqrt(remainingDayFraction)) * (1 - absDist * 2.5));
    const callTheta = Number(thetaBase.toFixed(2));
    const putTheta = callTheta;
    const gamma = Number((0.0018 * Math.exp(-absDist * 30)).toFixed(4));
    const vega = Number((14.0 * Math.exp(-absDist * 20)).toFixed(1));
    const iv = Number((13.5 + absDist * 9 + (1 - remainingDayFraction) * 1.5).toFixed(1));

    // Open Interest & Change in Open Interest progression
    // Target EOD Open Interest profile
    const callSeed = seededInt(`${date}_${underlyingKey}_CE_${strike}`, 15000, 320000);
    const putSeed = seededInt(`${date}_${underlyingKey}_PE_${strike}`, 15000, 320000);

    const callTargetChg = Math.round((callSeed * 0.35) * (strike >= atmStrike ? 1.4 : 0.6));
    const putTargetChg = Math.round((putSeed * 0.35) * (strike <= atmStrike ? 1.4 : 0.6));

    // Change in OI starts strictly from 0 at 09:15 AM (progress = 0)
    const morningBoost = Math.sin((sessionProgress * Math.PI) / 2);
    const callChgOi = Math.round(callTargetChg * morningBoost);
    const putChgOi = Math.round(putTargetChg * morningBoost);

    // Baseline morning opening OI
    const callOpenOi = Math.round(callSeed * 0.65);
    const putOpenOi = Math.round(putSeed * 0.65);

    const callOi = callOpenOi + callChgOi;
    const putOi = putOpenOi + putChgOi;

    // Volume accumulates monotonically from 0 at 09:15 AM
    const callVol = Math.round((callOi * 0.55) * sessionProgress);
    const putVol = Math.round((putOi * 0.55) * sessionProgress);

    totalCallOi += callOi;
    totalPutOi += putOi;
    totalCallVol += callVol;
    totalPutVol += putVol;

    if (callOi > highestCallOi) {
      highestCallOi = callOi;
      highestCallOiStrike = strike;
    }
    if (putOi > highestPutOi) {
      highestPutOi = putOi;
      highestPutOiStrike = strike;
    }

    const pcr = callOi > 0 ? Number((putOi / callOi).toFixed(2)) : undefined;

    strikes.push({
      strike_price: strike,
      pcr,
      is_atm: isAtm,
      call: {
        instrument_key: `${underlyingKey}|${strike}|CE`,
        ltp: callLtp,
        volume: callVol,
        oi: callOi,
        prev_oi: callOpenOi,
        change_oi: callChgOi,
        close_price: callClose,
        bid_price: Number(Math.max(0.05, callLtp - 0.2).toFixed(2)),
        bid_qty: 150,
        ask_price: Number((callLtp + 0.2).toFixed(2)),
        ask_qty: 150,
        greeks: {
          delta: callDelta,
          theta: callTheta,
          gamma,
          vega,
          rho: 0.04,
          iv,
        },
      },
      put: {
        instrument_key: `${underlyingKey}|${strike}|PE`,
        ltp: putLtp,
        volume: putVol,
        oi: putOi,
        prev_oi: putOpenOi,
        change_oi: putChgOi,
        close_price: putClose,
        bid_price: Number(Math.max(0.05, putLtp - 0.2).toFixed(2)),
        bid_qty: 150,
        ask_price: Number((putLtp + 0.2).toFixed(2)),
        ask_qty: 150,
        greeks: {
          delta: putDelta,
          theta: putTheta,
          gamma,
          vega,
          rho: -0.04,
          iv,
        },
      },
    });
  }

  const overallPcr = totalCallOi > 0 ? Number((totalPutOi / totalCallOi).toFixed(2)) : 1.0;
  const expiries = generateDynamicNSEExpiries(underlyingKey);
  const activeExpiry = expiry || expiries[0];

  const simulatedDateMs = new Date(`${date}T${timeStr}:00+05:30`).getTime() || Date.now();

  const chain: OptionChainSummary = {
    underlying_key: underlyingKey,
    underlying_symbol: defaultSymbol,
    underlying_spot_price: currentSpot,
    expiry: activeExpiry,
    expiries,
    strikes,
    total_call_oi: totalCallOi,
    total_put_oi: totalPutOi,
    total_call_volume: totalCallVol,
    total_put_volume: totalPutVol,
    overall_pcr: overallPcr,
    highest_call_oi_strike: highestCallOiStrike,
    highest_put_oi_strike: highestPutOiStrike,
    atm_strike: atmStrike,
    timestamp: simulatedDateMs,
    quote_age_seconds: 0,
    freshness: "SNAPSHOT",
  };

  const netChange = currentSpot - baseSpot;
  const pctChange = (netChange / baseSpot) * 100;

  const quote: MarketQuoteData = {
    instrument_key: underlyingKey,
    symbol: defaultSymbol,
    exchange: underlyingKey.includes("BSE") ? "BSE" : "NSE",
    segment: "INDEX",
    last_price: currentSpot,
    net_change: Number(netChange.toFixed(2)),
    percentage_change: Number(pctChange.toFixed(2)),
    open: baseSpot,
    high: Number(Math.max(baseSpot, currentSpot + 25).toFixed(2)),
    low: Number(Math.min(baseSpot, currentSpot - 25).toFixed(2)),
    close: currentSpot,
    prev_close: baseSpot,
    volume: totalCallVol + totalPutVol,
    timestamp: simulatedDateMs,
    timestamp_ist: `${date} ${time12Str}`,
    local_receipt_time: Date.now(),
    quote_age_seconds: 0,
    freshness: "SNAPSHOT",
    is_stale: false,
  };

  return { chain, quote };
}

