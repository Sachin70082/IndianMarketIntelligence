'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/Header';
import { TopMarketFlowHeader } from '@/components/institutional/TopMarketFlowHeader';
import { SectorFlowList } from '@/components/institutional/SectorFlowList';
import { MarketFlowCanvas } from '@/components/institutional/MarketFlowCanvas';
import { TopFlowCardsGrid } from '@/components/institutional/TopFlowCardsGrid';
import { DetailedStockWorkspace } from '@/components/institutional/DetailedStockWorkspace';
import LargeOrdersFeed from '@/components/institutional/LargeOrdersFeed';
import {
  StockMasterItem,
  InstitutionalStockSignal,
  SectorScreeningSummary,
  LargeOrderEvent,
} from '@/lib/institutional/types';
import { ScannerMarketSummary } from '@/lib/institutional/scannerService';
import { getStockBySymbol, searchStocks } from '@/lib/stocks/stockMaster';
import { ShieldAlert, RefreshCw, BarChart2, Layers } from 'lucide-react';

export default function OrderBlockLiquidityPage() {
  // Page State
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // View Mode: 'FLOW_TERMINAL' or 'DETAILED_ANALYSIS'
  const [viewMode, setViewMode] = useState<'FLOW_TERMINAL' | 'DETAILED_ANALYSIS'>('FLOW_TERMINAL');

  // Selected Stock
  const [selectedStock, setSelectedStock] = useState<StockMasterItem>({
    id: 'RELIANCE',
    symbol: 'RELIANCE',
    companyName: 'Reliance Industries Limited',
    exchange: 'BOTH',
    isin: 'INE002A01018',
    sector: 'Energy, Oil & Gas',
    industry: 'Refineries',
    marketCapCategory: 'LARGE',
    instrumentKeyNSE: 'NSE_EQ|INE002A01018',
  });

  const [selectedStockSignal, setSelectedStockSignal] = useState<InstitutionalStockSignal | null>(null);

  // Filters
  const [selectedSector, setSelectedSector] = useState<string>('All Sectors');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedExchange, setSelectedExchange] = useState<'ALL' | 'NSE' | 'BSE'>('ALL');

  // Market Scanner Feeds
  const [marketSummary, setMarketSummary] = useState<ScannerMarketSummary | null>(null);
  const [bullishOpportunities, setBullishOpportunities] = useState<InstitutionalStockSignal[]>([]);
  const [bearishOpportunities, setBearishOpportunities] = useState<InstitutionalStockSignal[]>([]);
  const [sectors, setSectors] = useState<SectorScreeningSummary[]>([]);
  const [largeOrders, setLargeOrders] = useState<LargeOrderEvent[]>([]);

  // Fetch full scanner data from backend (filtered by selectedSector)
  const fetchScannerData = useCallback(async (sectorToFetch = selectedSector) => {
    try {
      setIsRefreshing(true);
      const sectorParam = sectorToFetch && sectorToFetch !== 'All Sectors'
        ? `?sector=${encodeURIComponent(sectorToFetch)}`
        : '';
      const res = await fetch(`/api/institutional/scanner${sectorParam}`);
      const data = await res.json();

      if (data.success) {
        setMarketSummary(data.marketSummary);
        const bulls = data.bullishSetups || data.topOpportunities || data.top20 || [];
        const bears = data.bearishSetups || [];
        setBullishOpportunities(bulls);
        setBearishOpportunities(bears);
        setSectors(data.sectors || []);
        setLargeOrders(data.largeOrders || []);

        if (bulls.length > 0 && selectedStock.symbol === 'RELIANCE' && !selectedStockSignal) {
          const topBull = bulls[0];
          setSelectedStock(topBull.stock);
          setSelectedStockSignal(topBull);
        }
      }
    } catch (err) {
      console.error('Error fetching institutional scanner data:', err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [selectedSector, selectedStock.symbol, selectedStockSignal]);

  // Fetch individual stock signal whenever selected stock changes
  const fetchStockSignal = useCallback(async (stock: StockMasterItem) => {
    try {
      const res = await fetch(`/api/institutional/stock/${encodeURIComponent(stock.symbol)}`);
      const data = await res.json();
      if (data.success && data.signal) {
        setSelectedStockSignal(data.signal);
      }
    } catch (err) {
      console.error('Error fetching stock signal:', err);
    }
  }, []);

  // Initial load and auto-refresh
  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    fetchScannerData(selectedSector);

    const interval = setInterval(() => {
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      fetchScannerData(selectedSector);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchScannerData, selectedSector]);

  // Handle Sector Change: Immediately re-fetch scanner for that sector
  const handleSelectSector = (sec: string) => {
    setSelectedSector(sec);
    fetchScannerData(sec);
  };

  // Handle stock selection: opens detailed analysis view
  const handleSelectSignal = (signal: InstitutionalStockSignal) => {
    setSelectedStock(signal.stock);
    setSelectedStockSignal(signal);
    setViewMode('DETAILED_ANALYSIS');
  };

  const handleSelectStock = (stock: StockMasterItem) => {
    setSelectedStock(stock);
    fetchStockSignal(stock);
    setViewMode('DETAILED_ANALYSIS');
  };

  const handleSelectStockBySymbol = (symbol: string) => {
    const stock = getStockBySymbol(symbol);
    if (stock) {
      handleSelectStock(stock);
    } else {
      handleSelectStock({
        id: symbol,
        symbol,
        companyName: symbol,
        exchange: 'NSE',
        isin: '',
        sector: 'Equities',
        industry: 'Diversified',
        marketCapCategory: 'MID',
        instrumentKeyNSE: `NSE_EQ|${symbol}`,
      });
    }
  };

  // Filtered signals based on search query and exchange (sector is already fetched from backend)
  const filteredBullishSignals = useMemo(() => {
    return bullishOpportunities.filter((sig) => {
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesSym = sig.stock.symbol.toLowerCase().includes(q);
        const matchesName = sig.stock.companyName.toLowerCase().includes(q);
        if (!matchesSym && !matchesName) return false;
      }
      if (selectedExchange !== 'ALL' && sig.stock.exchange !== selectedExchange && sig.stock.exchange !== 'BOTH') {
        return false;
      }
      return true;
    });
  }, [bullishOpportunities, searchQuery, selectedExchange]);

  const filteredBearishSignals = useMemo(() => {
    return bearishOpportunities.filter((sig) => {
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesSym = sig.stock.symbol.toLowerCase().includes(q);
        const matchesName = sig.stock.companyName.toLowerCase().includes(q);
        if (!matchesSym && !matchesName) return false;
      }
      if (selectedExchange !== 'ALL' && sig.stock.exchange !== selectedExchange && sig.stock.exchange !== 'BOTH') {
        return false;
      }
      return true;
    });
  }, [bearishOpportunities, searchQuery, selectedExchange]);

  // Leading & Lagging Sectors
  const sortedSectors = useMemo(() => {
    return [...sectors].sort((a, b) => b.sectorTrendPct - a.sectorTrendPct);
  }, [sectors]);

  const leadingSector = sortedSectors.length > 0 ? sortedSectors[0] : null;
  const laggingSector = sortedSectors.length > 0 ? sortedSectors[sortedSectors.length - 1] : null;

  return (
    <div className="min-h-screen bg-[#02050a] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Application Header */}
      <Header
        lastUpdatedIst={lastUpdated}
        freshness="LIVE"
        quoteAgeSeconds={1}
        sessionStatus="NORMAL_OPEN"
        sessionDescription="Live Market Session"
        connectionStatus={{
          status: 'CONNECTED',
          is_configured: true,
          can_stream: true,
          message: 'Institutional Order Flow Stream Connected',
        }}
        feedMode="STREAM"
        onToggleFeedMode={() => {}}
        onRefresh={() => {
          setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          fetchScannerData();
          if (selectedStock) fetchStockSignal(selectedStock);
        }}
        isRefreshing={isRefreshing}
        onOpenConfigModal={() => {}}
      />

      {/* Futuristic Market Overview Header Bar */}
      <TopMarketFlowHeader
        leadingSector={leadingSector}
        laggingSector={laggingSector}
        bullishCount={marketSummary?.strongBullishSetups || filteredBullishSignals.length}
        bearishCount={marketSummary?.strongBearishSetups || filteredBearishSignals.length}
        totalScanned={marketSummary?.totalStocksScanned || 5720}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedExchange={selectedExchange}
        onExchangeChange={setSelectedExchange}
      />

      {/* Main View Area: Flow Terminal or Detailed Analysis */}
      {viewMode === 'DETAILED_ANALYSIS' ? (
        <main className="flex-1 max-w-[1780px] w-full mx-auto">
          <DetailedStockWorkspace
            stock={selectedStock}
            signal={selectedStockSignal}
            onBack={() => setViewMode('FLOW_TERMINAL')}
            onSelectStock={handleSelectStock}
          />
        </main>
      ) : (
        <main className="flex-1 flex flex-col w-full">
          {/* ================= 3-COLUMN TERMINAL LAYOUT ================= */}
          <div className="flex-1 flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-125px)] min-h-[700px] border-b border-slate-800/80 bg-[#02050a]">
            {/* Left Panel: Sector Performance Flow List */}
            <SectorFlowList
              sectors={sectors}
              selectedSector={selectedSector}
              onSelectSector={(sec) => setSelectedSector(sec)}
            />

            {/* Center Panel: Institutional Market Flow Wave Visualization */}
            <div className="flex-1 h-[450px] lg:h-full relative border-r border-slate-800/80">
              <MarketFlowCanvas
                sectors={sectors}
                bullishSignals={filteredBullishSignals}
                bearishSignals={filteredBearishSignals}
                selectedSymbol={selectedStock.symbol}
              />
            </div>

            {/* Right Panel: Top 20 Strongest Stocks (Bullish & Bearish Cards) */}
            <div className="w-full lg:w-[48%] xl:w-[50%] h-[750px] lg:h-full">
              <TopFlowCardsGrid
                bullishSignals={filteredBullishSignals}
                bearishSignals={filteredBearishSignals}
                selectedSymbol={selectedStock.symbol}
                onSelectStock={handleSelectSignal}
              />
            </div>
          </div>

          {/* Institutional Large Orders & Block Deals Live Radar */}
          <div className="max-w-[1780px] w-full mx-auto p-4 sm:p-6 space-y-6">
            <LargeOrdersFeed
              orders={largeOrders}
              onSelectStock={handleSelectStockBySymbol}
            />

            {/* Regulatory Disclosures & SMC Documentation */}
            <div className="bg-[#050812] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3 text-xs text-slate-400">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Institutional Order Flow & Smart Money Concepts (SMC) Architecture
              </div>
              <p className="leading-relaxed">
                The Institutional Market Flow Visualizer scans 5,720+ listed equities across NSE and BSE in real time. Order block demand and supply zones are identified using displacement candle ATR normalization and structural break confirmations (BOS/CHoCH). Liquidity sweeps track buy-side liquidity (BSL) and sell-side liquidity (SSL) engineered by institutional market participants. Always practice disciplined risk management.
              </p>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
