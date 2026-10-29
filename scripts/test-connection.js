/**
 * Upstox Analytics Token Connection Verification Script
 * Strictly safe: never logs or leaks your actual secret token.
 * 
 * Run with: node scripts/test-connection.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

console.log("=================================================");
console.log(" UPSTOX ANALYTICS TOKEN CONNECTION VERIFICATION ");
console.log("=================================================\n");

// 1. Locate .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
let token = process.env.UPSTOX_ANALYTICS_TOKEN || "";

if (!token && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/^UPSTOX_ANALYTICS_TOKEN=(.*)$/m);
  if (match && match[1]) {
    token = match[1].trim().replace(/^["']|["']$/g, "");
  }
}

if (!token) {
  console.log("❌ STATUS: UPSTOX_ANALYTICS_TOKEN is not configured.");
  console.log("\nTo configure your token:");
  console.log("1. Open or create '.env.local' in the project root.");
  console.log("2. Add: UPSTOX_ANALYTICS_TOKEN=your_token_here");
  console.log("3. Generate a free 1-year Analytics Token at https://upstox.com/developer/apps");
  console.log("4. Save .env.local and re-run this script.\n");
  process.exit(0);
}

// Mask token for safe diagnostic output (first 4 and last 4 chars)
const maskedToken = token.length > 8 
  ? `${token.slice(0, 4)}...${token.slice(-4)} (length: ${token.length})` 
  : "********";

console.log(`[1] Found Token in .env.local: ${maskedToken}`);
console.log(`[2] Read-Only Guarantee: No trading or order placement operations.`);
console.log(`[3] Sending test probe to Upstox Market Quotes V3 API...`);

const testUrl = "https://api.upstox.com/v3/market-quote/quotes?instrument_key=NSE_INDEX%7CNifty%2050";
const t0 = Date.now();

const req = https.get(
  testUrl,
  {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "IndianMarketIntelligence/1.0",
    },
    timeout: 8000,
  },
  (res) => {
    const latency = Date.now() - t0;
    let rawData = "";

    res.on("data", (chunk) => {
      rawData += chunk;
    });

    res.on("end", () => {
      const istTime = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" });
      console.log(`\n--- UPSTOX RESPONSE RECEIVED (${latency}ms at ${istTime} IST) ---`);
      console.log(`HTTP Status Code: ${res.statusCode} ${res.statusMessage}`);

      try {
        const parsed = JSON.parse(rawData);
        if (res.statusCode === 200 && parsed.status === "success") {
          console.log("\n✅ SUCCESS: Connection established!");
          const data = parsed.data || {};
          const quote = data["NSE_INDEX:Nifty 50"] || Object.values(data)[0];
          if (quote) {
            console.log(`   Instrument: NIFTY 50`);
            const prevClose = quote.prev_close_price || quote.ohlc?.close || (quote.last_price && quote.net_change ? quote.last_price - quote.net_change : 0);
            const pct = quote.percentage_change ?? (prevClose > 0 ? ((quote.net_change / prevClose) * 100).toFixed(2) : "0.00");
            console.log(`   Net Change: ${quote.net_change > 0 ? "+" : ""}${quote.net_change} (${quote.net_change > 0 ? "+" : ""}${pct}%)`);
            console.log(`   Volume: ${quote.volume?.toLocaleString("en-IN") || 0}`);
            console.log(`   Source Timestamp: ${quote.timestamp || "N/A"}`);
          }
          console.log("\nYour Upstox Analytics Token is valid, active, and ready for use with the dashboard!");
        } else if (res.statusCode === 401) {
          console.log("\n⚠️ UNAUTHORIZED (401): The token was rejected by Upstox.");
          console.log("   Possible reasons:");
          console.log("   - The token has expired (Analytics Tokens last 1 year from creation).");
          console.log("   - The token was copied with trailing spaces or line breaks.");
          console.log("   - Generate a fresh token in the Upstox Developer Portal (https://upstox.com/developer/apps).");
        } else if (res.statusCode === 429) {
          console.log("\n⚠️ RATE LIMITED (429): Upstox request quota reached. Please wait a moment.");
        } else {
          console.log(`\n⚠️ Notice: Response status '${parsed.status || "error"}'`);
          if (parsed.errors && parsed.errors.length > 0) {
            parsed.errors.forEach((e) => {
              console.log(`   - ${e.errorCode || ""}: ${e.message || JSON.stringify(e)}`);
            });
          }
        }
      } catch {
        console.log("Received raw non-JSON response from server.");
      }
      console.log("\n=================================================\n");
    });
  }
);

req.on("error", (e) => {
  console.log(`\n❌ Network Error connecting to Upstox: ${e.message}`);
  console.log("Please verify your internet connection or proxy settings.\n");
});

req.on("timeout", () => {
  req.destroy();
  console.log("\n❌ Request timed out after 8000ms.\n");
});
