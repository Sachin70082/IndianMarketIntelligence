import { InstrumentMetadata } from "@/lib/types/market";

export const BENCHMARK_INSTRUMENTS: InstrumentMetadata[] = [
  {
    instrument_key: "NSE_INDEX|Nifty 50",
    symbol: "NIFTY 50",
    name: "Nifty 50 F&O Index",
    exchange: "NSE",
    segment: "INDEX",
    tick_size: 0.05,
    lot_size: 25,
    is_benchmark: true,
  },
  {
    instrument_key: "NSE_INDEX|Nifty Bank",
    symbol: "BANKNIFTY",
    name: "Nifty Bank F&O Index",
    exchange: "NSE",
    segment: "INDEX",
    tick_size: 0.05,
    lot_size: 15,
    is_benchmark: true,
  },
  {
    instrument_key: "BSE_INDEX|SENSEX",
    symbol: "SENSEX",
    name: "BSE SENSEX Index",
    exchange: "BSE",
    segment: "INDEX",
    tick_size: 0.05,
    lot_size: 10,
    is_benchmark: true,
  },
  {
    instrument_key: "NSE_INDEX|Nifty Fin Service",
    symbol: "FINNIFTY",
    name: "Fin Nifty F&O Index",
    exchange: "NSE",
    segment: "INDEX",
    tick_size: 0.05,
    lot_size: 25,
    is_benchmark: true,
  },
  {
    instrument_key: "NSE_INDEX|NIFTY MID SELECT",
    symbol: "MIDCPNIFTY",
    name: "Midcap Select F&O Index",
    exchange: "NSE",
    segment: "INDEX",
    tick_size: 0.05,
    lot_size: 50,
    is_benchmark: true,
  },
  {
    instrument_key: "NSE_INDEX|India VIX",
    symbol: "INDIA VIX",
    name: "NSE Volatility Index",
    exchange: "NSE",
    segment: "INDEX",
    tick_size: 0.01,
    lot_size: 1,
    is_benchmark: true,
  },
];

export const POPULAR_EQUITIES: InstrumentMetadata[] = [
  {
    instrument_key: "NSE_EQ|INE002A01018",
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd",
    exchange: "NSE",
    segment: "EQ",
    tick_size: 0.05,
    lot_size: 1,
  },
  {
    instrument_key: "NSE_EQ|INE467B01029",
    symbol: "TCS",
    name: "Tata Consultancy Services Ltd",
    exchange: "NSE",
    segment: "EQ",
    tick_size: 0.05,
    lot_size: 1,
  },
  {
    instrument_key: "NSE_EQ|INE040A01034",
    symbol: "HDFCBANK",
    name: "HDFC Bank Ltd",
    exchange: "NSE",
    segment: "EQ",
    tick_size: 0.05,
    lot_size: 1,
  },
  {
    instrument_key: "NSE_EQ|INE009A01021",
    symbol: "INFY",
    name: "Infosys Ltd",
    exchange: "NSE",
    segment: "EQ",
    tick_size: 0.05,
    lot_size: 1,
  },
  {
    instrument_key: "NSE_EQ|INE090A01021",
    symbol: "ICICIBANK",
    name: "ICICI Bank Ltd",
    exchange: "NSE",
    segment: "EQ",
    tick_size: 0.05,
    lot_size: 1,
  },
  {
    instrument_key: "NSE_EQ|INE062A01020",
    symbol: "SBIN",
    name: "State Bank of India",
    exchange: "NSE",
    segment: "EQ",
    tick_size: 0.05,
    lot_size: 1,
  },
  {
    instrument_key: "NSE_EQ|INE397D01024",
    symbol: "BHARTIARTL",
    name: "Bharti Airtel Ltd",
    exchange: "NSE",
    segment: "EQ",
    tick_size: 0.05,
    lot_size: 1,
  },
  {
    instrument_key: "NSE_EQ|INE154A01025",
    symbol: "ITC",
    name: "ITC Ltd",
    exchange: "NSE",
    segment: "EQ",
    tick_size: 0.05,
    lot_size: 1,
  },
  {
    instrument_key: "NSE_EQ|INE018A01030",
    symbol: "LT",
    name: "Larsen & Toubro Ltd",
    exchange: "NSE",
    segment: "EQ",
    tick_size: 0.05,
    lot_size: 1,
  },
  {
    instrument_key: "NSE_EQ|INE155A01022",
    symbol: "TATAMOTORS",
    name: "Tata Motors Ltd",
    exchange: "NSE",
    segment: "EQ",
    tick_size: 0.05,
    lot_size: 1,
  },
];

export const ALL_PRESET_INSTRUMENTS = [...BENCHMARK_INSTRUMENTS, ...POPULAR_EQUITIES];

export const VALID_CANDLE_INTERVALS = [
  { label: "1m", unit: "minutes", interval: "1" },
  { label: "3m", unit: "minutes", interval: "3" },
  { label: "5m", unit: "minutes", interval: "5" },
  { label: "15m", unit: "minutes", interval: "15" },
  { label: "30m", unit: "minutes", interval: "30" },
  { label: "1h", unit: "hours", interval: "1" },
  { label: "1D", unit: "days", interval: "1" },
] as const;

export const UPSTOX_API_BASE_URL = "https://api.upstox.com";

// Configurable Phase 4 Signal Factor Weights (Total = 100%)
export const DEFAULT_FACTOR_WEIGHTS = {
  priceAction: 25,        // Candle structures, S/R, Breakout/Retest, ORB
  optionChain: 25,        // OI concentration, PCR, Strike positioning, Buildup
  multiTimeframe: 15,     // Higher timeframe alignment (1h/15m/5m/1m)
  volumeBreakout: 15,     // Relative Volume (RVol > 1.2), volume spikes
  marketContext: 10,      // India VIX regime, Futures basis, Breadth
  momentumVolatility: 10, // RSI momentum, MACD cross, ATR volatility regime
} as const;

// Configurable Phase 5 Risk Management Parameters
export const DEFAULT_RISK_SETTINGS = {
  defaultCapital: 500000,     // ₹5,00,000 base capital
  riskPerTradePct: 1.0,       // 1.0% risk per trade (₹5,000 max loss)
  minRiskRewardRatio: 1.5,    // 1:1.5 minimum setup R:R
  maxRiskRewardRatio: 3.0,    // 1:3.0 target R:R
  defaultSlippagePct: 0.05,   // 0.05% slippage allowance
} as const;

// Statutory Indian Market Transaction Charges (NSE Equity Intraday & F&O)
export const INDIAN_MARKET_CHARGES = {
  equityIntraday: {
    brokerageFlat: 20,              // Flat ₹20 per executed order
    sttPctSell: 0.025 / 100,        // 0.025% on sell side only
    exchangeTurnoverPct: 0.00297 / 100, // 0.00297% on turnover
    gstPct: 18 / 100,               // 18% on (Brokerage + Exchange)
    sebiTurnoverPct: 0.0001 / 100,  // ₹10 per crore
    stampDutyPctBuy: 0.003 / 100,   // 0.003% on buy side
  },
  futures: {
    brokerageFlat: 20,
    sttPctSell: 0.02 / 100,         // 0.02% on sell turnover
    exchangeTurnoverPct: 0.00173 / 100,
    gstPct: 18 / 100,
    sebiTurnoverPct: 0.0001 / 100,
    stampDutyPctBuy: 0.002 / 100,
  },
  options: {
    brokerageFlat: 20,
    sttPctSell: 0.1 / 100,          // 0.1% on premium on sell side
    exchangeTurnoverPct: 0.03503 / 100, // on premium turnover
    gstPct: 18 / 100,
    sebiTurnoverPct: 0.0001 / 100,
    stampDutyPctBuy: 0.003 / 100,
  },
} as const;
