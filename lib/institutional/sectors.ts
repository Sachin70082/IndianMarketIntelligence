import { SectorScreeningSummary, SectorSentimentColor, InstitutionalStockSignal } from "./types";
import { SECTORS_LIST } from "@/lib/stocks/stockMaster";

/**
 * Sector Screening & Heatmap Engine
 * Aggregates institutional order block signals across sectors
 * to detect institutional rotation and sector dominance.
 */
export function computeSectorHeatmap(
  signals: InstitutionalStockSignal[]
): SectorScreeningSummary[] {
  const sectors = SECTORS_LIST.filter((s) => s !== "All Sectors");
  const summaries: SectorScreeningSummary[] = [];

  for (const sectorName of sectors) {
    const sectorStocks = signals.filter((s) => s.stock.sector === sectorName);
    const totalStocks = sectorStocks.length;

    if (totalStocks === 0) continue;

    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    let totalScore = 0;
    let totalRvol = 0;
    let totalChange = 0;

    let topBullish = { symbol: "-", companyName: "-", changePct: 0, score: 0 };
    let topBearish = { symbol: "-", companyName: "-", changePct: 0, score: 0 };

    for (const sig of sectorStocks) {
      totalScore += sig.compositeScore;
      totalRvol += sig.relativeVolume;
      totalChange += sig.changePct;

      if (sig.direction === "BULLISH") bullishCount++;
      else if (sig.direction === "BEARISH") bearishCount++;
      else neutralCount++;

      if (sig.changePct > topBullish.changePct || topBullish.symbol === "-") {
        topBullish = {
          symbol: sig.stock.symbol,
          companyName: sig.stock.companyName,
          changePct: sig.changePct,
          score: sig.compositeScore,
        };
      }

      if (sig.changePct < topBearish.changePct || topBearish.symbol === "-") {
        topBearish = {
          symbol: sig.stock.symbol,
          companyName: sig.stock.companyName,
          changePct: sig.changePct,
          score: sig.compositeScore,
        };
      }
    }

    const avgScore = Math.round(totalScore / totalStocks);
    const avgRvol = Number((totalRvol / totalStocks).toFixed(2));
    const sectorTrendPct = Number((totalChange / totalStocks).toFixed(2));

    // Determine Sentiment Color based on institutional score & breadth
    let sentimentColor: SectorSentimentColor = "GREY";
    const bullRatio = bullishCount / totalStocks;
    const bearRatio = bearishCount / totalStocks;

    if (avgScore >= 80 && bullRatio >= 0.65 && sectorTrendPct > 1.0) {
      sentimentColor = "DARK_GREEN";
    } else if (bullRatio >= 0.50 || (avgScore >= 70 && sectorTrendPct > 0.4)) {
      sentimentColor = "GREEN";
    } else if (avgScore >= 80 && bearRatio >= 0.65 && sectorTrendPct < -1.0) {
      sentimentColor = "DARK_RED";
    } else if (bearRatio >= 0.50 || (avgScore >= 70 && sectorTrendPct < -0.4)) {
      sentimentColor = "RED";
    } else if (bullRatio > 0.35 && bearRatio > 0.35) {
      sentimentColor = "YELLOW"; // Mixed / Liquidity Trap / Churn
    } else {
      sentimentColor = "GREY";
    }

    summaries.push({
      sectorName,
      totalStocks,
      bullishCount,
      bearishCount,
      neutralCount,
      avgInstitutionalScore: avgScore,
      avgRvol,
      sectorTrendPct,
      sentimentColor,
      topBullishStock: topBullish,
      topBearishStock: topBearish,
    });
  }

  // Sort by strongest sector performance
  return summaries.sort((a, b) => b.sectorTrendPct - a.sectorTrendPct);
}

