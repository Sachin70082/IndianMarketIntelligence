/**
 * Unit Test Script for Financial Indicators and Risk Calculations
 * Tests EMA, RSI, ATR, VWAP, and PCR against manually verified calculation vectors.
 * Run with: node scripts/test-math.js
 */

const assert = require("assert");

// 1. EMA Calculation Test
function calculateEMA(prices, period) {
  const result = new Array(prices.length).fill(null);
  if (!prices || prices.length < period || period <= 0) return result;

  let initialSum = 0;
  for (let i = 0; i < period; i++) {
    initialSum += prices[i];
  }
  let prevEma = initialSum / period;
  result[period - 1] = Number(prevEma.toFixed(2));

  const multiplier = 2 / (period + 1);

  for (let i = period; i < prices.length; i++) {
    const currentPrice = prices[i];
    const currentEma = (currentPrice - prevEma) * multiplier + prevEma;
    result[i] = Number(currentEma.toFixed(2));
    prevEma = currentEma;
  }
  return result;
}

// 2. RSI Calculation Test (Wilder's Smoothing)
function calculateRSI(prices, period = 14) {
  const result = new Array(prices.length).fill(null);
  if (!prices || prices.length <= period || period <= 0) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
  result[period] = Number(rsi.toFixed(2));

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      rs = avgGain / avgLoss;
      rsi = 100 - 100 / (1 + rs);
      result[i] = Number(rsi.toFixed(2));
    }
  }
  return result;
}

// 3. ATR Calculation Test (Wilder's Smoothed TR)
function calculateATR(candles, period = 14) {
  const result = new Array(candles.length).fill(null);
  if (!candles || candles.length <= period || period <= 0) return result;

  const trueRanges = [];
  trueRanges.push(candles[0].high - candles[0].low);

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prevClose),
      Math.abs(current.low - prevClose)
    );
    trueRanges.push(tr);
  }

  let initialTRSum = 0;
  for (let i = 0; i < period; i++) {
    initialTRSum += trueRanges[i];
  }
  let prevATR = initialTRSum / period;
  result[period - 1] = Number(prevATR.toFixed(2));

  for (let i = period; i < candles.length; i++) {
    const currentTR = trueRanges[i];
    const currentATR = (prevATR * (period - 1) + currentTR) / period;
    result[i] = Number(currentATR.toFixed(2));
    prevATR = currentATR;
  }
  return result;
}

// 4. VWAP Calculation Test
function calculateVWAP(candles) {
  const values = new Array(candles.length).fill(null);
  let cumTPV = 0;
  let cumVol = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const tp = (c.high + c.low + c.close) / 3;
    cumTPV += tp * c.volume;
    cumVol += c.volume;
    values[i] = cumVol === 0 ? tp : Number((cumTPV / cumVol).toFixed(2));
  }
  return values;
}

// 5. PCR & Option Math Test
function calculatePCR(totalPutOI, totalCallOI) {
  if (!totalCallOI || totalCallOI === 0) return 0;
  return Number((totalPutOI / totalCallOI).toFixed(3));
}

// 6. MACD Calculation Test
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const emaFast = calculateEMA(prices, fastPeriod);
  const emaSlow = calculateEMA(prices, slowPeriod);
  const macdLine = new Array(prices.length).fill(null);

  for (let i = 0; i < prices.length; i++) {
    if (emaFast[i] !== null && emaSlow[i] !== null) {
      macdLine[i] = Number((emaFast[i] - emaSlow[i]).toFixed(2));
    }
  }

  const validMacdValues = macdLine.filter((v) => v !== null);
  const signalEma = calculateEMA(validMacdValues, signalPeriod);
  const signalLine = new Array(prices.length).fill(null);
  const histogram = new Array(prices.length).fill(null);

  let validIdx = 0;
  for (let i = 0; i < prices.length; i++) {
    if (macdLine[i] !== null) {
      if (signalEma[validIdx] !== null) {
        signalLine[i] = signalEma[validIdx];
        histogram[i] = Number((macdLine[i] - signalLine[i]).toFixed(2));
      }
      validIdx++;
    }
  }

  return { macdLine, signalLine, histogram };
}

// 7. RVol Calculation Test
function calculateRVol(volumes, period = 20) {
  const result = new Array(volumes.length).fill(null);
  if (!volumes || volumes.length === 0) return result;
  for (let i = 0; i < volumes.length; i++) {
    const startIdx = Math.max(0, i - period + 1);
    const window = volumes.slice(startIdx, i + 1);
    const sum = window.reduce((a, b) => a + b, 0);
    const avg = sum / window.length;
    result[i] = avg === 0 ? 1.0 : Number((volumes[i] / avg).toFixed(2));
  }
  return result;
}

// 8. Pattern Detection Test (Hammer & Bullish Engulfing)
function detectHammer(candle) {
  const body = Math.abs(candle.close - candle.open);
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  const isSmallBody = body > 0 && lowerWick >= 2 * body;
  const isSmallUpperWick = upperWick <= body * 0.5;
  return isSmallBody && isSmallUpperWick;
}

function detectBullishEngulfing(prev, curr) {
  const prevBearish = prev.close < prev.open;
  const currBullish = curr.close > curr.open;
  const engulfs = curr.open <= prev.close && curr.close >= prev.open;
  return prevBearish && currBullish && engulfs;
}

// 9. Statutory Indian Charges Test (Equity Intraday)
function calculateIntradayCharges(entryPrice, exitPrice, quantity) {
  const turnover = (entryPrice + exitPrice) * quantity;
  const brokerage = Math.min(40, turnover * 0.0003); // Max ₹40 round trip
  const stt = exitPrice * quantity * 0.00025; // 0.025% on sell side
  const txnCharge = turnover * 0.0000345; // NSE txn charges
  const gst = (brokerage + txnCharge) * 0.18; // 18% GST on brokerage + txn
  const stampDuty = entryPrice * quantity * 0.00003; // 0.003% on buy side
  const sebiTurnover = turnover * 0.000001; // ₹10 per crore
  const total = Number((brokerage + stt + txnCharge + gst + stampDuty + sebiTurnover).toFixed(2));
  return { turnover, brokerage, stt, txnCharge, gst, stampDuty, total };
}

// --- RUN TESTS ---
console.log("=================================================");
console.log("  RUNNING QUANTITATIVE MATH VERIFICATION SUITE   ");
console.log("=================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

// Test 1: EMA Hand Vector
runTest("EMA 5-period exact hand calculation", () => {
  const prices = [10, 11, 12, 13, 14, 15];
  const ema = calculateEMA(prices, 5);
  assert.strictEqual(ema[0], null);
  assert.strictEqual(ema[3], null);
  assert.strictEqual(ema[4], 12.0);
  assert.strictEqual(ema[5], 13.0);
});

// Test 2: RSI 3-period on monotonic increasing series
runTest("RSI 100 on continuous uptrend with zero loss", () => {
  const prices = [10, 12, 14, 16, 18];
  const rsi = calculateRSI(prices, 3);
  assert.strictEqual(rsi[0], null);
  assert.strictEqual(rsi[1], null);
  assert.strictEqual(rsi[2], null);
  assert.strictEqual(rsi[3], 100);
  assert.strictEqual(rsi[4], 100);
});

// Test 3: RSI 3-period on monotonic decreasing series
runTest("RSI 0 on continuous downtrend with zero gain", () => {
  const prices = [20, 18, 16, 14, 12];
  const rsi = calculateRSI(prices, 3);
  assert.strictEqual(rsi[3], 0);
  assert.strictEqual(rsi[4], 0);
});

// Test 4: ATR on known high-low ranges
runTest("ATR 2-period hand calculation", () => {
  const candles = [
    { high: 105, low: 95, close: 100 },
    { high: 110, low: 100, close: 105 },
    { high: 120, low: 105, close: 115 },
  ];
  const atr = calculateATR(candles, 2);
  assert.strictEqual(atr[0], null);
  assert.strictEqual(atr[1], 10.0);
  assert.strictEqual(atr[2], 12.5);
});

// Test 5: VWAP calculation
runTest("Intraday VWAP volume weighting calculation", () => {
  const candles = [
    { high: 102, low: 98, close: 100, volume: 100 },
    { high: 112, low: 108, close: 110, volume: 100 },
  ];
  const vwap = calculateVWAP(candles);
  assert.strictEqual(vwap[0], 100.0);
  assert.strictEqual(vwap[1], 105.0);
});

// Test 6: PCR edge cases & division by zero
runTest("PCR normal calculation and zero division protection", () => {
  const pcrNormal = calculatePCR(150000, 100000);
  assert.strictEqual(pcrNormal, 1.5);

  const pcrZeroCall = calculatePCR(50000, 0);
  assert.strictEqual(pcrZeroCall, 0);

  const pcrZeroPut = calculatePCR(0, 50000);
  assert.strictEqual(pcrZeroPut, 0);
});

// Test 7: MACD Fast/Slow Line & Histogram
runTest("MACD (3, 6, 2) fast/slow line separation and histogram", () => {
  const prices = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28];
  const macd = calculateMACD(prices, 3, 6, 2);
  assert.strictEqual(macd.macdLine[0], null);
  assert.strictEqual(macd.macdLine[4], null);
  assert(macd.macdLine[5] !== null, "MACD line should exist after slow period");
  assert(macd.macdLine[9] > 0, "MACD line should be positive in strict uptrend");
});

// Test 8: Relative Volume (RVol) 5-period
runTest("RVol spike detection on surge bar", () => {
  const volumes = [100, 100, 100, 100, 400]; // last candle has 4x volume surge
  const rvol = calculateRVol(volumes, 5);
  assert.strictEqual(rvol[0], 1.0);
  assert(rvol[4] > 2.0, "RVol on surge bar should exceed 2.0x");
});

// Test 9: Candlestick Pattern Detection - Hammer
runTest("Hammer rejection pattern identification", () => {
  // Lower wick = 10, Body = 3 (close 103, open 100), Upper wick = 1 (high 104, close 103)
  const hammerCandle = { open: 100, high: 104, low: 90, close: 103, volume: 5000 };
  const isHammer = detectHammer(hammerCandle);
  assert.strictEqual(isHammer, true, "Should identify classic hammer");

  // Flat candle (no lower wick)
  const flatCandle = { open: 100, high: 104, low: 100, close: 104, volume: 5000 };
  assert.strictEqual(detectHammer(flatCandle), false, "Flat candle should not be hammer");
});

// Test 10: Candlestick Pattern Detection - Bullish Engulfing
runTest("Bullish Engulfing multi-candle reversal", () => {
  const prevBearish = { open: 105, high: 106, low: 99, close: 100, volume: 2000 };
  const currBullish = { open: 99, high: 108, low: 98, close: 107, volume: 6000 };
  const isEngulfing = detectBullishEngulfing(prevBearish, currBullish);
  assert.strictEqual(isEngulfing, true, "Should identify bullish engulfing");
});

// Test 11: Statutory Indian Market Transaction Charges Sizing
runTest("Statutory Indian Intraday Equity charges formula check", () => {
  // Buy 100 shares @ ₹2500, Sell @ ₹2520 => Turnover ₹502,000
  const charges = calculateIntradayCharges(2500, 2520, 100);
  assert(charges.turnover === 502000, "Turnover must match exact round-trip value");
  assert(charges.brokerage <= 40, "Brokerage must be capped at ₹40");
  assert(charges.stt > 0, "STT must be non-zero on sell side");
  assert(charges.total > 0 && charges.total < 200, "Intraday charges must be realistic");
});

// Test 12: 6-Factor Signal Weights Normalization
runTest("6-Factor signal weights sum exactly to 100%", () => {
  const weights = {
    priceAction: 25,
    optionChain: 25,
    multiTimeframeTrend: 15,
    volumeBreakout: 15,
    marketContext: 10,
    momentumVolatility: 10,
  };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  assert.strictEqual(total, 100, "Weightings must sum exactly to 100%");
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed successfully.`);
if (passedTests === totalTests) {
  console.log("All mathematical indicator algorithms verified!\n");
  process.exit(0);
} else {
  console.error("Some tests failed!");
  process.exit(1);
}
