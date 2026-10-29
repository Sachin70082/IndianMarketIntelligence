# Indian Market Intelligence Dashboard 🇮🇳 📈

A production-grade, strictly **read-only** Indian stock market intelligence dashboard and financial terminal built with **Next.js App Router**, **TypeScript**, **React**, **Tailwind CSS**, and the official **Upstox Analytics Token API V3**.

![Indian Market Intelligence](https://img.shields.io/badge/Security-Strictly%20Read--Only-emerald?style=for-the-badge&logo=shield)
![Upstox API](https://img.shields.io/badge/Broker-Upstox%20V3%20API-blue?style=for-the-badge)
![Next.js 16](https://img.shields.io/badge/Next.js-App%20Router-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript)

---

## 📑 Table of Contents

1. [Architecture & Security Philosophy](#1-architecture--security-philosophy)
2. [Key Capabilities & Features](#2-key-capabilities--features)
3. [Windows PowerShell Setup Guide](#3-windows-powershell-setup-guide)
4. [Upstox Analytics Token Configuration](#4-upstox-analytics-token-configuration)
5. [Testing & Verification Suite](#5-testing--verification-suite)
6. [Supported API Endpoints & Protocols](#6-supported-api-endpoints--protocols)
7. [Upstox Analytics Token Scope & Limitations](#7-upstox-analytics-token-scope--limitations)
8. [Troubleshooting Common Issues](#8-troubleshooting-common-issues)
9. [Project Structure](#9-project-structure)

---

## 1. Architecture & Security Philosophy

### 🔒 Absolute Security & Read-Only Guarantee
- **Server-Side Token Storage**: The secret token is stored **only** in `.env.local` as `UPSTOX_ANALYTICS_TOKEN` and read strictly via `process.env.UPSTOX_ANALYTICS_TOKEN` inside server routes.
- **Zero Client Leakage**: The token is **never** exposed through `NEXT_PUBLIC_*` variables, never transmitted in API responses, and never bundled into client JavaScript.
- **Header & Log Sanitization**: Authorization headers and credentials are automatically scrubbed from all diagnostic logs, error payloads, and console output.
- **Zero Order Operations**: This application contains **no endpoints, services, or functions** for placing, modifying, or cancelling orders. It is cryptographically and architecturally impossible for this application to place trades.
- **No Synthetic Price Fabrication**: If an API call fails or a token is missing, the dashboard renders clear status indicators (`UNKNOWN`, `DISCONNECTED`, `STALE`), never fictitious or simulated prices.

```
┌────────────────────────────────────────────────────────┐
│                   Browser Client                       │
│  - Interactive Lightweight Charts Candlesticks        │
│  - Real-Time Put/Call Option Chain & Greeks            │
│  - Multi-Factor Confluence Analysis Engine             │
│  - Server-Sent Events (SSE) Listener                   │
└───────────────▲──────────────────────────▲─────────────┘
                │ REST JSON                │ SSE Stream
                │ (Sanitized)              │ (JSON Ticks)
┌───────────────┴──────────────────────────┴─────────────┐
│              Next.js Server-Side APIs                  │
│  - /api/market/quotes (In-memory TTL Cache & Throttling)│
│  - /api/market/candles (Historical Lookback V3)       │
│  - /api/market/option-chain (PCR & Max Pain Analysis) │
│  - /api/market/stream (Protobuf Binary WebSocket Feed) │
│  - /api/market/status (Health & Clock Skew Detection)  │
│                                                        │
│  Reads: process.env.UPSTOX_ANALYTICS_TOKEN             │
└──────────────────────────▲─────────────────────────────┘
                           │ Authorized HTTPS & WSS
                           │ (Bearer Token Attached)
┌──────────────────────────┴─────────────────────────────┐
│                 Official Upstox API                    │
│  - https://api.upstox.com/v3/market-quote/quotes       │
│  - https://api.upstox.com/v3/historical-candle/...     │
│  - https://api.upstox.com/v2/option/chain             │
│  - wss://api.upstox.com/v3/feed/market-data-feed      │
└────────────────────────────────────────────────────────┘
```

---

## 2. Key Capabilities & Upgraded Engine Features

### 🇮🇳 Phase 0 — Data Layer & Read-Only Security
- **Strictly Read-Only Guarantee**: Zero broker endpoints or code paths exist for order placement.
- **Server-Side Token Isolation**: `UPSTOX_ANALYTICS_TOKEN` read strictly inside server route handlers from `.env.local`. Never exposed to client bundles or browser logs.
- **Data Quality & Freshness Engine**: Continuous clock-skew detection, ISO 8601 parsing, stale quote detection (`LIVE`, `RECENT`, `STALE`, `UNKNOWN`), and graceful market closure handling.

### 🕯️ Phase 1 — Candlestick & Price-Action Engine
- **Granular Supported Timeframes**: 1m, 3m, 5m, 15m, and 1h intervals.
- **Multi-Timeframe Alignment Matrix**: Synthesizes micro-structure (1m, 3m), primary execution (5m), intermediate structure (15m), and macro trend confirmation (1h) with alignment scoring.
- **10 Core Candle Patterns**:
  - Hammer, Inverted Hammer, Shooting Star, Hanging Man
  - Bullish Engulfing, Bearish Engulfing
  - Inside Bar, Morning Star, Evening Star, Marubozu, Doji
  - Each pattern evaluated with location context, confirmation criteria, invalidation prices, and quality scores.
- **Market Structure & Levels**:
  - 5-candle fractal Swing Highs & Swing Lows
  - Break of Structure (BOS) & Change of Character (ChoCh)
  - Previous Day Levels (PDH, PDL, PDC, PDO)
  - 15-minute Opening Range Breakout (ORB) zones.

### ⛓️ Phase 2 — Advanced Option-Chain Engine
- **Open Interest & Volume Put-Call Ratios**: Dual PCR metrics with historical bias classification.
- **ATM Straddle Price & Implied Range**: Combined ATM CE + PE premium pricing determining expected market range.
- **Dynamic S/R from Strike Concentration**: Highest Call OI (Resistance Zone) and Highest Put OI (Support Zone).
- **Price & OI Buildup Classifier**:
  - `LONG_BUILDUP`: Price ↑ & OI ↑
  - `SHORT_BUILDUP`: Price ↓ & OI ↑
  - `SHORT_COVERING`: Price ↑ & OI ↓
  - `LONG_UNWINDING`: Price ↓ & OI ↓
  - `UNCERTAIN`: Ambiguous or neutral evidence.
- Complete Greeks display: Delta, Theta, Gamma, Vega, Rho, and Implied Volatility (IV).

### 🌐 Phase 3 — Futures & Market Context
- **India VIX Volatility Regime**: Categorized into Low (<13), Normal (13-17), Elevated (17-22), and High (>22) with implied daily move %.
- **Futures Basis & Cost of Carry**: Index spot vs futures premium/discount spread.
- **Constituent Breadth**: Real-time Advance/Decline ratio across major index components.

### ⚡ Phase 4 — Combined 6-Factor Signal & Strength Engine
Configurable research weighting summing to 100%:
1. **Price Action & Structure** (25%)
2. **Option-Chain Positioning & Changes** (25%)
3. **Multi-Timeframe Trend Alignment** (15%)
4. **Volume & Breakout Confirmation** (15%)
5. **Market Context & Volatility (India VIX)** (10%)
6. **Momentum & Velocity (RSI & MACD)** (10%)
- **Dual Score Engine**: Calculates Bullish Score (0–100) and Bearish Score (0–100) independently to identify co-existing signals.
- **Contradiction Index (0–100)**: Measures evidence conflict between options flow and price action.
- **8 Distinct State Classifications**:
  `NO_SIGNAL`, `WATCH`, `BULLISH_SETUP`, `BEARISH_SETUP`, `BULLISH_CONFIRMED`, `BEARISH_CONFIRMED`, `CONFLICTING_EVIDENCE`, `DATA_UNAVAILABLE`.
- **Honest Metrics**: Signal strength is strictly an evidence score, never a fabricated win probability.

### 🎯 Phase 5 — Trade Setup & Position Sizing Risk Engine
- **Exact Execution Zones**: Reference entry price zone, trigger conditions, and structural invalidation levels.
- **Dynamic Stop Loss**: Chooses between tighter ATR volatility stops and swing high/low market structure stops.
- **Targets**: Dual milestones at 1:1.5 and 1:2.5 Risk-to-Reward ratios.
- **Capital & Risk Sizing Calculator**: Dynamically sizes trades in shares (cash equity) or standardized lots (derivatives) based on configurable capital (default ₹5,00,000) and risk % (default 1.0%).
- **Statutory Indian Transaction Charges**: Detailed breakdown of STT (Securities Transaction Tax), Exchange Turnover Charges, GST (18%), SEBI Turnover Fees, and Stamp Duty.
- **Derivatives Greeks Warnings**: Time decay (Theta) alerts, spread liquidity checks, and volatility crash warnings.

### 📈 Phase 6 — Historical Walk-Forward Backtester
- **Zero Lookahead Bias**: Bar $i$ evaluates signals using only historical data up to close of $i$.
- **Realistic Execution**: Order fills occur at Bar $i+1$ Open price + configurable slippage (default 0.05%).
- **Key Metrics Reported**:
  - Total Trades, Win Rate %, Average Win (in R), Average Loss (in R)
  - Net Expectancy (in R), Profit Factor, Max Drawdown %
  - Interactive SVG Equity Curve tracing cumulative account balance over time
  - Granular trade-by-trade audit log table detailing entry, exit, trigger bar, R:R achieved, and reason.

### 🖥️ Phase 7 — Advanced Multi-Tab Terminal UI
1. **Chart & MTF Tab**: Interactive Lightweight Charts v5 with EMA 20/50, VWAP, RSI, ATR overlays + Multi-Timeframe Matrix.
2. **Signal & Strength Tab**: Dual 0-100 score gauges, 6-factor confluence breakdown, and supporting/contradicting rationale cards.
3. **Trade Setup & Risk Tab**: Interactive position sizing calculator, execution zones, statutory charges table, and option Greeks notes.
4. **Option Chain Tab**: Full strike ladder with OI depth bars, volume, change in OI, PCR, and Greeks.
5. **Backtest Simulator Tab**: On-demand historical simulation with equity curve and trade logs.
6. **Rules Summary Tab**: Rule-based technical indicators analysis panel.
7. **API Diagnostics Tab**: Latency probe, clock skew monitor, and connection status.
- Clear analytical disclaimer emphasizing non-advisory, educational risk management.

### 🛠️ Diagnostic & Security Verification Panel
- Real-time probe of all server routes and upstream Upstox endpoints.
- Displays HTTP status codes, upstream latency in milliseconds, and clock-skew offset.
- Real-time sanitized event log showing system events without secrets.

---

## 3. Windows PowerShell Setup Guide

### Prerequisites
- **Node.js LTS** (v20.x or v22.x recommended): [Download from nodejs.org](https://nodejs.org/)
- **npm** (included with Node.js)
- **Windows PowerShell** 5.1+ or PowerShell Core 7+

### Step-by-Step Installation

1. **Open Windows PowerShell** and navigate to the project directory:
   ```powershell
   cd d:\CODES\IndianTrade
   ```

2. **Install Dependencies**:
   ```powershell
   npm install
   ```

3. **Verify Project Compilation & Mathematical Accuracy**:
   ```powershell
   # Run TypeScript compilation check
   npx tsc --noEmit

   # Run mathematical indicators & PCR unit tests
   npm run test:math
   ```

4. **Start the Local Development Server**:
   ```powershell
   npm run dev
   ```

5. **Open Dashboard in Browser**:
   Open [http://localhost:3000](http://localhost:3000) in Chrome, Edge, or Firefox.

---

## 4. Upstox Analytics Token Configuration

The application uses the official **Upstox Analytics Token**, which is **free**, has a **1-year validity**, and **does NOT require a static IP address**.

### How to Get Your Free Analytics Token:
1. Log in to the [Upstox Developer Console](https://upstox.com/developer/apps).
2. Create a new app or open an existing app.
3. In the app details page, generate an **Analytics Token**.
4. Copy the generated token string.

### How to Add the Token to Your Project:
1. Open the project root folder `d:\CODES\IndianTrade`.
2. Open or create `.env.local` (ensure it is NOT named `.env.local.txt`):
   ```ini
   UPSTOX_ANALYTICS_TOKEN=your_upstox_analytics_token_here
   ```
3. Save the file.
4. Verify your token connection using the built-in PowerShell test script:
   ```powershell
   npm run test:connection
   ```

> [!IMPORTANT]
> `.env.local` is listed in `.gitignore` and will never be committed to git repositories. Never share or paste your secret token into chat or public issues.

---

## 5. Testing & Verification Suite

The repository includes dedicated verification scripts:

### A. Mathematical Accuracy Verification
Validates EMA 5, RSI 14 (Wilder's smoothing), ATR 14, Session VWAP, and PCR edge cases (such as division by zero protection) against manually computed mathematical vectors:
```powershell
npm run test:math
```
*Expected Output:*
```
[PASS] EMA 5-period exact hand calculation
[PASS] RSI 100 on continuous uptrend with zero loss
[PASS] RSI 0 on continuous downtrend with zero gain
[PASS] ATR 2-period hand calculation
[PASS] Intraday VWAP volume weighting calculation
[PASS] PCR normal calculation and zero division protection

Results: 6/6 tests passed successfully.
All mathematical indicator algorithms verified!
```

### B. Broker API Connection Verification
Safely tests the live Upstox Quotes V3 endpoint without printing secret tokens:
```powershell
npm run test:connection
```
*Expected Output with Valid Token:*
```
[1] Found Token in .env.local: eyJhb...4x8a (length: 486)
[2] Read-Only Guarantee: No trading or order placement operations.
[3] Sending test probe to Upstox Market Quotes V3 API...
--- UPSTOX RESPONSE RECEIVED (182ms at 22:45:10 IST) ---
HTTP Status Code: 200 OK
✅ SUCCESS: Connection established!
   Instrument: NIFTY 50
   Last Price: ₹24,852.15
   Net Change: +124.50 (+0.50%)
   Volume: 18,452,190
```

---

## 6. Supported API Endpoints & Protocols

| Endpoint Route | HTTP Method | Upstox Upstream Endpoint | Purpose |
| :--- | :---: | :--- | :--- |
| `/api/market/status` | `GET` | Internal Server Health | Session detection, token configuration check, clock-skew sync |
| `/api/market/quotes` | `GET` | `/v3/market-quote/quotes` | Batch quotes with in-memory TTL caching and rate-limiting |
| `/api/market/candles` | `GET` | `/v3/historical-candle/...` | Multi-interval OHLCV candles (1m, 3m, 5m, 15m, 30m, 1h, 1D) |
| `/api/market/option-contracts` | `GET` | `/v2/option/contract` | Discover active option expiries for underlying index/stock |
| `/api/market/option-chain` | `GET` | `/v2/option/chain` | Option chain matrix, Call/Put Greeks, strikes, and OI |
| `/api/market/stream` | `SSE` | `/v3/feed/market-data-feed` | Protobuf binary WebSocket stream decoded and piped via SSE |

---

## 7. Upstox Analytics Token Scope & Limitations

The official Upstox Analytics Token is tailored specifically for market analytics and quantitative dashboards:

| Capability | Supported? | Notes |
| :--- | :---: | :--- |
| **Market Quotes V3** | ✅ Yes | Full market depth, OHLC, volume, and trade timestamps |
| **Historical Candles V3** | ✅ Yes | Up to 1-minute intraday granularity and 1-day historical candles |
| **Option Chain V2** | ✅ Yes | Full strikes, Call/Put OI, volume, and Greeks |
| **WebSocket V3 (Protobuf)** | ✅ Yes | Requires `/v3/feed/market-data-feed/authorize` handshake |
| **Static IP Requirement** | ❌ No | Analytics Tokens do **NOT** require a static IP address |
| **Token Validity** | 🗓️ 1 Year | Tokens remain valid for 1 year from creation date |
| **Order Placement / Trading** | ❌ No | Strictly blocked. Analytics Tokens have zero trading permission |
| **Order Book / Funds** | ❌ No | User funds and trading portfolio require Interactive Trading credentials with Static IP |

---

## 8. Troubleshooting Common Issues

### Issue 1: `401 Unauthorized` Response
- **Cause**: Token in `.env.local` is invalid, expired, or was copied with trailing line breaks.
- **Fix**: Open [Upstox Developer Console](https://upstox.com/developer/apps), regenerate an Analytics Token, paste into `.env.local`, and run `npm run test:connection`.

### Issue 2: `429 Too Many Requests`
- **Cause**: Upstox rate limits have been temporarily exceeded.
- **Fix**: The built-in client automatically includes a 2-second in-memory TTL cache and sliding window rate limiter. Toggle the feed mode to `5s Snapshot Poll` in the header.

### Issue 3: Stale Data Warning During Weekends or Evenings
- **Behavior**: The dashboard displays `RECENT` or `STALE` with `Session Closed Snapshot`.
- **Explanation**: This is expected behavior. The Indian stock market operates Monday to Friday from 09:15 to 15:30 IST. When markets are closed, Upstox serves the last official closing snapshot. The dashboard correctly identifies this rather than falsely reporting real-time streaming.

### Issue 4: Invalid Instrument Key
- **Rule**: Upstox uses official prefixed instrument keys such as `NSE_INDEX|Nifty 50`, `NSE_INDEX|Nifty Bank`, `BSE_INDEX|SENSEX`, and `NSE_EQ|INE002A01018`.
- **Fix**: Use the built-in Instrument Selector search or select from the preset equity and index lists.

---

## 9. Project Structure

```
d:\CODES\IndianTrade\
├── app\
│   ├── api\
│   │   └── market\
│   │       ├── candles\route.ts          # Historical candle V3 endpoint
│   │       ├── option-chain\route.ts     # Option chain & Greeks endpoint
│   │       ├── option-contracts\route.ts # Option expiry discovery endpoint
│   │       ├── quotes\route.ts           # Batch quotes endpoint with TTL cache
│   │       ├── status\route.ts           # Token check & IST session status
│   │       └── stream\route.ts           # Server-Sent Events stream pipeline
│   ├── globals.css                       # Dark financial terminal styling
│   ├── layout.tsx                        # Root layout with metadata
│   └── page.tsx                          # Main market dashboard application
├── components\
│   ├── Header.tsx                        # IST time, session status & feed controls
│   ├── InstrumentSelector.tsx            # Exchange & segment instrument picker
│   ├── MarketOverviewCards.tsx           # Benchmark index quote cards
│   ├── OptionChainTable.tsx              # Put/Call option chain matrix & dominance heatmap
│   ├── StatusBadge.tsx                   # Visual status indicators
│   └── TokenConfigModal.tsx              # In-app configuration guide
├── lib\
│   ├── indicators\
│   │   ├── atr.ts                        # Wilder's 14-period Average True Range
│   │   ├── ema.ts                        # 20 & 50 Exponential Moving Averages
│   │   ├── pivots.ts                     # Floor pivots & swing support/resistance
│   │   ├── rsi.ts                        # Wilder's 14-period Relative Strength Index
│   │   └── vwap.ts                       # Intraday Session Volume-Weighted Average
│   ├── market\
│   │   ├── analysis.ts                   # Multi-factor rules assessment engine
│   │   ├── freshness.ts                  # Quote age & clock skew detector
│   │   └── sessions.ts                   # IST market session state machine
│   ├── types\
│   │   └── market.ts                     # Domain TypeScript models
│   └── upstox\
│       ├── client.ts                     # Server-side API client & rate limiter
│       ├── constants.ts                  # Official benchmark & equity keys
│       ├── proto\
│       │   └── MarketDataFeed.proto      # Official Upstox Protobuf schema
│       ├── schemas.ts                    # Zod validation schemas
│       └── websocket.ts                  # Upstox WebSocket V3 client
├── scripts\
│   ├── test-connection.js                # Safe credential & API tester
│   └── test-math.js                      # Mathematical calculation unit tests
├── .env.example                          # Environment placeholder template
├── .env.local                            # Local secret token (git-ignored)
├── .gitignore                            # Excludes .env.local and secrets
├── package.json                          # Dependencies & test scripts
└── README.md                             # Documentation & setup guide
```

---

## ⚖️ Analytical Disclaimer

This dashboard is an analytical and educational research tool. It does **not** provide investment advice, financial recommendations, or guaranteed trading signals. Indian equity and derivatives markets involve substantial risk of loss. Always consult a SEBI-registered financial advisor before making financial decisions.
