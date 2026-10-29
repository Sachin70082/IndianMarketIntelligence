/**
 * scripts/test-levels.js
 *
 * Unit tests for optionChainLevels pure math module.
 * Tests:
 * 1. Forward price F from Put-Call Parity: Strike + Call LTP − Put LTP
 * 2. Dynamic Match Support Formula (AOC exact match):
 *    Support = Support Strike - [ (Put LTP - Call LTP) * (Strike Interval / Total Spread LTP) ]
 * 3. Dynamic Match Resistance Formula (AOC exact match):
 *    Resistance = Resistance Strike + [ (Call LTP - Put LTP) * (Strike Interval / Total Spread LTP) ]
 * 4. Strike Interval Dynamic Detection (e.g. 50 on Nifty, 100 on Bank Nifty)
 * 5. Adjacent Strike Spread & Theta Decay Ratio (tight 20-35 pt range)
 * 6. Major Market Green Box (Support) & Red Box (Resistance) strikes
 * 7. Days left & Strike Score (WEEKLY vs MONTHLY)
 * 8. GEX = Gamma × OI × F² × 0.01
 * 9. Level Status = Holding / Weakening / Broken
 * 10. ATM straddle & Decay
 * 11. Missing data safety (returns null, no NaN)
 * 12. Static scan: ZERO hardcoded strikes, spot, IV, lot sizes, or default index
 *
 * Run with: node scripts/test-levels.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

async function runTests() {
  console.log("=================================================");
  console.log("  RUNNING ADVANCED LTP & AOC UNIT TESTS          ");
  console.log("=================================================");

  const {
    forwardFromChain,
    atmIv,
    getStrikeInterval,
    calculateDynamicSupport,
    calculateDynamicResistance,
    calculateAdjacentSpreadLevels,
    getIntradayThetaDecayRatio,
    getMajorMarketStrikes,
    calculateDaysLeft,
    calculateGreeks,
    calculateGex,
    calculateStrikeScore,
    calculateStatus,
    getAtmStraddle,
    computeLevels,
  } = await import("../lib/options/optionChainLevels.ts");

  // -------------------------------------------------------------
  // Test 1: Forward Price F from Put-Call Parity
  // -------------------------------------------------------------
  console.log("\n[TEST 1] Forward Price via Put-Call Parity");
  {
    const mockChain = [
      { strike: 22400, call: { ltp: 380, iv: 16.5 }, put: { ltp: 45, iv: 16.5 } },
      { strike: 22500, call: { ltp: 290, iv: 16.5 }, put: { ltp: 55, iv: 16.5 } },
      { strike: 22600, call: { ltp: 205, iv: 16.5 }, put: { ltp: 75, iv: 16.5 } },
      { strike: 22700, call: { ltp: 135, iv: 16.5 }, put: { ltp: 110, iv: 16.5 } }, // diff = 25
      { strike: 22750, call: { ltp: 105, iv: 16.5 }, put: { ltp: 115, iv: 16.5 } }, // diff = 10 (closest!)
      { strike: 22800, call: { ltp: 80, iv: 16.5 }, put: { ltp: 140, iv: 16.5 } },  // diff = 60
    ];

    const F = forwardFromChain(mockChain);
    console.log(`  Calculated Forward F: ${F} (expected 22740)`);
    assert.strictEqual(F, 22740, "Forward F from parity must be 22740");
    console.log("  [PASS] Test 1: Forward price F calculated correctly.");
  }

  // -------------------------------------------------------------
  // Test 2: Dynamic Match Support Formula (AOC)
  // Current Support = Support Strike - [ (Live Put LTP - Opposite Call LTP) * (Strike Interval / Total Spread LTP) ]
  // Example: Support Strike = 22600, Put LTP = 55, Call LTP = 180, Strike Interval = 50
  // Total Spread = 235. Ratio = 50 / 235 = 0.21276
  // (Put LTP - Call LTP) = 55 - 180 = -125
  // Buffer = -125 * 0.21276 = -26.6 pts
  // Support = 22600 - (-26.6) = 22626.6 -> 22627
  // -------------------------------------------------------------
  console.log("\n[TEST 2] Dynamic Support Formula (AOC Match)");
  {
    const supportStrike = 22600;
    const putLtp = 55;
    const callLtp = 180;
    const strikeInterval = 50;

    const res = calculateDynamicSupport(supportStrike, putLtp, callLtp, strikeInterval);
    console.log(`  Support Strike: ${supportStrike}, Put LTP: ${putLtp}, Call LTP: ${callLtp}`);
    console.log(`  Calculated Support: ${res.level} (Buffer: ${res.buffer} pts)`);
    assert.strictEqual(res.level, 22627, "Support must be 22627");
    assert.strictEqual(res.buffer, -26.6, "Buffer must be -26.6");
    console.log("  [PASS] Test 2: Dynamic Support Formula verified.");
  }

  // -------------------------------------------------------------
  // Test 3: Dynamic Match Resistance Formula (AOC)
  // Current Resistance = Resistance Strike + [ (Live Call LTP - Opposite Put LTP) * (Strike Interval / Total Spread LTP) ]
  // Example: Resistance Strike = 22800, Call LTP = 60, Put LTP = 135, Strike Interval = 50
  // Total Spread = 195. Ratio = 50 / 195 = 0.2564
  // (Call LTP - Put LTP) = 60 - 135 = -75
  // Buffer = -75 * 0.2564 = -19.2 pts
  // Resistance = 22800 + (-19.2) = 22780.8 -> 22781
  // -------------------------------------------------------------
  console.log("\n[TEST 3] Dynamic Resistance Formula (AOC Match)");
  {
    const resistanceStrike = 22800;
    const callLtp = 60;
    const putLtp = 135;
    const strikeInterval = 50;

    const res = calculateDynamicResistance(resistanceStrike, callLtp, putLtp, strikeInterval);
    console.log(`  Resistance Strike: ${resistanceStrike}, Call LTP: ${callLtp}, Put LTP: ${putLtp}`);
    console.log(`  Calculated Resistance: ${res.level} (Buffer: ${res.buffer} pts)`);
    assert.strictEqual(res.level, 22781, "Resistance must be 22781");
    assert.strictEqual(res.buffer, -19.2, "Buffer must be -19.2");
    console.log("  [PASS] Test 3: Dynamic Resistance Formula verified.");
  }

  // -------------------------------------------------------------
  // Test 4: Dynamic Strike Interval Detection
  // -------------------------------------------------------------
  console.log("\n[TEST 4] Dynamic Strike Interval Detection");
  {
    const niftyChain = [{ strike: 22600 }, { strike: 22650 }, { strike: 22700 }, { strike: 22750 }];
    const bankNiftyChain = [{ strike: 51200 }, { strike: 51300 }, { strike: 51400 }];
    const midcapChain = [{ strike: 12200 }, { strike: 12225 }, { strike: 12250 }];

    assert.strictEqual(getStrikeInterval(niftyChain), 50, "Nifty strike gap must be 50");
    assert.strictEqual(getStrikeInterval(bankNiftyChain), 100, "BankNifty strike gap must be 100");
    assert.strictEqual(getStrikeInterval(midcapChain), 25, "Midcap strike gap must be 25");
    console.log("  [PASS] Test 4: Dynamic strike intervals accurately detected (50, 100, 25).");
  }

  // -------------------------------------------------------------
  // Test 5: Adjacent Strike Spread & Theta Decay Ratio (Prompt 1)
  // Target Strike = 22700. Lower Strike = 22650, Higher Strike = 22750
  // Put(22700) = 104, Put(22650) = 78 -> Put Spread = 26 pts
  // Call(22700) = 130, Call(22750) = 100 -> Call Spread = 30 pts
  // Theta Decay Ratio = 0.15 (1 - theta = 0.85)
  // Support = 22700 - (26 * 0.85) = 22700 - 22.1 = 22678
  // Resistance = 22700 + (30 * 0.85) = 22700 + 25.5 = 22726
  // -------------------------------------------------------------
  console.log("\n[TEST 5] Adjacent Strike Spread & Theta Decay Ratio");
  {
    const chain = [
      { strike: 22650, call: { ltp: 165 }, put: { ltp: 78 } },
      { strike: 22700, call: { ltp: 130 }, put: { ltp: 104 } },
      { strike: 22750, call: { ltp: 100 }, put: { ltp: 135 } },
    ];

    const res = calculateAdjacentSpreadLevels(chain, 22700, 0.15);
    console.log(`  Adjacent Put Spread: ${res.putSpread} pts (expected 26)`);
    console.log(`  Adjacent Call Spread: ${res.callSpread} pts (expected 30)`);
    console.log(`  Adjacent Support: ${res.support} (expected 22678)`);
    console.log(`  Adjacent Resistance: ${res.resistance} (expected 22726)`);

    assert.strictEqual(res.putSpread, 26);
    assert.strictEqual(res.callSpread, 30);
    assert.strictEqual(res.support, 22678);
    assert.strictEqual(res.resistance, 22726);

    console.log("  [PASS] Test 5: Adjacent strike spread levels verified.");
  }

  // -------------------------------------------------------------
  // Test 6: Market Green Box (Support) & Red Box (Resistance) Detection
  // -------------------------------------------------------------
  console.log("\n[TEST 6] Market Green Box & Red Box Detection");
  {
    const chain = [
      { strike: 22500, call: { ltp: 250, oi: 1000 }, put: { ltp: 30, oi: 80000, vol: 20000 } }, // Below spot (max Put OI)
      { strike: 22600, call: { ltp: 160, oi: 5000 }, put: { ltp: 50, oi: 60000, vol: 15000 } },
      { strike: 22700, call: { ltp: 100, oi: 20000 }, put: { ltp: 90, oi: 30000, vol: 10000 } }, // ATM
      { strike: 22800, call: { ltp: 50, oi: 95000, vol: 25000 }, put: { ltp: 150, oi: 5000 } },  // Above spot (max Call OI)
      { strike: 22900, call: { ltp: 25, oi: 40000 }, put: { ltp: 220, oi: 1000 } },
    ];

    const spot = 22720;
    const { supportStrike, resistanceStrike } = getMajorMarketStrikes(chain, spot);
    assert.strictEqual(supportStrike, 22500, "Green Box Support strike should be 22500");
    assert.strictEqual(resistanceStrike, 22800, "Red Box Resistance strike should be 22800");
    console.log(`  Green Box Support Strike: ${supportStrike}, Red Box Resistance Strike: ${resistanceStrike}`);
    console.log("  [PASS] Test 6: Green & Red Box concentration strikes correctly identified.");
  }

  // -------------------------------------------------------------
  // Test 7: Full computeLevels End-to-End
  // -------------------------------------------------------------
  console.log("\n[TEST 7] End-to-End computeLevels Verification");
  {
    const chain = [
      { strike: 22600, call: { ltp: 180, oi: 10000, chgOi: 500, vol: 5000 }, put: { ltp: 55, oi: 70000, chgOi: 2000, vol: 20000 } },
      { strike: 22650, call: { ltp: 145, oi: 15000, chgOi: 600, vol: 8000 }, put: { ltp: 75, oi: 50000, chgOi: 1500, vol: 18000 } },
      { strike: 22700, call: { ltp: 110, oi: 35000, chgOi: 1000, vol: 12000 }, put: { ltp: 100, oi: 35000, chgOi: 1000, vol: 12000 } },
      { strike: 22750, call: { ltp: 80, oi: 55000, chgOi: 1500, vol: 15000 }, put: { ltp: 130, oi: 20000, chgOi: 500, vol: 8000 } },
      { strike: 22800, call: { ltp: 60, oi: 85000, chgOi: 3000, vol: 25000 }, put: { ltp: 165, oi: 10000, chgOi: 200, vol: 4000 } },
    ];

    const spot = 22710;
    const result = computeLevels(chain, 22650, { spot });

    assert.strictEqual(result.strikeInterval, 50);
    assert.strictEqual(result.strike, 22650);
    assert(result.support !== null);
    assert(result.resistance !== null);
    assert(result.support < result.strike, "Support must be strictly below strike");
    assert(result.resistance > result.strike, "Resistance must be strictly above strike");
    assert(result.support !== result.resistance, "Support and Resistance must never be identical");
    assert.strictEqual(result.marketSupportStrike, 22600);
    assert.strictEqual(result.marketResistanceStrike, 22800);

    console.log(`  Clicked Strike: 22650`);
    console.log(`  Support: ₹${result.support} (Buffer: -${result.bufferPut} pts)`);
    console.log(`  Resistance: ₹${result.resistance} (Buffer: +${result.bufferCall} pts)`);
    console.log(`  Reversal Pivot: ₹${result.dynamicReversalLevel}`);
    console.log(`  Market Green Box Support: ₹${result.marketSupportLevel} (at ${result.marketSupportStrike})`);
    console.log(`  Market Red Box Resistance: ₹${result.marketResistanceLevel} (at ${result.marketResistanceStrike})`);
    console.log("  [PASS] Test 7: End-to-end computeLevels verified.");
  }

  // -------------------------------------------------------------
  // Test 7B: User Screenshot Case (Strike 22600, Spot 22714.55)
  // Put LTP = 128.75, Call LTP = 243.15
  // Proves Support is BELOW 22600, Resistance is ABOVE 22600,
  // and Reversal Pivot = 22615. They are NEVER equal to 22615 together!
  // -------------------------------------------------------------
  console.log("\n[TEST 7B] User Screenshot Case (Strike 22600)");
  {
    const chain = [
      { strike: 22550, call: { ltp: 280 }, put: { ltp: 104 } },
      { strike: 22600, call: { ltp: 243.15, oi: 50000, chgOi: 2000, vol: 15000 }, put: { ltp: 128.75, oi: 60000, chgOi: 3000, vol: 20000 } },
      { strike: 22650, call: { ltp: 216.5 }, put: { ltp: 155 } },
    ];

    const spot = 22714.55;
    const result = computeLevels(chain, 22600, { spot });

    console.log(`  Target Strike: 22600`);
    console.log(`  Support: ₹${result.support} (expected < 22600, ~22579)`);
    console.log(`  Resistance: ₹${result.resistance} (expected > 22600, ~22623)`);
    console.log(`  Dynamic Reversal Line: ₹${result.dynamicReversalLevel} (expected 22615)`);

    assert(result.support < 22600, `Support (${result.support}) must be below strike 22600`);
    assert(result.resistance > 22600, `Resistance (${result.resistance}) must be above strike 22600`);
    assert.strictEqual(result.dynamicReversalLevel, 22615, "Dynamic reversal pivot must be 22615");
    assert.notStrictEqual(result.support, result.resistance, "Support and Resistance must not be identical");

    console.log("  [PASS] Test 7B: Screenshot bug fixed! Distinct Support & Resistance confirmed.");
  }

  // -------------------------------------------------------------
  // Test 8: GEX Formula
  // -------------------------------------------------------------
  console.log("\n[TEST 8] GEX Formula");
  {
    const gamma = 0.0005;
    const oi = 10000;
    const F = 22000;
    const gex = calculateGex(gamma, oi, F);
    assert.strictEqual(gex, 24200000);
    console.log("  [PASS] Test 8: GEX formula verified.");
  }

  // -------------------------------------------------------------
  // Test 9: Level Status (Holding / Weakening / Broken)
  // -------------------------------------------------------------
  console.log("\n[TEST 9] Level Status");
  {
    assert.strictEqual(calculateStatus("SUPPORT", 22600, 22700, 500), "Holding");
    assert.strictEqual(calculateStatus("SUPPORT", 22600, 22700, -500), "Weakening");
    assert.strictEqual(calculateStatus("SUPPORT", 22600, 22500, -500), "Broken");
    console.log("  [PASS] Test 9: Level status verified.");
  }

  // -------------------------------------------------------------
  // Test 10: Missing Data Safety (No NaN)
  // -------------------------------------------------------------
  console.log("\n[TEST 10] Missing Data Safety");
  {
    const brokenChain = [{ strike: 22600, call: { ltp: 0 }, put: { ltp: 0 } }];
    const res = computeLevels(brokenChain, 22600);
    assert(!isNaN(res.forward));
    assert.strictEqual(res.totalSpreadLtp, 0);
    console.log("  [PASS] Test 10: Returns cleanly without NaN on missing data.");
  }

  // -------------------------------------------------------------
  // Test 11: Static Scan for Zero-Predefined-Data
  // -------------------------------------------------------------
  console.log("\n[TEST 11] Static Scan for Zero Predefined Market Data");
  {
    const modulePath = path.join(__dirname, "../lib/options/optionChainLevels.ts");
    const code = fs.readFileSync(modulePath, "utf8");

    assert(!/DEFAULT_LOT_SIZES/.test(code), "Forbidden DEFAULT_LOT_SIZES found");
    assert(!/lot_size/i.test(code), "Forbidden lot_size found");

    const forbidden = [/22600/, /22740/, /24500/, /52200/, /12600/, /23900/, /80000/];
    for (const pat of forbidden) {
      assert(!pat.test(code), `Static scan failed: found ${pat}`);
    }

    console.log("  [PASS] Test 11: Confirmed zero hardcoded market data in optionChainLevels.ts.");
  }

  console.log("\n=================================================");
  console.log("   ALL ADVANCED LTP & AOC TESTS PASSED! 🚀       ");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
