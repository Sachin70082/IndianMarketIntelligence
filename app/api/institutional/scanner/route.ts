import { NextRequest, NextResponse } from "next/server";
import { institutionalScannerService } from "@/lib/institutional/scannerService";
import { stockUniverseMaster } from "@/lib/stocks/stockMaster";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || undefined;
    const sector = searchParams.get("sector") || undefined;
    const exchange = (searchParams.get("exchange") as "ALL" | "NSE" | "BSE") || "ALL";
    const marketCap = searchParams.get("marketCap") || undefined;
    const direction = (searchParams.get("direction") as "BULLISH" | "BEARISH") || "BULLISH";

    // Fast search from 5,700+ stock universe
    const { items: searchedStocks, total: totalFound } = stockUniverseMaster.searchStocks({
      query,
      sector,
      exchange,
      marketCap,
      limit: 30,
    });

    const marketSummary = institutionalScannerService.getMarketSummary();
    const bullishSetups = sector && sector !== "All Sectors"
      ? institutionalScannerService.getSignalsForSector(sector, "BULLISH")
      : institutionalScannerService.getTop20Stocks("BULLISH");

    const bearishSetups = sector && sector !== "All Sectors"
      ? institutionalScannerService.getSignalsForSector(sector, "BEARISH")
      : institutionalScannerService.getTop20Stocks("BEARISH");

    const sectors = institutionalScannerService.getSectorSummaries();
    const largeOrders = institutionalScannerService.getLargeOrders();

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      marketSummary,
      bullishSetups,
      bearishSetups,
      topOpportunities: bullishSetups,
      top20: direction === "BULLISH" ? bullishSetups : bearishSetups,
      sectors,
      largeOrders,
      searchedStocks,
      totalFound,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to process institutional scanner request",
      },
      { status: 500 }
    );
  }
}

