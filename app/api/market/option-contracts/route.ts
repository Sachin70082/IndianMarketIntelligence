import { NextRequest, NextResponse } from "next/server";
import { getOptionContracts } from "@/lib/upstox/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const instrumentKey = searchParams.get("instrument_key") || searchParams.get("key") || "NSE_INDEX|Nifty 50";

    const contracts = await getOptionContracts(instrumentKey);

    return NextResponse.json({
      success: true,
      instrument_key: instrumentKey,
      data: contracts,
      expiries: contracts,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: (err as Error)?.message || "Failed to fetch option expiry dates",
      },
      { status: 500 }
    );
  }
}
