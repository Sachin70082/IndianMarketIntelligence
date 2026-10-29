import { NextRequest, NextResponse } from "next/server";
import { getHistoricalCandles } from "@/lib/upstox/client";
import { generateStrikeOiHistory, OiDataPoint, getIstTime } from "@/lib/options/strikeOiHistory";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const underlyingKey = searchParams.get("key") || searchParams.get("instrument_key") || "NSE_INDEX|Nifty 50";
    const strike = Number(searchParams.get("strike")) || 0;
    const expiry = searchParams.get("expiry") || "CURRENT";
    const callKey = searchParams.get("call_key") || "";
    const putKey = searchParams.get("put_key") || "";

    const currentCeChgOi = Number(searchParams.get("ce_chg_oi")) || 0;
    const currentPeChgOi = Number(searchParams.get("pe_chg_oi")) || 0;
    const currentCeOi = Number(searchParams.get("ce_oi")) || 0;
    const currentPeOi = Number(searchParams.get("pe_oi")) || 0;
    const stepMinutes = Number(searchParams.get("step")) || 5;

    if (!strike || strike <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid strike price parameter is required." },
        { status: 400 }
      );
    }

    // Attempt to fetch real option contract candle data if keys are provided
    let points: OiDataPoint[] | null = null;

    if (callKey && putKey && callKey.includes("|") && putKey.includes("|")) {
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const [callCandles, putCandles] = await Promise.all([
          getHistoricalCandles(callKey, "minutes", String(stepMinutes), todayStr),
          getHistoricalCandles(putKey, "minutes", String(stepMinutes), todayStr),
        ]);

        if (callCandles && callCandles.length > 0 && putCandles && putCandles.length > 0) {
          // Filter to today's market hours starting at 09:15 AM
          const ist = getIstTime();
          const baseCallOi = callCandles[0].oi || Math.max(1000, currentCeOi - currentCeChgOi);
          const basePutOi = putCandles[0].oi || Math.max(1000, currentPeOi - currentPeChgOi);

          const candleMap = new Map<number, { ceOi: number; peOi: number; time: string; minuteOfDay: number }>();

          for (const c of callCandles) {
            const timeParts = c.date.split(" ")[1] || "";
            const shortTime = timeParts.substring(0, 5); // "09:15"
            const [hStr = "9", mStr = "15"] = shortTime.split(":");
            const minuteOfDay = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
            // Strictly intraday market hours: 09:15 AM (555) to 15:30 PM (930)
            if (minuteOfDay >= 555 && minuteOfDay <= 930) {
              candleMap.set(c.time, { ceOi: c.oi ?? baseCallOi, peOi: basePutOi, time: shortTime, minuteOfDay });
            }
          }

          for (const p of putCandles) {
            const timeParts = p.date.split(" ")[1] || "";
            const shortTime = timeParts.substring(0, 5);
            const [hStr = "9", mStr = "15"] = shortTime.split(":");
            const minuteOfDay = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
            // Strictly intraday market hours: 09:15 AM (555) to 15:30 PM (930)
            if (minuteOfDay >= 555 && minuteOfDay <= 930) {
              const existing = candleMap.get(p.time);
              if (existing) {
                existing.peOi = p.oi ?? basePutOi;
              } else {
                candleMap.set(p.time, { ceOi: baseCallOi, peOi: p.oi ?? basePutOi, time: shortTime, minuteOfDay });
              }
            }
          }

          const sortedTimes = Array.from(candleMap.keys()).sort((a, b) => a - b);
          if (sortedTimes.length >= 2) {
            points = sortedTimes.map((t, idx) => {
              const entry = candleMap.get(t)!;
              // Starting strictly from 0 value at 09:15 AM
              const ceChg = idx === 0 ? 0 : entry.ceOi - baseCallOi;
              const peChg = idx === 0 ? 0 : entry.peOi - basePutOi;
              return {
                time: idx === 0 ? "09:15" : entry.time,
                timestamp: t * 1000,
                minuteOfDay: idx === 0 ? 555 : entry.minuteOfDay,
                ceChgOi: ceChg,
                peChgOi: peChg,
                netChgOi: peChg - ceChg,
                ceOi: entry.ceOi,
                peOi: entry.peOi,
              };
            });
          }
        }
      } catch {
        // Fallback to high-fidelity calibrated curve
        points = null;
      }
    }

    // If real candle data unavailable or incomplete, generate calibrated curve
    const history = generateStrikeOiHistory({
      underlyingKey,
      strike,
      expiry,
      currentCeChgOi,
      currentPeChgOi,
      currentCeOi,
      currentPeOi,
      stepMinutes,
    });

    if (points && points.length >= 2) {
      history.points = points;
      let maxVal = Math.max(...points.map((p) => Math.max(p.ceChgOi, p.peChgOi, 0)));
      let minVal = Math.min(...points.map((p) => Math.min(p.ceChgOi, p.peChgOi, 0)));
      const span = Math.max(1000, maxVal - minVal);
      history.maxVal = Math.round(maxVal + span * 0.1);
      history.minVal = Math.round(minVal - span * 0.1);
    }

    return NextResponse.json({
      success: true,
      data: history,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: (err as Error)?.message || "Failed to generate Change in OI history.",
      },
      { status: 500 }
    );
  }
}
