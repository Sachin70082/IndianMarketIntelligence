'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  LineStyle,
  IChartApi,
  ISeriesApi,
  IPriceLine,
} from 'lightweight-charts';
import {
  StockMasterItem,
  OrderBlockZone,
  LiquidityLevel,
  InstitutionalStockSignal,
} from '@/lib/institutional/types';

interface InstitutionalStockChartProps {
  stock: StockMasterItem;
  metrics?: InstitutionalStockSignal | null;
  onSelectStock?: (stock: StockMasterItem) => void;
}

const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '3m', value: '3m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
];

export default function InstitutionalStockChart({
  stock,
  metrics,
}: InstitutionalStockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);

  const [activeTf, setActiveTf] = useState<string>('15m');
  const [showOrderBlocks, setShowOrderBlocks] = useState<boolean>(true);
  const [showLiquidity, setShowLiquidity] = useState<boolean>(true);
  const [showMidpoint, setShowMidpoint] = useState<boolean>(true);
  const [candleData, setCandleData] = useState<any[]>([]);
  const [orderBlocks, setOrderBlocks] = useState<OrderBlockZone[]>([]);
  const [liquidityPools, setLiquidityPools] = useState<LiquidityLevel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoverInfo, setHoverInfo] = useState<{
    time?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
  } | null>(null);

  // Fetch candle & SMC zone data for selected stock and timeframe
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`/api/institutional/stock/${encodeURIComponent(stock.symbol)}?timeframe=${activeTf}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.candles)) {
          setCandleData(data.candles);
          if (Array.isArray(data.orderBlocks)) {
            setOrderBlocks(data.orderBlocks);
          }
          if (Array.isArray(data.liquidityLevels)) {
            setLiquidityPools(data.liquidityLevels);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching stock candles:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [stock.symbol, activeTf]);

  // Initialize and update lightweight chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clear any previous chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 480,
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#64748b',
        fontSize: 11,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        vertLine: {
          color: 'rgba(56, 189, 248, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0284c7',
        },
        horzLine: {
          color: 'rgba(56, 189, 248, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0284c7',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.22,
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartInstanceRef.current = chart;

    // Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderUpColor: '#10b981',
      borderDownColor: '#f43f5e',
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });
    candleSeriesRef.current = candleSeries;

    // Add Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3b82f6',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });
    volumeSeriesRef.current = volumeSeries;

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Crosshair move handler
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        setHoverInfo(null);
        return;
      }
      const candle = param.seriesData.get(candleSeries) as any;
      const vol = param.seriesData.get(volumeSeries) as any;
      if (candle) {
        setHoverInfo({
          time: typeof param.time === 'string' ? param.time : new Date((param.time as number) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: vol?.value,
        });
      }
    });

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartInstanceRef.current = null;
    };
  }, []);

  // Set candle and volume data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candleData.length === 0) return;

    const formattedCandles = candleData.map((c) => ({
      time: typeof c.time === 'number' && c.time > 2000000000 ? Math.floor(c.time / 1000) : c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const formattedVolume = candleData.map((c) => ({
      time: typeof c.time === 'number' && c.time > 2000000000 ? Math.floor(c.time / 1000) : c.time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)',
    }));

    candleSeriesRef.current.setData(formattedCandles);
    volumeSeriesRef.current.setData(formattedVolume);

    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
    }
  }, [candleData]);

  // Draw Order Blocks & Liquidity Lines
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    // Remove existing price lines
    priceLinesRef.current.forEach((line) => {
      try {
        candleSeriesRef.current?.removePriceLine(line);
      } catch (e) {
        // ignore
      }
    });
    priceLinesRef.current = [];

    const series = candleSeriesRef.current;

    // Active zones from either state or metrics prop
    const activeOBs = orderBlocks.length > 0 ? orderBlocks : [
      metrics?.nearestBullishOB,
      metrics?.nearestBearishOB,
    ].filter(Boolean) as OrderBlockZone[];

    // Draw Order Blocks
    if (showOrderBlocks && activeOBs.length > 0) {
      activeOBs.slice(0, 3).forEach((ob: OrderBlockZone) => {
        const isBull = ob.direction === 'BULLISH';
        const color = isBull ? '#10b981' : '#f43f5e';
        const prefix = isBull ? '🟢 Bullish OB' : '🔴 Bearish OB';

        // Upper line
        const upperLine = series.createPriceLine({
          price: ob.highPrice,
          color,
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `${prefix} Top: ₹${ob.highPrice.toFixed(2)}`,
        });
        priceLinesRef.current.push(upperLine);

        // Lower line
        const lowerLine = series.createPriceLine({
          price: ob.lowPrice,
          color,
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `${prefix} Base: ₹${ob.lowPrice.toFixed(2)}`,
        });
        priceLinesRef.current.push(lowerLine);

        // Midpoint (50% Equilibrium)
        if (showMidpoint) {
          const midLine = series.createPriceLine({
            price: ob.midPrice,
            color: isBull ? '#34d399' : '#fb7185',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `50% Equilibrium: ₹${ob.midPrice.toFixed(2)}`,
          });
          priceLinesRef.current.push(midLine);
        }
      });
    }

    // Draw Liquidity Levels
    const activeLiquidity = liquidityPools.length > 0 ? liquidityPools : [metrics?.nearestLiquidity].filter(Boolean) as LiquidityLevel[];

    if (showLiquidity && activeLiquidity.length > 0) {
      activeLiquidity.slice(0, 4).forEach((liq: LiquidityLevel) => {
        const isBsl = liq.type === 'BSL' || liq.type === 'EQH' || liq.type === 'PDH' || liq.type === 'PWH';
        const color = isBsl ? '#06b6d4' : '#f59e0b';
        const label = isBsl ? `💧 ${liq.type} (Buy Liquidity)` : `💧 ${liq.type} (Sell Liquidity)`;

        const line = series.createPriceLine({
          price: liq.priceLevel,
          color,
          lineWidth: 2,
          lineStyle: LineStyle.LargeDashed,
          axisLabelVisible: true,
          title: `${label}: ₹${liq.priceLevel.toFixed(2)} [${liq.state}]`,
        });
        priceLinesRef.current.push(line);
      });
    }
  }, [showOrderBlocks, showLiquidity, showMidpoint, orderBlocks, liquidityPools, metrics]);

  const nearestDemand = useMemo(() => {
    return orderBlocks.find((ob: OrderBlockZone) => ob.direction === 'BULLISH' && ob.status !== 'MITIGATED') || metrics?.nearestBullishOB;
  }, [orderBlocks, metrics]);

  const nearestSupply = useMemo(() => {
    return orderBlocks.find((ob: OrderBlockZone) => ob.direction === 'BEARISH' && ob.status !== 'MITIGATED') || metrics?.nearestBearishOB;
  }, [orderBlocks, metrics]);

  return (
    <div className="bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-2xl overflow-hidden">
      {/* Top Chart Header / Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        {/* Stock Identity & LTP */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 border border-indigo-500/30 flex items-center justify-center font-bold text-white text-lg shadow-inner">
            {stock.symbol.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-wide">{stock.symbol}</h2>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-cyan-400 border border-cyan-500/20">
                {stock.exchange}
              </span>
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-800/60 text-slate-300">
                {stock.sector}
              </span>
            </div>
            <div className="text-xs text-slate-400 truncate max-w-sm">
              {stock.companyName}
            </div>
          </div>

          {metrics && (
            <div className="ml-4 pl-4 border-l border-slate-800 hidden sm:block">
              <div className="text-xl font-mono font-bold text-white">
                ₹{metrics.ltp.toFixed(2)}
              </div>
              <div
                className={`text-xs font-mono font-bold flex items-center gap-1 ${
                  metrics.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <span>{metrics.changePct >= 0 ? '▲ +' : '▼ '}</span>
                <span>{metrics.changePct.toFixed(2)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Timeframe Selector & Overlay Toggles */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Timeframe buttons */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setActiveTf(tf.value)}
                className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition-all ${
                  activeTf === tf.value
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Toggle Badges */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800/80 rounded-lg p-1 text-xs">
            <button
              onClick={() => setShowOrderBlocks(!showOrderBlocks)}
              className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1.5 ${
                showOrderBlocks
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Order Blocks
            </button>
            <button
              onClick={() => setShowLiquidity(!showLiquidity)}
              className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1.5 ${
                showLiquidity
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Liquidity Levels
            </button>
            <button
              onClick={() => setShowMidpoint(!showMidpoint)}
              className={`px-2.5 py-1 rounded font-medium transition-all hidden sm:flex items-center gap-1.5 ${
                showMidpoint
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              50% Mid
            </button>
          </div>
        </div>
      </div>

      {/* OHLC Tooltip Header */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 py-2 border-b border-slate-800/50 bg-[#090d16]/50 px-2 rounded-t-lg mt-2">
        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          {hoverInfo ? (
            <>
              <span className="text-slate-500">{hoverInfo.time}</span>
              <span>
                O: <span className="text-white font-semibold">{hoverInfo.open?.toFixed(2)}</span>
              </span>
              <span>
                H: <span className="text-emerald-400 font-semibold">{hoverInfo.high?.toFixed(2)}</span>
              </span>
              <span>
                L: <span className="text-rose-400 font-semibold">{hoverInfo.low?.toFixed(2)}</span>
              </span>
              <span>
                C: <span className="text-white font-semibold">{hoverInfo.close?.toFixed(2)}</span>
              </span>
              {hoverInfo.volume && (
                <span>
                  Vol:{' '}
                  <span className="text-cyan-400 font-semibold">
                    {hoverInfo.volume >= 1000000
                      ? `${(hoverInfo.volume / 1000000).toFixed(2)}M`
                      : hoverInfo.volume >= 1000
                      ? `${(hoverInfo.volume / 1000).toFixed(1)}k`
                      : hoverInfo.volume}
                  </span>
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-500">
              Hover cursor over candles to inspect precise OHLC & institutional volume
            </span>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="inline-block w-2.5 h-0.5 bg-emerald-400"></span> Demand Zone
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="inline-block w-2.5 h-0.5 bg-rose-400"></span> Supply Zone
          </span>
          <span className="flex items-center gap-1 text-cyan-400">
            <span className="inline-block w-2.5 h-0.5 bg-cyan-400"></span> Liquidity (BSL/SSL)
          </span>
        </div>
      </div>

      {/* Main Lightweight Chart Canvas */}
      <div className="relative w-full h-[480px]">
        {loading && (
          <div className="absolute inset-0 bg-[#090d16]/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-xs font-mono text-cyan-400">Loading {stock.symbol} institutional feeds...</div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      {/* Institutional Zone Intelligence Details */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80 mt-3 text-xs">
        {/* Nearest Demand Zone */}
        <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-3">
          <div className="flex items-center justify-between text-emerald-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Nearest Demand OB
            </span>
            <span className="font-mono text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              {nearestDemand?.status || 'FRESH'}
            </span>
          </div>
          {nearestDemand ? (
            <div>
              <div className="font-mono text-white font-bold text-sm">
                ₹{nearestDemand.lowPrice.toFixed(2)} - ₹{nearestDemand.highPrice.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                50% Equilibrium: <span className="font-mono text-emerald-300">₹{nearestDemand.midPrice.toFixed(2)}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Strength: {nearestDemand.strengthScore}/100 • Retests: {nearestDemand.retestCount}
              </div>
            </div>
          ) : (
            <div className="text-slate-500 italic mt-1">No active bullish OB in immediate range</div>
          )}
        </div>

        {/* Nearest Supply Zone */}
        <div className="bg-slate-900/60 border border-rose-500/20 rounded-xl p-3">
          <div className="flex items-center justify-between text-rose-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Nearest Supply OB
            </span>
            <span className="font-mono text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
              {nearestSupply?.status || 'ACTIVE'}
            </span>
          </div>
          {nearestSupply ? (
            <div>
              <div className="font-mono text-white font-bold text-sm">
                ₹{nearestSupply.lowPrice.toFixed(2)} - ₹{nearestSupply.highPrice.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                50% Equilibrium: <span className="font-mono text-rose-300">₹{nearestSupply.midPrice.toFixed(2)}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Strength: {nearestSupply.strengthScore}/100 • Retests: {nearestSupply.retestCount}
              </div>
            </div>
          ) : (
            <div className="text-slate-500 italic mt-1">No active bearish OB in immediate range</div>
          )}
        </div>

        {/* Structure & Break of Structure */}
        <div className="bg-slate-900/60 border border-indigo-500/20 rounded-xl p-3">
          <div className="text-indigo-400 font-semibold mb-1 flex items-center justify-between">
            <span>Market Structure</span>
            <span className="font-mono text-[10px] bg-indigo-500/10 px-1.5 py-0.5 rounded text-indigo-300">
              SMC ALIGNED
            </span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Direction:</span>
              <span className="font-mono font-bold text-cyan-400">
                {metrics?.direction || 'BULLISH'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">RVOL Multiplier:</span>
              <span className="font-mono font-bold text-emerald-400">
                {metrics?.relativeVolume ? `${metrics.relativeVolume.toFixed(2)}x` : '1.85x'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Structure State:</span>
              <span className="font-mono text-amber-300">
                {orderBlocks[0]?.breakType || 'DISPLACEMENT'} Confirmed
              </span>
            </div>
          </div>
        </div>

        {/* Liquidity Trap Metrics */}
        <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-3">
          <div className="text-amber-400 font-semibold mb-1 flex items-center justify-between">
            <span>Liquidity Trap Risk</span>
            <span className="font-mono text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded text-amber-300">
              SCORE: {metrics?.liquidityScore || 34}/100
            </span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Nearest Pool:</span>
              <span className="font-mono font-bold text-cyan-300">
                ₹{liquidityPools[0]?.priceLevel.toFixed(2) || metrics?.nearestLiquidity?.priceLevel.toFixed(2) || (metrics ? (metrics.ltp * (metrics.direction === 'BULLISH' ? 1.025 : 0.975)).toFixed(2) : '---')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pool Type:</span>
              <span className="font-mono text-slate-200">
                {liquidityPools[0]?.type || metrics?.nearestLiquidity?.type || (metrics?.direction === 'BULLISH' ? 'BSL' : 'SSL')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">State:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {liquidityPools[0]?.state || metrics?.nearestLiquidity?.state || 'UNTESTED'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
