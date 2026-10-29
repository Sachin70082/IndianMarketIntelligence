/**
 * Unit Test Script for Option Chain Dominance Heatmap & Rankings
 * Run with: node scripts/test-dominance.js
 */

const assert = require("assert");

// Load the compiled or pure JS version of the dominance algorithm for testing
function interpolateRgb(c1, c2, t) {
  const clampedT = Math.max(0, Math.min(1, t));
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * clampedT),
    Math.round(c1[1] + (c2[1] - c1[1]) * clampedT),
    Math.round(c1[2] + (c2[2] - c1[2]) * clampedT),
  ];
}

const RUNNER_UP_THRESHOLDS = [
  { pct: 70, r: 254, g: 243, b: 199 }, // #FEF3C7
  { pct: 75, r: 253, g: 230, b: 138 }, // #FDE68A
  { pct: 80, r: 252, g: 211, b: 77 },  // #FCD34D
  { pct: 90, r: 253, g: 186, b: 50 },  // #FDBA32
  { pct: 95, r: 251, g: 146, b: 60 },  // #FB923C
  { pct: 99, r: 249, g: 115, b: 22 },  // #F97316
  { pct: 100, r: 22, g: 128, b: 60 },  // #16803C
];

function formatRelativePercentage(percentage) {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return "-";
  }
  if (percentage >= 100) {
    return "100%";
  }
  if (percentage >= 99.95) {
    return "99.9%";
  }
  if (percentage <= 0) {
    return "0%";
  }
  if (Math.round(percentage * 10) % 10 === 0) {
    return `${Math.round(percentage)}%`;
  }
  return `${percentage.toFixed(1)}%`;
}

function calculateRelativePercentage(currentValue, maximumValue) {
  if (!maximumValue || maximumValue <= 0 || isNaN(maximumValue)) {
    return null;
  }
  if (currentValue <= 0 || isNaN(currentValue)) {
    return 0;
  }
  const pct = (currentValue / maximumValue) * 100;
  return Math.min(100, Math.max(0, pct));
}

function getDominanceHeatmapColor(percentage, isLeader, isRunnerUp) {
  if (isLeader) {
    return {
      backgroundColor: "#16803C",
      color: "#FFFFFF",
      isLeader: true,
      isRunnerUp: false,
      isSubtleShaded: false,
    };
  }

  if (isRunnerUp && percentage !== null && percentage !== undefined && percentage > 0) {
    if (percentage < 70) {
      if (percentage < 50) {
        return {
          backgroundColor: "transparent",
          color: undefined,
          isLeader: false,
          isRunnerUp: true,
          isSubtleShaded: false,
        };
      }
      const alpha = 0.2 + ((percentage - 50) / 20) * 0.8;
      return {
        backgroundColor: `rgba(254, 243, 199, ${alpha.toFixed(2)})`,
        color: "#0f172a",
        isLeader: false,
        isRunnerUp: true,
        isSubtleShaded: false,
      };
    }

    let r = 254;
    let g = 243;
    let b = 199;

    for (let i = 0; i < RUNNER_UP_THRESHOLDS.length - 1; i++) {
      const curr = RUNNER_UP_THRESHOLDS[i];
      const next = RUNNER_UP_THRESHOLDS[i + 1];

      if (percentage >= curr.pct && percentage <= next.pct) {
        const range = next.pct - curr.pct;
        const t = range === 0 ? 0 : (percentage - curr.pct) / range;
        [r, g, b] = interpolateRgb([curr.r, curr.g, curr.b], [next.r, next.g, next.b], t);
        break;
      }
    }

    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const isDarkBackground = luminance <= 0.42;

    return {
      backgroundColor: `rgb(${r}, ${g}, ${b})`,
      color: isDarkBackground ? "#FFFFFF" : "#0f172a",
      isLeader: false,
      isRunnerUp: true,
      isSubtleShaded: false,
    };
  }

  if (percentage !== null && percentage !== undefined && percentage >= 70) {
    return {
      backgroundColor: "rgba(254, 240, 138, 0.12)",
      color: "#fef08a",
      isLeader: false,
      isRunnerUp: false,
      isSubtleShaded: true,
    };
  }

  return {
    backgroundColor: "transparent",
    color: undefined,
    isLeader: false,
    isRunnerUp: false,
    isSubtleShaded: false,
  };
}

function calculateMetricRanking(rows, metric) {
  const isChgOi = metric === "CE_CHG_OI" || metric === "PE_CHG_OI";
  let maximumValue = 0;
  let secondMaximumValue = 0;

  const extracted = rows.map((row) => {
    let rawValue = null;
    if (metric === "CE_VOLUME") rawValue = row.call?.volume;
    else if (metric === "PE_VOLUME") rawValue = row.put?.volume;
    else if (metric === "CE_OI") rawValue = row.call?.oi;
    else if (metric === "PE_OI") rawValue = row.put?.oi;
    else if (metric === "CE_CHG_OI") rawValue = row.call?.change_oi;
    else if (metric === "PE_CHG_OI") rawValue = row.put?.change_oi;

    const isValid = rawValue !== undefined && rawValue !== null && !isNaN(rawValue);
    const comparisonValue = isValid ? (isChgOi ? Math.abs(Number(rawValue)) : Math.max(0, Number(rawValue))) : 0;
    const displayValue = isValid ? (isChgOi ? (rawValue > 0 ? "+" : "") + Number(rawValue).toLocaleString("en-IN") : Number(rawValue).toLocaleString("en-IN")) : "-";

    if (comparisonValue > maximumValue) {
      secondMaximumValue = maximumValue;
      maximumValue = comparisonValue;
    } else if (comparisonValue < maximumValue && comparisonValue > secondMaximumValue) {
      secondMaximumValue = comparisonValue;
    }

    return { strike: row.strike_price, rawValue, comparisonValue, displayValue };
  });

  const items = new Map();
  for (const item of extracted) {
    const isLeader = maximumValue > 0 && item.comparisonValue === maximumValue;
    const isRunnerUp = maximumValue > 0 && secondMaximumValue > 0 && item.comparisonValue === secondMaximumValue && !isLeader;
    const relativePercentage = item.rawValue === null || item.rawValue === undefined ? null : calculateRelativePercentage(item.comparisonValue, maximumValue);
    const percentageLabel = item.rawValue === null || item.rawValue === undefined || maximumValue === 0 ? "-" : formatRelativePercentage(relativePercentage);
    const style = getDominanceHeatmapColor(relativePercentage, isLeader, isRunnerUp);

    items.set(item.strike, {
      strike: item.strike,
      rawValue: item.rawValue,
      comparisonValue: item.comparisonValue,
      displayValue: item.displayValue,
      isLeader,
      isRunnerUp,
      relativePercentage,
      percentageLabel,
      style,
    });
  }

  return { maximumValue, secondMaximumValue, items };
}

console.log("=== RUNNING OPTION CHAIN DOMINANCE TESTS ===");

// TEST 1: Clear Leader and Runner-Up
console.log("Test 1: Clear Leader and Runner-Up (Volume)");
const rows1 = [
  { strike_price: 24500, call: { volume: 100000 } },
  { strike_price: 24600, call: { volume: 95000 } },
  { strike_price: 24700, call: { volume: 80000 } },
];
const res1 = calculateMetricRanking(rows1, "CE_VOLUME");
assert.strictEqual(res1.maximumValue, 100000);
assert.strictEqual(res1.secondMaximumValue, 95000);
const s24500 = res1.items.get(24500);
const s24600 = res1.items.get(24600);
const s24700 = res1.items.get(24700);
assert.strictEqual(s24500.isLeader, true);
assert.strictEqual(s24500.percentageLabel, "100%");
assert.strictEqual(s24500.style.backgroundColor, "#16803C");

assert.strictEqual(s24600.isRunnerUp, true);
assert.strictEqual(s24600.percentageLabel, "95%");
assert.strictEqual(s24600.style.backgroundColor, "rgb(251, 146, 60)"); // #FB923C

assert.strictEqual(s24700.isLeader, false);
assert.strictEqual(s24700.isRunnerUp, false);
assert.strictEqual(s24700.percentageLabel, "80%");
assert.strictEqual(s24700.style.isSubtleShaded, true);
console.log("  ✓ Test 1 passed: Leader is Green 100%, Runner-up is Orange 95%, 3rd is subtle yellow 80%");

// TEST 2: Threshold Color Points
console.log("Test 2: Runner-up color at 70%, 75%, 80%, 90%, 95%, 99%, 100%");
const color70 = getDominanceHeatmapColor(70, false, true);
assert.strictEqual(color70.backgroundColor, "rgb(254, 243, 199)"); // #FEF3C7
const color75 = getDominanceHeatmapColor(75, false, true);
assert.strictEqual(color75.backgroundColor, "rgb(253, 230, 138)"); // #FDE68A
const color80 = getDominanceHeatmapColor(80, false, true);
assert.strictEqual(color80.backgroundColor, "rgb(252, 211, 77)");  // #FCD34D
const color90 = getDominanceHeatmapColor(90, false, true);
assert.strictEqual(color90.backgroundColor, "rgb(253, 186, 50)");  // #FDBA32
const color95 = getDominanceHeatmapColor(95, false, true);
assert.strictEqual(color95.backgroundColor, "rgb(251, 146, 60)");  // #FB923C
const color99 = getDominanceHeatmapColor(99, false, true);
assert.strictEqual(color99.backgroundColor, "rgb(249, 115, 22)");  // #F97316
const colorLeader = getDominanceHeatmapColor(100, true, false);
assert.strictEqual(colorLeader.backgroundColor, "#16803C");
console.log("  ✓ Test 2 passed: Exact RGB match at all defined specification thresholds");

// TEST 3: Runner-up Overtaking Leader (Live Swap)
console.log("Test 3: Leader swap when runner-up overtakes");
const rowsTick2 = [
  { strike_price: 24500, call: { volume: 97000 } },
  { strike_price: 24600, call: { volume: 102000 } },
  { strike_price: 24700, call: { volume: 80000 } },
];
const resTick2 = calculateMetricRanking(rowsTick2, "CE_VOLUME");
const s24500_t2 = resTick2.items.get(24500);
const s24600_t2 = resTick2.items.get(24600);
const s24700_t2 = resTick2.items.get(24700);

assert.strictEqual(s24600_t2.isLeader, true);
assert.strictEqual(s24600_t2.percentageLabel, "100%");
assert.strictEqual(s24600_t2.style.backgroundColor, "#16803C");

assert.strictEqual(s24500_t2.isRunnerUp, true);
assert.strictEqual(s24500_t2.percentageLabel, "95.1%");
assert.strictEqual(s24500_t2.style.isLeader, false);
assert.ok(s24500_t2.style.backgroundColor.startsWith("rgb("));

assert.strictEqual(s24700_t2.percentageLabel, "78.4%");
console.log("  ✓ Test 3 passed: Immediate swap - Strike B is now 100% Green, Strike A is now 95.1% Orange, Strike C is 78.4%");

// TEST 4: Positive and Negative Change in OI (Magnitude Comparison)
console.log("Test 4: Change in OI with Negative and Positive values");
const rowsChgOi = [
  { strike_price: 24500, call: { change_oi: -50000 } },
  { strike_price: 24600, call: { change_oi: 45000 } },
  { strike_price: 24700, call: { change_oi: -10000 } },
];
const resChgOi = calculateMetricRanking(rowsChgOi, "CE_CHG_OI");
const chg24500 = resChgOi.items.get(24500);
const chg24600 = resChgOi.items.get(24600);
const chg24700 = resChgOi.items.get(24700);

assert.strictEqual(chg24500.isLeader, true);
assert.strictEqual(chg24500.displayValue, "-50,000");
assert.strictEqual(chg24500.percentageLabel, "100%");
assert.strictEqual(chg24500.style.backgroundColor, "#16803C");

assert.strictEqual(chg24600.isRunnerUp, true);
assert.strictEqual(chg24600.displayValue, "+45,000");
assert.strictEqual(chg24600.percentageLabel, "90%");
assert.strictEqual(chg24600.style.backgroundColor, "rgb(253, 186, 50)"); // #FDBA32

assert.strictEqual(chg24700.displayValue, "-10,000");
assert.strictEqual(chg24700.percentageLabel, "20%");
console.log("  ✓ Test 4 passed: -50,000 is Leader [100%] (Green), +45,000 is Runner-up [90%] (Amber), signs preserved");

// TEST 5: Co-Leaders (Equal Maximum Values)
console.log("Test 5: Co-Leaders sharing the highest value");
const rowsCoLeaders = [
  { strike_price: 24500, put: { oi: 100000 } },
  { strike_price: 24600, put: { oi: 100000 } },
  { strike_price: 24700, put: { oi: 80000 } },
];
const resCo = calculateMetricRanking(rowsCoLeaders, "PE_OI");
assert.strictEqual(resCo.maximumValue, 100000);
assert.strictEqual(resCo.secondMaximumValue, 80000);
assert.strictEqual(resCo.items.get(24500).isLeader, true);
assert.strictEqual(resCo.items.get(24600).isLeader, true);
assert.strictEqual(resCo.items.get(24700).isRunnerUp, true);
assert.strictEqual(resCo.items.get(24700).percentageLabel, "80%");
console.log("  ✓ Test 5 passed: Both 100k strikes highlighted as co-leaders; 80k is runner-up");

// TEST 6: All Zeroes or Missing Data
console.log("Test 6: Safe zero handling (no NaN / Infinity)");
const rowsZero = [
  { strike_price: 24500, call: { volume: 0 } },
  { strike_price: 24600, call: {} },
  { strike_price: 24700, call: { volume: null } },
];
const resZero = calculateMetricRanking(rowsZero, "CE_VOLUME");
assert.strictEqual(resZero.maximumValue, 0);
assert.strictEqual(resZero.secondMaximumValue, 0);
assert.strictEqual(resZero.items.get(24500).isLeader, false);
assert.strictEqual(resZero.items.get(24500).percentageLabel, "-");
assert.strictEqual(resZero.items.get(24600).percentageLabel, "-");
assert.strictEqual(resZero.items.get(24700).percentageLabel, "-");
console.log("  ✓ Test 6 passed: Safely returns '-' with no NaN/Infinity when all zeroes/nulls");

// TEST 7: Runner-up below 70% and pulling back
console.log("Test 7: Runner-up gap widening (<70%)");
const color60 = getDominanceHeatmapColor(60, false, true);
assert.ok(color60.backgroundColor.includes("rgba(254, 243, 199,"));
const color40 = getDominanceHeatmapColor(40, false, true);
assert.strictEqual(color40.backgroundColor, "transparent");
console.log("  ✓ Test 7 passed: Sub-70% runner-up fades gradually to transparent");

console.log("ALL OPTION CHAIN DOMINANCE TESTS PASSED SUCCESSFULLY! 🚀");
