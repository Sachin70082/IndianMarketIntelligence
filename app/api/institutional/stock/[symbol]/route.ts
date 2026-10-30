import { NextRequest, NextResponse } from "next/server";
import { institutionalScannerService } from "@/lib/institutional/scannerService";
import { stockUniverseMaster } from "@/lib/stocks/stockMaster";
import { detectOrderBlocks } from "@/lib/institutional/orderBlocks";
import { detectLiquidityPools } from "@/lib/institutional/liquidity";
import { getHistoricalCandles } from "@/lib/upstox/client";
import { analyzeStockInstitutionalSignals } from "@/lib/institutional/ranking";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    if (!symbol) {
      return NextResponse.json({ success: false, error: "Stock symbol required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "15m";

    const stock = stockUniverseMaster.getStockBySymbol(symbol);
    if (!stock) {
      return NextResponse.json({ success: false, error: `Stock ${symbol} not found in database` }, { status: 404 });
    }

    let signal = institutionalScannerService.getSignalBySymbol(symbol);
    let candles: any[] = [];

    // Attempt to load genuine historical/intraday candles via Upstox API if instrument key is available
    if (stock.instrumentKeyNSE) {
      try {
        let interval = "15";
        let unit: "minutes" | "hours" | "days" = "minutes";
        if (timeframe === "1m") { interval = "1"; unit = "minutes"; }
        else if (timeframe === "3m") { interval = "3"; unit = "minutes"; }
        else if (timeframe === "5m") { interval = "5"; unit = "minutes"; }
        else if (timeframe === "15m") { interval = "15"; unit = "minutes"; }
        else if (timeframe === "30m") { interval = "30"; unit = "minutes"; }
        else if (timeframe === "1h") { interval = "1"; unit = "hours"; }
        else if (timeframe === "4h") { interval = "4"; unit = "hours"; }
        else if (timeframe === "1d") { interval = "1"; unit = "days"; }

        const fetched = await getHistoricalCandles(stock.instrumentKeyNSE, unit, interval);
        if (Array.isArray(fetched) && fetched.length > 0) {
          candles = fetched;
        }
      } catch (err) {
        // Fallback to calibrated stock candles
      }
    }

    if (candles.length === 0) {
      candles = institutionalScannerService.getStockCandles(symbol, timeframe);
    }

    // Re-analyze signals on the active timeframe candles if not yet generated
    if (!signal && candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      const prevClose = candles.length > 1 ? candles[candles.length - 2].close : lastCandle.open;
      const changePct = Number((((lastCandle.close - prevClose) / prevClose) * 100).toFixed(2));
      signal = analyzeStockInstitutionalSignals({
        stock,
        candles,
        liveQuote: {
          ltp: lastCandle.close,
          changePct,
          volume: lastCandle.volume,
          prevClose,
        },
        timeframe,
      });
    }

    const { orderBlocks, activeBullishOB, activeBearishOB } = detectOrderBlocks(candles, symbol, timeframe);
    const { liquidityLevels, nearestPool, activeTrapScore } = detectLiquidityPools(candles, symbol);

    return NextResponse.json({
      success: true,
      stock,
      signal: signal || null,
      candles,
      orderBlocks,
      activeBullishOB,
      activeBearishOB,
      liquidityLevels,
      nearestPool,
      activeTrapScore,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to load stock institutional intelligence",
      },
      { status: 500 }
    );
  }
}

