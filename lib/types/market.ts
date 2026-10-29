// Core TypeScript domain models for Indian Market Intelligence & Trading Engine

export type MarketFreshness = "LIVE" | "RECENT" | "STALE" | "UNKNOWN" | "DISCONNECTED" | "SNAPSHOT";

export type MarketSessionStatus =
  | "PRE_OPEN"
  | "NORMAL_OPEN"
  | "CLOSING"
  | "NORMAL_CLOSE"
  | "WEEKEND"
  | "HOLIDAY";

export type NSEScalpingPhaseKey =
  | "PRE_MARKET_ORDER"     // 09:00 - 09:07
  | "PRE_MARKET_MATCH"     // 09:07 - 09:08
  | "PRE_MARKET_BUFFER"    // 09:08 - 09:15
  | "OPENING_ORB_SCALP"    // 09:15 - 09:45
  | "MORNING_TREND"        // 09:45 - 11:30
  | "MIDDAY_CHOP"          // 11:30 - 13:15
  | "AFTERNOON_MOMENTUM"   // 13:15 - 14:30
  | "EXPIRY_HERO_ZERO"     // 14:30 - 15:15
  | "INTRADAY_EXIT"        // 15:15 - 15:30
  | "CLOSING_AUCTION"      // 15:30 - 15:40
  | "POST_MARKET"          // 15:40 - 16:00
  | "CLOSED";

export interface NSEScalpingPhaseInfo {
  key: NSEScalpingPhaseKey;
  name: string;
  timeRange: string;
  badgeColor: string;
  scalperGuidance: string;
  recommendedTimeframe: "1m" | "3m" | "5m" | "15m" | "NONE";
  secondsRemaining: number;
  nextPhaseName: string;
  isLiveTrading: boolean;
  istTime: string;
}

export interface MarketQuoteData {
  instrument_key: string;
  symbol: string;
  exchange: string;
  segment: string;
  last_price: number;
  net_change: number;
  percentage_change: number;
  open: number;
  high: number;
  low: number;
  close: number;
  prev_close: number;
  volume: number;
  average_price?: number;
  oi?: number;
  prev_oi?: number;
  change_oi?: number;
  year_high?: number;
  year_low?: number;
  timestamp: number; // millisecond timestamp from Upstox
  timestamp_ist: string; // ISO or formatted IST string
  local_receipt_time: number; // local Date.now()
  quote_age_seconds: number;
  freshness: MarketFreshness;
  is_stale: boolean;
  cas_eligible?: boolean;
  indicative_equilibrium_price?: number;
}

export interface CandleDataPoint {
  time: number; // Unix timestamp in seconds for lightweight-charts
  date: string; // IST readable date/time
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi?: number;
}

export interface OptionGreeks {
  delta: number | null;
  theta: number | null;
  gamma: number | null;
  vega: number | null;
  rho: number | null;
  iv: number | null;
}

export interface OptionSideQuote {
  instrument_key: string;
  ltp: number;
  volume: number;
  oi: number;
  prev_oi: number;
  change_oi: number;
  close_price: number;
  bid_price: number;
  bid_qty: number;
  ask_price: number;
  ask_qty: number;
  greeks: OptionGreeks;
  buildup?: "LONG_BUILDUP" | "SHORT_BUILDUP" | "SHORT_COVERING" | "LONG_UNWINDING" | "UNCERTAIN";
}

export interface OptionChainRow {
  strike_price: number;
  pcr?: number;
  is_atm?: boolean;
  call?: OptionSideQuote;
  put?: OptionSideQuote;
}

export interface OptionChainSummary {
  underlying_key: string;
  underlying_symbol: string;
  underlying_spot_price: number;
  expiry: string;
  expiries: string[];
  strikes: OptionChainRow[];
  total_call_oi: number;
  total_put_oi: number;
  total_call_volume: number;
  total_put_volume: number;
  overall_pcr: number;
  volume_pcr?: number;
  max_pain_strike?: number;
  highest_call_oi_strike?: number;
  highest_put_oi_strike?: number;
  atm_strike: number;
  atm_straddle_price?: number;
  timestamp: number;
  quote_age_seconds: number;
  freshness: MarketFreshness;
}

export interface TechnicalIndicatorData {
  time: number;
  ema9?: number;
  ema20?: number;
  ema21?: number;
  ema50?: number;
  ema200?: number;
  vwap?: number;
  rsi14?: number;
  atr14?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  rvol?: number;
}

// ----------------------------------------------------
// ADVANCED PRICE ACTION & PATTERN MODELS
// ----------------------------------------------------

export type CandlePatternType =
  | "BULLISH_ENGULFING"
  | "BEARISH_ENGULFING"
  | "HAMMER"
  | "SHOOTING_STAR"
  | "PIN_BAR_BULL"
  | "PIN_BAR_BEAR"
  | "INSIDE_BAR"
  | "MORNING_STAR"
  | "EVENING_STAR"
  | "MARUBOZU_BULL"
  | "MARUBOZU_BEAR"
  | "DOJI"
  | "TWEEZER_BOTTOM"
  | "TWEEZER_TOP"
  | "NONE";

export interface DetectedCandlePattern {
  id: string;
  pattern: CandlePatternType;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  candleTime: number;
  candleDate: string;
  location: "AT_SUPPORT" | "AT_RESISTANCE" | "AT_VWAP" | "IN_TREND" | "CONGESTION";
  confirmationRequirement: string;
  invalidationPrice: number;
  qualityScore: number; // 0 - 100
  description: string;
}

export interface MarketStructure {
  trend: "UPTREND" | "DOWNTREND" | "RANGING" | "CONSOLIDATION";
  swingHigh: number | null;
  swingLow: number | null;
  lastBOS: "BULLISH_BREAKOUT" | "BEARISH_BREAKDOWN" | null;
  lastChoCh: "BULLISH_REVERSAL" | "BEARISH_REVERSAL" | null;
  pdh: number | null; // Previous Day High
  pdl: number | null; // Previous Day Low
  pdc: number | null; // Previous Day Close
  pdo: number | null; // Previous Day Open
  orb15High: number | null; // Opening Range Breakout 15m High
  orb15Low: number | null;  // Opening Range Breakout 15m Low
}

// ----------------------------------------------------
// MULTI-TIMEFRAME ANALYSIS
// ----------------------------------------------------

export interface TimeframeSignalContext {
  timeframe: string; // "1m" | "3m" | "5m" | "15m" | "1h" | "1D"
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  emaStack: "BULLISH_STACK" | "BEARISH_STACK" | "NEUTRAL";
  priceVsVwap: "ABOVE" | "BELOW" | "AT_VWAP" | "UNAVAILABLE";
  rsi14: number | null;
  rsiState: "OVERBOUGHT" | "OVERSOLD" | "BULLISH_MOMENTUM" | "BEARISH_MOMENTUM" | "NEUTRAL";
  macdCross: "BULLISH_CROSS" | "BEARISH_CROSS" | "NEUTRAL";
  rvol: number | null;
  patterns: DetectedCandlePattern[];
}

// ----------------------------------------------------
// MARKET CONTEXT & BREADTH (VIX, FUTURES, SECTORS)
// ----------------------------------------------------

export interface MarketContextMetrics {
  vixLtp: number | null;
  vixChangePct: number | null;
  vixRegime: "LOW" | "NORMAL" | "ELEVATED" | "HIGH";
  impliedDailyMovePct: number | null;
  futuresBasis: number | null;
  futuresBasisType: "PREMIUM" | "DISCOUNT" | "PAR" | "UNAVAILABLE";
  breadthRatio: number | null;
  breadthBias: "STRONG_ADVANCE" | "ADVANCE" | "NEUTRAL" | "DECLINE" | "STRONG_DECLINE";
  sessionPhase: "OPENING_RANGE" | "MID_SESSION" | "CLOSING_HOUR" | "CLOSED";
  expiryProximityDays: number | null;
  isZeroDte: boolean;
  eventRiskWarning: string | null;
}

// ----------------------------------------------------
// COMBINED 6-FACTOR SIGNAL & STRENGTH ENGINE
// ----------------------------------------------------

export interface SignalFactorBreakdown {
  priceActionScore: number;       // Weight: 25% (0 - 100)
  optionChainScore: number;       // Weight: 25% (0 - 100)
  multiTimeframeScore: number;    // Weight: 15% (0 - 100)
  volumeBreakoutScore: number;    // Weight: 15% (0 - 100)
  marketContextScore: number;     // Weight: 10% (0 - 100)
  momentumVolatilityScore: number;// Weight: 10% (0 - 100)
}

export type SignalConfirmationState =
  | "NO_SIGNAL"
  | "WATCH"
  | "BULLISH_SETUP"
  | "BEARISH_SETUP"
  | "BULLISH_CONFIRMED"
  | "BEARISH_CONFIRMED"
  | "CONFLICTING_EVIDENCE"
  | "DATA_UNAVAILABLE";

export interface ComprehensiveSignal {
  state: SignalConfirmationState;
  bullishScore: number;           // 0 - 100
  bearishScore: number;           // 0 - 100
  netBias: "BULLISH" | "BEARISH" | "NEUTRAL";
  signalStrength: number;         // 0 - 100 (weighted aggregate)
  contradictionIndex: number;     // 0 - 100 (evidence conflict degree)
  confirmationStatus: string;
  dataQualityGrade: "A" | "B" | "C" | "F";
  factors: SignalFactorBreakdown;
  supportingReasons: string[];
  contradictingReasons: string[];
  calculatedAtIst: string;
  instrumentKey: string;
  symbol: string;
}

// ----------------------------------------------------
// TRADE SETUP & RISK ENGINE
// ----------------------------------------------------

export interface TradeSetupPlan {
  id: string;
  instrumentKey: string;
  symbol: string;
  setupType: "EQUITY_CASH" | "INDEX_FUTURE" | "CALL_BUY" | "PUT_BUY" | "NO_SETUP";
  direction: "LONG" | "SHORT" | "NEUTRAL";
  entryZone: { min: number; max: number };
  triggerCondition: string;
  invalidationPrice: number;
  stopLossPrice: number;
  stopReferenceType: "STRUCTURE_SWING" | "ATR_MULTIPLIER" | "VWAP_LEVEL";
  target1: number;
  target2: number;
  riskRewardRatio: number;
  capitalBase: number;
  maxRiskAmount: number;
  recommendedQuantity: number;
  recommendedLots: number;
  lotSize: number;
  estimatedCharges: {
    stt: number;
    exchangeTurnover: number;
    gst: number;
    stampDuty: number;
    totalCharges: number;
  };
  slippageEstimate: number;
  liquidityWarning: string | null;
  optionGreeksConsideration?: {
    delta: number | null;
    thetaDecayPerDay: number | null;
    ivCrushRisk: "HIGH" | "MEDIUM" | "LOW";
    commentary: string;
  };
}

// ----------------------------------------------------
// BACKTESTING & ACCURACY MEASUREMENT
// ----------------------------------------------------

export interface BacktestTrade {
  id: string;
  entryTime: number;
  entryDate: string;
  exitTime: number;
  exitDate: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  stopLossPrice: number;
  target1Price: number;
  target2Price: number;
  outcome: "TARGET_1" | "TARGET_2" | "STOP_LOSS" | "TIME_EXIT";
  pnlPoints: number;
  pnlPercentage: number;
  rMultiple: number;
  holdingCandles: number;
  reason: string;
}

export interface BacktestReport {
  instrumentKey: string;
  timeframe: string;
  totalCandlesTested: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  avgWinR: number;
  avgLossR: number;
  profitFactor: number;
  netExpectancyR: number;
  netProfitPoints: number;
  maxDrawdownPct: number;
  equityCurve: { time: number; equity: number; drawdown: number }[];
  trades: BacktestTrade[];
  strategyWeights: SignalFactorBreakdown;
}

// ----------------------------------------------------
// LEGACY / EXISTING COMPATIBILITY INTERFACES
// ----------------------------------------------------

export interface MarketAnalysisResult {
  bias: "BULLISH" | "BEARISH" | "NEUTRAL" | "INSUFFICIENT_DATA";
  confidence_label: string;
  vwap_status: "ABOVE_VWAP" | "BELOW_VWAP" | "NEAR_VWAP" | "APPROXIMATION_ONLY" | "UNAVAILABLE";
  ema_trend: "BULLISH_STACK" | "BEARISH_STACK" | "CROSSOVER_WATCH" | "FLAT";
  rsi_state: "OVERBOUGHT" | "OVERSOLD" | "BULLISH_MOMENTUM" | "BEARISH_MOMENTUM" | "NEUTRAL";
  atr_volatility: "HIGH" | "NORMAL" | "LOW" | "INSUFFICIENT";
  support_level: number | null;
  resistance_level: number | null;
  entry_trigger: number | null;
  invalidation_level: number | null;
  target_1: number | null;
  target_2: number | null;
  risk_reward_ratio: string;
  reasons: string[];
  data_sufficient: boolean;
  warning_message?: string;
  calculated_at_ist: string;
  // Extended link
  comprehensiveSignal?: ComprehensiveSignal;
  tradePlan?: TradeSetupPlan;
}

export interface InstrumentMetadata {
  instrument_key: string;
  symbol: string;
  name: string;
  exchange: "NSE" | "BSE";
  segment: "INDEX" | "EQ" | "FO";
  tick_size: number;
  lot_size: number;
  is_benchmark?: boolean;
}

export interface ApiConnectionStatus {
  is_configured: boolean;
  token_length?: number;
  masked_token?: string;
  last_tested?: string;
  status: "CONNECTED" | "UNAUTHENTICATED" | "RATE_LIMITED" | "NETWORK_ERROR" | "NOT_CONFIGURED";
  message: string;
  can_stream: boolean;
}
