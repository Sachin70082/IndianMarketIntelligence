import { NextRequest, NextResponse } from "next/server";
import { getHistoricalCandles } from "@/lib/upstox/client";
import { calculateEMA } from "@/lib/indicators/ema";
import { calculateRSI } from "@/lib/indicators/rsi";
import { calculateATR } from "@/lib/indicators/atr";
import { calculateVWAP } from "@/lib/indicators/vwap";
import { generateMarketAnalysis } from "@/lib/market/analysis";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const instrumentKey = searchParams.get("instrument_key") || searchParams.get("key");
    let unitParam = searchParams.get("unit") || "minutes";
    let interval = searchParams.get("interval") || "1";
    const toDate = searchParams.get("to_date") || undefined;
    const fromDate = searchParams.get("from_date") || undefined;

    if (!instrumentKey || !instrumentKey.includes("|")) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid 'instrument_key' query parameter required (e.g., 'NSE_INDEX|Nifty 50')",
        },
        { status: 400 }
      );
    }

    // Normalize unit if singular
    if (unitParam === "minute") unitParam = "minutes";
    if (unitParam === "hour") unitParam = "hours";
    if (unitParam === "day") unitParam = "days";

    // Normalize interval (extract digits if e.g. "1minute" or "5m")
    interval = interval.replace(/\D/g, "") || "1";

    const validUnits = ["minutes", "hours", "days", "weeks", "months"];
    if (!validUnits.includes(unitParam)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid unit '${unitParam}'. Allowed: ${validUnits.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const unit = unitParam as "minutes" | "hours" | "days" | "weeks" | "months";
    const candles = await getHistoricalCandles(instrumentKey, unit, interval, toDate, fromDate);

    // Extract series for indicator calculations
    const closePrices = candles.map((c) => c.close);
    const ema20 = calculateEMA(closePrices, 20);
    const ema50 = calculateEMA(closePrices, 50);
    const rsi14 = calculateRSI(closePrices, 14);
    const atr14 = calculateATR(candles, 14);
    const vwapRes = calculateVWAP(candles);

    // Slicing to the most recent 500 candles for high-performance 60 FPS client rendering
    const maxCandles = unit === "minutes" ? 500 : unit === "hours" ? 300 : 365;
    const shouldSlice = candles.length > maxCandles;
    const finalCandles = shouldSlice ? candles.slice(-maxCandles) : candles;
    const finalEma20 = shouldSlice ? ema20.slice(-maxCandles) : ema20;
    const finalEma50 = shouldSlice ? ema50.slice(-maxCandles) : ema50;
    const finalRsi14 = shouldSlice ? rsi14.slice(-maxCandles) : rsi14;
    const finalAtr14 = shouldSlice ? atr14.slice(-maxCandles) : atr14;
    const finalVwap = shouldSlice ? vwapRes.values.slice(-maxCandles) : vwapRes.values;

    // Generate analytical report
    const lastPrice = finalCandles.length > 0 ? finalCandles[finalCandles.length - 1].close : 0;
    const lastTime = finalCandles.length > 0 ? finalCandles[finalCandles.length - 1].time : 0;
    const quoteAgeSeconds = Math.max(0, Math.floor(Date.now() / 1000 - lastTime));

    const analysis = generateMarketAnalysis({
      currentPrice: lastPrice,
      candles: finalCandles,
      ema20: finalEma20,
      ema50: finalEma50,
      rsi14: finalRsi14,
      atr14: finalAtr14,
      vwap: finalVwap,
      isFeedLiveOrRecent: true,
      quoteAgeSeconds,
    });

    return NextResponse.json({
      success: true,
      instrument_key: instrumentKey,
      unit,
      interval,
      candles: finalCandles,
      data: {
        candles: finalCandles,
        indicators: {
          ema20: finalEma20,
          ema50: finalEma50,
          rsi14: finalRsi14,
          atr14: finalAtr14,
          vwap: finalVwap,
          vwap_is_approximation: vwapRes.is_approximation,
          vwap_label: vwapRes.label,
        },
        analysis,
      },
      count: finalCandles.length,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    const message = (err as Error)?.message || "Failed to fetch historical candle data";
    const status = message.includes("invalid or expired") ? 401 : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}
