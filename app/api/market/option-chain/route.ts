import { NextRequest, NextResponse } from "next/server";
import { getOptionChain } from "@/lib/upstox/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const instrumentKey = searchParams.get("instrument_key") || searchParams.get("key") || "NSE_INDEX|Nifty 50";
    const expiryDate = searchParams.get("expiry_date") || searchParams.get("expiry") || "current_week";

    if (!instrumentKey.includes("|")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid instrument key for option chain (e.g. 'NSE_INDEX|Nifty 50')",
        },
        { status: 400 }
      );
    }

    const optionChain = await getOptionChain(instrumentKey, expiryDate);

    return NextResponse.json({
      success: true,
      data: optionChain,
      chain: optionChain,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    const message = (err as Error)?.message || "Failed to fetch option chain";
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
