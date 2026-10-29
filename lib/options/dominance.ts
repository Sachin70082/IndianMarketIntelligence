import { OptionChainRow } from "@/lib/types/market";

export type DominanceMetric =
  | "CE_VOLUME"
  | "PE_VOLUME"
  | "CE_OI"
  | "PE_OI"
  | "CE_CHG_OI"
  | "PE_CHG_OI";

export interface OptionChainDominanceStyle {
  backgroundColor: string;
  color?: string;
  borderColor?: string;
  boxShadow?: string;
  isLeader: boolean;
  isRunnerUp: boolean;
  isSubtleShaded: boolean;
  badgeBgColor?: string;
  badgeTextColor?: string;
  badgeBorderColor?: string;
}

export interface StrikeDominanceItem {
  strikePrice: number;
  metric: DominanceMetric;
  rawValue: number | null | undefined;
  displayValue: string; // Formatted value with sign for Chg OI (e.g. 1,45,200)
  compactDisplayValue: string; // Compact Indian formatted string (e.g. 1.45L, 45.2k)
  comparisonValue: number; // Positive magnitude for ranking
  rank: number; // 1 for leader, 2 for runner-up, 3 for 3rd, etc.
  isLeader: boolean;
  isRunnerUp: boolean;
  isSubtleShaded: boolean;
  relativePercentage: number | null; // e.g. 100, 95.1, 78.4, null if max is 0
  percentageLabel: string; // e.g. "100%", "95.1%", "-"
  style: OptionChainDominanceStyle;
}

export interface MetricRankingSummary {
  metric: DominanceMetric;
  maximumValue: number;
  secondMaximumValue: number;
  leaderStrikes: number[];
  runnerUpStrikes: number[];
  itemsByStrike: Map<number, StrikeDominanceItem>;
}

export interface OptionChainDominanceAnalysis {
  ceVolume: MetricRankingSummary;
  peVolume: MetricRankingSummary;
  ceOi: MetricRankingSummary;
  peOi: MetricRankingSummary;
  ceChgOi: MetricRankingSummary;
  peChgOi: MetricRankingSummary;
  getRanking: (metric: DominanceMetric, strike: number) => StrikeDominanceItem | undefined;
}

interface ColorThreshold {
  pct: number;
  r: number;
  g: number;
  b: number;
}

/**
 * Reference thresholds for runner-up yellow-orange-green interpolation.
 * Below 70%: Very light yellow or neutral
 * 70%: #FEF3C7
 * 75%: #FDE68A
 * 80%: #FCD34D
 * 90%: #FDBA32
 * 95%: #FB923C
 * 99%: #F97316
 * 100%: #16803C
 */
const RUNNER_UP_THRESHOLDS: ColorThreshold[] = [
  { pct: 70, r: 254, g: 243, b: 199 }, // #FEF3C7
  { pct: 75, r: 253, g: 230, b: 138 }, // #FDE68A
  { pct: 80, r: 252, g: 211, b: 77 },  // #FCD34D
  { pct: 90, r: 253, g: 186, b: 50 },  // #FDBA32
  { pct: 95, r: 251, g: 146, b: 60 },  // #FB923C
  { pct: 99, r: 249, g: 115, b: 22 },  // #F97316
  { pct: 100, r: 22, g: 128, b: 60 },  // #16803C
];

/**
 * Helper to smoothly interpolate between two RGB colors
 */
export function interpolateRgb(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] {
  const clampedT = Math.max(0, Math.min(1, t));
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * clampedT),
    Math.round(c1[1] + (c2[1] - c1[1]) * clampedT),
    Math.round(c1[2] + (c2[2] - c1[2]) * clampedT),
  ];
}

/**
 * Formats relative percentage: e.g. "100%", "95.1%", "80%", or "-" if unavailable.
 */
export function formatRelativePercentage(percentage: number | null | undefined): string {
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
  // If whole number (like 70, 75, 80, 95):
  if (Math.round(percentage * 10) % 10 === 0) {
    return `${Math.round(percentage)}%`;
  }
  // Otherwise 1 decimal place (e.g. 94.7%, 78.4%):
  return `${percentage.toFixed(1)}%`;
}

/**
 * Calculates relative percentage: (currentValue / maximumValue) * 100
 * Handles zero, negative, and invalid values safely without NaN/Infinity.
 */
export function calculateRelativePercentage(
  currentValue: number,
  maximumValue: number
): number | null {
  if (!maximumValue || maximumValue <= 0 || isNaN(maximumValue)) {
    return null;
  }
  if (currentValue <= 0 || isNaN(currentValue)) {
    return 0;
  }
  const pct = (currentValue / maximumValue) * 100;
  return Math.min(100, Math.max(0, pct));
}

/**
 * Computes the dynamic heatmap style for a cell according to its dominance ranking
 */
export function getDominanceHeatmapColor(
  percentage: number | null | undefined,
  isLeader: boolean,
  isRunnerUp: boolean
): OptionChainDominanceStyle {
  // 1. Leader: Strong Green #16803C with high-contrast white text & subtle glowing border
  if (isLeader) {
    return {
      backgroundColor: "#16803C",
      color: "#FFFFFF",
      borderColor: "rgba(74, 222, 128, 0.8)",
      boxShadow: "0 0 10px rgba(22, 128, 60, 0.45)",
      isLeader: true,
      isRunnerUp: false,
      isSubtleShaded: false,
      badgeBgColor: "rgba(5, 46, 22, 0.75)",
      badgeTextColor: "#86efac",
      badgeBorderColor: "rgba(74, 222, 128, 0.5)",
    };
  }

  // 2. Runner-Up: Dynamic yellow -> orange -> green interpolation
  if (isRunnerUp && percentage !== null && percentage !== undefined && percentage > 0) {
    // If below 70%: very light yellow or neutral
    if (percentage < 70) {
      if (percentage < 50) {
        // Neutral / subtle
        return {
          backgroundColor: "transparent",
          color: undefined,
          borderColor: "rgba(254, 243, 199, 0.2)",
          isLeader: false,
          isRunnerUp: true,
          isSubtleShaded: false,
          badgeBgColor: "rgba(30, 41, 59, 0.7)",
          badgeTextColor: "#cbd5e1",
          badgeBorderColor: "rgba(148, 163, 184, 0.3)",
        };
      }
      // Between 50% and 70%: fade in light yellow #FEF3C7
      const alpha = 0.2 + ((percentage - 50) / 20) * 0.8;
      return {
        backgroundColor: `rgba(254, 243, 199, ${alpha.toFixed(2)})`,
        color: "#0f172a",
        borderColor: "rgba(254, 243, 199, 0.6)",
        boxShadow: "0 0 6px rgba(254, 243, 199, 0.25)",
        isLeader: false,
        isRunnerUp: true,
        isSubtleShaded: false,
        badgeBgColor: "rgba(15, 23, 42, 0.15)",
        badgeTextColor: "#0f172a",
        badgeBorderColor: "rgba(15, 23, 42, 0.25)",
      };
    }

    // Between 70% and 100%: smooth linear interpolation between defined color stops
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

    // Relative perceived luminance calculation for WCAG AA text readability
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const isDarkBackground = luminance <= 0.42;

    const textColor = isDarkBackground ? "#FFFFFF" : "#0f172a";
    const badgeBg = isDarkBackground ? "rgba(0, 0, 0, 0.35)" : "rgba(15, 23, 42, 0.15)";
    const badgeText = isDarkBackground ? "#FFFFFF" : "#0f172a";
    const badgeBorder = isDarkBackground ? "rgba(255, 255, 255, 0.3)" : "rgba(15, 23, 42, 0.2)";

    return {
      backgroundColor: `rgb(${r}, ${g}, ${b})`,
      color: textColor,
      borderColor: isDarkBackground ? "rgba(255, 255, 255, 0.4)" : "rgba(15, 23, 42, 0.25)",
      boxShadow: `0 0 8px rgba(${r}, ${g}, ${b}, 0.4)`,
      isLeader: false,
      isRunnerUp: true,
      isSubtleShaded: false,
      badgeBgColor: badgeBg,
      badgeTextColor: badgeText,
      badgeBorderColor: badgeBorder,
    };
  }

  // 3. Other strikes: Subtle shading if relative strength is notable (>= 70%)
  if (percentage !== null && percentage !== undefined && percentage >= 70) {
    return {
      backgroundColor: "rgba(254, 240, 138, 0.12)",
      color: "#fef08a",
      borderColor: "rgba(234, 179, 8, 0.25)",
      isLeader: false,
      isRunnerUp: false,
      isSubtleShaded: true,
      badgeBgColor: "rgba(234, 179, 8, 0.18)",
      badgeTextColor: "#fde047",
      badgeBorderColor: "rgba(234, 179, 8, 0.3)",
    };
  }

  // 4. Default / Neutral strikes
  return {
    backgroundColor: "transparent",
    color: undefined,
    borderColor: undefined,
    isLeader: false,
    isRunnerUp: false,
    isSubtleShaded: false,
    badgeBgColor: "rgba(30, 41, 59, 0.5)",
    badgeTextColor: "#94a3b8",
    badgeBorderColor: "rgba(51, 65, 85, 0.4)",
  };
}

/**
 * Compact Indian numbering system formatter (e.g. 1.25Cr, 4.50L, 85.2k)
 */
export function formatCompactIndianNumber(num: number): string {
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 10000000) {
    const val = (abs / 10000000).toFixed(2).replace(/\.?0+$/, "");
    return sign + val + "Cr";
  }
  if (abs >= 100000) {
    const val = (abs / 100000).toFixed(2).replace(/\.?0+$/, "");
    return sign + val + "L";
  }
  if (abs >= 1000) {
    const val = (abs / 1000).toFixed(1).replace(/\.?0+$/, "");
    return sign + val + "k";
  }
  return sign + abs.toString();
}

/**
 * Extracts the raw, comparison, display, and compact values for a given metric from an option chain row.
 */
function extractMetricData(
  row: OptionChainRow,
  metric: DominanceMetric
): { rawValue: number | null | undefined; comparisonValue: number; displayValue: string; compactDisplayValue: string } {
  let rawValue: number | null | undefined = null;
  const isChgOi = metric === "CE_CHG_OI" || metric === "PE_CHG_OI";

  switch (metric) {
    case "CE_VOLUME":
      rawValue = row.call?.volume;
      break;
    case "PE_VOLUME":
      rawValue = row.put?.volume;
      break;
    case "CE_OI":
      rawValue = row.call?.oi;
      break;
    case "PE_OI":
      rawValue = row.put?.oi;
      break;
    case "CE_CHG_OI":
      rawValue = row.call?.change_oi;
      break;
    case "PE_CHG_OI":
      rawValue = row.put?.change_oi;
      break;
  }

  const isValidNumber = rawValue !== undefined && rawValue !== null && !isNaN(rawValue);

  if (!isValidNumber) {
    return {
      rawValue,
      comparisonValue: 0,
      displayValue: "-",
      compactDisplayValue: "-",
    };
  }

  if (isChgOi) {
    const val = Number(rawValue);
    // For Change in OI, magnitude is compared, while original sign is displayed
    const comparisonValue = Math.abs(val);
    const displayValue = (val > 0 ? "+" : "") + val.toLocaleString("en-IN");
    const compactDisplayValue = (val > 0 ? "+" : "") + formatCompactIndianNumber(val);
    return { rawValue, comparisonValue, displayValue, compactDisplayValue };
  } else {
    const val = Number(rawValue);
    const comparisonValue = Math.max(0, val);
    const displayValue = val.toLocaleString("en-IN");
    const compactDisplayValue = formatCompactIndianNumber(val);
    return { rawValue, comparisonValue, displayValue, compactDisplayValue };
  }
}

/**
 * Calculates ranking, leader, runner-up, relative percentages, and styles
 * for one of the six independent option-chain datasets across all loaded strikes in O(N) time.
 */
export function calculateMetricRanking(
  rows: OptionChainRow[],
  metric: DominanceMetric
): MetricRankingSummary {
  const itemsByStrike = new Map<number, StrikeDominanceItem>();
  if (!rows || rows.length === 0) {
    return {
      metric,
      maximumValue: 0,
      secondMaximumValue: 0,
      leaderStrikes: [],
      runnerUpStrikes: [],
      itemsByStrike,
    };
  }

  // Pass 1: Extract comparison values and determine 1st highest and 2nd highest in O(N)
  let maximumValue = 0;
  let secondMaximumValue = 0;

  const extractedList: Array<{
    strike: number;
    rawValue: number | null | undefined;
    comparisonValue: number;
    displayValue: string;
    compactDisplayValue: string;
  }> = new Array(rows.length);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const data = extractMetricData(row, metric);
    extractedList[i] = {
      strike: row.strike_price,
      ...data,
    };

    const comp = data.comparisonValue;
    if (comp > maximumValue) {
      secondMaximumValue = maximumValue;
      maximumValue = comp;
    } else if (comp < maximumValue && comp > secondMaximumValue) {
      secondMaximumValue = comp;
    }
  }

  const leaderStrikes: number[] = [];
  const runnerUpStrikes: number[] = [];

  // Pass 2: Calculate relative percentages, determine leader / runner-up, and generate styles in O(N)
  for (let i = 0; i < extractedList.length; i++) {
    const item = extractedList[i];
    const comp = item.comparisonValue;

    const isLeader = maximumValue > 0 && comp === maximumValue;
    const isRunnerUp =
      maximumValue > 0 &&
      secondMaximumValue > 0 &&
      comp === secondMaximumValue &&
      !isLeader;

    if (isLeader) leaderStrikes.push(item.strike);
    if (isRunnerUp) runnerUpStrikes.push(item.strike);

    const relativePercentage =
      item.rawValue === null || item.rawValue === undefined
        ? null
        : calculateRelativePercentage(comp, maximumValue);

    const rank = isLeader ? 1 : isRunnerUp ? 2 : 3;
    const style = getDominanceHeatmapColor(relativePercentage, isLeader, isRunnerUp);
    const percentageLabel =
      item.rawValue === null || item.rawValue === undefined || maximumValue === 0
        ? "-"
        : formatRelativePercentage(relativePercentage);

    itemsByStrike.set(item.strike, {
      strikePrice: item.strike,
      metric,
      rawValue: item.rawValue,
      displayValue: item.displayValue,
      compactDisplayValue: item.compactDisplayValue,
      comparisonValue: comp,
      rank,
      isLeader,
      isRunnerUp,
      isSubtleShaded: style.isSubtleShaded,
      relativePercentage,
      percentageLabel,
      style,
    });
  }

  return {
    metric,
    maximumValue,
    secondMaximumValue,
    leaderStrikes,
    runnerUpStrikes,
    itemsByStrike,
  };
}

/**
 * Computes all 6 independent live rankings across the entire currently loaded option chain.
 * - CE Volume
 * - PE Volume
 * - CE Open Interest
 * - PE Open Interest
 * - CE Change in OI
 * - PE Change in OI
 */
export function calculateOptionChainDominance(
  allLoadedStrikes: OptionChainRow[]
): OptionChainDominanceAnalysis {
  const ceVolume = calculateMetricRanking(allLoadedStrikes, "CE_VOLUME");
  const peVolume = calculateMetricRanking(allLoadedStrikes, "PE_VOLUME");
  const ceOi = calculateMetricRanking(allLoadedStrikes, "CE_OI");
  const peOi = calculateMetricRanking(allLoadedStrikes, "PE_OI");
  const ceChgOi = calculateMetricRanking(allLoadedStrikes, "CE_CHG_OI");
  const peChgOi = calculateMetricRanking(allLoadedStrikes, "PE_CHG_OI");

  const getRanking = (metric: DominanceMetric, strike: number): StrikeDominanceItem | undefined => {
    switch (metric) {
      case "CE_VOLUME":
        return ceVolume.itemsByStrike.get(strike);
      case "PE_VOLUME":
        return peVolume.itemsByStrike.get(strike);
      case "CE_OI":
        return ceOi.itemsByStrike.get(strike);
      case "PE_OI":
        return peOi.itemsByStrike.get(strike);
      case "CE_CHG_OI":
        return ceChgOi.itemsByStrike.get(strike);
      case "PE_CHG_OI":
        return peChgOi.itemsByStrike.get(strike);
    }
  };

  return {
    ceVolume,
    peVolume,
    ceOi,
    peOi,
    ceChgOi,
    peChgOi,
    getRanking,
  };
}
