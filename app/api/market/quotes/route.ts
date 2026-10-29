import { NextRequest, NextResponse } from "next/server";
import { getMarketQuotes } from "@/lib/upstox/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keysParam = searchParams.get("keys");

    if (!keysParam) {
      return NextResponse.json(
        { success: false, error: "Missing required 'keys' query parameter" },
        { status: 400 }
      );
    }

    const keys = keysParam
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keys.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid instrument keys supplied" },
        { status: 400 }
      );
    }

    // Validate key pattern (e.g. EXCHANGE|SYMBOL)
    for (const k of keys) {
      if (!k.includes("|")) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid instrument key '${k}'. Format must be EXCHANGE|SYMBOL (e.g. 'NSE_INDEX|Nifty 50' or 'NSE_EQ|INE002A01018')`,
          },
          { status: 400 }
        );
      }
    }

    const quotes = await getMarketQuotes(keys);

    return NextResponse.json({
      success: true,
      data: quotes,
      quotes: Object.values(quotes),
      count: Object.keys(quotes).length,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    const message = (err as Error)?.message || "Failed to fetch market quotes";
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
