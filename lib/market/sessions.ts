import { MarketSessionStatus, NSEScalpingPhaseInfo, NSEScalpingPhaseKey } from "@/lib/types/market";

/**
 * Returns current Date in IST (Asia/Kolkata, UTC+5:30)
 */
export function getNowIST(): Date {
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return new Date(istString);
}

/**
 * Formats a timestamp into clean IST representation (e.g., "14:25:30 IST")
 */
export function formatISTTime(timestamp: number | string | Date): string {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "Unknown IST";
    return d.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + " IST";
  } catch {
    return "Unknown IST";
  }
}

export function formatISTDateTime(timestamp: number | string | Date): string {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "Unknown IST";
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + " IST";
  } catch {
    return "Unknown IST";
  }
}

/**
 * Determines detailed NSE F&O Scalping & Trading session phase
 * Handles Pre-market 9:00-9:07 AM, 9:15 Market Open, and exact scalping windows.
 */
export function getNSEScalpingPhase(): NSEScalpingPhaseInfo {
  const ist = getNowIST();
  const day = ist.getDay(); // 0 is Sunday, 6 is Saturday
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const seconds = ist.getSeconds();
  const totalSecondsInDay = hours * 3600 + minutes * 60 + seconds;
  const istTime = formatISTTime(new Date());

  // Weekends
  if (day === 0 || day === 6) {
    return {
      key: "CLOSED",
      name: "Weekend Closure",
      timeRange: "Saturday - Sunday",
      badgeColor: "bg-slate-800 text-slate-400 border-slate-700",
      scalperGuidance: "Markets closed for weekend. Analyze weekly Option Chain & plan Monday opening levels.",
      recommendedTimeframe: "NONE",
      secondsRemaining: 0,
      nextPhaseName: "Monday Pre-Market (09:00 AM IST)",
      isLiveTrading: false,
      istTime,
    };
  }

  // Pre-Market Order Entry (09:00:00 to 09:07:00 IST) -> 32400s to 32820s
  if (totalSecondsInDay >= 32400 && totalSecondsInDay < 32820) {
    const remaining = 32820 - totalSecondsInDay;
    return {
      key: "PRE_MARKET_ORDER",
      name: "Pre-Market: Order Placement",
      timeRange: "09:00 - 09:07 AM IST",
      badgeColor: "bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-cyan-950/30",
      scalperGuidance: "Pre-market order collection & modification window. Watch indicative open price & GIFT Nifty gap. DO NOT execute option orders yet.",
      recommendedTimeframe: "15m",
      secondsRemaining: remaining,
      nextPhaseName: "Price Discovery Match (09:07 AM)",
      isLiveTrading: false,
      istTime,
    };
  }

  // Pre-Market Matching & Discovery (09:07:00 to 09:08:00 IST) -> 32820s to 32880s
  if (totalSecondsInDay >= 32820 && totalSecondsInDay < 32880) {
    const remaining = 32880 - totalSecondsInDay;
    return {
      key: "PRE_MARKET_MATCH",
      name: "Pre-Market: Equilibrium Price Match",
      timeRange: "09:07 - 09:08 AM IST",
      badgeColor: "bg-indigo-950/80 text-indigo-300 border-indigo-500/50 shadow-indigo-950/30",
      scalperGuidance: "NSE matching algorithm discovering opening equilibrium price. Cash index open settling.",
      recommendedTimeframe: "15m",
      secondsRemaining: remaining,
      nextPhaseName: "Opening Transition Buffer (09:08 AM)",
      isLiveTrading: false,
      istTime,
    };
  }

  // Pre-Market Buffer / Strategy Prep (09:08:00 to 09:15:00 IST) -> 32880s to 33300s
  if (totalSecondsInDay >= 32880 && totalSecondsInDay < 33300) {
    const remaining = 33300 - totalSecondsInDay;
    return {
      key: "PRE_MARKET_BUFFER",
      name: "Pre-Market: Opening Transition Buffer",
      timeRange: "09:08 - 09:15 AM IST",
      badgeColor: "bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-amber-950/30",
      scalperGuidance: "Opening price established! Prepare ATM strikes in Option Chain. Set alerts for 9:15 AM Opening Range Breakout.",
      recommendedTimeframe: "5m",
      secondsRemaining: remaining,
      nextPhaseName: "Market Open & ORB Scalping (09:15 AM)",
      isLiveTrading: false,
      istTime,
    };
  }

  // Opening 15m/30m ORB Scalping Rush (09:15:00 to 09:45:00 IST) -> 33300s to 35100s
  if (totalSecondsInDay >= 33300 && totalSecondsInDay < 35100) {
    const remaining = 35100 - totalSecondsInDay;
    return {
      key: "OPENING_ORB_SCALP",
      name: "9:15 AM Open: High Volatility ORB Scalping",
      timeRange: "09:15 - 09:45 AM IST",
      badgeColor: "bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-emerald-950/30 animate-pulse",
      scalperGuidance: "Highest option momentum of the day! Scalp 1m & 3m candle breaks with VWAP slope & fast trailing stop loss. Watch for opening gap traps.",
      recommendedTimeframe: "1m",
      secondsRemaining: remaining,
      nextPhaseName: "Morning Trend Confirmation (09:45 AM)",
      isLiveTrading: true,
      istTime,
    };
  }

  // Morning Institutional Trend (09:45:00 to 11:30:00 IST) -> 35100s to 41400s
  if (totalSecondsInDay >= 35100 && totalSecondsInDay < 41400) {
    const remaining = 41400 - totalSecondsInDay;
    return {
      key: "MORNING_TREND",
      name: "Morning Institutional Trend & VWAP Pullbacks",
      timeRange: "09:45 - 11:30 AM IST",
      badgeColor: "bg-blue-950/80 text-blue-300 border-blue-500/50 shadow-blue-950/30",
      scalperGuidance: "Cleanest intraday directional moves. Trade 3m & 5m pullbacks to VWAP/EMA 21 in alignment with Option Chain OI build-up.",
      recommendedTimeframe: "3m",
      secondsRemaining: remaining,
      nextPhaseName: "Mid-Day Chop & Theta Decay (11:30 AM)",
      isLiveTrading: true,
      istTime,
    };
  }

  // Mid-Day Chop & Consolidation (11:30:00 to 13:15:00 IST) -> 41400s to 47700s
  if (totalSecondsInDay >= 41400 && totalSecondsInDay < 47700) {
    const remaining = 47700 - totalSecondsInDay;
    return {
      key: "MIDDAY_CHOP",
      name: "Mid-Day Consolidation & Theta Decay",
      timeRange: "11:30 AM - 01:15 PM IST",
      badgeColor: "bg-yellow-950/80 text-yellow-300 border-yellow-500/50 shadow-yellow-950/30",
      scalperGuidance: "Lower volume chop zone. Heavy theta decay. Avoid aggressive option buying; only scalp clear range boundaries or wait for 1:15 PM.",
      recommendedTimeframe: "5m",
      secondsRemaining: remaining,
      nextPhaseName: "Afternoon Momentum / European Open (01:15 PM)",
      isLiveTrading: true,
      istTime,
    };
  }

  // Afternoon Momentum & European Open (13:15:00 to 14:30:00 IST) -> 47700s to 52200s
  if (totalSecondsInDay >= 47700 && totalSecondsInDay < 52200) {
    const remaining = 52200 - totalSecondsInDay;
    return {
      key: "AFTERNOON_MOMENTUM",
      name: "European Open & Afternoon Breakouts",
      timeRange: "01:15 - 02:30 PM IST",
      badgeColor: "bg-purple-950/80 text-purple-300 border-purple-500/50 shadow-purple-950/30",
      scalperGuidance: "Fresh liquidity surge from European market open. Look for breakouts of morning High/Low and 5m candle expansion.",
      recommendedTimeframe: "5m",
      secondsRemaining: remaining,
      nextPhaseName: "3 PM Hero-Zero Surge (02:30 PM)",
      isLiveTrading: true,
      istTime,
    };
  }

  // 3 PM Hero-Zero / Expiry Option Spike (14:30:00 to 15:15:00 IST) -> 52200s to 54900s
  if (totalSecondsInDay >= 52200 && totalSecondsInDay < 54900) {
    const remaining = 54900 - totalSecondsInDay;
    return {
      key: "EXPIRY_HERO_ZERO",
      name: "3 PM Hero-Zero & Gamma Scalp Zone",
      timeRange: "02:30 - 03:15 PM IST",
      badgeColor: "bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-rose-950/30 animate-pulse",
      scalperGuidance: "Extreme Gamma explosion zone! Weekly expiry options experience rapid 2x-5x surges or sudden zeroing. Strict trailing stop loss essential.",
      recommendedTimeframe: "1m",
      secondsRemaining: remaining,
      nextPhaseName: "MIS Intraday Square-Off (03:15 PM)",
      isLiveTrading: true,
      istTime,
    };
  }

  // MIS Square-Off Window (15:15:00 to 15:30:00 IST) -> 54900s to 55800s
  if (totalSecondsInDay >= 54900 && totalSecondsInDay < 55800) {
    const remaining = 55800 - totalSecondsInDay;
    return {
      key: "INTRADAY_EXIT",
      name: "MIS Auto Square-Off & Closing Rush",
      timeRange: "03:15 - 03:30 PM IST",
      badgeColor: "bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-amber-950/30",
      scalperGuidance: "Broker MIS intraday auto square-off active. No fresh scalping entries! Exit open positions to avoid penalty charges.",
      recommendedTimeframe: "1m",
      secondsRemaining: remaining,
      nextPhaseName: "Market Close (03:30 PM)",
      isLiveTrading: true,
      istTime,
    };
  }

  // Closing Auction (15:30:00 to 15:40:00 IST) -> 55800s to 56400s
  if (totalSecondsInDay >= 55800 && totalSecondsInDay < 56400) {
    const remaining = 56400 - totalSecondsInDay;
    return {
      key: "CLOSING_AUCTION",
      name: "Closing Auction & Weighted Settlement",
      timeRange: "15:30 - 15:40 PM IST",
      badgeColor: "bg-slate-900 text-slate-300 border-slate-700",
      scalperGuidance: "Trading halted for day. Calculating weighted average closing prices across NSE indices.",
      recommendedTimeframe: "NONE",
      secondsRemaining: remaining,
      nextPhaseName: "Post-Market Session (03:40 PM)",
      isLiveTrading: false,
      istTime,
    };
  }

  // Post-Market (15:40:00 to 16:00:00 IST) -> 56400s to 57600s
  if (totalSecondsInDay >= 56400 && totalSecondsInDay < 57600) {
    const remaining = 57600 - totalSecondsInDay;
    return {
      key: "POST_MARKET",
      name: "Post-Market Session",
      timeRange: "15:40 - 16:00 PM IST",
      badgeColor: "bg-slate-900 text-slate-400 border-slate-800",
      scalperGuidance: "Post-market orders at settled closing price. Review daily P&L and option chain delivery data.",
      recommendedTimeframe: "NONE",
      secondsRemaining: remaining,
      nextPhaseName: "Market Closed (After Hours)",
      isLiveTrading: false,
      istTime,
    };
  }

  // Closed / After Hours (before 09:00 or after 16:00)
  const secondsToNextOpen = totalSecondsInDay < 32400
    ? 32400 - totalSecondsInDay
    : (86400 - totalSecondsInDay) + 32400;

  return {
    key: "CLOSED",
    name: "Market Closed (After Hours)",
    timeRange: "04:00 PM - 09:00 AM IST",
    badgeColor: "bg-slate-900 text-slate-400 border-slate-800",
    scalperGuidance: "Market closed. Next session begins with Pre-Market at 09:00 AM IST. Review higher timeframe (15m/1h/1D) key S/R levels.",
    recommendedTimeframe: "NONE",
    secondsRemaining: secondsToNextOpen,
    nextPhaseName: "Pre-Market Order Placement (09:00 AM)",
    isLiveTrading: false,
    istTime,
  };
}

/**
 * Backwards compatible market session helper
 */
export function getMarketSessionStatus(): {
  status: MarketSessionStatus;
  description: string;
  is_trading_active: boolean;
  ist_time: string;
} {
  const phase = getNSEScalpingPhase();
  let status: MarketSessionStatus = "NORMAL_CLOSE";

  if (phase.key === "CLOSED") {
    const ist = getNowIST();
    status = (ist.getDay() === 0 || ist.getDay() === 6) ? "WEEKEND" : "NORMAL_CLOSE";
  } else if (phase.key.startsWith("PRE_MARKET")) {
    status = "PRE_OPEN";
  } else if (phase.key === "CLOSING_AUCTION" || phase.key === "POST_MARKET") {
    status = "CLOSING";
  } else {
    status = "NORMAL_OPEN";
  }

  return {
    status,
    description: `${phase.name} (${phase.timeRange})`,
    is_trading_active: phase.isLiveTrading,
    ist_time: formatISTDateTime(new Date()),
  };
}

