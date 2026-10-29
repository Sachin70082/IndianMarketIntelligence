import { generateStrikeOiHistory, getIstTime } from "../lib/options/strikeOiHistory.ts";

console.log("=================================================");
console.log("  RUNNING INTRADAY STRIKE OI HISTORY UNIT TESTS  ");
console.log("=================================================");

// Test 1: Market Hours (e.g., 11:30 AM IST)
const mockMorning = new Date("2026-10-29T06:00:00Z"); // 06:00 UTC = 11:30 AM IST
const resMorning = generateStrikeOiHistory({
  underlyingKey: "NSE_INDEX|Nifty 50",
  strike: 22600,
  expiry: "2026-10-29",
  currentCeChgOi: 450000,
  currentPeChgOi: 820000,
  currentCeOi: 1500000,
  currentPeOi: 2100000,
  now: mockMorning,
  stepMinutes: 5,
});

console.log("[TEST 1] Intraday Range from 09:15 to 11:30 AM IST");
console.log(`  Total data points: ${resMorning.points.length}`);
console.log(`  First point time: ${resMorning.points[0].time} (Expected: 09:15)`);
console.log(`  Last point time: ${resMorning.points[resMorning.points.length - 1].time} (Expected: 11:30)`);
console.log(`  Start CE Chg OI: ${resMorning.points[0].ceChgOi} (Expected: 0)`);
console.log(`  End CE Chg OI: ${resMorning.points[resMorning.points.length - 1].ceChgOi} (Expected: 450000)`);
console.log(`  End PE Chg OI: ${resMorning.points[resMorning.points.length - 1].peChgOi} (Expected: 820000)`);

if (
  resMorning.points[0].time === "09:15" &&
  resMorning.points[resMorning.points.length - 1].time === "11:30" &&
  resMorning.points[resMorning.points.length - 1].ceChgOi === 450000 &&
  resMorning.points[resMorning.points.length - 1].peChgOi === 820000 &&
  resMorning.points[0].minuteOfDay === 555 &&
  resMorning.points[resMorning.points.length - 1].minuteOfDay === 690
) {
  console.log("  [PASS] Test 1: Morning range, minuteOfDay, and terminal anchor exact match.");
} else {
  console.error("  [FAIL] Test 1 failed!");
  process.exit(1);
}

// Test 2: Dominance side calculation
console.log("\n[TEST 2] Writer Dominance & Net Difference");
console.log(`  Dominant Side: ${resMorning.dominantSide} (Expected: PE)`);
console.log(`  Net Difference: ${resMorning.netDifference} (Expected: 370000)`);

if (resMorning.dominantSide === "PE" && resMorning.netDifference === 370000) {
  console.log("  [PASS] Test 2: PE Writer Dominance correctly identified.");
} else {
  console.error("  [FAIL] Test 2 failed!");
  process.exit(1);
}

// Test 3: Market Close / Evening (e.g. 15:30 IST)
const mockClose = new Date("2026-10-29T10:00:00Z"); // 10:00 UTC = 15:30 PM IST
const resClose = generateStrikeOiHistory({
  underlyingKey: "NSE_INDEX|Nifty Bank",
  strike: 48500,
  expiry: "2026-10-29",
  currentCeChgOi: -150000,
  currentPeChgOi: 320000,
  currentCeOi: 800000,
  currentPeOi: 1200000,
  now: mockClose,
  stepMinutes: 15,
});

console.log("\n[TEST 3] Full Day Session (09:15 to 15:30) with 15m Step");
console.log(`  Total data points: ${resClose.points.length}`);
console.log(`  First: ${resClose.points[0].time}, Last: ${resClose.points[resClose.points.length - 1].time}`);
console.log(`  End CE Chg OI (Negative): ${resClose.points[resClose.points.length - 1].ceChgOi}`);
console.log(`  Min Value: ${resClose.minVal}, Max Value: ${resClose.maxVal}`);

if (
  resClose.points[0].time === "09:15" &&
  resClose.points[resClose.points.length - 1].time === "15:30" &&
  resClose.points[resClose.points.length - 1].ceChgOi === -150000
) {
  console.log("  [PASS] Test 3: Full day 15m step verified.");
} else {
  console.error("  [FAIL] Test 3 failed!");
  process.exit(1);
}

console.log("\n=================================================");
console.log("   ALL STRIKE OI HISTORY TESTS PASSED! 🚀        ");
console.log("=================================================");

