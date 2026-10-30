import { CandleDataPoint } from "@/lib/types/market";
import { StockMasterItem } from "@/lib/stocks/stockMaster";

export type { StockMasterItem };
export type OrderBlockData = OrderBlockZone;
export type StockInstitutionalMetrics = InstitutionalStockSignal;
export type OneClearZoneResult = OneClearZoneData;
export type SectorHeatmapItem = SectorScreeningSummary;

export type OrderBlockDirection = "BULLISH" | "BEARISH";
export type OrderBlockStatus = "FRESH" | "TESTED" | "MITIGATED" | "INVALIDATED";

export interface OrderBlockZone {
  id: string;
  symbol: string;
  timeframe: string;
  direction: OrderBlockDirection;
  highPrice: number;
  lowPrice: number;
  midPrice: number; // Equilibrium / 50% Mean Threshold
  status: OrderBlockStatus;
  retestCount: number;
  strengthScore: number; // 0 - 100
  candleTime: number;
  candleDate: string;
  hasFvg: boolean; // Fair Value Gap presence
  volumeMultiplier: number; // e.g. 2.8x
  breakType: "BOS" | "CHOCH" | "DISPLACEMENT";
}

export type LiquidityType = "BSL" | "SSL" | "EQH" | "EQL" | "PDH" | "PDL" | "PWH" | "PWL";
export type LiquidityState = "APPROACHING" | "SWEEPING" | "REJECTED_TRAP" | "BREAKOUT_EXPANDED" | "UNTESTED";

export interface LiquidityLevel {
  id: string;
  symbol: string;
  type: LiquidityType;
  priceLevel: number;
  state: LiquidityState;
  sweepCandleTime?: number;
  trapScore: number; // 0 - 100
  description: string;
}

export interface LargeOrderEvent {
  id: string;
  symbol: string;
  companyName: string;
  exchange: "NSE" | "BSE";
  ltp: number;
  changePct: number;
  volume: number;
  rvol: number; // Relative Volume
  deliveryPct: number;
  largeOrderScore: number; // 0 - 100
  pressure: "HEAVY_BUYING" | "MODERATE_BUYING" | "HEAVY_SELLING" | "MODERATE_SELLING" | "NEUTRAL";
  orderValueCrores: number;
  timestamp: number;
  timeIst: string;
  isConfirmedBlock: boolean;
}

export type InstitutionalSignalTier =
  | "EXCEPTIONAL" // 90 - 100
  | "VERY_STRONG"  // 80 - 89
  | "STRONG"       // 70 - 79
  | "DEVELOPING"   // 60 - 69
  | "WEAK";        // Below 60

export interface OneClearZoneData {
  hasClearZone: boolean;
  direction: "BULLISH" | "BEARISH" | "NONE";
  demandSupplyZoneText: string;
  liquidityTargetText: string;
  zoneRange: [number, number];
  targetPrice: number;
  strengthScore: number;
  rvol: number;
  structure: string;
  status: string;
  explanation: string;
}

export interface IntradayStockOptionContract {
  symbol: string;
  strike: number;
  optionType: "CE" | "PE";
  expiryDate: string;
  ltp: number;
  changePct: number;
  change: number;
  lotSize: number;
  volume: number;
  oi: number;
  oiChangePct: number;
  moneyness: "ATM" | "ITM" | "OTM";
  iv: number;
  delta: number;
  buildup: "LONG_BUILDUP" | "SHORT_BUILDUP" | "SHORT_COVERING" | "LONG_UNWINDING";
}

export interface InstitutionalStockSignal {
  stock: StockMasterItem;
  ltp: number;
  changePct: number;
  volume: number;
  relativeVolume: number;
  deliveryPct: number;

  // Component Scores (0 - 100)
  orderBlockScore: number;       // 25% weight
  liquidityScore: number;        // 20% weight
  rvolScore: number;             // 15% weight
  marketStructureScore: number;  // 15% weight
  largeOrderScore: number;       // 10% weight
  priceVolumeScore: number;      // 10% weight
  deliveryScore: number;         // 5% weight

  // Composite Institutional Score
  compositeScore: number;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  tier: InstitutionalSignalTier;

  // Active SMC Zones
  nearestBullishOB: OrderBlockZone | null;
  nearestBearishOB: OrderBlockZone | null;
  nearestLiquidity: LiquidityLevel | null;
  distanceToZonePct: number; // Absolute % distance from current price to nearest OB
  timeframe: string;

  // One Clear Zone Synthesis
  oneClearZone: OneClearZoneData;

  lastUpdated: number;
}

export type SectorSentimentColor =
  | "DARK_GREEN"  // Exceptional Bullish
  | "GREEN"       // Strong Bullish
  | "DARK_RED"    // Exceptional Bearish
  | "RED"         // Strong Bearish
  | "YELLOW"      // Liquidity Trap / Mixed
  | "GREY";       // Neutral / Flat

export interface SectorScreeningSummary {
  sectorName: string;
  totalStocks: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  avgInstitutionalScore: number;
  avgRvol: number;
  sectorTrendPct: number;
  sentimentColor: SectorSentimentColor;
  topBullishStock: {
    symbol: string;
    companyName: string;
    changePct: number;
    score: number;
  };
  topBearishStock: {
    symbol: string;
    companyName: string;
    changePct: number;
    score: number;
  };
}

export interface FiiDiiDailySummary {
  date: string;
  fiiGrossBuyCr: number;
  fiiGrossSellCr: number;
  fiiNetCr: number;
  diiGrossBuyCr: number;
  diiGrossSellCr: number;
  diiNetCr: number;
  netInstitutionalCr: number;
  marketSentiment: "BULLISH_FLOW" | "BEARISH_FLOW" | "NEUTRAL_FLOW";
  source: string;
}
