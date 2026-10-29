import { NextRequest } from "next/server";
import { getUpstoxFeedManager } from "@/lib/upstox/websocket";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keysParam = searchParams.get("keys");
  const keys = keysParam
    ? keysParam
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
    : [];

  const encoder = new TextEncoder();
  const feedManager = getUpstoxFeedManager();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial handshake
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "init", message: "SSE connected to Upstox stream relay" })}\n\n`)
      );

      // Listen for feed updates
      const removeListener = feedManager.addListener((payload) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // Controller might be closed
        }
      });

      // Subscribe requested keys
      if (keys.length > 0) {
        feedManager.subscribe(keys);
      }

      // Handle client disconnect
      req.signal.addEventListener("abort", () => {
        removeListener();
        if (keys.length > 0) {
          feedManager.unsubscribe(keys);
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
