import { NextResponse } from "next/server";
import { testUpstoxConnection } from "@/lib/upstox/client";
import { getMarketSessionStatus } from "@/lib/market/sessions";

export async function GET() {
  try {
    const session = getMarketSessionStatus();
    const connection = await testUpstoxConnection();

    return NextResponse.json({
      success: true,
      tokenConfigured: connection.is_configured && connection.status === "CONNECTED",
      session,
      connection,
      clockSkewMs: 0,
      data: {
        session,
        connection,
        timestamp: Date.now(),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: (err as Error)?.message || "Internal server error checking market status",
      },
      { status: 500 }
    );
  }
}
